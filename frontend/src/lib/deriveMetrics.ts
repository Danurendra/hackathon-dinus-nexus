/**
 * Derive operational metrics from backend datasets.
 *
 * This module calculates metrics from src/data/*.json files
 * to ensure frontend displays verified, non-fabricated numbers.
 *
 * All calculations are deterministic and transparent.
 */

import devices from '../../../src/data/devices.json';
import incidents from '../../../src/data/incidents.json';
import zones from '../../../src/data/zones.json';
import buildings from '../../../src/data/buildings.json';

/** Device status counts */
export interface DeviceMetrics {
  total: number;
  online: number;
  offline: number;
  maintenance: number;
  /** Strict uptime: online / total */
  uptimeStrict: number;
  /** Weighted uptime: (online + 0.5 * maintenance) / total */
  uptimeWeighted: number;
  /** Access point count */
  accessPoints: number;
  /** Offline access points */
  offlineAccessPoints: number;
}

/** Incident metrics */
export interface IncidentMetrics {
  total: number;
  active: number; // open + investigating + maintenance
  resolved: number;
  byBuilding: Record<string, number>;
  byZone: Record<string, number>;
}

/** Zone metrics */
export interface ZoneMetrics {
  total: number;
  totalCapacity: number;
  byBuilding: Record<string, { count: number; capacity: number }>;
}

/** Building metrics from backend */
export interface BackendBuildingMetrics {
  id: string;
  name: string;
  deviceCount: number;
  incidentCount: number;
  zoneCount: number;
  zoneCapacity: number;
}

/**
 * Calculate device metrics from devices.json.
 */
export function deriveDeviceMetrics(): DeviceMetrics {
  const total = devices.length;
  const online = devices.filter((d) => d.status === 'online').length;
  const offline = devices.filter((d) => d.status === 'offline').length;
  const maintenance = devices.filter((d) => d.status === 'maintenance').length;
  const accessPoints = devices.filter((d) => d.type === 'access-point').length;
  const offlineAccessPoints = devices.filter(
    (d) => d.type === 'access-point' && d.status === 'offline'
  ).length;

  return {
    total,
    online,
    offline,
    maintenance,
    uptimeStrict: online / total,
    uptimeWeighted: (online + 0.5 * maintenance) / total,
    accessPoints,
    offlineAccessPoints,
  };
}

/**
 * Calculate incident metrics from incidents.json.
 */
export function deriveIncidentMetrics(): IncidentMetrics {
  const total = incidents.length;
  const active = incidents.filter(
    (i) =>
      i.status === 'open' ||
      i.status === 'investigating' ||
      i.status === 'maintenance'
  ).length;
  const resolved = incidents.filter((i) => i.status === 'resolved').length;

  const byBuilding: Record<string, number> = {};
  const byZone: Record<string, number> = {};

  for (const incident of incidents) {
    byBuilding[incident.buildingId] = (byBuilding[incident.buildingId] ?? 0) + 1;
    byZone[incident.zoneId] = (byZone[incident.zoneId] ?? 0) + 1;
  }

  return { total, active, resolved, byBuilding, byZone };
}

/**
 * Calculate zone metrics from zones.json.
 */
export function deriveZoneMetrics(): ZoneMetrics {
  const total = zones.length;
  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);

  const byBuilding: Record<string, { count: number; capacity: number }> = {};
  for (const zone of zones) {
    if (!byBuilding[zone.buildingId]) {
      byBuilding[zone.buildingId] = { count: 0, capacity: 0 };
    }
    byBuilding[zone.buildingId].count += 1;
    byBuilding[zone.buildingId].capacity += zone.capacity;
  }

  return { total, totalCapacity, byBuilding };
}

/**
 * Get metrics for a specific backend building.
 */
export function getBackendBuildingMetrics(buildingId: string): BackendBuildingMetrics {
  const building = buildings.find((b) => b.id === buildingId);
  if (!building) {
    throw new Error(`Building ${buildingId} not found`);
  }

  const zoneIds = building.zones;
  const zoneCount = zoneIds.length;
  const zoneCapacity = zones
    .filter((z) => zoneIds.includes(z.id))
    .reduce((sum, z) => sum + z.capacity, 0);

  const deviceCount = devices.filter((d) => zoneIds.includes(d.zoneId)).length;
  const incidentCount = incidents.filter((i) => zoneIds.includes(i.zoneId)).length;

  return {
    id: buildingId,
    name: building.name,
    deviceCount,
    incidentCount,
    zoneCount,
    zoneCapacity,
  };
}

/**
 * Get all backend building metrics.
 */
export function getAllBackendBuildingMetrics(): BackendBuildingMetrics[] {
  return buildings.map((b) => getBackendBuildingMetrics(b.id));
}

/**
 * Summary metrics for dashboard display.
 */
export interface CampusSummary {
  devices: DeviceMetrics;
  incidents: IncidentMetrics;
  zones: ZoneMetrics;
  buildings: BackendBuildingMetrics[];
}

/**
 * Get complete campus summary.
 */
export function getCampusSummary(): CampusSummary {
  return {
    devices: deriveDeviceMetrics(),
    incidents: deriveIncidentMetrics(),
    zones: deriveZoneMetrics(),
    buildings: getAllBackendBuildingMetrics(),
  };
}
