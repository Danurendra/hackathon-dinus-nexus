'use client';

import { useState, useMemo } from 'react';
import { MapPin, Sun, Moon, Layers, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IsometricCanvas } from './IsometricCanvas';
import { BuildingMesh } from './BuildingMesh';
import { BuildingPins } from './BuildingPins';
import { BuildingDetailPanel } from './BuildingDetailPanel';
import { LayerToggle, type LayerType } from './LayerToggle';
import { LayerOverlay } from './LayerOverlay';
import { ScenarioSimulator } from './ScenarioSimulator';
import { campusBuildings } from '@/data/campusGeometry';
import { getPalette, type ColorMode } from '@/lib/campusPalette';

export function CampusMap({ className = '' }: { className?: string }) {
  const [colorMode, setColorMode] = useState<ColorMode>('day');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>();
  const [activeLayers, setActiveLayers] = useState<Set<LayerType>>(new Set());
  const [showSimulator, setShowSimulator] = useState(false);

  const palette = useMemo(() => getPalette(colorMode), [colorMode]);

  const handleToggleLayer = (layer: LayerType) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  const handleCreateTask = async (payload: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        alert('Task created successfully');
      } else {
        alert('Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error creating task');
    }
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-textPrimary">Campus Twin</h2>
            <Badge variant="info">OSM GEODATA</Badge>
            <Badge variant="warning">SYNTHETIC OPS DATA</Badge>
          </div>
          <p className="mt-1 text-sm text-textSecondary">
            Digital twin interaktif dengan geometri nyata dari OpenStreetMap
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setColorMode(colorMode === 'day' ? 'ops' : 'day')}
          >
            {colorMode === 'day' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="ml-2">{colorMode === 'day' ? 'Ops Mode' : 'Day Mode'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSimulator(!showSimulator)}
          >
            <Calendar className="h-4 w-4" />
            <span className="ml-2">Scenario</span>
          </Button>
        </div>
      </div>

      {/* Main canvas area */}
      <div className="relative min-h-[600px] overflow-hidden" style={{ backgroundColor: palette.sky }}>
        {/* Isometric canvas */}
        <IsometricCanvas
          colorMode={colorMode}
          selectedBuildingId={selectedBuildingId}
          onSelectBuilding={setSelectedBuildingId}
        >
          {/* Layer overlay */}
          <LayerOverlay colorMode={colorMode} activeLayers={activeLayers} />

          {/* Buildings */}
          {campusBuildings.map((building) => (
            <BuildingMesh
              key={building.id}
              building={building}
              colorMode={colorMode}
              isSelected={selectedBuildingId === building.id}
              onClick={() => setSelectedBuildingId(building.id)}
            />
          ))}
        </IsometricCanvas>

        {/* Building pins (HTML overlay) */}
        <BuildingPins
          colorMode={colorMode}
          selectedBuildingId={selectedBuildingId}
          onSelectBuilding={setSelectedBuildingId}
        />

        {/* Side panels */}
        <div className="absolute top-4 right-4 z-30 space-y-3">
          <LayerToggle
            colorMode={colorMode}
            activeLayers={activeLayers}
            onToggleLayer={handleToggleLayer}
          />
        </div>

        {/* Building detail panel */}
        {selectedBuildingId && (
          <div className="absolute bottom-4 right-4 z-30">
            <BuildingDetailPanel
              buildingId={selectedBuildingId}
              colorMode={colorMode}
              onClose={() => setSelectedBuildingId(undefined)}
            />
          </div>
        )}

        {/* Scenario simulator */}
        {showSimulator && (
          <div className="absolute bottom-4 left-4 right-4 z-30 flex justify-center">
            <ScenarioSimulator
              colorMode={colorMode}
              onCreateTask={handleCreateTask}
            />
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border px-5 py-3 text-xs text-textSecondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.success }} />
          Operational
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.warning }} />
          Attention
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.critical }} />
          Critical
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.maintenance }} />
          Maintenance
        </span>
        <span className="ml-auto text-[10px]">
          © OpenStreetMap contributors | Data: ODbL License
        </span>
      </div>
    </Card>
  );
}
