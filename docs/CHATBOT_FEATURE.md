# Fitur Chatbot AI

## Gambaran Umum

Fitur chatbot AI memungkinkan pengguna untuk berinteraksi dengan sistem melalui percakapan. Chatbot ini dirancang untuk membantu IT Helpdesk dengan memahami masalah, mencari data relevan, dan memberikan jawaban berdasarkan dataset sintetis.

## Chat berbasis role di `/workspace/agents`

Jalur aktif adalah handler message di `src/main.py`, bukan graph placeholder
`src/workflows/chat.py`. Tiga role tersedia untuk **analisis/rekomendasi chat**:

| Agent | Fokus jawaban | Evidence |
|---|---|---|
| IT Helpdesk | Triase gejala/dampak, korelasi insiden/perangkat, hipotesis dan pemeriksaan aman | `devices`, `incidents`, `zones`, `buildings` dari JSON sintetis |
| Network Operations | Utilization/headroom per perangkat, latency, packet loss, bottleneck dan proyeksi dengan asumsi eksplisit | Fixture `network_adapter`, termasuk hasil aturan anomali |
| Campus Operations | Klarifikasi acara/peserta/sesi, pilihan venue, koordinasi PIC/resource dan verifikasi kapasitas | Kapasitas zona/gedung dan insiden aktif JSON |

`src/conversations/context.py` memberikan record allow-listed (maksimal 6 per dataset,
string record maksimal 240 karakter), bukan hanya jumlah hasil pencarian. Follow-up
memakai lokasi eksplisit terakhir pada empat pesan user terakhir; lokasi baru
menggantikan lokasi lama. Riwayat provider dibatasi 12 pesan, maksimal 4.000 karakter
per pesan. Context client tidak dapat mengganti role/policy server. Lampiran pada
jalur ini belum diparsing; model tidak boleh mengaku membacanya.

Respons analisis diarahkan untuk memisahkan ringkasan, fakta/evidence, hipotesis,
langkah berikutnya dan hal belum diketahui. Detail kritis yang belum ada ditanyakan
melalui maksimal tiga pertanyaan klarifikasi. Kualitas bahasa/penalaran tetap
bergantung pada provider; prompt bukan jaminan bebas halusinasi. ID operasional
dengan prefix dataset yang tidak ada di evidence ditolak, tetapi validasi ini
bukan pemeriksaan kebenaran seluruh prosa model.

Metadata respons menambahkan `data_label`, `sources`, `evidence` (dataset, source_id,
record), `evidence_counts`, `derived`, dan `limitations`, seluruhnya dari adapter.
UI merender subset Markdown aman dan panel evidence yang dapat dibuka. Evidence
adalah konteks retrieval, bukan otomatis bukti diagnosis. Error provider/output
kosong/ID tidak valid/tool gagal mengembalikan pesan aman HTTP 502.

**Batas data:** `daily_capacity` dijumlahkan dari `zones.capacity` melalui `buildingId`.
`event_capacity` fallback adalah estimasi `daily_capacity ×10`, bukan kapasitas venue
terverifikasi. Default energi/AP adalah fixture. Dataset jaringan terpisah dari
inventaris Helpdesk/Twin dan tidak boleh dianggap memiliki relasi otomatis.
Chat tidak mengganti model kalkulasi Event Planning ataupun simulator Twin.

**Sesi dan keamanan:** UI menyimpan hanya ID sesi per role di localStorage, kemudian
memuat pesan dari backend saat pindah role/reload. Pesan masih di memori server,
hilang saat restart; bukan persistence PostgreSQL. Tombol Sesi baru tidak menghapus
history task. Chat tidak mengeksekusi tindakan atau membuat task otomatis. Workflow
task IT dan assessment event terpisah tetap diperlukan untuk history persisten.
Konfirmasi dalam chat bukan approval atau izin eksekusi. Semua endpoint tetap
memerlukan `X-API-Key`; provider key tidak dikirim ke browser.

Verifikasi otomatis: `python -m pytest tests/test_agent_chat_context.py
tests/test_conversation_api.py` (provider dimock), dan browser test
`frontend/e2e/agent-chat.spec.ts` dengan API dimock agar tidak memanggil provider
berbayar atau mengubah database demo.

Hasil verifikasi 10 Oktober 2026: 13 tes konteks/API lulus; 1 browser test Edge
lulus (role isolation, evidence, reload, recovery, keyboard mobile/reduced-motion).
Suite backend lulus dengan satu live-LLM test skipped menggunakan database SQLite
terisolasi, bukan verifikasi PostgreSQL. Frontend: 39 tes Vitest dan `tsc --noEmit`
lulus. Compile Python dan validasi dataset lulus. `next build` berhasil compile/type
check tetapi gagal collect page data `/login` pada working tree yang sedang berubah;
lint terblokir setup ESLint interaktif. Tidak ada panggilan provider live/berbayar.

## Komponen Utama

### 1. API Endpoints

#### Conversations
- `POST /api/conversations` - Membuat percakapan baru
- `GET /api/conversations` - Mendapatkan daftar percakapan
- `GET /api/conversations/{id}` - Mendapatkan detail percakapan
- `DELETE /api/conversations/{id}` - Menghapus percakapan

#### Messages
- `POST /api/conversations/{id}/messages` - Mengirim pesan ke percakapan

### 2. Struktur Data

#### Conversation
```json
{
  "conversation_id": "conv-xxx",
  "worker": "it_helpdesk",
  "title": "Percakapan baru",
  "created_at": "2026-10-09T10:00:00Z",
  "updated_at": "2026-10-09T10:00:00Z",
  "messages": []
}
```

#### Message
```json
{
  "message_id": "msg-xxx",
  "conversation_id": "conv-xxx",
  "role": "user|assistant",
  "content": "Pesan pengguna",
  "created_at": "2026-10-09T10:00:00Z",
  "metadata": {
    "tokens_used": {"input": 150, "output": 200},
    "model": "qwen3-coder-flash",
    "sources": ["device-AP-A1-01", "incident-001"]
  }
}
```

### 3. Arsitektur

```
┌─────────────────────────────────────────┐
│ Frontend (Next.js + TypeScript)         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ FastAPI Application                     │
│ ├─ /api/conversations (chat)            │
│ └─ /api/tasks (existing)                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ LangGraph Workflow Engine               │ (belum digunakan secara penuh)
│ └─ chat_graph (simplified)             │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼─────┐  ┌──────▼──────┐
│ LLM Client │  │ Data Adapter│
│ (primary +  │  │ (search)    │
│ OpenAI fallback)│             │
└────────────┘  └─────────────┘
```

## Fungsi Utama

### 1. Deteksi Intent
- `helpdesk_query`: Permintaan bantuan IT Helpdesk
- `create_task`: Permintaan membuat task baru
- `general_question`: Pertanyaan umum tentang kampus
- `other`: Lainnya

### 2. Pencarian Konteks
- Mencari data berdasarkan konteks pesan
- Menggunakan dataset sintetis: devices, incidents, zones, buildings

### 3. Pembuatan Respon
- Menggunakan prompt sistem yang sesuai
- Menggabungkan konteks dengan hasil pencarian
- Memberikan jawaban yang struktur dan informatif

## Integrasi dengan Sistem

### Token Usage Tracking
Setiap interaksi dengan LLM mencatat:
- Input tokens
- Output tokens
- Model yang digunakan
- Timestamp

### Data Sintetis
Semua data yang digunakan oleh chatbot berlabel `SYNTHETIC` dan tidak merepresentasikan kondisi live kampus.

### Error Handling
- Kesalahan LLM ditangani dengan baik
- Pesan error yang aman dikembalikan ke frontend
- Logging error untuk debugging

### Provider dan fallback

Provider utama memakai `LLM_BASE_URL`, `LLM_API_KEY`, dan `LLM_MODEL`.
Set `LLM_PROVIDER=openai` untuk menjadikan OpenAI provider utama pada chat agent.
Jika `LLM_FALLBACK_ENABLED=true` dan provider utama gagal, backend mencoba
OpenAI menggunakan `OPENAI_API_KEY`, `OPENAI_BASE_URL`, dan `OPENAI_MODEL`.
Model fallback default adalah `gpt-5-nano` untuk menjaga biaya tetap rendah.
API key hanya dibaca backend dari environment dan tidak pernah dikirim ke frontend.

## Keamanan

### Data Privacy
- Data percakapan disimpan sementara dalam memory
- Tidak ada data sensitif yang disimpan
- API key LLM disimpan di environment variables

### Security
- Input validation pada semua endpoint
- Penggunaan HTTP client yang aman
- Penanganan error yang tidak mengungkapkan informasi sensitif

## Frontend Integration

### UI Components
- Chat interface dengan pesan masuk/keluar
- History percakapan
- Token usage display
- Status loading/error

### Interaksi
1. Pengguna membuat percakapan baru
2. Pengguna mengirim pesan
3. Backend memproses pesan dengan LLM
4. Backend mengembalikan respons
5. UI menampilkan pesan dan token usage

## Pengembangan Lanjutan

### Fitur yang Dapat Dikembangkan
1. **LangGraph Workflow**: Integrasi workflow yang lebih kompleks
2. **Persistent Storage**: Ganti memory storage dengan database
3. **Advanced Intent Detection**: Menggunakan LLM untuk deteksi intent
4. **Approval Flow**: Integrasi dengan sistem persetujuan
5. **Multi-worker workflow**: Perluasan eksekusi/persistence per role; analisis chat tiga role sudah tersedia

## Testing

### Unit Tests
- Test LLM client
- Test conversation store
- Test intent detection
- Test message processing

### Integration Tests
- Test API endpoints
- Test full chat flow
- Test error scenarios
- Test token usage logging
