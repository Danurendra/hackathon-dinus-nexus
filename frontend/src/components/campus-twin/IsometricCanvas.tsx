'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FALLBACK_VIEWBOX } from '@/lib/isometric';
import { getCampusIsoBounds, boundsToViewBox } from '@/lib/spatial';
import { campusBuildings } from '@/data/campusGeometry';
import { getPalette, type ColorMode } from '@/lib/campusPalette';

interface IsometricCanvasProps {
  colorMode: ColorMode;
  selectedBuildingId?: string;
  onSelectBuilding?: (id: string) => void;
  children?: React.ReactNode;
}

/**
 * Parse a viewBox string into [x, y, width, height] numbers.
 */
function parseViewBox(viewBox: string): [number, number, number, number] {
  const [x, y, w, h] = viewBox.split(' ').map(Number);
  return [x, y, w, h];
}

export function IsometricCanvas({
  colorMode,
  children,
}: IsometricCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Authoritative viewport: derived from the projected geometry of all buildings
  // so every building and marker is guaranteed to be inside the viewBox.
  const bounds = useMemo(() => {
    const b = getCampusIsoBounds(campusBuildings);
    if (!Number.isFinite(b.minX) || !Number.isFinite(b.minY)) {
      return null;
    }
    return b;
  }, []);

  const defaultViewBox = useMemo(
    () => (bounds ? boundsToViewBox(bounds) : FALLBACK_VIEWBOX),
    [bounds]
  );

  const [viewBox, setViewBox] = useState(defaultViewBox);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const palette = useMemo(() => getPalette(colorMode), [colorMode]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    const [x, y, w, h] = parseViewBox(viewBox);
    const newW = w * 0.8;
    const newH = h * 0.8;
    const newX = x + (w - newW) / 2;
    const newY = y + (h - newH) / 2;
    setViewBox(`${newX} ${newY} ${newW} ${newH}`);
  }, [viewBox]);

  const handleZoomOut = useCallback(() => {
    const [x, y, w, h] = parseViewBox(viewBox);
    const newW = w * 1.25;
    const newH = h * 1.25;
    const newX = x + (w - newW) / 2;
    const newY = y + (h - newH) / 2;
    setViewBox(`${newX} ${newY} ${newW} ${newH}`);
  }, [viewBox]);

  const handleReset = useCallback(() => {
    setViewBox(defaultViewBox);
  }, [defaultViewBox]);

  const handleFullscreen = useCallback(() => {
    if (svgRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        svgRef.current.requestFullscreen();
      }
    }
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        const [x, y, w, h] = parseViewBox(viewBox);
        setViewBox(`${x - dx} ${y - dy} ${w} ${h}`);
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [isPanning, panStart, viewBox]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Wheel zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const [x, y, w, h] = parseViewBox(viewBox);
      const newW = w * factor;
      const newH = h * factor;
      const newX = x + (w - newW) / 2;
      const newY = y + (h - newH) / 2;
      setViewBox(`${newX} ${newY} ${newW} ${newH}`);
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [viewBox]);

  // Background covers a large area around the campus bounds.
  const background = useMemo(() => {
    const b = bounds ?? { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    const margin = Math.max(w, h);
    return {
      x: b.minX - margin,
      y: b.minY - margin,
      width: w + margin * 2,
      height: h + margin * 2,
    };
  }, [bounds]);

  // Grid lines spanning the campus bounds.
  const grid = useMemo(() => {
    if (!bounds) return { horizontal: [], vertical: [] };
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const step = 40;
    const horizontal: number[] = [];
    const vertical: number[] = [];
    for (let y = bounds.minY; y <= bounds.maxY; y += step) horizontal.push(y);
    for (let x = bounds.minX; x <= bounds.maxX; x += step) vertical.push(x);
    return { horizontal, vertical, width, height };
  }, [bounds]);

  const ground = bounds ?? { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background */}
        <rect
          x={background.x}
          y={background.y}
          width={background.width}
          height={background.height}
          fill={palette.sky}
        />

        {/* Ground plane, expressed in the same projected space as the buildings */}
        <rect
          x={ground.minX}
          y={ground.minY}
          width={ground.maxX - ground.minX}
          height={ground.maxY - ground.minY}
          fill={palette.ground}
          stroke={palette.groundTexture}
          strokeWidth={1}
        />

        {/* Grid lines for reference */}
        <g opacity={0.1}>
          {grid.horizontal.map((y, i) => (
            <line
              key={`h-${i}`}
              x1={ground.minX}
              y1={y}
              x2={ground.maxX}
              y2={y}
              stroke={palette.textLow}
              strokeWidth={0.5}
            />
          ))}
          {grid.vertical.map((x, i) => (
            <line
              key={`v-${i}`}
              x1={x}
              y1={ground.minY}
              x2={x}
              y2={ground.maxY}
              stroke={palette.textLow}
              strokeWidth={0.5}
            />
          ))}
        </g>

        {/* Buildings, markers and overlays share this projected viewport */}
        {children}
      </svg>

      {/* Camera controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={handleZoomIn} aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomOut} aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset} aria-label="Reset view">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleFullscreen} aria-label="Toggle fullscreen">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Scale bar: 50 world meters expressed in projected pixels */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs" style={{ color: palette.textMid }}>
        <div className="h-px" style={{ width: 50 * 4, backgroundColor: palette.textMid }} />
        <span>50 m</span>
      </div>

      {/* Compass */}
      <div className="absolute top-4 left-4 flex flex-col items-center gap-1 text-xs" style={{ color: palette.textMid }}>
        <span className="font-bold">N</span>
        <div className="h-8 w-px" style={{ backgroundColor: palette.textMid }} />
        <span>S</span>
      </div>

      {/* Attribution */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px]" style={{ color: palette.textLow }}>
        © OpenStreetMap contributors
      </div>
    </div>
  );
}