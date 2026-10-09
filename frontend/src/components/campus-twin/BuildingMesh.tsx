'use client';

import { useMemo } from 'react';
import { project, toPath, shade, type IsoPoint } from '@/lib/isometric';
import { type BuildingSpec } from '@/data/campusGeometry';
import { getPalette, type ColorMode } from '@/lib/campusPalette';

interface BuildingMeshProps {
  building: BuildingSpec;
  colorMode: ColorMode;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Render a single building in isometric 3D.
 * Uses real OSM footprint polygon with parametric elevation.
 */
export function BuildingMesh({ building, colorMode, isSelected, onClick }: BuildingMeshProps) {
  const palette = useMemo(() => getPalette(colorMode), [colorMode]);

  const { footprint, floors, roof, facade, material, crown, entrance } = building;
  const floorHeight = 3.6; // meters per floor
  const totalHeight = floors * floorHeight;

  // Project footprint to screen space
  const footprintPoints: IsoPoint[] = footprint.map(([x, y]) => project(x, y));

  // Calculate roof points (elevated)
  const roofPoints: IsoPoint[] = footprint.map(([x, y]) => project(x, y, totalHeight));

  // Determine visible sides based on isometric projection
  // In our projection, +x is right, +y is left (iso screen sense)
  // We render the two sides facing the camera: +x (right) and +y (left)

  // Find the two visible faces
  const minX = Math.min(...footprint.map((p) => p[0]));
  const maxX = Math.max(...footprint.map((p) => p[0]));
  const minY = Math.min(...footprint.map((p) => p[1]));
  const maxY = Math.max(...footprint.map((p) => p[1]));

  // Right face (+x side): from (maxX, minY) to (maxX, maxY)
  const rightFaceBottom: IsoPoint[] = [
    project(maxX, minY),
    project(maxX, maxY),
  ];
  const rightFaceTop: IsoPoint[] = [
    project(maxX, minY, totalHeight),
    project(maxX, maxY, totalHeight),
  ];

  // Left face (+y side): from (minX, maxY) to (maxX, maxY)
  const leftFaceBottom: IsoPoint[] = [
    project(minX, maxY),
    project(maxX, maxY),
  ];
  const leftFaceTop: IsoPoint[] = [
    project(minX, maxY, totalHeight),
    project(maxX, maxY, totalHeight),
  ];

  // Colors based on material and lighting
  const baseColor = material === 'concrete' ? '#8B9DAF' : material === 'brick' ? '#A0522D' : '#C0C0C0';
  const roofColor = palette.roofGradientStart;
  const rightFaceColor = shade(baseColor, 0.85); // Slightly darker
  const leftFaceColor = shade(baseColor, 0.72); // Darker (shaded side)

  // Window pattern
  const windowCols = Math.max(2, Math.floor((maxX - minX) / 3.2));
  const windowRows = floors;
  const windowWidth = 1.6;
  const windowHeight = 1.4;
  const windowSpacingX = (maxX - minX - windowWidth) / windowCols;
  const windowSpacingY = floorHeight - windowHeight;

  // Generate windows for right face
  const rightWindows = [];
  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowCols; col++) {
      const wx = maxX - 0.1; // Slightly inset from edge
      const wy = minY + col * windowSpacingX + windowSpacingX / 2;
      const wz = row * floorHeight + windowSpacingY / 2;

      const wPoints = [
        project(wx, wy, wz),
        project(wx, wy + windowWidth, wz),
        project(wx, wy + windowWidth, wz + windowHeight),
        project(wx, wy, wz + windowHeight),
      ];

      // Deterministic on/off based on building ID and position
      const isOn = (building.osmId ?? 0 + row * 7 + col * 13) % 100 < 18;

      rightWindows.push(
        <polygon
          key={`rw-${row}-${col}`}
          points={wPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={isOn ? palette.windowOn : palette.windowOff}
          opacity={isOn ? 0.8 : 0.6}
        />
      );
    }
  }

  // Generate windows for left face
  const leftWindows = [];
  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowCols; col++) {
      const wx = minX + col * windowSpacingX + windowSpacingX / 2;
      const wy = maxY - 0.1; // Slightly inset from edge
      const wz = row * floorHeight + windowSpacingY / 2;

      const wPoints = [
        project(wx, wy, wz),
        project(wx + windowWidth, wy, wz),
        project(wx + windowWidth, wy, wz + windowHeight),
        project(wx, wy, wz + windowHeight),
      ];

      const isOn = (building.osmId ?? 0 + row * 11 + col * 17) % 100 < 18;

      leftWindows.push(
        <polygon
          key={`lw-${row}-${col}`}
          points={wPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={isOn ? palette.windowOn : palette.windowOff}
          opacity={isOn ? 0.8 : 0.6}
        />
      );
    }
  }

  // Entrance marker
  const entrancePos = entrance
    ? project(
        entrance.edge === 'E' ? maxX : entrance.edge === 'W' ? minX : (minX + maxX) / 2,
        entrance.edge === 'N' ? minY : entrance.edge === 'S' ? maxY : (minY + maxY) / 2,
        0
      )
    : null;

  // Crown feature (antenna for tall buildings)
  const crownElement =
    crown === 'antenna' ? (
      <g>
        <line
          x1={project((minX + maxX) / 2, (minY + maxY) / 2, totalHeight).x}
          y1={project((minX + maxX) / 2, (minY + maxY) / 2, totalHeight).y}
          x2={project((minX + maxX) / 2, (minY + maxY) / 2, totalHeight + 12).x}
          y2={project((minX + maxX) / 2, (minY + maxY) / 2, totalHeight + 12).y}
          stroke={palette.textMid}
          strokeWidth={1}
        />
        <circle
          cx={project((minX + maxX) / 2, (minY + maxY) / 2, totalHeight + 12).x}
          cy={project((minX + maxX) / 2, (minY + maxY) / 2, totalHeight + 12).y}
          r={2}
          fill={palette.critical}
        >
          <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
        </circle>
      </g>
    ) : null;

  return (
    <g
      onClick={onClick}
      className="cursor-pointer"
      style={{
        filter: isSelected ? `drop-shadow(0 0 8px ${palette.accent})` : 'none',
      }}
    >
      {/* Shadow */}
      <polygon
        points={footprintPoints.map((p) => `${p.x + 8},${p.y + 6}`).join(' ')}
        fill="#000000"
        opacity={colorMode === 'ops' ? 0.28 : 0.16}
        style={{ filter: 'blur(3px)' }}
      />

      {/* Right face */}
      <polygon
        points={[...rightFaceBottom, ...rightFaceTop.reverse()]
          .map((p) => `${p.x},${p.y}`)
          .join(' ')}
        fill={rightFaceColor}
        stroke={shade(rightFaceColor, 0.9)}
        strokeWidth={0.5}
      />

      {/* Left face */}
      <polygon
        points={[...leftFaceBottom, ...leftFaceTop.reverse()]
          .map((p) => `${p.x},${p.y}`)
          .join(' ')}
        fill={leftFaceColor}
        stroke={shade(leftFaceColor, 0.9)}
        strokeWidth={0.5}
      />

      {/* Roof */}
      <polygon
        points={roofPoints.map((p) => `${p.x},${p.y}`).join(' ')}
        fill={roofColor}
        stroke={shade(roofColor, 1.1)}
        strokeWidth={1}
      />

      {/* Roof parapet */}
      <polygon
        points={roofPoints.map((p) => `${p.x},${p.y - 0.4}`).join(' ')}
        fill="none"
        stroke={shade(roofColor, 1.2)}
        strokeWidth={0.5}
        opacity={0.6}
      />

      {/* Windows - right face */}
      {rightWindows}

      {/* Windows - left face */}
      {leftWindows}

      {/* Crown */}
      {crownElement}

      {/* Entrance marker */}
      {entrancePos && (
        <circle
          cx={entrancePos.x}
          cy={entrancePos.y}
          r={3}
          fill={palette.accent}
          opacity={0.8}
        />
      )}

      {/* Selection ring */}
      {isSelected && (
        <polygon
          points={roofPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={palette.accent}
          strokeWidth={2}
          opacity={0.8}
        />
      )}
    </g>
  );
}
