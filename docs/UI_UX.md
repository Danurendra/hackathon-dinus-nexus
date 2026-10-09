# UI/UX Rules

## Pengalaman produk

DinusNexus harus terasa seperti rekan kerja digital: mudah diajak bicara, menerima dokumen dan tugas, memperlihatkan proses kerjanya, serta meminta bantuan/approval manusia ketika diperlukan.

## Layout utama

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
