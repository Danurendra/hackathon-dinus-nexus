# Decision Register

Dokumen ini membedakan hal yang sudah diputuskan dari hal yang masih perlu dikonfirmasi. Jangan mengubah item `TBD` menjadi keputusan final tanpa konfirmasi tim.

## DECIDED — sudah disepakati

| ID | Keputusan | Detail |
|---|---|---|
| D-001 | Nama produk | DinusNexus |
| D-002 | Positioning | Unified AI Digital Campus Worker untuk operasional kampus |
| D-003 | Campus roles | Satu platform mencakup delapan role dari brief CBN: PMB, Finance, BAAK, PDDikti, IT Helpdesk, Quality Assurance, Career Center, Digital Archive |
| D-004 | Implementasi awal | IT Helpdesk menjadi workflow pertama yang diprioritaskan end-to-end |
| D-005 | Platform breadth | Satu workspace/navigasi untuk seluruh role; tidak wajib semua role langsung memiliki workflow lengkap |
| D-006 | AI interaction | Pengguna dapat chat dan memberikan input baru selama demo |
| D-007 | Documents | Pengguna dapat upload dokumen; format yang didukung ditetapkan setelah stack/parser dipastikan |
| D-008 | Transparent execution | UI perlu memperlihatkan status dan proses kerja yang berasal dari backend, plus hasil dan sumber/evidence yang relevan |
| D-009 | Persistence | Hasil/riwayat harus tetap tersedia setelah refresh |
| D-010 | Workflow pattern | Stateful workflow agent (D3) |
| D-011 | Campus Twin | Campus Twin sebagai kemampuan tambahan dan konteks visual; mulai dari 2D interaktif (E4), bukan mewajibkan 3D |
| D-012 | Human oversight | Tindakan sensitif memerlukan kontrol/approval manusia sesuai kewenangan dan aturan |
| D-013 | Coding workflow | OpenCode digunakan sebagai coding agent; API key disediakan oleh panitia |
| D-014 | Deployment target | Azure, dengan kredit yang diperkirakan sekitar US$100; layanan spesifik belum diputuskan |
| D-015 | Documentation | Gunakan dokumen Markdown terpisah dengan status keputusan yang eksplisit |

## PROPOSED — rekomendasi, belum final

| ID | Rekomendasi | Mengapa belum final |
|---|---|---|
| P-001 | Next.js + TypeScript + Tailwind + shadcn/ui untuk UI | Stack repository aktual belum diaudit dan pengguna belum memilih framework |
| P-002 | FastAPI/Python untuk backend | Stack repository dan kebutuhan deployment belum dikonfirmasi |
| P-003 | PostgreSQL untuk data persisten | Database saat ini dan biaya Azure belum dikonfirmasi |
| P-004 | Azure Blob Storage untuk dokumen pada deployment | Keputusan bergantung pada kebutuhan, biaya, dan integrasi aktual |
| P-005 | Satu orchestration engine dengan workflow khusus per role, bukan multi-agent | Sesuai timebox; implementasi akhir menyesuaikan kebutuhan nyata |

## TBD — belum diputuskan/harus diverifikasi

| Area | Pertanyaan yang belum dijawab |
|---|---|
| Repository | Struktur kode, framework, branch, perubahan lokal, dan komponen yang sudah tersedia |
| Organizer API | Provider/model, base URL, endpoint, autentikasi, payload, token usage metadata, rate limit, dan dokumentasi resmi |
| Frontend/backend | Framework dan versi aktual yang harus dipakai |
| Database | Mesin database, schema final, migrasi, dan lokasi penyimpanan |
| Authentication | Login, SSO bila ada, role-based access policy, serta akun demo |
| File upload | Format final, batas ukuran, parser, OCR bila diperlukan, retensi, dan mekanisme penghapusan |
| Tools Helpdesk | Dataset perangkat, sumber status jaringan, pemeriksaan yang aman, dan mana yang disimulasikan |
| Campus Twin | Data gedung/zona/perangkat, sumber, koordinat/layout, dan cakupan awal |
| Background/realtime | Polling, Server-Sent Events, WebSockets, atau mekanisme lain sesuai stack |
| Azure | Subscription/resource group, region, layanan hosting, database, storage, budget alert, domain, dan estimasi biaya |
| Team | Penanggung jawab setiap area, review owner, dan jadwal freeze |
| Additional workers | Urutan role tambahan setelah workflow IT Helpdesk stabil |

## Change control

Jika ada keputusan baru:
1. Catat keputusan dan alasan.
2. Ubah status item terkait menjadi `DECIDED`.
3. Perbarui dokumen desain yang terdampak.
4. Implementasikan melalui branch dan pull request sesuai `CONTRIBUTING.md`.
