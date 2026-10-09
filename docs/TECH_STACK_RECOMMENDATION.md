# Rekomendasi Tech Stack — DinusNexus

Dokumen ini merekomendasikan tech stack berdasarkan:
1. Analisis referensi UI/UX (smart campus digital twin)
2. Requirement DinusNexus (IT Helpdesk workflow, stateful, persistence)
3. Constraint hackathon (waktu, tim 3 orang, Azure $100)
4. Dokumen arsitektur dan UI/UX yang sudah ada

**Status:** PROPOSED — perlu konfirmasi tim sebelum implementasi.

---

## 🎨 Analisis Referensi UI/UX

### Referensi yang Diberikan

| Sumber | Gaya | Fitur Kunci | Tech yang Digunakan |
|---|---|---|---|
| **Gambar User (DinusNexus Concept)** | Dark theme, 3D Digital Twin di tengah, panel metrics kiri/kanan, AI Intelligence section | 3D visualization, real-time metrics, alert system, suggested actions | — |
| **Nexus University (GitHub)** | Dark cyber theme (cyan #00E5FF, violet #7B61FF), glassmorphism, 3D campus | React Three Fiber, Framer Motion, Tailwind, Vite | React + Vite + Three.js + Tailwind |
| **Infodeck Smart Campus** | Professional dashboard, IoT integration, workflow automation | 3D digital twin, 600+ sensors, automated work orders | Proprietary |
| **CS AutoDriver** | Industrial IoT platform, multi-protocol | Low-code visualization, rule engine, digital twin | Proprietary |

### Pola Desain yang Konsisten

1. **Dark Theme** — semua referensi menggunakan dark background dengan accent color cerah
2. **Dashboard-Heavy** — multiple panels dengan metrics, charts, dan status indicators
3. **Real-time Visualization** — data live dengan animasi smooth
4. **3D/2D Map di Tengah** — campus map sebagai focal point
5. **AI/Intelligence Section** — alert, recommendations, suggested actions
6. **Glassmorphism** — translucent panels dengan backdrop blur

---

## 🏗️ Rekomendasi Tech Stack

### Frontend

| Layer | Teknologi | Versi | Alasan |
|---|---|---|---|
| **Framework** | Next.js | 14+ (App Router) | Full-stack (frontend + API routes), SEO-friendly, mudah deploy ke Azure, server components untuk performance |
| **Language** | TypeScript | 5.x | Type safety untuk DTO dan API contract, mengurangi bug, better DX |
| **Styling** | Tailwind CSS | 3.4+ | Rapid development, utility-first, mudah implement dark theme, custom design tokens |
| **UI Components** | shadcn/ui | Latest | Profesional, accessible, customizable, built on Radix UI, cocok untuk operational dashboard |
| **State Management** | Zustand | 4.x | Simple, lightweight, tidak perlu boilerplate seperti Redux, cocok untuk state UI kompleks |
| **Data Fetching** | TanStack Query (React Query) | 5.x | Caching, auto-refetch, optimistic updates, perfect untuk real-time task status |
| **Animations** | Framer Motion | 11.x | Smooth transitions untuk state changes (queued → running → completed), page transitions |
| **Charts** | Recharts | 2.x | React-native, declarative, mudah integrasi dengan Tailwind, cocok untuk metrics dashboard |
| **Icons** | Lucide React | Latest | Clean, consistent, accessible, cocok untuk operational UI |
| **Forms** | React Hook Form + Zod | 7.x + 3.x | Validation yang kuat, type-safe, error handling yang jelas |

### Backend

| Layer | Teknologi | Versi | Alasan |
|---|---|---|---|
| **API** | Next.js API Routes | 14+ | Tidak perlu separate backend, satu codebase, mudah deploy, cocok untuk hackathon |
| **Database** | PostgreSQL | 15+ | Relational, robust, cocok untuk task/run/step state machine, tersedia di Azure |
| **ORM** | Prisma | 5.x | Type-safe, auto-generate types dari schema, migration tools, mudah setup |
| **Alternative DB** | Supabase (PostgreSQL) | — | Free tier generous, auth included, realtime subscriptions, cepat setup untuk prototype |
| **File Storage** | Azure Blob Storage | — | Sesuai requirement deployment, atau local filesystem untuk development |
| **Validation** | Zod | 3.x | Schema validation untuk API input/output, type inference ke TypeScript |

### AI/LLM Integration

| Layer | Teknologi | Versi | Alasan |
|---|---|---|---|
| **SDK** | Vercel AI SDK | 3.x | Unified interface untuk multiple providers, streaming support, tool calling |
| **Provider** | CBN Hackathon (LiteLLM) | — | Sudah dikonfigurasi di `opencode.json`, endpoint panitia |
| **Adapter** | Custom Provider Adapter | — | Sesuai arsitektur DinusNexus, configurable, handle error aman |

### Campus Twin

| Layer | Teknologi | Versi | Alasan |
|---|---|---|---|
| **MVP (2D)** | Leaflet.js + React-Leaflet | 4.x + 4.x | Cepat implementasi, lightweight, interactive map, marker clustering, cocok untuk 2D campus map |
| **Enhanced (3D)** | Three.js + React Three Fiber | 0.160+ + 8.x | Jika waktu memungkinkan, 3D visualization seperti referensi, tapi lebih kompleks |
| **Data** | GeoJSON / Custom JSON | — | Dataset sintetis gedung/zona/perangkat, mudah di-maintain |

### Deployment

| Layer | Teknologi | Alasan |
|---|---|---|
| **Hosting** | Azure Static Web Apps | Free tier available, mudah deploy dari GitHub, include API routes, SSL included |
| **Database** | Azure Database for PostgreSQL | Sesuai requirement, atau Supabase free tier untuk prototype |
| **Storage** | Azure Blob Storage | Untuk file upload, murah, scalable |
| **CI/CD** | GitHub Actions | Otomatis deploy dari main branch, status checks |
| **Monitoring** | Application Insights (opsional) | Untuk token usage dan error tracking, tapi perlu cek budget |

### Development Tools

| Tool | Alasan |
|---|---|
| **ESLint + Prettier** | Code quality dan formatting konsisten |
| **Husky + lint-staged** | Pre-commit hooks untuk lint dan type-check |
| **Playwright** | E2E testing untuk demo workflow |
| **Vitest** | Unit testing, cepat, compatible dengan Vite/Next.js |
| **OpenCode** | Coding agent untuk development (sudah dikonfigurasi) |

---

## 🎨 Design System

Berdasarkan referensi UI dan requirement DinusNexus:

### Color Palette

```typescript
// Dark theme dengan accent operational
const colors = {
  // Background
  background: '#0A0E1A',        // Deep dark blue (seperti referensi)
  surface: '#111827',           // Panel background
  surfaceHover: '#1F2937',      // Hover state
  
  // Primary (Operational)
  primary: '#00E5FF',           // Cyber cyan (dari referensi Nexus)
  primaryDark: '#00B8CC',       // Darker cyan
  
  // Secondary
  secondary: '#7B61FF',         // Cyber violet (dari referensi)
  
  // Status Colors (sesuai requirement UI_UX.md)
  success: '#10B981',           // Emerald green
  warning: '#F59E0B',           // Amber
  error: '#EF4444',             // Red
  info: '#3B82F6',              // Blue
  
  // Text
  textPrimary: '#F9FAFB',       // Near white
  textSecondary: '#9CA3AF',     // Gray
  textMuted: '#6B7280',         // Darker gray
  
  // Borders
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
}
```

### Typography

```typescript
const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace', // Untuk code/technical data
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
}
```

### Components Pattern

Berdasarkan referensi dan requirement:

1. **MetricCard** — untuk menampilkan KPI (building nodes, service health, active incidents)
2. **StatusBadge** — untuk status task (queued, running, completed, failed)
3. **ExecutionTimeline** — untuk menampilkan step workflow
4. **EvidenceCard** — untuk menampilkan fakta/sumber
5. **ResultPanel** — untuk menampilkan hasil dengan pemisahan fakta/interpretasi
6. **ChatInput** — untuk input task baru
7. **FileUpload** — untuk upload dokumen
8. **CampusMap** — untuk 2D/3D visualization
9. **AlertBanner** — untuk AI intelligence dan recommendations

---

## 📊 Arsitektur Aplikasi

```
┌─────────────────────────────────────────────────────────┐
│  Next.js App (Frontend + API Routes)                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Pages (App Router)                               │  │
│  │  ├── / (Dashboard & Campus Twin)                  │  │
│  │  ├── /tasks (Task List & History)                 │  │
│  │  ├── /tasks/[id] (Task Detail & Inspector)        │  │
│  │  ├── /workers (Campus Workers)                    │  │
│  │  ├── /workers/it-helpdesk (Helpdesk Workflow)     │  │
│  │  ├── /documents (Document Management)             │  │
│  │  ├── /analytics (Token Usage & Metrics)           │  │
│  │  └── /settings                                    │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  API Routes                                       │  │
│  │  ├── /api/tasks (CRUD tasks)                      │  │
│  │  ├── /api/tasks/[id]/run (Execute workflow)       │  │
│  │  ├── /api/documents (Upload & parse)              │  │
│  │  ├── /api/workers (Worker registry)               │  │
│  │  └── /api/metrics (Token usage)                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────
│  Database (PostgreSQL via Prisma)                       │
│  ├── Task, TaskRun, ExecutionStep                       │
│  ├── Evidence, ToolCall                                 │
│  ├── Document, DocumentChunk                            │
│  ├── Incident, CampusBuilding, CampusDevice             │
│  └── TokenUsage, AuditLog                               │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Setup Proyek

### Struktur Folder

```
dinusnexus/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Dashboard layout
│   │   │   ├── page.tsx        # Home/Campus Twin
│   │   │   ├── tasks/
│   │   │   ├── workers/
│   │   │   ── analytics/
│   │   ├── api/                # API Routes
│   │   │   ├── tasks/
│   │   │   ├── documents/
│   │   │   ── workers/
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── dashboard/          # Dashboard-specific
│   │   ├── workflow/           # Workflow & Inspector
│   │   ├── campus-twin/        # Campus Twin visualization
│   │   └── chat/               # Chat & Input
│   ├── lib/
│   │   ├── db.ts               # Prisma client
│   │   ├── workflow.ts         # Workflow engine
│   │   ├── tools/              # Tool registry
│   │   ── llm/                # LLM provider adapter
│   ├── hooks/                  # Custom React hooks
│   ├── stores/                 # Zustand stores
│   └── types/                  # TypeScript types
├── prisma/
│   └── schema.prisma           # Database schema
├── public/                     # Static assets
├── docs/                       # Documentation
└── tests/                      # Test files
```

### Package.json Dependencies

```json
{
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "@prisma/client": "^5.8.0",
    "zod": "^3.22.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.17.0",
    "framer-motion": "^11.0.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.309.0",
    "react-hook-form": "^7.49.0",
    "@hookform/resolvers": "^3.3.0",
    "react-leaflet": "^4.2.0",
    "leaflet": "^1.9.0",
    "ai": "^3.0.0",
    "@ai-sdk/openai": "^0.0.0"
  },
  "devDependencies": {
    "prisma": "^5.8.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0",
    "vitest": "^1.2.0",
    "@playwright/test": "^1.41.0",
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/leaflet": "^1.9.0"
  }
}
```

---

## ⚖️ Trade-offs dan Pertimbangan

### Mengapa Next.js daripada Separate Frontend + Backend?

**Keuntungan:**
- Satu codebase, lebih cepat develop untuk hackathon
- API Routes sudah include, tidak perlu setup Express/FastAPI terpisah
- Server Components untuk performance
- Mudah deploy ke Azure Static Web Apps

**Kekurangan:**
- Less flexible jika butuh background jobs kompleks
- API Routes lebih sederhana daripada FastAPI untuk workflow orchestration

**Alternatif:** Jika tim lebih kuat di Python, bisa pakai Next.js (frontend) + FastAPI (backend) terpisah.

### Mengapa PostgreSQL daripada NoSQL?

**Keuntungan:**
- Relational data (Task → Run → Step → Evidence) cocok untuk SQL
- Type-safe dengan Prisma
- Available di Azure dengan free tier
- ACID compliance untuk state transitions

**Kekurangan:**
- Schema migration perlu management
- Less flexible untuk unstructured data

**Alternatif:** MongoDB jika data lebih document-oriented, tapi kurang cocok untuk state machine.

### Mengapa Leaflet daripada Three.js untuk MVP?

**Keuntungan:**
- Cepat implementasi (1-2 hari vs 1-2 minggu)
- Lightweight, tidak perlu WebGL complexity
- Cocok untuk 2D map sesuai requirement MVP
- Mudah integrasi dengan GeoJSON

**Kekurangan:**
- Tidak seimpresif 3D visualization
- Kurang "wow factor" untuk demo

**Alternatif:** Three.js + React Three Fiber jika waktu memungkinkan (P1/P2), tapi risiko tinggi untuk hackathon.

### Mengapa Supabase sebagai Alternatif DB?

**Keuntungan:**
- Free tier generous (500MB database, 1GB storage)
- Include auth dan realtime subscriptions
- Cepat setup (5 menit vs 30 menit untuk Azure DB)
- PostgreSQL compatible

**Kekurangan:**
- Vendor lock-in ke Supabase
- Kurang control daripada Azure DB langsung

**Rekomendasi:** Gunakan Supabase untuk prototype, migrate ke Azure DB jika deployment production.

---

## 📅 Estimasi Waktu Setup

| Task | Waktu | Owner |
|---|---|---|
| Inisialisasi Next.js + TypeScript + Tailwind | 2 jam | C |
| Setup shadcn/ui dan design tokens | 3 jam | A |
| Setup Prisma + PostgreSQL/Supabase | 2 jam | B |
| Setup API Routes skeleton | 2 jam | B |
| Setup Zustand stores + React Query | 2 jam | A |
| Setup Leaflet + Campus Twin base | 3 jam | A |
| Setup ESLint + Prettier + Husky | 1 jam | C |
| Setup Vitest + Playwright | 2 jam | C |
| **Total** | **~17 jam** | — |

Dengan 3 orang bekerja paralel, bisa selesai dalam **1-2 hari**.

---

## ✅ Checklist Konfirmasi Tim

Sebelum mulai implementasi, konfirmasi:

- [ ] Tim setuju dengan Next.js + TypeScript + Tailwind + shadcn/ui
- [ ] Tim setuju dengan PostgreSQL (via Supabase atau Azure DB)
- [ ] Tim setuju dengan Leaflet untuk Campus Twin MVP (2D)
- [ ] Tim punya pengalaman dengan stack ini atau siap belajar cepat
- [ ] Azure subscription sudah siap (atau pakai Supabase free tier)
- [ ] API panitia (CBN Hackathon) sudah diverifikasi endpoint dan modelnya

---

## 🔗 Referensi

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Leaflet](https://react-leaflet.js.org/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Nexus University Smart Campus (GitHub)](https://github.com/Hari-021/Nexus-University-Smart-Campus-Digital-Twin-Command-Center)
- [Infodeck Smart Campus](https://www.infodeck.io/use-cases/smart-campus/)

---

##  Catatan

Dokumen ini adalah **rekomendasi**, bukan keputusan final. Stack final harus dikonfirmasi oleh tim setelah:
1. Audit repository aktual (jika ada kode existing)
2. Verifikasi API panitia (endpoint, model, autentikasi)
3. Diskusi skill dan preferensi tim
4. Estimasi budget Azure yang lebih akurat

Perubahan stack setelah implementasi dimulai akan memakan waktu dan risiko. Pastikan keputusan final sebelum mulai coding.