/**
 * Isometric projection utilities for the Campus Twin.
 *
 * World space: meters on a flat campus grid (x east, y south, z up).
 * Screen space: SVG pixels using a classic 2:1 isometric projection.
 *
 *   sx = (wx - wy) * KX
 *   sy = (wx + wy) * KY - wz * KZ
 */

export interface IsoPoint {
  x: number;
  y: number;
}

/** Projection scale factors (tuned so a ~220m campus fits the viewBox). */
export const KX = 4;
export const KY = 2;
export const KZ = 2.3;

/** Campus world extents in meters. */
export const CAMPUS_SIZE = 220;

/** SVG viewBox calibrated to the campus plan (see docs/CAMPUS_TWIN_DESIGN.md §4). */
export const CAMPUS_VIEWBOX = '-760 0 1520 830';

export function project(wx: number, wy: number, wz = 0): IsoPoint {
  return {
    x: (wx - wy) * KX,
    y: (wx + wy) * KY - wz * KZ,
  };
}

export function projectMany(points: Array<[number, number, number?]>): IsoPoint[] {
  return points.map(([x, y, z]) => project(x, y, z ?? 0));
}

/** Convert projected points to an SVG path string. */
export function toPath(points: IsoPoint[], close = true): string {
  if (points.length === 0) return '';
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`)
    .join(' ');
  return close ? `${d} Z` : d;
}

/** Depth key for painter's algorithm: farther objects (smaller x+y) draw first. */
export function depth(wx: number, wy: number): number {
  return wx + wy;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Linear interpolation between two world points. */
export function lerp2(
  a: [number, number],
  b: [number, number],
  t: number,
): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Shade a hex color by a multiplicative factor (>1 brightens, <1 darkens).
 */
export function shade(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = clamp255(((num >> 16) & 255) * factor);
  const g = clamp255(((num >> 8) & 255) * factor);
  const b = clamp255((num & 255) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** Rectangle footprint helpers. */
export interface RectFootprint {
  x: number;
  y: number;
  w: number;
  d: number;
}

/** Corners of a footprint rect in world space, ordered N, E, S, W (iso screen sense). */
export function footprintCorners(fp: RectFootprint): Array<[number, number]> {
  return [
    [fp.x, fp.y],
    [fp.x + fp.w, fp.y],
    [fp.x + fp.w, fp.y + fp.d],
    [fp.x, fp.y + fp.d],
  ];
}

/** Footprint center in world space. */
export function footprintCenter(fp: RectFootprint): [number, number] {
  return [fp.x + fp.w / 2, fp.y + fp.d / 2];
}

/** Approximate usable floor area for a footprint (m²), given floors and a core factor. */
export function footprintArea(fp: RectFootprint, floors: number): number {
  return Math.round(fp.w * fp.d * floors * 0.62);
}
