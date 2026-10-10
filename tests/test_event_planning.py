import pytest

from src.workflows.event_planning import EventPlanInput, event_graph


PLAN = {"name": "Wisuda kampus", "attendance": 39000, "concurrentOccupancy": 18000,
        "durationHours": 6, "venueCapacity": 20000, "venues": 3,
        "availablePowerKw": 3200, "availableNetworkMbps": 5000}


def test_event_graph_grounded_forecast():
    output = event_graph.invoke({"input": EventPlanInput(**PLAN).model_dump(), "steps": []})
    result = output["result"]
    assert result["forecast"]["peakPowerKw"] == 2805
    assert result["forecast"]["energyKwh"] == 12118
    assert result["forecast"]["networkDemandMbps"] == 3630
    assert result["forecast"]["onlineAccessPoints"] == 8
    assert result["forecast"]["additionalAccessPoints"] == 11
    assert result["risk"] == "high"
    assert result["analysis_mode"] == "deterministic"
    assert result["data_label"] == "SYNTHETIC"
    assert "device-AP-A2-02" in {item["source_id"] for item in result["evidence"]}
    assert all(step["duration_ms"] >= 0 for step in output["steps"])


def test_event_task_persists_history_runs_and_input(client, api_key):
    headers = {"X-API-Key": api_key}
    response = client.post("/api/event-plans", json=PLAN, headers=headers)
    assert response.status_code == 201
    task = response.json()
    assert task["status"] == "completed"
    assert task["worker"] == "campus_operations"
    assert task["approval"] is None
    restored = client.get(f"/api/tasks/{task['task_id']}", headers=headers).json()
    assert restored == task
    assert restored["result"]["event_input"]["attendance"] == 39000
    assert client.get("/api/history", headers=headers).json()["items"][0]["task_id"] == task["task_id"]
    run = client.get(f"/api/tasks/{task['task_id']}/runs", headers=headers).json()["items"][0]
    assert run["worker"] == "campus_operations"
    assert run["status"] == "completed"
    assert [step["step_id"] for step in run["steps"]] == [step["step_id"] for step in task["steps"]]
    assert all(step["detail"].startswith("Measured duration:") for step in run["steps"])
    assert task["steps"][-1]["status"] == "skipped"


@pytest.mark.parametrize("change", [
    {"attendance": 0}, {"concurrentOccupancy": 40000}, {"venueCapacity": 0},
    {"availablePowerKw": 0}, {"availableNetworkMbps": 0}, {"durationHours": -1},
    {"venues": 0}, {"name": "   "}, {"durationHours": "Infinity"},
    {"unexpected": "not allowed"},
])
def test_event_validation(client, api_key, change):
    response = client.post("/api/event-plans", json={**PLAN, **change}, headers={"X-API-Key": api_key})
    assert response.status_code == 422


def test_event_auth(client):
    assert client.post("/api/event-plans", json=PLAN).status_code == 401


def test_event_adapter_failure_is_persisted(client, api_key, monkeypatch):
    from src.workflows import event_planning

    def fail_load(dataset):
        raise OSError("private diagnostic")

    monkeypatch.setattr(event_planning, "load_data", fail_load)
    headers = {"X-API-Key": api_key}
    response = client.post("/api/event-plans", json=PLAN, headers=headers)
    assert response.status_code == 500
    assert "private diagnostic" not in response.text
    task_id = response.json()["detail"]["task_id"]
    task = client.get(f"/api/tasks/{task_id}", headers=headers).json()
    assert task["status"] == "failed"
    assert task["steps"][-1]["status"] == "failed"
    assert task["result"]["event_input"]["name"] == PLAN["name"]


def test_missing_inventory_is_not_reported_as_zero_risk(client, api_key, monkeypatch):
    from src.workflows import event_planning

    monkeypatch.setattr(event_planning, "load_data", lambda dataset: [])
    response = client.post("/api/event-plans", json=PLAN, headers={"X-API-Key": api_key})
    assert response.status_code == 500


def test_event_followup_creates_grounded_helpdesk_task(client, api_key):
    headers = {"X-API-Key": api_key}
    event = client.post("/api/event-plans", json=PLAN, headers=headers).json()
    response = client.post(f"/api/event-plans/{event['task_id']}/helpdesk",
                           json={"device_id": "device-AP-A2-02"}, headers=headers)
    assert response.status_code == 201
    task = response.json()
    assert task["worker"] == "it_helpdesk"
    assert task["status"] == "completed"
    assert task["location"] == "zone-A2"
    assert event["task_id"] in task["description"]
    assert task["requested_action"] is None
    assert "device-AP-A2-02" in {item["source_id"] for item in task["result"]["evidence"]}


@pytest.mark.parametrize("device_id", ["invented-device", "device-AP-A1-01"])
def test_event_followup_rejects_missing_or_online_evidence(client, api_key, device_id):
    headers = {"X-API-Key": api_key}
    event = client.post("/api/event-plans", json=PLAN, headers=headers).json()
    assert client.post(f"/api/event-plans/{event['task_id']}/helpdesk",
                       json={"device_id": device_id}, headers=headers).status_code == 422


def test_event_followup_requires_auth(client):
    assert client.post("/api/event-plans/unknown/helpdesk", json={"device_id": "device-AP-A2-02"}).status_code == 401


def test_optional_event_ai_preserves_facts_and_captures_usage(client, api_key, monkeypatch):
    from src.workflows import event_planning

    monkeypatch.setenv("LLM_ENABLED", "true")
    monkeypatch.setattr(event_planning, "analyze_findings", lambda *args: {
        "summary": "Tinjau kebutuhan jaringan.", "recommendations": ["Verifikasi cakupan AP."],
        "uncertainty": ["Data sintetis."], "model": "mock-model", "usage": {"input_tokens": 100, "output_tokens": 20},
    })
    response = client.post("/api/event-plans", json=PLAN, headers={"X-API-Key": api_key})
    assert response.status_code == 201
    task = response.json()
    assert task["result"]["analysis_mode"] == "llm_assisted"
    assert task["input_tokens"] == 100
    assert task["output_tokens"] == 20
    assert task["steps"][-1]["status"] == "completed"
    assert "device-AP-A2-02" in {item["source_id"] for item in task["result"]["evidence"]}


def test_optional_event_ai_failure_never_completes_task(client, api_key, monkeypatch):
    from src.workflows import event_planning

    monkeypatch.setenv("LLM_ENABLED", "true")

    def fail(*args):
        raise RuntimeError("provider private error")

    monkeypatch.setattr(event_planning, "analyze_findings", fail)
    headers = {"X-API-Key": api_key}
    response = client.post("/api/event-plans", json=PLAN, headers=headers)
    assert response.status_code == 500
    task = client.get(f"/api/tasks/{response.json()['detail']['task_id']}", headers=headers).json()
    assert task["status"] == "failed"
    assert task["steps"][-1]["step_id"] == "analyze_event_evidence"
    assert task["steps"][-1]["status"] == "failed"
    assert task["result"]["forecast"]
