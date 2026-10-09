'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { project, KX, KY, KZ, CAMPUS_VIEWBOX } from '@/lib/isometric';
import { campusBuildings, getCampusBounds } from '@/data/campusGeometry';
import { getPalette, type ColorMode } from '@/lib/campusPalette';

interface IsometricCanvasProps {
  colorMode: ColorMode;
  selectedBuildingId?: string;
  onSelectBuilding?: (id: string) => void;
  children?: React.ReactNode;
}

export function IsometricCanvas({
  colorMode,
  selectedBuildingId,
  onSelectBuilding,
  children,
}: IsometricCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState(CAMPUS_VIEWBOX);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const palette = useMemo(() => getPalette(colorMode), [colorMode]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    const [x, y, w, h] = viewBox.split(' ').map(Number);
    const newW = w * 0.8;
    const newH = h * 0.8;
    const newX = x + (w - newW) / 2;
    const newY = y + (h - newH) / 2;
    setViewBox(`${newX} ${newY} ${newW} ${newH}`);
  }, [viewBox]);

  const handleZoomOut = useCallback(() => {
    const [x, y, w, h] = viewBox.split(' ').map(Number);
    const newW = w * 1.25;
    const newH = h * 1.25;
    const newX = x + (w - newW) / 2;
    const newY = y + (h - newH) / 2;
    setViewBox(`${newX} ${newY} ${newW} ${newH}`);
  }, [viewBox]);

  const handleReset = useCallback(() => {
    setViewBox(CAMPUS_VIEWBOX);
  }, []);

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
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        const [x, y, w, h] = viewBox.split(' ').map(Number);
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
      const [x, y, w, h] = viewBox.split(' ').map(Number);
      const newW = w * factor;
      const newH = h * factor;
      const newX = x + (w - newW) / 2;
      const newY = y + (h - newH) / 2;
      setViewBox(`${newX} ${newY} ${newW} ${newH}`);
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [viewBox]);

  // Calculate building positions for click detection
  const buildingPositions = useMemo(() => {
    return campusBuildings.map((b) => {
      const cx = b.footprint.reduce((s, p) => s + p[0], 0) / b.footprint.length;
      const cy = b.footprint.reduce((s, p) => s + p[1], 0) / b.footprint.length;
      const projected = project(cx, cy);
      return { id: b.id, x: projected.x, y: projected.y, width: 40, height: 30 };
    });
  }, []);

  const handleBuildingClick = useCallback(
    (id: string) => {
      onSelectBuilding?.(id);
    },
    [onSelectBuilding]
  );

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
          x={-1000}
          y={-1000}
          width={3000}
          height={3000}
          fill={palette.sky}
        />

        {/* Ground plane */}
        <rect
          x={-500}
          y={0}
          width={1200}
          height={800}
          fill={palette.ground}
          stroke={palette.groundTexture}
          strokeWidth={1}
        />

        {/* Grid lines for reference */}
        <g opacity={0.1}>
          {Array.from({ length: 25 }, (_, i) => (
            <line
              key={`h-${i}`}
              x1={-500}
              y1={i * 40}
              x2={700}
              y2={i * 40}
              stroke={palette.textLow}
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: 31 }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={-500 + i * 40}
              y1={0}
              x2={-500 + i * 40}
              y2={800}
              stroke={palette.textLow}
              strokeWidth={0.5}
            />
          ))}
        </g>

        {/* Buildings will be rendered by child components */}
        {children}
      </svg>

      {/* Camera controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleFullscreen}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Scale bar */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs" style={{ color: palette.textMid }}>
        <div className="h-px w-12" style={{ backgroundColor: palette.textMid }} />
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
