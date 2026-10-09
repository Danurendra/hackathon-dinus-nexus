# Dokumentasi Komponen UI DinusNexus

Dokumen ini menjelaskan komponen UI yang telah dikembangkan untuk platform DinusNexus. Komponen ini dirancang untuk mendukung pengalaman pengguna yang profesional, ramah, dan sesuai dengan kebutuhan IT Helpdesk dan campus workers lainnya.

## Struktur Komponen

Komponen UI dibagi menjadi beberapa kategori berdasarkan fungsinya:

### 1. Layout Components
Komponen dasar untuk struktur layout aplikasi.

#### Header
Komponen header dengan logo, navigasi, dan menu pengguna.

#### Sidebar
Sidebar navigasi dengan dropdown untuk berbagai fitur.

#### MainLayout
Layout utama yang menggabungkan header dan sidebar.

### 2. UI Components Dasar
Komponen UI yang digunakan secara umum dalam aplikasi.

#### Card
Komponen card dengan berbagai varian:
- `default`: Card standar
- `glass`: Card dengan efek glassmorphism
- `bordered`: Card dengan border

#### Badge
Badge status dengan berbagai warna:
- `default`: Abu-abu
- `success`: Hijau
- `warning`: Kuning
- `error`: Merah
- `info`: Biru
- `primary`: Cyan
- `secondary`: Ungu

#### StatusBadge
Badge status khusus untuk workflow:
- `queued`: Antrian
- `running`: Berjalan
- `completed`: Selesai
- `failed`: Gagal
- `waiting_for_approval`: Menunggu persetujuan
- `cancelled`: Dibatalkan

#### Button
Tombol dengan berbagai varian:
- `primary`: Tombol utama
- `secondary`: Tombol sekunder
- `outline`: Tombol outline
- `ghost`: Tombol ghost
- `destructive`: Tombol untuk aksi berbahaya

#### Input
Input field dengan label dan error handling.

#### Textarea
Textarea dengan label dan error handling.

#### Select
Dropdown select dengan label dan error handling.

#### Alert
Komponen alert dengan berbagai varian:
- `default`: Biru
- `success`: Hijau
- `warning`: Kuning
- `error`: Merah
- `info`: Cyan

#### LoadingSpinner
Spinner loading dengan ukuran berbeda (sm, md, lg).

#### EmptyState
State kosong dengan ikon, judul, deskripsi, dan aksi.

### 3. Workflow Components
Komponen khusus untuk workflow dan task management.

#### TaskCard
Kartu task dengan detail:
- Judul dan deskripsi
- Status task
- Informasi tambahan (tanggal, lokasi, jenis perangkat)
- Tombol untuk melihat detail

#### ExecutionTimeline
Timeline eksekusi workflow:
- Langkah-langkah dengan status
- Informasi waktu dan durasi
- Sumber data dan error handling
- Expandable detail per step

### 4. Chat Components
Komponen untuk interaksi chat dan input task.

#### ChatInput
Input chat dengan attachment:
- Text input
- Attachment file (PDF, DOC, TXT, dll)
- Voice recording
- Input tambahan (lokasi, jenis perangkat)
- Tombol kirim

### 5. Campus Twin Components
Komponen untuk visualisasi campus twin.

#### CampusMap
Peta kampus dengan building dan status:
- Visualisasi 2D kampus
- Marker building dengan status
- Informasi detail saat dipilih
- Legend status
- Mode overview dan device

## Penggunaan Komponen

### Contoh Penggunaan Card

```tsx
import { Card } from '@/components/ui/Card';

<Card>
  <div className="p-4">
    <h3 className="font-semibold text-gray-900">Judul Card</h3>
    <p className="text-gray-600">Deskripsi card</p>
  </div>
</Card>
```

### Contoh Penggunaan TaskCard

```tsx
import { TaskCard } from '@/components/workflow/TaskCard';

<TaskCard
  taskId="task-001"
  title="Masalah WiFi di Gedung A"
  description="Pengguna tidak bisa terhubung ke jaringan WiFi di lantai 2 gedung A"
  status="running"
  worker="IT Helpdesk"
  createdAt="2026-10-09 14:30"
  location="Gedung A, Lantai 2"
  deviceType="WiFi"
/>
```

### Contoh Penggunaan ChatInput

```tsx
import { ChatInput } from '@/components/chat/ChatInput';

<ChatInput 
  onSubmit={(message, attachments) => {
    // Handle submission
  }}
  isLoading={false}
/>
```

## Prinsip Desain

### 1. Konsistensi
- Gunakan warna dan styling yang konsisten
- Pastikan komponen memiliki tata letak yang seragam
- Gunakan ikon yang konsisten

### 2. Aksesibilitas
- Pastikan komponen dapat diakses dengan keyboard
- Gunakan warna yang cukup kontras
- Sertakan label yang jelas

### 3. Responsif
- Komponen harus bekerja di berbagai ukuran layar
- Gunakan grid system yang fleksibel
- Pastikan spacing yang konsisten

### 4. Ramah Pengguna
- Gunakan feedback visual saat interaksi
- Tampilkan error dengan jelas
- Sediakan informasi bantuan yang relevan

## Konvensi Penamaan

- File komponen: `ComponentName.tsx`
- Folder komponen: `component-name`
- Properti: `camelCase`
- Variasi komponen: `variant` prop

## Integrasi dengan Backend

Komponen UI dirancang untuk bekerja dengan API backend melalui kontrak data yang sudah ditentukan. Semua komponen menerima props dari state aplikasi dan memanggil callback saat ada interaksi pengguna.

## Pengembangan Lanjutan

Untuk pengembangan komponen baru, ikuti pola yang sudah ada:
1. Buat file komponen di folder yang sesuai
2. Gunakan TypeScript untuk type safety
3. Buat dokumentasi singkat dalam file komponen
4. Tambahkan contoh penggunaan
5. Pastikan komponen dapat digunakan secara mandiri