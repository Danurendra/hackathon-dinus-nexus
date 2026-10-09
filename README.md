# DinusNexus

**Unified AI Digital Campus Worker** — satu workspace untuk membantu berbagai peran operasional kampus menjalankan pekerjaan berbasis workflow, sumber data, dokumen, dan AI.

> Prototype hackathon. **Workflow IT Helpdesk adalah vertical slice pertama yang berjalan end-to-end.** Dataset yang dipakai bersifat **sintetis** dan selalu diberi label `SYNTHETIC`. Jangan menganggapnya sebagai kondisi kampus nyata.

## Status saat ini (faktual)

| Area | Status |
|---|---|
| IT Helpdesk deterministic flow (input → retrieval → evidence → persist → history) | implemented, tested |
| PostgreSQL persistence + Alembic migration | implemented, tested |
| API key authentication (`X-API-Key`) | implemented, tested |
| Input validation & error handling | implemented, tested |
| LLM `analyze_evidence` (opsional, `LLM_ENABLED=true`) | implemented, tested (mock) + diverifikasi live 1x |
| Campus Twin 2D, upload dokumen, 7 role lain | planned |
| API/DB/Testing/Development docs | implemented |

Detail verifikasi ada di [`docs/TESTING.md`](docs/TESTING.md) dan [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md).

## Fitur IT Helpdesk

1. Client mengirim laporan ke `POST /api/tasks` (dengan `X-API-Key`).
2. Backend memvalidasi input dan menyimpan task (`queued`) ke PostgreSQL.
3. LangGraph menjalankan `inspect_report → prepare_result` secara deterministik.
4. Data adapter mencari perangkat, insiden, zona, dan gedung yang relevan dari
   dataset sintetis (dengan filter zona dan tipe perangkat).
5. Hasil memuat `facts` (record asli), `evidence` (source id + dataset),
   `interpretation`, `uncertainty`, dan `recommendations`, semuanya berlabel
   `SYNTHETIC`.
6. Task, steps, dan hasil tersimpan persisten; history bertahan setelah restart.

## Arsitektur singkat

```text
FastAPI (src/main.py) → LangGraph (inspect_report, prepare_result)
      → data adapter (src/data_adapter.py) → JSON datasets (src/data/)
      → PostgreSQL (src/db/) → response + history
```

Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (bagian "Implemented Architecture") dan [`docs/API.md`](docs/API.md).

## Stack

Python 3.12 · FastAPI · LangGraph · PostgreSQL 16 · SQLAlchemy 2.x · Alembic ·
Pydantic · pytest + httpx · Docker. OpenAI SDK terpasang untuk fitur LLM yang
akan datang (belum dipakai workflow).

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
| `TEST_DATABASE_URL` | tidak | database terpisah untuk test |
| `LLM_ENABLED` | tidak | `true` untuk mengaktifkan langkah LLM (default `false`) |
| `OPENAI_API_KEY` | tidak | wajib bila `LLM_ENABLED=true` |
| `LLM_MODEL` | tidak | default `gpt-4o-mini` |

Nilai asli tidak boleh masuk source code, dokumentasi, log, atau Git.

## Endpoint

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| GET | `/health` | publik | liveness |
| POST | `/api/tasks` | `X-API-Key` | buat task + jalankan workflow |
| GET | `/api/tasks/{task_id}` | `X-API-Key` | baca task |
| GET | `/api/history` | `X-API-Key` | daftar task (terbaru dulu) |

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
demo. Hasil terakhir: **29 passed**. Skenario dan fixture: [`docs/TESTING.md`](docs/TESTING.md).

## Known limitations

- **Data sintetis**: seluruh dataset adalah fixture JSON, bukan integrasi live.
- **Keyword search, bukan semantic search**: pencarian berbasis kata kunci +
  sinonim. Kata seperti `tidak` belum menjadi stop word sehingga bisa muncul
  kecocokan insidental.
- **Sinkron, tanpa background worker**: workflow berjalan di dalam request.
- **LLM opsional**: default deterministik. Langkah `analyze_evidence` hanya jalan
  bila `LLM_ENABLED=true`; kegagalan LLM membuat task `failed` (tidak pernah
  `completed`). Fakta/evidence tetap berasal dari dataset, bukan dari model.
- **Run/step belum ternormalisasi**: steps disimpan sebagai JSON di tabel
  `tasks`; belum ada tabel `task_runs`/`execution_steps` terpisah.
- **`create_all` saat startup**: masih dipakai untuk kenyamanan dev; Alembic
  adalah jalur migrasi resmi.

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