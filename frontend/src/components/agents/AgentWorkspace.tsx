'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, CircleDot, Clock3, Send, Sparkles, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';

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
}

interface AgentConversation {
  conversation_id: string;
  messages: AgentMessage[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_DINUSNEXUS_API_KEY;

const agents: Agent[] = [
  {
    id: 'it_helpdesk',
    name: 'IT Helpdesk Agent',
    role: 'Incident investigation',
    description: 'Menganalisis laporan gangguan IT, mencari evidence, dan menyusun rekomendasi tindak lanjut.',
    examplePrompt: 'Wi-Fi di Gedung Akademik tidak terhubung',
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

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? agents[0],
    [selectedAgentId],
  );
  const apiHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
  };

  useEffect(() => {
    void createConversation();
  }, [selectedAgentId]);

  async function createConversation() {
    setError(undefined);
    try {
      const response = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ worker: selectedAgentId, title: `${selectedAgent.name} session` }),
      });
      if (!response.ok) throw new Error('Conversation agent gagal dibuat.');
      const created = (await response.json()) as { conversation_id: string; messages: AgentMessage[] };
      setConversation({ conversation_id: created.conversation_id, messages: created.messages ?? [] });
    } catch (conversationError) {
      setError(conversationError instanceof Error ? conversationError.message : 'Agent tidak dapat dihubungkan.');
    }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if (!content || !conversation || !selectedAgent.available || activity === 'preparing' || activity === 'waiting') return;

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
      const response = await fetch(`${API_BASE_URL}/api/conversations/${conversation.conversation_id}/messages`, {
        method: 'POST',
        headers: apiHeaders,
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
      setConversation((current) => current ? { ...current, messages: [...current.messages, assistantMessage] } : current);
      setActivity('completed');
    } catch (sendError) {
      setActivity('error');
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
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap gap-2"><Badge variant="primary">AI AGENTS</Badge><Badge variant="success">LIVE ACTIVITY</Badge></div>
        <h1 className="text-3xl font-bold tracking-tight text-textPrimary">AI Agent workspace</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-textSecondary">Pilih agent, kirim instruksi, dan ikuti status eksekusinya. Aktivitas di bawah berubah berdasarkan request yang sedang diproses.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          {agents.map((agent) => (
            <button key={agent.id} type="button" onClick={() => agent.available && setSelectedAgentId(agent.id)} className={`w-full rounded-xl border p-4 text-left transition ${selectedAgentId === agent.id ? 'border-indigo-300 bg-indigo-50 shadow-sm' : 'border-border bg-white hover:border-indigo-200'} ${!agent.available ? 'cursor-not-allowed opacity-65' : ''}`}>
              <div className="flex items-start justify-between gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${agent.available ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Bot className="h-5 w-5" /></span><Badge variant={agent.available ? 'success' : 'secondary'}>{agent.available ? 'AVAILABLE' : 'PLANNED'}</Badge></div>
              <h2 className="mt-3 font-semibold text-textPrimary">{agent.name}</h2>
              <p className="mt-1 text-xs font-medium text-indigo-600">{agent.role}</p>
              <p className="mt-2 text-xs leading-5 text-textSecondary">{agent.description}</p>
            </button>
          ))}
        </div>

        <Card className="min-h-[620px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-slate-50/80 px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><Bot className="h-5 w-5" /></span><div><h2 className="font-semibold text-textPrimary">{selectedAgent.name}</h2><p className="text-xs text-textSecondary">{selectedAgent.description}</p></div></div><span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Connected</span></div>
          <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="flex min-h-[470px] flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto">
                {!conversation?.messages.length && <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-5 text-sm text-textSecondary"><div className="mb-2 flex items-center gap-2 font-semibold text-indigo-700"><Sparkles className="h-4 w-4" /> Agent siap membantu</div>Kirim instruksi seperti “{selectedAgent.examplePrompt}”. {selectedAgent.name} akan mencari evidence yang relevan dan menjelaskan hasilnya.</div>}
                {conversation?.messages.map((item) => <div key={item.message_id} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === 'user' ? 'rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md bg-slate-100 text-textPrimary'}`}>{item.content}</div></div>)}
                {(activity === 'preparing' || activity === 'waiting') && <div className="flex items-center gap-2 text-sm text-textSecondary"><span className="flex gap-1"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500 [animation-delay:150ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500 [animation-delay:300ms]" /></span>{activityLabel}</div>}
              </div>
              {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
              <form onSubmit={sendMessage} className="mt-4 flex items-end gap-2 border-t border-border pt-4"><Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tulis instruksi untuk agent..." rows={2} disabled={!conversation || !selectedAgent.available || activity === 'preparing' || activity === 'waiting'} className="min-h-[52px] resize-none" /><Button type="submit" size="sm" disabled={!message.trim() || !conversation || activity === 'preparing' || activity === 'waiting'} icon={<Send className="h-4 w-4" />} aria-label="Kirim instruksi">Kirim</Button></form>
            </div>
            <aside className="rounded-xl border border-border bg-slate-50 p-4"><div className="flex items-center gap-2"><CircleDot className="h-4 w-4 text-indigo-600" /><h3 className="text-sm font-semibold text-textPrimary">Live activity</h3></div><div className="mt-4 flex items-center gap-2 text-sm font-medium text-textPrimary">{activity === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : activity === 'error' ? <Wifi className="h-4 w-4 text-red-600" /> : <Clock3 className="h-4 w-4 text-indigo-600" />}{activityLabel}</div><div className="mt-5"><p className="text-[11px] font-semibold uppercase tracking-wide text-textSecondary">Capabilities</p><div className="mt-2 flex flex-wrap gap-1.5">{selectedAgent.capabilities.map((capability) => <Badge key={capability} variant="secondary">{capability}</Badge>)}</div></div><p className="mt-5 text-[11px] leading-5 text-textSecondary">Status ini berasal dari siklus request ke API conversation, bukan simulasi progres.</p></aside>
          </div>
        </Card>
      </div>
    </div>
  );
}
