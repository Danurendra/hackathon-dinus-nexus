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
| `status` | varchar(40) | no | `queued` / `running` / `completed` / `failed` |
| `created_at` | timestamptz | no | UTC |
| `steps` | json | no | execution timeline (JSON array) |
| `result` | json | yes | facts / evidence / interpretation / … |
| `error` | json | yes | `{code, message}` on failure |

`steps`, `result`, and `error` are stored as JSON because their shape is
workflow-owned and still evolving. A dedicated `task_runs` / `execution_steps`
table is a planned normalization step, not yet required for the vertical slice.

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

## Transactions and persistence policy

- A task row is inserted (`status=queued`) **before** the workflow runs, so every
  submitted task is recorded even if the workflow later fails.
- On success the row is updated with final `status`, `steps`, and `result`.
- On failure the row is updated to `status=failed` with a safe `error` payload.
  A failed workflow must never be stored as `completed`.
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
`TEST_DATABASE_URL`). It is created/dropped by the test fixtures and never
touches developer or demo data.

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