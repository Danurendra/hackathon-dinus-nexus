# Pembagian Tugas Per Fitur — DinusNexus

Dokumen ini adalah breakdown operasional dari [`TEAM_DEVELOPMENT_PLAN.md`](TEAM_DEVELOPMENT_PLAN.md). Setiap baris adalah satu fitur yang dapat selesai dalam satu branch dan satu PR.

Tech stack terkait: backend **FastAPI + LangGraph + SQLAlchemy** (`src/`), frontend **Next.js + TypeScript + Tailwind** (`frontend/`). Lihat [`DECISIONS.md`](DECISIONS.md) (D-016 s.d. D-021).

## Legenda

- **Owner**: orang yang bertanggung jawab utama atas fitur ini.
- **Backup**: orang yang bisa membantu atau me-review.
- **Priority**: P0 (wajib untuk demo), P1 (setelah P0 stabil), P2 (jika waktu memungkinkan).
- **Status**: `todo`, `in_progress`, `in_review`, `done`.

---

## P0 — Foundation & IT Helpdesk Workflow (wajib untuk demo)

### F01 — Repository & Stack Setup

| Field | Value |
|---|---|
| Owner | **C** |
| Backup | B |
| Reviewer | A, B |
| Branch | `chore/stack-setup` |
| Status | `todo` |

**Scope:** kunci stack, inisialisasi project (frontend `frontend/`, backend `src/`), `.env.example`, `.gitignore`, formatter, linter, script `dev`/`build`/`test`/`lint`.

**Deliverable:** repo bisa dijalankan lokal; lint dan type-check berjalan tanpa error.

---

### F02 — Kontrak API & DTO Schema

| Field | Value |
|---|---|
| Owner | **B** |
| Backup | C |
| Reviewer | A |
| Branch | `feat/api-contract` |
| Status | `todo` |

**Scope:** definisikan Pydantic schema (`CreateTaskInput`, `TaskSummary`, `ExecutionStep`, `TaskResult`, `Evidence`, `ApprovalRequest`), fixture JSON, dan dokumentasi endpoint.

**Deliverable:** schema dapat di-import backend & dikonsumsi frontend; fixture tersedia; `docs/API_CONTRACT.md`.

---

### F03 — Workspace Shell & Navigasi

| Field | Value |
|---|---|
| Owner | **A** |
| Backup | C |
| Reviewer | B |
| Branch | `feat/workspace-shell` |
| Status | `todo` |
| Dependency | F01 |

**Scope:** layout (sidebar, workspace tengah, execution inspector), navigasi 8 campus workers + Campus Twin, routing, responsive, empty/loading state.

**Deliverable:** navigasi berfungsi, halaman dasar tidak crash.

---

### F04 — Task Persistence & State Machine

| Field | Value |
|---|---|
| Owner | **B** |
| Backup | C |
| Reviewer | A |
| Branch | `feat/task-state-machine` |
| Status | `todo` |
| Dependency | F01, F02 |

**Scope:** model SQLAlchemy (`Task`, `TaskRun`, `ExecutionStep`), migrasi Alembic, state transition `queued → running → completed/failed/cancelled` + `waiting_for_approval`, endpoint CRUD.

**Deliverable:** task dapat dibuat dan statusnya berubah sesuai state machine; data bertahan setelah restart server.

---

### F05 — Chat Input & New Task Creation (UI)

| Field | Value |
|---|---|
| Owner | **A** |
| Backup | — |
| Reviewer | B |
| Branch | `feat/chat-input` |
| Status | `todo` |
| Dependency | F02, F03 |

**Scope:** komponen chat input + form input baru (deskripsi, lokasi, jenis perangkat, lampiran), validasi client, state UI (idle/submitting/running/success/failed), panggil `POST /api/tasks`.

**Deliverable:** pengguna bisa mengirim task baru dan melihat task ID.

---

### F06 — Document Upload & Parsing

| Field | Value |
|---|---|
| Owner | **B** |
| Backup | C |
| Reviewer | A |
| Branch | `feat/document-upload` |
| Status | `todo` |
| Dependency | F01 |

**Scope:** endpoint upload dengan validasi server (tipe, ukuran, nama), simpan dengan ID internal, parsing `.txt`/`.pdf` teks/`.csv`, metadata dokumen.

**Deliverable:** file ter-upload dan metadata tersimpan; file tidak valid ditolak dengan pesan jelas; label simulasi bila OCR tidak tersedia.

---

### F07 — Upload UX (Frontend)

| Field | Value |
|---|---|
| Owner | **A** |
| Backup | — |
| Reviewer | B |
| Branch | `feat/upload-ux` |
| Status | `todo` |
| Dependency | F05, F06 |

**Scope:** drag-and-drop / file picker, nama & ukuran file, progress upload, status parsing, error upload.

**Deliverable:** upload dari UI dengan status real-time.

---

### F08 — Dataset Sintetis & Tool Adapter

| Field | Value |
|---|---|
| Owner | **C** |
| Backup | B |
| Reviewer | B |
| Branch | `feat/synthetic-data-adapters` |
| Status | `todo` |
| Dependency | F01 |

**Scope:** dataset sintetis (gedung, zona, perangkat, insiden historis), tool adapter read-only (`lookup_device`, `lookup_incident_history`, `lookup_building`) dengan `source_id`, `timestamp`, label `SIMULATED DATA`.

**Deliverable:** dataset minimal 10 gedung, 20 perangkat, 15 insiden; tool mengembalikan data terstruktur berlabel.

---

### F09 — IT Helpdesk Workflow Orchestration

| Field | Value |
|---|---|
| Owner | **B** |
| Backup | C |
| Reviewer | A, C |
| Branch | `feat/helpdesk-state-machine` |
| Status | `in_progress` |
| Dependency | F04, F08 |

**Scope:** LangGraph workflow (validasi → buat incident → lookup device → lookup histori → simpan evidence → analisis → rekomendasi → simpan hasil), handling failure/partial result.

**Deliverable:** workflow berjalan dari input sampai output; tiap step tercatat status & durasi; evidence tersimpan.

---

### F10 — LLM Provider Adapter

| Field | Value |
|---|---|
| Owner | **C** |
| Backup | B |
| Reviewer | B |
| Branch | `feat/llm-provider-adapter` |
| Status | `todo` |
| Dependency | F01 |

**Scope:** adapter configurable ke API panitia (env: base URL, model, key), interface `generate()`, handling timeout/error, capture usage metadata bila tersedia, fake provider untuk test.

**Deliverable:** adapter berfungsi, error aman, usage tercatat atau `unavailable`.

---

### F11 — Execution Inspector (UI)

| Field | Value |
|---|---|
| Owner | **A** |
| Backup | C |
| Reviewer | B |
| Branch | `feat/execution-inspector` |
| Status | `todo` |
| Dependency | F03, F04 |

**Scope:** panel task aktif + step (nama, status, durasi), evidence per step, error, token usage; refresh status dari backend (polling/SSE).

**Deliverable:** progress workflow tampil real-time dari backend, bukan animasi palsu.

---

### F12 — Result Display & History (UI)

| Field | Value |
|---|---|
| Owner | **A** |
| Backup | — |
| Reviewer | B |
| Branch | `feat/result-history` |
| Status | `todo` |
| Dependency | F05, F09, F11 |

**Scope:** tampilkan hasil (fakta, interpretasi, ketidakpastian, rekomendasi) dengan pemisahan visual; halaman Tasks & History; detail task; history bertahan setelah refresh.

**Deliverable:** hasil dengan pemisahan fakta/interpretasi; history persisten.

---

### F13 — Integration Test & Failure Path

| Field | Value |
|---|---|
| Owner | **C** |
| Backup | B |
| Reviewer | A, B |
| Branch | `test/helpdesk-integration` |
| Status | `todo` |
| Dependency | F09, F10, F11, F12 |

**Scope:** test happy path, failure path (tool gagal), input tidak valid, provider failure, persistence; verifikasi tidak ada secret di log.

**Deliverable:** minimal 5 test lulus; hasil dicatat dengan output aktual.

---

## P1 — Campus Twin & Evaluation

### F14 — Campus Twin 2D View

| Owner **A** | Backup C | Reviewer B | Branch `feat/campus-twin-2d` | Dependency F08, F03 |

Visualisasi 2D (Leaflet/SVG) dengan gedung & zona, perangkat dan statusnya, klik detail + insiden terkait, badge `SIMULATED DATA`, legenda.

### F15 — Token Usage Capture & Dashboard

| Owner **C** | Backup B | Reviewer A | Branch `feat/token-metrics` | Dependency F10 |

Simpan token usage per task/run/step bila tersedia; endpoint & dashboard; label jelas provider vs estimasi; jangan tampilkan secret.

### F16 — Approval Gate (UI + Backend)

| Owner **B** | Backup A | Reviewer C | Branch `feat/approval-gate` | Dependency F04, F09 |

State `waiting_for_approval`, endpoint approve/reject, UI approval request, audit log. Default prototype: rekomendasi, bukan eksekusi otomatis.

### F17 — CI/CD Pipeline

| Owner **C** | Backup B | Reviewer A | Branch `chore/ci-pipeline` | Dependency F01, F13 |

GitHub Actions: lint, type-check, test (frontend Vitest/Playwright, backend pytest), build; secret scan; status check wajib sebelum merge.

---

## P2 — Extend Workers (jika waktu memungkinkan)

### F18 — Worker Router

| Owner **B** | Backup C | Reviewer A | Branch `feat/worker-router` | Dependency F09 |

Router sederhana (rules/keyword) ke worker yang tepat; placeholder untuk worker lain.

### F19 — Second Worker (PMB atau Digital Archive)

| Owner **A** (UI) + **B** (workflow) | Backup C | Reviewer C | Branch `feat/second-worker` | Dependency F18 |

Satu worker tambahan dengan dataset sintetis dan workflow sederhana.

### F20 — Azure Deployment

| Owner **C** | Backup B | Reviewer A | Branch `chore/azure-deploy` | Dependency F13, F17 |

Estimasi biaya, resource group/hosting/db/storage, env di Azure, health check, teardown plan; fallback localhost + video demo.

---

## Matriks Ringkasan

| Fitur | Owner | Priority | Status |
|---|---|---|---|
| F01 — Stack Setup | C | P0 | `todo` |
| F02 — API Contract | B | P0 | `todo` |
| F03 — Workspace Shell | A | P0 | `todo` |
| F04 — Task State Machine | B | P0 | `todo` |
| F05 — Chat Input UI | A | P0 | `todo` |
| F06 — Document Upload | B | P0 | `todo` |
| F07 — Upload UX | A | P0 | `todo` |
| F08 — Synthetic Dataset | C | P0 | `todo` |
| F09 — Helpdesk Workflow | B | P0 | `in_progress` |
| F10 — LLM Adapter | C | P0 | `todo` |
| F11 — Execution Inspector | A | P0 | `todo` |
| F12 — Result & History | A | P0 | `todo` |
| F13 — Integration Test | C | P0 | `todo` |
| F14 — Campus Twin 2D | A | P1 | `todo` |
| F15 — Token Metrics | C | P1 | `todo` |
| F16 — Approval Gate | B | P1 | `todo` |
| F17 — CI/CD Pipeline | C | P1 | `todo` |
| F18 — Worker Router | B | P2 | `todo` |
| F19 — Second Worker | A + B | P2 | `todo` |
| F20 — Azure Deploy | C | P2 | `todo` |

---

## Aturan Koordinasi

1. Satu branch = satu fitur.
2. Kontrak API (F02) dulu sebelum integrasi A dan B.
3. Review silang minimal satu orang sebelum merge.
4. Jangan mengubah file yang sama bersamaan.
5. Jalankan lint, type-check, dan test lokal sebelum PR.
6. Dokumentasikan perubahan setup/API.
7. Label data simulasi (`SIMULATED DATA`).
8. Jangan commit secret; gunakan `.env` dan `.env.example`.