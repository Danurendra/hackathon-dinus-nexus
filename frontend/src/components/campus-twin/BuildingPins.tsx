'use client';

import { useMemo } from 'react';
import { project } from '@/lib/isometric';
import { getBuildingAnchor, isPointInPolygon } from '@/lib/spatial';
import { campusBuildings } from '@/data/campusGeometry';
import { getOperationalData } from '@/data/campusTwinExtended';
import { getPalette, type ColorMode } from '@/lib/campusPalette';

interface BuildingPinsProps {
  colorMode: ColorMode;
  selectedBuildingId?: string;
  onSelectBuilding: (id: string) => void;
}

interface PinData {
  id: string;
  name: string;
  /** Anchor projected at roof height (where the marker sits). */
  markerX: number;
  markerY: number;
  /** Label anchor, above the marker. */
  labelY: number;
  status: string;
  isSelected: boolean;
  geometryMissing: boolean;
}

/**
 * SVG overlay for building markers and labels.
 *
 * Rendered as a child of <IsometricCanvas>, so it shares the exact same
 * projection and viewport transform as the building meshes. Markers are
 * anchored to the area-weighted centroid of each building's footprint
 * (projected at roof height), which guarantees they stay attached during
 * zoom and pan.
 *
 * Buildings without valid geometry are skipped and reported separately;
 * no geographic position is fabricated.
 */
export function BuildingPins({ colorMode, selectedBuildingId, onSelectBuilding }: BuildingPinsProps) {
  const palette = useMemo(() => getPalette(colorMode), [colorMode]);

  const floorHeight = 3.6;

  const { pins, missing } = useMemo(() => {
    const pins: PinData[] = [];
    const missing: string[] = [];

    for (const building of campusBuildings) {
      const anchor = getBuildingAnchor(building);
      if (!anchor) {
        missing.push(building.name);
        continue;
      }

      // Anchor is expected to be inside the footprint; if not (odd polygon),
      // skip rather than place a misleading marker.
      if (!isPointInPolygon(anchor, building.footprint)) {
        missing.push(building.name);
        continue;
      }

      const roofZ = building.floors * floorHeight;
      const marker = project(anchor[0], anchor[1], roofZ);

      const opData = getOperationalData(building.id);

      pins.push({
        id: building.id,
        name: building.name,
        markerX: marker.x,
        markerY: marker.y,
        labelY: marker.y - 12,
        status: opData?.status ?? 'operational',
        isSelected: selectedBuildingId === building.id,
        geometryMissing: false,
      });
    }

    return { pins, missing };
  }, [selectedBuildingId]);

  const statusColors: Record<string, string> = {
    operational: palette.success,
    attention: palette.warning,
    critical: palette.critical,
    maintenance: palette.maintenance,
  };

  return (
    <g>
      {/* Missing geometry fallback notice, printed off the campus area. */}
      {missing.length > 0 && (
        <g aria-hidden="true">
          <text x={0} y={0} fontSize={10} fill={palette.warning}>
            Geometri tidak tersedia: {missing.join(', ')}
          </text>
        </g>
      )}

      {pins.map((pin) => {
        const labelWidth = Math.max(48, pin.name.length * 5.4 + 12);
        const labelHeight = 14;
        const dotColor = statusColors[pin.status] ?? palette.textLow;

        return (
          <g
            key={pin.id}
            role="button"
            tabIndex={0}
            aria-label={`Pilih ${pin.name}, status ${pin.status}`}
            onClick={() => onSelectBuilding(pin.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectBuilding(pin.id);
              }
            }}
            className="cursor-pointer"
          >
            {/* Connection from marker to centroid at ground level, so the label
                is unambiguously attached to its own building. */}
            <line
              x1={pin.markerX}
              y1={pin.markerY}
              x2={pin.markerX}
              y2={pin.labelY - 2}
              stroke={dotColor}
              strokeWidth={1}
              opacity={0.6}
            />

            {/* Status marker */}
            <circle
              cx={pin.markerX}
              cy={pin.markerY}
              r={pin.isSelected ? 5 : 4}
              fill={dotColor}
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />

            {/* Label */}
            <rect
              x={pin.markerX - labelWidth / 2}
              y={pin.labelY - labelHeight}
              width={labelWidth}
              height={labelHeight}
              rx={3}
              fill={pin.isSelected ? palette.accent : palette.panelBg}
              stroke={pin.isSelected ? palette.accent : palette.panelBorder}
              strokeWidth={pin.isSelected ? 2 : 1}
              opacity={colorMode === 'ops' && !pin.isSelected ? 0.85 : 1}
            />
            <text
              x={pin.markerX}
              y={pin.labelY - 4}
              textAnchor="middle"
              fontSize={9}
              fontWeight={600}
              fill={pin.isSelected ? palette.accentText : palette.panelTextHigh}
            >
              {pin.name}
            </text>

            {/* Selection ring */}
            {pin.isSelected && (
              <circle
                cx={pin.markerX}
                cy={pin.markerY}
                r={9}
                fill="none"
                stroke={palette.accent}
                strokeWidth={1.5}
                opacity={0.8}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}