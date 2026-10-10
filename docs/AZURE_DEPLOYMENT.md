# Persiapan Deployment Demo Azure

## Yang sudah diputuskan

- Target deployment adalah Microsoft Azure.
- Target penggunaan dikonfirmasi untuk **demo sementara**, bukan produksi.
- Batas biaya dikonfirmasi **di bawah US$100**; nominal pasti, kredit tersedia,
  subscription, dan durasi online masih **TBD**.
- Pengeluaran infrastruktur perlu dikendalikan dan diawasi.
- Localhost tetap dapat digunakan untuk demo jika deployment cloud menambah risiko atau mengganggu kesiapan.
- Kredit untuk infrastruktur berbeda dari alokasi token AI panitia.

## Kandidat arsitektur — PROPOSED

Container Apps Consumption untuk Next.js standalone dan FastAPI, ACR untuk image,
serta PostgreSQL Flexible Server **versi 16** untuk task, run, step, akun dan sesi.
Gunakan resource existing jika cocok. Ini bukan persetujuan membuat resource berbayar.

- Backend/frontend demo: 0,5 vCPU, 1 GiB, min 0/max 1 replica sebagai baseline script.
- Scale-to-zero menambah cold start dan menghilangkan conversation dalam memori.
  Task/history dan akun tetap di PostgreSQL; max 1 bukan jaminan persistence chat
  selama restart atau pergantian revision. Chat persisten belum diimplementasikan.
- PostgreSQL, storage/backup, registry dan log dapat tetap berbiaya saat aplikasi idle.
- Frontend memakai login akun. Tidak ada API key backend/provider di bundle browser.
  Workspace masih bersama, belum RBAC/isolasi per akun: hanya data sintetis demo.
- Chat dan analisis AI sengaja tidak dikonfigurasi script. `LLM_ENABLED=false`
  **sendiri tidak mematikan chat**; script juga mengosongkan key provider dan mematikan
  fallback. Mengaktifkan chat butuh konfigurasi backend dan persetujuan biaya terpisah.
- Microsoft Foundry pada env example belum dipakai client aplikasi. Hosting Azure
  tidak otomatis mengaktifkan integrasi Azure AI.

## Yang belum diputuskan

- Azure subscription/resource group dan region.
- Layanan hosting frontend/backend.
- Database layanan atau database lokal untuk demo.
- File/object storage.
- Application Insights/monitoring.
- Domain, TLS, networking, dan identitas deployment.
- Jumlah instance/ukuran resource dan estimasi biaya akhir.

Semua itu tetap `TBD` sampai diperiksa pada subscription yang benar. Jangan membuat resource berbayar tanpa persetujuan pemilik subscription.

## Strategi pengendalian biaya

1. Audit kredit, subscription aktif, region, dan quota sebelum membuat resource.
2. Kembangkan dan tes secara lokal terlebih dahulu.
3. Pilih layanan sederhana yang sesuai dengan arsitektur repo dan kebutuhan demo.
4. Periksa harga terkini untuk region, SKU, storage, egress, database, dan monitoring sebelum deploy.
5. Buat budget alert jika tersedia, tetapi ingat alert bukan selalu hard spending cap.
6. Jangan meninggalkan database, compute, IP, disk, atau resource berbayar setelah demo jika tidak diperlukan.
7. Catat nama resource, region, owner, tujuan, dan langkah teardown.
8. Simpan credential di konfigurasi rahasia; jangan commit connection string.
9. Pastikan aplikasi memiliki health check dan error handling yang memadai.
10. Sediakan fallback localhost/video demo sesuai aturan kegiatan.

## Deployment checklist

- [ ] Commit/snapshot kandidat demo disepakati, termasuk perubahan lokal tim;
  jangan switch/pull/reset atau mengunggah working tree yang belum direview.
- [ ] Test lokal selesai dan hasilnya dicatat.
- [ ] Environment variables disiapkan di luar source code.
- [ ] API key provider dan secret database tidak masuk build/client.
- [ ] Azure resource/cost estimate sudah ditinjau.
- [ ] Security audit dependency runtime tidak memiliki advisory high/critical;
  runtime Node dan framework masih didukung untuk exposure publik.
- [ ] Seed/demo data diberi label.
- [ ] Smoke test: login/logout, run task, evidence, approval, history refresh/restart,
  Campus Operations → investigasi Helpdesk. Chat hanya jika diaktifkan dan disetujui;
  upload dokumen belum termasuk alur implementasi yang diverifikasi.
- [ ] Error provider/tool diuji.
- [ ] Token usage/logging diverifikasi.
- [ ] Teardown/cleanup plan dicatat.

## Langkah operasional

### 1. Audit akun dan biaya (read-only, jalankan sendiri)

```powershell
az login
az account list --query "[].{name:name,state:state,isDefault:isDefault}" -o table
az account show --query "{name:name,state:state}" -o table
```

Pilih subscription di Portal, cek kredit/expiry serta Cost Management. Jangan
menyalin credential ke percakapan. Tinjau harga region/SKU, quota, dukungan ACR
Tasks/managed identity, estimasi hari online dan log. Harga belum diverifikasi;
tidak ada klaim bahwa kredit pasti cukup. Catat budget alert dan tanggal cleanup.

### 2. Siapkan resource setelah biaya disetujui

Script **tidak** membuat resource group, registry, environment, database atau role
assignment. Siapkan melalui Portal/CLI setelah persetujuan pemilik subscription:

1. Resource group khusus demo dan region yang quota/harganya sudah diperiksa.
2. ACR (SKU minimal sesuai kebutuhan); **admin credentials tidak diperlukan**.
   Deployment lokal membutuhkan hak push ke registry. Baseline gunakan mode RBAC
   registry biasa; role untuk registry ABAC berbeda dan harus ditinjau terpisah.
3. Container Apps environment Consumption yang dapat mengakses PostgreSQL.
4. User-assigned managed identity dengan **AcrPull** pada scope registry. Berikan
   hak assign identity kepada operator deploy. Script tidak membuat role assignment.
5. PostgreSQL 16 dengan database demo khusus, TLS, backup/retensi yang ditinjau,
   dan kredensial baru. Izinkan jaringan mesin operator untuk migrasi/provisioning
   serta egress environment untuk API. Jangan membuka firewall ke seluruh internet.
   Jika memakai private networking, operator perlu akses jaringan tersebut.

Kredensial hardcoded script lama sudah dihapus. Jika pernah digunakan, rotasi
API key/database password terkait; menghapusnya dari file tidak menghapus Git history.
`docker-compose.yml` bukan konfigurasi Azure dan belum diaudit untuk produksi.

### 3. Preflight dan build lokal (tanpa Azure)

Docker Desktop Linux containers, Azure CLI dan extension `containerapp` diperlukan
untuk deploy. Instal/upgrade extension secara manual, jangan otomatis saat demo.

```powershell
.\deploy-azure.ps1
powershell -NoProfile -File tests/test_azure_deployment.ps1
docker build --platform linux/amd64 -t dinusnexus-backend:demo .
docker build --platform linux/amd64 -f frontend/Dockerfile `
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.test `
  -t dinusnexus-frontend:demo .
```

Frontend **harus memakai context root repo**, bukan `./frontend`: ada import
`src/data/*.json` di luar frontend. `frontend/Dockerfile.dockerignore` memakai
allowlist dan mengecualikan `.env*`, `.next`, dependencies lokal serta hasil browser
tests. Standalone tracing root adalah root repo dan entrypoint image
`frontend/server.js`; folder `public` opsional dibuat saat build. Key frontend
tidak diterima sebagai build arg. Build membutuhkan akses npm dan Google Fonts.
Build Docker tidak menyentuh cache `.next` dev server tim.

### 4. Deployment awal — tindakan berbiaya

**Jangan jalankan sebelum nominal/durasi dan resource disetujui.** Script default
hanya memeriksa CLI/file lokal. `-Deploy -ApproveCosts` mengizinkan build/push,
migrasi database demo existing dan pembuatan dua Container Apps baru.

Isi environment `DATABASE_URL` dan `DINUSNEXUS_API_KEY` pada sesi operator melalui
secret manager/input aman. Script tidak membaca `.env` otomatis. URL harus
`postgresql+psycopg://…?sslmode=require` (atau verifikasi CA/full); percent-encode
karakter khusus username/password. Jangan cetak URL atau masukkan credential pada
argumen script/history terminal. Docker migrasi mewarisi `DATABASE_URL` dari env.

```powershell
# Placeholder non-secret; ganti dengan ID/nama resource yang telah ditinjau.
.\deploy-azure.ps1 -Deploy -ApproveCosts `
  -SubscriptionId '<subscription-id>' `
  -ResourceGroup '<resource-group-demo>' `
  -AcrName '<registry-existing>' `
  -EnvironmentName '<container-apps-environment-existing>' `
  -RegistryIdentity '<resource-id-user-assigned-identity-dengan-AcrPull>'
```

Script memakai subscription eksplisit tanpa mengubah default pengguna, tag image
bertimestamp (bukan `latest`), local Docker build/push (bukan ACR Tasks), migrasi
**sebelum** API dibuat, Container Apps secret references, managed identity pull,
dan CORS hanya origin HTTPS frontend. Nama backend/frontend existing ditolak:
script bukan updater dan tidak menimpa revisi atau pekerjaan tim.

Sebelum akses Azure/migrasi, script menjalankan `npm audit --omit=dev --audit-level=high`
dari `frontend/`; kegagalan audit atau jaringan menghentikan deploy. Ini memakai
lockfile, bukan perbaikan dependency otomatis. Perubahan major dependency memerlukan
keputusan tim dan tes regresi. Node 20 pada Dockerfile baseline juga perlu ditinjau
masa dukungannya; build berhasil bukan bukti keamanan aplikasi publik.

Azure CLI menerima nilai secret saat create; walaupun output/error disembunyikan,
nilai dapat terlihat oleh proses lokal berprivilege. Gunakan mesin operator tepercaya,
tanpa transcript/debug logging; pertimbangkan Key Vault references sebelum produksi.
`/health` hanya liveness, **bukan** bukti koneksi database/LLM atau kesiapan demo.
Jika build/deploy gagal, script berhenti dan tidak menghapus resource otomatis.
Periksa resource parsial dan biaya sebelum retry; aplikasi parsial dengan nama sama
akan ditolak. Revisi image/build baru harus direncanakan dan diverifikasi tersendiri.

### 5. Akun dan acceptance demo

Dengan environment database demo yang sama dan jaringan/TLS yang sudah diizinkan:

```powershell
docker run --rm -it --env DATABASE_URL dinusnexus-backend:demo `
  python -m src.create_user --email staff@example.test --name 'Demo Staff'
```

Password diminta tersembunyi; tidak ada akun/password default. Image lokal harus
berasal dari snapshot yang sama dengan deployment (nama/tag image dicetak script).
Hapus environment secret dari sesi operator setelah selesai. Jangan arahkan pytest
ke database demo: fixture menghapus data, termasuk akun.

- Login melalui URL HTTPS `/login`, refresh, cek sesi, lalu logout dan cek pencabutan.
- Tanpa auth, `/api/history` ditolak; CORS cocok hanya dengan frontend yang dipilih.
- Buat laporan Wi-Fi baru: result `SYNTHETIC`, evidence/source ID dan execution steps.
- Refresh/restart backend, lalu buka task/history yang sama dari PostgreSQL.
- Approval approve/reject hanya mencatat keputusan, tidak melakukan aksi perangkat.
- Jalankan event assessment dan follow-up AP dari evidence ke Helpdesk.
- Uji input invalid/error dan cold start; jangan klaim chat/upload sudah bekerja
  bila belum dikonfigurasi/diimplementasikan. AI live hanya dengan persetujuan terpisah.
- Konfigurasikan readiness/startup/liveness probes Container Apps secara eksplisit
  setelah pengujian; Docker HEALTHCHECK saja bukan konfigurasi probe platform.

### 6. Cleanup dan fallback

Catat owner, daftar resource, resource group khusus demo, tanggal cleanup dan
backup hasil yang diperlukan. Setelah persetujuan penghapusan, hapus **hanya**
resource demo yang sudah ditinjau melalui Portal. Jangan menghapus resource group
shared. Database/registry/log tetap perlu diperiksa setelah aplikasi dihentikan;
budget alert bukan hard cap. Sediakan localhost dan video cadangan.

## Status verifikasi

Persiapan lokal tidak berarti deployment Azure telah dilakukan. Tes PowerShell
memakai mock executable/HTTP, tanpa operasi Azure, database atau AI live. Hasil
build/runtime lokal dan keterbatasan harus dilaporkan sebelum menyerahkan demo.

Verifikasi **10 Oktober 2026**, Docker Desktop Linux containers, tanpa operasi
cloud atau panggilan AI berbayar:

| Pemeriksaan | Hasil |
|---|---|
| Image backend Python 3.12 / frontend standalone | Kedua build lulus, Linux amd64 |
| PostgreSQL 16 terisolasi, password percent-encoded | Migrasi `0004_user_sessions` lulus |
| Suite backend di image deployment dan PostgreSQL test | 109 passed, 1 skipped (live LLM) |
| Frontend Vitest / TypeScript | 45 passed; type-check lulus |
| Regression PowerShell, Azure/Docker/HTTP/npm dimock | Guard biaya, env/TLS, audit, fail-fast, scope, migrasi, identity, CORS lulus |
| Runtime frontend | `/`, `/login`, `/workspace/operations` dan JS/CSS static HTTP 200; image tanpa `.env` lokal |
| Runtime backend | Auth ditolak tanpa credential; login/me/logout, task, evidence, runs lulus |
| Persistence setelah restart container backend | Akun, task/history, evidence dan runs tetap tersedia |
| Compile / dataset | Lulus; relasi sintetis valid |
| Diff whitespace | Diff deployment terfokus lulus; seluruh repo masih menemukan blank line `.gitignore` existing milik tim |

**Blocker keamanan:** `npm audit --omit=dev` melaporkan **12 advisory** (1 critical,
3 high, 2 moderate, 6 low); Next.js termasuk critical. `npm ci` pada build juga
melaporkan 24 vulnerability total termasuk dev dependencies. Perbaikan yang
disarankan audit melibatkan upgrade major; belum dilakukan tanpa keputusan tim.
Script deployment sengaja diblokir oleh audit high/critical sebelum mengakses Azure.
Tinjau juga lifecycle Node 20 pada image baseline sebelum exposure publik. Tidak
menjalankan `npm audit fix --force`, tidak mengubah lockfile/dependency otomatis.

Belum diverifikasi: harga/quota/kredit Azure, identity/firewall/TLS database Azure,
deployment cloud, browser end-to-end melalui Azure atau security penetration test.
Runtime HTTP lokal bukan tes interaksi browser. Standalone lint belum tersedia
tanpa konfigurasi ESLint; tidak diklaim lulus terpisah dari build.

## Catatan

Pilihan layanan Azure tertentu tidak diputuskan dalam dokumen ini karena membutuhkan pemeriksaan stack aktual, subscription, region, dan harga. Jangan menganggap kredit US$100 pasti mencukupi setiap arsitektur; gunakan opsi termurah yang memenuhi kebutuhan demo setelah estimasi biaya diverifikasi.
