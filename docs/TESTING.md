# Testing — DinusNexus Backend

> Status: **implemented and passing**. Last run: 2026-10-09, **29 passed**.

## Prerequisites

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

Tests read `.env` (see `.env.example`). They always run against an isolated
database: the database name of `DATABASE_URL` with a `_test` suffix, or the URL
in `TEST_DATABASE_URL` when set. They never mutate `dinusnexus` (demo data).

```bash
# One-time: create the test database (the dinusnexus role has CREATEDB).
docker exec dinusnexus-postgres psql -U dinusnexus -d dinusnexus \
  -c "CREATE DATABASE dinusnexus_test;"
```

## Running tests

```bash
# Whole suite.
pytest

# Verbose.
pytest -v

# A single file.
pytest tests/test_api.py -q

# A single test.
pytest tests/test_workflow.py::test_graph_end_to_end_completes_with_filters -q
```

`pytest.ini` sets `testpaths = tests`.

## Fixtures

Defined in `tests/conftest.py`:

| Fixture | Scope | Purpose |
|---|---|---|
| `_schema` | session | `create_all` on the test DB before, `drop_all` after |
| `_clean_tasks` | function (autouse) | truncates `tasks` before each test for isolation |
| `client` | function | `fastapi.testclient.TestClient` around `src.main:app` |
| `api_key` | function | fixed test key (`test-api-key`) |

Environment setup in `conftest.py` runs before importing `src.*`, pointing
`DATABASE_URL` at the test database and setting `DINUSNEXUS_API_KEY`.

## Scenarios covered

### `tests/test_data_adapter.py` (9)
- Dataset counts (4 buildings / 18 zones / 25 devices / 12 incidents) and
  referential integrity.
- Lookup helpers `get_zone` / `get_device`, including missing IDs.
- Zone filtering (`find_devices`, `find_incidents` for `zone-A1`).
- `search_helpdesk("network", zone_id="zone-A1")` → `incident-001`, `incident-008`.
- Combined device-type + zone filter (`access_point`).
- Device-type filter narrows to the requested type.
- Unmatched query and empty query return empty `matches`.
- Unknown zone returns no records.

### `tests/test_workflow.py` (5)
- `inspect_report` collects source IDs and marks the step completed.
- `prepare_result` builds facts/evidence and de-duplicates evidence.
- Full graph end-to-end completes with the expected two steps and honors
  filters.
- Graph without location context still completes.
- Empty result is **not** treated as a diagnosis (empty facts/evidence).

### `tests/test_api.py` (11)
- `/health` is public.
- Protected endpoints require a key (`401`) and reject a wrong key (`401`).
- Create task success returns grounded `SYNTHETIC` result with evidence.
- Create without zone context still completes.
- Deterministic no-match request.
- Input validation: too-short description, unknown worker, missing body (`422`).
- Task round-trip (`GET /api/tasks/{id}`).
- Missing task → `404`.
- History lists tasks newest-first.
- `CreateTaskInput` defaults.

### `tests/test_persistence.py` (4)
- Result survives a new DB session (engine disposed to simulate restart).
- History survives a new DB session.
- Workflow failure is persisted as `failed` (never `completed`) and returns
  `500` with `WORKFLOW_FAILED`.
- Database outage on save returns `503`.

## Actual results

```
$ pytest
.............................                                            [100%]
29 passed in 2.52s
```

## Smoke test (manual)

```bash
# 1. Start the API.
source .venv/bin/activate
uvicorn src.main:app --reload

# 2. Health (public).
curl -s http://127.0.0.1:8000/health

# 3. Create a task (key from your local .env).
curl -s -X POST http://127.0.0.1:8000/api/tasks \
  -H "X-API-Key: $DINUSNEXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"description":"Wi-Fi di Laboratorium Komputer 1 mengalami gangguan koneksi.","location":"zone-A1","device_type":"access_point"}'

# 4. Confirm the response status is "completed" and result.data_label == "SYNTHETIC".

# 5. Read history (survives restart).
curl -s http://127.0.0.1:8000/api/history -H "X-API-Key: $DINUSNEXUS_API_KEY"
```

## Mocked vs live LLM

- The deterministic workflow tests **never** call an external provider.
- `src/llm/client.py` is not yet part of the workflow, so there are no
  provider-dependent tests in CI.
- A manual live check was performed once:
  `generate_text("Reply with exactly: DINUSNEXUS_LLM_OK")` with
  `LLM_MODEL=gpt-4o-mini` returned `DINUSNEXUS_LLM_OK`. This is a paid API call;
  it is **not** part of the routine suite. When LLM integration lands, live calls
  must be marked so the default `pytest` run stays free and deterministic.

## Not yet tested

- Alembic upgrade is verified manually (`docs/DEVELOPMENT_LOG.md`) but has no
  automated test.
- `waiting_for_approval` / `cancelled` states are not implemented.