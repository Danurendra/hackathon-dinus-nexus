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
