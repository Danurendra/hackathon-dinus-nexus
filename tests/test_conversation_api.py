from src.llm.adapter import LLMResponse


def test_conversation_endpoints_require_api_key(client):
    response = client.post(
        "/api/conversations",
        json={"worker": "it_helpdesk", "title": "Unauthenticated"},
    )

    assert response.status_code == 401


def test_conversation_rejects_unknown_worker(client, api_key):
    response = client.post(
        "/api/conversations",
        headers={"X-API-Key": api_key},
        json={"worker": "unsupported_worker"},
    )

    assert response.status_code == 422


def test_conversation_returns_safe_provider_error(client, api_key, monkeypatch):
    from src import main

    conversation = client.post(
        "/api/conversations",
        headers={"X-API-Key": api_key},
        json={"worker": "network_operations", "title": "Provider failure"},
    )
    conversation_id = conversation.json()["conversation_id"]

    async def fail_request(*args, **kwargs):
        raise RuntimeError("provider secret must not be returned")

    monkeypatch.setattr(main.llm_client, "chat_completion", fail_request)
    response = client.post(
        f"/api/conversations/{conversation_id}/messages",
        headers={"X-API-Key": api_key},
        json={"content": "Analisis anomali jaringan"},
    )

    assert response.status_code == 502
    assert "provider secret" not in response.text
    assert "belum dapat memproses" in response.json()["detail"]


def test_conversation_uses_selected_worker(client, api_key, monkeypatch):
    from src import main

    conversation = client.post(
        "/api/conversations",
        headers={"X-API-Key": api_key},
        json={"worker": "campus_operations", "title": "Campus analysis"},
    )
    conversation_id = conversation.json()["conversation_id"]

    async def complete_request(*args, **kwargs):
        return LLMResponse(
            content="Analisis berbasis data sintetis.",
            usage={"prompt_tokens": 10, "completion_tokens": 6},
            model="test-model",
        )

    monkeypatch.setattr(main.llm_client, "chat_completion", complete_request)
    response = client.post(
        f"/api/conversations/{conversation_id}/messages",
        headers={"X-API-Key": api_key},
        json={"content": "Analisis kapasitas gedung"},
    )

    assert response.status_code == 201
    assert response.json()["metadata"]["worker"] == "campus_operations"
