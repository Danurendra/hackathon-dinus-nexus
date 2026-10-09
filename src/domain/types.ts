// Domain types for campus data

export interface CampusBuilding {
  id: string;
  name: string;
  location: string;
  floors: number;
  zones: string[];
}

export interface CampusZone {
  id: string;
  name: string;
  buildingId: string;
  type: 'lab' | 'classroom' | 'common-area' | 'office' | 'storage';
  capacity: number;
}

export interface CampusDevice {
  id: string;
  name: string;
  type: 'access-point' | 'switch' | 'router' | 'gateway' | 'server' | 'printer';
  zoneId: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSeen: string;
  ipAddress?: string;
  macAddress?: string;
}

export interface DeviceEvent {
  id: string;
  deviceId: string;
  eventType: 'connected' | 'disconnected' | 'error' | 'warning' | 'info';
  timestamp: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reportedBy: string;
  reportedAt: string;
  resolvedAt?: string;
  affectedDevices: string[];
  zoneId?: string;
  buildingId?: string;
}

export interface ToolResult<T> {
  status: "ok" | "failed";
  sourceId: string;
  observedAt: string;
  retrievedAt: string;
  simulation: true;
  label: "SIMULATED DATA";
  data: T | null;
  error?: { 
    code: string; 
    message: string; 
  };
}

export interface LlmRequest {
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmResponse {
  id: string;
  choices: Array<{
    message: { role: 'assistant'; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ProviderMeta {
  provider: string;
  model: string;
  baseUrl: string;
  degraded?: boolean;
}