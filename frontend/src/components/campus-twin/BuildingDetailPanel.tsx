'use client';

import { useMemo } from 'react';
import { X, Zap, Wifi, AlertTriangle, Shield, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getOperationalData, type BuildingOperationalData } from '@/data/campusTwinExtended';
import { getPalette, type ColorMode } from '@/lib/campusPalette';

interface BuildingDetailPanelProps {
  buildingId: string;
  colorMode: ColorMode;
  onClose: () => void;
}

export function BuildingDetailPanel({ buildingId, colorMode, onClose }: BuildingDetailPanelProps) {
  const palette = useMemo(() => getPalette(colorMode), [colorMode]);
  const opData = getOperationalData(buildingId);

  if (!opData) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Data tidak tersedia</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Gedung ini tidak memiliki data operasional.
        </p>
      </Card>
    );
  }

  const statusColors: Record<string, string> = {
    operational: 'success',
    attention: 'warning',
    critical: 'error',
    maintenance: 'secondary',
  };

  const provenanceColors: Record<string, string> = {
    DERIVED: 'info',
    ESTIMATED: 'warning',
    SYNTHETIC_FIXTURE: 'secondary',
  };

  return (
    <Card className="p-4 max-w-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Building Inspector
          </p>
          <h3 className="mt-1 font-semibold text-gray-900">{opData.name}</h3>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant={statusColors[opData.status] as any}>
              {opData.status.toUpperCase()}
            </Badge>
            <Badge variant={provenanceColors[opData.provenance] as any}>
              {opData.provenance}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {/* Occupancy */}
        {opData.dailyCapacity && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Kapasitas Harian</p>
              <p className="text-sm font-medium">{opData.dailyCapacity} orang</p>
            </div>
            <Badge variant="info">DERIVED</Badge>
          </div>
        )}

        {opData.eventCapacity && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Kapasitas Acara</p>
              <p className="text-sm font-medium">{opData.eventCapacity.toLocaleString()} orang</p>
            </div>
          </div>
        )}

        {/* Energy */}
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-gray-500" />
          <div className="flex-1">
            <p className="text-xs text-gray-500">Konsumsi Energi</p>
            <p className="text-sm font-medium">{opData.baseEnergyKw} kW</p>
          </div>
          <Badge variant="warning">ESTIMATED</Badge>
        </div>

        {/* Network */}
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-gray-500" />
          <div className="flex-1">
            <p className="text-xs text-gray-500">Access Points</p>
            <p className="text-sm font-medium">{opData.accessPoints} AP</p>
          </div>
        </div>

        {/* Incidents */}
        {opData.activeIncidents > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Insiden Aktif</p>
              <p className="text-sm font-medium text-amber-700">
                {opData.activeIncidents} insiden
              </p>
            </div>
          </div>
        )}

        {opData.securityIncidents > 0 && (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-600" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Insiden Keamanan</p>
              <p className="text-sm font-medium text-red-700">
                {opData.securityIncidents} insiden
              </p>
            </div>
          </div>
        )}

        {/* Workers */}
        {opData.workers.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Worker Terkait</p>
            <div className="flex flex-wrap gap-1">
              {opData.workers.map((worker) => (
                <Badge key={worker} variant="secondary">
                  {worker}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="mt-4 text-[10px] text-gray-500 leading-tight">
        Metadata bangunan dan status map ini adalah data ilustrasi;
        status workflow berasal dari backend.
      </p>
    </Card>
  );
}
