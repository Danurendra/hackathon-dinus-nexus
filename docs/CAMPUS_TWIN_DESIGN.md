# Campus Twin — Spesifikasi Desain Visual & Interaksi

> Status: **DESIGN LOCKED** (siap transkripsi kode). Dokumen ini adalah sumber kebenaran
> untuk transformasi Campus Twin. Implementasi mengikuti nilai di sini, bukan menebak.
> Referensi visual: smart-campus digital twin command center (gaya "一网统管平台").

---

## 0. Keputusan yang Perlu Dikonfirmasi Tim

| # | Isu | Rekomendasi | Alasan |
|---|---|---|---|
| 0.1 | Referensi berwarna **gelap**, arahan awal user **"jangan gelap"** | **Dua mode dalam satu kanvas**: `Ops` (gelap, HUD) dan `Day` (terang, paper-like). Geometry & layer identik, hanya palet + glow berbeda. Route `/` default `Day`; route imersif default `Ops`. | Kanvas geospasial imersif memang lebih terbaca di dasar gelap (heatmap & glow insiden menang kontras). Form/chat/riwayat tetap terang untuk keterbacaan. Tidak ada flip tema global, jadi kerja teammate tidak pecah. |
| 0.2 | Campus Twin sekarang adalah **card di dalam** Command Center (`page.tsx:271`) | **Dua mode penyajian**: *Embedded* (card, kontrak lama dipertahankan) dan *Immersive* (route baru `/campus-twin`, layout penuh seperti referensi). | Memenuhi "jangan ubah layout yang ada" sekaligus "tampil seperti referensi". |
| 0.3 | Font HUD | `next/font/google` → **Barlow Semi Condensed** untuk numeral KPI. Inter tetap untuk body. Bila build offline: fallback `font-black tracking-tight`. | Numeral kondensasi tebal adalah ciri paling kuat command center. Tanpa paket npm baru. |
| 0.4 | ID gedung frontend ≠ backend | Tambah field `backendBuildingId?` (lihat §10) | Menegakkan aturan AGENTS.md #4: tidak mengarang integrasi. |

---

## 1. Bahasa Visual

### 1.1 Palet — Mode `Ops` (gelap, analog referensi)

```
Langit / backdrop      #040B1A → #0A1830 → #0E2140   (linear, 180deg)
Bidang tanah           #0B1B33      tekstur      #10253F
Jalan: casing / isi / marka   #16304F / #1D3A5C / #4FD8E8 @ 50%
Atap (gradien)         #1B3A63 → #2A5484
Dinding sisi matahari / sisi teduh      #17324F / #0F2338
Jendela: mati / aktif / siaga  #38566F · #7FE3F5 @35% · #FFB347
Kanopi pohon           #0F3B3A · #14504A · #1B6B5C · sorotan #2E8B7A
Aksen primer / sekunder     #22D3EE / #5B8CFF
Sukses / Perhatian / Kritis / Maintenance
                       #34D399 / #FBBF24 / #FB7185 / #A78BFA
Teks hi / mid / low    #E6F4FF / #8FA9C4 / #5C7691
Panel bg / border      rgba(9,22,42,.72) / rgba(34,211,238,.22)
Glow aktif             0 0 24px rgba(34,211,238,.28)
```

### 1.2 Palet — Mode `Day` (terang)

```
Langkit                #EAF2FB → #F8FAFC
Bidang tanah           #E8EFE6      tekstur #DCE6DA
Jalan: casing / isi / marka   #CFD8E3 / #FFFFFF / #94A3B8
Atap                   #C9D6E6 → #E3EBF5
Dinding matahari / teduh      #DCE6F2 / #B9C7D9
Jendela mati / aktif / terpilih   #9FB6CE · #7C93AD · #4F46E5
Kanopi                 #9CC49A · #7FB37F · #5F9A6B
Aksen                  #4F46E5 / #0EA5E9
Sukses / Perhatian / Kritis / Maintenance
                       #16A34A / #D97706 / #DC2626 / #7C3AED
Teks hi / mid          #0F172A / #64748B
Panel bg / border      #FFFFFF / #E2E8F0
Glow                   (tidak dipakai; pakai ring 2px solid)
```

Token palet hidup di `src/lib/campusPalette.ts` sebagai objek `day` / `ops` dengan
key identik. Komponen tidak pernah menulis hex literal.

### 1.3 Tipografi

| Peran | Font | Ukuran | Bobot | Tracking |
|---|---|---|---|---|
| KPI utama | Barlow Semi Condensed | 40–56px | 700 | −0.02em |
| KPI sekunder | Barlow Semi Condensed | 24–28px | 600 | −0.01em |
| Label panel | Inter | 10–11px | 600 | 0.14em, UPPERCASE |
| Body | Inter | 13px | 400/500 | 0 |
| Mikro / kaki | Inter | 11px | 400 | 0 |
| Label pin gedung | Inter | 11px | 600 | 0.01em |

Semua numeral memakai `font-variant-numeric: tabular-nums` agar tidak bergoyang saat nilai berubah.

### 1.4 Krom panel HUD (ciri khas referensi)

Panel dibuat sebagai satu komponen `TwinPanel`:

- Chamfer sudut kiri-atas dan kanan-bawah via `clip-path` (potong 10px).
- Border 1px berwarna aksen @ 22% opasitas.
- Tab judul: blok solid 4×12px aksen + label uppercase + ikon lucide 14px.
- Grid interior sangat tipis (`repeating-linear-gradient`, opasitas 0.04).
- Sudut kanan-atas untuk badge provenance (§9).

---

## 2. Tata Letak

### 2.1 Immersive (`/campus-twin`)

```
┌──────────────────────────────────────────────────────────────┐
│ TOPBAR 56px   mark · konteks tampilan · SIMULATED · clock    │
├────────────┬──────────────────────────────────┬──────────────┤
│  RAIL      │                                  │   RAIL       │
│  KIRI      │      KANVAS ISOMETRIK            │   KANAN      │
│  300px     │      (flex, min 620px)           │   320px      │
│            │                                  │              │
│ Hari Ini   │   [pin gedung]  [legend ↙]        │ Indeks Kerja │
│ Alur Orang │                    [kamera ↘]     │ Alert Aktif  │
│ Alur Kend. │                                  │ Energi & Air │
│ Kesehatan  │                                  │ Tugas Worker │
│  Perangkat │                                  │ Tautan Sistem│
├────────────┴──────────────────────────────────┴──────────────┤
│ DOCK 64px   Baseline│Status│Kepadatan│Alur│Energi│IT│Sec│Skenario│
└──────────────────────────────────────────────────────────────┘
```

Tinggi kanvas = `calc(100vh − 56px − 64px − 32px)`. Rail scroll independen
(`overflow-y-auto`, scrollbar tipis). Kanvas `preserveAspectRatio="xMidYMid meet"`.

### 2.2 Embedded (card di Command Center, kontrak lama)

Hanya: header card + kanvas (rasio 16:10, tinggi min 460px) + popover layer
(ikon roda gigi → dropdown 8 toggle) + `BuildingDetailPanel` sebagai sheet kanan
(lebar 320px, menimpa kanvas, bukan rail permanen). Tidak ada dock/topbar.
**Export `CampusMap` dan signature `{ className }` tidak berubah** → `page.tsx` aman.

### 2.3 Dock — model interaksi (penting, hindari ambigu)

- `Baseline` dan `Skenario` = **mode eksklusif** (radio). Hanya satu aktif.
- `Status`, `Kepadatan`, `Alur`, `Energi`, `IT`, `Sec` = **toggle multi** (checkbox).
- Mode `Skenario` otomatis memaksa `Kepadatan` + `Alur` + `Energi` aktif; saat
  kembali ke `Baseline`, toggle tersebut dilepas.
- Tab aktif: isi solid aksen + teks gelap + bar indikator 2px di tepi atas.
- ≤1280px: label teks disembunyikan, tinggal ikon + tooltip.

---

## 3. Sistem Proyeksi Isometrik

Dunia: meter pada grid kampus 220×220 (x → timur, y → selatan, z → atas).

```
sx = (wx − wy) · KX      KX = 4
sy = (wx + wy) · KY − wz · KZ    KY = 2, KZ = 2.3
```

- `sy` bertambah ke bawah = **mendekati kamera**. Urutan gambar: naikkan `depth = wx + wy`
  (painter's algorithm). Bangunan & pohon di-interleave dalam satu daftar terurut.
- Sisi dinding yang terlihat hanyalah sisi **+x** (kanan) dan **+y** (kiri). Sisi lain tidak digambar.
- viewBox terkalkibrasi untuk denah §4: **`-500 30 1200 780`** (aspek 1.54).
  > ⚠️ `src/lib/isometric.ts` saat ini berisi `'-760 0 1520 830'` — **ganti** ke nilai ini saat implementasi.
- Teks **tidak boleh** ikut transform iso. Pin & label dirender di lapisan HTML
  absolut yang posisinya dihitung dari koordinat proyeksi → teks tajam, fokus
  keyboard, dan `aria` gratis.

---

## 4. Denah Kampus (world meter)

Sumbu utama utara→selatan di x≈109: **Gerbang Utara (y=18) → Plaza Upacara →
Gedung Akademik (landmark) → Kanopi Tengah → Grha Plaza (y=196)**.
Analog "gedung hero + sumbu simetris" pada referensi.

| id | Nama | x | y | w | d | lantai | Kap. harian | Kap. acara | Peran komposisi |
|---|---|---|---|---|---|---|---|---|---|
| `building-A` | Gedung Akademik | 92 | 58 | 34 | 28 | 6 | **140** ▸ | 2,200 | **Landmark**, podium + menara |
| `building-B` | Gedung Admissions | 30 | 34 | 26 | 18 | 3 | **123** ▸ | 750 | kiri-atas tengah |
| `building-C` | Gedung Finance | 152 | 30 | 24 | 18 | 3 | **143** ▸ | 1,100 | kanan-atas |
| `it-operations` | IT Operations | 26 | 104 | 30 | 22 | 4 | fixture | 280 | kiri-bawah, fokus insiden |
| `security-operations` | Security Operations | 156 | 100 | 26 | 20 | 3 | fixture | 240 | kanan-bawah |
| `digital-library` | Digital Library | 88 | 140 | 32 | 20 | 2 | fixture | 1,700 | depan-tengah, aula overflow |
| `quality-assurance` | Quality Assurance | 168 | 150 | 22 | 16 | 2 | fixture | 180 | kanan-depan |

▸ = **DERIVED** dari jumlah `capacity` zona di `src/data/zones.json`
(A: 30+25+40+35+10=140 · B: 50+45+20+8=123 · C: 25+30+40+35+12+1=143). Bukan angka karangan.

Luas terpakai (footprint × lantai × 0.62 faktor inti):
A 3.541 · B 870 · C 804 · IT 1.637 · Sec 967 · Lib 794 · QA 438 m².

### 4.1 Unsur non-gedung

| Unsur | Definisi dunia |
|---|---|
| **Grha Plaza** | lingkaran pusat (109,196) r=26 → 2.124 m²; pola radial + cincin konsentris; panggung kotak 18×8 m di tepi utara |
| **Plaza Gerbang Utara** | kotak 24×12 di (97,14), air mancur lingkaran r=4 |
| **Jalan utama** | lebar 12 m: sumbu N–S x=103..115 (y 18→210); lingkar E–W y=88..100 (x 8→212) |
| **Jalan sekunder** | lebar 8 m: cabang ke B, C, IT, Sec, QA |
| **Jalur pejalan** | lebar 4 m: menghubungkan tiap pintu masuk ke sumbu utama |
| **Taman** | 6 poligon rumput di kuadran; kanopi padat |
| **Kolam refleksi** | elips (60,72) 26×14, gradien + garis pantul tipis |
| **Zona transit & katering** | persegi panjang (12,168) 34×22 di barat-daya |
| **Landmark** | tiang bendera (109,26), monumen (109,120), gazebo (188,64) |

### 4.2 Vegetasi

- 4 varian `<symbol>` pohon (`tree-a`..`tree-d`) = 3 elips tumpang tindih (dasar gelap,
  tengah, sorotan) + batang 1×3 m. Plus `shrub` dan `palm`.
- Sebaran memakai PRNG **berseed tetap** (`mulberry32(0xC0FFEE)`) → hasil identik
  antara SSR dan client, tidak ada hydration mismatch. Jangan `Math.random()`.
- Target: ±180 pohon (baris di sepanjang jalan + rumpun taman), ±60 semak.
- Pohon masuk daftar depth-sort yang sama dengan gedung (kedalaman = x+y).

---

## 5. Resep Render Bangunan (parametrik)

`BuildingSpec`:

```ts
{ id, footprint:{x,y,w,d}, floors, floorHeight=3.6,
  roof:'flat'|'hip'|'gable'|'terraced'|'dome',
  facade:'grid'|'ribbon'|'curtain'|'colonnade',
  material:'concrete'|'brick'|'glass'|'stone',
  crown?:'penthouse'|'tower'|'antenna'|'tank'|'none',
  podium?:{inset:number,h:number},
  entrance?:{edge:'N'|'S'|'E'|'W',offset:number,canopy:boolean},
  backendBuildingId?:string|null }
```

Urutan gambar per gedung (dalam satu `<g depth-sorted>`):

1. **Bayangan kontak** — poligon footprint digeser ke tenggara (matahari tetap dari
   barat-laut), opasitas 0.28 (`Ops`) / 0.16 (`Day`), `feGaussianBlur` stdDeviasi 3.
   Satu filter dipakai bersama lewat `<defs>`; jangan buat filter per gedung.
2. **Dinding** — dua sisi (+x, +y). Tiap sisi = quad (bawahA, bawahB, atasB, atasA)
   dengan gradien vertikal: gelap di dasar (×0.72) → base di 55% → sedikit terang di
   puncak (×1.06). Sisi +y selalu 0.82× lebih gelap dari sisi +x.
3. **Jendela** — `cols = ⌊w/3.2⌋`, `rows = floors`. Ukuran 1.6×1.4 m, gutter rata.
   Kenyalaan per jendela = `hash(id + i + j) % 100 < 18`. Instansikan lewat
   `<pattern>` atau `<use>` — **jangan** buat elemen DOM unik ribuan kali tanpa `<use>`.
4. **Atap** — poligon pada z=h. Parapet 0.4 m sebagai stroke dalam lebih terang.
   Perlengkapan atap 2–4 kotak kecil, posisi deterministik dari `hash(id)`.
   `terraced` = 2–3 undakan dengan strip tanaman.
5. **Mahkota** — `building-A` saja: penthouse 8×6×4 m + antena 12 m + **beacon**
   titik merah yang berdenyut 1.6 s (lampu penerbangan).
6. **Pintu masuk** — ceruk gelap + slab kanopi + tumpahan cahaya hangat +
   3–5 titik "orang" 1.2 m untuk skala manusia. Skala manusia wajib: tanpa itu
   bangunan terbaca sebagai mainan.
7. **Rim light** (khusus `Ops`, landmark saja) — stroke 1px aksen @ 40% di tepi atas atap.

Variasi material mengubah base hex + pola fasad, bukan struktur gambar.

---

## 6. Enam Lapisan Visual

Syarat mutlak: **menyalakan lapisan harus mengubah kanvas**, bukan hanya label.

| # | Lapisan | Encoding | Sumber nilai |
|---|---|---|---|
| 1 | **Status operasional** | Tint atap + cincin denyut di dasar + warna pin. Kritis denyut 1.2 s, lain 2.4 s. | `campusTwin.ts` `status` |
| 2 | **Kepadatan** | Cakram gradien radial di tanah, radius ∝ √(okupansi/kapasitas). Hijau→amber >0.60→merah >0.85. Opasitas maks 0.55, blend `screen` (Ops) / `multiply` (Day). | okupansi dasar / output skenario |
| 3 | **Alur pejalan** | Kurva Bézier antar pintu masuk; tebal 2–10 px ∝ pax/menit; garis putus-putus beranimasi + partikel. Segmen macet → amber/merah + denyut lambat. | matriks OD §8.3 |
| 4 | **Energi** | Kolom cahaya dari atap, tinggi ∝ kW; badge kW; >85% alokasi → rim merah + pin petir. | §8.4 |
| 5 | **Insiden IT/jaringan** | Kerucut cakupan AP di tanah; AP offline = lingkaran **berlubang** merah + riak melebar; garis hubung perangkat terdampak → IT Operations. | `devices.json`, `incidents.json` |
| 6 | **Insiden keamanan** | Poligon bahaya dengan pola arsir diagonal; pin insiden berriak; irisan FOV kamera. | fixture (label `SYNTHETIC FIXTURE`) |

**Legenda** (kiri-bawah kanvas): kontekstual, hanya menampilkan lapisan aktif.
Lapisan kontinu (2,4) wajib menampilkan skala numerik, bukan cuma nama warna.

**Aturan aksesibilitas warna**: rasio jangan pernah jadi satu-satunya penanda.
Kritis = glif segitiga, offline = bentuk berlubang, maintenance = glif kunci.
Aman untuk deuteranopia/protanopia karena bentuk+glif membedakan meski hue kabur.

---

## 7. Kontrol Kamera & Interaksi

| Input | Efek |
|---|---|
| Roda | Zoom 0.6×–3.2×, berlabuh ke posisi kursor |
| Geser (drag) | Pan |
| Klik gedung | Pilih → `BuildingDetailPanel`; kamera ease 600 ms `cubic-bezier(.22,1,.36,1)` |
| Klik ganda | Zoom-to gedung (1.8×) |
| `Esc` | Batal pilih |
| `[` `]` | Gedung sebelumnya / berikutnya |
| `0` | Reset tampilan |
| `1`–`6` | Toggle lapisan |
| `L` | Buka popover/dock lapisan |
| `T` | Ganti Day/Ops |

Perangkat: tombol `+` `−` `⟲ reset` `⤢ fullscreen` di kanan-bawah kanvas;
kompas + skala batang (mis. "50 m") di kiri-atas kanvas — sentuhan kartografis murah
yang menaikkan kesan kredibel.

**Hover**: angkat gedung 3 px + terangkan atap ×1.12 + tampil label nama.
**Terpilih**: ring aksen 2px + halo + pin membesar + gedung lain turunkan opasitas 0.72.

---

## 8. Simulator Skenario Wisuda

### 8.1 Prinsip

- 39.000 peserta **tidak** menempati kampus serentak dan **tidak** tersebar seragam.
- Asumsi distribusi dinyatakan eksplisit dan bisa dibaca user (§8.3).
- Koefisien **harus** tetap memakai `simulateEvent()` yang sudah ada
  (`src/data/eventSimulation.ts`) agar angka `EventPlanningWorkspace` tidak berubah makna.
  Alokasi per gedung adalah **partisi** dari agregat, sehingga total selalu cocok.

### 8.2 Rantai kalkulasi (baseline fixture)

```
attendance            39,000
× concurrency 0.46    → 17,940 serentak
÷ event capacity 15,350 → 116.9 %  ⟵ MERAH: kampus tidak muat satu sesi
peakPowerKw  17,940×0.12 + 39,000×0.01 + 3×85 = 2,805 kW   (87.7 % dari 3,200)
energyKwh    2,805×6×0.72 = 12,118 kWh
networkDem   17,940×0.18 + 39,000×0.01 = 3,619 Mbps        (72.4 % dari 5,000)
```

> Insight jaringan (harus muncul di panel): bottleneck **bukan** uplink 5,000 Mbps,
> melainkan sisi akses. `devices.json` punya **9 AP**, satu offline (`device-AP-A2-02`)
> → 8 AP aktif × 200 Mbps efektif = **1,600 Mbps** vs perlu 3,619 → kurang 2,019
> → **tambah 11 AP temporer**. Ini contoh sempurna "fakta dari tool, inferensi oleh AI".

### 8.3 Bobot distribusi (bukan seragam)

| Zona | Bobot | Serentak | Kap. acara | Beban | Status |
|---|---|---|---|---|---|
| Grha Plaza | 53 % | 9,508 | 7,800 | 121.9 % | 🔴 |
| Gedung Akademik | 14 % | 2,512 | 2,200 | 114.2 % | 🔴 |
| Digital Library | 10 % | 1,794 | 1,700 | 105.5 % | 🔴 |
| Zona transit & katering | 8 % | 1,435 | 1,100 | 130.5 % | 🔴 |
| Gedung Admissions | 6 % | 1,076 | 750 | 143.5 % | 🔴 |
| Gedung Finance | 5 % | 897 | 1,100 | 81.5 % | 🟠 |
| IT Operations | 2 % | 359 | 280 | 128.2 % | 🔴 |
| Security Operations | 1.5 % | 269 | 240 | 112.1 % | 🔴 |
| Quality Assurance | 0.5 % | 90 | 180 | 50.0 % | 🟢 |

Ambang: ≤80 % normal · 80–100 % perhatian · >100 % kelebihan · >130 % kritis.
Densitas berdiri: >2.5 pax/m² padat · >4 pax/m² risiko desakan.

**Rekomendasi utama yang harus muncul:** bagi jadi **3 sesi × 13.000**
→ serentak 5,980 → beban 39 % → semua zona hijau. Ditambah mitigasi titik
(registrasi Admissions, antrean transit, penambahan AP).

### 8.4 Kontrol konsol

Slider: total attendance (0–60k) · faktor konkuren (0.2–1.0) · durasi jam ·
ketersediaan gedung (checkbox per gedung, membebani ulang bobot secara
proporsional) · kondisi lingkungan (cerah / hujan / panas — menggeser
`concurrency` dan beban HVAC ±12 %) · jumlah sesi (1–4).

### 8.5 Tampilan skenario di kanvas

Panggung + kisi kursi tergambar di Grha Plaza; tenda medis & pos keamanan;
antrean transit di jalan selatan; cakram kepadatan memerah; panah alur
konvergen ke plaza; pin peringatan di gedung >100 %; sapuan radial 900 ms
dari plaza saat skenario dijalankan.

### 8.6 Ringkasan skenario (wajib 5 bagian)

`Situasi kini` · `Risiko terprediksi` · `Tindakan disarankan` ·
`Dampak diharapkan` · `Asumsi & keyakinan`.
Bagian kelima menyebut eksplisit: *formula deterministik, data sintetis,
bukan telemetri live, bukan jaminan keselamatan.*

---

## 9. Sistem Provenance (kejujuran data)

Setiap metrik punya akses provenance (titik supersrip atau ⓘ → popover):

| Kelas | Arti | Warna chip |
|---|---|---|
| `DERIVED` | dihitung deterministik dari dataset sintetis | biru |
| `ESTIMATED` | hasil formula simulator | amber |
| `SYNTHETIC FIXTURE` | dekorasi narasi demo, tanpa sumber data | ungu |
| `NOT CONNECTED` | sistem nyata belum terhubung | abu-abu, tombol lumpuh |

Popover menampilkan: **Sumber · Metode · Keyakinan · Diperbarui**.

Banner `SIMULATED ENVIRONMENT` selalu terlihat di topbar mode Immersive;
chip kecil di header mode Embedded. Ini memenuhi AGENTS.md #4 dan #6, dan
sekaligus menjadi pembeda dari referensi yang menampilkan angka seolah live.

---

## 10. Rekonsiliasi Frontend ↔ Backend

| ID twin | `backendBuildingId` | Konsekuensi |
|---|---|---|
| `building-A` | `building-A` | perangkat + insiden + kapasitas **DERIVED** |
| `building-B` | `building-B` | **DERIVED** |
| `building-C` | `building-C` | **DERIVED** |
| `it-operations` | `null` | **SYNTHETIC FIXTURE** |
| `security-operations` | `null` | **SYNTHETIC FIXTURE** |
| `digital-library` | `null` | **SYNTHETIC FIXTURE** |
| `quality-assurance` | `null` | **SYNTHETIC FIXTURE** |

Nilai turunan yang bisa diverifikasi coder saat implementasi:

| Metrik | Rumus | Hasil benar |
|---|---|---|
| Total perangkat | `devices.json` | **25** |
| Online / offline / maintenance | field `status` | **23 / 1 / 1** |
| Uptime ketat | online ÷ total | **92.0 %** |
| Uptime berbobot | (online + 0.5·maint) ÷ total | **94.0 %** |
| Jumlah AP | `type == access-point` | **9** (1 offline) |
| Insiden total | `incidents.json` | **12** |
| Insiden aktif | open 4 + investigating 3 + maintenance 1 | **8** |
| Insiden building-A | zona A1(2) A2(2) A3(1) | **5** |
| Insiden building-B | zona B1(1) B2(1) | **2** |
| Insiden building-C | zona C1(1) C2(2) | **3** |
| Perangkat building-A / B / C / D | | **11 / 3 / 8 / 3** |
| Zona / gedung backend | | **18 / 4** |

`src/data/campusTwin.ts` **tidak diubah** (dipakai teammate). Metadata operasional
baru hidup di `campusTwinExtended.ts` dan digabungkan lewat `id`.

---

## 11. Rail Kiri — "Hari Ini di Kampus"

1. **KPI ganda** — Sedang di kampus (okupansi dasar, `SYNTHETIC FIXTURE`) +
   Kapasitas total (Σ kapasitas DERIVED + fixture). Analog 14,242 / 15,183 referensi.
2. **Alur orang 24 jam** — `recharts` LineChart (dependensi sudah ada). Data fixture,
   chip `SYNTHETIC FIXTURE`.
3. **Alur kendaraan** — AreaChart, sama.
4. **Kesehatan perangkat** — donut **DERIVED** dari §10 (92.0 % / 94.0 %) + rincian
   23 online · 1 maintenance · 1 offline. Ini panel paling kredibel di seluruh UI
   karena angkanya benar-benar dihitung, bukan dihias.

## 12. Rail Kanan — "Intelijen Otonom"

1. **Indeks Worker** — radar 5 sumbu (Ketersediaan · Jaringan · Energi · Keamanan ·
   Lingkungan). Analog heksagon 管理指数 referensi. Tiap sumbu = skor keyakinan worker.
2. **Alert Aktif** — hitungan besar (analog "003") + baris tabel
   `ID · Zona · Jenis · Severitas`. Klik → fokus gedung + buka inspector.
3. **Energi & Air** — dua blok KPI + sparkline. Mode skenario menampilkan
   `peakPowerKw` / `energyKwh` §8.2 dengan chip `ESTIMATED`.
4. **Umpan Tugas** — langkah LangGraph nyata dari `GET /api/history`
   (id, step, status, sumber). **Inilah yang tidak dimiliki referensi dan menjadi
   inti DinusNexus.**
5. **Tautan Sistem** — Knowledge Base · Audit Logs · Token Usage · Approvals ·
   Classroom · UPS · Fire · Access. Empat terakhir `NOT CONNECTED` (lumpuh + tooltip).

---

## 13. Panel Detail Gedung

Saat gedung diklik (sheet kanan 320px Immersive / overlay Embedded):

```
nama + fungsi · chip status · chip provenance
────────────────────────────────────────
Okupansi        87 / 140   ▓▓▓▓▓░░░ 62 %   DERIVED
Kapasitas       140 (Σ zona)                DERIVED
Energi          41 kW · 87 % alokasi        ESTIMATED
Jaringan        9 AP · 8 aktif · 1 offline  DERIVED
Insiden IT      5 aktif  (rincian dapat dibuka)  DERIVED
Insiden Keamanan  0      —                  SYNTHETIC FIXTURE
────────────────────────────────────────
Worker terkait  [IT Helpdesk ●aktif] [Network Ops ○planned]
Rekomendasi     1. Verifikasi AP-A2-02     [Buat task]  ← nyata
                2. Tinjau alokasi daya     [Butuh approval] ← lumpuh
                3. Deploy 11 AP temporer   [Worker belum tersedia] ← lumpuh
────────────────────────────────────────
kaki: "Bangunan & koordinat ini fixture visual sintetis.
       Status workflow berasal dari backend."
```

Aturan tombol: **hanya IT Helpdesk** yang punya backend → `[Buat task]` memanggil
`POST /api/tasks {worker:'it_helpdesk', description, location, device_type}` yang
sudah ada. Worker lain → chip `PLANNED` + tooltip jujur, **tanpa** spinner palsu.
Tindakan mengubah keadaan tetap lewat gerbang approval; karena backend belum
menyediakannya, tombol lumpuh dengan salinan yang menjelaskan.

---

## 14. State

| State | Tampilan |
|---|---|
| Loading | Skeleton kanvas bertahap: tanah → jalan → pohon → gedung → label; shimmer halus |
| Empty | Kanvas tenang + pesan "Belum ada insiden aktif pada lapisan ini" |
| Error | Banner merah + Retry; kanvas tetap render dari fixture (degradasi anggun) |
| Simulating | Sapuan progres dari plaza; persen berasal dari etape hitung nyata, bukan animasi lepas |
| Offline backend | Banner "Mode offline: hanya fixture, pembuatan task dinonaktifkan"; lapisan DERIVED turun ke fixture dengan chip berubah |

---

## 15. Inventaris Gerak (tiap gerak harus bermakna)

| Gerak | Durasi | Makna |
|---|---|---|
| Denyut beacon landmark | 1.6 s ∞ | gedung kritis/aktif |
| Cincin status | 2.4 s (kritis 1.2 s) ∞ | status operasional |
| Dash alur pejalan | ∝ pax/menit | volume pergerakan |
| Napas cakram panas | 6 s ±4 % | zona kepadatan tinggi |
| Pin drop-in | stagger 40 ms | orientasi awal |
| Kamera ease ke gedung | 600 ms | respons seleksi |
| Sapuan skenario | 900 ms | recomputation selesai |
| Angka naik-turun | 400 ms | nilai berubah (tabular-nums) |

Semua dihormati `prefers-reduced-motion` (fallback: transisi opasitas instan).
Loop rAF tunggal dan bersama; jeda saat `document.hidden`.

---

## 16. Responsif

| Lebar | Perilaku |
|---|---|
| ≥1440 | Immersive penuh, rail 300/320, dock berlabel |
| 1024–1439 | rail 260/280, dock ikon + tooltip |
| 768–1023 | rail jadi slide-over; kanvas lebar penuh |
| 560–767 | Embedded only; kanvas 4:3; inspector bottom-sheet; layer chip row scroll horizontal |
| <560 | kanvas 1:1, pin label disembunyikan (tinggal glif), legenda kolaps |

Kemampuan inti **tidak boleh hilang** di lebar berapa pun: pilih gedung, lihat detail,
ganti lapisan, jalankan skenario. (Aturan `docs/UI_UX.md`.)

---

## 17. Performa SVG

- `<symbol>` + `<use>` untuk pohon, jendela, tiang lampu, orang.
- Lapisan statis (`CampusGround`, `RoadNetwork`, `Vegetation`, `BuildingMesh`) dibungkus
  `React.memo` dengan kunci stabil; tidak re-render saat zoom/pan (zoom = transform
  pada `<g>` induk, bukan re-proyeksi).
- Filter blur **satu instance** di `<defs>`, dipakai bersama; jangan filter pada node beranimasi.
- Partikel ≤ 120; pohon ≤ 260 total; jendela via pattern, bukan DOM unik.
- Koordinat proyeksi dihitung sekali saat mount, disimpan, bukan per frame.
- `shape-rendering="geometricPrecision"` pada gedung, `crispEdges` pada jalan.

---

## 18. Peta Modul

```
src/lib/isometric.ts            ADA — ganti CAMPUS_VIEWBOX jadi '-500 30 1200 780'
src/lib/campusPalette.ts        BARU  token day/ops (§1)
src/lib/prng.ts                 BARU  mulberry32 + hash string (deterministik)
src/lib/deriveMetrics.ts        BARU  kalkulasi §10 dari dataset
src/lib/scenarioModel.ts        BARU  bobot §8, alokasi partisi, risiko, workerActions
src/data/campusGeometry.ts      BARU  BuildingSpec[], jalan, pohon, plaza, landmark (§4–5)
src/data/campusTwinExtended.ts  BARU  metadata operasional + backendBuildingId (§10)

src/components/campus-twin/
  IsometricCanvas.tsx        kanvas, zoom/pan, depth sort, seleksi
  BuildingMesh.tsx           §5 langkah 1–7
  CampusGround.tsx           pelat tanah, taman, kolam, tekstur
  RoadNetwork.tsx            §4.1 jalan + marka + zebra cross
  Vegetation.tsx             §4.2 sebaran seeded
  Plaza.tsx                  Grha Plaza + panggung (mode skenario)
  EntityLayer.tsx            interleaving kedalaman gedung+pohon
  layers/StatusLayer.tsx  DensityLayer.tsx  FlowLayer.tsx
          EnergyLayer.tsx  ItIncidentLayer.tsx  SecurityLayer.tsx
  BuildingPins.tsx           HTML overlay, tombol fokus, aria
  LayerDock.tsx  Legend.tsx  CameraControls.tsx
  TwinPanel.tsx  MetricRail.tsx  IntelRail.tsx  TwinTopBar.tsx
  BuildingDetailPanel.tsx    §13
  ScenarioConsole.tsx        §8.4–8.6
  ProvenanceChip.tsx         §9
  CampusTwinView.tsx         orkestrator Immersive
  CampusMap.tsx              ADA → bungkus Embedded (export & props tetap)

src/hooks/useCamera.ts  useCampusLayers.ts  useScenario.ts  useReducedMotion.ts
src/app/campus-twin/page.tsx   BARU  route Immersive
```

---

## 19. Definisi Selesai

- [ ] Kanvas isometrik berbanguan: dinding dua sisi, atap, jendela, pintu, bayangan,
      skala manusia, kanopi pohon, jalan bermarka, plaza radial, landmark.
      **Bukan** kartu persegi di atas latar hijau.
- [ ] Gedung klik → panel detail dengan angka terverifikasi §10.
- [ ] 8 tab dock berfungsi; menyalakan lapisan visibly mengubah kanvas.
- [ ] Legenda kontekstual + skala numerik untuk lapisan kontinu.
- [ ] Zoom, pan, reset, kompás, skala batang, navigasi keyboard penuh.
- [ ] Skenario wisuda: bobot §8.3, beban 116.9 % merah, rekomendasi 3 sesi,
      insight 11 AP, tampil di peta (panas + alur + peringatan + panggung).
- [ ] Ringkasan 5 bagian termasuk asumsi & keyakinan.
- [ ] Rekomendasi IT Helpdesk benar-benar memanggil `POST /api/tasks`;
      worker lain berlabel `PLANNED` tanpa spinner palsu.
- [ ] Provenance chip di setiap metrik; banner `SIMULATED ENVIRONMENT`.
- [ ] Mode `Day` dan `Ops` berganti tanpa mengubah geometry.
- [ ] `campusTwin.ts`, `eventSimulation.ts`, `page.tsx`, kontrak API tidak rusak.
- [ ] `npm run lint` · `npx tsc --noEmit` · `npm run build` bersih.
- [ ] `prefers-reduced-motion` dihormati; kontras teks ≥4.5:1 di kedua mode.

---

## 20. Urutan Implementasi yang Disarankan

1. `campusPalette` + `prng` + kalibrasi viewBox → render pelat tanah & grid, pastikan proyeksi benar.
2. `RoadNetwork` + `CampusGround` + `Plaza` (denah terbaca, belum ada gedung).
3. `BuildingMesh` untuk **satu** gedung sampai §5 terlihat meyakinkan; baru duplikasi ke 7.
4. `Vegetation` seeded + `EntityLayer` depth sort.
5. `BuildingPins` (HTML) + seleksi + `useCamera` (zoom/pan/reset).
6. `BuildingDetailPanel` + `deriveMetrics` (§10 harus cocok angka tabel).
7. `TwinPanel` + rail kiri/kanan + `TwinTopBar` + dock → kerangka Immersive.
8. Enam lapisan, satu per satu, verifikasi visibly mengubah kanvas.
9. `scenarioModel` + `ScenarioConsole` + render skenario di peta.
10. Integrasi `POST /api/tasks` + provenance + state error/offline.
11. Mode `Day`, responsif, a11y, optimasi performa.
12. Bungkus `CampusMap` Embedded → jalankan tiga perintah cek (§19).
