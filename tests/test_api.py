from src.main import CreateTaskInput


def _auth(api_key):
    return {"X-API-Key": api_key}


def test_health_is_public(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "dinusnexus-api"}


def test_protected_endpoints_require_api_key(client):
    assert client.post("/api/tasks", json={"description": "jaringan down"}).status_code == 401
    assert client.get("/api/tasks/anything").status_code == 401
    assert client.get("/api/history").status_code == 401
    assert client.get("/api/metrics/tokens").status_code == 401


def test_protected_endpoints_reject_wrong_api_key(client):
    response = client.get("/api/history", headers={"X-API-Key": "wrong-key"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or missing API key."


def test_create_task_success_returns_grounded_result(client, api_key):
    response = client.post(
        "/api/tasks",
        headers=_auth(api_key),
        json={
            "description": "Wi-Fi di Laboratorium Komputer 1 mengalami gangguan koneksi.",
            "location": "zone-A1",
            "device_type": "access_point",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "completed"
    assert body["worker"] == "it_helpdesk"
    assert body["result"]["data_label"] == "SYNTHETIC"
    assert body["result"]["evidence"]
    assert [step["step_id"] for step in body["steps"]] == [
        "inspect_report",
        "analyze_evidence",
        "prepare_result",
    ]

    evidence_ids = {e["source_id"] for e in body["result"]["evidence"]}
    assert {"device-AP-A1-01", "device-AP-A1-02"} <= evidence_ids
    assert {"incident-001", "incident-008"} <= evidence_ids


def test_create_task_without_zone_still_completes(client, api_key):
    response = client.post(
        "/api/tasks",
        headers=_auth(api_key),
        json={"description": "Masalah jaringan di kampus."},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "completed"
    assert body["location"] is None
    assert body["result"]["data_label"] == "SYNTHETIC"


def test_create_task_deterministic_no_match(client, api_key):
    response = client.post(
        "/api/tasks",
        headers=_auth(api_key),
        json={"description": "quantum entanglement offsite"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "completed"
    assert body["result"]["facts"] == []
    assert body["result"]["evidence"] == []


def test_invalid_input_is_rejected(client, api_key):
    too_short = client.post(
        "/api/tasks",
        headers=_auth(api_key),
        json={"description": "abc"},
    )
    assert too_short.status_code == 422

    wrong_worker = client.post(
        "/api/tasks",
        headers=_auth(api_key),
        json={"description": "jaringan down", "worker": "not_a_worker"},
    )
    assert wrong_worker.status_code == 422

    missing_body = client.post("/api/tasks", headers=_auth(api_key))
    assert missing_body.status_code == 422


def test_get_task_roundtrip(client, api_key):
    created = client.post(
        "/api/tasks",
        headers=_auth(api_key),
        json={"description": "jaringan di Laboratorium Komputer 1", "location": "zone-A1"},
    ).json()

    response = client.get(f"/api/tasks/{created['task_id']}", headers=_auth(api_key))

    assert response.status_code == 200
    assert response.json()["task_id"] == created["task_id"]
    assert response.json()["run_id"] == created["run_id"]


def test_get_missing_task_returns_404(client, api_key):
    response = client.get("/api/tasks/does-not-exist", headers=_auth(api_key))

    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found"


def test_history_lists_tasks_newest_first(client, api_key):
    for i in range(3):
        created = client.post(
            "/api/tasks",
            headers=_auth(api_key),
            json={"description": f"jaringan masalah nomor {i}", "location": "zone-A1"},
        )
        assert created.status_code == 201

    response = client.get("/api/history", headers=_auth(api_key))

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 3
    created_dates = [item["created_at"] for item in items]
    assert created_dates == sorted(created_dates, reverse=True)


def test_create_task_input_model_defaults():
    payload = CreateTaskInput(description="jaringan down")

    assert payload.worker == "it_helpdesk"
    assert payload.location is None
    assert payload.device_type is None


def test_cors_preflight_allows_configured_origin(client):
    response = client.options(
        "/api/tasks",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_header_present_on_response(client):
    response = client.get("/health", headers={"Origin": "http://127.0.0.1:3000"})

    assert response.headers.get("access-control-allow-origin") == "http://127.0.0.1:3000"


def test_token_metrics_with_no_usage(client, api_key):
    client.post(
        "/api/tasks",
        headers=_auth(api_key),
        json={"description": "jaringan down", "location": "zone-A1"},
    )

    response = client.get("/api/metrics/tokens", headers=_auth(api_key))

    assert response.status_code == 200
    body = response.json()
    assert body["totals"]["tasks"] == 1
    assert body["totals"]["tasks_with_usage"] == 0
    assert body["totals"]["unavailable"] == 1
    assert body["totals"]["input_tokens"] == 0
    assert body["by_model"] == []
    assert body["items"] == []