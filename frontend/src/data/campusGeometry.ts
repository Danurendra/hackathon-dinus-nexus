/**
 * Campus geometry derived from OpenStreetMap.
 *
 * Data source: OpenStreetMap contributors (ODbL license)
 * Attribution: © OpenStreetMap contributors
 *
 * Building footprints are simplified polygons from OSM ways tagged with building=university.
 * Coordinates are projected from lat/lon to local meters using equirectangular projection.
 * Origin: -6.98162, 110.409653 (centroid of campus area)
 */

export interface BuildingFootprint {
  /** OSM way ID for attribution */
  osmId: number;
  /** Building name from OSM */
  name: string;
  /** Number of floors from OSM building:levels tag */
  floors: number | null;
  /** Footprint area in square meters (calculated from polygon) */
  areaM2: number;
  /** Polygon ring in local meter coordinates [x, y] */
  ring: Array<[number, number]>;
}

/** Raw OSM building data */
const rawBuildings: BuildingFootprint[] = [
  {
    osmId: 548259886,
    name: 'Gedung H',
    floors: 7,
    areaM2: 1483,
    ring: [
      [-94, 137], [-94, 144], [-109, 143], [-124, 142],
      [-120, 81], [-102, 83], [-104, 112], [-92, 113], [-94, 137]
    ],
  },
  {
    osmId: 567365663,
    name: 'Gedung D',
    floors: 5,
    areaM2: 1303,
    ring: [
      [-88, -121], [-41, -105], [-49, -80], [-96, -96], [-88, -121]
    ],
  },
  {
    osmId: 441908564,
    name: 'Gedung G',
    floors: 3,
    areaM2: 1159,
    ring: [
      [-33, 147], [-83, 139], [-79, 118], [-61, 121],
      [-60, 118], [-38, 121], [-29, 123], [-33, 147]
    ],
  },
  {
    osmId: 567365662,
    name: 'Gedung E',
    floors: 3,
    areaM2: 707,
    ring: [
      [-140, -169], [-106, -156], [-113, -138], [-147, -151], [-140, -169]
    ],
  },
  {
    osmId: 559044141,
    name: 'Gedung F (Pusat Kegiatan Mahasiswa)',
    floors: 2,
    areaM2: 679,
    ring: [
      [-177, -64], [-161, -106], [-150, -103], [-158, -76],
      [-151, -74], [-155, -60], [-168, -63], [-169, -62], [-177, -64]
    ],
  },
  {
    osmId: 559044152,
    name: 'Gedung A',
    floors: 2,
    areaM2: 598,
    ring: [
      [-71, -52], [-74, -40], [-87, -43], [-81, -70],
      [-67, -66], [-67, -66], [-54, -63], [-57, -49], [-71, -52]
    ],
  },
];

/**
 * Simplified building specifications for isometric rendering.
 * Extends footprint with visual parameters.
 */
export interface BuildingSpec {
  id: string;
  name: string;
  /** Backing ID from campusTwin.ts for operational data join */
  twinId: string | null;
  /** OSM way ID for attribution */
  osmId: number | null;
  /** Footprint polygon in world meters */
  footprint: Array<[number, number]>;
  /** Number of floors */
  floors: number;
  /** Roof style */
  roof: 'flat' | 'hip' | 'gable' | 'terraced' | 'dome';
  /** Facade style */
  facade: 'grid' | 'ribbon' | 'curtain' | 'colonnade';
  /** Material */
  material: 'concrete' | 'brick' | 'glass' | 'stone';
  /** Crown feature */
  crown: 'penthouse' | 'tower' | 'antenna' | 'tank' | 'none';
  /** Podium inset */
  podium: { inset: number; h: number } | null;
  /** Entrance location */
  entrance: { edge: 'N' | 'S' | 'E' | 'W'; offset: number; canopy: boolean } | null;
  /** Footprint area in m² */
  areaM2: number;
}

/**
 * Convert raw footprint to BuildingSpec with visual parameters.
 * Visual parameters are assigned based on building characteristics.
 */
function toSpec(raw: BuildingFootprint, twinId: string | null): BuildingSpec {
  // Determine roof style based on floors and area
  let roof: BuildingSpec['roof'] = 'flat';
  if (raw.floors && raw.floors >= 5) roof = 'terraced';
  else if (raw.areaM2 > 1000) roof = 'hip';

  // Determine facade based on area
  let facade: BuildingSpec['facade'] = 'grid';
  if (raw.areaM2 > 1200) facade = 'curtain';
  else if (raw.areaM2 < 700) facade = 'ribbon';

  // Material assignment
  const material: BuildingSpec['material'] = raw.floors && raw.floors >= 5 ? 'concrete' : 'brick';

  // Crown for tallest building
  const crown: BuildingSpec['crown'] = raw.floors && raw.floors >= 7 ? 'antenna' : 'none';

  // Entrance on the side closest to campus center (approx 0,0)
  const cx = raw.ring.reduce((s, p) => s + p[0], 0) / raw.ring.length;
  const cy = raw.ring.reduce((s, p) => s + p[1], 0) / raw.ring.length;
  let entranceEdge: 'N' | 'S' | 'E' | 'W' = 'N';
  if (cx > 0) entranceEdge = 'W';
  else if (cx < 0) entranceEdge = 'E';
  else if (cy > 0) entranceEdge = 'N';
  else entranceEdge = 'S';

  return {
    id: `bldg-${raw.osmId}`,
    name: raw.name,
    twinId,
    osmId: raw.osmId,
    footprint: raw.ring,
    floors: raw.floors ?? 2,
    roof,
    facade,
    material,
    crown,
    podium: null,
    entrance: { edge: entranceEdge, offset: 0.5, canopy: true },
    areaM2: raw.areaM2,
  };
}

/**
 * Campus buildings with real OSM geometry.
 * twinId maps to campusTwin.ts IDs where available.
 */
export const campusBuildings: BuildingSpec[] = [
  toSpec(rawBuildings[0], 'it-operations'), // Gedung H - tallest, IT Operations
  toSpec(rawBuildings[1], 'building-A'),    // Gedung D - Fakultas Teknik
  toSpec(rawBuildings[2], null),            // Gedung G
  toSpec(rawBuildings[3], 'building-B'),    // Gedung E
  toSpec(rawBuildings[4], null),            // Gedung F - PKM
  toSpec(rawBuildings[5], 'building-C'),    // Gedung A
];

/**
 * Campus roads from OSM.
 * Simplified to centerline segments with width.
 */
export interface RoadSegment {
  id: string;
  name: string | null;
  /** Start and end points in world meters */
  from: [number, number];
  to: [number, number];
  /** Width in meters */
  width: number;
  /** Road type */
  type: 'primary' | 'secondary' | 'tertiary' | 'residential';
}

/**
 * Major roads around campus (from OSM, simplified).
 * Coordinates are approximate centerlines in local meters.
 */
export const campusRoads: RoadSegment[] = [
  // Jl. Imam Bonjol (north-south, western edge)
  {
    id: 'road-imam-bonjol',
    name: 'Jl. Imam Bonjol',
    from: [-200, -300],
    to: [-200, 400],
    width: 12,
    type: 'primary',
  },
  // Jl. Nakula (east-west, southern edge)
  {
    id: 'road-nakula',
    name: 'Jl. Nakula',
    from: [-300, 200],
    to: [300, 200],
    width: 10,
    type: 'secondary',
  },
  // Internal campus road (north-south through center)
  {
    id: 'road-campus-main',
    name: null,
    from: [0, -200],
    to: [0, 200],
    width: 8,
    type: 'residential',
  },
  // Internal campus road (east-west through center)
  {
    id: 'road-campus-cross',
    name: null,
    from: [-150, 0],
    to: [150, 0],
    width: 8,
    type: 'residential',
  },
];

/**
 * Pedestrian paths connecting buildings to main roads.
 */
export interface PedestrianPath {
  id: string;
  /** Path points in world meters */
  points: Array<[number, number]>;
  /** Width in meters */
  width: number;
}

export const pedestrianPaths: PedestrianPath[] = campusBuildings.map((b, i) => {
  // Calculate centroid
  const cx = b.footprint.reduce((s, p) => s + p[0], 0) / b.footprint.length;
  const cy = b.footprint.reduce((s, p) => s + p[1], 0) / b.footprint.length;

  // Connect to nearest road (simplified: connect to center axis)
  return {
    id: `path-${b.id}`,
    points: [
      [cx, cy],
      [cx > 0 ? 50 : -50, cy],
      [cx > 0 ? 50 : -50, 0],
      [0, 0],
    ],
    width: 4,
  };
});

/**
 * Plaza and open spaces.
 */
export interface Plaza {
  id: string;
  name: string;
  /** Center point */
  center: [number, number];
  /** Radius or dimensions */
  radius: number;
  /** Shape */
  shape: 'circle' | 'rectangle';
  /** Dimensions for rectangle */
  dimensions?: [number, number];
}

export const plazas: Plaza[] = [
  {
    id: 'plaza-grha',
    name: 'Grha Plaza',
    center: [0, 100],
    radius: 26,
    shape: 'circle',
  },
  {
    id: 'plaza-gate',
    name: 'Plaza Gerbang Utara',
    center: [0, -150],
    radius: 12,
    shape: 'circle',
  },
];

/**
 * Landmarks and points of interest.
 */
export interface Landmark {
  id: string;
  name: string;
  position: [number, number];
  type: 'flagpole' | 'monument' | 'gazebo' | 'fountain';
}

export const landmarks: Landmark[] = [
  { id: 'landmark-flag', name: 'Tiang Bendera', position: [0, -120], type: 'flagpole' },
  { id: 'landmark-monument', name: 'Monumen', position: [0, 50], type: 'monument' },
  { id: 'landmark-fountain', name: 'Air Mancur', position: [0, -150], type: 'fountain' },
];

/**
 * Calculate bounding box for all campus elements.
 */
export function getCampusBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const b of campusBuildings) {
    for (const [x, y] of b.footprint) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  // Add padding
  const padding = 50;
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}
