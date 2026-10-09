'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TaskCard } from '@/components/workflow/TaskCard';
import { CampusMap } from '@/components/campus-twin/CampusMap';
import { ChatInput } from '@/components/chat/ChatInput';
import { 
  Activity, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Wifi,
  Zap,
  Building
} from 'lucide-react';

type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'waiting_for_approval' | 'cancelled';

interface DashboardTask {
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  worker: string;
  createdAt: string;
  location: string;
  deviceType: string;
  result?: {
    facts?: Array<{ dataset: string; record: Record<string, unknown> }>;
    interpretation?: string[];
    uncertainty?: string[];
    recommendations?: string[];
    evidence?: Array<{ source_id: string; dataset: string }>;
    data_label?: string;
  } | null;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

const sampleBuildings = [
  { id: 'bldg-a', name: 'Gedung A', x: 25, y: 30, status: 'operational', devices: 45, incidents: 2 },
  { id: 'bldg-b', name: 'Gedung B', x: 75, y: 40, status: 'warning', devices: 32, incidents: 5 },
  { id: 'bldg-c', name: 'Gedung C', x: 50, y: 70, status: 'critical', devices: 28, incidents: 8 },
  { id: 'bldg-d', name: 'Gedung D', x: 20, y: 75, status: 'maintenance', devices: 15, incidents: 0 },
];

function mapApiTask(raw: any): DashboardTask {
  return {
    taskId: raw.task_id,
    title: raw.description?.length > 30 ? raw.description.slice(0, 30) + '...' : raw.description,
    description: raw.description,
    status: raw.status,
    worker: raw.worker === 'it_helpdesk' ? 'IT Helpdesk' : raw.worker,
    createdAt: raw.created_at ? new Date(raw.created_at).toLocaleString() : 'Waktu tidak tersedia',
    location: raw.location || 'Tidak ditentukan',
    deviceType: raw.device_type || 'Tidak ditentukan',
    result: raw.result || null,
  };
}

export default function HomePage() {
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [apiError, setApiError] = useState('');

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/history`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Backend merespons HTTP ${response.status}`);
      const data = await response.json();
      setTasks((data.items || []).map(mapApiTask));
      setApiError('');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Backend tidak dapat dihubungi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const handleCreateTask = async (message: string) => {
    if (!message.trim() || isCreating) return;
    setIsCreating(true);
    setApiError('');
    try {
      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker: 'it_helpdesk', description: message.trim() }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        const messageFromApi = detail?.detail?.error?.message || detail?.detail || `Gagal membuat task (HTTP ${response.status})`;
        throw new Error(typeof messageFromApi === 'string' ? messageFromApi : JSON.stringify(messageFromApi));
      }
      const created = mapApiTask(await response.json());
      setTasks((current) => [created, ...current.filter((task) => task.taskId !== created.taskId)]);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Task gagal dibuat');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Selamat datang di DinusNexus</p>
        </div>
        <div className="flex space-x-2">
          <Badge variant={apiError ? "warning" : "success"}>{apiError ? "Backend offline" : "API connected"}</Badge>
          <Badge variant="info">IT Helpdesk</Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Task</p>
              <p className="text-2xl font-semibold text-gray-900">{tasks.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Selesai</p>
              <p className="text-2xl font-semibold text-gray-900">
                {tasks.filter(t => t.status === 'completed').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Dalam Proses</p>
              <p className="text-2xl font-semibold text-gray-900">
                {tasks.filter(t => t.status === 'running').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Kesalahan</p>
              <p className="text-2xl font-semibold text-gray-900">
                {tasks.filter(t => t.status === 'failed').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Task Terbaru</h2>
              <Button variant="outline" size="sm">Lihat Semua</Button>
            </div>
            
            <div>
              {apiError && (
                <div role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-semibold">Backend belum tersambung</p>
                  <p>{apiError}</p>
                  <p className="mt-1">Jalankan FastAPI di port 8000. Task kini dimuat dari API, bukan data contoh.</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => { setIsLoading(true); void loadHistory(); }}>Coba lagi</Button>
                </div>
              )}
              <div className="space-y-4">
              {isLoading ? <p className="py-6 text-center text-sm text-gray-500">Memuat task dari backend...</p> : tasks.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">Belum ada task di backend. Kirim laporan di bawah untuk memulai.</p> : tasks.map(task => (
                <TaskCard
                  key={task.taskId}
                  taskId={task.taskId}
                  title={task.title}
                  description={task.description}
                  status={task.status}
                  worker={task.worker}
                  createdAt={task.createdAt}
                  location={task.location}
                  deviceType={task.deviceType}
                />
              ))}
              </div>
            </div>
          </Card>

          {/* Chat Input */}
          <Card className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Buat Task Baru</h2>
            <ChatInput 
              onSubmit={handleCreateTask}
              isLoading={isCreating}
              placeholder="Contoh: WiFi tidak bisa dipakai di Gedung A, lantai 2..."
            />
          </Card>
        </div>

        {/* Right Column - Campus Map */}
        <div className="space-y-6">
          <CampusMap buildings={sampleBuildings} />
          
          <Card className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Status Perangkat</h2><p className="mb-3 text-xs text-amber-700">Simulasi UI — belum terhubung ke telemetry live.</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Wifi className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-sm">WiFi Network</span>
                </div>
                <Badge variant="success">Operational</Badge>
              </div>
              
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Zap className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-sm">Power Supply</span>
                </div>
                <Badge variant="warning">Warning</Badge>
              </div>
              
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Building className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-sm">Server Room</span>
                </div>
                <Badge variant="success">Operational</Badge>
              </div>
              
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-sm">Access Control</span>
                </div>
                <Badge variant="success">Operational</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}