import { describe, expect, it } from 'vitest';
import { toEventPlanInput } from './eventPlanBridge';
import { defaultGraduationScenario, simulateScenario } from './scenarioModel';

describe('Twin to operational assessment bridge', () => {
  it('transfers planning inputs rather than claiming device telemetry', () => {
    const forecast = simulateScenario(defaultGraduationScenario);
    const plan = toEventPlanInput(defaultGraduationScenario, forecast);
    expect(plan.attendance).toBe(39000);
    expect(plan.concurrentOccupancy).toBe(forecast.concurrentTotal);
    expect(plan.venueCapacity).toBe(forecast.allocations.reduce((sum, venue) => sum + venue.capacity, 0));
    expect(plan.venues).toBe(forecast.allocations.length);
    expect(plan.availableNetworkMbps).toBe(5000);
  });
  it('tracks sessions and venue availability without mutating the Twin model', () => {
    const input = { ...defaultGraduationScenario, sessions: 3, availableBuildings: [] };
    const forecast = simulateScenario(input);
    const plan = toEventPlanInput(input, forecast);
    expect(plan.concurrentOccupancy).toBe(5980);
    expect(plan.venues).toBe(forecast.allocations.length);
    expect(defaultGraduationScenario.sessions).toBe(1);
  });
});
