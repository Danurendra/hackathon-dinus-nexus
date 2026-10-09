# Testing — DinusNexus Backend

> Status: **implemented and passing**. Last run: 2026-10-09, **41 passed, 1 skipped**.

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

### `tests/test_workflow.py` (6)
- `inspect_report` collects source IDs and marks the step completed.
- `prepare_result` builds facts/evidence and de-duplicates evidence.
- Full graph end-to-end completes with the expected three steps and honors
  filters.
- `analyze_evidence` is `skipped` when the LLM is disabled and `result.analysis`
  is `null`.
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

### `tests/test_persistence.py` (5)
- Result survives a new DB session (engine disposed to simulate restart).
- History survives a new DB session.
- Workflow failure is persisted as `failed` (never `completed`) and returns
  `500` with `WORKFLOW_FAILED`.
- Database outage on save returns `503`.
- LLM failure is persisted as `failed` with `LLM_ANALYSIS_FAILED` and a failed
  `analyze_evidence` step.

### `tests/test_llm_analysis.py` (10 + 1 live)
- Evidence digest is bounded (max records per dataset) and field-filtered
  (allow-list; e.g. `macAddress` never sent).
- Prompt handles empty findings and includes real hits.
- `analyze_findings` returns a validated result and usage.
- Provider error and missing/malformed output raise `LLMAnalysisError`.
- Usage reported as `unavailable` when the provider omits it.
- `analyze_evidence` node: skipped when disabled, completed with usage when
  enabled, and raises `StepFailedError` with a failed step on failure.
- `test_live_analyze_findings` — opt-in real API call (skipped by default).

## Actual results

```
$ pytest
41 passed, 1 skipped in 3.76s
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

- The routine suite **never** calls an external provider; `conftest.py` forces
  `LLM_ENABLED=false` and the LLM tests use fake clients/monkeypatched analyzers.
- The live test is marked `live_llm` and only runs with an explicit opt-in:

```bash
RUN_LIVE_LLM=1 LLM_ENABLED=true pytest -m live_llm -q
```

- Manual live checks performed once each:
  - `generate_text("Reply with exactly: DINUSNEXUS_LLM_OK")` → `DINUSNEXUS_LLM_OK`.
  - `analyze_findings(...)` for the zone-A1 Wi-Fi case → validated summary,
    `usage: {input_tokens: 612, output_tokens: 181}` (paid call).
- Run the default `pytest` for free, deterministic CI; use the live marker only
  when explicitly validating the provider.

## Not yet tested

- Alembic upgrade is verified manually (`docs/DEVELOPMENT_LOG.md`) but has no
  automated test.
- `waiting_for_approval` / `cancelled` states are not implemented.
- No retry/backoff around LLM provider errors yet.