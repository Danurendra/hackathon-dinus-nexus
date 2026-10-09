'use client';

import { useState, useMemo } from 'react';
import { Calendar, Users, Zap, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { simulateScenario, defaultGraduationScenario, type ScenarioInput } from '@/lib/scenarioModel';
import { getPalette, type ColorMode } from '@/lib/campusPalette';

interface ScenarioSimulatorProps {
  colorMode: ColorMode;
  onCreateTask?: (payload: Record<string, unknown>) => void;
}

export function ScenarioSimulator({ colorMode, onCreateTask }: ScenarioSimulatorProps) {
  const palette = useMemo(() => getPalette(colorMode), [colorMode]);
  const [input, setInput] = useState<ScenarioInput>(defaultGraduationScenario);
  const [isRunning, setIsRunning] = useState(false);

  const forecast = useMemo(() => {
    if (!isRunning) return null;
    return simulateScenario(input);
  }, [input, isRunning]);

  const handleRun = () => {
    setIsRunning(true);
  };

  const handleReset = () => {
    setInput(defaultGraduationScenario);
    setIsRunning(false);
  };

  const riskColors: Record<string, string> = {
    low: 'success',
    medium: 'warning',
    high: 'error',
    critical: 'error',
  };

  return (
    <Card className="p-4 max-w-2xl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scenario Simulator
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Simulasi wisuda dengan 39.000 peserta
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <Button size="sm" onClick={handleRun}>
            Run Simulation
          </Button>
        </div>
      </div>

      {/* Input controls */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Total Peserta
          </label>
          <input
            type="number"
            value={input.attendance}
            onChange={(e) => setInput({ ...input, attendance: Number(e.target.value) })}
            className="w-full px-2 py-1 text-sm border rounded"
            min={1000}
            max={100000}
            step={1000}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Jumlah Sesi
          </label>
          <input
            type="number"
            value={input.sessions}
            onChange={(e) => setInput({ ...input, sessions: Number(e.target.value) })}
            className="w-full px-2 py-1 text-sm border rounded"
            min={1}
            max={4}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Durasi (jam)
          </label>
          <input
            type="number"
            value={input.durationHours}
            onChange={(e) => setInput({ ...input, durationHours: Number(e.target.value) })}
            className="w-full px-2 py-1 text-sm border rounded"
            min={1}
            max={12}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Kondisi Lingkungan
          </label>
          <select
            value={input.environment}
            onChange={(e) =>
              setInput({ ...input, environment: e.target.value as any })
            }
            className="w-full px-2 py-1 text-sm border rounded"
          >
            <option value="clear">Cerah</option>
            <option value="rain">Hujan</option>
            <option value="hot">Panas</option>
          </select>
        </div>
      </div>

      {/* Forecast results */}
      {forecast && (
        <div className="space-y-4">
          {/* Summary metrics */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gray-50 rounded p-2">
              <p className="text-[10px] text-gray-500 uppercase">Konkuren</p>
              <p className="text-lg font-bold">
                {forecast.concurrentTotal.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-[10px] text-gray-500 uppercase">Daya</p>
              <p className="text-lg font-bold">{forecast.peakPowerKw} kW</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-[10px] text-gray-500 uppercase">Energi</p>
              <p className="text-lg font-bold">{forecast.energyKwh} kWh</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-[10px] text-gray-500 uppercase">Jaringan</p>
              <p className="text-lg font-bold">{forecast.networkDemandMbps} Mbps</p>
            </div>
          </div>

          {/* Risk assessment */}
          <div className="border-l-4 pl-3" style={{ borderColor: palette[forecast.risk === 'critical' ? 'critical' : forecast.risk === 'high' ? 'warning' : 'success'] }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-semibold">
                Risk Level:{' '}
                <Badge variant={riskColors[forecast.risk] as any}>
                  {forecast.risk.toUpperCase()}
                </Badge>
              </p>
              <Badge variant="info">{forecast.confidence} confidence</Badge>
            </div>
            {forecast.risks.length > 0 && (
              <ul className="text-xs space-y-1">
                {forecast.risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-red-500">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recommendations */}
          <div>
            <p className="text-xs font-semibold mb-2 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Rekomendasi
            </p>
            <ul className="text-xs space-y-1">
              {forecast.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-blue-500">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Worker actions */}
          {forecast.workerActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2">Worker Actions</p>
              <div className="space-y-2">
                {forecast.workerActions.map((action, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-gray-50 rounded p-2"
                  >
                    <div>
                      <p className="text-xs font-medium">{action.worker}</p>
                      <p className="text-[10px] text-gray-600">{action.action}</p>
                    </div>
                    {action.endpoint && onCreateTask && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCreateTask(action.payload ?? {})}
                      >
                        Execute
                      </Button>
                    )}
                    <Badge
                      variant={
                        action.status === 'available'
                          ? 'success'
                          : action.status === 'planned'
                          ? 'info'
                          : 'warning'
                      }
                    >
                      {action.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assumptions */}
          <div className="border-t pt-3">
            <p className="text-[10px] font-semibold text-gray-500 mb-1">
              Asumsi & Metodologi
            </p>
            <ul className="text-[10px] text-gray-600 space-y-0.5">
              {forecast.assumptions.map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
