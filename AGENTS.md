# AGENTS.md — Instruksi Coding Agent DinusNexus

Instruksi ini berlaku untuk OpenCode dan coding agent lain yang digunakan dalam repository.

## Tujuan

Implementasikan DinusNexus sebagai Unified AI Digital Campus Worker. Bangun fondasi yang dapat mendukung delapan campus role dalam satu workspace, tetapi prioritaskan workflow IT Helpdesk yang benar-benar berjalan dari input sampai output. Campus Twin 2D interaktif adalah fitur pendukung, bukan pengganti workflow operasional.

## Aturan wajib

1. **Audit sebelum mengubah.** Baca struktur repository, `README.md`, konfigurasi package, test, environment example, serta dokumen `docs/` sebelum mengusulkan perubahan besar.
2. **Jangan menimpa desain atau stack tanpa alasan.** Teknologi frontend, backend, database, model, serta hosting spesifik masih `TBD` sampai diverifikasi dari repository atau dikonfirmasi tim.
3. **Kerjakan satu lingkup kecil per perubahan.** Hindari rewrite seluruh aplikasi untuk menyelesaikan satu fitur.
4. **Jangan mengarang integrasi.** API, database, log jaringan, cloud storage, atau perangkat yang belum terhubung harus diberi label mock/simulated. Jangan tampilkan data simulasi seolah-olah data live.
5. **Execution UI harus nyata.** Status langkah, bukti, durasi, dan error berasal dari state/backend aktual. Jangan membuat progress palsu yang hanya berupa animasi frontend.
6. **Bukti dapat ditelusuri.** Pisahkan fakta hasil tool/data, inferensi AI, ketidakpastian, dan rekomendasi.
7. **Human-in-the-loop.** Tindakan sensitif tidak boleh dieksekusi otomatis tanpa otorisasi yang sesuai.
8. **Jaga rahasia.** Jangan menampilkan, mencetak, menulis ke git, atau memasukkan API key/token ke source code, prompt log, screenshot, atau dokumentasi. Gunakan environment variables dan `.env.example` dengan placeholder.
9. **Jangan memasukkan data pribadi nyata.** Gunakan data sintetis/anonymized kecuali ada izin dan alasan yang sah.
10. **Jalankan pemeriksaan yang tersedia.** Setelah perubahan, jalankan test/lint/type-check yang relevan. Laporkan perintah yang dijalankan dan hasil sebenarnya; jangan mengklaim test lulus bila belum dijalankan.
11. **Pertahankan perubahan pengguna.** Jangan membuang perubahan lokal yang tidak berkaitan. Jangan menjalankan perintah destruktif seperti reset keras/clean tanpa persetujuan eksplisit.
12. **Dokumentasikan perubahan.** Perbarui dokumentasi jika ada perubahan keputusan, API, workflow, setup, keamanan, atau deployment.

## Stack dan perubahan teknologi

Stack backend yang **sudah diputuskan** dan tidak boleh diganti tanpa keputusan tim:

- Python 3.12, FastAPI, LangGraph, PostgreSQL 16.
- SQLAlchemy 2.x, Alembic, Pydantic, python-dotenv/pydantic-settings.
- pytest + httpx untuk test; Docker untuk PostgreSQL lokal.
- OpenAI SDK tersedia untuk fitur LLM, tetapi workflow Helpdesk saat ini
  **deterministik**; jangan menambah provider LLM eksternal tanpa persetujuan.
- Dataset JSON sintetis di `src/data/` adalah satu-satunya sumber record
  operasional saat ini. Jangan menampilkan data simulasi sebagai data live.

## Struktur direktori

```text
src/main.py            # FastAPI app + LangGraph workflow + endpoint
src/auth.py            # X-API-Key dependency
src/data_adapter.py    # retrieval keyword/synonym atas dataset JSON
src/data/*.json        # dataset sintetis (buildings, zones, devices, incidents)
src/db/session.py      # SQLAlchemy engine/SessionLocal/Base
src/db/models.py       # model Task
src/llm/client.py      # wrapper OpenAI Responses API (belum di workflow)
alembic/               # konfigurasi + migrasi skema
tests/                 # pytest (adapter, workflow, api, persistence)
docs/                  # dokumentasi teknis
check_data.py          # validasi relasi dataset
```

## Perintah setup, run, dan test

```bash
source .venv/bin/activate
pip install -r requirements.txt        # dependency
alembic upgrade head                   # terapkan skema
uvicorn src.main:app --reload          # jalankan API
python -m compileall -q src            # cek sintaks
python check_data.py                   # validasi dataset
pytest                                 # jalankan test
```

Jalankan perintah ini dan laporkan hasil nyata (exit code/output), jangan
mengklaim lulus tanpa menjalankannya.

## Keamanan dan rahasia

- `.env` wajib gitignored; gunakan `.env.example` dengan placeholder.
- Jangan mencetak/menyalin API key, token, atau password ke log, output, chat,
  dokumen, screenshot, atau commit.
- Endpoint terproteksi memakai header `X-API-Key` dari `DINUSNEXUS_API_KEY`.
  `GET /health` publik. Jangan melonggarkan auth tanpa keputusan tim.
- Jangan memasukkan data pribadi nyata; gunakan data sintetis/anonymized.

## Aturan sebelum commit

1. `pytest` hijau (atau laporkan test yang gagal secara eksplisit).
2. `python -m compileall -q src` exit 0.
3. Tinjau `git status`/`git diff`; pastikan `.env`, secret, `*.bak`, dan artefak
   tidak ikut ter-stage.
4. Perbarui dokumentasi terkait bila kontrak API, skema DB, state workflow, atau
   perilaku pencarian berubah.
5. Commit terfokus dengan Conventional Commits; jangan push tanpa memeriksa
   branch dan remote.

## Urutan kerja agent

1. Ringkas kondisi repository dan file terkait.
2. Nyatakan rencana singkat serta file yang akan diubah.
3. Implementasikan perubahan terkecil yang menyelesaikan tujuan.
4. Tambahkan atau sesuaikan test.
5. Jalankan pemeriksaan yang relevan.
6. Ringkas file berubah, hasil test, keterbatasan, dan langkah lanjutan.

## Prioritas produk

1. Workspace dengan chat dan input baru.
2. Upload dan pemrosesan dokumen yang nyata.
3. Workflow IT Helpdesk end-to-end.
4. Execution timeline, evidence/source, failure state, dan history persisten.
5. Campus Twin 2D yang terhubung ke data perangkat/insiden.
6. Pencatatan token dan evaluasi akurasi.
7. Perluasan role lainnya setelah fondasi stabil.

## Coding style

- Ikuti formatter, konvensi penamaan, pola folder, dan library yang sudah dipakai di repo.
- Hindari duplikasi logika lintas role; gunakan service/tool bersama jika tepat.
- Validasi input di server, bukan hanya frontend.
- Tangani timeout, error provider, input kosong/tidak valid, dan kegagalan tool secara eksplisit.
- Gunakan tipe/schema terstruktur untuk kontrak API serta hasil workflow jika stack mendukungnya.
- Jangan menambahkan dependency baru tanpa kebutuhan jelas; dokumentasikan alasan jika dependency signifikan ditambahkan.

## Batas otoritas

Coding agent boleh mengimplementasikan fitur sesuai keputusan terdokumentasi. Coding agent tidak boleh mengubah keputusan produk final, membuka data sensitif, melakukan deployment berbiaya, mengubah resource cloud, atau mengirim/mengubah data eksternal tanpa persetujuan manusia.
