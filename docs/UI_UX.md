# UI/UX Rules

## Pengalaman produk

DinusNexus harus terasa seperti rekan kerja digital: mudah diajak bicara, menerima dokumen dan tugas, memperlihatkan proses kerjanya, serta meminta bantuan/approval manusia ketika diperlukan.

## Layout utama

### Halaman login (`/login`)

- Halaman penuh tanpa header/sidebar workspace, dengan ilustrasi Campus Intelligence,
  label `SYNTHETIC`, form email/password, dan toggle mode terang/gelap.
- Mode utama **Akun workspace** mengirim `POST /api/auth/login`. Akun dan sesi
  disimpan di PostgreSQL; password PBKDF2-SHA256 bersalt, bukan plaintext. Akun
  dibuat admin lewat `python -m src.create_user`; tidak ada registrasi publik/SSO.
- Token opaque berlaku 8 jam dan tersimpan di `sessionStorage` tab (bukan password).
  Database hanya menyimpan digest token. Header memverifikasi `/api/auth/me` setelah
  reload dan menampilkan nama akun. **Keluar** mencabut sesi server sebelum menghapus
  token browser; jika backend gagal, error ditampilkan tanpa klaim logout berhasil.
- Mode **API key demo** tetap tersedia: `GET /api/history` memverifikasi key, lalu
  menyimpannya di sesi tab. Akses cepat memakai `NEXT_PUBLIC_DINUSNEXUS_API_KEY`
  bila dikonfigurasi. **Keluar demo** menghapus key tab, bukan key build-time.
- Client API mengutamakan bearer session lalu API key demo. Sesi tidak valid tidak
  fallback ke API key di server. Workspace adalah ruang kerja operasional bersama,
  **belum RBAC atau isolasi task per pengguna**; UI bukan batas otorisasi. API selalu
  memerlukan sesi valid atau API key existing. Jangan gunakan untuk data produksi.
- Akun otomatis terkunci 15 menit setelah 5 password salah. Error auth/jaringan/
  database ditampilkan tanpa mencetak kredensial atau detail internal backend.
- Token tab dapat dibaca JavaScript: perlindungan XSS, HTTPS, rate-limit global,
  dan desain cookie HttpOnly/BFF diperlukan sebelum produksi. SSO dan reset password
  mandiri belum terhubung. Menutup tab tidak mencabut sesi server; expiry tetap berlaku.
- Verifikasi: `npm run test -- --run src/lib/login.test.ts` dan
  `npx playwright test e2e/login.spec.ts` dengan frontend lokal. Endpoint API browser
  dimock, tidak membuat task atau memanggil provider berbayar.
- Verifikasi 10 Oktober 2026: migrasi dan seluruh backend suite pada PostgreSQL 16
  terisolasi lulus (**109 passed, 1 skipped**, termasuk 9 tes akun). Database/container
  test dihapus setelah pengujian; database demo tidak diubah. Frontend: **45 unit
  test**, type-check dan build produksi snapshot terisolasi lulus; **6 browser test**
  Edge pada port 3002/API mock lulus (login akun/demo, reload/logout, error,
  keyboard/mobile/reduced-motion, screenshot terang/gelap). Browser mock bukan tes
  jaringan backend live. Lint standalone masih meminta setup ESLint. Diff terfokus
  bersih; diff seluruh repo menemukan blank line `.gitignore` milik perubahan lain.

Gunakan satu Unified Workspace dengan tiga area konseptual:

1. **Sidebar:** navigasi Overview, AI Assistant, Tasks & History, Approvals, delapan Campus Workers, Campus Twin, Knowledge Base, Analytics, Audit Logs, Token Usage.
2. **Workspace tengah:** percakapan, input, attachment, hasil, dan sumber.
3. **Execution Inspector:** task status, langkah workflow, tools/sumber, evidence, durasi, error, serta token usage jika tersedia.

Implementasi responsif boleh menggabungkan panel pada layar kecil, tetapi kemampuan inti tidak boleh hilang.

## Komponen UI Dasar

Berikut komponen UI yang telah dikembangkan:

### 1. Layout Components
- `Header` - Navbar dengan logo, navigasi, dan user menu
- `Sidebar` - Navigasi dengan dropdown untuk campus workers dan analytics
- `MainLayout` - Layout utama dengan header dan sidebar

### 2. UI Components
- `Card` - Komponen card dengan berbagai varian (default, glass, bordered)
- `Badge` - Badge status dengan berbagai warna
- `StatusBadge` - Badge status khusus untuk task workflow
- `Button` - Tombol dengan berbagai varian (primary, secondary, outline, ghost, destructive)
- `Input` - Input field dengan label dan error handling
- `Textarea` - Textarea dengan label dan error handling
- `Select` - Dropdown select dengan label dan error handling
- `Alert` - Komponen alert dengan berbagai varian
- `LoadingSpinner` - Spinner loading dengan ukuran berbeda
- `EmptyState` - State kosong dengan ikon dan aksi

### 3. Workflow Components
- `TaskCard` - Kartu task dengan detail dan status
- `ExecutionTimeline` - Timeline eksekusi dengan step dan status

### 4. Chat Components
- `ChatInput` - Input chat dengan attachment dan voice recording

### 5. Campus Twin Components
- `CampusMap` - Peta kampus dengan building dan status

## Chat dan input

- Pengguna dapat memulai tugas baru dengan bahasa alami.
- Pengguna dapat memilih campus worker atau membiarkan router mengklasifikasikan permintaan jika fitur itu sudah diimplementasikan.
- Tersedia input teks dan kontrol upload dokumen yang jelas.
- Tampilkan nama file, ukuran jika tersedia, status upload, status parsing, serta kegagalan.
- Mendukung instruksi lanjutan dan input baru selama demo.
- Jangan menampilkan tombol yang seolah bekerja tetapi belum terhubung; tandai unavailable/coming later atau sembunyikan dari MVP.

## Execution Inspector

Setiap step harus menampilkan status aktual dari backend: queued/running/completed/failed/skipped/awaiting approval, sesuai state machine implementasi.

Informasi yang berguna:
- Task ID dan worker.
- Ringkasan langkah yang dijalankan.
- Tool/sumber data yang diakses.
- Hasil atau ringkasan evidence.
- Durasi jika diukur.
- Error dan tindakan pemulihan jika gagal.
- Token usage jika provider menyediakannya.

Jangan tampilkan chain-of-thought privat. Tampilkan execution trace, bukti, hasil tool, dan alasan operasional yang dapat diperiksa.

## Result design

Pisahkan secara visual:
- **Temuan/fakta:** berasal dari sumber atau hasil tool.
- **Interpretasi AI:** analisis berdasarkan bukti yang terlihat.
- **Ketidakpastian:** hal yang belum bisa dipastikan.
- **Rekomendasi:** langkah berikutnya.
- **Approval:** tindakan yang menunggu persetujuan jika ada.

Setiap sumber harus punya label yang cukup untuk ditelusuri, seperti nama dokumen, ID record, waktu pengambilan, atau ID tool result jika tersedia.

## Visual direction

- Tampilan produk operasional yang profesional dan bersih, bukan halaman promosi.
- Hierarki informasi jelas; jangan membuat dashboard terlalu padat dengan kartu statistik dekoratif.
- Gunakan komponen UI konsisten dan aksesibel.
- Gunakan warna status secara konsisten: berjalan, sukses, perhatian, gagal, dan menunggu approval.
- Gunakan skeleton/loading state hanya saat request benar-benar sedang berjalan.
- Pastikan kontras, keyboard focus, label form, dan pesan validasi dapat digunakan.
- Stack dan design tokens spesifik: `TBD` setelah audit repository. Jangan memasang design system baru jika repo sudah memiliki sistem yang sesuai.

## Campus Twin 2D

- Menampilkan objek yang benar-benar ada di dataset aktif.
- Gunakan legenda dan status yang mudah dipahami.
- Saat memilih gedung/zona/perangkat, tampilkan detail dan insiden terkait.
- Klik insiden pada task harus dapat membuka konteks device/location jika relasinya tersedia.
- Data sintetis atau simulasi harus terlihat jelas diberi badge/label.
- Versi 3D bukan syarat MVP.

## State wajib di UI

Minimal setiap workflow mendukung: idle/empty, submitting, running, success, partial result, waiting for approval, failed, dan retry/recovery jika didukung.

## Live-demo checklist

- [ ] Masukkan laporan baru yang belum disiapkan sebelumnya.
- [ ] Unggah file yang valid dan lihat status pemrosesan.
- [ ] Lihat execution steps yang berubah dari backend.
- [ ] Buka bukti/sumber hasil.
- [ ] Tunjukkan pesan error pada satu input atau tool yang gagal dengan aman.
- [ ] Refresh halaman dan buktikan history tetap ada.
- [ ] Tunjukkan label data simulasi bila ada.
