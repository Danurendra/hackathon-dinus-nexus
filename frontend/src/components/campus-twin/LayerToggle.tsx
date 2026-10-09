'use client';

import { useMemo } from 'react';
import { Activity, Zap, Wifi, Shield, Users, Thermometer } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getPalette, type ColorMode } from '@/lib/campusPalette';

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
    <Card className="p-3 max-w-xs">
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: palette.textMid }}>
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
              onClick={() => onToggleLayer(layer.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-900'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
              style={{
                backgroundColor: isActive ? `${palette.accent}15` : 'transparent',
                color: isActive ? palette.accent : palette.textHigh,
              }}
            >
              <Icon className="h-4 w-4" />
              <div className="flex-1">
                <p className="text-xs font-medium">{layer.label}</p>
                <p className="text-[10px] opacity-70">{layer.description}</p>
              </div>
              <div
                className={`h-3 w-6 rounded-full transition-colors ${
                  isActive ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                style={{
                  backgroundColor: isActive ? palette.accent : palette.textLow,
                }}
              >
                <div
                  className={`h-3 w-3 rounded-full bg-white shadow transition-transform ${
                    isActive ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
