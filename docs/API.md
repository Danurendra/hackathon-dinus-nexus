# API Reference — DinusNexus Backend

> Status: **implemented and tested** for the IT Helpdesk deterministic flow.
> Base URL in local development: `http://127.0.0.1:8000`.
> Interactive schema: `http://127.0.0.1:8000/docs` (Swagger UI) and
> `/openapi.json`.

## Authentication

Protected endpoints require a backend API key sent in the `X-API-Key` header.
The value is read from the `DINUSNEXUS_API_KEY` environment variable.

- Missing or wrong key → `401`.
- Server key not configured → `500` (the API fails closed rather than exposing
  endpoints).

`GET /health` is public.

```bash
# The key is read from your local .env; never commit or paste it into docs.
curl -s http://127.0.0.1:8000/api/history \
  -H "X-API-Key: $DINUSNEXUS_API_KEY"
```

## Endpoints

### `GET /health`

Public liveness probe.

**200**
```json
{ "status": "ok", "service": "dinusnexus-api" }
```

### `POST /api/tasks`

Create a task, persist it, run the helpdesk workflow, and return the final task.

**Headers:** `X-API-Key` (required), `Content-Type: application/json`

**Request body**

| Field | Type | Required | Constraints | Default |
|---|---|---|---|---|
| `worker` | string | no | must be `it_helpdesk` | `it_helpdesk` |
| `description` | string | yes | 5–2000 chars | — |
| `location` | string | no | zone id, e.g. `zone-A1` | `null` |
| `device_type` | string | no | e.g. `access_point`, `gateway` | `null` |

```bash
curl -s -X POST http://127.0.0.1:8000/api/tasks \
  -H "X-API-Key: $DINUSNEXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Wi-Fi di Laboratorium Komputer 1 mengalami gangguan koneksi.",
    "location": "zone-A1",
    "device_type": "access_point"
  }'
```

**201** — the serialized task (see [Task object](#task-object)).

**422** — validation error (Pydantic), for example a description shorter than 5
characters or an unknown worker.

**503** — database unavailable; the task could not be saved.

**500** — workflow failure. The task is still persisted with `status: "failed"`:

```json
{
  "detail": {
    "task_id": "…",
    "run_id": "…",
    "error": { "code": "WORKFLOW_FAILED", "message": "The workflow could not complete." }
  }
}
```

### `GET /api/tasks/{task_id}`

Read a single persisted task.

**Headers:** `X-API-Key` (required)

- **200** — task object.
- **404** — `{ "detail": "Task not found" }`
- **503** — database unavailable.

### `GET /api/history`

List persisted tasks, newest first.

**Headers:** `X-API-Key` (required)

**200**
```json
{ "items": [ { /* task object */ } ] }
```

## Task object

```json
{
  "task_id": "a046ba4d-…",
  "run_id": "…",
  "worker": "it_helpdesk",
  "description": "Wi-Fi di Laboratorium Komputer 1 mengalami gangguan koneksi.",
  "location": "zone-A1",
  "device_type": "access_point",
  "status": "completed",
  "created_at": "2026-10-09T11:27:25.699147+00:00",
  "steps": [
    {
      "step_id": "inspect_report",
      "name": "Search synthetic helpdesk data",
      "status": "completed",
      "source_ids": ["device-AP-A1-01", "device-AP-A1-02", "incident-001", "incident-008", "zone-A1", "building-A"]
    },
    {
      "step_id": "prepare_result",
      "name": "Prepare result from synthetic data",
      "status": "completed",
      "source_ids": ["device-AP-A1-01", "device-AP-A1-02", "incident-001", "incident-008", "zone-A1", "building-A"]
    }
  ],
  "result": {
    "facts": [
      { "dataset": "devices", "record": { "id": "device-AP-A1-01", "…": "…" } }
    ],
    "interpretation": ["Found 8 matching records in synthetic datasets."],
    "uncertainty": ["These records are synthetic and do not represent verified live campus conditions."],
    "recommendations": ["Verify the relevant device and incident details before taking action."],
    "evidence": [
      { "source_id": "device-AP-A1-01", "dataset": "devices" }
    ],
    "data_label": "SYNTHETIC"
  },
  "error": null
}
```

### Field notes

- `steps` — execution timeline. Every step carries an explicit `status`. Only
  steps that actually ran are present.
- `result.facts` — original dataset records, not model-generated text.
- `result.evidence` — `source_id` + `dataset`, de-duplicated.
- `result.interpretation` — human-readable synthesis, kept separate from facts.
- `result.uncertainty` — always states the data is synthetic.
- `result.recommendations` — suggested next steps; **do not** imply an action was
  executed.
- `result.data_label` — always `SYNTHETIC`.
- `error` — populated (`{code, message}`) only for failed tasks.

## Status values

Implemented: `queued`, `running`, `completed`, `failed`.
Reserved for future work: `waiting_for_approval`, `cancelled`
(see `docs/WORKFLOWS.md`).

## Endpoint implementation status

| Endpoint | Implemented | Tested | Notes |
|---|---|---|---|
| `GET /health` | yes | yes | public |
| `POST /api/tasks` | yes | yes | auth + validation + persistence |
| `GET /api/tasks/{id}` | yes | yes | reads from PostgreSQL |
| `GET /api/history` | yes | yes | reads from PostgreSQL |
| LLM-backed analysis | no | no | planned (`analyze_evidence`) |