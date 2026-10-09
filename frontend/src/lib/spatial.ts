/**
 * Authoritative spatial model for Campus Twin.
 *
 * This module provides a single source of truth for building anchors,
 * projected footprints, and viewport bounds. All components that render
 * buildings, markers, or overlays must use these functions to ensure
 * consistent spatial alignment.
 *
 * Coordinate systems:
 * - World meters: OSM-derived local coordinates (x east, y south)
 * - Isometric screen: projected via project() from isometric.ts
 * - ViewBox: derived from projected bounds of all buildings
 */

import { project, type IsoPoint, FLOOR_HEIGHT_M } from './isometric';
import type { BuildingSpec } from '@/data/campusGeometry';

/**
 * Calculate the area-weighted centroid of a polygon using the shoelace formula.
 * Falls back to simple average if polygon is degenerate (area ≈ 0).
 * Returns null if footprint is empty or has fewer than 3 vertices.
 */
export function getBuildingAnchor(building: BuildingSpec): [number, number] | null {
  const { footprint } = building;

  if (!footprint || footprint.length < 3) {
    return null;
  }

  // Check for non-finite coordinates
  for (const [x, y] of footprint) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }
  }

  // Shoelace formula for signed area
  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < footprint.length; i++) {
    const [x0, y0] = footprint[i];
    const [x1, y1] = footprint[(i + 1) % footprint.length];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  area *= 0.5;

  // Degenerate polygon (area ≈ 0): fall back to simple average
  if (Math.abs(area) < 1e-6) {
    const avgX = footprint.reduce((sum, [x]) => sum + x, 0) / footprint.length;
    const avgY = footprint.reduce((sum, [, y]) => sum + y, 0) / footprint.length;
    return [avgX, avgY];
  }

  cx /= 6 * area;
  cy /= 6 * area;

  return [cx, cy];
}

/**
 * Check if a point is inside a polygon (ray casting algorithm).
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: Array<[number, number]>
): boolean {
  const [px, py] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Get the projected footprint points in isometric screen space.
 */
export function getProjectedFootprintPoints(
  building: BuildingSpec,
  z: number = 0
): IsoPoint[] {
  return building.footprint.map(([x, y]) => project(x, y, z));
}

/**
 * Calculate the bounding box of all buildings in isometric screen space.
 * Includes roof height (floors * 3.6m) and padding.
 */
export function getCampusIsoBounds(buildings: BuildingSpec[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const building of buildings) {
    const anchor = getBuildingAnchor(building);
    if (!anchor) continue;

    // Ground footprint
    for (const [x, y] of building.footprint) {
      const p = project(x, y, 0);
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    // Roof (elevated)
    const roofZ = building.floors * FLOOR_HEIGHT_M;
    for (const [x, y] of building.footprint) {
      const p = project(x, y, roofZ);
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  // Add padding (10% of extent)
  const width = maxX - minX;
  const height = maxY - minY;
  const paddingX = width * 0.1;
  const paddingY = height * 0.1;

  return {
    minX: minX - paddingX,
    minY: minY - paddingY,
    maxX: maxX + paddingX,
    maxY: maxY + paddingY,
  };
}

/**
 * Convert bounds to SVG viewBox string.
 */
export function boundsToViewBox(bounds: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}): string {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  return `${bounds.minX} ${bounds.minY} ${width} ${height}`;
}

/**
 * Get the anchor point in isometric screen space for a building.
 * Returns null if building has no valid geometry.
 */
export function getBuildingAnchorProjected(
  building: BuildingSpec,
  z: number = 0
): IsoPoint | null {
  const anchor = getBuildingAnchor(building);
  if (!anchor) return null;
  return project(anchor[0], anchor[1], z);
}
