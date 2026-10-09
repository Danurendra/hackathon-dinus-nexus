'use client';

import { useMemo } from 'react';
import { project } from '@/lib/isometric';
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
 * Render visualization layers on top of the isometric canvas.
 * Each layer adds visual information about different operational aspects.
 */
export function LayerOverlay({ colorMode, activeLayers }: LayerOverlayProps) {
  const palette = useMemo(() => getPalette(colorMode), [colorMode]);

  // Status layer: colored rings around buildings
  const statusLayer = useMemo(() => {
    if (!activeLayers.has('status')) return null;

    return campusBuildings.map((building) => {
      const opData = getOperationalData(building.id);
      if (!opData) return null;

      const cx = building.footprint.reduce((s, p) => s + p[0], 0) / building.footprint.length;
      const cy = building.footprint.reduce((s, p) => s + p[1], 0) / building.footprint.length;
      const projected = project(cx, cy);

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

      const cx = building.footprint.reduce((s, p) => s + p[0], 0) / building.footprint.length;
      const cy = building.footprint.reduce((s, p) => s + p[1], 0) / building.footprint.length;
      const projected = project(cx, cy);

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
    const flows: Array<{ from: [number, number]; to: [number, number]; intensity: number }> = [];

    // Generate flows between buildings
    for (let i = 0; i < campusBuildings.length; i++) {
      for (let j = i + 1; j < campusBuildings.length; j++) {
        const b1 = campusBuildings[i];
        const b2 = campusBuildings[j];

        const cx1 = b1.footprint.reduce((s, p) => s + p[0], 0) / b1.footprint.length;
        const cy1 = b1.footprint.reduce((s, p) => s + p[1], 0) / b1.footprint.length;
        const cx2 = b2.footprint.reduce((s, p) => s + p[0], 0) / b2.footprint.length;
        const cy2 = b2.footprint.reduce((s, p) => s + p[1], 0) / b2.footprint.length;

        // Distance-based intensity
        const dist = Math.sqrt((cx2 - cx1) ** 2 + (cy2 - cy1) ** 2);
        const intensity = Math.max(0.2, 1 - dist / 200);

        if (rand() > 0.3) {
          flows.push({ from: [cx1, cy1], to: [cx2, cy2], intensity });
        }
      }
    }

    return flows.map((flow, idx) => {
      const from = project(flow.from[0], flow.from[1]);
      const to = project(flow.to[0], flow.to[1]);

      return (
        <g key={`flow-${idx}`}>
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
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
          <circle cx={to.x} cy={to.y} r={2} fill={palette.accent} opacity={0.6} />
        </g>
      );
    });
  }, [activeLayers, colorMode]);

  // Energy layer: power consumption indicators
  const energyLayer = useMemo(() => {
    if (!activeLayers.has('energy')) return null;

    return campusBuildings.map((building) => {
      const opData = getOperationalData(building.id);
      if (!opData) return null;

      const cx = building.footprint.reduce((s, p) => s + p[0], 0) / building.footprint.length;
      const cy = building.footprint.reduce((s, p) => s + p[1], 0) / building.footprint.length;
      const projected = project(cx, cy);

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

        const cx = building.footprint.reduce((s, p) => s + p[0], 0) / building.footprint.length;
        const cy = building.footprint.reduce((s, p) => s + p[1], 0) / building.footprint.length;
        const projected = project(cx, cy);

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

        const cx = building.footprint.reduce((s, p) => s + p[0], 0) / building.footprint.length;
        const cy = building.footprint.reduce((s, p) => s + p[1], 0) / building.footprint.length;
        const projected = project(cx, cy);

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
