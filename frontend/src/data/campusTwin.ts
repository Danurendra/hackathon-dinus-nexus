export type CampusStatus = 'operational' | 'attention' | 'critical' | 'maintenance';

export interface CampusBuilding {
  id: string;
  name: string;
  role: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  status: CampusStatus;
  workers: string[];
  incidents: number;
}

export interface CampusWorker {
  id: string;
  name: string;
  role: string;
  buildingId: string;
  status: 'idle' | 'working' | 'error';
  x: number;
  y: number;
}

// Visual fixture only. Operational state comes from the task API, not this map.
export const campusBuildings: CampusBuilding[] = [
  { id: 'building-A', name: 'Gedung Akademik', role: 'Perkuliahan', description: 'Ruang kelas dan laboratorium pembelajaran.', x: 18, y: 29, width: 18, height: 13, color: '#DBEAFE', status: 'attention', workers: ['IT Helpdesk Worker'], incidents: 2 },
  { id: 'building-B', name: 'Gedung Admissions', role: 'Penerimaan Mahasiswa', description: 'Layanan informasi dan proses penerimaan.', x: 43, y: 18, width: 17, height: 12, color: '#FEF3C7', status: 'operational', workers: ['Campus Operations Worker'], incidents: 0 },
  { id: 'building-C', name: 'Gedung Finance', role: 'Keuangan', description: 'Layanan administrasi keuangan kampus.', x: 70, y: 27, width: 16, height: 12, color: '#FCE7D5', status: 'operational', workers: ['Campus Operations Worker'], incidents: 0 },
  { id: 'it-operations', name: 'IT Operations', role: 'Infrastruktur Digital', description: 'Pusat pengelolaan jaringan dan perangkat.', x: 33, y: 58, width: 19, height: 14, color: '#E0E7FF', status: 'critical', workers: ['Network Operations Worker', 'IT Helpdesk Worker'], incidents: 3 },
  { id: 'security-operations', name: 'Security Operations', role: 'Keamanan Kampus', description: 'Monitoring keamanan dan respons insiden.', x: 64, y: 59, width: 19, height: 13, color: '#E2E8F0', status: 'operational', workers: ['Security Analysis Worker'], incidents: 0 },
  { id: 'digital-library', name: 'Digital Library', role: 'Arsip Digital', description: 'Koleksi pengetahuan dan arsip digital.', x: 13, y: 70, width: 17, height: 12, color: '#DCFCE7', status: 'operational', workers: ['Digital Archive Worker'], incidents: 0 },
  { id: 'quality-assurance', name: 'Quality Assurance', role: 'Mutu Akademik', description: 'Pusat evaluasi dan peningkatan mutu.', x: 76, y: 76, width: 16, height: 11, color: '#F3E8FF', status: 'maintenance', workers: ['Quality Assurance Worker'], incidents: 1 },
];

export const campusWorkers: CampusWorker[] = [
  { id: 'worker-helpdesk', name: 'IT Helpdesk', role: 'Triase incident', buildingId: 'it-operations', status: 'working', x: 43, y: 53 },
  { id: 'worker-network', name: 'Network Ops', role: 'Observasi jaringan', buildingId: 'it-operations', status: 'working', x: 50, y: 67 },
  { id: 'worker-security', name: 'Security Analysis', role: 'Monitoring keamanan', buildingId: 'security-operations', status: 'idle', x: 74, y: 54 },
];
