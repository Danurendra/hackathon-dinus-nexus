'use client';

import { useMemo } from 'react';
import { project } from '@/lib/isometric';
import { getBuildingAnchor } from '@/lib/spatial';
import { campusBuildings } from '@/data/campusGeometry';
import { getPalette, type ColorMode } from '@/lib/campusPalette';
import type { ScenarioForecast } from '@/lib/scenarioModel';

interface ScenarioOverlayProps {
  colorMode: ColorMode;
  forecast: ScenarioForecast | null;
}

/**
 * Projects a scenario onto the map.
 *
 * For every building that has geometry and an allocation, draws a load ring
 * plus a percentage badge anchored to the same building geometry used by the
 * meshes/labels. Venues over capacity ("congestion hotspots") pulse. Pseudo
 * venues without geometry (plaza/staff zones) are intentionally skipped on the
 * map but still appear in the simulator table.
 *
 * Values are SYNTHETIC projections, never measured telemetry.
 */
export function ScenarioOverlay({ colorMode, forecast }: ScenarioOverlayProps) {
  const palette = useMemo(() => getPalette(colorMode), [colorMode]);

  const markers = useMemo(() => {
    if (!forecast) return null;

    const byId = new Map(forecast.allocations.map((a) => [a.buildingId, a]));

    return campusBuildings.map((building) => {
      const alloc = byId.get(building.id);
      const anchor = getBuildingAnchor(building);
      if (!alloc || !anchor) return null;

      const p = project(anchor[0], anchor[1], 0);
      const isHotspot = alloc.status === 'overload' || alloc.status === 'critical';
      const isAttention = alloc.status === 'attention';
      const color = isHotspot
        ? palette.critical
        : isAttention
          ? palette.warning
          : palette.success;

      return (
        <g key={`scenario-${building.id}`}>
          <circle
            cx={p.x}
            cy={p.y}
            r={42}
            fill="none"
            stroke={color}
            strokeWidth={isHotspot ? 3 : 2}
            strokeDasharray={isHotspot ? undefined : '5 4'}
            opacity={0.9}
          >
            {isHotspot && (
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.3s" repeatCount="indefinite" />
            )}
          </circle>
          <g>
            <rect
              x={p.x + 28}
              y={p.y - 56}
              width={50}
              height={16}
              rx={3}
              fill={palette.surfaceBg}
              stroke={color}
              strokeWidth={1}
              opacity={0.95}
            />
            <text
              x={p.x + 53}
              y={p.y - 44}
              textAnchor="middle"
              fontSize={9}
              fontWeight={700}
              fill={color}
            >
              {alloc.loadPercent}%
            </text>
          </g>
        </g>
      );
    });
  }, [forecast, colorMode]);

  if (!markers) return null;
  return <g aria-label="Scenario projection (synthetic)">{markers}</g>;
}