'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock3,
  ExternalLink,
  FileSearch,
  RefreshCw,
  Wifi,
  MessageSquare,
  Send,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChatInput } from '@/components/chat/ChatInput';
import { ExecutionTimeline } from '@/components/workflow/ExecutionTimeline';
import { CampusMap } from '@/components/campus-twin/CampusMap';

type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';

interface Task {
  task_id: string;
  run_id: string;
  worker: string;
  description: string;
  location?: string;
  device_type?: string;
  status: TaskStatus;
  created_at: string;
  steps: Array<{
    step_id: string;
    name: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying';
    source_ids?: string[];
  }>;
  result?: {
    facts: Array<{ dataset: string; record: Record<string, unknown> }>;
    interpretation: string[];
    uncertainty: string[];
    recommendations: string[];
    evidence: Array<{ source_id: string; dataset: string }>;
    data_label: string;
  };
  error?: { code: string; message: string };
}

// Conversation types
interface Message {
  message_id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: {
    tokens_used?: { input: number; output: number };
    model?: string;
    sources?: string[];
    intent?: string;
  };
}

interface Conversation {
  conversation_id: string;
  worker: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusVariant(status: TaskStatus) {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'running') return 'info';
  return 'warning';
}

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const selectedTask = useMemo(
    () => tasks.find((task) => task.task_id === selectedTaskId) ?? tasks[0],
    [selectedTaskId, tasks],
  );

  const selectedConversation = useMemo(
    () => conversations.find((conv) => conv.conversation_id === selectedConversationId) ?? conversations[0],
    [selectedConversationId, conversations],
  );

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load tasks
      const taskResponse = await fetch(`${API_BASE_URL}/api/history`);
      if (!taskResponse.ok) throw new Error('History task tidak dapat dimuat.');
      const taskData = (await taskResponse.json()) as { items: Task[] };
      setTasks(taskData.items);
      setSelectedTaskId((current) => current ?? taskData.items[0]?.task_id);

      // Load conversations
      const convResponse = await fetch(`${API_BASE_URL}/api/conversations`);
      if (!convResponse.ok) throw new Error('History percakapan tidak dapat dimuat.');
      const convData = (await convResponse.json()) as Conversation[];
      setConversations(convData);
      setSelectedConversationId((current) => current ?? convData[0]?.conversation_id);
      
      setError(undefined);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat history.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleCreateTask = async (
    message: string,
    attachments: File[] = [],
    context?: { worker: 'it_helpdesk'; location?: string; deviceType?: string },
  ) => {
    if (attachments.length > 0) {
      setError('Lampiran belum terhubung ke parser backend. Kirim deskripsi teks tanpa lampiran.');
      return;
    }
    setIsSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker: context?.worker ?? 'it_helpdesk',
          description: message,
          location: context?.location,
          device_type: context?.deviceType,
        }),
      });
      if (!response.ok) throw new Error('Task gagal diproses oleh workflow.');
      const task = (await response.json()) as Task;
      setTasks((current) => [task, ...current.filter((item) => item.task_id !== task.task_id)]);
      setSelectedTaskId(task.task_id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Task gagal dibuat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedConversationId || !message.trim()) return;
    
    setIsSubmitting(true);
    setError(undefined);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
        }),
      });
      
      if (!response.ok) throw new Error('Pesan gagal dikirim.');
      
      const newMessage = (await response.json()) as Message;
      
      // Update conversation with new message
      setConversations(prev => prev.map(conv => 
        conv.conversation_id === selectedConversationId
          ? {
              ...conv,
              messages: [...conv.messages, newMessage],
              updated_at: newMessage.created_at
            }
          : conv
      ));
      
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Gagal mengirim pesan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateConversation = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker: 'it_helpdesk',
          title: 'Percakapan baru',
        }),
      });
      
      if (!response.ok) throw new Error('Percakapan gagal dibuat.');
      
      const newConversation = (await response.json()) as Conversation;
      
      setConversations(prev => [newConversation, ...prev]);
      setSelectedConversationId(newConversation.conversation_id);
      
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Gagal membuat percakapan.');
    }
  };

  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const activeCount = tasks.filter((task) => task.status === 'running' || task.status === 'queued').length;
  const failedCount = tasks.filter((task) => task.status === 'failed').length;

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/80 px-5 py-6 shadow-sm md:px-7 md:py-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="primary">WORKSPACE</Badge>
            <Badge variant="info">IT Helpdesk Worker</Badge>
          </div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Command Center</p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Helpdesk operations workspace</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Buat laporan, telusuri evidence operasional, dan pantau hasil workflow dari satu workspace.</p>
        </div>
        <div className="relative flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadHistory()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh history
          </Button>
          <Button variant="primary" size="sm" onClick={handleCreateConversation}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Percakapan Baru
          </Button>
        </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void loadHistory()}>Coba lagi</Button>
        </div>
      )}

      <CampusMap />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Metric icon={<Activity className="h-5 w-5 text-blue-600" />} label="Total task" value={tasks.length} />
        <Metric icon={<CheckCircle className="h-5 w-5 text-green-600" />} label="Selesai" value={completedCount} />
        <Metric icon={<Clock3 className="h-5 w-5 text-yellow-600" />} label="Aktif" value={activeCount} />
        <Metric icon={<AlertTriangle className="h-5 w-5 text-red-600" />} label="Gagal" value={failedCount} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Buat laporan baru</h2>
                <p className="text-sm text-gray-500">Contoh: Wi-Fi putus di Laboratorium Komputer 1.</p>
              </div>
              <Wifi className="h-5 w-5 text-cyan-600" />
            </div>
            <ChatInput onSubmit={handleCreateTask} isLoading={isSubmitting} />
            <p className="mt-3 text-xs text-gray-500">Data perangkat dan insiden pada workspace ini menggunakan data ilustrasi untuk analisis awal.</p>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Task & history</h2>
                <p className="text-sm text-gray-500">Persistensi saat ini berlaku selama proses API berjalan.</p>
              </div>
              <Badge variant="secondary">{tasks.length} task</Badge>
            </div>
            {isLoading && tasks.length === 0 ? (
              <div className="flex items-center gap-2 py-8 text-sm text-gray-500"><RefreshCw className="h-4 w-4 animate-spin" /> Memuat history...</div>
            ) : tasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">Belum ada task. Buat laporan pertama untuk memulai workflow.</div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <button
                    key={task.task_id}
                    type="button"
                    onClick={() => setSelectedTaskId(task.task_id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${selectedTask?.task_id === task.task_id ? 'border-cyan-400 bg-cyan-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{task.description}</p>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(task.created_at)} · {task.task_id.slice(0, 8)}</p>
                      </div>
                      <Badge variant={statusVariant(task.status)}>{task.status}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Percakapan</h2>
                <p className="text-sm text-gray-500">Berdasarkan AI assistant untuk bantuan IT Helpdesk</p>
              </div>
              <Badge variant="secondary">{conversations.length} percakapan</Badge>
            </div>
            {isLoading && conversations.length === 0 ? (
              <div className="flex items-center gap-2 py-8 text-sm text-gray-500"><RefreshCw className="h-4 w-4 animate-spin" /> Memuat percakapan...</div>
            ) : conversations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">Belum ada percakapan. Buat percakapan baru untuk mulai berinteraksi dengan AI.</div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.conversation_id}
                    type="button"
                    onClick={() => setSelectedConversationId(conv.conversation_id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${selectedConversation?.conversation_id === conv.conversation_id ? 'border-cyan-400 bg-cyan-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{conv.title}</p>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(conv.updated_at)} · {conv.messages.length} pesan</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Delete conversation logic would go here
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {selectedConversation ? (
            <Card className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
                <Badge variant="info">IT Helpdesk</Badge>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                {selectedConversation.messages.map((msg) => (
                  <div 
                    key={msg.message_id} 
                    className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
                        {msg.role === 'user' ? 'U' : 'AI'}
                      </div>
                      <div>
                        <p className="text-sm">{msg.content}</p>
                        {msg.metadata?.tokens_used && (
                          <p className="text-xs text-gray-500 mt-1">
                            {msg.metadata.tokens_used.input} tokens input, {msg.metadata.tokens_used.output} tokens output
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <ChatInput 
                onSubmit={handleSendMessage} 
                isLoading={isSubmitting} 
                placeholder="Tulis pesan ke AI assistant..."
              />
            </Card>
          ) : (
            <Card className="p-8 text-center text-sm text-gray-500">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-gray-400" />
              Pilih atau buat percakapan untuk berinteraksi dengan AI.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="rounded-lg bg-gray-100 p-2">{icon}</div>
      <div><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-semibold text-gray-900">{value}</p></div>
    </Card>
  );
}

function ResultCard({ task }: { task: Task }) {
  const result = task.result;
  if (!result) return null;
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div><h2 className="font-semibold text-gray-900">Hasil analisis</h2><p className="text-xs text-gray-500">Task {task.task_id}</p></div>
        <Badge variant="warning">{result.data_label}</Badge>
      </div>
      <ResultSection title="Temuan / fakta" items={result.facts.map((item) => `${item.dataset}: ${String(item.record.name ?? item.record.title ?? item.record.id)}`)} />
      <ResultSection title="Interpretasi workflow" items={result.interpretation} />
      <ResultSection title="Ketidakpastian" items={result.uncertainty} tone="warning" />
      <ResultSection title="Rekomendasi" items={result.recommendations} />
      <div className="mt-4 border-t border-gray-100 pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Evidence</p>
        <div className="flex flex-wrap gap-2">{result.evidence.map((item) => <span key={item.source_id} className="inline-flex items-center gap-1 text-xs text-cyan-700"><ExternalLink className="h-3 w-3" />{item.source_id}</span>)}</div>
      </div>
    </Card>
  );
}

function ResultSection({ title, items, tone = 'default' }: { title: string; items: string[]; tone?: 'default' | 'warning' }) {
  return (
    <div className="mb-4">
      <p className={`mb-1 text-sm font-medium ${tone === 'warning' ? 'text-amber-700' : 'text-gray-700'}`}>{title}</p>
      <ul className="space-y-1 text-sm text-gray-600">{items.map((item, index) => <li key={`${title}-${index}`} className="flex gap-2"><span>•</span><span>{item}</span></li>)}</ul>
    </div>
  );
}
