# Markdown Documentation Policy

## Tujuan

Dokumentasi harus memberi satu sumber kebenaran yang konsisten bagi anggota tim, OpenCode, dan reviewer. Dokumen yang sudah pasti ditetapkan sebagai aturan; detail belum pasti ditandai, bukan ditebak.

## Bahasa dan gaya

- Bahasa utama dokumentasi internal: Bahasa Indonesia; istilah teknis umum boleh menggunakan bahasa Inggris.
- Judul file dan heading harus jelas, singkat, dan stabil.
- Satu dokumen memiliki satu tujuan utama.
- Jelaskan keputusan, alasan, batasan, dan tindakan yang diperlukan.
- Gunakan tabel untuk status/opsi dan checklist untuk tindakan operasional.
- Jangan membuat klaim fitur, integrasi, hasil test, penggunaan token, atau deployment jika belum dibuktikan.

## Struktur file

- `README.md`: overview produk, scope, cara mulai, dan indeks dokumen.
- `AGENTS.md`: instruksi kerja coding agent.
- `CONTRIBUTING.md`: branching, commit, PR, review.
- `docs/PRODUCT_SCOPE.md`: visi, pengguna, delapan role, scope MVP.
- `docs/ARCHITECTURE.md`: komponen, tanggung jawab, kontrak, kegagalan.
- `docs/UI_UX.md`: aturan interaksi dan design direction.
- `docs/WORKFLOWS.md`: state machine dan alur per role.
- `docs/DATA_SECURITY.md`: data, secret, upload, approval, audit.
- `docs/TOKEN_EFFICIENCY.md`: logging dan evaluasi token.
- `docs/AZURE_DEPLOYMENT.md`: konfigurasi deployment dan biaya.
- `docs/DEVELOPMENT_PLAN.md`: prioritas dan Definition of Done.
- `docs/DECISIONS.md`: daftar keputusan final dan pertanyaan TBD.

Tambahkan dokumen lain hanya jika ada kebutuhan jelas, misalnya API contract atau test plan yang sudah mulai konkret.

## Aturan status keputusan

Gunakan:
- **DECIDED**: disepakati eksplisit oleh pengguna/tim.
- **PROPOSED**: rekomendasi yang belum disetujui.
- **TBD**: belum diketahui atau memerlukan konfirmasi.
- **IMPLEMENTED**: dikonfirmasi oleh kode dan pengujian yang relevan.
- **VERIFIED**: diuji dalam kondisi yang disebutkan, dengan bukti/hasil tercatat.

Jangan mengubah `PROPOSED` atau `TBD` menjadi `DECIDED` hanya karena coding agent menyarankannya.

## Update policy

- Perubahan fitur/arsitektur harus memperbarui dokumen terkait.
- Keputusan yang berdampak lintas modul dicatat di `docs/DECISIONS.md`.
- Catat tanggal serta alasan keputusan penting jika diketahui.
- Jangan duplikasi rincian besar di banyak file; buat tautan ke dokumen sumber.
- Dokumentasikan command setup/test aktual dari repo dan pastikan command tersebut sudah diperiksa.
- Daftar TBD harus dipertahankan sampai ada keputusan eksplisit.

## Markdown quality checklist

- [ ] Heading mengikuti hierarki logis.
- [ ] Link internal menuju path yang benar.
- [ ] Code blocks memiliki language tag jika sesuai.
- [ ] Tidak ada secret, data pribadi, atau credential.
- [ ] Tidak ada klaim testing/deployment tanpa hasil nyata.
- [ ] Status DECIDED/PROPOSED/TBD/IMPLEMENTED/VERIFIED digunakan secara konsisten.
