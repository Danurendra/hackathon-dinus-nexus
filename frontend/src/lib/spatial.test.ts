import { describe, it, expect } from 'vitest';
import {
  getBuildingAnchor,
  isPointInPolygon,
  getCampusIsoBounds,
  boundsToViewBox,
  getProjectedFootprintPoints,
} from './spatial';
import { project, FLOOR_HEIGHT_M } from './isometric';
import { campusBuildings, type BuildingSpec } from '../data/campusGeometry';

function makeBuilding(footprint: Array<[number, number]>): BuildingSpec {
  return {
    id: 'test-building',
    name: 'Test',
    twinId: null,
    osmId: null,
    footprint,
    floors: 3,
    roof: 'flat',
    facade: 'grid',
    material: 'concrete',
    crown: 'none',
    podium: null,
    entrance: null,
    areaM2: 100,
  };
}

describe('getBuildingAnchor', () => {
  it('returns an anchor inside the footprint for every real building', () => {
    for (const building of campusBuildings) {
      const anchor = getBuildingAnchor(building);
      expect(anchor, building.name).not.toBeNull();
      expect(isPointInPolygon(anchor as [number, number], building.footprint)).toBe(true);
    }
  });

  it('returns null for an empty footprint', () => {
    expect(getBuildingAnchor(makeBuilding([]))).toBeNull();
  });

  it('returns null for fewer than 3 vertices', () => {
    expect(getBuildingAnchor(makeBuilding([[0, 0], [1, 1]]))).toBeNull();
  });

  it('returns null when coordinates are not finite', () => {
    expect(
      getBuildingAnchor(makeBuilding([[0, 0], [Number.NaN, 1], [1, 1]]))
    ).toBeNull();
  });

  it('is deterministic', () => {
    const building = campusBuildings[0];
    expect(getBuildingAnchor(building)).toEqual(getBuildingAnchor(building));
  });
});

describe('getCampusIsoBounds', () => {
  it('contains every projected footprint and roof vertex', () => {
    const bounds = getCampusIsoBounds(campusBuildings);

    for (const building of campusBuildings) {
      const roofZ = building.floors * FLOOR_HEIGHT_M;
      const ground = getProjectedFootprintPoints(building, 0);
      const roof = getProjectedFootprintPoints(building, roofZ);

      for (const p of [...ground, ...roof]) {
        expect(p.x).toBeGreaterThanOrEqual(bounds.minX);
        expect(p.x).toBeLessThanOrEqual(bounds.maxX);
        expect(p.y).toBeGreaterThanOrEqual(bounds.minY);
        expect(p.y).toBeLessThanOrEqual(bounds.maxY);
      }
    }
  });

  it('produces a valid viewBox with positive dimensions', () => {
    const viewBox = boundsToViewBox(getCampusIsoBounds(campusBuildings));
    const [x, y, w, h] = viewBox.split(' ').map(Number);
    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
  });
});

describe('projection consistency', () => {
  it('projects the anchor at ground and roof height within bounds', () => {
    const bounds = getCampusIsoBounds(campusBuildings);
    for (const building of campusBuildings) {
      const anchor = getBuildingAnchor(building);
      if (!anchor) continue;
      const roofZ = building.floors * FLOOR_HEIGHT_M;
      const atGround = project(anchor[0], anchor[1], 0);
      const atRoof = project(anchor[0], anchor[1], roofZ);
      for (const p of [atGround, atRoof]) {
        expect(p.x).toBeGreaterThanOrEqual(bounds.minX);
        expect(p.x).toBeLessThanOrEqual(bounds.maxX);
        expect(p.y).toBeGreaterThanOrEqual(bounds.minY);
        expect(p.y).toBeLessThanOrEqual(bounds.maxY);
      }
    }
  });
});