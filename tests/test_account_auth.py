from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from src.accounts import hash_password, token_digest, verify_password
from src.db.models import User, UserSession
from src.db.session import SessionLocal

PASSWORD = "test-password-long-enough"
PASSWORD_HASH = hash_password(PASSWORD)


@pytest.fixture
def account():
    with SessionLocal() as db:
        user = User(email="staff@example.test", display_name="Campus Staff", password_hash=PASSWORD_HASH)
        db.add(user)
        db.commit()
        return user.user_id


def sign_in(client, password=PASSWORD):
    return client.post("/api/auth/login", json={"email": " STAFF@example.test ", "password": password})


def test_password_is_salted_and_never_plaintext():
    encoded = hash_password(PASSWORD)
    assert encoded != PASSWORD_HASH
    assert PASSWORD not in encoded
    assert verify_password(PASSWORD, encoded)
    assert not verify_password("wrong", encoded)
    assert not verify_password(PASSWORD, "invalid")
    with pytest.raises(ValueError):
        hash_password("short")


def test_login_session_persists_and_logout_revokes(client, account):
    response = sign_in(client)
    assert response.status_code == 200
    data = response.json()
    assert response.headers["cache-control"] == "no-store"
    assert data["user"]["email"] == "staff@example.test"
    assert "password_hash" not in data["user"]
    token = data["access_token"]
    auth = {"Authorization": f"Bearer {token}"}
    with SessionLocal() as db:
        session = db.get(UserSession, token_digest(token))
        assert session is not None
        assert session.token_hash != token
        assert session.user_id == account
    assert client.get("/api/auth/me", headers=auth).json()["user"]["user_id"] == account
    assert client.get("/api/history", headers=auth).status_code == 200
    assert client.get("/api/tasks/missing", headers=auth).status_code == 404
    task_response = client.post("/api/tasks", headers=auth, json={"description": "Periksa Wi-Fi laboratorium", "requested_action": "restart_device"})
    assert task_response.status_code == 201
    task_id = task_response.json()["task_id"]
    assert client.get(f"/api/tasks/{task_id}/runs", headers=auth).status_code == 200
    assert client.post(f"/api/tasks/{task_id}/approval", headers=auth, json={"decision": "reject"}).status_code == 200
    assert client.post("/api/conversations", headers=auth, json={"worker": "it_helpdesk", "title": "Session test"}).status_code == 201
    assert client.post("/api/auth/logout", headers=auth).status_code == 204
    assert client.get("/api/auth/me", headers=auth).status_code == 401
    assert client.get("/api/history", headers=auth).status_code == 401
    assert client.post("/api/auth/logout", headers=auth).status_code == 204


def test_wrong_and_unknown_login_have_same_error(client, account):
    wrong = sign_in(client, "wrong")
    unknown = client.post("/api/auth/login", json={"email": "missing@example.test", "password": PASSWORD})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()
    with SessionLocal() as db:
        assert db.scalar(select(UserSession)) is None


def test_account_locks_after_five_failures_and_can_recover(client, account):
    for _ in range(5):
        assert sign_in(client, "wrong").status_code == 401
    assert sign_in(client).status_code == 401
    with SessionLocal() as db:
        user = db.get(User, account)
        assert user.failed_logins == 5
        user.locked_until = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    assert sign_in(client).status_code == 200
    with SessionLocal() as db:
        assert db.get(User, account).failed_logins == 0


def test_expired_and_disabled_sessions_are_rejected(client, account):
    token = sign_in(client).json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}
    with SessionLocal() as db:
        session = db.get(UserSession, token_digest(token))
        session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    assert client.get("/api/auth/me", headers=auth).status_code == 401
    token = sign_in(client).json()["access_token"]
    with SessionLocal() as db:
        db.get(User, account).is_active = False
        db.commit()
    assert client.get("/api/history", headers={"Authorization": f"Bearer {token}"}).status_code == 401
    assert sign_in(client).status_code == 401


def test_invalid_bearer_does_not_fall_back_to_demo_key(client, api_key):
    assert client.get("/api/history", headers={"Authorization": "Bearer invalid", "X-API-Key": api_key}).status_code == 401
    assert client.get("/api/history", headers={"X-API-Key": api_key}).status_code == 200
    assert client.get("/api/auth/me", headers={"X-API-Key": api_key}).status_code == 401
    assert client.post("/api/auth/logout").status_code == 401


def test_invalid_input_rejected(client):
    assert client.post("/api/auth/login", json={"email": "not-email", "password": PASSWORD}).status_code == 422
    assert client.post("/api/auth/login", json={"email": "staff@example.test", "password": "x" * 129}).status_code == 422
    assert client.post("/api/auth/login", json={"email": "staff@example.test", "password": PASSWORD, "role": "admin"}).status_code == 422


def test_logout_only_revokes_its_own_session(client, account):
    first = sign_in(client).json()["access_token"]
    second = sign_in(client).json()["access_token"]
    assert client.post("/api/auth/logout", headers={"Authorization": f"Bearer {first}"}).status_code == 204
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {second}"}).status_code == 200


def test_login_database_failure_is_safe(client, monkeypatch):
    from sqlalchemy.exc import OperationalError
    import src.account_api as api

    def broken():
        raise OperationalError("private sql", {}, Exception("private credentials"))

    monkeypatch.setattr(api, "SessionLocal", broken)
    response = sign_in(client)
    assert response.status_code == 503
    assert "private" not in response.text
