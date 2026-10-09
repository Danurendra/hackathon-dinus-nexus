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

// Sample data
const sampleBuildings = [
  { id: 'bldg-a', name: 'Gedung A', x: 25, y: 30, status: 'operational', devices: 45, incidents: 2 },
  { id: 'bldg-b', name: 'Gedung B', x: 75, y: 40, status: 'warning', devices: 32, incidents: 5 },
  { id: 'bldg-c', name: 'Gedung C', x: 50, y: 70, status: 'critical', devices: 28, incidents: 8 },
  { id: 'bldg-d', name: 'Gedung D', x: 20, y: 75, status: 'maintenance', devices: 15, incidents: 0 },
];

const sampleTasks = [
  {
    taskId: 'task-001',
    title: 'Masalah WiFi di Gedung A',
    description: 'Pengguna tidak bisa terhubung ke jaringan WiFi di lantai 2 gedung A',
    status: 'running',
    worker: 'IT Helpdesk',
    createdAt: '2026-10-09 14:30',
    location: 'Gedung A, Lantai 2',
    deviceType: 'WiFi'
  },
  {
    taskId: 'task-002',
    title: 'Reset akun mahasiswa',
    description: 'Mahasiswa ingin reset akun email kampus',
    status: 'completed',
    worker: 'IT Helpdesk',
    createdAt: '2026-10-09 13:15',
    location: 'Kantor IT',
    deviceType: 'Email'
  },
  {
    taskId: 'task-003',
    title: 'Perbaikan printer',
    description: 'Printer di ruang kuliah 3 tidak bisa mencetak',
    status: 'queued',
    worker: 'IT Helpdesk',
    createdAt: '2026-10-09 12:45',
    location: 'Ruang Kuliah 3',
    deviceType: 'Printer'
  }
];

export default function HomePage() {
  const [tasks, setTasks] = useState(sampleTasks);
  const [newTaskDescription, setNewTaskDescription] = useState('');

  const handleCreateTask = (message: string) => {
    if (message.trim()) {
      const newTask = {
        taskId: `task-${tasks.length + 1}`,
        title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
        description: message,
        status: 'queued',
        worker: 'IT Helpdesk',
        createdAt: new Date().toLocaleString(),
        location: 'Tidak ditentukan',
        deviceType: 'Tidak ditentukan'
      };
      
      setTasks([newTask, ...tasks]);
      setNewTaskDescription('');
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
          <Badge variant="success">Online</Badge>
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
            
            <div className="space-y-4">
              {tasks.map(task => (
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
          </Card>

          {/* Chat Input */}
          <Card className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Buat Task Baru</h2>
            <ChatInput 
              onSubmit={handleCreateTask}
              placeholder="Deskripsikan masalah atau permintaan baru..."
            />
          </Card>
        </div>

        {/* Right Column - Campus Map */}
        <div className="space-y-6">
          <CampusMap buildings={sampleBuildings} />
          
          <Card className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Perangkat</h2>
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