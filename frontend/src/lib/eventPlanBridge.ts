import type { EventScenarioInput } from '@/data/eventSimulation';
import type { ScenarioForecast, ScenarioInput } from '@/lib/scenarioModel';

/** Transfer Twin aggregates as planning assumptions, never telemetry/evidence. */
export function toEventPlanInput(input: ScenarioInput, forecast: ScenarioForecast): EventScenarioInput {
  return {
    attendance: input.attendance,
    concurrentOccupancy: forecast.concurrentTotal,
    durationHours: input.durationHours,
    venueCapacity: forecast.allocations.reduce((total, venue) => total + venue.capacity, 0),
    venues: forecast.allocations.length,
    availablePowerKw: 3200,
    availableNetworkMbps: 5000,
  };
}
