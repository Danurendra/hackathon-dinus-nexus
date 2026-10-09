# Contributing & Git Workflow

Dokumen ini menetapkan aturan kolaborasi Git DinusNexus untuk menjaga `main` selalu stabil dan memudahkan pekerjaan paralel.

## Branch utama

- `main`: branch stabil untuk integrasi yang sudah diperiksa dan kandidat demo/deployment.
- Semua pekerjaan dilakukan di branch pendek yang dibuat dari `main` terbaru.
- Jangan commit langsung ke `main`, kecuali tim secara eksplisit menyepakati pengecualian darurat.

## Format nama branch

Gunakan huruf kecil, tanda hubung, dan prefix berikut:

- `feat/<ringkasan>` — fitur baru, misalnya `feat/it-helpdesk-workflow`
- `fix/<ringkasan>` — perbaikan bug, misalnya `fix/task-status-refresh`
- `docs/<ringkasan>` — dokumentasi, misalnya `docs/architecture-baseline`
- `refactor/<ringkasan>` — restrukturisasi tanpa mengubah perilaku yang dimaksud
- `test/<ringkasan>` — penambahan/perbaikan test
- `chore/<ringkasan>` — tooling, konfigurasi, dependency, atau pemeliharaan
- `design/<ringkasan>` — design system/UI polish bila perubahan tidak cocok sebagai fitur

Jaga satu branch untuk satu tujuan yang dapat dijelaskan. Hindari branch seperti `update`, `fix-now`, atau nama orang tanpa konteks.

## Alur kerja

1. Pastikan working tree bersih atau pahami perubahan lokal yang sedang ada:
   `git status --short`
2. Sinkronkan `main`:
   `git switch main` lalu `git pull --ff-only origin main`
3. Buat branch:
   `git switch -c feat/<ringkasan>`
4. Buat perubahan kecil dan periksa:
   `git diff --check` dan `git status --short`
5. Jalankan test/lint/type-check yang terkait.
6. Commit perubahan dengan pesan yang menjelaskan tujuan.
7. Push branch dan buka Pull Request ke `main`.
8. Minimal satu anggota tim memeriksa diff, hasil test, keamanan, dan dampak UI/API sebelum merge jika waktu dan platform memungkinkan.
9. Setelah merge, hapus branch yang sudah tidak digunakan.

## Aturan commit

Gunakan gaya Conventional Commits:

- `feat: add IT helpdesk intake form`
- `fix: persist task status after refresh`
- `docs: define branching workflow`
- `refactor: isolate LLM provider adapter`
- `test: cover helpdesk failure path`
- `chore: add environment example`

Satu commit sebaiknya mewakili satu perubahan logis. Hindari pesan `update`, `changes`, atau `final`.

## Aturan merge

- Jangan force-push branch bersama tanpa koordinasi.
- Jangan merge jika pemeriksaan yang relevan gagal, kecuali tim mencatat keputusan dan risikonya secara eksplisit.
- Hindari commit generated files, hasil build, cache, virtual environment, file rahasia, atau file upload pengguna.
- Konflik harus diselesaikan dengan memahami perubahan kedua sisi, bukan menghapus perubahan milik orang lain secara membabi buta.
- Untuk tenggat demo, lakukan freeze pada `main` setelah tim menyepakati kandidat final; semua perubahan sesudah freeze harus melalui review dan test cepat.

## Pembagian kerja paralel

Sebelum membuat branch, sepakati pemilik area dan kontrak antarmuka agar anggota tidak mengubah file yang sama tanpa koordinasi. Contoh area: UI workspace, backend/workflow, document processing, Campus Twin, testing/deployment. Pembagian anggota spesifik: `TBD` sampai tim menentukan penanggung jawab.

## Checklist sebelum PR/merge

- [ ] Scope perubahan sesuai tujuan branch.
- [ ] Tidak ada secret atau data pribadi.
- [ ] Test relevan ditambahkan/diperbarui dan dijalankan.
- [ ] Error/loading/empty states diperiksa untuk fitur UI.
- [ ] Dokumentasi diperbarui bila perilaku atau setup berubah.
- [ ] Mock/simulated data diberi label jelas.
- [ ] Diff sudah diperiksa dengan `git diff --check`.
