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
        raise RuntimeError(
            "DATABASE_URL (or TEST_DATABASE_URL) must be set to run the test suite."
        )
    _url = make_url(_base)
    _test_url = _url.set(
        database=f"{_url.database}_test"
    ).render_as_string(hide_password=False)
os.environ["DATABASE_URL"] = _test_url

# Fixed key used by the authentication tests.
os.environ["DINUSNEXUS_API_KEY"] = "test-api-key"

from src.db import models  # noqa: E402,F401  (register models on Base.metadata)
from src.db.session import Base, engine  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _clean_tasks():
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE tasks"))
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