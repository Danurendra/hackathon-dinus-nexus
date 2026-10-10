'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, CheckCircle2, CircleDot, Clock3, Send, Sparkles, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { apiFetch } from '@/lib/api';
import { AgentReply } from './AgentReply';

type AgentId = 'it_helpdesk' | 'network_operations' | 'campus_operations';
type ActivityState = 'idle' | 'preparing' | 'waiting' | 'completed' | 'error';

interface Agent {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  examplePrompt: string;
  capabilities: string[];
  available: boolean;
}

interface AgentMessage {
  message_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: {
    model?: string;
    data_label?: string;
    evidence?: { dataset: string; source_id: string; record: Record<string, unknown> }[];
    limitations?: string[];
  };
}

interface AgentConversation {
  conversation_id: string;
  worker: AgentId;
  messages: AgentMessage[];
}

const sessionKey = (worker: AgentId) => `dinusnexus-agent-session-${worker}`;

const agents: Agent[] = [
  {
    id: 'it_helpdesk',
    name: 'IT Helpdesk Agent',
    role: 'Incident investigation',
    description: 'Menganalisis laporan gangguan IT, mencari evidence, dan menyusun rekomendasi tindak lanjut.',
    examplePrompt: 'Wi-Fi di Laboratorium Komputer 2 tidak terhubung. Bantu investigasi dan cari evidence.',
    capabilities: ['Incident triage', 'Evidence lookup', 'Root-cause hints', 'Recommendations'],
    available: true,
  },
  {
    id: 'network_operations',
    name: 'Network Operations Agent',
    role: 'Network capacity',
    description: 'Menganalisis kapasitas jaringan, deteksi anomali, dan rekomendasi optimasi infrastruktur.',
    examplePrompt: 'Analisis anomali jaringan dan perangkat yang perlu diperiksa',
    capabilities: ['Capacity analysis', 'Anomaly detection', 'Network health', 'Recommendations'],
    available: true,
  },
  {
    id: 'campus_operations',
    name: 'Campus Operations Agent',
    role: 'Event operations',
    description: 'Koordinasi event kampus, analisis kapasitas gedung, dan perencanaan sumber daya.',
    examplePrompt: 'Bantu rencanakan kapasitas gedung untuk seminar kampus',
    capabilities: ['Event planning', 'Resource coordination', 'Capacity analysis', 'Recommendations'],
    available: true,
  },
];

export function AgentWorkspace() {
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>('it_helpdesk');
  const [conversation, setConversation] = useState<AgentConversation>();
  const [message, setMessage] = useState('');
  const [activity, setActivity] = useState<ActivityState>('idle');
  const [error, setError] = useState<string>();
  const [connecting, setConnecting] = useState(true);
  const [sessionVersion, setSessionVersion] = useState(0);
  const requestVersion = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? agents[0],
    [selectedAgentId],
  );
  useEffect(() => {
    const controller = new AbortController();
    const version = ++requestVersion.current;
    setConversation(undefined);
    setMessage('');
    setActivity('idle');
    setError(undefined);
    setConnecting(true);
    async function connect() {
      try {
        let saved: string | null = null;
        try { saved = localStorage.getItem(sessionKey(selectedAgentId)); } catch { /* Storage may be disabled. */ }
        let loaded: AgentConversation | undefined;
        if (saved) {
          const response = await apiFetch(`/api/conversations/${encodeURIComponent(saved)}`, { signal: controller.signal });
          if (response.ok) {
            const candidate = await response.json() as AgentConversation;
            if (candidate.worker === selectedAgentId) loaded = candidate;
          } else if (response.status !== 404) throw new Error('Riwayat agent gagal dimuat. Periksa koneksi dan API key.');
        }
        if (!loaded) {
          const response = await apiFetch('/api/conversations', {
            method: 'POST', signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ worker: selectedAgentId, title: `${selectedAgent.name} session` }),
          });
          if (!response.ok) throw new Error('Conversation agent gagal dibuat. Periksa backend dan API key.');
          loaded = await response.json() as AgentConversation;
        }
        if (version !== requestVersion.current) return;
        setConversation({ ...loaded, messages: loaded.messages ?? [] });
        try { localStorage.setItem(sessionKey(selectedAgentId), loaded.conversation_id); } catch { /* Session still works without storage. */ }
      } catch (conversationError) {
        if (!controller.signal.aborted) setError(conversationError instanceof Error ? conversationError.message : 'Agent tidak dapat dihubungkan.');
      } finally {
        if (version === requestVersion.current) setConnecting(false);
      }
    }
    void connect();
    return () => { controller.abort(); ++requestVersion.current; };
  }, [selectedAgentId, selectedAgent.name, sessionVersion]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'nearest' }); }, [conversation?.messages.length, activity]);

  function newSession() {
    try { localStorage.removeItem(sessionKey(selectedAgentId)); } catch { /* Optional storage. */ }
    setSessionVersion((value) => value + 1);
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if (!content || !conversation || !selectedAgent.available || activity === 'preparing' || activity === 'waiting') return;
    const version = requestVersion.current;

    setMessage('');
    setError(undefined);
    setActivity('preparing');
    const userMessage: AgentMessage = {
      message_id: `local-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setConversation((current) => current ? { ...current, messages: [...current.messages, userMessage] } : current);

    try {
      setActivity('waiting');
      const response = await apiFetch(`/api/conversations/${conversation.conversation_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, context: { worker: selectedAgentId } }),
      });
      if (!response.ok) {
        let detail = 'Agent gagal memberikan respons.';
        try {
          const errorBody = (await response.json()) as { detail?: string };
          if (errorBody.detail) detail = errorBody.detail;
        } catch {
          // Keep the safe generic message when the server returns no JSON body.
        }
        throw new Error(detail);
      }
      const assistantMessage = (await response.json()) as AgentMessage;
      if (version !== requestVersion.current) return;
      setConversation((current) => current ? { ...current, messages: [...current.messages, assistantMessage] } : current);
      setActivity('completed');
    } catch (sendError) {
      if (version !== requestVersion.current) return;
      setActivity('error');
      setMessage(content);
      setError(sendError instanceof Error ? sendError.message : 'Agent gagal memproses pesan.');
    }
  }

  const activityLabel = {
    idle: 'Siap menerima instruksi',
    preparing: 'Menyiapkan konteks permintaan',
    waiting: 'Menunggu respons dari agent',
    completed: 'Respons agent diterima',
    error: 'Eksekusi agent gagal',
  }[activity];

  return (
    <div className="space-y-6 dark:[&_.text-textPrimary]:text-slate-100 dark:[&_.text-textSecondary]:text-slate-300 dark:[&_aside]:bg-slate-900">
      <div>
        <div className="mb-3 flex flex-wrap gap-2"><Badge variant="primary">AI AGENTS</Badge><Badge variant="warning">SYNTHETIC DATA</Badge></div>
        <h1 className="text-3xl font-bold tracking-tight text-textPrimary">AI Agent workspace</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-textSecondary">Pilih agent, kirim instruksi, dan ikuti status eksekusinya. Aktivitas di bawah berubah berdasarkan request yang sedang diproses.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          {agents.map((agent) => (
            <button key={agent.id} type="button" aria-pressed={selectedAgentId === agent.id} disabled={activity === 'preparing' || activity === 'waiting'} onClick={() => agent.available && setSelectedAgentId(agent.id)} className={`w-full rounded-xl border p-4 text-left transition focus-visible:ring-2 focus-visible:ring-indigo-500 motion-reduce:transition-none disabled:opacity-60 ${selectedAgentId === agent.id ? 'border-indigo-300 bg-indigo-50 shadow-sm dark:border-indigo-500 dark:bg-indigo-950' : 'border-border bg-white hover:border-indigo-200 dark:bg-slate-900'} ${!agent.available ? 'cursor-not-allowed opacity-65' : ''}`}>
              <div className="flex items-start justify-between gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${agent.available ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Bot className="h-5 w-5" /></span><Badge variant={agent.available ? 'success' : 'secondary'}>{agent.available ? 'AVAILABLE' : 'PLANNED'}</Badge></div>
              <h2 className="mt-3 font-semibold text-textPrimary">{agent.name}</h2>
              <p className="mt-1 text-xs font-medium text-indigo-600">{agent.role}</p>
              <p className="mt-2 text-xs leading-5 text-textSecondary">{agent.description}</p>
            </button>
          ))}
        </div>

        <Card className="min-h-[620px] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-slate-50/80 px-5 py-4 dark:bg-slate-900"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><Bot className="h-5 w-5" /></span><div><h2 className="font-semibold text-textPrimary">{selectedAgent.name}</h2><p className="text-xs text-textSecondary">{selectedAgent.role}</p></div></div><div className="flex items-center gap-3"><span className="text-xs text-textSecondary">{connecting ? 'Menghubungkan…' : conversation ? 'Sesi terhubung' : 'Belum terhubung'}</span><Button type="button" size="sm" variant="outline" onClick={newSession} disabled={connecting || activity === 'preparing' || activity === 'waiting'}>Sesi baru</Button></div></div>
          <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="flex min-h-[470px] flex-col">
              <div className="max-h-[650px] flex-1 space-y-3 overflow-y-auto" aria-label="Percakapan agent" aria-busy={activity === 'waiting'}>
                {connecting && <p role="status" className="text-sm text-textSecondary">Memuat sesi dan riwayat agent…</p>}
                {!connecting && !conversation?.messages.length && <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-5 text-sm text-textSecondary dark:bg-indigo-950/50"><div className="mb-2 flex items-center gap-2 font-semibold text-indigo-700 dark:text-indigo-300"><Sparkles className="h-4 w-4" />{conversation ? 'Agent siap membantu' : 'Agent belum terhubung'}</div>Kirim instruksi seperti “{selectedAgent.examplePrompt}”. {selectedAgent.name} akan mencari evidence yang relevan dan menjelaskan hasilnya.<Button type="button" variant="outline" size="sm" className="mt-3" disabled={!conversation} onClick={() => setMessage(selectedAgent.examplePrompt)}>Gunakan contoh instruksi</Button></div>}
                {conversation?.messages.map((item) => <div key={item.message_id} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`min-w-0 max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[90%] ${item.role === 'user' ? 'whitespace-pre-wrap rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md bg-slate-100 text-textPrimary dark:bg-slate-800'}`}>
                  {item.role === 'user' ? item.content : <AgentReply content={item.content} />}
                  {item.metadata?.evidence && <details className="mt-3 border-t border-border pt-2"><summary className="cursor-pointer text-xs font-semibold">Evidence adapter · SYNTHETIC · {item.metadata.evidence.length} record</summary><p className="mt-2 text-xs text-textSecondary">Sumber konteks yang diberikan ke agent, bukan konfirmasi diagnosis.</p><div className="mt-2 space-y-2">{item.metadata.evidence.map((source) => <details key={`${source.dataset}-${source.source_id}`} className="rounded border border-border p-2"><summary className="cursor-pointer break-all text-xs">{source.dataset}: {source.source_id}</summary><dl className="mt-2 text-xs">{Object.entries(source.record).map(([key, value]) => <div key={key} className="break-words"><dt className="inline font-medium">{key}: </dt><dd className="inline">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl></details>)}</div>{item.metadata.limitations?.map((note) => <p key={note} className="mt-2 text-xs text-textSecondary">{note}</p>)}</details>}
                  {item.metadata?.model && <p className="mt-2 text-[10px] text-textSecondary">Model: {item.metadata.model}</p>}
                </div></div>)}
                {(activity === 'preparing' || activity === 'waiting') && <div role="status" className="flex items-center gap-2 text-sm text-textSecondary"><span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500 motion-reduce:animate-none" />{activityLabel}</div>}
                <div ref={bottomRef} />
              </div>
              {error && <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-200">{error}{!conversation && <Button type="button" size="sm" variant="outline" className="ml-2" onClick={() => setSessionVersion((value) => value + 1)}>Coba hubungkan lagi</Button>}</div>}
              <form onSubmit={sendMessage} className="mt-4 flex items-end gap-2 border-t border-border pt-4"><Textarea aria-label={`Instruksi untuk ${selectedAgent.name}`} maxLength={12000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tulis instruksi atau pertanyaan lanjutan…" rows={2} disabled={!conversation || !selectedAgent.available || activity === 'preparing' || activity === 'waiting'} className="min-h-[52px] resize-none dark:bg-slate-900" /><Button type="submit" size="sm" disabled={!message.trim() || !conversation || activity === 'preparing' || activity === 'waiting'} icon={<Send className="h-4 w-4" />} aria-label="Kirim instruksi">Kirim</Button></form>
              <p className="mt-2 text-[11px] leading-5 text-textSecondary">Sesi tiap role dimuat ulang dari backend saat reload. Chat disimpan sementara di memori server, bukan history task persisten. Semua tindakan di chat berupa rekomendasi.</p>
            </div>
            <aside className="rounded-xl border border-border bg-slate-50 p-4"><div className="flex items-center gap-2"><CircleDot className="h-4 w-4 text-indigo-600" /><h3 className="text-sm font-semibold text-textPrimary">Live activity</h3></div><div className="mt-4 flex items-center gap-2 text-sm font-medium text-textPrimary">{activity === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : activity === 'error' ? <Wifi className="h-4 w-4 text-red-600" /> : <Clock3 className="h-4 w-4 text-indigo-600" />}{activityLabel}</div><div className="mt-5"><p className="text-[11px] font-semibold uppercase tracking-wide text-textSecondary">Capabilities</p><div className="mt-2 flex flex-wrap gap-1.5">{selectedAgent.capabilities.map((capability) => <Badge key={capability} variant="secondary">{capability}</Badge>)}</div></div><p className="mt-5 text-[11px] leading-5 text-textSecondary">Status ini berasal dari siklus request ke API conversation, bukan simulasi progres.</p></aside>
          </div>
        </Card>
      </div>
    </div>
  );
}
