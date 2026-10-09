# Product Scope — DinusNexus

## Product statement

DinusNexus adalah **Unified AI Digital Campus Worker**: satu platform human-centered yang menyatukan berbagai pekerjaan operasional kampus melalui conversational interaction, pemrosesan dokumen, workflow berbasis tools, bukti yang dapat diperiksa, serta pengawasan manusia.

## Pengguna

Peran pengguna autentikasi dan matriks hak akses terperinci: `TBD`. Desain harus mendukung perbedaan hak akses dan tidak boleh menganggap semua orang dapat membaca semua data.

## Delapan campus roles

| Role | Pekerjaan yang didukung | Status implementasi baseline |
|---|---|---|
| Admissions Staff (PMB) | Menjawab pertanyaan calon mahasiswa dan memeriksa dokumen pendaftaran | Direncanakan; implementasi penuh `TBD` |
| Finance Staff | Menyiapkan pengingat dan merekonsiliasi catatan UKT/SPP | Direncanakan; implementasi penuh `TBD` |
| Academic Administration (BAAK) | Mendukung KRS, jadwal, dan surat keterangan | Direncanakan; implementasi penuh `TBD` |
| PDDikti Operator | Memvalidasi data mahasiswa/dosen sebelum pelaporan | Direncanakan; implementasi penuh `TBD` |
| IT Helpdesk | Mendukung reset akun dan triase Wi-Fi/jaringan | **Workflow pertama yang diprioritaskan end-to-end** |
| Quality Assurance Staff | Memetakan dokumen pendukung ke persyaratan akreditasi | Direncanakan; implementasi penuh `TBD` |
| Career Center Staff | Melaksanakan tracer study dan merangkum survei | Direncanakan; implementasi penuh `TBD` |
| Digital Archive Staff | Mengklasifikasi dan menemukan dokumen kampus | Direncanakan; implementasi penuh `TBD` |

## Shared product capabilities

- Satu workspace dan navigasi untuk semua role.
- Chat sebagai cara interaksi utama dan untuk input baru selama demo.
- Upload dokumen dan pemrosesan berdasarkan kebutuhan workflow.
- Stateful workflow agent: status tugas, langkah eksekusi, hasil, evidence, dan kegagalan tersimpan.
- Execution inspector yang menunjukkan status nyata, tools/sumber yang digunakan, serta hasil langkah.
- Hasil dan riwayat tetap tersedia setelah refresh.
- Persetujuan manusia sebelum tindakan sensitif.
- Audit log dan pengukuran penggunaan token AI.
- Campus Twin 2D interaktif sebagai konteks visual untuk lokasi/infrastruktur yang terkait.

## Campus Twin

Campus Twin bukan role kesembilan. Ia adalah kemampuan lintas modul yang dapat menampilkan representasi gedung, zona, perangkat, dan insiden berdasarkan data yang tersedia. MVP memprioritaskan 2D interaktif. Bentuk data, jumlah gedung/perangkat, dan sumber integrasi final: `TBD`.

## Batas prototype

**Wajib diprioritaskan:** satu workflow IT Helpdesk yang berjalan dari input hingga output, menggunakan setidaknya satu sumber data/tool selain LLM, menampilkan sumber/status/summary, menerima input baru saat demo, menangani kegagalan, dan menyimpan hasil/riwayat.

**Tidak boleh diklaim tanpa implementasi dan bukti:** integrasi sistem kampus live, diagnosis perangkat live, reset akun otomatis, pengiriman notifikasi, perubahan KRS, perubahan data PDDikti, transaksi pembayaran, atau semua role sudah fungsional.

## Out of scope untuk MVP kecuali waktu memungkinkan

- Multi-agent system sebagai kebutuhan wajib.
- Campus Twin 3D penuh.
- Integrasi real ke semua sistem informasi kampus.
- Eksekusi perubahan sensitif tanpa persetujuan.
- Klaim bahwa semua delapan role memiliki workflow produksi lengkap.

## Success criteria prototype

1. Pengguna memberikan laporan insiden baru dari UI.
2. Backend membuat task/run dan mencatat langkah eksekusinya.
3. Workflow mengambil data dari database/tool yang berjalan di luar LLM.
4. Hasil menyebutkan bukti/sumber serta memisahkan fakta dan dugaan.
5. UI menampilkan status, hasil, dan error secara jujur.
6. Hasil dan riwayat masih ada setelah refresh.
7. Tes input baru dan jalur gagal didokumentasikan.
8. Penggunaan token dicatat sesuai informasi yang tersedia dari provider.
