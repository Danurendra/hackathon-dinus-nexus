# Stateful Workflows

## Pola bersama

Semua campus worker harus dibangun menggunakan pola workflow yang bisa dilacak, walaupun isi langkahnya berbeda.

```text
User Input / Document
        ↓
Validate & Identify Intent
        ↓
Create Task + Task Run
        ↓
Execute Allowed Steps / Tools
        ↓
Persist Step Status + Evidence
        ↓
Analyze / Calculate / Retrieve
        ↓
Assemble Result with Sources & Uncertainty
        ↓
Approval Gate if a consequential action is requested
        ↓
Persist Final Result and Audit Events
        ↓
Display Result and History
```

Pekerjaan boleh menghasilkan partial result jika sebagian tools gagal, tetapi UI harus menjelaskan bagian yang gagal dan batas kesimpulannya.

## Task/run state

State machine konseptual:

- `queued`: diterima dan menunggu eksekusi.
- `running`: workflow sedang dieksekusi.
- `waiting_for_approval`: menunggu keputusan manusia.
- `completed`: langkah wajib berhasil dan hasil disimpan.
- `failed`: tidak dapat menghasilkan hasil yang valid.
- `cancelled`: dihentikan oleh pengguna/sistem.

Step status dapat lebih terperinci, termasuk `skipped` atau `retrying`, sesuai implementasi.

## Workflow prioritas: IT Helpdesk

### Input

- Deskripsi masalah.
- Lokasi/gedung atau zona, jika diketahui.
- Jenis perangkat atau layanan, jika diketahui.
- Waktu/indikasi kejadian, jika tersedia.
- Lampiran log/screenshot/dokumen yang didukung.

### Steps

1. Validasi laporan dan ekstrak field relevan.
2. Buat incident/task ID dan simpan permintaan.
3. Ambil record perangkat dan lokasi yang relevan dari database/tool.
4. Ambil histori insiden yang cocok jika tersedia.
5. Jalankan pemeriksaan jaringan hanya jika tool dan lingkungan memang tersedia serta aman.
6. Simpan output tiap tool sebagai evidence dengan sumber dan waktu bila tersedia.
7. Evaluasi bukti dan tandai hipotesis sebagai supported, contradicted, atau unknown jika logika aplikasi mendukungnya.
8. Susun diagnosis dengan confidence/ketidakpastian yang tidak menyesatkan.
9. Berikan rekomendasi berikut langkah verifikasi.
10. Minta approval sebelum tindakan yang berdampak (contoh reset akun/perubahan konfigurasi) bila tindakan tersebut benar-benar tersedia.
11. Simpan hasil akhir, status, dan audit event.
12. Kaitkan ke Campus Twin jika record insiden dan perangkat memiliki hubungan yang terverifikasi.

### Hasil

- Ringkasan insiden.
- Fakta/evidence yang ditemukan.
- Diagnosis atau status “belum cukup bukti”.
- Hipotesis dan bukti pendukung/penyangkal bila dievaluasi.
- Rekomendasi langkah berikutnya.
- Sumber/record ID.
- Status task/tiket.
- Waktu/durasi dan token usage apabila benar-benar terukur.

### Data demo

Gunakan dataset sintetis yang jelas diberi label. Contoh gedung/perangkat tidak mewakili kondisi kampus nyata kecuali terintegrasi dengan sumber yang sah dan diverifikasi.

## Workflow dokumen (shared capability)

1. Validasi ekstensi, MIME/type, ukuran, dan batas upload.
2. Simpan file dengan nama/ID internal yang aman.
3. Ekstrak teks/struktur menggunakan parser yang sesuai.
4. Catat status parsing dan error.
5. Jalankan task terhadap isi yang relevan saja.
6. Simpan referensi ke halaman, sheet, baris, atau bagian bila parser mendukungnya.
7. Tampilkan hasil serta keterbatasan ekstraksi.

PDF scan/image mungkin memerlukan OCR; jika OCR tidak tersedia, nyatakan keterbatasan daripada berpura-pura file terbaca.

## Worker-specific workflow outlines

- **PMB:** pertanyaan → retrieval sumber PMB → jawaban dengan referensi; upload → pemeriksaan kelengkapan → daftar item tersedia/kosong.
- **Finance:** data pembayaran → validasi schema → rekonsiliasi deterministic → exceptions → review manusia. Jangan membuat pembayaran atau mengirim pengingat tanpa izin.
- **BAAK:** permintaan → pencarian data/jadwal → verifikasi sumber → jawaban/draf. Perubahan catatan perlu otorisasi.
- **PDDikti:** dataset → validasi field/format/konsistensi → exception report → petugas meninjau. Jangan mengklaim pengiriman ke PDDikti tanpa integrasi.
- **IT Helpdesk:** intake → data/network evidence → analisis → rekomendasi → ticket/history.
- **Quality Assurance:** kriteria → cari dokumen bukti → mapping dengan sumber → gaps untuk review ahli.
- **Career Center:** data survei → pemeriksaan schema/anonymization → perhitungan → ringkasan berbasis hasil.
- **Digital Archive:** query → pencarian/classification → hasil berperingkat dengan metadata/link.

Outline ini adalah target desain. Hanya workflow yang telah diimplementasikan dan diuji boleh ditandai “implemented”.
