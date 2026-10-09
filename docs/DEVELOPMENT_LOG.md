# Development Log

Reverse-chronological milestones. Each entry records changes, reasons, files,
commands actually run, and actual results. Do not claim a test passed without a
recorded run.

---

## 2026-10-09 — Bounded LLM retry, timeout, and backoff

**Goal.** Harden the optional LLM step so transient provider failures are
retried a bounded number of times, non-transient failures fail fast, and every
request has a timeout.

### Changes

| Area | Files | Notes |
|---|---|---|
| LLM analysis | `src/llm/analysis.py` | `_request_with_retry`, `_is_transient`, `_backoff_delay`, `max_attempts`, timeout per call |
| LLM client | `src/llm/client.py` | `max_retries=0` (single, testable retry policy) |
| Tests | `tests/test_llm_analysis.py` | retry/clamp/no-retry scenarios |
| Config/docs | `.env.example`, `README.md`, `docs/API.md`, `docs/TESTING.md` | `LLM_MAX_ATTEMPTS`, `LLM_TIMEOUT_SECONDS`, `LLM_RETRY_BASE_DELAY` |

### Policy

- Retry only transient errors: connection/timeout, HTTP 408/409/429, and 5xx.
- Exponential backoff (base `LLM_RETRY_BASE_DELAY`) with jitter; attempts bounded
  by `LLM_MAX_ATTEMPTS` (default 3, clamped 1..5).
- Non-transient errors (400/401) and structurally invalid output fail fast.
- OpenAI SDK internal retries disabled so total attempts equal the configured
  bound.

### Commands and actual results

```text
python -m compileall -q src   -> exit 0
pytest tests/test_llm_analysis.py -v
  -> 14 passed, 1 skipped
pytest
  -> 45 passed, 1 skipped in 3.51s
```

### Open issues

- Backoff timing is not asserted (time.sleep patched in tests).
- No circuit breaker; each request retries independently.

### Next steps

1. Surface retry count in `result.analysis` metadata for observability.
2. Consider background execution for long LLM calls.

---

## 2026-10-09 — Optional LLM `analyze_evidence` step (Structured Outputs)

**Goal.** Integrate OpenAI into the LangGraph workflow as an optional, validated
analysis step, without letting the model invent facts/source IDs or masking
failures.

### Changes

| Area | Files | Notes |
|---|---|---|
| LLM analysis | `src/llm/analysis.py` (new) | bounded digest, allow-listed fields, prompt, `AnalysisOutput` schema, `analyze_findings`, `LLMAnalysisError`, usage capture |
| Workflow | `src/main.py` | new `analyze_evidence` node, `StepFailedError`, `llm_enabled()`, `analysis` in state, `_persist_failed_task`, 3-node graph |
| Tests | `tests/test_llm_analysis.py` (new), `tests/test_workflow.py`, `tests/test_api.py`, `tests/test_persistence.py`, `pytest.ini` | 42 collected (41 passed, 1 live skipped) |
| Config | `.env.example`, `pytest.ini` | `LLM_ENABLED=false` default; `live_llm` marker |
| Docs | `README.md`, `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md` | analysis field, failure behavior, trust boundaries |

### Design decisions

- **Opt-in.** `LLM_ENABLED` defaults to `false`, so tests and CI stay free and
  deterministic. Demo enables it explicitly.
- **Trust boundary.** `facts`/`evidence` are computed only from the data adapter.
  The model receives at most 6 records/dataset with allow-listed, truncated
  fields and is never asked for source IDs (so it cannot invent them).
- **Structured Outputs.** `client.responses.parse(text_format=AnalysisOutput)`
  with a strict Pydantic schema; invalid output raises `LLMAnalysisError`.
- **Fail loud.** LLM failure → `StepFailedError` → task `failed` with
  `LLM_ANALYSIS_FAILED` and a failed `analyze_evidence` step; never `completed`.
- **Token efficiency.** Bounded digest; provider usage stored in
  `result.analysis.usage` (`{"status": "unavailable"}` when absent). No prompt or
  credential logging.

### Commands and actual results

```text
python -m py_compile src/main.py src/llm/analysis.py
  -> compile ok
pytest
  -> 41 passed, 1 skipped in 3.76s

# live verification (paid, one call)
analyze_findings(zone-A1 Wi-Fi report, access_point findings)
  -> status: OK
  -> model: gpt-4o-mini
  -> usage: {input_tokens: 612, output_tokens: 181}
  -> summary: "Gangguan koneksi Wi-Fi di Laboratorium Komputer 1 telah dilaporkan."
```

### Open issues

- No retry/backoff around provider errors yet.
- LLM step runs synchronously inside the request.
- Live LLM test is opt-in (`RUN_LIVE_LLM=1`); not part of default CI.

### Next steps

1. Bounded retry for transient provider errors (rate limit/timeout).
2. Decide whether to expose `LLM_ENABLED` per request vs. environment.
3. Consider background execution for long LLM calls.

---

## 2026-10-09 — Deterministic Helpdesk slice: tests, migrations, auth, docs

**Goal.** Reach a verifiable end-to-end deterministic Helpdesk slice: report →
retrieval → evidence → PostgreSQL persistence → history, with automated tests,
managed migrations, API security, and documentation. LLM integration deferred by
team decision.

### Audit findings (baseline, before changes)

- Branch `feat/helpdesk-state-machine`; HEAD `51872ab`; `src/main.py` modified
  (PostgreSQL integration, uncommitted); `src/db/models.py`, `src/llm/`,
  `src/main.py.bak` untracked.
- Working: datasets valid, adapter search, PostgreSQL table `tasks` with 2 rows.
- Missing: any tests, Alembic, API auth, `.env.example`, implementation docs.
- `requirements.txt` did not list `openai` or `python-dotenv` even though both
  were installed.

### Changes

| Area | Files | Notes |
|---|---|---|
| Dependencies | `requirements.txt` | added `python-dotenv`, `openai` |
| Env template | `.env.example` (new) | placeholders only; no real secrets |
| Ignore rules | `.gitignore` | ignore `.env.*`, keep `.env.example`, ignore `*.bak` |
| Tests | `tests/conftest.py`, `tests/test_data_adapter.py`, `tests/test_workflow.py`, `tests/test_api.py`, `tests/test_persistence.py`, `pytest.ini` | 29 tests |
| Migrations | `alembic.ini`, `alembic/env.py`, `alembic/script.py.mako`, `alembic/versions/0001_create_tasks.py` | baseline `tasks` schema |
| Auth | `src/auth.py` (new), `src/main.py` | `X-API-Key` dependency; removed unused import |
| Docs | `docs/API.md`, `docs/DATABASE.md`, `docs/TESTING.md`, `docs/DEVELOPMENT_LOG.md` (new), `docs/ARCHITECTURE.md` (appended) | implementation docs |

### Commands and actual results

```text
python check_data.py
  → PASS: relasi data valid (4/18/25/12 records)

python -m compileall -q src
  → exit 0

pytest
  → 29 passed in 2.52s

alembic stamp head          # baseline existing dev table
  → Running stamp_revision -> 0001_create_tasks
alembic check
  → No new upgrade operations detected.
DATABASE_URL=<dinusnexus_test> alembic upgrade head
  → Running upgrade -> 0001_create_tasks, create tasks table
  → tables: alembic_version, tasks

python (live LLM, one-off)
  → model gpt-4o-mini, output DINUSNEXUS_LLM_OK
```

### Notes and decisions

- The test suite runs against an isolated `<db>_test` database; it never touches
  demo data. `docker exec ... CREATE DATABASE dinusnexus_test` was run once.
- Baseline migration was applied to the existing dev database with
  `alembic stamp head` (no table recreation, no data loss, no volume reset).
- A local `DINUSNEXUS_API_KEY` was appended to `.env` (value not printed, file
  gitignored). Protected endpoints fail closed with `500` if it is unset.
- The search adapter's keyword approach can produce incidental matches (e.g.
  `tidak` is not a stop word). Documented as a limitation; behavior unchanged.

### Open issues

- LLM (`analyze_evidence`) not wired into LangGraph — deferred.
- `Base.metadata.create_all()` still runs at API startup; remove at deployment.
- No automated test for Alembic upgrade.
- `waiting_for_approval` / `cancelled` states not implemented.

### Next steps

1. Wire `analyze_evidence` with structured-output validation + deterministic
   fallback; keep the deterministic path default and free in tests.
2. Normalize `task_runs` / `execution_steps` if run history per attempt is needed.
3. Replace startup `create_all` with `alembic upgrade head` in run/deploy flow.
4. Token usage capture for the LLM step.