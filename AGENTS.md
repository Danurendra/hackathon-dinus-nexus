# AGENTS.md — DinusNexus

## Arah kerja dan sumber acuan

- Lanjutkan Unified AI Digital Campus Worker di aplikasi ini, bukan demo terpisah atau chatbot generik. Prioritas: IT Helpdesk dengan evidence dan history persisten; Campus Twin mendukung alur tersebut. Role dikelompokkan dalam navigasi, bukan satu menu utama per use case.
- Sebelum coding, periksa `git status --short --branch`, `git log -5 --oneline`, environment examples, `frontend/package.json`, source terkait, dan tests. Pertahankan perubahan lokal; jangan otomatis switch/pull/reset saat working tree berisi pekerjaan tim.
- Baca `README.md`, `docs/PRODUCT_SCOPE.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT_PLAN.md`, `docs/WORKFLOWS.md`, `docs/UI_UX.md`, `docs/CAMPUS_TWIN_DESIGN.md`, dan `docs/API.md`. Beberapa status/TBD, daftar endpoint, dan resep geometry sudah tertinggal: kontrak dalam kode/config/tests mengalahkan prose.
- Untuk tugas implementasi terbuka, pilih satu gap demo end-to-end dari development plan, nyatakan acceptance criteria dan file sasaran, lalu implementasikan dan verifikasi—jangan berhenti pada audit. Jangan rewrite fungsi yang bekerja untuk polish UI atau mengganti stack/dependency besar tanpa keputusan tim.
- Aturan Git ada di `CONTRIBUTING.md`; dokumentasi internal berbahasa Indonesia sesuai `docs/DOCUMENTATION_POLICY.md`. Perbarui dokumen terkait bila kontrak, workflow, setup, atau keputusan berubah; laporkan hasil verifikasi dan keterbatasan, bukan klaim selesai tanpa bukti.

## Batas arsitektur yang mudah tertukar

- Backend tetap Python 3.12, FastAPI, LangGraph, PostgreSQL 16, SQLAlchemy 2.x, Alembic, Pydantic; pytest + httpx. CI memakai Python 3.12; jangan menyimpulkan target versi dari venv lokal.
- `src/main.py` memuat API dan graph task: `inspect_report → analyze_evidence → prepare_result → request_approval` bila diperlukan. `POST /api/tasks` hanya menerima worker `it_helpdesk` dan berjalan sinkron; belum ada queue atau stream progress task.
- Task disimpan di `src/db/models.py`: `Task`, `TaskRun`, `ExecutionStep`. Pertahankan `Task.steps` JSON untuk kompatibilitas dan sinkronkan rows run/step melalui `persist_run`; history dan `/api/tasks/{id}/runs` membaca database.
- `/api/conversations` adalah jalur berbeda: `src/conversations/store.py` menyimpan conversation/message di memori, bukan PostgreSQL. Jawaban chat tidak otomatis membuat task/history persisten. Handler message aktual ada di `src/main.py`; graph di `src/workflows/chat.py` bukan jalur eksekusi message saat ini.
- Campus Operations memakai `src/event_api.py` + `src/workflows/event_planning.py`: `/api/event-plans` menyimpan assessment event pada tabel task/run existing; follow-up `/api/event-plans/{id}/helpdesk` memvalidasi AP dari evidence sebelum membuat investigasi. Tidak memperluas worker pada `/api/tasks`; demo ada di `docs/WORKFLOWS.md`.
- `LLM_ENABLED=false` hanya menonaktifkan analisis task. Chat tetap memanggil provider melalui `src/llm/litellm_client.py` dan `src/config/settings.py` (`LLM_PROVIDER`, `LLM_*`, `OPENAI_*`, fallback). Analisis task memakai `src/llm/analysis.py` + `src/llm/client.py` (OpenAI Responses API), bukan konfigurasi provider chat yang sama.
- Retrieval operasional berasal dari JSON sintetis `src/data/` melalui `data_adapter.py`, `network_adapter.py`, dan `campus_adapter.py`; bukan telemetri live atau semantic search. `facts`/`evidence` task harus berasal dari adapter, bukan LLM; pertahankan bounded digest dan validasi output analisis.
- Frontend adalah Next.js 14 App Router, React 18, TypeScript, Tailwind 3; gunakan npm di `frontend/`. Lockfile root kosong dan bukan workspace npm. Entrypoint UI: `frontend/src/app/page.tsx`, `app/workspace/[section]/page.tsx`, `app/workers/[worker]/page.tsx`; komponen bersama di `components/`, navigasi di `config/navigation.ts`, alias `@/*` menunjuk `frontend/src/*`.

## Setup dan perintah

Backend: jalankan dari root dengan venv aktif. PowerShell: `.\.venv\Scripts\Activate.ps1`; Linux: `source .venv/bin/activate`. Salin `.env.example` ke `.env` dan isi secara lokal; `DATABASE_URL` diperlukan saat import, dan settings chat membaca `.env` relatif working directory.

```sh
python -m pip install -r requirements.txt
alembic upgrade head
uvicorn src.main:app --reload
python -m compileall -q src
python check_data.py
python -m pytest
python -m pytest tests/test_approval.py -k reject
```

- PostgreSQL harus tersedia sebelum migrasi/API task. Gunakan URL `postgresql+psycopg://…`; startup `create_all` tidak menggantikan migrasi Alembic. Contoh lokal README/env memakai port host **5434**, sedangkan Compose memakai **5432**; samakan URL dengan service yang benar.
- CI backend menjalankan compile → dataset validation → `alembic upgrade head` → pytest. CI belum memeriksa frontend.
- `tests/conftest.py` memakai `TEST_DATABASE_URL`, atau nama database `DATABASE_URL` dengan suffix `_test`; bila PostgreSQL tidak terjangkau dan tidak ada URL test eksplisit, fallback ke `tests_local.db` SQLite. Fixture menghapus rows setiap test: **jangan arahkan URL test ke database demo/produksi**. Buat database test PostgreSQL terlebih dahulu; SQLite bukan verifikasi kompatibilitas PostgreSQL.
- Suite rutin mematikan analisis LLM dan memakai mocks. Test live bertanda `live_llm` memerlukan `RUN_LIVE_LLM=1`; jangan aktifkan atau memanggil API berbayar tanpa izin. Mock client chat juga: `LLM_ENABLED=false` bukan pengaman panggilan chat.

Frontend: working directory `frontend/`; salin `frontend/.env.example` ke `frontend/.env.local`.

```sh
npm ci
npm run dev
npm run lint
npx tsc --noEmit
npm run test -- --run
npm run test -- --run src/lib/spatial.test.ts
npm run build
```

- `npm run test` tanpa `--run` masuk watch mode. Vitest memakai environment Node dan menemukan `src/**/*.test.{ts,tsx}`; bukan suite browser/DOM.
- Belum ada konfigurasi ESLint di repo; `next lint` dapat meminta setup interaktif. Laporkan blocker, jangan mengklaim lint lulus. Build memakai `next/font/google` (Inter), sehingga build offline dapat gagal mengambil font.
- Next memakai output `standalone`. `deriveMetrics.ts` mengimpor `../../../src/data/*.json` di luar folder frontend; jangan menganggap frontend sepenuhnya self-contained saat packaging/Docker.

## Integritas demo, Campus Twin, dan keamanan

- Execution inspector menampilkan state/steps/evidence/error backend dan durasi/token hanya jika terukur; jangan membuat progress palsu. History harus dimuat ulang dari persistence. Untuk perubahan UI, verifikasi reload, loading/empty/error, responsif, keyboard/reduced-motion, dan kedua mode warna.
- `CampusMap({ className })` adalah kontrak embedded yang dipakai dashboard. Geometry OSM ada di `frontend/src/data/campusGeometry.ts`; gunakan `lib/spatial.ts` + `lib/isometric.ts` untuk anchor/proyeksi/bounds bersama, bukan koordinat marker terpisah. Pertahankan atribusi OpenStreetMap.
- OSM geometry bukan bukti kondisi operasional live. Pisahkan ID OSM, `twinId`, dan ID building/zone dataset; jangan menganggapnya identik. Metrik dataset ada di `lib/deriveMetrics.ts`, metadata campuran fixture/estimasi di `data/campusTwinExtended.ts`.
- Ada dua model simulasi: `data/eventSimulation.ts` untuk `EventPlanningWorkspace`, dan `lib/scenarioModel.ts` untuk Twin. Jangan menganggap keduanya satu kalkulasi; pertahankan makna angka pemanggil dan test terkait. Gunakan randomness berseed (`lib/prng.ts`) untuk render SSR yang deterministik.
- `lib/eventPlanBridge.ts` meneruskan agregat Twin sebagai asumsi ke `EventAgentRun`, bukan evidence/live telemetry; backend menghitung model agregat tersendiri. Browser tests `npx playwright test` memerlukan frontend/backend dan database terisolasi; default Edge/port 3001, membuat task nyata lokal.
- Labeli data sintetis (`SYNTHETIC`), fixture, asumsi, estimasi skenario, dan integrasi belum terhubung secara terlihat. Pisahkan fakta/tool output, inferensi, ketidakpastian, dan rekomendasi; LLM tidak boleh mengarang source ID, insiden, status perangkat, atau kondisi kampus.
- `src/auth.py` melindungi task dan conversation dengan `X-API-Key` dari `DINUSNEXUS_API_KEY`; `/health` publik. Jangan melonggarkan auth. Approval untuk `reset_account`, `restart_device`, `change_config`, `network_change` hanya mencatat keputusan: approve → completed, reject → cancelled; **tidak mengeksekusi aksi**.
- `frontend/src/lib/api.ts` menyediakan `apiFetch`/auth headers. `NEXT_PUBLIC_DINUSNEXUS_API_KEY` terekspos di bundle browser dan ditetapkan saat build: hanya key demo non-produksi, bukan secret produksi atau key provider AI.
- `.env`/`.env.local` tetap lokal; gunakan placeholder di examples, jangan mencetak credential atau data pribadi. `docker-compose.yml` dan `deploy-azure.ps1` perlu audit keamanan sebelum digunakan; jangan menyalin credential Compose ke kode/dokumen. Deployment, perubahan cloud, dan biaya baru memerlukan izin eksplisit.
- Sebelum menyerahkan perubahan, jalankan pemeriksaan relevan dan `git diff --check`; periksa diff/status terfokus tanpa membocorkan secrets. Jangan stage artefak `.next`, venv, `*.tsbuildinfo`, `tests_local.db`, atau perubahan tim yang tidak terkait.
