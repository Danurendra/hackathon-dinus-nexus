'use client';

import { useMemo } from 'react';
import { project, type IsoPoint } from '@/lib/isometric';
import { getBuildingAnchor } from '@/lib/spatial';
import { campusBuildings } from '@/data/campusGeometry';
import { getOperationalData } from '@/data/campusTwinExtended';
import { getPalette, type ColorMode } from '@/lib/campusPalette';
import { keyedRandom } from '@/lib/prng';
import type { LayerType } from './LayerToggle';

interface LayerOverlayProps {
  colorMode: ColorMode;
  activeLayers: Set<LayerType>;
}

/**
 * Resolve the shared anchor point (projected) for a building.
 * Returns null when the building has no valid geometry, so callers can skip
 * rendering a marker rather than fabricating a position.
 */
function getAnchorPoint(building: (typeof campusBuildings)[number]): IsoPoint | null {
  const anchor = getBuildingAnchor(building);
  if (!anchor) return null;
  return project(anchor[0], anchor[1], 0);
}

/**
 * Render visualization layers on top of the isometric canvas.
 * Each layer adds visual information about different operational aspects.
 *
 * All markers use the same area-weighted building anchor as the building
 * meshes and labels, so overlays stay aligned during zoom and pan.
 */
export function LayerOverlay({ colorMode, activeLayers }: LayerOverlayProps) {
  const palette = useMemo(() => getPalette(colorMode), [colorMode]);

  // Status layer: colored rings around buildings
  const statusLayer = useMemo(() => {
    if (!activeLayers.has('status')) return null;

    return campusBuildings.map((building) => {
      const opData = getOperationalData(building.id);
      if (!opData) return null;

      const projected = getAnchorPoint(building);
      if (!projected) return null;

      const statusColors: Record<string, string> = {
        operational: palette.success,
        attention: palette.warning,
        critical: palette.critical,
        maintenance: palette.maintenance,
      };

      const color = statusColors[opData.status] ?? palette.textLow;

      return (
        <circle
          key={`status-${building.id}`}
          cx={projected.x}
          cy={projected.y}
          r={28}
          fill="none"
          stroke={color}
          strokeWidth={3}
          opacity={0.7}
        >
          {opData.status === 'critical' && (
            <animate
              attributeName="opacity"
              values="0.7;0.3;0.7"
              dur="1.5s"
              repeatCount="indefinite"
            />
          )}
        </circle>
      );
    });
  }, [activeLayers, colorMode]);

  // Density layer: heatmap circles
  const densityLayer = useMemo(() => {
    if (!activeLayers.has('density')) return null;

    return campusBuildings.map((building) => {
      const opData = getOperationalData(building.id);
      if (!opData) return null;

      const projected = getAnchorPoint(building);
      if (!projected) return null;

      // Simulate density based on capacity and time of day
      const density = opData.dailyCapacity !== null && opData.eventCapacity !== null && opData.eventCapacity > 0
        ? Math.min(1, (opData.dailyCapacity * 0.6) / opData.eventCapacity)
        : 0.3;

      const radius = 20 + density * 30;
      const opacity = 0.2 + density * 0.4;

      return (
        <circle
          key={`density-${building.id}`}
          cx={projected.x}
          cy={projected.y}
          r={radius}
          fill={palette.warning}
          opacity={opacity}
          style={{ filter: 'blur(8px)' }}
        />
      );
    });
  }, [activeLayers, colorMode]);

  // Flow layer: animated arrows showing pedestrian movement
  const flowLayer = useMemo(() => {
    if (!activeLayers.has('flow')) return null;

    const rand = keyedRandom('flow');
    const flows: Array<{ from: IsoPoint; to: IsoPoint; intensity: number }> = [];

    // Generate flows between buildings
    for (let i = 0; i < campusBuildings.length; i++) {
      for (let j = i + 1; j < campusBuildings.length; j++) {
        const b1 = campusBuildings[i];
        const b2 = campusBuildings[j];

        const a1 = getBuildingAnchor(b1);
        const a2 = getBuildingAnchor(b2);
        if (!a1 || !a2) continue;

        const from = project(a1[0], a1[1], 0);
        const to = project(a2[0], a2[1], 0);

        // Distance-based intensity
        const dist = Math.sqrt((a2[0] - a1[0]) ** 2 + (a2[1] - a1[1]) ** 2);
        const intensity = Math.max(0.2, 1 - dist / 200);

        if (rand() > 0.3) {
          flows.push({ from, to, intensity });
        }
      }
    }

    return flows.map((flow, idx) => (
      <g key={`flow-${idx}`}>
        <line
          x1={flow.from.x}
          y1={flow.from.y}
          x2={flow.to.x}
          y2={flow.to.y}
          stroke={palette.accent}
          strokeWidth={1 + flow.intensity * 2}
          opacity={0.4}
          strokeDasharray="4 4"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-8"
            dur={`${2 - flow.intensity}s`}
            repeatCount="indefinite"
          />
        </line>
        {/* Arrow head */}
        <circle cx={flow.to.x} cy={flow.to.y} r={2} fill={palette.accent} opacity={0.6} />
      </g>
    ));
  }, [activeLayers, colorMode]);

  // Energy layer: power consumption indicators
  const energyLayer = useMemo(() => {
    if (!activeLayers.has('energy')) return null;

    return campusBuildings.map((building) => {
      const opData = getOperationalData(building.id);
      if (!opData) return null;

      const projected = getAnchorPoint(building);
      if (!projected) return null;

      // Normalize energy to 0-1 range (max ~100kW)
      const normalized = Math.min(1, opData.baseEnergyKw / 100);

      return (
        <g key={`energy-${building.id}`}>
          {/* Energy bar */}
          <rect
            x={projected.x - 15}
            y={projected.y - 30}
            width={30}
            height={4}
            fill={palette.textLow}
            opacity={0.3}
            rx={2}
          />
          <rect
            x={projected.x - 15}
            y={projected.y - 30}
            width={30 * normalized}
            height={4}
            fill={normalized > 0.7 ? palette.critical : normalized > 0.4 ? palette.warning : palette.success}
            rx={2}
          />
          {/* Label */}
          <text
            x={projected.x}
            y={projected.y - 35}
            textAnchor="middle"
            fontSize={8}
            fill={palette.textHigh}
            fontWeight="bold"
          >
            {opData.baseEnergyKw} kW
          </text>
        </g>
      );
    });
  }, [activeLayers, colorMode]);

  // Incidents layer: IT incident markers
  const incidentsLayer = useMemo(() => {
    if (!activeLayers.has('incidents')) return null;

    return campusBuildings
      .map((building) => {
        const opData = getOperationalData(building.id);
        if (!opData || opData.activeIncidents === 0) return null;

        const projected = getAnchorPoint(building);
        if (!projected) return null;

        return (
          <g key={`incident-${building.id}`}>
            {/* Warning triangle */}
            <polygon
              points={`${projected.x},${projected.y - 40} ${projected.x - 8},${projected.y - 28} ${projected.x + 8},${projected.y - 28}`}
              fill={palette.warning}
              stroke={palette.textHigh}
              strokeWidth={1}
            />
            <text
              x={projected.x}
              y={projected.y - 32}
              textAnchor="middle"
              fontSize={10}
              fill={palette.textHigh}
              fontWeight="bold"
            >
              {opData.activeIncidents}
            </text>
          </g>
        );
      })
      .filter(Boolean);
  }, [activeLayers, colorMode]);

  // Security layer: security incident markers
  const securityLayer = useMemo(() => {
    if (!activeLayers.has('security')) return null;

    return campusBuildings
      .map((building) => {
        const opData = getOperationalData(building.id);
        if (!opData || opData.securityIncidents === 0) return null;

        const projected = getAnchorPoint(building);
        if (!projected) return null;

        return (
          <g key={`security-${building.id}`}>
            {/* Shield icon */}
            <circle
              cx={projected.x}
              cy={projected.y - 35}
              r={10}
              fill={palette.critical}
              opacity={0.8}
            >
              <animate
                attributeName="r"
                values="10;12;10"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            <text
              x={projected.x}
              y={projected.y - 32}
              textAnchor="middle"
              fontSize={12}
              fill="white"
              fontWeight="bold"
            >
              !
            </text>
          </g>
        );
      })
      .filter(Boolean);
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