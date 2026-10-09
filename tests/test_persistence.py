from sqlalchemy.exc import SQLAlchemyError

from src.db.models import Task
from src.db.session import SessionLocal, engine
from src.llm.analysis import LLMAnalysisError


def _auth(api_key):
    return {"X-API-Key": api_key}


def test_task_result_is_persisted_across_new_session(client, api_key):
    created = client.post(
        "/api/tasks",
        headers=_auth(api_key),
        json={
            "description": "Wi-Fi di Laboratorium Komputer 1 mengalami gangguan koneksi.",
            "location": "zone-A1",
            "device_type": "access_point",
        },
    ).json()

    # Simulate a process restart: drop the pooled connections, then read the
    # task again through a brand new session.
    engine.dispose()
    with SessionLocal() as db:
        row = db.get(Task, created["task_id"])

    assert row is not None
    assert row.status == "completed"
    assert row.result["data_label"] == "SYNTHETIC"
    assert row.result["evidence"]
    assert row.error is None


def test_history_survives_new_session(client, api_key):
    created = client.post(
        "/api/tasks",
        headers=_auth(api_key),
        json={"description": "jaringan di Laboratorium Komputer 1", "location": "zone-A1"},
    ).json()

    engine.dispose()
    with SessionLocal() as db:
        task_ids = {row.task_id for row in db.query(Task).all()}

    assert created["task_id"] in task_ids


def test_workflow_failure_is_persisted_as_failed(client, api_key, monkeypatch):
    class FailingGraph:
        def invoke(self, state):
            raise RuntimeError("simulated workflow failure")

    monkeypatch.setattr("src.main.helpdesk_graph", FailingGraph())

    response = client.post(
        "/api/tasks",
        headers=_auth(api_key),
        json={"description": "jaringan down", "location": "zone-A1"},
    )

    assert response.status_code == 500
    body = response.json()["detail"]
    assert body["error"]["code"] == "WORKFLOW_FAILED"

    with SessionLocal() as db:
        row = db.get(Task, body["task_id"])

    assert row is not None
    # A failed workflow must never be recorded as completed.
    assert row.status == "failed"
    assert row.error["code"] == "WORKFLOW_FAILED"
    assert row.result is None


def test_database_unavailable_returns_503(client, api_key, monkeypatch):
    def unavailable_session(*args, **kwargs):
        raise SQLAlchemyError("simulated database outage")

    monkeypatch.setattr("src.main.SessionLocal", unavailable_session)

    response = client.post(
        "/api/tasks",
        headers=_auth(api_key),
        json={"description": "jaringan down"},
    )

    assert response.status_code == 503
    assert "Database unavailable" in response.json()["detail"]


def test_llm_failure_is_persisted_as_failed(client, api_key, monkeypatch):
    monkeypatch.setenv("LLM_ENABLED", "true")

    def boom(*args, **kwargs):
        raise LLMAnalysisError("simulated provider failure")

    monkeypatch.setattr("src.main.analyze_findings", boom)

    response = client.post(
        "/api/tasks",
        headers=_auth(api_key),
        json={"description": "jaringan down", "location": "zone-A1"},
    )

    assert response.status_code == 500
    body = response.json()["detail"]
    assert body["error"]["code"] == "LLM_ANALYSIS_FAILED"

    with SessionLocal() as db:
        row = db.get(Task, body["task_id"])

    assert row is not None
    assert row.status == "failed"
    assert row.error["code"] == "LLM_ANALYSIS_FAILED"
    assert row.result is None
    step_states = [(s["step_id"], s["status"]) for s in row.steps]
    assert ("inspect_report", "completed") in step_states
    assert ("analyze_evidence", "failed") in step_states


def test_token_usage_is_persisted_and_aggregated(client, api_key, monkeypatch):
    monkeypatch.setenv("LLM_ENABLED", "true")
    monkeypatch.setattr(
        "src.main.analyze_findings",
        lambda *a, **k: {
            "summary": "s",
            "findings": ["f"],
            "recommendations": ["r"],
            "uncertainty": ["u"],
            "model": "gpt-4o-mini",
            "usage": {"input_tokens": 100, "output_tokens": 20},
        },
    )

    created = client.post(
        "/api/tasks",
        headers=_auth(api_key),
        json={"description": "jaringan down", "location": "zone-A1"},
    )
    assert created.status_code == 201

    with SessionLocal() as db:
        row = db.get(Task, created.json()["task_id"])
    assert row.llm_model == "gpt-4o-mini"
    assert row.input_tokens == 100
    assert row.output_tokens == 20

    metrics = client.get("/api/metrics/tokens", headers=_auth(api_key)).json()
    assert metrics["totals"]["tasks_with_usage"] == 1
    assert metrics["totals"]["input_tokens"] == 100
    assert metrics["totals"]["output_tokens"] == 20
    assert metrics["by_model"][0]["model"] == "gpt-4o-mini"
    assert metrics["by_model"][0]["tasks"] == 1
    assert metrics["items"][0]["task_id"] == created.json()["task_id"]