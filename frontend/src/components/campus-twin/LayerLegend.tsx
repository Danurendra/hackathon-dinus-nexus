'use client';

import { useMemo } from 'react';
import { getPalette, type ColorMode } from '@/lib/campusPalette';
import { panelStyle, statusColor } from './CampusTheme';
import type { LayerType } from './LayerToggle';
import { getDensityData, getEnergyData, getFlowData, getIncidentData } from '@/lib/layerModel';

interface LayerLegendProps {
  colorMode: ColorMode;
  activeLayers: Set<LayerType>;
}

function ScaleBar({ colors }: { colors: string[] }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded">
      {colors.map((c, i) => (
        <div key={i} className="flex-1" style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}

/**
 * Explains colors, scales, and units for every active layer.
 * Also surfaces an explicit "unavailable" state when a layer has no data,
 * so missing data never looks like a misleading visualization.
 */
export function LayerLegend({ colorMode, activeLayers }: LayerLegendProps) {
  const palette = useMemo(() => getPalette(colorMode), [colorMode]);

  const density = useMemo(() => getDensityData(), []);
  const energy = useMemo(() => getEnergyData(), []);
  const itIncidents = useMemo(() => getIncidentData('it'), []);
  const security = useMemo(() => getIncidentData('security'), []);
  const flow = useMemo(() => getFlowData(), []);

  if (activeLayers.size === 0) return null;

  const rowStyle = { color: palette.panelTextMid };

  return (
    <div className="p-3 w-64 max-h-[45vh] overflow-y-auto" style={panelStyle(palette)}>
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: palette.panelTextMid }}>
        Legend
      </h3>
      <div className="space-y-3 text-[10px]">
        {activeLayers.has('status') && (
          <div>
            <p className="font-semibold mb-1" style={{ color: palette.panelTextHigh }}>Status Operasional</p>
            <div className="grid grid-cols-2 gap-1">
              {([
                ['Operational', 'operational'],
                ['Attention', 'attention'],
                ['Critical', 'critical'],
                ['Maintenance', 'maintenance'],
              ] as const).map(([label, key]) => (
                <span key={key} className="flex items-center gap-1" style={rowStyle}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor(palette, key) }} />
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-1" style={rowStyle}>Sumber: fixture operasional (synthetic).</p>
          </div>
        )}

        {activeLayers.has('density') && (
          <div>
            <p className="font-semibold mb-1" style={{ color: palette.panelTextHigh }}>Kepadatan Okupansi</p>
            <ScaleBar colors={[palette.success, palette.warning, palette.critical]} />
            <p className="mt-1" style={rowStyle}>Skala ternormalisasi 0–1 (rendah → tinggi).</p>
            <p style={rowStyle}>Kapasitas: DERIVED · Okupansi: SYNTHETIC.</p>
            {density.unavailable.length > 0 && (
              <p style={{ color: palette.warning }}>Tanpa data: {density.unavailable.join(', ')}</p>
            )}
          </div>
        )}

        {activeLayers.has('flow') && (
          <div>
            <p className="font-semibold mb-1" style={{ color: palette.panelTextHigh }}>Arus Pejalan Kaki</p>
            <span className="flex items-center gap-1" style={rowStyle}>
              <span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: palette.accent }} />
              arah menuju pusat kampus
            </span>
            <p className="mt-1" style={rowStyle}>Sumber: jalur pejalan kaki SYNTHETIC.</p>
            {flow.length === 0 && <p style={{ color: palette.warning }}>Data arus tidak tersedia.</p>}
          </div>
        )}

        {activeLayers.has('energy') && (
          <div>
            <p className="font-semibold mb-1" style={{ color: palette.panelTextHigh }}>Konsumsi Energi</p>
            <ScaleBar colors={[palette.success, palette.warning, palette.critical]} />
            <p className="mt-1" style={rowStyle}>Skala ternormalisasi 0–{energy.max} kW (ESTIMATED).</p>
          </div>
        )}

        {activeLayers.has('incidents') && (
          <div>
            <p className="font-semibold mb-1" style={{ color: palette.panelTextHigh }}>Insiden IT</p>
            <span className="flex items-center gap-1" style={rowStyle}>
              <span style={{ color: palette.warning }}>▲</span> jumlah insiden aktif per gedung
            </span>
            <p className="mt-1" style={rowStyle}>Sumber: fixture SYNTHETIC/DERIVED.</p>
            {itIncidents.data.length === 0 && <p style={{ color: palette.warning }}>Tidak ada insiden tercatat.</p>}
          </div>
        )}

        {activeLayers.has('security') && (
          <div>
            <p className="font-semibold mb-1" style={{ color: palette.panelTextHigh }}>Insiden Keamanan</p>
            <span className="flex items-center gap-1" style={rowStyle}>
              <span style={{ color: palette.critical }}>●</span> jumlah alert keamanan per gedung
            </span>
            {security.data.length === 0
              ? <p className="mt-1" style={{ color: palette.warning }}>Tidak ada insiden keamanan tercatat.</p>
              : <p className="mt-1" style={rowStyle}>Sumber: fixture operasional.</p>}
          </div>
        )}
      </div>
    </div>
  );
}