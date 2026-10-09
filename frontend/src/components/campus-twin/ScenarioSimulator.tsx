'use client';

import { useMemo } from 'react';
import { Calendar, CheckCircle, AlertTriangle, RotateCcw, Play } from 'lucide-react';
import {
  getBaselineMetrics,
  getScenarioMetrics,
  type ScenarioInput,
  type ScenarioForecast,
} from '@/lib/scenarioModel';
import { getPalette, type ColorMode } from '@/lib/campusPalette';
import { panelStyle, inputStyle, badgeStyle, CampusButton } from './CampusTheme';

interface ScenarioSimulatorProps {
  colorMode: ColorMode;
  /** Scenario input, owned by the parent so map/panels stay in sync. */
  input: ScenarioInput;
  onInputChange: (next: ScenarioInput) => void;
  /** Whether a scenario is currently applied to the map. */
  active: boolean;
  /** Result of the scenario, or null when inactive/reset. */
  forecast: ScenarioForecast | null;
  onRun: () => void;
  onReset: () => void;
  onCreateTask?: (payload: Record<string, unknown>) => void;
}

export function ScenarioSimulator({
  colorMode,
  input,
  onInputChange,
  active,
  forecast,
  onRun,
  onReset,
  onCreateTask,
}: ScenarioSimulatorProps) {
  const palette = useMemo(() => getPalette(colorMode), [colorMode]);
  const baseline = useMemo(() => getBaselineMetrics(), []);
  const scenario = useMemo(() => (forecast ? getScenarioMetrics(forecast) : null), [forecast]);

  const labelColor = palette.panelTextMuted;
  const valueColor = palette.panelTextHigh;

  const riskColors: Record<string, string> = {
    low: 'success',
    medium: 'warning',
    high: 'critical',
    critical: 'critical',
  };

  const field = (label: string, node: React.ReactNode) => (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: labelColor }}>{label}</label>
      {node}
    </div>
  );

  const indicator = (label: string, provenance: string) => (
    <div className="flex items-center gap-1 mb-1">
      <span className="text-[10px] font-semibold uppercase" style={{ color: valueColor }}>{label}</span>
      <span style={badgeStyle(palette, 'neutral')}>{provenance}</span>
    </div>
  );

  return (
    <div className="p-4 max-w-3xl w-full" style={panelStyle(palette)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2" style={{ color: valueColor }}>
            <Calendar className="h-5 w-5" />
            Scenario Simulator
            {active && <span style={badgeStyle(palette, 'info')}>APPLIED</span>}
          </h3>
          <p className="text-xs mt-1" style={{ color: labelColor }}>
            Skenario wisuda (synthetic) — memengaruhi metrik, penanda gedung, dan lapisan peta.
          </p>
        </div>
        <div className="flex gap-2">
          <CampusButton palette={palette} variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </CampusButton>
          <CampusButton palette={palette} variant="primary" onClick={onRun}>
            <Play className="h-4 w-4" />
            Run Simulation
          </CampusButton>
        </div>
      </div>

      {/* Input controls */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {field('Total Peserta', (
          <input
            type="number"
            value={input.attendance}
            onChange={(e) => onInputChange({ ...input, attendance: Number(e.target.value) })}
            style={inputStyle(palette)}
            min={1000}
            max={100000}
            step={1000}
          />
        ))}
        {field('Jumlah Sesi', (
          <input
            type="number"
            value={input.sessions}
            onChange={(e) => onInputChange({ ...input, sessions: Number(e.target.value) })}
            style={inputStyle(palette)}
            min={1}
            max={4}
          />
        ))}
        {field('Durasi (jam)', (
          <input
            type="number"
            value={input.durationHours}
            onChange={(e) => onInputChange({ ...input, durationHours: Number(e.target.value) })}
            style={inputStyle(palette)}
            min={1}
            max={12}
          />
        ))}
        {field('Kondisi Lingkungan', (
          <select
            value={input.environment}
            onChange={(e) => onInputChange({ ...input, environment: e.target.value as ScenarioInput['environment'] })}
            style={inputStyle(palette)}
          >
            <option value="clear">Cerah</option>
            <option value="rain">Hujan</option>
            <option value="hot">Panas</option>
          </select>
        ))}
      </div>

      {!forecast && (
        <p className="text-xs rounded p-3" style={{ color: labelColor, backgroundColor: palette.surfaceHover }}>
          Tekan <strong>Run Simulation</strong> untuk memproyeksikan skenario ini ke peta.
          Nilai saat ini menampilkan kondisi baseline operasional.
        </p>
      )}

      {/* Forecast results */}
      {forecast && scenario && (
        <div className="space-y-4">
          {/* Scenario totals */}
          <div>
            {indicator('Proyeksi Skenario', 'SYNTHETIC')}
            <div className="grid grid-cols-4 gap-2">
              {[
                ['Konkuren', `${scenario.occupancy.toLocaleString()} orang`],
                ['Daya', `${scenario.energyKw} kW`],
                ['Energi', `${forecast.energyKwh} kWh`],
                ['Jaringan', `${scenario.networkMbps} Mbps`],
              ].map(([k, v]) => (
                <div key={k} className="rounded p-2" style={{ backgroundColor: palette.surfaceHover }}>
                  <p className="text-[10px] uppercase" style={{ color: labelColor }}>{k}</p>
                  <p className="text-base font-bold" style={{ color: valueColor }}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Baseline vs scenario comparison */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: valueColor }}>
              Baseline operasional vs proyeksi skenario
            </p>
            <div className="overflow-hidden rounded" style={{ border: `1px solid ${palette.surfaceBorder}` }}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ backgroundColor: palette.surfaceHover, color: labelColor }}>
                    <th className="text-left font-medium px-2 py-1.5">Metrik (unit)</th>
                    <th className="text-right font-medium px-2 py-1.5">Baseline</th>
                    <th className="text-right font-medium px-2 py-1.5">Skenario</th>
                    <th className="text-right font-medium px-2 py-1.5">Δ</th>
                  </tr>
                </thead>
                <tbody style={{ color: valueColor }}>
                  {[
                    {
                      label: 'Okupansi konkuren (orang)',
                      base: baseline.occupancy.toLocaleString(),
                      scen: scenario.occupancy.toLocaleString(),
                      delta: scenario.occupancy - baseline.occupancy,
                      deltaUnit: 'orang',
                    },
                    {
                      label: 'Beban daya (kW)',
                      base: baseline.energyKw.toLocaleString(),
                      scen: scenario.energyKw.toLocaleString(),
                      delta: scenario.energyKw - baseline.energyKw,
                      deltaUnit: 'kW',
                    },
                    {
                      label: 'Permintaan jaringan (Mbps)',
                      base: '—',
                      scen: scenario.networkMbps.toLocaleString(),
                      delta: null,
                      deltaUnit: 'Mbps',
                    },
                    {
                      label: 'Gedung perlu perhatian (unit)',
                      base: String(baseline.buildingsNeedingAttention),
                      scen: String(scenario.venuesNeedingAttention),
                      delta: scenario.venuesNeedingAttention - baseline.buildingsNeedingAttention,
                      deltaUnit: 'gedung',
                    },
                    {
                      label: 'Insiden IT aktif (unit)',
                      base: String(baseline.itIncidents),
                      scen: '—',
                      delta: null,
                      deltaUnit: 'insiden',
                    },
                    {
                      label: 'Insiden keamanan (unit)',
                      base: String(baseline.securityIncidents),
                      scen: '—',
                      delta: null,
                      deltaUnit: 'insiden',
                    },
                  ].map((row) => (
                    <tr key={row.label} style={{ borderTop: `1px solid ${palette.surfaceBorder}` }}>
                      <td className="px-2 py-1.5" style={{ color: labelColor }}>{row.label}</td>
                      <td className="px-2 py-1.5 text-right">{row.base}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">{row.scen}</td>
                      <td
                        className="px-2 py-1.5 text-right"
                        style={{
                          color:
                            row.delta === null
                              ? labelColor
                              : row.delta > 0
                                ? palette.critical
                                : palette.success,
                        }}
                      >
                        {row.delta === null
                          ? 'n/a'
                          : `${row.delta > 0 ? '+' : ''}${row.delta.toLocaleString()} ${row.deltaUnit}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-[10px]" style={{ color: labelColor }}>
              Baseline okupansi {baseline.occupancyProvenance}, daya {baseline.energyProvenance},
              insiden {baseline.incidentsProvenance}. Skenario = proyeksi SYNTHETIC; bukan telemetri live
              dan bukan prediksi tervalidasi. Permintaan jaringan & insiden baru tidak diproyeksikan (n/a).
            </p>
          </div>

          {/* Congestion hotspots / buildings needing attention */}
          {forecast.allocations.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: valueColor }}>
                Hotspot kepadatan &amp; venue perlu perhatian
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {forecast.allocations
                  .slice()
                  .sort((a, b) => b.loadPercent - a.loadPercent)
                  .map((alloc) => (
                    <div
                      key={alloc.buildingId}
                      className="flex items-center justify-between rounded px-2 py-1 gap-2"
                      style={{ backgroundColor: palette.surfaceHover }}
                    >
                      <span className="text-xs truncate" style={{ color: valueColor }}>{alloc.name}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px]" style={{ color: labelColor }}>
                          {alloc.allocated.toLocaleString()}/{alloc.capacity.toLocaleString()} orang
                        </span>
                        <span style={badgeStyle(palette, riskColors[alloc.status === 'overload' ? 'high' : alloc.status === 'critical' ? 'critical' : alloc.status === 'attention' ? 'medium' : 'low'])}>
                          {alloc.loadPercent}%
                        </span>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Risk assessment */}
          <div
            className="border-l-4 pl-3"
            style={{ borderColor: palette[forecast.risk === 'critical' || forecast.risk === 'high' ? 'critical' : forecast.risk === 'medium' ? 'warning' : 'success'] }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" style={{ color: palette.warning }} />
              <p className="text-sm font-semibold" style={{ color: valueColor }}>
                Risk Level:{' '}
                <span style={badgeStyle(palette, riskColors[forecast.risk])}>{forecast.risk.toUpperCase()}</span>
              </p>
              <span style={badgeStyle(palette, 'info')}>{forecast.confidence} confidence</span>
            </div>
            {forecast.risks.length > 0 && (
              <ul className="text-xs space-y-1" style={{ color: labelColor }}>
                {forecast.risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span style={{ color: palette.critical }}>•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recommendations */}
          <div>
            <p className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: valueColor }}>
              <CheckCircle className="h-3 w-3" />
              Rekomendasi
            </p>
            <ul className="text-xs space-y-1" style={{ color: labelColor }}>
              {forecast.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span style={{ color: palette.accent }}>→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Worker actions */}
          {forecast.workerActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: valueColor }}>Worker Actions</p>
              <div className="space-y-2">
                {forecast.workerActions.map((action, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded p-2 gap-2"
                    style={{ backgroundColor: palette.surfaceHover }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium" style={{ color: valueColor }}>{action.worker}</p>
                      <p className="text-[10px]" style={{ color: labelColor }}>{action.action}</p>
                    </div>
                    {action.endpoint && onCreateTask && (
                      <CampusButton palette={palette} variant="outline" onClick={() => onCreateTask(action.payload ?? {})}>
                        Buat Task
                      </CampusButton>
                    )}
                    <span style={badgeStyle(palette, action.status === 'available' ? 'success' : action.status === 'planned' ? 'info' : 'warning')}>
                      {action.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assumptions */}
          <div className="pt-3" style={{ borderTop: `1px solid ${palette.surfaceBorder}` }}>
            <p className="text-[10px] font-semibold mb-1" style={{ color: labelColor }}>
              Asumsi &amp; Metodologi
            </p>
            <ul className="text-[10px] space-y-0.5" style={{ color: labelColor }}>
              {forecast.assumptions.map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}