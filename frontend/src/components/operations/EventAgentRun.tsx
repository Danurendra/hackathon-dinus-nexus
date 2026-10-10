'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bot, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useDemoAccess } from '@/hooks/useDemoAccess';
import type { EventScenarioInput } from '@/data/eventSimulation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

interface EventTask {
  task_id: string;
  worker: string;
  description: string;
  status: string;
  created_at: string;
  error?: { code: string; message: string } | null;
  steps: Array<{ step_id: string; name: string; status: string; duration_ms?: number; detail?: string }>;
  result?: {
    analysis_mode?: string;
    forecast?: Record<string, number>;
    interpretation?: string[];
    uncertainty?: string[];
    recommendations?: string[];
    facts?: Array<{ dataset: string; record: Record<string, unknown> }>;
    event_input?: Record<string, unknown>;
    analysis?: { summary: string; recommendations?: string[]; uncertainty?: string[]; model?: string; usage?: Record<string, unknown> };
  };
}

export function EventAgentRun({ input, scenario }: { input: EventScenarioInput; scenario: string }) {
  const hasApiKey = useDemoAccess();
  const [name, setName] = useState('University Graduation Ceremony');
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [followupBusy, setFollowupBusy] = useState(false);
  const [followupNotice, setFollowupNotice] = useState<string>();
  const selected = tasks.find((task) => task.task_id === selectedId) ?? tasks[0];

  async function loadHistory() {
    setLoading(true);
    try {
      const response = await apiFetch('/api/history', { cache: 'no-store' });
      if (!response.ok) throw new Error('History tidak tersedia. Periksa backend, database, dan API key.');
      const data = await response.json() as { items: EventTask[] };
      setTasks(data.items.filter((task) => task.worker === 'campus_operations' && task.result?.event_input));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void apiFetch('/api/history', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('History tidak tersedia. Periksa backend, database, dan API key.');
      const data = await response.json() as { items: EventTask[] };
      if (active) setTasks(data.items.filter((task) => task.worker === 'campus_operations' && task.result?.event_input));
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'History gagal dimuat.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function runAssessment() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await apiFetch('/api/event-plans', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, name: `${name.trim()} (${scenario})` }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.detail?.task_id) setSelectedId(data.detail.task_id);
        if (response.status === 422) throw new Error('Input event tidak valid: nilai harus positif dan concurrent occupancy tidak boleh melebihi attendance.');
        throw new Error(data.detail?.error?.message ?? 'Workflow gagal. Periksa backend, database, dan API key.');
      }
      const task = data as EventTask;
      setSelectedId(task.task_id);
      setTasks((current) => [task, ...current]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Workflow gagal.');
      try { await loadHistory(); } catch { /* Keep the original request error. */ }
    } finally {
      setBusy(false);
    }
  }

  async function investigateDevice(deviceId: string) {
    if (!selected || followupBusy) return;
    setFollowupBusy(true);
    setFollowupNotice(undefined);
    setError(undefined);
    try {
      const response = await apiFetch(`/api/event-plans/${selected.task_id}/helpdesk`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail?.error?.message ?? 'Investigasi IT Helpdesk gagal; periksa task history sebelum mencoba ulang.');
      setFollowupNotice(`Task IT Helpdesk ${data.task_id} tersimpan (${data.status}). Tidak ada restart atau perubahan perangkat yang dieksekusi.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Investigasi gagal.');
    } finally {
      setFollowupBusy(false);
    }
  }

  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 font-semibold text-textPrimary"><Bot className="h-5 w-5 text-indigo-600" /> Campus Operations Workflow</h2><p className="mt-1 text-xs text-textSecondary">Input event → inventory → kalkulasi backend → risiko → hasil persisten. Dasar deterministik, review AI opsional; bukan deteksi live.</p></div>
        <div className="flex gap-2"><Badge variant="warning">SYNTHETIC</Badge><Badge variant="info">{selected?.result?.analysis ? 'AI-ASSISTED' : 'RULE-BASED'}</Badge></div>
      </div>
      <div className="flex flex-col items-end gap-3 sm:flex-row">
        <div className="w-full"><Input label="Nama event" aria-label="Nama event" value={name} onChange={(event) => setName(event.target.value)} disabled={busy} maxLength={150} /></div>
        <Button onClick={() => void runAssessment()} disabled={busy || !name.trim() || !hasApiKey} className="shrink-0">{busy ? 'Memproses di backend...' : 'Jalankan workflow event'}</Button>
      </div>
      {!hasApiKey && <p className="text-xs text-amber-700">Masuk melalui /login dengan akun workspace atau API key demo.</p>}
      {busy && <p role="status" className="text-sm text-textSecondary">Request sedang berlangsung. Langkah aktual ditampilkan setelah backend selesai; tidak ada progress simulasi.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {followupNotice && <p role="status" className="text-sm text-emerald-700">{followupNotice}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-textPrimary">Event history</h3>
        <Button variant="outline" size="sm" disabled={loading || busy} onClick={() => { setError(undefined); void loadHistory().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'History gagal dimuat.')); }}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>
      {loading ? <p className="text-sm text-textSecondary">Memuat history...</p> : tasks.length === 0 ? <p className="text-sm text-textSecondary">Belum ada assessment event tersimpan.</p> : (
        <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">{tasks.map((task) => <button key={task.task_id} onClick={() => { setSelectedId(task.task_id); setFollowupNotice(undefined); }} type="button" aria-pressed={selected?.task_id === task.task_id} className="rounded-md border border-border p-3 text-left text-sm text-textPrimary"><span className="font-medium">{task.description}</span> · {task.status}<span className="mt-1 block text-xs text-textSecondary">{new Date(task.created_at).toLocaleString('id-ID')}</span></button>)}</div>
      )}
      {selected && <div className="space-y-4 border-t border-border pt-4">
        <p className="break-all text-xs text-textSecondary">Task {selected.task_id} · {selected.status}. Hasil berikut adalah snapshot tersimpan, bukan preview input saat ini.</p>
        {selected.error && <p role="alert" className="text-sm text-red-600">{selected.error.code}: {selected.error.message}</p>}
        {selected.result?.forecast && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
          ['Estimasi daya puncak', `${selected.result.forecast.peakPowerKw.toLocaleString('id-ID')} kW`],
          ['Estimasi kebutuhan jaringan', `${selected.result.forecast.networkDemandMbps.toLocaleString('id-ID')} Mbps`],
          ['AP online (dataset sintetis)', `${selected.result.forecast.onlineAccessPoints}`],
          ['Estimasi AP tambahan', `${selected.result.forecast.additionalAccessPoints}`],
        ].map(([label, value]) => <div key={label} className="rounded-md border border-border p-3"><p className="text-xs text-textSecondary">{label}</p><p className="mt-1 text-lg font-semibold text-textPrimary">{value}</p></div>)}</div>}
        <details><summary className="cursor-pointer text-sm font-medium text-textPrimary">Input & forecast tersimpan</summary><pre className="mt-2 overflow-x-auto text-xs text-textSecondary">{JSON.stringify({ input: selected.result?.event_input, forecast: selected.result?.forecast }, null, 2)}</pre></details>
        <div className="grid gap-4 lg:grid-cols-3">{[
          ['Risiko terdeteksi', selected.result?.interpretation],
          ['Rekomendasi aman', selected.result?.recommendations],
          ['Asumsi & ketidakpastian', selected.result?.uncertainty],
        ].map(([title, items]) => <section key={title as string}><h3 className="text-sm font-semibold text-textPrimary">{title as string}</h3><ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-5 text-textSecondary">{(items as string[] | undefined)?.map((item) => <li key={item}>{item}</li>)}</ul></section>)}</div>
        {selected.result?.analysis && <section className="rounded-md border border-border p-4"><h3 className="text-sm font-semibold text-textPrimary">Interpretasi AI (bukan fakta baru)</h3><p className="mt-2 text-sm text-textSecondary">{selected.result.analysis.summary}</p><ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-textSecondary">{selected.result.analysis.recommendations?.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-2 text-xs text-textSecondary">Ketidakpastian AI: {selected.result.analysis.uncertainty?.join(' ')}</p><p className="mt-2 text-xs text-textSecondary">Model: {selected.result.analysis.model} · Token: {JSON.stringify(selected.result.analysis.usage)}</p></section>}
        <section><h3 className="text-sm font-semibold text-textPrimary">Execution steps (backend)</h3><ol className="mt-2 space-y-2">{selected.steps.map((step) => <li key={step.step_id} className="rounded-md border border-border p-3 text-sm text-textSecondary">{step.name} · {step.status} · {step.duration_ms !== undefined ? `${step.duration_ms} ms` : step.detail}</li>)}</ol></section>
        {selected.status === 'completed' && <section><h3 className="text-sm font-semibold text-textPrimary">Tindak lanjut IT Helpdesk</h3><p className="mt-1 text-xs text-textSecondary">Membuat task investigasi dari evidence event; hanya dijalankan setelah kamu menekan tombol, bukan aksi perangkat otomatis.</p><div className="mt-3 flex flex-wrap gap-2">{selected.result?.facts?.filter((fact) => fact.dataset === 'devices' && fact.record.status !== 'online').map((fact) => <Button key={String(fact.record.id)} variant="outline" size="sm" disabled={followupBusy || busy || !hasApiKey} onClick={() => void investigateDevice(String(fact.record.id))}>Investigasi {String(fact.record.id)}</Button>)}</div></section>}
        <details><summary className="cursor-pointer text-sm font-medium text-textPrimary">Evidence: record asli dataset sintetis ({selected.result?.facts?.length ?? 0})</summary><div className="mt-2 max-h-72 space-y-2 overflow-auto">{selected.result?.facts?.map((fact) => <div key={`${fact.dataset}-${fact.record.id}`} className="rounded-md border border-border p-3"><p className="text-xs font-medium text-textPrimary">{fact.dataset} · {String(fact.record.id)}</p><pre className="mt-1 overflow-auto text-xs text-textSecondary">{JSON.stringify(fact.record, null, 2)}</pre></div>)}</div></details>
        <Link href="/workspace/tasks" className="inline-block text-sm font-medium text-indigo-600">Buka task & execution history →</Link>
      </div>}
    </Card>
  );
}
