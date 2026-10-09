'use client';

import { useState, useMemo } from 'react';
import { MapPin, Sun, Moon, Calendar } from 'lucide-react';
import { IsometricCanvas } from './IsometricCanvas';
import { BuildingMesh } from './BuildingMesh';
import { BuildingPins } from './BuildingPins';
import { BuildingDetailPanel } from './BuildingDetailPanel';
import { LayerToggle, type LayerType } from './LayerToggle';
import { LayerLegend } from './LayerLegend';
import { LayerOverlay } from './LayerOverlay';
import { ScenarioOverlay } from './ScenarioOverlay';
import { ScenarioSimulator } from './ScenarioSimulator';
import { campusBuildings } from '@/data/campusGeometry';
import { getPalette, type ColorMode } from '@/lib/campusPalette';
import {
  simulateScenario,
  defaultGraduationScenario,
  getScenarioMetrics,
  type ScenarioInput,
} from '@/lib/scenarioModel';
import { panelStyle, badgeStyle, CampusButton } from './CampusTheme';

export function CampusMap({ className = '' }: { className?: string }) {
  const [colorMode, setColorMode] = useState<ColorMode>('day');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>();
  const [activeLayers, setActiveLayers] = useState<Set<LayerType>>(new Set());
  const [showSimulator, setShowSimulator] = useState(false);
  const [scenarioInput, setScenarioInput] = useState<ScenarioInput>(defaultGraduationScenario);
  const [scenarioActive, setScenarioActive] = useState(false);

  const palette = useMemo(() => getPalette(colorMode), [colorMode]);

  // Scenario is derived from input so any control change re-projects coherently.
  const forecast = useMemo(
    () => (scenarioActive ? simulateScenario(scenarioInput) : null),
    [scenarioActive, scenarioInput]
  );

  const scenarioMetrics = useMemo(
    () => (forecast ? getScenarioMetrics(forecast) : null),
    [forecast]
  );

  const selectedScenario = useMemo(
    () => forecast?.allocations.find((a) => a.buildingId === selectedBuildingId) ?? null,
    [forecast, selectedBuildingId]
  );

  const handleResetScenario = () => {
    setScenarioInput(defaultGraduationScenario);
    setScenarioActive(false);
  };

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
    <div className={`overflow-hidden ${className}`} style={panelStyle(palette)}>
      {/* Header */}
      <div
        className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"
        style={{ borderBottom: `1px solid ${palette.surfaceBorder}` }}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin className="h-5 w-5" style={{ color: palette.accent }} />
            <h2 className="text-lg font-semibold" style={{ color: palette.panelTextHigh }}>Campus Twin</h2>
            <span style={badgeStyle(palette, 'info')}>OSM GEODATA</span>
            <span style={badgeStyle(palette, 'neutral')}>CAMPUS OPERATIONS VIEW</span>
          </div>
          <p className="mt-1 text-sm" style={{ color: palette.panelTextMid }}>
            Digital twin interaktif dengan geometri nyata dari OpenStreetMap
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CampusButton
            palette={palette}
            variant="outline"
            onClick={() => setColorMode(colorMode === 'day' ? 'ops' : 'day')}
          >
            {colorMode === 'day' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span>{colorMode === 'day' ? 'Ops Mode' : 'Day Mode'}</span>
          </CampusButton>
          <CampusButton
            palette={palette}
            variant="outline"
            active={showSimulator}
            onClick={() => setShowSimulator(!showSimulator)}
          >
            <Calendar className="h-4 w-4" />
            <span>Scenario</span>
          </CampusButton>
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

          {/* Scenario projection overlay (synthetic) */}
          <ScenarioOverlay colorMode={colorMode} forecast={forecast} />

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

          {/* Building markers and labels share the same viewport transform */}
          <BuildingPins
            colorMode={colorMode}
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={setSelectedBuildingId}
          />
        </IsometricCanvas>

        {/* Scenario banner */}
        {forecast && scenarioMetrics && (
          <div className="absolute top-4 left-4 z-30 max-w-xs p-3" style={panelStyle(palette)}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold" style={{ color: palette.panelTextHigh }}>
                Skenario aktif
              </span>
              <span style={badgeStyle(palette, 'info')}>SYNTHETIC</span>
            </div>
            <p className="text-[11px]" style={{ color: palette.panelTextMuted }}>
              Proyeksi konkuren {scenarioMetrics.occupancy.toLocaleString()} orang · {scenarioMetrics.congestionHotspots} hotspot ·
              risiko {forecast.risk.toUpperCase()}
            </p>
            <div className="mt-2">
              <CampusButton palette={palette} variant="outline" onClick={handleResetScenario}>
                Clear scenario
              </CampusButton>
            </div>
          </div>
        )}

        {/* Side panels */}
        <div className="absolute top-4 right-4 z-30 space-y-3">
          <LayerToggle
            colorMode={colorMode}
            activeLayers={activeLayers}
            onToggleLayer={handleToggleLayer}
          />
          <LayerLegend colorMode={colorMode} activeLayers={activeLayers} />
        </div>

        {/* Building detail panel */}
        {selectedBuildingId && (
          <div className="absolute bottom-4 right-4 z-30">
            <BuildingDetailPanel
              buildingId={selectedBuildingId}
              colorMode={colorMode}
              scenario={selectedScenario}
              onClose={() => setSelectedBuildingId(undefined)}
            />
          </div>
        )}

        {/* Scenario simulator */}
        {showSimulator && (
          <div className="absolute bottom-4 left-4 right-4 z-30 flex justify-center">
            <ScenarioSimulator
              colorMode={colorMode}
              input={scenarioInput}
              onInputChange={setScenarioInput}
              active={scenarioActive}
              forecast={forecast}
              onRun={() => setScenarioActive(true)}
              onReset={handleResetScenario}
              onCreateTask={handleCreateTask}
            />
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div
        className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-3 text-xs"
        style={{ borderTop: `1px solid ${palette.surfaceBorder}`, color: palette.panelTextMuted }}
      >
        {[
          ['Operational', palette.success],
          ['Attention', palette.warning],
          ['Critical', palette.critical],
          ['Maintenance', palette.maintenance],
        ].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
        <span className="ml-auto text-[10px]">
          © OpenStreetMap contributors | Data: ODbL License
        </span>
      </div>
    </div>
  );
}