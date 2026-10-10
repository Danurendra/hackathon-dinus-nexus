import os
import sys
from pathlib import Path

import pytest
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Load the developer .env without overriding already-set variables.
load_dotenv(ROOT / ".env")

# The suite always runs against an isolated database so it never touches
# developer/demo data. TEST_DATABASE_URL wins when provided; otherwise the
# database name of DATABASE_URL gets a `_test` suffix.
_test_url = os.getenv("TEST_DATABASE_URL")
if not _test_url:
    _base = os.getenv("DATABASE_URL")
    if not _base:
        _test_url = "sqlite:///tests_local.db"
    else:
        _url = make_url(_base)
        if _url.drivername.startswith("postgres"):
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)
            host = _url.host or "localhost"
            port = _url.port or 5432
            try:
                sock.connect((host, port))
                sock.close()
                _test_url = _url.set(database=f"{_url.database}_test").render_as_string(hide_password=False)
            except Exception:
                # PostgreSQL not running; fall back to local SQLite test db
                _test_url = f"sqlite:///{ROOT}/tests_local.db"
        else:
            _test_url = _url.set(database=f"{_url.database}_test").render_as_string(hide_password=False)
os.environ["DATABASE_URL"] = _test_url

# Fixed key used by the authentication tests.
os.environ["DINUSNEXUS_API_KEY"] = "test-api-key"

# Keep the routine suite deterministic and free: no live LLM calls.
os.environ["LLM_ENABLED"] = "false"

from src.db import models  # noqa: E402,F401  (register models on Base.metadata)
from src.db.session import Base, engine  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _schema():
    # Ensure the schema exists. Rows are cleaned per test; the schema is left
    # in place so it stays consistent with the Alembic migration state.
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(autouse=True)
def _clean_tasks():
    with engine.begin() as connection:
        if engine.dialect.name == "postgresql":
            connection.execute(
                text(
                    "TRUNCATE TABLE user_sessions, users, execution_steps, task_runs, tasks RESTART IDENTITY CASCADE"
                )
            )
        else:
            for tbl in reversed(Base.metadata.sorted_tables):
                connection.execute(tbl.delete())
    yield


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from src.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def api_key() -> str:
    return os.environ["DINUSNEXUS_API_KEY"]
