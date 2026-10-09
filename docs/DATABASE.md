# Database — PostgreSQL Persistence

> Status: **implemented and tested**. Schema is managed by Alembic.

## Stack

- PostgreSQL 16 (local Docker container `dinusnexus-postgres`).
- SQLAlchemy 2.x declarative ORM (`src/db/`).
- Alembic migrations (`alembic/`).

## Local setup

The container is expected to expose host port `5434` bound to `127.0.0.1`,
database `dinusnexus`, user `dinusnexus`.

```bash
docker run -d --name dinusnexus-postgres \
  -e POSTGRES_USER=dinusnexus \
  -e POSTGRES_PASSWORD=<choose-a-local-password> \
  -e POSTGRES_DB=dinusnexus \
  -p 127.0.0.1:5434:5432 \
  -v dinusnexus_pgdata:/var/lib/postgresql/data \
  postgres:16
```

Copy `.env.example` to `.env` and set `DATABASE_URL`, for example:

```text
DATABASE_URL=postgresql+psycopg://dinusnexus:<password>@127.0.0.1:5434/dinusnexus
```

Never commit `.env`. Never paste connection strings containing passwords into
documentation, logs, or issues.

## Models

### `tasks` (`src/db/models.py` → `Task`)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `task_id` | varchar(36) | no | primary key (UUID string) |
| `run_id` | varchar(36) | no | unique; one run per task today |
| `worker` | varchar(100) | no | e.g. `it_helpdesk` |
| `description` | text | no | user report |
| `location` | varchar(255) | yes | zone id |
| `device_type` | varchar(100) | yes | requested device type |
| `requested_action` | varchar(100) | yes | normalized action; sensitive values gate on approval |
| `status` | varchar(40) | no | `queued` / `running` / `waiting_for_approval` / `completed` / `failed` / `cancelled` |
| `created_at` | timestamptz | no | UTC |
| `steps` | json | no | execution timeline (JSON array, kept for the API contract) |
| `result` | json | yes | facts / evidence / interpretation / … |
| `error` | json | yes | `{code, message}` on failure |
| `approval` | json | yes | `{required, status, action, decision, note, decided_at}` |
| `llm_model` | varchar(100) | yes | model id when the LLM step ran |
| `input_tokens` | integer | yes | provider input tokens |
| `output_tokens` | integer | yes | provider output tokens |

`steps`, `result`, `error`, and `approval` are stored as JSON because their shape
is workflow-owned and still evolving. The `llm_model`/token columns are extracted
from `result.analysis.usage` at task completion so the token metrics endpoint can
aggregate with SQL. `steps` remains in the response for backward compatibility;
the queryable store is normalized into `task_runs` / `execution_steps` below.

### `task_runs` (`TaskRun`)

One row per workflow run. Today a task has exactly one run, but the table is
keyed independently (`run_id`) so retries/reruns can be added later.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `run_id` | varchar(36) | no | primary key |
| `task_id` | varchar(36) | no | FK → `tasks.task_id` (ON DELETE CASCADE), indexed |
| `worker` | varchar(100) | no | e.g. `it_helpdesk` |
| `status` | varchar(40) | no | final run status |
| `created_at` | timestamptz | no | UTC |
| `finished_at` | timestamptz | yes | set on finalization |

### `execution_steps` (`ExecutionStep`)

Ordered steps belonging to a run.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | varchar(36) | no | primary key |
| `run_id` | varchar(36) | no | FK → `task_runs.run_id` (ON DELETE CASCADE), indexed |
| `order_index` | integer | no | 1-based sequence |
| `step_key` | varchar(64) | yes | workflow step id, e.g. `inspect_report` |
| `name` | varchar(255) | no | human-readable label |
| `status` | varchar(40) | no | `completed` / `skipped` / `failed` / `waiting_for_approval` |
| `source_ids` | json | yes | dataset source ids attached to the step |
| `detail` | text | yes | short explanation |
| `error` | json | yes | `{code, message}` for a failed step |
| `model` | varchar(100) | yes | LLM model for the step |
| `usage` | json | yes | token usage for the step |

## Migrations

Configuration: `alembic.ini` + `alembic/env.py`. The URL is injected from
`DATABASE_URL`; nothing is hardcoded.

```bash
source .venv/bin/activate

# Apply all migrations.
alembic upgrade head

# Show current revision.
alembic current

# Detect schema drift between models and the database.
alembic check

# Create a new migration after changing models.
alembic revision --autogenerate -m "describe the change"
```

### Baseline note

The very first table was originally created with
`Base.metadata.create_all()` before Alembic existed. The baseline migration
`0001_create_tasks` reflects that schema; the existing database was marked as
already migrated with:

```bash
alembic stamp head
```

`stamp` records the revision without altering data. Do **not** drop the volume
or reset the database to work around migration issues. For a brand-new database
(including the test database), run `alembic upgrade head`.

Migration `0002_add_token_usage` adds the nullable LLM usage columns
(`llm_model`, `input_tokens`, `output_tokens`) used by
`GET /api/metrics/tokens`. Because the columns are nullable, the deterministic
(no-LLM) path is unaffected.

Migration `0003_runs_steps_approval` adds `requested_action` and `approval` to
`tasks` and creates the normalized `task_runs` and `execution_steps` tables. All
additions are nullable/new tables, so existing data is preserved.

> Operationally: if `create_all` at app startup has already created the new
> tables before `alembic upgrade head` runs, Alembic will fail with
> `DuplicateTable`. Prefer running `alembic upgrade head` before starting the API,
> or drop the empty orphan tables and re-run the migration.

## Transactions and persistence policy

- A task row is inserted (`status=queued`) **before** the workflow runs, so every
  submitted task is recorded even if the workflow later fails.
- On success the row is updated with final `status`, `steps`, and `result`; the
  normalized `task_runs` row and `execution_steps` are written in the same
  transaction.
- On failure the row is updated to `status=failed` with a safe `error` payload
  and a failed run. A failed workflow must never be stored as `completed`.
- An approval decision updates `tasks.approval`/`status`, appends an `approval`
  step, and re-syncs the normalized run/steps.
- Each request uses a short-lived `SessionLocal()` session.

## Inspecting schema safely

```bash
# List tables (no secrets printed).
docker exec dinusnexus-postgres psql -U dinusnexus -d dinusnexus -c "\dt"

# Show the tasks schema.
docker exec dinusnexus-postgres psql -U dinusnexus -d dinusnexus -c "\d tasks"
```

Avoid `\d` commands that echo passwords; `psql` does not print the stored
password, but never run commands that select credential columns.

## Test database

The automated suite runs against a separate database whose name is
`DATABASE_URL`'s database with a `_test` suffix (override with
`TEST_DATABASE_URL`). It never touches developer or demo data. The fixtures
create the schema if needed and truncate the task tables before each test; the
schema is left in place so it stays consistent with the Alembic revision state.

```bash
docker exec dinusnexus-postgres psql -U dinusnexus -d dinusnexus \
  -c "CREATE DATABASE dinusnexus_test;"
```

## Backup notes

For the prototype, the named volume `dinusnexus_pgdata` holds all data. For a
demo, a logical backup is sufficient:

```bash
docker exec dinusnexus-postgres pg_dump -U dinusnexus -d dinusnexus \
  > dinusnexus_backup.sql
```

Do not commit backups; they may contain data.