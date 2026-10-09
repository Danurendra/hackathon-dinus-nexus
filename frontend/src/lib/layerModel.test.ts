import { describe, it, expect } from 'vitest';
import {
  getStatusData,
  getDensityData,
  getEnergyData,
  getIncidentData,
  getFlowData,
} from './layerModel';
import { campusBuildings, pedestrianPaths } from '../data/campusGeometry';

describe('layerModel availability', () => {
  it('status data covers every building', () => {
    expect(getStatusData()).toHaveLength(campusBuildings.length);
  });

  it('density partitions buildings into data or unavailable', () => {
    const { data, unavailable } = getDensityData();
    expect(data.length + unavailable.length).toBe(campusBuildings.length);
    for (const d of data) {
      expect(d.ratio).toBeGreaterThanOrEqual(0);
      expect(d.ratio).toBeLessThanOrEqual(1);
      expect(d.capacity).toBeGreaterThan(0);
    }
  });

  it('energy normalizes against the campus maximum', () => {
    const { data, max, unit } = getEnergyData();
    expect(unit).toBe('kW');
    expect(data.length).toBeGreaterThan(0);
    expect(max).toBeGreaterThan(0);
    for (const e of data) {
      expect(e.ratio).toBeGreaterThan(0);
      expect(e.ratio).toBeLessThanOrEqual(1);
      expect(e.kw).toBeLessThanOrEqual(max);
    }
  });

  it('incidents are placed only where a count exists', () => {
    for (const kind of ['it', 'security'] as const) {
      const { data } = getIncidentData(kind);
      for (const item of data) {
        expect(item.count).toBeGreaterThan(0);
      }
    }
  });

  it('flow reuses the existing pedestrian path fixture', () => {
    const flow = getFlowData();
    expect(flow).toHaveLength(pedestrianPaths.length);
    for (const f of flow) {
      expect(f.points.length).toBeGreaterThanOrEqual(2);
    }
  });
});