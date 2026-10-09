import os

import pytest

from src.data_adapter import search_helpdesk
from src.llm.analysis import (
    MAX_RECORDS_PER_DATASET,
    AnalysisOutput,
    LLMAnalysisError,
    analyze_findings,
    build_evidence_digest,
    build_prompt,
)
from src.main import StepFailedError, analyze_evidence

FINDINGS = search_helpdesk(
    "gangguan koneksi",
    zone_id="zone-A1",
    device_type="access_point",
)


# --- Fakes ---------------------------------------------------------------

class _Usage:
    input_tokens = 12
    output_tokens = 34


class _FakeResponse:
    def __init__(self, parsed, usage=_Usage()):
        self.output_parsed = parsed
        self.usage = usage


class _FakeResponses:
    def __init__(self, response=None, error=None):
        self._response = response
        self._error = error

    def parse(self, **kwargs):
        if self._error is not None:
            raise self._error
        return self._response


class _FakeClient:
    def __init__(self, responses):
        self.responses = responses


def _patch_client(monkeypatch, response=None, error=None):
    client = _FakeClient(_FakeResponses(response=response, error=error))
    monkeypatch.setattr("src.llm.analysis.get_client", lambda: client)


# --- Digest / prompt (bounded evidence) ---------------------------------

def test_evidence_digest_is_bounded_and_field_filtered():
    many = {
        "matches": {
            "devices": [
                {"id": f"d-{i}", "name": "n", "macAddress": "SECRET", "type": "ap"}
                for i in range(MAX_RECORDS_PER_DATASET + 5)
            ]
        }
    }
    digest = build_evidence_digest(many)

    assert len(digest) == MAX_RECORDS_PER_DATASET
    # The allowlist must exclude fields not needed by the model.
    assert "SECRET" not in "\n".join(digest)
    assert "macAddress" not in "\n".join(digest)


def test_prompt_handles_empty_findings():
    prompt = build_prompt("no match query", {"matches": {}}, None, None)

    assert "no matching records" in prompt
    assert "not specified" in prompt


def test_prompt_includes_hits_for_real_findings():
    prompt = build_prompt("gangguan koneksi", FINDINGS, "zone-A1", "access_point")

    assert "device-AP-A1-01" in prompt
    assert "incident-001" in prompt


# --- analyze_findings ----------------------------------------------------

def test_analyze_findings_returns_validated_result(monkeypatch):
    parsed = AnalysisOutput(
        summary="Dua access point dan dua insiden relevan ditemukan.",
        findings=["Access point A1-01 dan A1-02 berada di zona terdampak."],
        recommendations=["Periksa riwayat insiden sebelum tindakan."],
        uncertainty=["Data bersifat sintetis."],
    )
    _patch_client(monkeypatch, response=_FakeResponse(parsed))

    result = analyze_findings("gangguan koneksi", FINDINGS, "zone-A1", "access_point")

    assert result["summary"].startswith("Dua access point")
    assert result["findings"]
    assert result["recommendations"]
    assert result["uncertainty"]
    assert result["model"]
    assert result["usage"] == {"input_tokens": 12, "output_tokens": 34}


def test_analyze_findings_provider_error_raises(monkeypatch):
    _patch_client(monkeypatch, error=RuntimeError("provider down"))

    with pytest.raises(LLMAnalysisError):
        analyze_findings("gangguan koneksi", FINDINGS)


def test_analyze_findings_missing_output_raises(monkeypatch):
    _patch_client(monkeypatch, response=_FakeResponse(None))

    with pytest.raises(LLMAnalysisError):
        analyze_findings("gangguan koneksi", FINDINGS)


def test_analyze_findings_usage_unavailable(monkeypatch):
    parsed = AnalysisOutput(
        summary="ok", findings=[], recommendations=[], uncertainty=[]
    )
    _patch_client(monkeypatch, response=_FakeResponse(parsed, usage=None))

    result = analyze_findings("gangguan koneksi", FINDINGS)

    assert result["usage"] == {"status": "unavailable"}


# --- analyze_evidence node ----------------------------------------------

def _state():
    inspected = {
        "status": "running",
        "findings": FINDINGS,
        "steps": [
            {"step_id": "inspect_report", "name": "x", "status": "completed"}
        ],
    }
    return {
        "task_id": "t",
        "description": "gangguan koneksi",
        "location": "zone-A1",
        "device_type": "access_point",
        "status": "running",
        "steps": inspected["steps"],
        "findings": FINDINGS,
        "analysis": {},
        "result": {},
    }


def test_node_skips_when_disabled(monkeypatch):
    monkeypatch.setenv("LLM_ENABLED", "false")

    output = analyze_evidence(_state())

    assert output["analysis"] == {}
    assert output["steps"][-1]["status"] == "skipped"


def test_node_runs_and_records_usage(monkeypatch):
    monkeypatch.setenv("LLM_ENABLED", "true")
    monkeypatch.setattr(
        "src.main.analyze_findings",
        lambda *a, **k: {
            "summary": "s",
            "findings": ["f"],
            "recommendations": ["r"],
            "uncertainty": ["u"],
            "model": "gpt-4o-mini",
            "usage": {"input_tokens": 1, "output_tokens": 2},
        },
    )

    output = analyze_evidence(_state())

    step = output["steps"][-1]
    assert step["status"] == "completed"
    assert step["model"] == "gpt-4o-mini"
    assert output["analysis"]["summary"] == "s"


def test_node_failure_records_failed_step(monkeypatch):
    monkeypatch.setenv("LLM_ENABLED", "true")

    def boom(*args, **kwargs):
        raise LLMAnalysisError("nope")

    monkeypatch.setattr("src.main.analyze_findings", boom)

    with pytest.raises(StepFailedError) as excinfo:
        analyze_evidence(_state())

    failed_step = excinfo.value.steps[-1]
    assert failed_step["step_id"] == "analyze_evidence"
    assert failed_step["status"] == "failed"
    assert excinfo.value.code == "LLM_ANALYSIS_FAILED"


# --- Live (opt-in) -------------------------------------------------------

@pytest.mark.live_llm
@pytest.mark.skipif(
    os.getenv("RUN_LIVE_LLM") != "1",
    reason="set RUN_LIVE_LLM=1 to run the paid live LLM test",
)
def test_live_analyze_findings():
    result = analyze_findings(
        "Wi-Fi di Laboratorium Komputer 1 mengalami gangguan koneksi.",
        FINDINGS,
        location="zone-A1",
        device_type="access_point",
    )

    assert result["summary"]
    assert result["model"]