# Azure Deployment Baseline

## Yang sudah diputuskan

- Target deployment adalah Microsoft Azure.
- Anggaran kredit yang tersedia diperkirakan sekitar **US$100**.
- Pengeluaran infrastruktur perlu dikendalikan dan diawasi.
- Localhost tetap dapat digunakan untuk demo jika deployment cloud menambah risiko atau mengganggu kesiapan.
- Kredit untuk infrastruktur berbeda dari alokasi token AI panitia.

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

- [ ] Repo bersih dan commit kandidat demo diketahui.
- [ ] Test lokal selesai dan hasilnya dicatat.
- [ ] Environment variables disiapkan di luar source code.
- [ ] API key provider dan secret database tidak masuk build/client.
- [ ] Azure resource/cost estimate sudah ditinjau.
- [ ] Seed/demo data diberi label.
- [ ] Smoke test: login/access, chat, upload, run task, result, history refresh.
- [ ] Error provider/tool diuji.
- [ ] Token usage/logging diverifikasi.
- [ ] Teardown/cleanup plan dicatat.

## Catatan

Pilihan layanan Azure tertentu tidak diputuskan dalam dokumen ini karena membutuhkan pemeriksaan stack aktual, subscription, region, dan harga. Jangan menganggap kredit US$100 pasti mencukupi setiap arsitektur; gunakan opsi termurah yang memenuhi kebutuhan demo setelah estimasi biaya diverifikasi.
