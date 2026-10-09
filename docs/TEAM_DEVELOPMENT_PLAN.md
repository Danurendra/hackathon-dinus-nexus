# Rencana Development Paralel Tim — DinusNexus

## Tujuan dokumen

Dokumen ini menerjemahkan baseline produk DinusNexus menjadi rencana kerja paralel untuk **tiga orang anggota tim**. Rencana ini melengkapi [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md), bukan menggantikan keputusan arsitektur, scope, keamanan, atau workflow yang sudah tercatat di dokumen lain.

Status dokumen: **PROPOSED**  
Tanggal penyusunan: 2026-10-09  
Target utama: demo prototype IT Helpdesk end-to-end yang dapat diuji dari input baru sampai hasil dan history.

## Target bersama

Pada akhir timebox, tim menargetkan satu alur berikut berjalan dan dapat dibuktikan:

1. Pengguna mengirim laporan insiden baru melalui Unified Workspace.
2. Backend membuat `task_id` dan `task_run`, lalu menyimpan status setiap step.
3. Workflow mengambil minimal satu data/tool di luar LLM.
4. Hasil memisahkan fakta/evidence, interpretasi, ketidakpastian, dan rekomendasi.
5. UI menampilkan execution timeline, sumber, error, dan status aktual dari backend.
6. Hasil serta history tetap tersedia setelah refresh.
7. Tindakan sensitif berhenti pada approval manusia; tidak ada klaim integrasi live yang belum terbukti.
8. Data demo/simulasi diberi label `SIMULATED DATA` atau `DEMO DATA`.

Fitur role lain dan Campus Twin 2D dikerjakan setelah jalur IT Helpdesk stabil atau hanya jika tidak mengganggu target demo.

## Pembagian role tiga orang

Nama anggota bersifat `TBD`; gunakan nama GitHub aktual setelah tim menyepakatinya.

| Role | Tanggung jawab utama | Deliverable utama | Tidak boleh menjadi bottleneck |
|---|---|---|---|
| **Anggota A — Product & Frontend Lead** | Unified Workspace, chat/input baru, upload UX, execution inspector, result/history, state UI, accessibility | UI yang memanggil kontrak API, menampilkan state nyata, error/loading/empty state, dan history setelah refresh | Menggunakan mock lokal sebagai pengganti kontrak backend setelah API skeleton tersedia |
| **Anggota B — Backend & Workflow Lead** | API, task/run/step state machine, IT Helpdesk orchestration, tool registry, evidence, failure/approval state | Endpoint tervalidasi, workflow Helpdesk end-to-end, persistence, tool data sintetis berlabel, error aman | Menunggu UI selesai; kontrak API dipublikasikan lebih awal dengan fixture |
| **Anggota C — Data, Quality & Delivery Lead** | Dataset/tool adapter, LLM provider adapter, test strategy, security checks, token metrics, Azure/CI readiness | Fixture dan tool terstruktur, provider adapter configurable, test case, CI checks, smoke test, deployment/fallback plan | Mengambil keputusan stack/provider yang masih `TBD` tanpa verifikasi atau approval |

### Tanggung jawab bersama

- Semua anggota membaca [`AGENTS.md`](../AGENTS.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md), dan dokumen scope terkait sebelum coding.
- Tidak ada secret, data pribadi nyata, atau credential cloud di repository.
- Perubahan lintas area harus dibahas sebelum dikerjakan; hindari mengubah file yang sama secara bersamaan.
- Setiap anggota wajib menulis hasil test aktual pada PR dan memperbarui dokumentasi jika kontrak/perilaku berubah.
- Review silang minimal satu orang sebelum merge; untuk perubahan keamanan, persistence, approval, atau deployment, minta review Anggota C.

## Kontrak antarmuka sebelum implementasi paralel

Backend harus menerbitkan kontrak awal paling lambat setelah fase audit. Kontrak boleh berupa DTO/schema sesuai stack aktual, tetapi minimal memuat:

```text
CreateTaskInput
  worker: "it_helpdesk"
  description: string
  location?: string
  device_type?: string
  attachments?: file_id[]

TaskSummary
  task_id: string
  run_id: string
  worker: string
  status: queued | running | waiting_for_approval | completed | failed | cancelled
  created_at: timestamp

ExecutionStep
  step_id: string
  name: string
  status: queued | running | completed | failed | skipped | retrying
  source_ids?: string[]
  error_code?: string
  started_at?: timestamp
  completed_at?: timestamp

TaskResult
  facts: item[]
  interpretation: item[]
  uncertainty: item[]
  recommendations: item[]
  evidence: Evidence[]
  approval?: ApprovalRequest
```

Detail field, endpoint, transport realtime, dan database tetap **TBD** sampai audit repository selesai. Perubahan kontrak harus melalui PR yang menyertakan dampak ke frontend, backend, fixture, dan test.

## Fase kerja paralel

Urutan ini memakai dependency minimum sehingga setiap anggota dapat mulai dengan fixture/kontrak, bukan menunggu implementasi penuh anggota lain.

### Fase 0 — Kickoff dan audit bersama

**Output gate:** semua anggota memahami scope, stack aktual, branch strategy, dan daftar TBD.

- A: audit UI, routing, komponen reusable, command build/test.
- B: audit API/backend, persistence, konfigurasi environment, task model.
- C: audit package/lock, test/lint/CI, secret handling, Azure dan organizer API.
- Bersama: catat hasil audit pada issue GitHub; jangan mengubah stack sebelum diverifikasi.

### Fase 1 — Foundation paralel

**Anggota A**

- Buat shell Unified Workspace dan navigasi minimal.
- Buat state UI untuk idle, submitting, running, success, partial, approval, failed.
- Integrasikan fixture `TaskSummary`, `ExecutionStep`, dan `TaskResult`.

**Anggota B**

- Implementasikan task/run/step persistence dan state transition.
- Sediakan endpoint create task, get task/run, get history.
- Implementasikan workflow skeleton dengan step yang dapat dilacak.

**Anggota C**

- Siapkan dataset sintetis gedung/zona/perangkat/insiden.
- Implementasikan tool adapter read-only dengan source ID, timestamp, dan label simulasi.
- Siapkan provider adapter configurable; jika detail provider belum tersedia, gunakan fake provider untuk test tanpa mengklaim integrasi nyata.
- Tambahkan test fixture untuk input valid, input kosong, tool failure, dan provider failure.

**Output gate:** UI dapat menampilkan fixture dan API dapat mengembalikan state minimal tanpa secret.

### Fase 2 — Integrasi IT Helpdesk

**Anggota A**

- Hubungkan form/chat ke create-task endpoint.
- Tampilkan task ID, timeline step, evidence, result, dan retry/error state.
- Pastikan refresh memuat ulang data dari backend, bukan state memory saja.

**Anggota B**

- Hubungkan workflow ke tool perangkat/lokasi dan histori insiden.
- Simpan evidence tiap tool dan hasil partial bila sebagian step gagal.
- Tambahkan approval gate untuk tindakan berdampak; default prototype adalah rekomendasi, bukan eksekusi otomatis.

**Anggota C**

- Validasi schema dan sanitasi input/file di sisi server bersama Anggota B.
- Tambahkan provider usage/latency/token capture jika metadata benar-benar tersedia; bila tidak, tampilkan `unavailable`.
- Tambahkan integration test dan verifikasi tidak ada secret/data pribadi pada log.

**Output gate:** satu laporan baru mengalir dari UI → API → workflow/tool → evidence/result → history.

### Fase 3 — Hardening, Campus Twin, dan delivery

**Anggota A**

- Tambahkan tampilan Campus Twin 2D minimal hanya dari dataset aktif.
- Tampilkan badge simulasi dan tautkan device/location ke incident jika relasinya valid.
- Periksa keyboard focus, label form, kontras, dan responsive layout.

**Anggota B**

- Perbaiki timeout, retry terbatas, cancellation, dan reconnect/polling sesuai kemampuan stack.
- Pastikan status `failed` tidak menghasilkan hasil seolah-olah sukses.
- Tambahkan audit event untuk task, tool, approval, dan error.

**Anggota C**

- Konfigurasi GitHub Actions untuk lint, type-check, unit/integration test, dan build.
- Siapkan smoke test deployment serta estimasi Azure; jangan membuat resource berbayar tanpa persetujuan.
- Siapkan fallback localhost/video demo dan checklist teardown.

**Output gate:** demo rehearsal lulus dengan input baru, satu failure case, refresh history, evidence, dan label data simulasi.

## Strategi GitHub

### Repository dan proteksi branch

- `main` adalah branch stabil; aktifkan branch protection dan larang direct push.
- Wajib status check CI sebelum merge.
- Aktifkan CODEOWNERS jika repository mengizinkan.
- Gunakan GitHub Issues untuk pekerjaan terukur, GitHub Projects untuk board/status, Pull Request untuk review, dan GitHub Actions untuk pemeriksaan otomatis.

### Branch per pekerjaan

Branch dibuat dari `main` terbaru dan hanya memuat satu tujuan:

```text
feat/workspace-shell
feat/helpdesk-state-machine
feat/synthetic-helpdesk-tool
test/helpdesk-failure-path
chore/ci-checks
docs/team-development-plan
```

Jangan memakai branch bersama seperti `anggota-a` atau `update`. Rebase/merge dari `main` dilakukan sebelum PR bila branch tertinggal jauh; jangan force-push branch yang sedang dipakai orang lain.

### Issue dan Project board

Buat satu GitHub Issue untuk setiap deliverable yang dapat selesai. Gunakan label:

- `area:frontend`, `area:backend`, `area:data`, `area:qa`, `area:docs`, `area:deployment`
- `priority:p0`, `priority:p1`, `priority:p2`
- `status:blocked`, `status:needs-decision`
- `type:feature`, `type:bug`, `type:test`, `type:chore`

Kolom Project yang disarankan:

`Backlog` → `Ready` → `In Progress` → `Review` → `Blocked` → `Done`

Issue minimal memiliki tujuan, acceptance criteria, owner, dependency, dan cara verifikasi. Jika ada keputusan `TBD`, buat issue `status:needs-decision` dan tautkan ke `DECISIONS.md`.

### Pull Request

Judul PR mengikuti Conventional Commits, misalnya `feat: persist helpdesk task steps`.

Template PR minimal:

- Ringkasan dan issue terkait (`Closes #...` bila tepat).
- Scope dan file utama.
- Kontrak API/schema yang berubah.
- Cara test dan output aktual.
- Screenshot/video untuk perubahan UI.
- Dampak keamanan, secret, data simulasi, dan approval.
- Dokumentasi yang diperbarui.
- Risiko dan langkah rollback/fallback.

Aturan merge:

1. PR kecil dan satu tujuan.
2. Minimal satu reviewer selain author.
3. CI wajib lulus.
4. Konflik diselesaikan dengan memahami kedua sisi.
5. Merge ke `main` hanya setelah acceptance criteria terpenuhi.
6. Setelah merge, hapus branch fitur dan pindahkan Issue ke `Done`.

## Jadwal dan checkpoint

Gunakan durasi relatif agar tetap berlaku terhadap deadline hackathon yang belum tercantum.

| Checkpoint | Target | Bukti yang harus ada |
|---|---|---|
| C0 — selesai kickoff | Audit dan pembagian ownership selesai | GitHub Issues, Project board, daftar TBD |
| C1 — foundation | Kontrak dan skeleton UI/API tersedia | PR A/B/C, fixture, CI dasar |
| C2 — vertical slice | Happy path Helpdesk berjalan | PR integrasi, task/run/step tersimpan |
| C3 — hardening | Failure path, evidence, refresh history, security check | Test report dan screenshot |
| C4 — freeze | Kandidat demo tidak berubah tanpa review | Tag/release candidate, video backup |
| C5 — submission | Demo dan dokumentasi final | Commit final, deployment/fallback checklist |

Jika waktu menyempit, hentikan pekerjaan P1/P2 terlebih dahulu. Jangan mengorbankan happy path IT Helpdesk, evidence, persistence, failure state, atau secret safety demi menambah role.

## Risiko dan mitigasi

| Risiko | Dampak | Mitigasi | Owner |
|---|---|---|---|
| Stack atau provider API belum terverifikasi | Rework dan integrasi gagal | Audit lebih dulu; gunakan adapter dan fake provider pada test | B + C |
| Perubahan kontrak memblokir frontend | Integrasi terlambat | Publikasikan schema awal dan fixture; perubahan lewat PR | B |
| Tool/data demo dianggap live | Klaim produk menyesatkan | Badge `SIMULATED DATA`, source metadata, disclosure README | C |
| Workflow menghasilkan diagnosis tanpa bukti | Keputusan tidak dapat dipercaya | Evidence wajib, uncertainty eksplisit, partial/failure state | B |
| Secret masuk log atau client bundle | Insiden keamanan | Environment variable, redaction, CI secret scan, review C | C |
| Azure menambah biaya atau risiko demo | Deployment gagal/biaya tak terduga | Localhost fallback, estimasi biaya, approval resource, teardown plan | C |
| Konflik file antaranggota | Integrasi lambat | Ownership per area, PR kecil, koordinasi sebelum file lintas area diubah | Semua |

## Definition of Done tim

Pekerjaan dinyatakan selesai hanya jika:

- acceptance criteria Issue terpenuhi;
- implementasi dan test relevan tersedia, bukan hanya mock yang tidak diberi label;
- input, loading, empty, success, partial, approval, dan failure state ditangani sesuai konteks;
- output yang bergantung pada tool memiliki evidence/source;
- state penting bertahan setelah refresh;
- tidak ada secret atau data pribadi nyata pada diff, log, fixture, atau screenshot;
- CI dan pemeriksaan lokal yang relevan lulus;
- dokumentasi terkait diperbarui;
- PR telah direview dan merge ke `main`.

## Pembagian ownership setelah merge

Ownership bukan berarti hanya satu orang yang boleh memperbaiki area tersebut. Pemilik bertugas menjaga konsistensi dan menjadi reviewer utama:

| Area | Primary | Backup |
|---|---|---|
| Workspace, chat, inspector, Campus Twin UI | A | C |
| API, state machine, persistence, approval | B | A |
| Dataset, tool adapter, provider, CI, security, deployment | C | B |
| README, decision register, demo disclosure | C | A |

Perubahan kebijakan produk atau keputusan yang berstatus `TBD` tetap membutuhkan persetujuan tim dan pembaruan [`DECISIONS.md`](DECISIONS.md), bukan keputusan sepihak pemilik area.
