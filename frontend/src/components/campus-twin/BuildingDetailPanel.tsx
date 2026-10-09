'use client';

import { useMemo } from 'react';
import { X, Zap, Wifi, AlertTriangle, Shield, Users } from 'lucide-react';
import { getOperationalData } from '@/data/campusTwinExtended';
import { getPalette, type ColorMode } from '@/lib/campusPalette';
import type { BuildingAllocation } from '@/lib/scenarioModel';
import { panelStyle, badgeStyle, statusColor } from './CampusTheme';

interface BuildingDetailPanelProps {
  buildingId: string;
  colorMode: ColorMode;
  /** Active scenario allocation for this building, if a scenario is applied. */
  scenario?: BuildingAllocation | null;
  onClose: () => void;
}

export function BuildingDetailPanel({ buildingId, colorMode, scenario, onClose }: BuildingDetailPanelProps) {
  const palette = useMemo(() => getPalette(colorMode), [colorMode]);
  const opData = getOperationalData(buildingId);

  const labelColor = palette.panelTextMuted;
  const valueColor = palette.panelTextHigh;

  if (!opData) {
    return (
      <div className="p-4 max-w-sm" style={panelStyle(palette)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: valueColor }}>Data tidak tersedia</h3>
          <button type="button" aria-label="Tutup" onClick={onClose} style={{ color: labelColor }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm" style={{ color: labelColor }}>
          Gedung ini tidak memiliki data operasional.
        </p>
      </div>
    );
  }

  const provenanceTone: Record<string, string> = {
    DERIVED: 'info',
    ESTIMATED: 'warning',
    SYNTHETIC_FIXTURE: 'neutral',
  };

  return (
    <div className="p-4 max-w-sm" style={panelStyle(palette)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: labelColor }}>
            Building Inspector
          </p>
          <h3 className="mt-1 font-semibold" style={{ color: valueColor }}>{opData.name}</h3>
          <div className="mt-2 flex flex-wrap gap-1">
            <span style={{ ...badgeStyle(palette, 'neutral'), color: statusColor(palette, opData.status), borderColor: statusColor(palette, opData.status) }}>
              {opData.status.toUpperCase()}
            </span>
            <span style={badgeStyle(palette, provenanceTone[opData.provenance] ?? 'neutral')}>
              {opData.provenance}
            </span>
          </div>
        </div>
        <button type="button" aria-label="Tutup inspector" onClick={onClose} style={{ color: labelColor }}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {/* Occupancy */}
        {opData.dailyCapacity && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: labelColor }} />
            <div className="flex-1">
              <p className="text-xs" style={{ color: labelColor }}>Kapasitas Harian</p>
              <p className="text-sm font-medium" style={{ color: valueColor }}>{opData.dailyCapacity} orang</p>
            </div>
            <span style={badgeStyle(palette, 'info')}>DERIVED</span>
          </div>
        )}

        {opData.eventCapacity && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: labelColor }} />
            <div className="flex-1">
              <p className="text-xs" style={{ color: labelColor }}>Kapasitas Acara</p>
              <p className="text-sm font-medium" style={{ color: valueColor }}>{opData.eventCapacity.toLocaleString()} orang</p>
            </div>
          </div>
        )}

        {/* Energy */}
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" style={{ color: labelColor }} />
          <div className="flex-1">
            <p className="text-xs" style={{ color: labelColor }}>Konsumsi Energi</p>
            <p className="text-sm font-medium" style={{ color: valueColor }}>{opData.baseEnergyKw} kW</p>
          </div>
          <span style={badgeStyle(palette, 'warning')}>ESTIMATED</span>
        </div>

        {/* Network */}
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4" style={{ color: labelColor }} />
          <div className="flex-1">
            <p className="text-xs" style={{ color: labelColor }}>Access Points</p>
            <p className="text-sm font-medium" style={{ color: valueColor }}>{opData.accessPoints} AP</p>
          </div>
        </div>

        {/* Incidents */}
        {opData.activeIncidents > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: palette.warning }} />
            <div className="flex-1">
              <p className="text-xs" style={{ color: labelColor }}>Insiden Aktif</p>
              <p className="text-sm font-medium" style={{ color: palette.warning }}>{opData.activeIncidents} insiden</p>
            </div>
          </div>
        )}

        {opData.securityIncidents > 0 && (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" style={{ color: palette.critical }} />
            <div className="flex-1">
              <p className="text-xs" style={{ color: labelColor }}>Insiden Keamanan</p>
              <p className="text-sm font-medium" style={{ color: palette.critical }}>{opData.securityIncidents} insiden</p>
            </div>
          </div>
        )}

        {/* Scenario projection */}
        {scenario && (
          <div className="rounded p-2" style={{ backgroundColor: palette.surfaceHover }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold" style={{ color: valueColor }}>Proyeksi Skenario</p>
              <span style={badgeStyle(palette, 'info')}>SYNTHETIC</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: labelColor }}>Alokasi konkuren</span>
              <span style={{ color: valueColor }}>
                {scenario.allocated.toLocaleString()} / {scenario.capacity.toLocaleString()} orang
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-0.5">
              <span style={{ color: labelColor }}>Beban venue</span>
              <span
                style={{
                  color:
                    scenario.status === 'overload' || scenario.status === 'critical'
                      ? palette.critical
                      : scenario.status === 'attention'
                        ? palette.warning
                        : palette.success,
                }}
              >
                {scenario.loadPercent}% · {scenario.status.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Workers */}
        {opData.workers.length > 0 && (
          <div>
            <p className="text-xs mb-1" style={{ color: labelColor }}>Worker Terkait</p>
            <div className="flex flex-wrap gap-1">
              {opData.workers.map((worker) => (
                <span key={worker} style={badgeStyle(palette, 'neutral')}>{worker}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="mt-4 text-[10px] leading-tight" style={{ color: labelColor }}>
        Metadata bangunan dan status map ini adalah data ilustrasi;
        status workflow berasal dari backend.
      </p>
    </div>
  );
}