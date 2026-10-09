from src.db.models import ExecutionStep, Task, TaskRun
from src.db.session import SessionLocal


def _auth(api_key):
    return {"X-API-Key": api_key}


def _create(client, api_key, **extra):
    payload = {"description": "Wi-Fi rusak di zone-A1", "location": "zone-A1"}
    payload.update(extra)
    return client.post("/api/tasks", headers=_auth(api_key), json=payload)


def test_sensitive_action_waits_for_approval(client, api_key):
    response = _create(client, api_key, requested_action="restart_device")

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "waiting_for_approval"
    assert body["approval"]["required"] is True
    assert body["approval"]["status"] == "pending"
    assert body["approval"]["action"] == "restart_device"
    assert body["result"]["approval"]["required"] is True
    step_states = [(s["step_id"], s["status"]) for s in body["steps"]]
    assert ("request_approval", "waiting_for_approval") in step_states


def test_non_sensitive_action_completes(client, api_key):
    response = _create(client, api_key, requested_action="read_only")

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "completed"
    assert body["approval"] is None
    assert body["requested_action"] == "read_only"


def test_approve_completes_task_and_records_decision(client, api_key):
    created = _create(client, api_key, requested_action="reset_account").json()

    response = client.post(
        f"/api/tasks/{created['task_id']}/approval",
        headers=_auth(api_key),
        json={"decision": "approve", "note": "Disetujui oleh leader shift."},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["approval"]["status"] == "approved"
    assert body["approval"]["decision"] == "approve"
    assert body["result"]["approval"]["status"] == "approved"
    step_states = [(s["step_id"], s["status"]) for s in body["steps"]]
    assert ("approval", "completed") in step_states


def test_reject_cancels_task(client, api_key):
    created = _create(client, api_key, requested_action="network_change").json()

    response = client.post(
        f"/api/tasks/{created['task_id']}/approval",
        headers=_auth(api_key),
        json={"decision": "reject"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "cancelled"
    assert body["approval"]["status"] == "rejected"
    step_states = [(s["step_id"], s["status"]) for s in body["steps"]]
    assert ("approval", "cancelled") in step_states


def test_approval_conflict_when_task_not_waiting(client, api_key):
    created = _create(client, api_key).json()
    assert created["status"] == "completed"

    response = client.post(
        f"/api/tasks/{created['task_id']}/approval",
        headers=_auth(api_key),
        json={"decision": "approve"},
    )

    assert response.status_code == 409


def test_approval_unknown_task_returns_404(client, api_key):
    response = client.post(
        "/api/tasks/does-not-exist/approval",
        headers=_auth(api_key),
        json={"decision": "approve"},
    )

    assert response.status_code == 404


def test_approval_requires_api_key(client):
    response = client.post(
        "/api/tasks/anything/approval",
        json={"decision": "approve"},
    )

    assert response.status_code == 401


def test_approval_rejects_invalid_decision(client, api_key):
    created = _create(client, api_key, requested_action="restart_device").json()

    response = client.post(
        f"/api/tasks/{created['task_id']}/approval",
        headers=_auth(api_key),
        json={"decision": "maybe"},
    )

    assert response.status_code == 422


def test_normalized_run_and_steps_are_persisted(client, api_key):
    created = _create(client, api_key).json()

    with SessionLocal() as db:
        run = db.get(TaskRun, created["run_id"])
        steps = (
            db.query(ExecutionStep)
            .filter(ExecutionStep.run_id == created["run_id"])
            .order_by(ExecutionStep.order_index)
            .all()
        )

    assert run is not None
    assert run.status == "completed"
    assert run.finished_at is not None
    assert [step.step_key for step in steps] == [
        "inspect_report",
        "analyze_evidence",
        "prepare_result",
    ]
    assert [step.order_index for step in steps] == [1, 2, 3]


def test_runs_endpoint_returns_normalized_steps(client, api_key):
    created = _create(client, api_key).json()

    response = client.get(
        f"/api/tasks/{created['task_id']}/runs", headers=_auth(api_key)
    )

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    run = items[0]
    assert run["run_id"] == created["run_id"]
    assert run["status"] == "completed"
    assert [s["step_id"] for s in run["steps"]] == [
        "inspect_report",
        "analyze_evidence",
        "prepare_result",
    ]


def test_runs_unknown_task_returns_404(client, api_key):
    response = client.get("/api/tasks/does-not-exist/runs", headers=_auth(api_key))

    assert response.status_code == 404


def test_runs_requires_api_key(client):
    assert client.get("/api/tasks/anything/runs").status_code == 401


def test_failed_workflow_is_normalized(client, api_key, monkeypatch):
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
    task_id = response.json()["detail"]["task_id"]

    with SessionLocal() as db:
        row = db.get(Task, task_id)
        run = db.get(TaskRun, row.run_id)

    assert row.status == "failed"
    assert run is not None
    assert run.status == "failed"