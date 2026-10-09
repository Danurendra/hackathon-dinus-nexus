# DinusNexus

**Unified AI Digital Campus Worker** — satu workspace untuk membantu berbagai peran operasional kampus menjalankan pekerjaan berbasis workflow, sumber data, dokumen, dan AI.

> Prototype hackathon. **Workflow IT Helpdesk adalah vertical slice pertama yang berjalan end-to-end.** Dataset yang dipakai bersifat **sintetis** dan selalu diberi label `SYNTHETIC`. Jangan menganggapnya sebagai kondisi kampus nyata.

## Status saat ini (faktual)

| Area | Status |
|---|---|
| IT Helpdesk deterministic flow (input → retrieval → evidence → persist → history) | implemented, tested |
| PostgreSQL persistence + Alembic migration | implemented, tested |
| API key authentication (`X-API-Key`) | implemented, tested |
| CORS untuk frontend + token metrics | implemented, tested |
| Approval gate (`waiting_for_approval` + approve/reject) | implemented, tested |
| Normalisasi `task_runs`/`execution_steps` | implemented, tested |
| CI (GitHub Actions: compile, data check, migrasi, pytest) | implemented (workflow) |
| Input validation & error handling | implemented, tested |
| LLM `analyze_evidence` (opsional, `LLM_ENABLED=true`) | implemented, tested (mock) + diverifikasi live 1x |
| Campus Twin 2D, upload dokumen, 7 role lain | planned |
| API/DB/Testing/Development docs | implemented |

Detail verifikasi ada di [`docs/TESTING.md`](docs/TESTING.md) dan [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md).

## Fitur IT Helpdesk

1. Client mengirim laporan ke `POST /api/tasks` (dengan `X-API-Key`).
2. Backend memvalidasi input dan menyimpan task (`queued`) ke PostgreSQL.
3. LangGraph menjalankan `inspect_report → analyze_evidence → prepare_result`
   secara deterministik (langkah LLM opsional).
4. Data adapter mencari perangkat, insiden, zona, dan gedung yang relevan dari
   dataset sintetis (dengan filter zona dan tipe perangkat).
5. Hasil memuat `facts` (record asli), `evidence` (source id + dataset),
   `interpretation`, `uncertainty`, dan `recommendations`, semuanya berlabel
   `SYNTHETIC`.
6. Task, steps, dan hasil tersimpan persisten (tabel `tasks` + `task_runs` +
   `execution_steps`); history bertahan setelah restart.
7. Bila `requested_action` termasuk aksi sensitif, workflow berhenti di
   `waiting_for_approval` dan menunggu keputusan manusia via
   `POST /api/tasks/{task_id}/approval`. Backend **tidak** mengeksekusi aksi
   sensitif secara otomatis.

## Arsitektur singkat

```text
FastAPI (src/main.py) → LangGraph (inspect_report, analyze_evidence,
      prepare_result, request_approval)
      → data adapter (src/data_adapter.py) → JSON datasets (src/data/)
      → PostgreSQL (src/db/: tasks, task_runs, execution_steps) → response + history
```

Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (bagian "Implemented Architecture") dan [`docs/API.md`](docs/API.md).

## Stack

Python 3.12 · FastAPI · LangGraph · PostgreSQL 16 · SQLAlchemy 2.x · Alembic ·
Pydantic · pytest + httpx · Docker. OpenAI SDK dipakai untuk langkah LLM
opsional (`analyze_evidence`).

## Prasyarat

- Ubuntu/Linux, Python 3.12, Git, Docker.
- Virtual environment `.venv`.

## Setup lokal

```bash
# 1. Virtual environment.
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2. Konfigurasi environment.
cp .env.example .env
# Isi DATABASE_URL, DINUSNEXUS_API_KEY, dan (opsional) OPENAI_API_KEY di .env.
# JANGAN commit .env.
```

### Menjalankan PostgreSQL

```bash
docker run -d --name dinusnexus-postgres \
  -e POSTGRES_USER=dinusnexus \
  -e POSTGRES_PASSWORD=<password-lokal-anda> \
  -e POSTGRES_DB=dinusnexus \
  -p 127.0.0.1:5434:5432 \
  -v dinusnexus_pgdata:/var/lib/postgresql/data \
  postgres:16

# Terapkan skema.
alembic upgrade head
```

### Menjalankan API

```bash
source .venv/bin/activate
uvicorn src.main:app --reload
```

- Base URL: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

### Environment variables

| Variable | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ya | koneksi `postgresql+psycopg://…` |
| `DINUSNEXUS_API_KEY` | ya | API key backend (header `X-API-Key`) |
| `CORS_ORIGINS` | tidak | origin frontend yang diizinkan (default `http://localhost:3000,http://127.0.0.1:3000`) |
| `TEST_DATABASE_URL` | tidak | database terpisah untuk test |
| `LLM_ENABLED` | tidak | `true` untuk mengaktifkan langkah LLM (default `false`) |
| `OPENAI_API_KEY` | tidak | wajib bila `LLM_ENABLED=true` |
| `LLM_MODEL` | tidak | default `gpt-4o-mini` |
| `LLM_MAX_ATTEMPTS` | tidak | batas percobaan provider (default `3`, maks `5`) |
| `LLM_TIMEOUT_SECONDS` | tidak | timeout per request (default `30`) |
| `LLM_RETRY_BASE_DELAY` | tidak | basis backoff detik (default `0.5`) |

Nilai asli tidak boleh masuk source code, dokumentasi, log, atau Git.

## Endpoint

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| GET | `/health` | publik | liveness |
| POST | `/api/tasks` | `X-API-Key` | buat task + jalankan workflow |
| GET | `/api/tasks/{task_id}` | `X-API-Key` | baca task |
| GET | `/api/tasks/{task_id}/runs` | `X-API-Key` | run & step ternormalisasi |
| POST | `/api/tasks/{task_id}/approval` | `X-API-Key` | approve/reject (`waiting_for_approval`) |
| GET | `/api/history` | `X-API-Key` | daftar task (terbaru dulu) |
| GET | `/api/metrics/tokens` | `X-API-Key` | agregat penggunaan token LLM |

Kontrak lengkap: [`docs/API.md`](docs/API.md). Langkah LLM bersifat opsional
(`LLM_ENABLED=true`); ketika aktif, node `analyze_evidence` menganalisis bukti
dengan OpenAI dan hasilnya divalidasi (Structured Outputs). Jika gagal, task
tetap tercatat sebagai `failed`.

## Menjalankan test

```bash
source .venv/bin/activate
pytest
```

Test berjalan terhadap database terpisah (`<db>_test`), tidak menyentuh data
demo. Hasil terakhir: **62 passed, 1 skipped**. Skenario dan fixture: [`docs/TESTING.md`](docs/TESTING.md).

## Known limitations

- **Data sintetis**: seluruh dataset adalah fixture JSON, bukan integrasi live.
- **Keyword search, bukan semantic search**: pencarian berbasis kata kunci +
  sinonim. Kata seperti `tidak` belum menjadi stop word sehingga bisa muncul
  kecocokan insidental.
- **Sinkron, tanpa background worker**: workflow berjalan di dalam request dan
  belum ada eksekusi asinkron/queue.
- **Approval gate, bukan eksekusi aksi**: keputusan `approve` menandai task
  `completed` dan mencatat otorisasi manusia, tetapi backend tidak menjalankan
  aksi sensitif apa pun. Ini disengaja (human-in-the-loop).
- **LLM opsional**: default deterministik. Langkah `analyze_evidence` hanya jalan
  bila `LLM_ENABLED=true`; kegagalan LLM membuat task `failed` (tidak pernah
  `completed`). Fakta/evidence tetap berasal dari dataset, bukan dari model.
- **Retry terbatas**: error provider transien (rate limit, timeout, 5xx) di-retry
  dengan exponential backoff + jitter, dibatasi `LLM_MAX_ATTEMPTS`. Error
  non-transien (mis. 400/401) dan output tidak valid tidak di-retry.
- **Steps JSON tetap dipertahankan**: respons task masih memuat `steps` (JSON)
  untuk kompatibilitas; `task_runs`/`execution_steps` adalah store terkueri.
- **`create_all` saat startup**: masih dipakai untuk kenyamanan dev; Alembic
  adalah jalur migrasi resmi. Jalankan `alembic upgrade head`.

## Campus roles (target)

1. Admissions Staff (PMB) · 2. Finance Staff · 3. Academic Administration (BAAK)
· 4. PDDikti Operator · 5. IT Helpdesk · 6. Quality Assurance Staff ·
7. Career Center Staff · 8. Digital Archive Staff.

## Dokumen proyek

- [`AGENTS.md`](AGENTS.md): instruksi untuk coding agent/OpenCode.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): arsitektur konseptual + implementasi.
- [`docs/API.md`](docs/API.md): referensi endpoint.
- [`docs/DATABASE.md`](docs/DATABASE.md): model, migrasi, persistence.
- [`docs/TESTING.md`](docs/TESTING.md): perintah test, skenario, hasil.
- [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md): log milestone.
- [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md), [`docs/PRODUCT_SCOPE.md`](docs/PRODUCT_SCOPE.md), [`docs/DECISIONS.md`](docs/DECISIONS.md): baseline produk.

## Catatan integritas

Dokumen adalah acuan, bukan klaim fitur. Gunakan status `implemented`, `tested`,
`partial`, atau `planned` secara jujur. Cantumkan penggunaan OpenCode, model/API,
library, dan kontribusi tim pada disclosure submission sesuai aturan hackathon.