# Fitur Chatbot AI

## Gambaran Umum

Fitur chatbot AI memungkinkan pengguna untuk berinteraksi dengan sistem melalui percakapan. Chatbot ini dirancang untuk membantu IT Helpdesk dengan memahami masalah, mencari data relevan, dan memberikan jawaban berdasarkan dataset sintetis.

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
5. **Multi-worker Support**: Mendukung role lain selain IT Helpdesk

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