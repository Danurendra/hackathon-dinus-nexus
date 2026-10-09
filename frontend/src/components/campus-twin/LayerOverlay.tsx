'use client';

import { useMemo } from 'react';
import { project, type IsoPoint } from '@/lib/isometric';
import { getBuildingAnchor } from '@/lib/spatial';
import { campusBuildings } from '@/data/campusGeometry';
import { getPalette, type ColorMode } from '@/lib/campusPalette';
import type { LayerType } from './LayerToggle';
import {
  getStatusData,
  getDensityData,
  getEnergyData,
  getIncidentData,
  getFlowData,
} from '@/lib/layerModel';

interface LayerOverlayProps {
  colorMode: ColorMode;
  activeLayers: Set<LayerType>;
}

/** Project a building's area-weighted anchor at ground level. */
function anchorOf(building: (typeof campusBuildings)[number]): IsoPoint | null {
  const anchor = getBuildingAnchor(building);
  if (!anchor) return null;
  return project(anchor[0], anchor[1], 0);
}

/** Color a normalized 0–1 value on a green→amber→red scale. */
function scaleColor(p: ReturnType<typeof getPalette>, ratio: number): string {
  if (ratio >= 0.75) return p.critical;
  if (ratio >= 0.5) return p.warning;
  return p.success;
}

/**
 * Renders each active layer as an independent SVG group.
 *
 * Groups are self-contained, so toggling one layer never affects the base map
 * or the other layers. Markers use the same building anchor as the meshes and
 * labels. Layers with no data render nothing here; the legend reports their
 * unavailable state explicitly.
 */
export function LayerOverlay({ colorMode, activeLayers }: LayerOverlayProps) {
  const palette = useMemo(() => getPalette(colorMode), [colorMode]);

  // Operational status: semantic rings
  const statusLayer = useMemo(() => {
    if (!activeLayers.has('status')) return null;
    return getStatusData().map(({ building, status }) => {
      const p = anchorOf(building);
      if (!p) return null;
      const color =
        status === 'operational' ? palette.success
        : status === 'attention' ? palette.warning
        : status === 'critical' ? palette.critical
        : status === 'maintenance' ? palette.maintenance
        : palette.textMid;
      return (
        <circle key={`status-${building.id}`} cx={p.x} cy={p.y} r={30} fill="none" stroke={color} strokeWidth={3} opacity={0.75}>
          {status === 'critical' && (
            <animate attributeName="opacity" values="0.75;0.3;0.75" dur="1.5s" repeatCount="indefinite" />
          )}
        </circle>
      );
    });
  }, [activeLayers, colorMode]);

  // Occupancy density: normalized heat circles + occupants
  const densityLayer = useMemo(() => {
    if (!activeLayers.has('density')) return null;
    return getDensityData().data.map(({ building, occupied, ratio }) => {
      const p = anchorOf(building);
      if (!p) return null;
      const color = scaleColor(palette, ratio);
      return (
        <g key={`density-${building.id}`}>
          <circle cx={p.x} cy={p.y} r={14 + ratio * 28} fill={color} opacity={0.22 + ratio * 0.35} style={{ filter: 'blur(6px)' }} />
          <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize={9} fontWeight={700} fill={palette.textHigh}>
            {occupied}
          </text>
        </g>
      );
    });
  }, [activeLayers, colorMode]);

  // Pedestrian flow: directional corridors (building → campus center)
  const flowLayer = useMemo(() => {
    if (!activeLayers.has('flow')) return null;
    const flows = getFlowData();
    if (flows.length === 0) return null;

    return flows.map((flow) => {
      const pts = flow.points.map(([x, y]) => project(x, y, 0));
      const path = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x} ${pt.y}`).join(' ');
      const last = pts[pts.length - 1];
      const prev = pts[pts.length - 2] ?? last;
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      const size = 6;
      const head = [
        [last.x, last.y],
        [last.x - size * Math.cos(angle - 0.4), last.y - size * Math.sin(angle - 0.4)],
        [last.x - size * Math.cos(angle + 0.4), last.y - size * Math.sin(angle + 0.4)],
      ].map(([x, y]) => `${x},${y}`).join(' ');

      return (
        <g key={`flow-${flow.id}`}>
          <path d={path} fill="none" stroke={palette.accent} strokeWidth={flow.width / 2} opacity={0.5} strokeDasharray="6 6">
            <animate attributeName="stroke-dashoffset" values="0;-12" dur="1.6s" repeatCount="indefinite" />
          </path>
          <polygon points={head} fill={palette.accent} opacity={0.8} />
        </g>
      );
    });
  }, [activeLayers, colorMode]);

  // Energy: normalized bars in kW
  const energyLayer = useMemo(() => {
    if (!activeLayers.has('energy')) return null;
    return getEnergyData().data.map(({ building, kw, ratio }) => {
      const p = anchorOf(building);
      if (!p) return null;
      const color = scaleColor(palette, ratio);
      return (
        <g key={`energy-${building.id}`}>
          <rect x={p.x - 16} y={p.y - 34} width={32} height={5} rx={2} fill={palette.textLow} opacity={0.3} />
          <rect x={p.x - 16} y={p.y - 34} width={32 * ratio} height={5} rx={2} fill={color} />
          <text x={p.x} y={p.y - 38} textAnchor="middle" fontSize={8} fontWeight={700} fill={palette.textHigh}>
            {kw} kW
          </text>
        </g>
      );
    });
  }, [activeLayers, colorMode]);

  // IT incidents at their building
  const incidentsLayer = useMemo(() => {
    if (!activeLayers.has('incidents')) return null;
    return getIncidentData('it').data.map(({ building, count }) => {
      const p = anchorOf(building);
      if (!p) return null;
      return (
        <g key={`incident-${building.id}`}>
          <polygon
            points={`${p.x},${p.y - 44} ${p.x - 9},${p.y - 30} ${p.x + 9},${p.y - 30}`}
            fill={palette.warning}
            stroke={palette.textHigh}
            strokeWidth={1}
          />
          <text x={p.x} y={p.y - 33} textAnchor="middle" fontSize={10} fontWeight={700} fill={palette.textHigh}>
            {count}
          </text>
        </g>
      );
    });
  }, [activeLayers, colorMode]);

  // Physical security incidents at their building
  const securityLayer = useMemo(() => {
    if (!activeLayers.has('security')) return null;
    return getIncidentData('security').data.map(({ building, count }) => {
      const p = anchorOf(building);
      if (!p) return null;
      return (
        <g key={`security-${building.id}`}>
          <circle cx={p.x} cy={p.y - 36} r={11} fill={palette.critical} opacity={0.85}>
            <animate attributeName="r" values="11;13;11" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x={p.x} y={p.y - 32} textAnchor="middle" fontSize={12} fontWeight={700} fill={palette.accentText}>
            {count}
          </text>
        </g>
      );
    });
  }, [activeLayers, colorMode]);

  return (
    <g>
      {statusLayer}
      {densityLayer}
      {flowLayer}
      {energyLayer}
      {incidentsLayer}
      {securityLayer}
    </g>
  );
}