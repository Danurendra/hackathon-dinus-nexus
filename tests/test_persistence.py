from sqlalchemy.exc import SQLAlchemyError

from src.db.models import Task
from src.db.session import SessionLocal, engine


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