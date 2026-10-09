'use client';

import { useMemo } from 'react';
import { project } from '@/lib/isometric';
import { campusBuildings } from '@/data/campusGeometry';
import { getOperationalData } from '@/data/campusTwinExtended';
import { getPalette, type ColorMode } from '@/lib/campusPalette';
import { Badge } from '@/components/ui/Badge';

interface BuildingPinsProps {
  colorMode: ColorMode;
  selectedBuildingId?: string;
  onSelectBuilding: (id: string) => void;
}

/**
 * HTML overlay for building labels and pins.
 * Positioned using projected coordinates from SVG space.
 */
export function BuildingPins({ colorMode, selectedBuildingId, onSelectBuilding }: BuildingPinsProps) {
  const palette = useMemo(() => getPalette(colorMode), [colorMode]);

  const pins = useMemo(() => {
    return campusBuildings.map((building) => {
      const cx = building.footprint.reduce((s, p) => s + p[0], 0) / building.footprint.length;
      const cy = building.footprint.reduce((s, p) => s + p[1], 0) / building.footprint.length;
      const projected = project(cx, cy);

      const opData = getOperationalData(building.id);
      const status = opData?.status ?? 'operational';

      return {
        id: building.id,
        name: building.name,
        x: projected.x,
        y: projected.y,
        status,
        isSelected: selectedBuildingId === building.id,
      };
    });
  }, [selectedBuildingId]);

  const statusColors: Record<string, string> = {
    operational: palette.success,
    attention: palette.warning,
    critical: palette.critical,
    maintenance: palette.maintenance,
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {pins.map((pin) => (
        <button
          key={pin.id}
          type="button"
          onClick={() => onSelectBuilding(pin.id)}
          className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-transform hover:scale-110 ${
            pin.isSelected ? 'scale-110 z-20' : 'z-10'
          }`}
          style={{
            left: `${((pin.x + 1000) / 3000) * 100}%`,
            top: `${((pin.y + 1000) / 3000) * 100}%`,
          }}
        >
          <div className="flex flex-col items-center gap-1">
            {/* Status dot */}
            <div
              className="h-3 w-3 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: statusColors[pin.status] }}
            />
            {/* Label */}
            <div
              className={`px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap shadow-sm ${
                pin.isSelected ? 'bg-white text-gray-900' : 'bg-white/80 text-gray-700'
              }`}
              style={{
                borderColor: pin.isSelected ? palette.accent : 'transparent',
                borderWidth: pin.isSelected ? '2px' : '0',
              }}
            >
              {pin.name}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
