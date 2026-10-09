/**
 * Extended campus twin metadata with operational data.
 *
 * This file joins operational metadata to the visual buildings in campusGeometry.ts.
 * The twinId field maps to IDs in campusTwin.ts for backward compatibility.
 * The backendBuildingId field maps to OSM way IDs for data provenance.
 *
 * Operational data (occupancy, energy, incidents) is SYNTHETIC and labeled accordingly.
 */

import { campusBuildings } from './campusGeometry';

export type OperationalStatus = 'operational' | 'attention' | 'critical' | 'maintenance';

export interface BuildingOperationalData {
  /** ID from campusTwin.ts (for backward compatibility) */
  twinId: string | null;
  /** OSM way ID (for data provenance) */
  osmId: number | null;
  /** Building name */
  name: string;
  /** Current operational status */
  status: OperationalStatus;
  /** Daily occupancy capacity (derived from zone data where available) */
  dailyCapacity: number | null;
  /** Event capacity (for large gatherings) */
  eventCapacity: number | null;
  /** Usable floor area in m² (footprint × floors × 0.62 core factor) */
  usableAreaM2: number;
  /** Base energy consumption in kW (estimated) */
  baseEnergyKw: number;
  /** Number of network access points */
  accessPoints: number;
  /** Active incidents count */
  activeIncidents: number;
  /** Security incidents count */
  securityIncidents: number;
  /** Related workers */
  workers: string[];
  /** Data provenance label */
  provenance: 'DERIVED' | 'ESTIMATED' | 'SYNTHETIC_FIXTURE';
}

/**
 * Operational data for each building.
 *
 * Capacity values marked DERIVED are calculated from src/data/zones.json.
 * Values marked ESTIMATED use formula-based calculations.
 * Values marked SYNTHETIC_FIXTURE are narrative placeholders.
 */
export const operationalData: Record<string, BuildingOperationalData> = {
  // Gedung H - IT Operations (tallest, 7 floors)
  [campusBuildings[0].id]: {
    twinId: 'it-operations',
    osmId: 548259886,
    name: 'Gedung H - IT Operations',
    status: 'critical',
    dailyCapacity: null,
    eventCapacity: 280,
    usableAreaM2: Math.round(1483 * 7 * 0.62),
    baseEnergyKw: 85,
    accessPoints: 4,
    activeIncidents: 3,
    securityIncidents: 0,
    workers: ['IT Helpdesk Worker', 'Network Operations Worker'],
    provenance: 'SYNTHETIC_FIXTURE',
  },
  // Gedung D - Fakultas Teknik (5 floors)
  [campusBuildings[1].id]: {
    twinId: 'building-A',
    osmId: 567365663,
    name: 'Gedung D - Fakultas Teknik',
    status: 'attention',
    dailyCapacity: 140, // DERIVED from zones.json: 30+25+40+35+10
    eventCapacity: 2200,
    usableAreaM2: Math.round(1303 * 5 * 0.62),
    baseEnergyKw: 65,
    accessPoints: 6,
    activeIncidents: 5, // DERIVED from incidents.json for building-A zones
    securityIncidents: 0,
    workers: ['IT Helpdesk Worker'],
    provenance: 'DERIVED',
  },
  // Gedung G (3 floors)
  [campusBuildings[2].id]: {
    twinId: null,
    osmId: 441908564,
    name: 'Gedung G',
    status: 'operational',
    dailyCapacity: null,
    eventCapacity: 500,
    usableAreaM2: Math.round(1159 * 3 * 0.62),
    baseEnergyKw: 45,
    accessPoints: 3,
    activeIncidents: 0,
    securityIncidents: 0,
    workers: [],
    provenance: 'SYNTHETIC_FIXTURE',
  },
  // Gedung E (3 floors)
  [campusBuildings[3].id]: {
    twinId: 'building-B',
    osmId: 567365662,
    name: 'Gedung E',
    status: 'operational',
    dailyCapacity: 123, // DERIVED from zones.json: 50+45+20+8
    eventCapacity: 750,
    usableAreaM2: Math.round(707 * 3 * 0.62),
    baseEnergyKw: 35,
    accessPoints: 2,
    activeIncidents: 2, // DERIVED from incidents.json for building-B zones
    securityIncidents: 0,
    workers: ['Campus Operations Worker'],
    provenance: 'DERIVED',
  },
  // Gedung F - PKM (2 floors)
  [campusBuildings[4].id]: {
    twinId: null,
    osmId: 559044141,
    name: 'Gedung F - Pusat Kegiatan Mahasiswa',
    status: 'operational',
    dailyCapacity: null,
    eventCapacity: 1100,
    usableAreaM2: Math.round(679 * 2 * 0.62),
    baseEnergyKw: 30,
    accessPoints: 2,
    activeIncidents: 0,
    securityIncidents: 0,
    workers: [],
    provenance: 'SYNTHETIC_FIXTURE',
  },
  // Gedung A (2 floors)
  [campusBuildings[5].id]: {
    twinId: 'building-C',
    osmId: 559044152,
    name: 'Gedung A',
    status: 'operational',
    dailyCapacity: 143, // DERIVED from zones.json: 25+30+40+35+12+1
    eventCapacity: 1100,
    usableAreaM2: Math.round(598 * 2 * 0.62),
    baseEnergyKw: 25,
    accessPoints: 3,
    activeIncidents: 3, // DERIVED from incidents.json for building-C zones
    securityIncidents: 0,
    workers: ['Campus Operations Worker'],
    provenance: 'DERIVED',
  },
};

/**
 * Get operational data for a building by ID.
 */
export function getOperationalData(buildingId: string): BuildingOperationalData | null {
  return operationalData[buildingId] ?? null;
}

/**
 * Calculate total campus capacity (sum of all DERIVED capacities).
 */
export function getTotalCampusCapacity(): number {
  return Object.values(operationalData)
    .filter((d) => d.dailyCapacity !== null && d.provenance === 'DERIVED')
    .reduce((sum, d) => sum + (d.dailyCapacity ?? 0), 0);
}

/**
 * Calculate total usable area across all buildings.
 */
export function getTotalUsableArea(): number {
  return Object.values(operationalData).reduce((sum, d) => sum + d.usableAreaM2, 0);
}

/**
 * Calculate total base energy consumption.
 */
export function getTotalBaseEnergy(): number {
  return Object.values(operationalData).reduce((sum, d) => sum + d.baseEnergyKw, 0);
}

/**
 * Get total active incidents across all buildings.
 */
export function getTotalActiveIncidents(): number {
  return Object.values(operationalData).reduce((sum, d) => sum + d.activeIncidents, 0);
}

/**
 * Get buildings with critical or attention status.
 */
export function getBuildingsNeedingAttention(): BuildingOperationalData[] {
  return Object.values(operationalData).filter(
    (d) => d.status === 'critical' || d.status === 'attention'
  );
}
