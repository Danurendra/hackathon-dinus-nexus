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
  ShieldAlert,
  Check,
  X,
  Layers,
  Bot,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChatInput } from '@/components/chat/ChatInput';
import { ExecutionTimeline } from '@/components/workflow/ExecutionTimeline';
import { CampusMap } from '@/components/campus-twin/CampusMap';
import { apiFetch } from '@/lib/api';

type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'waiting_for_approval' | 'cancelled';

interface Task {
  task_id: string;
  run_id: string;
  worker: string;
  description: string;
  location?: string;
  device_type?: string;
  requested_action?: string;
  status: TaskStatus;
  created_at: string;
  steps: Array<{
    step_id: string;
    name: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying' | 'waiting_for_approval';
    source_ids?: string[];
    detail?: string;
  }>;
  result?: {
    facts: Array<{ dataset: string; record: Record<string, unknown> }>;
    interpretation: string[];
    uncertainty: string[];
    recommendations: string[];
    evidence: Array<{ source_id: string; dataset: string }>;
    data_label: string;
    approval?: { required?: boolean; status?: string; action?: string; note?: string };
  };
  error?: { code: string; message: string };
  approval?: { required?: boolean; status?: string; action?: string; note?: string };
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
  if (status === 'waiting_for_approval') return 'warning';
  return 'secondary';
}

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>();
  const [activeRightTab, setActiveRightTab] = useState<'tasks' | 'chat'>('tasks');
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
      const [taskResponse, convResponse] = await Promise.all([
        apiFetch('/api/history'),
        apiFetch('/api/conversations'),
      ]);
      const errors: string[] = [];

      if (taskResponse.ok) {
        const taskData = (await taskResponse.json()) as { items: Task[] };
        setTasks(taskData.items);
        setSelectedTaskId((current) => current ?? taskData.items[0]?.task_id);
      } else {
        setTasks([]);
        errors.push(
          taskResponse.status === 503
            ? 'Database belum aktif. Task dan history belum tersedia.'
            : 'History task tidak dapat dimuat.',
        );
      }

      if (convResponse.ok) {
        const convData = (await convResponse.json()) as Conversation[];
        setConversations(convData);
        setSelectedConversationId((current) => current ?? convData[0]?.conversation_id);
      } else {
        setConversations([]);
        errors.push('History percakapan tidak dapat dimuat.');
      }

      setError(errors.length > 0 ? errors.join(' ') : undefined);
    } catch (loadError) {
      setError(loadError instanceof Error ? `Backend tidak dapat dihubungi: ${loadError.message}` : 'Backend tidak dapat dihubungi.');
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
      const response = await apiFetch('/api/tasks', {
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
      setActiveRightTab('tasks');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Task gagal dibuat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedConversationId || !message.trim()) return;

    const userMessage: Message = {
      message_id: `user-${Date.now()}`,
      conversation_id: selectedConversationId,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };

    // Optimistically update conversation so user message is visible immediately
    setConversations((prev) =>
      prev.map((conv) =>
        conv.conversation_id === selectedConversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              updated_at: userMessage.created_at,
            }
          : conv,
      ),
    );

    setIsSubmitting(true);
    setError(undefined);

    try {
      const response = await apiFetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
        }),
      });

      if (!response.ok) {
        let errDetail = 'Pesan gagal dikirim.';
        try {
          const errBody = await response.json();
          if (errBody?.detail) errDetail = errBody.detail;
        } catch {}
        throw new Error(errDetail);
      }

      const newMessage = (await response.json()) as Message;

      // Update conversation with assistant response
      setConversations((prev) =>
        prev.map((conv) =>
          conv.conversation_id === selectedConversationId
            ? {
                ...conv,
                messages: [...conv.messages, newMessage],
                updated_at: newMessage.created_at,
              }
            : conv,
        ),
      );
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Gagal mengirim pesan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateConversation = async () => {
    try {
      const response = await apiFetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker: 'it_helpdesk',
          title: 'Percakapan baru',
        }),
      });

      if (!response.ok) throw new Error('Percakapan gagal dibuat.');

      const newConversation = (await response.json()) as Conversation;

      setConversations((prev) => [newConversation, ...prev]);
      setSelectedConversationId(newConversation.conversation_id);
      setActiveRightTab('chat');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Gagal membuat percakapan.');
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const response = await apiFetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Gagal menghapus percakapan.');

      setConversations((prev) => {
        const next = prev.filter((item) => item.conversation_id !== conversationId);
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(next[0]?.conversation_id);
        }
        return next;
      });
    } catch (delError) {
      setError(delError instanceof Error ? delError.message : 'Gagal menghapus percakapan.');
    }
  };

  const handleApproval = async (taskId: string, decision: 'approve' | 'reject') => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      const response = await apiFetch(`/api/tasks/${taskId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) throw new Error('Approval gagal diproses.');
      const updated = (await response.json()) as Task;
      setTasks((prev) => prev.map((t) => (t.task_id === updated.task_id ? updated : t)));
    } catch (apprErr) {
      setError(apprErr instanceof Error ? apprErr.message : 'Gagal memproses approval.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const activeCount = tasks.filter((task) => task.status === 'running' || task.status === 'queued' || task.status === 'waiting_for_approval').length;
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)]">
        {/* Left Column: Input and Task List */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Buat laporan baru</h2>
                <p className="text-sm text-gray-500">Contoh: Wi-Fi putus di Laboratorium Komputer 1.</p>
              </div>
              <Wifi className="h-5 w-5 text-indigo-600" />
            </div>
            <ChatInput onSubmit={handleCreateTask} isLoading={isSubmitting} />
            <p className="mt-3 text-xs text-gray-500">Data perangkat dan insiden pada workspace ini menggunakan data ilustrasi untuk analisis awal.</p>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Task &amp; history</h2>
                <p className="text-sm text-gray-500">Klik task untuk melihat timeline investigasi dan bukti.</p>
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
                    onClick={() => {
                      setSelectedTaskId(task.task_id);
                      setActiveRightTab('tasks');
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition ${selectedTask?.task_id === task.task_id ? 'border-indigo-500 bg-indigo-50/70 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
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

        {/* Right Column: Tabbed Task Investigation & AI Assistant */}
        <div className="space-y-4">
          <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setActiveRightTab('tasks')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
                activeRightTab === 'tasks' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Detail Investigasi &amp; Timeline</span>
              {selectedTask && <Badge variant={statusVariant(selectedTask.status)}>{selectedTask.status}</Badge>}
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab('chat')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
                activeRightTab === 'chat' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>AI Assistant</span>
              <Badge variant="secondary">{conversations.length}</Badge>
            </button>
          </div>

          {activeRightTab === 'tasks' ? (
            selectedTask ? (
              <div className="space-y-4">
                {/* Task Details Header */}
                <Card className="p-4 border-indigo-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase text-indigo-600">{selectedTask.worker}</span>
                        <span className="text-xs text-gray-400">· {selectedTask.task_id}</span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">{selectedTask.description}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                        {selectedTask.location && <span>Lokasi: <strong>{selectedTask.location}</strong></span>}
                        {selectedTask.device_type && <span>Perangkat: <strong>{selectedTask.device_type}</strong></span>}
                        <span>Dibuat: {formatDate(selectedTask.created_at)}</span>
                      </div>
                    </div>
                    <Badge variant={statusVariant(selectedTask.status)}>{selectedTask.status}</Badge>
                  </div>

                  {/* Approval Gate */}
                  {selectedTask.status === 'waiting_for_approval' && (
                    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-amber-900">Menunggu Otorisasi Manusia (Approval Gate)</h4>
                          <p className="mt-1 text-xs text-amber-800">
                            Aksi sensitif <code>{selectedTask.requested_action}</code> membutuhkan persetujuan operator sebelum workflow melanjutkan eksekusi.
                          </p>
                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApproval(selectedTask.task_id, 'approve')}
                              disabled={isSubmitting}
                            >
                              <Check className="mr-1.5 h-3.5 w-3.5" /> Setujui (Approve)
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleApproval(selectedTask.task_id, 'reject')}
                              disabled={isSubmitting}
                            >
                              <X className="mr-1.5 h-3.5 w-3.5" /> Tolak &amp; Batalkan
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Execution Timeline */}
                <ExecutionTimeline
                  steps={selectedTask.steps.map((step) => ({
                    id: step.step_id,
                    name: step.name,
                    status: (step.status as any) || 'queued',
                    sourceIds: step.source_ids,
                  }))}
                />

                {/* Result Card */}
                {selectedTask.result && <ResultCard task={selectedTask} />}
              </div>
            ) : (
              <Card className="p-8 text-center text-sm text-gray-500">
                <FileSearch className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                Pilih salah satu task di sebelah kiri untuk melihat alur eksekusi dan bukti investigasi.
              </Card>
            )
          ) : (
            <div className="space-y-4">
              {/* Conversations Accordion / Selector */}
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">Daftar Percakapan</h2>
                  <Button variant="outline" size="sm" onClick={handleCreateConversation}>
                    + Percakapan Baru
                  </Button>
                </div>
                {conversations.length === 0 ? (
                  <p className="text-xs text-gray-500 py-3 text-center">Belum ada percakapan. Buat percakapan baru untuk mulai bertanya ke AI.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {conversations.map((conv) => (
                      <div
                        key={conv.conversation_id}
                        onClick={() => setSelectedConversationId(conv.conversation_id)}
                        className={`flex items-center justify-between rounded-lg p-2.5 text-xs cursor-pointer transition ${
                          selectedConversation?.conversation_id === conv.conversation_id
                            ? 'bg-indigo-50 text-indigo-900 font-medium border border-indigo-200'
                            : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                        }`}
                      >
                        <span className="truncate flex-1">{conv.title} ({conv.messages.length} pesan)</span>
                        <button
                          type="button"
                          aria-label="Hapus percakapan"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteConversation(conv.conversation_id);
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-red-600 rounded transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Chat View */}
              {selectedConversation ? (
                <Card className="p-4">
                  <div className="mb-3 flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-indigo-600" />
                      <h3 className="font-semibold text-sm text-gray-900">{selectedConversation.title}</h3>
                    </div>
                    <Badge variant="info">IT Helpdesk</Badge>
                  </div>

                  <div className="space-y-3 max-h-[380px] overflow-y-auto mb-4 p-2">
                    {selectedConversation.messages.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-8">Kirim pesan pertama Anda untuk mulai berkonsultasi.</p>
                    ) : (
                      selectedConversation.messages.map((msg) => (
                        <div
                          key={msg.message_id}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-5 ${
                              msg.role === 'user'
                                ? 'rounded-br-none bg-indigo-600 text-white'
                                : 'rounded-bl-none bg-gray-100 text-gray-800'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            {msg.metadata?.tokens_used && (
                              <p className="mt-1 text-[10px] opacity-70">
                                {msg.metadata.tokens_used.input} in / {msg.metadata.tokens_used.output} out
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
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
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </Card>
  );
}

function ResultCard({ task }: { task: Task }) {
  const result = task.result;
  if (!result) return null;
  return (
    <Card className="p-4 border-indigo-100">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Hasil Analisis &amp; Investigasi</h2>
          <p className="text-xs text-gray-500">Task {task.task_id}</p>
        </div>
        <Badge variant="warning">{result.data_label}</Badge>
      </div>
      <ResultSection
        title="Temuan / fakta"
        items={result.facts.map((item) => `${item.dataset}: ${String(item.record.name ?? item.record.title ?? item.record.id)}`)}
      />
      <ResultSection title="Interpretasi workflow" items={result.interpretation} />
      <ResultSection title="Ketidakpastian" items={result.uncertainty} tone="warning" />
      <ResultSection title="Rekomendasi" items={result.recommendations} />
      <div className="mt-4 border-t border-gray-100 pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Evidence</p>
        <div className="flex flex-wrap gap-2">
          {result.evidence.map((item) => (
            <span key={item.source_id} className="inline-flex items-center gap-1 text-xs text-indigo-700 font-medium">
              <ExternalLink className="h-3 w-3" />
              {item.source_id} ({item.dataset})
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ResultSection({ title, items, tone = 'default' }: { title: string; items: string[]; tone?: 'default' | 'warning' }) {
  return (
    <div className="mb-4">
      <p className={`mb-1 text-xs font-semibold uppercase tracking-wider ${tone === 'warning' ? 'text-amber-800' : 'text-gray-700'}`}>
        {title}
      </p>
      <ul className="space-y-1 text-xs text-gray-600">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
