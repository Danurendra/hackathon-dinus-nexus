# Data, Security & Human Oversight

## Prinsip dasar

- Gunakan data sintetis atau anonim untuk demo dan pengembangan.
- Data kampus hanya boleh digunakan jika diizinkan dan tidak bersifat rahasia tanpa otorisasi yang tepat.
- API key, token, password, connection string, dan credential cloud tidak boleh disimpan di repository.
- Terapkan akses minimum yang diperlukan.
- Semua tindakan penting harus dapat ditelusuri.

## Secrets

- Simpan rahasia pada environment variables atau secret store yang sesuai.
- Commit `.env.example` dengan nama variabel dan placeholder, bukan nilai asli.
- Pastikan `.env`, credential, file service principal, dan dump berisi data pribadi masuk `.gitignore`.
- Jangan log request header autentikasi atau API key.
- Jika secret terlanjur di-commit, cabut/rotate secret terlebih dahulu; menghapus dari commit terbaru saja tidak cukup.

## Dokumen upload

- Validasi file di server: jenis yang didukung, ukuran, nama file, dan hasil parsing.
- Jangan percaya MIME type dari browser saja.
- Hindari menggunakan nama file sebagai path penyimpanan.
- Berikan ID file internal dan simpan metadata dengan akses terkontrol.
- Jangan memproses file dengan parser yang tidak sesuai.
- Jangan mengirim seluruh dokumen kepada provider AI jika subset relevan cukup.
- File dan teks di dalamnya dapat berisi prompt berbahaya. Perlakukan konten dokumen sebagai data tidak tepercaya, bukan instruksi yang boleh mengubah policy, membuka secret, atau menjalankan tool sewenang-wenang.
- Retensi dan penghapusan file: `TBD`; tetapkan sebelum menggunakan dokumen sensitif nyata.

## AI and tools

- LLM tidak dianggap sebagai otoritas sumber data operasional.
- Fakta jaringan, pembayaran, jadwal, atau status dokumen harus berasal dari data/tool.
- Gunakan allowlist tool dan validasi argumen.
- Jangan memberikan akses shell/database/cloud tanpa batas kepada model.
- Tool yang mengubah keadaan harus memiliki policy check dan, bila sensitif, approval manusia.
- Data dari model divalidasi sebelum disimpan atau digunakan untuk tindakan berikutnya.
- Tangani prompt injection dari dokumen dan hasil tool sebagai risiko.

## Human approval

Brief hackathon mewajibkan persetujuan staf sebelum mengirim pesan, mengubah catatan akademik, atau menyetujui pembayaran. DinusNexus menerapkan prinsip serupa untuk tindakan berdampak.

Contoh tindakan yang harus dilindungi: reset akun, perubahan konfigurasi jaringan, pengiriman komunikasi eksternal, perubahan data akademik, pembayaran, atau pengubahan sumber data penting. Tindakan spesifik dan role yang berwenang: `TBD` berdasarkan kebijakan nyata.

Sebelum tindakan sensitif:
1. Tampilkan tindakan yang akan dilakukan.
2. Tampilkan target dan ringkasan alasan/evidence.
3. Minta persetujuan pengguna yang berwenang.
4. Catat siapa menyetujui, kapan, dan apa yang disetujui.
5. Eksekusi hanya tindakan yang telah disetujui.

## Audit

Audit event sebaiknya mencakup task ID, actor/user ID jika ada, worker/tool, aksi, status, timestamp, sumber terkait, approval, serta correlation ID. Hindari mencatat seluruh isi dokumen atau rahasia jika tidak dibutuhkan.

## Simulated data

Gunakan label seperti `SIMULATED DATA` atau `DEMO DATA` pada UI, README, dan demo. Dokumentasikan skenario, field simulasi, dan bagian yang belum terhubung ke sistem live.
