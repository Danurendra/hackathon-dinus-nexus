'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { API_BASE_URL, apiHeaders } from '@/lib/api';
import { useDemoAccess } from '@/hooks/useDemoAccess';

type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'waiting_for_approval' | 'cancelled';
type StepStatus = TaskStatus | 'skipped' | 'retrying';

interface TaskStep {
  step_id: string;
  name: string;
  status: StepStatus;
  source_ids?: string[] | null;
  detail?: string | null;
  error?: { code?: string; message?: string } | null;
}

interface TaskResult {
  facts?: Array<{ dataset: string; record: Record<string, unknown> }>;
  evidence?: Array<{ source_id: string; dataset: string }>;
  interpretation?: string[];
  uncertainty?: string[];
  recommendations?: string[];
  data_label?: string;
}

interface Task {
  task_id: string;
  run_id: string;
  worker: string;
  description: string;
  location?: string | null;
  device_type?: string | null;
  requested_action?: string | null;
  status: TaskStatus;
  created_at: string;
  steps: TaskStep[];
  result?: TaskResult | null;
  error?: { code?: string; message?: string } | null;
  approval?: {
    required?: boolean;
    status?: string;
    action?: string | null;
    note?: string | null;
    decided_at?: string | null;
  } | null;
}

interface RunsResponse {
  items: Array<{
    steps: TaskStep[];
  }>;
}


const statusOptions: Array<{ value: 'all' | TaskStatus; label: string }> = [
  { value: 'all', label: 'Semua status' },
  { value: 'running', label: 'Running' },
  { value: 'queued', label: 'Queued' },
  { value: 'waiting_for_approval', label: 'Menunggu approval' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];


function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusLabel(status: TaskStatus) {
  return {
    queued: 'Queued',
    running: 'Running',
    waiting_for_approval: 'Waiting approval',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  }[status];
}

function statusIcon(status: TaskStatus) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-600" />;
  if (status === 'waiting_for_approval') return <ShieldCheck className="h-4 w-4 text-amber-600" />;
  if (status === 'running') return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />;
  if (status === 'cancelled') return <XCircle className="h-4 w-4 text-slate-500" />;
  return <Clock3 className="h-4 w-4 text-slate-500" />;
}

export function TasksWorkspace({ initialStatusFilter }: { initialStatusFilter?: 'all' | TaskStatus }) {
  const API_KEY = useDemoAccess();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | TaskStatus>(initialStatusFilter ?? 'all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [serverSteps, setServerSteps] = useState<TaskStep[]>();

  const loadTasks = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetch(`${API_BASE_URL}/api/history`, {
        headers: apiHeaders(),
        cache: 'no-store',
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error('API key frontend belum dikonfigurasi atau tidak valid.');
        throw new Error('Riwayat task tidak dapat dimuat dari backend.');
      }
      const data = (await response.json()) as { items: Task[] };
      setTasks(data.items);
      setSelectedTaskId((current) => current && data.items.some((task) => task.task_id === current)
        ? current
        : data.items[0]?.task_id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Riwayat task gagal dimuat.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesStatus = status === 'all' || task.status === status;
      const searchable = `${task.description} ${task.task_id} ${task.location ?? ''} ${task.device_type ?? ''}`.toLowerCase();
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [query, status, tasks]);

  const selectedTask = tasks.find((task) => task.task_id === selectedTaskId) ?? filteredTasks[0];

  useEffect(() => {
    setServerSteps(undefined);
    if (!selectedTask) return;
    let cancelled = false;
    void fetch(`${API_BASE_URL}/api/tasks/${selectedTask.task_id}/runs`, {
      headers: apiHeaders(),
      cache: 'no-store',
    }).then(async (response) => {
      if (!response.ok) return;
      const data = (await response.json()) as RunsResponse;
      if (!cancelled) setServerSteps(data.items[0]?.steps);
    }).catch(() => {
      // The task response remains useful when normalized run data is unavailable.
    });
    return () => {
      cancelled = true;
    };
  }, [selectedTask]);

  async function decideApproval(decision: 'approve' | 'reject') {
    if (!selectedTask) return;
    setIsDeciding(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${selectedTask.task_id}/approval`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) throw new Error(response.status === 401
        ? 'API key frontend belum dikonfigurasi atau tidak valid.'
        : 'Keputusan approval gagal disimpan.');
      const updated = (await response.json()) as Task;
      setTasks((current) => current.map((task) => task.task_id === updated.task_id ? updated : task));
      setNotice(decision === 'approve' ? 'Approval dicatat. Backend menandai task selesai.' : 'Task ditolak dan dibatalkan.');
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : 'Approval gagal diproses.');
    } finally {
      setIsDeciding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm text-textSecondary hover:text-textPrimary">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Command Center
          </Link>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">AVAILABLE</Badge>
            <Badge variant="info">PERSISTENT CASES</Badge>
            <Badge variant="secondary">SYNTHETIC DATA</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-textPrimary">Tasks &amp; Incidents</h1>
          <p className="mt-2 max-w-3xl text-textSecondary">
            Pantau laporan IT Helpdesk, bukti investigasi, status workflow, dan keputusan approval dari backend.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadTasks(true)} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Data task belum tersedia</p>
            <p className="mt-1">{error}</p>
            {!API_KEY && <p className="mt-2 text-xs">Masuk melalui /login dengan akun workspace atau API key demo.</p>}
          </div>
        </div>
      )}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.4fr)]">
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-slate-50/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-textPrimary"><ClipboardList className="h-5 w-5 text-indigo-600" /> Case history</h2>
              <Badge variant="primary">{tasks.length} task</Badge>
            </div>
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari laporan atau lokasi..." className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </label>
              <select value={status} onChange={(event) => setStatus(event.target.value as 'all' | TaskStatus)} className="rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-indigo-400">
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>
          <div className="max-h-[680px] overflow-y-auto p-2">
            {isLoading && <div className="p-6 text-center text-sm text-textSecondary">Memuat riwayat task...</div>}
            {!isLoading && filteredTasks.length === 0 && (
              <div className="p-8 text-center">
                <FileSearch className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 font-medium text-textPrimary">{tasks.length ? 'Tidak ada task yang cocok.' : 'Belum ada task tersimpan.'}</p>
                <p className="mt-1 text-sm text-textSecondary">Buat laporan baru dari Command Center untuk memulai investigasi.</p>
              </div>
            )}
            {filteredTasks.map((task) => (
              <button key={task.task_id} type="button" onClick={() => setSelectedTaskId(task.task_id)} className={`mb-1 w-full rounded-lg border p-4 text-left transition ${selectedTask?.task_id === task.task_id ? 'border-indigo-300 bg-indigo-50/70' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{statusIcon(task.status)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-semibold text-textPrimary">{task.description}</p>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={task.status}>{statusLabel(task.status)}</StatusBadge>
                      {task.location && <span className="text-xs text-textSecondary">{task.location}</span>}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{formatDate(task.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="min-h-[620px] overflow-hidden">
          {!selectedTask ? (
            <div className="flex min-h-[620px] flex-col items-center justify-center p-8 text-center">
              <FileSearch className="h-10 w-10 text-slate-400" />
              <h2 className="mt-4 font-semibold text-textPrimary">Pilih task untuk melihat detail</h2>
              <p className="mt-2 max-w-sm text-sm text-textSecondary">Detail investigasi, evidence, dan execution steps akan muncul di sini.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-border bg-slate-50/80 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {statusIcon(selectedTask.status)}
                    <div>
                      <p className="font-mono text-xs text-slate-500">{selectedTask.task_id}</p>
                      <h2 className="mt-1 text-lg font-semibold text-textPrimary">{selectedTask.description}</h2>
                    </div>
                  </div>
                  <StatusBadge status={selectedTask.status}>{statusLabel(selectedTask.status)}</StatusBadge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-textSecondary">
                  <span className="rounded bg-white px-2 py-1">Worker: {selectedTask.worker}</span>
                  {selectedTask.location && <span className="rounded bg-white px-2 py-1">Lokasi: {selectedTask.location}</span>}
                  {selectedTask.device_type && <span className="rounded bg-white px-2 py-1">Perangkat: {selectedTask.device_type}</span>}
                  <span className="rounded bg-white px-2 py-1">{formatDate(selectedTask.created_at)}</span>
                </div>
              </div>
              <div className="space-y-5 p-5">
                {selectedTask.status === 'waiting_for_approval' && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" />
                      <div className="flex-1">
                        <p className="font-semibold text-amber-900">Persetujuan manusia diperlukan</p>
                        <p className="mt-1 text-sm text-amber-800">Aksi <strong>{selectedTask.approval?.action ?? selectedTask.requested_action}</strong> belum dieksekusi. Pilih keputusan untuk menyelesaikan gate.</p>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" onClick={() => void decideApproval('approve')} disabled={isDeciding}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => void decideApproval('reject')} disabled={isDeciding}>Reject</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTask.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="font-semibold">Workflow gagal: {selectedTask.error.code}</p>
                    <p className="mt-1">{selectedTask.error.message}</p>
                  </div>
                )}

                {selectedTask.result && (
                  <section>
                    <h3 className="font-semibold text-textPrimary">Investigation result</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <ResultList title="Interpretation" items={selectedTask.result.interpretation} />
                      <ResultList title="Uncertainty" items={selectedTask.result.uncertainty} />
                      <ResultList title="Recommendations" items={selectedTask.result.recommendations} />
                      <div className="rounded-lg border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(selectedTask.result.evidence ?? []).map((item) => <Badge key={`${item.dataset}-${item.source_id}`} variant="info">{item.source_id}</Badge>)}
                          {!selectedTask.result.evidence?.length && <span className="text-sm text-textSecondary">Belum ada evidence.</span>}
                        </div>
                        {selectedTask.result.data_label && <p className="mt-3 text-xs text-amber-700">Source label: {selectedTask.result.data_label}</p>}
                      </div>
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="font-semibold text-textPrimary">Execution timeline</h3>
                  <div className="mt-3 space-y-2">
                    {(serverSteps ?? selectedTask.steps ?? []).map((step, index) => (
                      <div key={`${step.step_id}-${index}`} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                        <div className="mt-0.5">{step.status === 'failed' ? <XCircle className="h-4 w-4 text-red-600" /> : step.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4 text-slate-500" />}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-textPrimary">{step.name}</p>
                            <StatusBadge status={step.status}>{step.status}</StatusBadge>
                          </div>
                          {step.detail && <p className="mt-1 text-xs text-textSecondary">{step.detail}</p>}
                          {step.source_ids?.length ? <div className="mt-2 flex flex-wrap gap-1">{step.source_ids.map((source) => <Badge key={source} variant="secondary">{source}</Badge>)}</div> : null}
                          {step.error && <p className="mt-2 text-xs text-red-700">{step.error.code}: {step.error.message}</p>}
                        </div>
                      </div>
                    ))}
                    {!selectedTask.steps?.length && <p className="text-sm text-textSecondary">Belum ada execution step.</p>}
                  </div>
                </section>

                <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                  Buka Command Center untuk membuat task baru <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function ResultList({ title, items }: { title: string; items?: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {items?.length ? (
        <ul className="mt-2 space-y-2 text-sm text-textSecondary">
          {items.map((item, index) => <li key={`${title}-${index}`} className="flex gap-2"><span className="text-indigo-500">•</span><span>{item}</span></li>)}
        </ul>
      ) : <p className="mt-2 text-sm text-textSecondary">Belum tersedia.</p>}
    </div>
  );
}
