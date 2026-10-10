"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ClipboardList,
  FileSearch,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import zones from "../../../../src/data/zones.json";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useDemoAccess } from "@/hooks/useDemoAccess";
import {
  analysisLabel,
  createIncident,
  decideOperation,
  loadOperationHistory,
  loadOperationRuns,
  OperationsApiError,
  validateIncident,
  type IncidentInput,
  type OperationStatus,
  type OperationStep,
  type OperationTask,
} from "@/lib/operationsApi";

const statusLabels: Record<OperationStatus, string> = {
  queued: "Antrean",
  running: "Berjalan",
  completed: "Selesai",
  failed: "Gagal",
  waiting_for_approval: "Menunggu approval",
  cancelled: "Dibatalkan",
};
const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60";
const emptyInput: IncidentInput = {
  description: "",
  location: "",
  device_type: "",
  requested_action: "",
};

export function IncidentOperations() {
  const hasApiKey = useDemoAccess();
  const [input, setInput] = useState(emptyInput);
  const [tasks, setTasks] = useState<OperationTask[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [historyError, setHistoryError] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | OperationStatus>("all");
  const [note, setNote] = useState("");
  const [trace, setTrace] = useState<{
    taskId: string;
    steps: OperationStep[];
  }>();
  const [traceError, setTraceError] = useState<string>();
  const [traceLoading, setTraceLoading] = useState(false);
  const requestLock = useRef(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setHistoryError(undefined);
    try {
      const items = await loadOperationHistory(signal);
      if (!signal?.aborted) setTasks(items);
    } catch (reason) {
      if (!signal?.aborted)
        setHistoryError(
          reason instanceof Error ? reason.message : "Riwayat gagal dimuat.",
        );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      tasks.filter(
        (task) =>
          (status === "all" || task.status === status) &&
          `${task.description} ${task.task_id} ${task.location ?? ""}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [tasks, status, query],
  );
  const selected =
    filtered.find((task) => task.task_id === selectedId) ?? filtered[0];

  useEffect(() => {
    setTrace(undefined);
    setTraceError(undefined);
    setNote("");
    if (!selected) {
      setTraceLoading(false);
      return;
    }
    const controller = new AbortController();
    const taskId = selected.task_id;
    setTraceLoading(true);
    void loadOperationRuns(taskId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          const run = data.items.find(
            (item) => item.run_id === selected.run_id,
          );
          if (run) setTrace({ taskId, steps: run.steps });
          else
            setTraceError(
              "Run ternormalisasi belum tersedia; menampilkan steps dari task tersimpan.",
            );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setTraceError(
            "Run tidak dapat dimuat; menampilkan steps dari task tersimpan.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setTraceLoading(false);
      });
    return () => controller.abort();
  }, [selected]);

  function upsert(task: OperationTask) {
    setTasks((current) => [
      task,
      ...current.filter((item) => item.task_id !== task.task_id),
    ]);
    setSelectedId(task.task_id);
    setStatus("all");
    setQuery("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (requestLock.current) return;
    const validation = validateIncident(input);
    if (validation) {
      setError(validation);
      return;
    }
    requestLock.current = true;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const task = await createIncident(input);
      upsert(task);
      setNotice("Task dan hasil workflow tersimpan di backend.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Request gagal. Periksa riwayat sebelum mencoba ulang.",
      );
      if (reason instanceof OperationsApiError && reason.taskId) {
        setSelectedId(reason.taskId);
        setStatus("all");
        setQuery("");
      }
      await refresh();
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }

  async function decide(decision: "approve" | "reject") {
    if (!selected || requestLock.current) return;
    requestLock.current = true;
    setDeciding(true);
    setError(undefined);
    setNotice(undefined);
    try {
      upsert(await decideOperation(selected.task_id, decision, note));
      setNotice(
        decision === "approve"
          ? "Persetujuan dicatat. Tidak ada aksi perangkat atau akun yang dieksekusi."
          : "Penolakan dicatat dan task dibatalkan.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Keputusan gagal disimpan.",
      );
      await refresh();
    } finally {
      requestLock.current = false;
      setDeciding(false);
    }
  }

  const disabled = busy || deciding;
  const steps =
    trace && trace.taskId === selected?.task_id
      ? trace.steps
      : (selected?.steps ?? []);

  return (
    <div className="space-y-6" data-testid="incident-operations">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="primary">IT HELPDESK AGENT</Badge>
            <Badge variant="warning">SYNTHETIC</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-textPrimary">
            Operations · Investigasi IT
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-textSecondary">
            Laporkan gangguan, periksa bukti, dan review rekomendasi agent dalam
            satu alur. Dataset demo, bukan pemantauan kampus live.
          </p>
        </div>
        <Link
          href="/campus-twin"
          className="rounded-lg border border-border px-4 py-2 text-sm text-textPrimary focus-visible:ring-2 focus-visible:ring-primary"
        >
          Buka Campus Twin →
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Task tersimpan", tasks.length],
          [
            "Menunggu approval",
            tasks.filter((task) => task.status === "waiting_for_approval")
              .length,
          ],
          [
            "Investigasi gagal",
            tasks.filter((task) => task.status === "failed").length,
          ],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-textSecondary">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-textPrimary">
              {loading || historyError ? "—" : value}
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-semibold text-textPrimary">
          <Bot className="h-5 w-5 text-primary" /> Laporan baru untuk agent
        </h2>
        <p className="mt-2 text-xs leading-5 text-textSecondary">
          LangGraph mengambil evidence dari adapter, menganalisis bila LLM
          diaktifkan, lalu menyimpan hasil. Tidak ada reset atau restart
          otomatis.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() =>
                setInput({
                  ...emptyInput,
                  description:
                    "Wi-Fi di Laboratorium Komputer 1 mengalami gangguan koneksi.",
                  location: "zone-A1",
                  device_type: "access_point",
                })
              }
            >
              Contoh gangguan Wi-Fi
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() =>
                setInput({
                  ...emptyInput,
                  description:
                    "Periksa gangguan access point di Laboratorium Komputer 2 sebelum restart.",
                  location: "zone-A2",
                  device_type: "access_point",
                  requested_action: "restart_device",
                })
              }
            >
              Contoh dengan approval
            </Button>
          </div>
          <label className="block space-y-2 text-sm font-medium text-textPrimary">
            <span>Deskripsi gangguan</span>
            <textarea
              className={fieldClass}
              value={input.description}
              onChange={(event) =>
                setInput({ ...input, description: event.target.value })
              }
              rows={3}
              minLength={5}
              maxLength={2000}
              required
              disabled={disabled}
              placeholder="Apa yang terjadi, sejak kapan, dan siapa yang terdampak?"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm font-medium text-textPrimary">
              <span>Zona dataset</span>
              <select
                className={fieldClass}
                value={input.location}
                disabled={disabled}
                onChange={(event) =>
                  setInput({ ...input, location: event.target.value })
                }
              >
                <option value="">Semua zona / belum diketahui</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} · {zone.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-textPrimary">
              <span>Jenis perangkat</span>
              <select
                className={fieldClass}
                value={input.device_type}
                disabled={disabled}
                onChange={(event) =>
                  setInput({ ...input, device_type: event.target.value })
                }
              >
                <option value="">Semua jenis</option>
                <option value="access_point">Access point</option>
                <option value="gateway">Gateway</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-textPrimary">
              <span>Permintaan tindak lanjut</span>
              <select
                className={fieldClass}
                value={input.requested_action}
                disabled={disabled}
                onChange={(event) =>
                  setInput({ ...input, requested_action: event.target.value })
                }
              >
                <option value="">Investigasi saja</option>
                <option value="restart_device">Review restart perangkat</option>
                <option value="reset_account">Review reset akun</option>
                <option value="change_config">
                  Review perubahan konfigurasi
                </option>
                <option value="network_change">
                  Review perubahan jaringan
                </option>
              </select>
            </label>
          </div>
          {!hasApiKey && (
            <p className="text-sm text-amber-700">
              Masuk melalui /login dengan akun workspace atau API key demo.
              Key provider AI hanya di backend.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={disabled || !hasApiKey || !input.description.trim()}
            >
              {" "}
              {busy ? "Menunggu backend..." : "Jalankan investigasi agent"}
            </Button>
            <p className="text-xs text-textSecondary">
              Analisis LLM opsional: LLM_ENABLED=true di backend.
            </p>
          </div>
        </form>
      </Card>

      {busy && (
        <p role="status" className="text-sm text-textSecondary">
          Request workflow sedang berlangsung. Langkah aktual tersedia setelah
          backend selesai; tidak ada progress simulasi.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-textPrimary">
              <ClipboardList className="h-5 w-5 text-primary" /> Riwayat
              investigasi
            </h2>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || disabled}
              onClick={() => void refresh()}
              aria-label="Muat ulang riwayat"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <label className="block space-y-1 text-xs text-textSecondary">
            <span>Cari laporan</span>
            <input
              className={fieldClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Deskripsi, task ID, atau zona"
            />
          </label>
          <label className="block space-y-1 text-xs text-textSecondary">
            <span>Filter status</span>
            <select
              className={fieldClass}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
            >
              <option value="all">Semua status</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {historyError && (
            <p role="alert" className="text-sm text-red-700">
              {historyError} Gunakan tombol muat ulang setelah koneksi pulih.
            </p>
          )}
          {loading ? (
            <p role="status" className="text-sm text-textSecondary">
              Memuat riwayat dari backend...
            </p>
          ) : !historyError && !filtered.length ? (
            <p className="text-sm text-textSecondary">
              {tasks.length
                ? "Tidak ada laporan yang cocok dengan filter."
                : "Belum ada investigasi tersimpan. Kirim laporan pertama di atas."}
            </p>
          ) : null}
          <div className="max-h-[560px] space-y-2 overflow-y-auto">
            {filtered.map((task) => (
              <button
                key={task.task_id}
                type="button"
                disabled={disabled}
                onClick={() => setSelectedId(task.task_id)}
                aria-pressed={task.task_id === selected?.task_id}
                className={`w-full rounded-lg border p-3 text-left focus-visible:ring-2 focus-visible:ring-primary ${task.task_id === selected?.task_id ? "border-primary bg-primary/5" : "border-border hover:bg-surfaceHover"}`}
              >
                <p className="break-words text-sm font-medium text-textPrimary">
                  {task.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={task.status}>
                    {statusLabels[task.status]}
                  </StatusBadge>
                  <span className="text-xs text-textSecondary">
                    {task.location}
                  </span>
                </div>
                <p className="mt-2 text-xs text-textSecondary">
                  {new Date(task.created_at).toLocaleString("id-ID")}
                </p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="min-w-0 space-y-5 p-5">
          {!selected ? (
            <div className="py-16 text-center">
              <FileSearch className="mx-auto h-8 w-8 text-textSecondary" />
              <h2 className="mt-3 font-semibold text-textPrimary">
                Execution inspector
              </h2>
              <p className="mt-2 text-sm text-textSecondary">
                Pilih laporan untuk melihat langkah, bukti, dan hasil tersimpan.
              </p>
            </div>
          ) : (
            <>
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selected.status}>
                    {statusLabels[selected.status]}
                  </StatusBadge>
                  <Badge variant="info">{analysisLabel(selected)}</Badge>
                  <Badge variant="warning">SYNTHETIC</Badge>
                </div>
                <h2 className="mt-3 break-words font-semibold text-textPrimary">
                  {selected.description}
                </h2>
                <p className="mt-2 break-all text-xs text-textSecondary">
                  Task {selected.task_id} · Run {selected.run_id}
                </p>
                <p className="mt-2 text-xs text-textSecondary">
                  Snapshot hasil tersimpan, bukan diagnosis live. Model:{" "}
                  {selected.llm_model ?? "tidak tersedia"} · Token input/output:{" "}
                  {selected.input_tokens ?? "—"} /{" "}
                  {selected.output_tokens ?? "—"}
                </p>
              </div>
              {selected.error && (
                <p role="alert" className="text-sm text-red-700">
                  {selected.error.code}: {selected.error.message}
                </p>
              )}
              <section>
                <h3 className="text-sm font-semibold text-textPrimary">
                  Langkah eksekusi backend
                </h3>
                {traceLoading && (
                  <p role="status" className="mt-2 text-xs text-textSecondary">
                    Memuat run ternormalisasi...
                  </p>
                )}
                {traceError && (
                  <p className="mt-2 text-xs text-amber-700">{traceError}</p>
                )}
                <ol className="mt-3 space-y-2">
                  {steps.map((step) => (
                    <li
                      key={step.step_id}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="text-sm font-medium text-textPrimary">
                          {step.name}
                        </span>
                        <StatusBadge status={step.status}>
                          {step.status}
                        </StatusBadge>
                      </div>
                      {step.detail && (
                        <p className="mt-2 text-xs text-textSecondary">
                          {step.detail}
                        </p>
                      )}
                      {step.duration_ms != null && (
                        <p className="mt-1 text-xs text-textSecondary">
                          Durasi terukur: {step.duration_ms} ms
                        </p>
                      )}
                      {!!step.source_ids?.length && (
                        <p className="mt-2 break-words text-xs text-textSecondary">
                          Sumber: {step.source_ids.join(", ")}
                        </p>
                      )}
                      {step.error && (
                        <p className="mt-2 text-xs text-red-700">
                          {step.error.code}: {step.error.message}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
              {selected.result?.analysis && (
                <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h3 className="text-sm font-semibold text-textPrimary">
                    Interpretasi AI · bukan fakta baru
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-textSecondary">
                    {selected.result.analysis.summary}
                  </p>
                  <ResultList
                    title="Temuan analisis"
                    items={selected.result.analysis.findings}
                  />
                </section>
              )}
              <ResultList
                title="Interpretasi berbasis bukti"
                items={selected.result?.interpretation}
              />
              <ResultList
                title="Ketidakpastian & batasan"
                items={selected.result?.uncertainty}
              />
              <ResultList
                title="Rekomendasi verifikasi"
                items={selected.result?.recommendations}
              />
              <section>
                <h3 className="text-sm font-semibold text-textPrimary">
                  Evidence & fakta dataset
                </h3>
                <p className="mt-1 text-xs text-textSecondary">
                  Record asli dari adapter. Kondisi sintetis tidak membuktikan
                  kondisi kampus saat ini.
                </p>
                {!selected.result?.facts?.length && (
                  <p className="mt-3 text-sm text-textSecondary">
                    Tidak ada fakta tersedia. Bukti kosong bukan diagnosis.
                  </p>
                )}
                <div className="mt-3 max-h-96 space-y-2 overflow-auto">
                  {selected.result?.facts?.map((fact, index) => (
                    <details
                      key={`${fact.dataset}-${String(fact.record.id)}-${index}`}
                      className="rounded-lg border border-border p-3"
                    >
                      <summary className="cursor-pointer break-words text-sm font-medium text-textPrimary">
                        {fact.dataset} ·{" "}
                        {String(fact.record.id ?? "record tanpa ID")}
                      </summary>
                      <pre className="mt-3 overflow-auto text-xs text-textSecondary">
                        {JSON.stringify(fact.record, null, 2)}
                      </pre>
                    </details>
                  ))}
                </div>
                {!!selected.result?.evidence?.length && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-textSecondary">
                      Daftar source ID ({selected.result.evidence.length})
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-textSecondary">
                      {selected.result.evidence.map((item) => (
                        <li key={`${item.dataset}-${item.source_id}`}>
                          {item.dataset} · {item.source_id}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
              {selected.approval && (
                <section className="space-y-3 rounded-lg border border-amber-200 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
                    <ShieldCheck className="h-4 w-4" /> Review manusia ·{" "}
                    {selected.approval.action}
                  </h3>
                  <p className="text-xs leading-5 text-textSecondary">
                    Status: {selected.approval.status}. Approval hanya mencatat
                    keputusan dan mengubah status task; tidak menjalankan aksi.
                  </p>
                  {selected.status === "waiting_for_approval" ? (
                    <>
                      <label className="block space-y-2 text-sm text-textPrimary">
                        <span>Catatan approval (opsional)</span>
                        <textarea
                          className={fieldClass}
                          rows={2}
                          maxLength={500}
                          value={note}
                          disabled={disabled}
                          onChange={(event) => setNote(event.target.value)}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={disabled || !hasApiKey}
                          onClick={() => void decide("approve")}
                        >
                          Catat persetujuan
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={disabled || !hasApiKey}
                          onClick={() => void decide("reject")}
                        >
                          Tolak permintaan
                        </Button>
                      </div>
                      {deciding && (
                        <p role="status" className="text-xs text-textSecondary">
                          Menyimpan keputusan...
                        </p>
                      )}
                    </>
                  ) : (
                    selected.approval.note && (
                      <p className="text-sm text-textSecondary">
                        Catatan: {selected.approval.note}
                      </p>
                    )
                  )}
                </section>
              )}
              <Link
                href="/workspace/tasks"
                className="inline-block text-sm font-medium text-primary focus-visible:ring-2 focus-visible:ring-primary"
              >
                Buka seluruh task & history →
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function ResultList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <section>
      <h3 className="text-sm font-semibold text-textPrimary">{title}</h3>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-textSecondary">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
