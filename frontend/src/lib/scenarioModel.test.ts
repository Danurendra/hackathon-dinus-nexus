import { describe, it, expect } from 'vitest';
import {
  simulateScenario,
  getBaselineMetrics,
  getScenarioMetrics,
  defaultGraduationScenario,
} from './scenarioModel';

describe('scenarioModel baseline vs scenario', () => {
  it('baseline metrics come from fixtures and never claim live network data', () => {
    const baseline = getBaselineMetrics();
    expect(baseline.occupancy).toBeGreaterThanOrEqual(0);
    expect(baseline.energyKw).toBeGreaterThan(0);
    expect(baseline.networkMbps).toBeNull();
    expect(baseline.buildingsNeedingAttention).toBeGreaterThanOrEqual(0);
  });

  it('scenario metrics align with the forecast', () => {
    const forecast = simulateScenario(defaultGraduationScenario);
    const metrics = getScenarioMetrics(forecast);
    expect(metrics.occupancy).toBe(forecast.concurrentTotal);
    expect(metrics.energyKw).toBe(forecast.peakPowerKw);
    expect(metrics.networkMbps).toBe(forecast.networkDemandMbps);
    expect(metrics.venuesNeedingAttention).toBeGreaterThanOrEqual(metrics.congestionHotspots);
  });

  it('simulation is deterministic', () => {
    const a = simulateScenario(defaultGraduationScenario);
    const b = simulateScenario(defaultGraduationScenario);
    expect(a).toEqual(b);
  });

  it('every allocation reports a unit-consistent load percentage', () => {
    const forecast = simulateScenario(defaultGraduationScenario);
    for (const alloc of forecast.allocations) {
      expect(alloc.capacity).toBeGreaterThan(0);
      const expected = Math.round((alloc.allocated / alloc.capacity) * 1000) / 10;
      expect(alloc.loadPercent).toBe(expected);
    }
  });
});