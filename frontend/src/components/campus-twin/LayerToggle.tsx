'use client';

import { useMemo } from 'react';
import { Activity, Zap, Wifi, Shield, Users } from 'lucide-react';
import { getPalette, type ColorMode } from '@/lib/campusPalette';
import { panelStyle } from './CampusTheme';

export type LayerType =
  | 'status'
  | 'density'
  | 'flow'
  | 'energy'
  | 'incidents'
  | 'security';

interface LayerToggleProps {
  colorMode: ColorMode;
  activeLayers: Set<LayerType>;
  onToggleLayer: (layer: LayerType) => void;
}

const LAYERS: Array<{
  id: LayerType;
  label: string;
  icon: React.ElementType;
  description: string;
}> = [
  {
    id: 'status',
    label: 'Status Operasional',
    icon: Activity,
    description: 'Status gedung (operational/attention/critical)',
  },
  {
    id: 'density',
    label: 'Kepadatan',
    icon: Users,
    description: 'Heatmap kepadatan okupansi',
  },
  {
    id: 'flow',
    label: 'Arus Pejalan Kaki',
    icon: Activity,
    description: 'Simulasi pergerakan orang',
  },
  {
    id: 'energy',
    label: 'Konsumsi Energi',
    icon: Zap,
    description: 'Beban daya per gedung',
  },
  {
    id: 'incidents',
    label: 'Insiden IT',
    icon: Wifi,
    description: 'Lokasi insiden jaringan',
  },
  {
    id: 'security',
    label: 'Insiden Keamanan',
    icon: Shield,
    description: 'Alert keamanan fisik',
  },
];

export function LayerToggle({ colorMode, activeLayers, onToggleLayer }: LayerToggleProps) {
  const palette = useMemo(() => getPalette(colorMode), [colorMode]);

  return (
    <div className="p-3 max-w-xs w-64" style={panelStyle(palette)}>
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: palette.panelTextMid }}>
        Visualization Layers
      </h3>
      <div className="space-y-1">
        {LAYERS.map((layer) => {
          const Icon = layer.icon;
          const isActive = activeLayers.has(layer.id);

          return (
            <button
              key={layer.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onToggleLayer(layer.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors"
              style={{
                backgroundColor: isActive ? palette.controlActiveBg : 'transparent',
                color: isActive ? palette.accent : palette.panelTextHigh,
                outlineColor: palette.focusRing,
              }}
            >
              <Icon className="h-4 w-4 shrink-0" style={{ color: isActive ? palette.accent : palette.panelTextMid }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{layer.label}</p>
                <p className="text-[10px]" style={{ color: palette.panelTextMuted }}>{layer.description}</p>
              </div>
              <div
                className="h-3 w-6 rounded-full transition-colors shrink-0"
                style={{ backgroundColor: isActive ? palette.accent : palette.disabledBg }}
              >
                <div
                  className="h-3 w-3 rounded-full shadow transition-transform"
                  style={{
                    backgroundColor: isActive ? palette.accentText : palette.panelTextMuted,
                    transform: isActive ? 'translateX(12px)' : 'translateX(0)',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}