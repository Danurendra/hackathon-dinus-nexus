/**
 * Scenario simulation model for campus events.
 *
 * This module extends the existing eventSimulation.ts with:
 * - Per-building distribution weights (not uniform)
 * - Capacity overload detection
 * - Worker action recommendations
 * - Integration with real building geometry
 *
 * All formulas are deterministic and transparent.
 * Data is SYNTHETIC and labeled accordingly.
 */

import {
  operationalData,
  getOperationalData,
  getTotalBaseEnergy,
  getTotalActiveIncidents,
  getBuildingsNeedingAttention,
} from '@/data/campusTwinExtended';
import { campusBuildings } from '@/data/campusGeometry';
import { getDensityData } from '@/lib/layerModel';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ScenarioInput {
  /** Total event attendance */
  attendance: number;
  /** Concurrent occupancy factor (0.2-1.0) */
  concurrencyFactor: number;
  /** Event duration in hours */
  durationHours: number;
  /** Number of sessions (1-4) */
  sessions: number;
  /** Available building IDs (checkbox) */
  availableBuildings: string[];
  /** Environmental condition */
  environment: 'clear' | 'rain' | 'hot';
}

export interface BuildingAllocation {
  buildingId: string;
  name: string;
  /** Distribution weight (0-1) */
  weight: number;
  /** Allocated concurrent attendees */
  allocated: number;
  /** Event capacity */
  capacity: number;
  /** Load percentage */
  loadPercent: number;
  /** Status */
  status: 'normal' | 'attention' | 'overload' | 'critical';
}

export interface ScenarioForecast {
  /** Total concurrent attendees */
  concurrentTotal: number;
  /** Per-building allocation */
  allocations: BuildingAllocation[];
  /** Peak power demand in kW */
  peakPowerKw: number;
  /** Total energy consumption in kWh */
  energyKwh: number;
  /** Network demand in Mbps */
  networkDemandMbps: number;
  /** Risk level */
  risk: RiskLevel;
  /** Risk factors */
  risks: string[];
  /** Recommended actions */
  recommendations: string[];
  /** Worker actions */
  workerActions: WorkerAction[];
  /** Assumptions */
  assumptions: string[];
  /** Confidence level */
  confidence: 'low' | 'medium' | 'high';
}

export interface WorkerAction {
  worker: string;
  action: string;
  status: 'available' | 'planned' | 'requires_approval';
  /** API endpoint if available */
  endpoint?: string;
  /** Payload for POST request */
  payload?: Record<string, unknown>;
}

/**
 * Default distribution weights for graduation ceremony.
 * These are explicit assumptions, not uniform distribution.
 */
const GRADUATION_WEIGHTS: Record<string, number> = {
  // Main ceremony venue
  'plaza-grha': 0.53,
  // Academic buildings for overflow
  [campusBuildings[1].id]: 0.14, // Gedung D - Fakultas Teknik
  [campusBuildings[5].id]: 0.10, // Gedung A
  // Support venues
  [campusBuildings[4].id]: 0.08, // Gedung F - PKM
  [campusBuildings[3].id]: 0.06, // Gedung E
  [campusBuildings[2].id]: 0.05, // Gedung G
  // Operations (staff only)
  [campusBuildings[0].id]: 0.02, // Gedung H - IT Operations
  [campusBuildings[0].id + '-security']: 0.015, // Security
  [campusBuildings[0].id + '-qa']: 0.005, // QA
};

/**
 * Normalize weights to sum to 1.0, excluding unavailable buildings.
 */
function normalizeWeights(
  weights: Record<string, number>,
  availableBuildings: string[]
): Record<string, number> {
  const filtered: Record<string, number> = {};
  let total = 0;

  for (const [id, weight] of Object.entries(weights)) {
    // Check if building is available (or is a special zone like plaza)
    const isAvailable =
      availableBuildings.includes(id) ||
      id.startsWith('plaza-') ||
      id.includes('-security') ||
      id.includes('-qa');

    if (isAvailable) {
      filtered[id] = weight;
      total += weight;
    }
  }

  // Normalize
  const normalized: Record<string, number> = {};
  for (const [id, weight] of Object.entries(filtered)) {
    normalized[id] = weight / total;
  }

  return normalized;
}

/**
 * Determine building status based on load percentage.
 */
function getBuildingStatus(loadPercent: number): BuildingAllocation['status'] {
  if (loadPercent > 130) return 'critical';
  if (loadPercent > 100) return 'overload';
  if (loadPercent > 80) return 'attention';
  return 'normal';
}

/**
 * Calculate scenario forecast.
 */
export function simulateScenario(input: ScenarioInput): ScenarioForecast {
  // Calculate concurrent attendees
  const concurrentTotal = Math.round(input.attendance * input.concurrencyFactor / input.sessions);

  // Normalize weights
  const weights = normalizeWeights(GRADUATION_WEIGHTS, input.availableBuildings);

  // Adjust for environmental conditions
  let energyMultiplier = 1.0;
  let concurrencyAdjustment = 1.0;

  if (input.environment === 'hot') {
    energyMultiplier = 1.12; // +12% HVAC load
    concurrencyAdjustment = 0.95; // -5% outdoor attendance
  } else if (input.environment === 'rain') {
    concurrencyAdjustment = 0.88; // -12% outdoor attendance
  }

  const adjustedConcurrent = Math.round(concurrentTotal * concurrencyAdjustment);

  // Allocate per building
  const allocations: BuildingAllocation[] = [];
  let totalAllocated = 0;

  for (const [buildingId, weight] of Object.entries(weights)) {
    const allocated = Math.round(adjustedConcurrent * weight);
    totalAllocated += allocated;

    // Get capacity
    let capacity = 0;
    let name = buildingId;

    if (buildingId.startsWith('plaza-')) {
      capacity = buildingId === 'plaza-grha' ? 7800 : 500;
      name = buildingId === 'plaza-grha' ? 'Grha Plaza' : 'Plaza Gerbang';
    } else if (buildingId.includes('-security')) {
      capacity = 240;
      name = 'Security Operations';
    } else if (buildingId.includes('-qa')) {
      capacity = 180;
      name = 'Quality Assurance';
    } else {
      const opData = getOperationalData(buildingId);
      if (opData) {
        capacity = opData.eventCapacity ?? 0;
        name = opData.name;
      }
    }

    const loadPercent = capacity > 0 ? (allocated / capacity) * 100 : 0;

    allocations.push({
      buildingId,
      name,
      weight,
      allocated,
      capacity,
      loadPercent: Math.round(loadPercent * 10) / 10,
      status: getBuildingStatus(loadPercent),
    });
  }

  // Calculate energy demand (from existing formula)
  const peakPowerKw = Math.round(
    (adjustedConcurrent * 0.12 + input.attendance * 0.01 + input.sessions * 85) * energyMultiplier
  );
  const energyKwh = Math.round(peakPowerKw * input.durationHours * 0.72);

  // Calculate network demand
  const networkDemandMbps = Math.round(
    adjustedConcurrent * 0.18 + input.attendance * 0.01
  );

  // Identify risks
  const risks: string[] = [];
  const overloadedBuildings = allocations.filter(
    (a) => a.status === 'overload' || a.status === 'critical'
  );

  if (overloadedBuildings.length > 0) {
    risks.push(
      `${overloadedBuildings.length} gedung melebihi kapasitas: ${overloadedBuildings
        .map((a) => `${a.name} (${a.loadPercent}%)`)
        .join(', ')}`
    );
  }

  if (peakPowerKw > 2800) {
    risks.push(`Beban daya mendekati batas (${peakPowerKw} kW dari 3200 kW tersedia)`);
  }

  if (networkDemandMbps > 4000) {
    risks.push(`Permintaan jaringan tinggi (${networkDemandMbps} Mbps)`);
  }

  // Determine risk level
  let risk: RiskLevel = 'low';
  if (risks.length >= 3 || overloadedBuildings.some((a) => a.status === 'critical')) {
    risk = 'critical';
  } else if (risks.length >= 2) {
    risk = 'high';
  } else if (risks.length >= 1) {
    risk = 'medium';
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (risk === 'critical' || risk === 'high') {
    recommendations.push(
      `Bagi acara menjadi ${input.sessions + 1} sesi untuk mengurangi beban konkuren menjadi ${Math.round(
        adjustedConcurrent / (input.sessions + 1)
      )} per sesi`
    );
  }

  if (overloadedBuildings.length > 0) {
    recommendations.push(
      'Redistribusikan peserta ke venue pendukung atau tambahkan sesi'
    );
  }

  if (peakPowerKw > 2800) {
    recommendations.push(
      'Siapkan generator cadangan dan koordinasi dengan tim fasilitas'
    );
  }

  if (networkDemandMbps > 4000) {
    recommendations.push(
      'Tambahkan access point temporer dan prioritaskan traffic operasional'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Pertahankan distribusi venue dan pantau arus kedatangan');
  }

  // Generate worker actions
  const workerActions: WorkerAction[] = [];

  if (peakPowerKw > 2500) {
    workerActions.push({
      worker: 'Facilities Worker',
      action: `Inspect projected energy demand (${peakPowerKw} kW)`,
      status: 'planned',
    });
  }

  if (networkDemandMbps > 3500) {
    workerActions.push({
      worker: 'Network Worker',
      action: 'Verify network capacity in high-density zones',
      status: 'planned',
    });
  }

  if (overloadedBuildings.length > 0) {
    workerActions.push({
      worker: 'Security Worker',
      action: 'Investigate simulated crowd density alerts',
      status: 'planned',
    });
  }

  workerActions.push({
    worker: 'Campus Operations Worker',
    action: 'Buka Workflow Agent di bawah peta untuk assessment backend, evidence dan history',
    status: 'available',
  });

  // Assumptions
  const assumptions = [
    'Distribusi peserta tidak seragam; mengikuti bobot eksplisit di §8.3 design doc',
    '39.000 peserta tidak menempati kampus secara bersamaan',
    'Formula deterministik dari eventSimulation.ts + distribusi per gedung',
    'Data kapasitas gedung dari OSM + zones.json (DERIVED) atau sintetis (SYNTHETIC_FIXTURE)',
    'Bukan telemetri live; bukan jaminan keselamatan',
  ];

  // Confidence
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  if (input.environment !== 'clear') confidence = 'low';
  if (input.sessions > 2) confidence = 'high';

  return {
    concurrentTotal: adjustedConcurrent,
    allocations,
    peakPowerKw,
    energyKwh,
    networkDemandMbps,
    risk,
    risks,
    recommendations,
    workerActions,
    assumptions,
    confidence,
  };
}

/**
 * Default graduation scenario input.
 */
export const defaultGraduationScenario: ScenarioInput = {
  attendance: 39000,
  concurrencyFactor: 0.46,
  durationHours: 6,
  sessions: 1,
  availableBuildings: campusBuildings.map((b) => b.id),
  environment: 'clear',
};

/* -------------------------------------------------------------------------- */
/* Baseline vs scenario comparison                                            */
/* -------------------------------------------------------------------------- */

/**
 * Current operational baseline, sourced from existing fixtures.
 * Every field carries an explicit provenance label so it is never confused
 * with the scenario projection.
 */
export interface BaselineMetrics {
  /** Sum of current synthetic occupancy estimates (people) */
  occupancy: number;
  occupancyProvenance: 'SYNTHETIC';
  /** Total estimated base energy load (kW) */
  energyKw: number;
  energyProvenance: 'ESTIMATED';
  /** Current IT incidents across campus */
  itIncidents: number;
  /** Current physical security incidents across campus */
  securityIncidents: number;
  incidentsProvenance: 'DERIVED/SYNTHETIC_FIXTURE';
  /** Buildings currently flagged critical/attention */
  buildingsNeedingAttention: number;
  /** Network demand is not measured anywhere (no telemetry yet) */
  networkMbps: null;
}

/**
 * Read the operational baseline from the existing fixtures.
 *
 * Occupancy reuses the same synthetic estimate as the density layer so the map
 * and the comparison panel agree. Energy/incidents come from the operational
 * fixture functions. No value is hard-coded in the UI.
 */
export function getBaselineMetrics(): BaselineMetrics {
  const { data } = getDensityData();
  return {
    occupancy: data.reduce((sum, d) => sum + d.occupied, 0),
    occupancyProvenance: 'SYNTHETIC',
    energyKw: getTotalBaseEnergy(),
    energyProvenance: 'ESTIMATED',
    itIncidents: getTotalActiveIncidents(),
    securityIncidents: operationalData
      ? Object.values(operationalData).reduce((sum, d) => sum + d.securityIncidents, 0)
      : 0,
    incidentsProvenance: 'DERIVED/SYNTHETIC_FIXTURE',
    buildingsNeedingAttention: getBuildingsNeedingAttention().length,
    networkMbps: null,
  };
}

/**
 * Scenario totals derived from a forecast.
 * These are SYNTHETIC projections, not measured values.
 */
export interface ScenarioMetrics {
  occupancy: number;
  energyKw: number;
  networkMbps: number;
  /** Allocated venues over capacity (load > 100%) */
  congestionHotspots: number;
  /** Allocated venues above 80% load */
  venuesNeedingAttention: number;
}

export function getScenarioMetrics(forecast: ScenarioForecast): ScenarioMetrics {
  return {
    occupancy: forecast.concurrentTotal,
    energyKw: forecast.peakPowerKw,
    networkMbps: forecast.networkDemandMbps,
    congestionHotspots: forecast.allocations.filter(
      (a) => a.status === 'overload' || a.status === 'critical'
    ).length,
    venuesNeedingAttention: forecast.allocations.filter((a) => a.status !== 'normal').length,
  };
}
