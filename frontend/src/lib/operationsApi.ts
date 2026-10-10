import { apiFetch } from "./api";

export type OperationStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "waiting_for_approval"
  | "cancelled";

export interface OperationStep {
  step_id: string;
  name: string;
  status: OperationStatus | "skipped" | "retrying";
  source_ids?: string[] | null;
  detail?: string | null;
  duration_ms?: number | null;
  error?: { code?: string; message?: string } | null;
}

export interface OperationTask {
  task_id: string;
  run_id: string;
  worker: string;
  description: string;
  location?: string | null;
  device_type?: string | null;
  status: OperationStatus;
  created_at: string;
  steps: OperationStep[];
  llm_model?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  error?: { code: string; message: string } | null;
  approval?: { action?: string; status?: string; note?: string | null } | null;
  result?: {
    facts?: Array<{ dataset: string; record: Record<string, unknown> }>;
    evidence?: Array<{ source_id: string; dataset: string }>;
    interpretation?: string[];
    uncertainty?: string[];
    recommendations?: string[];
    analysis?: { summary?: string; findings?: string[]; model?: string } | null;
  } | null;
}

export interface IncidentInput {
  description: string;
  location: string;
  device_type: string;
  requested_action: string;
}

export class OperationsApiError extends Error {
  constructor(
    message: string,
    public taskId?: string,
  ) {
    super(message);
    this.name = "OperationsApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, { cache: "no-store", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: { task_id?: string };
    } | null;
    const message =
      response.status === 401
        ? "API key demo belum dikonfigurasi atau tidak valid."
        : response.status === 422
          ? "Input tidak valid. Deskripsi harus 5–2000 karakter dan catatan approval maksimal 500 karakter."
          : response.status === 409
            ? "Status task sudah berubah. Muat ulang riwayat sebelum mengambil keputusan."
            : response.status === 503
              ? "Database tidak tersedia. Periksa backend dan koneksi PostgreSQL."
              : "Request gagal. Periksa riwayat sebelum mencoba ulang; task mungkin sudah tersimpan.";
    throw new OperationsApiError(message, body?.detail?.task_id);
  }
  return response.json() as Promise<T>;
}

export function validateIncident(input: IncidentInput): string | undefined {
  const length = input.description.trim().length;
  if (length < 5 || length > 2000)
    return "Deskripsi laporan harus 5–2000 karakter.";
}

export async function loadOperationHistory(signal?: AbortSignal) {
  const data = await request<{ items: OperationTask[] }>("/api/history", {
    signal,
  });
  return data.items.filter((task) => task.worker === "it_helpdesk");
}

export function createIncident(input: IncidentInput) {
  const error = validateIncident(input);
  if (error) return Promise.reject(new OperationsApiError(error));
  return request<OperationTask>("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      worker: "it_helpdesk",
      description: input.description.trim(),
      location: input.location || null,
      device_type: input.device_type || null,
      requested_action: input.requested_action || null,
    }),
  });
}

export function loadOperationRuns(taskId: string, signal?: AbortSignal) {
  return request<{ items: Array<{ run_id: string; steps: OperationStep[] }> }>(
    `/api/tasks/${encodeURIComponent(taskId)}/runs`,
    { signal },
  );
}

export function decideOperation(
  taskId: string,
  decision: "approve" | "reject",
  note: string,
) {
  return request<OperationTask>(
    `/api/tasks/${encodeURIComponent(taskId)}/approval`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note: note.trim() || null }),
    },
  );
}

export function analysisLabel(task: OperationTask): string {
  const step = task.steps.find((item) => item.step_id === "analyze_evidence");
  if (step?.status === "completed" && task.result?.analysis)
    return "Analisis LLM";
  if (step?.status === "failed") return "Analisis LLM gagal";
  if (step?.status === "skipped") return "Deterministik · LLM nonaktif";
  return "Mode analisis belum tersedia";
}
