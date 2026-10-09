# DinusNexus

**Unified AI Digital Campus Worker** — satu workspace untuk membantu berbagai peran operasional kampus menjalankan pekerjaan berbasis workflow, sumber data, dokumen, dan AI.

> Status dokumen: baseline produk dan aturan kolaborasi yang sudah disepakati. Detail yang belum diputuskan secara eksplisit tetap ditandai `TBD`; jangan menganggap usulan sebagai keputusan final.

## Visi

DinusNexus menyatukan campus workers dalam satu platform percakapan dan operasional. Pengguna dapat mengirim instruksi, mengunggah dokumen, melihat proses eksekusi, memeriksa bukti dan hasil, serta tetap memegang kendali atas keputusan yang berdampak penting.

## Campus roles

1. Admissions Staff (PMB): menjawab pertanyaan calon mahasiswa dan memeriksa kelengkapan dokumen pendaftaran.
2. Finance Staff: menyiapkan pengingat pembayaran dan merekonsiliasi catatan UKT/SPP.
3. Academic Administration (BAAK): membantu KRS, jadwal, dan surat keterangan mahasiswa.
4. PDDikti Operator: memvalidasi data mahasiswa dan dosen sebelum pelaporan.
5. IT Helpdesk: membantu reset akun dan triase masalah Wi-Fi/jaringan.
6. Quality Assurance Staff: memetakan dokumen pendukung ke persyaratan akreditasi.
7. Career Center Staff: melakukan tracer study dan merangkum survei alumni.
8. Digital Archive Staff: mengklasifikasikan dan menemukan dokumen kampus.

## Scope prototype

- Semua delapan role menjadi bagian dari satu workspace dan arsitektur bersama.
- **IT Helpdesk adalah workflow pertama yang harus selesai secara end-to-end.**
- Campus Twin dimasukkan sebagai kemampuan tambahan yang memberi konteks lokasi/infrastruktur pada workflow terkait. Prioritas visual awal adalah peta/visualisasi 2D interaktif; 3D bukan syarat MVP.
- MVP menggunakan pola stateful workflow agent: pekerjaan memiliki status, langkah eksekusi, evidence/sumber, hasil, dan riwayat.
- UI harus mendukung chat, upload dokumen, input baru saat demo, tampilan proses yang benar-benar berasal dari backend, sumber/bukti, hasil, dan history yang bertahan setelah refresh.
- Manusia tetap memegang kendali atas tindakan sensitif melalui approval/otorisasi.
- Target deployment: Azure, memanfaatkan kredit Azure yang tersedia sekitar US$100. Layanan dan konfigurasi Azure final masih `TBD`.
- OpenCode digunakan untuk membantu coding. API key/token disediakan panitia; model, endpoint, format autentikasi, dan batasannya masih `TBD`.

## Kriteria implementasi minimum

Satu workflow operasional harus berjalan dari input sampai output melalui UI yang dapat dipakai; minimal ada satu sumber data atau tool di luar LLM; status/sumber/ringkasan dan history harus terlihat; input baru harus bisa dicoba saat live demo; data simulasi harus diberi label; setup dan hasil pengujian harus didokumentasikan.

## Dokumen proyek

- [`AGENTS.md`](AGENTS.md): instruksi untuk coding agent/OpenCode.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): branching, commit, dan pull request.
- [`docs/PRODUCT_SCOPE.md`](docs/PRODUCT_SCOPE.md): produk, delapan role, batas MVP.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): arsitektur konseptual dan tanggung jawab komponen.
- [`docs/UI_UX.md`](docs/UI_UX.md): aturan UX dan tampilan.
- [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md): alur stateful workflow dan MVP Helpdesk.
- [`docs/DATA_SECURITY.md`](docs/DATA_SECURITY.md): sumber data, dokumen, keamanan, dan human approval.
- [`docs/TOKEN_EFFICIENCY.md`](docs/TOKEN_EFFICIENCY.md): pencatatan dan optimasi token.
- [`docs/AZURE_DEPLOYMENT.md`](docs/AZURE_DEPLOYMENT.md): prinsip deployment Azure dan batas biaya.
- [`docs/DOCUMENTATION_POLICY.md`](docs/DOCUMENTATION_POLICY.md): aturan file Markdown dan pemeliharaannya.
- [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md): urutan implementasi dan Definition of Done.
- [`docs/TEAM_DEVELOPMENT_PLAN.md`](docs/TEAM_DEVELOPMENT_PLAN.md): pembagian tiga role, kerja paralel, checkpoint, dan workflow GitHub.
- [`docs/FEATURE_TASK_ASSIGNMENT.md`](docs/FEATURE_TASK_ASSIGNMENT.md): breakdown tugas per fitur untuk tiga anggota tim.
- [`docs/TECH_STACK_RECOMMENDATION.md`](docs/TECH_STACK_RECOMMENDATION.md): analisis dan rekomendasi tech stack.
- [`docs/MCP_PLUGINS.md`](docs/MCP_PLUGINS.md): plugin OpenCode dan tools development.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): keputusan final versus hal yang belum ditentukan.
- [`docs/UI_COMPONENTS.md`](docs/UI_COMPONENTS.md): dokumentasi komponen UI DinusNexus.
- [`docs/CHATBOT_FEATURE.md`](docs/CHATBOT_FEATURE.md): dokumentasi fitur chatbot AI.

## Cara menggunakan dokumen ini

1. Salin dokumen ke repository DinusNexus dengan mempertahankan struktur foldernya.
2. Audit kode yang sudah ada sebelum mengganti stack atau membuat ulang komponen.
3. Perbarui `docs/DECISIONS.md` hanya ketika keputusan `TBD` sudah dikonfirmasi.
4. Semua implementasi, data simulasi, keterbatasan, dan hasil test harus dijelaskan secara jujur dalam README dan demo.

## Catatan integritas

Dokumen ini adalah baseline perencanaan, bukan klaim bahwa fitur sudah diimplementasikan. Semua fitur baru berstatus rencana sampai kode dan test membuktikannya. Cantumkan penggunaan OpenCode, model/API panitia, library, template, dan kontribusi tim pada disclosure submission sesuai aturan hackathon.
