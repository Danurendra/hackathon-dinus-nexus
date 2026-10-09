# Architecture Baseline

## Prinsip

1. Satu platform, banyak workflow campus role.
2. Workflow IT Helpdesk adalah jalur end-to-end pertama.
3. Model AI membantu memahami/menganalisis; tools dan sumber data menyediakan fakta operasional.
4. Setiap tugas memiliki state persisten, hasil, bukti, dan error yang bisa diperiksa.
5. Frontend menampilkan status yang bersumber dari backend, bukan progress palsu.
6. Model/provider harus dipisahkan dari logika workflow karena API panitia belum dikonfirmasi secara teknis.
7. Campus Twin memakai data operasional yang sama jika relasi tersedia; data simulasi selalu dilabeli.
8. Gunakan stack yang sudah ada di repo jika memungkinkan. Pilihan framework, database, queue, dan layanan Azure final: `TBD`.

## Logical architecture

```text
┌─────────────────────────────────────────────────────┐
│ Frontend / Unified Workspace                        │
│ Chat · Upload · Worker Navigation · Task History    │
│ Execution Inspector · Results · Campus Twin 2D      │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS / API contract
┌───────────────────────▼─────────────────────────────┐
│ Application API                                     │
│ Auth/RBAC (final design TBD) · Input Validation      │
│ Conversations · Documents · Tasks · Approvals       │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│ Workflow / Orchestration Engine                     │
│ Task Router → Stateful Workflow → Tool Registry     │
│ Retry/Timeout/Failure State → Result Assembly       │
└───────────────┬──────────────────┬──────────────────┘
                │                  │
┌───────────────▼─────────┐  ┌─────▼─────────────────┐
│ LLM Provider Adapter    │  │ Tools / Data Services│
│ Configurable endpoint   │  │ SQL / document query │
│ Request/response parse  │  │ parsing / calculation│
│ Usage and latency       │  │ network checks       │
└─────────────────────────┘  └──────────┬────────────┘
                                        │
┌───────────────────────────────────────▼─────────────┐
│ Persistence                                        │
│ Tasks/Runs/Steps · Evidence · Documents metadata    │
│ Incidents/Devices · Audit · Token Usage             │
└─────────────────────────────────────────────────────┘
```

## Component responsibilities

### Frontend

- Kirim pesan, file, dan input baru.
- Menampilkan worker aktif, task status, execution timeline, sumber/evidence, output, dan error.
- Membaca riwayat dari backend agar bertahan setelah refresh.
- Tidak menyimpan API key AI di browser.

### Application API

- Memvalidasi input dan file.
- Membuat dan membaca task/conversation.
- Mengirim pekerjaan ke workflow engine.
- Mengirim status dan hasil kembali ke frontend.
- Menegakkan otorisasi di server.

### Workflow engine

- Menetapkan role/workflow.
- Membuat task run dan langkah eksekusi.
- Memanggil tools sesuai allowlist.
- Menyimpan outcome setiap langkah.
- Menangani timeout, kegagalan, kebutuhan approval, dan penyelesaian.

### LLM provider adapter

- Menyembunyikan detail provider dari workflow.
- Memuat endpoint/model dari konfigurasi environment.
- Memformat request dan memvalidasi response.
- Mengambil usage metadata ketika provider mengembalikannya.
- Mengembalikan error yang aman tanpa mengekspos secret.

**Provider, nama model, protokol API, dan schema autentikasi: `TBD`. Jangan mengasumsikan endpoint OpenAI-compatible sampai terverifikasi.**

### Tool registry

Mendaftarkan tools yang eksplisit dan diizinkan, misalnya lookup perangkat, pencarian dokumen, perhitungan, atau pemeriksaan jaringan yang aman. Tool harus mengembalikan data terstruktur beserta metadata sumber/waktu ketika tersedia.

### Persistence

Menyimpan tugas, run, langkah, hasil, dan audit. Teknologi database dan file storage: `TBD` sampai repo dan budget diperiksa.

### Campus Twin

Membaca building/zone/device/incident dari data yang tersedia dan memvisualisasikannya. UI tidak boleh mengubah status perangkat hanya melalui manipulasi tampilan. Sumber status dan label simulasi harus jelas.

## Suggested domain entities

Entitas konseptual (bukan keputusan SQL final):

- `User`, `Role`, `CampusWorker`
- `Conversation`, `Message`
- `Document`, `DocumentChunk` jika retrieval chunking diperlukan
- `Task`, `TaskRun`, `ExecutionStep`
- `Evidence`, `ToolCall`
- `Incident`, `CampusBuilding`, `CampusZone`, `CampusDevice`, `DeviceEvent`
- `Approval`, `AuditLog`, `TokenUsage`

Implementasi boleh menggabungkan atau memisahkan tabel sesuai database dan pola repo.

## Contract principle

Kontrak API perlu memakai ID stabil dan state eksplisit. Format final endpoint/DTO: `TBD` setelah audit stack. Minimal frontend dapat membuat task, membaca status/run steps, mengirim pesan/file, membuka hasil, dan membaca history. Status konseptual: `queued`, `running`, `waiting_for_approval`, `completed`, `failed`, `cancelled`.

## Failure behavior

- Provider tidak tersedia: simpan error task dan tampilkan pesan aman.
- Tool gagal: tandai langkah gagal dan jangan menghasilkan klaim seolah tool sukses.
- Bukti kurang: nyatakan diagnosis belum pasti.
- Input tidak valid: tolak dengan pesan koreksi yang jelas.
- Upload gagal: tampilkan error dan jangan mengklaim dokumen telah diproses.
- Refresh/reconnect: muat status dari persistence.

## Hal yang masih TBD

- Framework dan struktur repo aktual.
- Identitas/login dan model RBAC yang tepat.
- Model/provider/API panitia.
- Database dan strategi migrasi.
- Metode background execution/realtime update.
- Parser per jenis file.
- Sumber device/network data dan apakah real atau sintetis.
- Azure services dan domain/HTTPS setup.
