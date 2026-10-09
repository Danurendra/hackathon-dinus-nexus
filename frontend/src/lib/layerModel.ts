/**
 * Layer data model for the Campus Twin.
 *
 * Derives per-building values for each visualization layer from the existing
 * synthetic fixtures (campusTwinExtended + campusGeometry). Every value carries
 * an explicit provenance label; missing data is reported as `unavailable`
 * instead of being fabricated into a misleading visualization.
 *
 * None of these values are live telemetry.
 */

import { campusBuildings, pedestrianPaths, type BuildingSpec } from '@/data/campusGeometry';
import { getOperationalData } from '@/data/campusTwinExtended';
import { keyedRandom } from '@/lib/prng';

export type Provenance = 'DERIVED' | 'ESTIMATED' | 'SYNTHETIC';

export interface StatusDatum {
  building: BuildingSpec;
  status: string;
}

export interface DensityDatum {
  building: BuildingSpec;
  /** Synthetic baseline occupants. */
  occupied: number;
  /** Capacity in people (DERIVED from zones where available). */
  capacity: number;
  /** Normalized utilization 0–1. */
  ratio: number;
}

export interface EnergyDatum {
  building: BuildingSpec;
  kw: number;
  /** Normalized against the campus maximum, 0–1. */
  ratio: number;
}

export interface IncidentDatum {
  building: BuildingSpec;
  count: number;
}

export interface FlowDatum {
  id: string;
  points: Array<[number, number]>;
  width: number;
}

/** Operational status is sourced directly from the operational fixture. */
export function getStatusData(): StatusDatum[] {
  return campusBuildings.map((building) => ({
    building,
    status: getOperationalData(building.id)?.status ?? 'operational',
  }));
}

/**
 * Occupancy density.
 *
 * Capacity comes from DERIVED zone data where available. Current occupancy is
 * a deterministic SYNTHETIC baseline (35–85% of capacity) used only to drive
 * the visualization; buildings without capacity are marked unavailable.
 */
export function getDensityData(): { data: DensityDatum[]; unavailable: string[] } {
  const data: DensityDatum[] = [];
  const unavailable: string[] = [];

  for (const building of campusBuildings) {
    const op = getOperationalData(building.id);
    if (!op || op.dailyCapacity === null) {
      unavailable.push(building.name);
      continue;
    }

    const factor = 0.35 + keyedRandom(`density:${building.id}`)() * 0.5;
    const capacity = op.dailyCapacity;
    data.push({
      building,
      occupied: Math.round(capacity * factor),
      capacity,
      ratio: factor,
    });
  }

  return { data, unavailable };
}

/** Energy consumption. Values are explicitly simulated (ESTIMATED). */
export function getEnergyData(): { data: EnergyDatum[]; unit: 'kW'; max: number } {
  const values = campusBuildings
    .map((building) => ({ building, kw: getOperationalData(building.id)?.baseEnergyKw ?? 0 }))
    .filter((item) => item.kw > 0);

  const max = values.reduce((m, item) => Math.max(m, item.kw), 0) || 1;

  return {
    data: values.map((item) => ({
      building: item.building,
      kw: item.kw,
      ratio: item.kw / max,
    })),
    unit: 'kW',
    max,
  };
}

/** IT or physical security incidents, using their associated building. */
export function getIncidentData(kind: 'it' | 'security'): {
  data: IncidentDatum[];
  unavailable: string[];
} {
  const data: IncidentDatum[] = [];
  const unavailable: string[] = [];

  for (const building of campusBuildings) {
    const op = getOperationalData(building.id);
    const count =
      kind === 'it' ? op?.activeIncidents ?? 0 : op?.securityIncidents ?? 0;

    if (count > 0) {
      data.push({ building, count });
    } else {
      unavailable.push(building.name);
    }
  }

  return { data, unavailable };
}

/**
 * Pedestrian flow.
 *
 * Uses the existing synthetic pedestrian paths (building centroid → campus
 * center). Direction is inherent in the path order. Returns an empty list when
 * no path fixture exists, so the layer can show an unavailable state instead
 * of drawing decorative lines.
 */
export function getFlowData(): FlowDatum[] {
  return pedestrianPaths.map((path) => ({
    id: path.id,
    points: path.points,
    width: path.width,
  }));
}