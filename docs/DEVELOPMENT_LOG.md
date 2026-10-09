# Development Log

Reverse-chronological milestones. Each entry records changes, reasons, files,
commands actually run, and actual results. Do not claim a test passed without a
recorded run.

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