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
    max_attempts,
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


class _TransientError(Exception):
    """Mimics a provider error carrying a retryable HTTP status."""

    def __init__(self, status_code=429):
        super().__init__(f"provider error {status_code}")
        self.status_code = status_code


class _SequenceResponses:
    """Returns/raises each item once; the last item repeats."""

    def __init__(self, items):
        self._items = list(items)
        self.calls = 0

    def parse(self, **kwargs):
        self.calls += 1
        index = min(self.calls - 1, len(self._items) - 1)
        item = self._items[index]
        if isinstance(item, Exception):
            raise item
        return item


class _FakeClient:
    def __init__(self, responses):
        self.responses = responses


def _install(monkeypatch, items):
    responses = _SequenceResponses(items)
    monkeypatch.setattr(
        "src.llm.analysis.get_client", lambda: _FakeClient(responses)
    )
    return responses


def _parsed(summary="ok"):
    return AnalysisOutput(
        summary=summary,
        findings=["f"],
        recommendations=["r"],
        uncertainty=["u"],
    )


def _fast_retries(monkeypatch, attempts=3):
    monkeypatch.setenv("LLM_MAX_ATTEMPTS", str(attempts))
    monkeypatch.setenv("LLM_RETRY_BASE_DELAY", "0")
    monkeypatch.setattr("src.llm.analysis.time.sleep", lambda *a, **k: None)


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


# --- analyze_findings: success / validation -----------------------------

def test_analyze_findings_returns_validated_result(monkeypatch):
    responses = _install(monkeypatch, [_FakeResponse(_parsed("Dua access point"))])

    result = analyze_findings("gangguan koneksi", FINDINGS, "zone-A1", "access_point")

    assert result["summary"].startswith("Dua access point")
    assert result["findings"]
    assert result["recommendations"]
    assert result["uncertainty"]
    assert result["model"]
    assert result["usage"] == {"input_tokens": 12, "output_tokens": 34}
    assert responses.calls == 1


def test_analyze_findings_usage_unavailable(monkeypatch):
    _install(monkeypatch, [_FakeResponse(_parsed(), usage=None)])

    result = analyze_findings("gangguan koneksi", FINDINGS)

    assert result["usage"] == {"status": "unavailable"}


def test_missing_output_raises_without_retry(monkeypatch):
    _fast_retries(monkeypatch, attempts=3)
    responses = _install(monkeypatch, [_FakeResponse(None)])

    with pytest.raises(LLMAnalysisError):
        analyze_findings("gangguan koneksi", FINDINGS)

    assert responses.calls == 1


# --- analyze_findings: retry policy -------------------------------------

def test_transient_error_is_retried_then_succeeds(monkeypatch):
    _fast_retries(monkeypatch, attempts=3)
    responses = _install(
        monkeypatch,
        [_TransientError(429), _FakeResponse(_parsed("recovered"))],
    )

    result = analyze_findings("gangguan koneksi", FINDINGS)

    assert result["summary"] == "recovered"
    assert responses.calls == 2


def test_server_error_503_is_retried(monkeypatch):
    _fast_retries(monkeypatch, attempts=2)
    responses = _install(
        monkeypatch,
        [_TransientError(503), _FakeResponse(_parsed())],
    )

    analyze_findings("gangguan koneksi", FINDINGS)

    assert responses.calls == 2


def test_gives_up_after_max_attempts(monkeypatch):
    _fast_retries(monkeypatch, attempts=2)
    responses = _install(monkeypatch, [_TransientError(429)])

    with pytest.raises(LLMAnalysisError):
        analyze_findings("gangguan koneksi", FINDINGS)

    assert responses.calls == 2


def test_non_transient_error_is_not_retried(monkeypatch):
    _fast_retries(monkeypatch, attempts=3)
    responses = _install(monkeypatch, [_TransientError(400)])

    with pytest.raises(LLMAnalysisError):
        analyze_findings("gangguan koneksi", FINDINGS)

    assert responses.calls == 1


def test_max_attempts_is_clamped(monkeypatch):
    monkeypatch.setenv("LLM_MAX_ATTEMPTS", "0")
    assert max_attempts() == 1
    monkeypatch.setenv("LLM_MAX_ATTEMPTS", "99")
    assert max_attempts() == 5
    monkeypatch.setenv("LLM_MAX_ATTEMPTS", "not-a-number")
    assert max_attempts() == 3


# --- analyze_evidence node ----------------------------------------------

def _state():
    return {
        "task_id": "t",
        "description": "gangguan koneksi",
        "location": "zone-A1",
        "device_type": "access_point",
        "status": "running",
        "steps": [
            {"step_id": "inspect_report", "name": "x", "status": "completed"}
        ],
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