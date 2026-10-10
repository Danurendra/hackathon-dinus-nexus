# Architecture Baseline

## Prinsip

1. Satu platform, banyak workflow campus role.
2. Workflow IT Helpdesk adalah jalur end-to-end pertama.
3. Model AI membantu memahami/menganalisis; tools dan sumber data menyediakan fakta operasional.
4. Setiap tugas memiliki state persisten, hasil, bukti, dan error yang bisa diperiksa.
5. Frontend menampilkan status yang bersumber dari backend, bukan progress palsu.
6. Model/provider harus dipisahkan dari logika workflow karena API panitia belum dikonfirmasi secara teknis.
7. Campus Twin memakai data operasional yang sama jika relasi tersedia; data simulasi selalu dilabeli.
8. Gunakan stack yang sudah ada di repo jika memungkinkan. Pilihan framework, database, queue, dan layanan Azure final: `TBD`.

## Logical architecture

```text
┌─────────────────────────────────────────────────────┐
│ Frontend / Unified Workspace                        │
│ Chat · Upload · Worker Navigation · Task History    │
│ Execution Inspector · Results · Campus Twin 2D      │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS / API contract
┌───────────────────────▼─────────────────────────────┐
│ Application API                                     │
│ Auth/RBAC (final design TBD) · Input Validation      │
│ Conversations · Documents · Tasks · Approvals       │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│ Workflow / Orchestration Engine                     │
│ Task Router → Stateful Workflow → Tool Registry     │
│ Retry/Timeout/Failure State → Result Assembly       │
└───────────────┬──────────────────┬──────────────────┘
                │                  │
┌───────────────▼─────────┐  ┌─────▼─────────────────┐
│ LLM Provider Adapter    │  │ Tools / Data Services│
│ Configurable endpoint   │  │ SQL / document query │
│ Request/response parse  │  │ parsing / calculation│
│ Usage and latency       │  │ network checks       │
└─────────────────────────┘  └──────────┬────────────┘
                                        │
┌───────────────────────────────────────▼─────────────┐
│ Persistence                                        │
│ Tasks/Runs/Steps · Evidence · Documents metadata    │
│ Incidents/Devices · Audit · Token Usage             │
└─────────────────────────────────────────────────────┘
```

## Component responsibilities

### Frontend

- Kirim pesan, file, dan input baru.
- Menampilkan worker aktif, task status, execution timeline, sumber/evidence, output, dan error.
- Membaca riwayat dari backend agar bertahan setelah refresh.
- Tidak menyimpan API key AI di browser.

### Application API

- Memvalidasi input dan file.
- Membuat dan membaca task/conversation.
- Mengirim pekerjaan ke workflow engine.
- Mengirim status dan hasil kembali ke frontend.
- Menegakkan otorisasi di server.

### Workflow engine

- Menetapkan role/workflow.
- Membuat task run dan langkah eksekusi.
- Memanggil tools sesuai allowlist.
- Menyimpan outcome setiap langkah.
- Menangani timeout, kegagalan, kebutuhan approval, dan penyelesaian.

### LLM provider adapter

- Menyembunyikan detail provider dari workflow.
- Memuat endpoint/model dari konfigurasi environment.
- Memformat request dan memvalidasi response.
- Mengambil usage metadata ketika provider mengembalikannya.
- Mengembalikan error yang aman tanpa mengekspos secret.

**Provider, nama model, protokol API, dan schema autentikasi: `TBD`. Jangan mengasumsikan endpoint OpenAI-compatible sampai terverifikasi.**

### Tool registry

Mendaftarkan tools yang eksplisit dan diizinkan, misalnya lookup perangkat, pencarian dokumen, perhitungan, atau pemeriksaan jaringan yang aman. Tool harus mengembalikan data terstruktur beserta metadata sumber/waktu ketika tersedia.

### Persistence

Menyimpan tugas, run, langkah, hasil, dan audit. Teknologi database dan file storage: `TBD` sampai repo dan budget diperiksa.

### Campus Twin

Membaca building/zone/device/incident dari data yang tersedia dan memvisualisasikannya. UI tidak boleh mengubah status perangkat hanya melalui manipulasi tampilan. Sumber status dan label simulasi harus jelas.

## Suggested domain entities

Entitas konseptual (bukan keputusan SQL final):

- `User`, `Role`, `CampusWorker`
- `Conversation`, `Message`
- `Document`, `DocumentChunk` jika retrieval chunking diperlukan
- `Task`, `TaskRun`, `ExecutionStep`
- `Evidence`, `ToolCall`
- `Incident`, `CampusBuilding`, `CampusZone`, `CampusDevice`, `DeviceEvent`
- `Approval`, `AuditLog`, `TokenUsage`

Implementasi boleh menggabungkan atau memisahkan tabel sesuai database dan pola repo.

## Contract principle

Kontrak API perlu memakai ID stabil dan state eksplisit. Format final endpoint/DTO: `TBD` setelah audit stack. Minimal frontend dapat membuat task, membaca status/run steps, mengirim pesan/file, membuka hasil, dan membaca history. Status konseptual: `queued`, `running`, `waiting_for_approval`, `completed`, `failed`, `cancelled`.

## Failure behavior

- Provider tidak tersedia: simpan error task dan tampilkan pesan aman.
- Tool gagal: tandai langkah gagal dan jangan menghasilkan klaim seolah tool sukses.
- Bukti kurang: nyatakan diagnosis belum pasti.
- Input tidak valid: tolak dengan pesan koreksi yang jelas.
- Upload gagal: tampilkan error dan jangan mengklaim dokumen telah diproses.
- Refresh/reconnect: muat status dari persistence.

## Hal yang masih TBD

- Framework dan struktur repo aktual.
- Identitas/login dan model RBAC yang tepat.
- Model/provider/API panitia.
- Database dan strategi migrasi.
- Metode background execution/realtime update.
- Parser per jenis file.
- Sumber device/network data dan apakah real atau sintetis.
- Azure services dan domain/HTTPS setup.

---

# Implemented Architecture — IT Helpdesk Vertical Slice

> Status: **implemented and tested** (deterministic path). LLM integration is
> `planned`. This section documents the code that actually exists in the
> repository, in contrast to the conceptual baseline above.

## Components as built

### Akun dan sesi PostgreSQL

`src/account_api.py` menyediakan login/me/logout, `src/accounts.py` memverifikasi
password dan sesi, dan `src/create_user.py` melakukan provisioning admin lokal.
Migrasi `0004_user_sessions` menambah `users` dan `user_sessions` tanpa mengubah
persistence task existing. `src/auth.py` menerima bearer session terverifikasi atau
API key existing; bearer invalid tidak fallback. Semua akun aktif berbagi workspace
operasional; RBAC/isolasi data per akun, SSO dan reset password mandiri belum tersedia.
Frontend `/login` menyimpan token sementara di sessionStorage dan logout mencabut
digest sesi di database. Kontrak, keamanan dan setup: `docs/API.md#login-postgresql`.

### Campus Operations event workflow

`src/event_api.py` diregistrasikan oleh `src/main.py` setelah helper task tersedia.
Graph `src/workflows/event_planning.py` menjalankan inventory sintetis → kalkulasi
event → rekomendasi → review AI opsional, memakai tabel Task/TaskRun/ExecutionStep
existing. UI Operations dan `CampusMap` memakai `EventAgentRun`; bridge Twin
meneruskan input sebagai asumsi, tidak menganggap ID/kapasitas OSM sebagai status
perangkat live. Follow-up mengikat description IT Helpdesk ke event task ID dan
memvalidasi device dari evidence tersimpan. Kontrak: `docs/API.md`; demo dan
batas model: `docs/WORKFLOWS.md`. Langkah review LLM menggunakan wrapper OpenAI
existing, default skipped; facts/evidence tetap tidak diubah model.

| Component | File | Status | Responsibility |
|---|---|---|---|
| API | `src/main.py` | implemented | FastAPI app, request validation, endpoints, response serialization |
| Auth | `src/auth.py`, `src/account_api.py`, `src/accounts.py` | implemented | Sesi akun PostgreSQL atau `X-API-Key` demo (`DINUSNEXUS_API_KEY`) |
| Workflow nodes | `src/main.py` | implemented | Deterministic LangGraph state machine |
| Data adapter | `src/data_adapter.py` | implemented | Keyword/synonym retrieval over JSON datasets |
| Datasets | `src/data/*.json` | implemented | 59 synthetic records, labeled `SYNTHETIC` |
| Persistence | `src/db/session.py`, `src/db/models.py` | implemented | SQLAlchemy engine, session, `Task` model |
| Migrations | `alembic/` | implemented | Baseline migration `0001_create_tasks` |
| LLM client | `src/llm/client.py` | implemented | OpenAI Responses API wrapper |
| LLM analysis | `src/llm/analysis.py` | implemented (opt-in) | Bounded evidence digest + Structured Outputs |

## Request flow

```text
Client (X-API-Key)
      │
      ▼
FastAPI  POST /api/tasks
      │  validate CreateTaskInput (Pydantic)
      ▼
PostgreSQL  INSERT task (status=queued)          ← src/db
      │
      ▼
LangGraph  inspect_report → analyze_evidence → prepare_result   ← src/main.py
      │            │                 │
      │            │                 └── analyze_findings(...)   ← src/llm/analysis.py
      │            │                        (bounded digest → OpenAI Structured Outputs)
      │            └── search_helpdesk(query, zone_id, device_type)  ← src/data_adapter.py
      │                        │
      │                        └── src/data/*.json (synthetic)
      ▼
PostgreSQL  UPDATE task (status, steps, result)  ← src/db
      │
      ▼
Response JSON (task + steps + facts + evidence)
```

The workflow runs **synchronously** inside the request. There is no background
worker or queue yet; long-running execution is a future concern.

## Workflow state

`WorkflowState` (a `TypedDict`) carries:

| Field | Set by | Used by |
|---|---|---|
| `task_id`, `description`, `location`, `device_type` | API (input) | `inspect_report` |
| `status` | nodes | API |
| `steps` | `inspect_report`, then appended by each node | API / persistence |
| `findings` | `inspect_report` | `analyze_evidence`, `prepare_result` |
| `analysis` | `analyze_evidence` (empty when disabled) | `prepare_result` |
| `result` | `prepare_result` | API / persistence |

Nodes:

1. `inspect_report` — calls `search_helpdesk` with the request `location`
   (`zone_id`) and `device_type`; records source IDs; sets status `running`.
2. `analyze_evidence` — **optional**. When `LLM_ENABLED` is not true, records a
   `skipped` step and returns an empty `analysis`. When enabled, calls
   `analyze_findings` (bounded digest → OpenAI Structured Outputs). On provider or
   validation failure it raises `StepFailedError` carrying a `failed` step, so the
   task is persisted as `failed` and never as `completed`.
3. `prepare_result` — reads `findings` (guarding against the previously observed
   `KeyError: 'findings'`), builds `facts`, de-duplicated `evidence`,
   `interpretation`, `uncertainty`, and `recommendations`, and sets status
   `completed`. Every result carries `data_label: SYNTHETIC`.

### Trust boundaries

- `facts` and `evidence` are **always** derived from the data adapter. The LLM
  cannot add, remove, or invent records or source IDs — it never receives an
  instruction to emit IDs and its output is stored separately under
  `result.analysis`.
- The provider receives only allow-listed, truncated fields from at most 6 records
  per dataset.

## Component boundaries

- **API** owns validation, authentication, and task lifecycle; it does not
  contain retrieval or analysis logic.
- **Data adapter** is the only source of operational records. The LLM (future)
  must not replace or invent records; it may only interpret adapter output.
- **Persistence** stores raw step/result/error payloads as JSON. The `Task`
  model doubles as the run record (`run_id`) until a dedicated run/step table is
  justified.
- **Datasets** are read-only synthetic fixtures loaded from disk.

## Error paths (implemented)

| Situation | Behavior |
|---|---|
| Missing/invalid `X-API-Key` | `401` |
| Server key not configured | `500` (fail closed) |
| Invalid request body | `422` (Pydantic) |
| Task not found | `404` |
| Database unavailable on save/read | `503` |
| Workflow raises | task persisted as `failed` with `error.code=WORKFLOW_FAILED`, API returns `500`; never `completed` |
| LLM analysis fails (provider/validation) | task persisted as `failed` with `error.code=LLM_ANALYSIS_FAILED`, `analyze_evidence` step marked `failed`, API returns `500` |
| No matching records | `completed` with empty `facts`/`evidence` — not a diagnosis |

## Deliberate limitations

- Retrieval is keyword + synonym matching, **not semantic search**. Words such as
  `tidak` are not stop words and can cause incidental matches.
- LLM analysis is **opt-in** (`LLM_ENABLED=true`) and runs synchronously in the
  request; the default deterministic path stays free and easy to test.
- LLM provider calls use a bounded retry policy (transient errors only, timeout
  per request); non-transient errors fail fast as `LLM_ANALYSIS_FAILED`.
- `Base.metadata.create_all()` still runs at API startup for developer
  convenience. Alembic is the managed migration path; `create_all` should be
  removed when deployment begins.
