'use client';

import { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  MapPin, 
  Building, 
  Wifi, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';

interface CampusBuilding {
  id: string;
  name: string;
  x: number;
  y: number;
  status: 'operational' | 'warning' | 'critical' | 'maintenance';
  devices: number;
  incidents: number;
}

interface CampusMapProps {
  buildings: CampusBuilding[];
  className?: string;
}

export function CampusMap({ buildings, className = '' }: CampusMapProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'devices'>('overview');

  const getStatusColor = (status: CampusBuilding['status']) => {
    switch (status) {
      case 'operational': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      case 'maintenance': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: CampusBuilding['status']) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'maintenance': return <Clock className="w-4 h-4" />;
      default: return <Building className="w-4 h-4" />;
    }
  };

  return (
    <Card className={className}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">Campus Map</h3>
          <div className="flex space-x-2">
            <Button 
              variant={viewMode === 'overview' ? 'primary' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('overview')}
            >
              Overview
            </Button>
            <Button 
              variant={viewMode === 'devices' ? 'primary' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('devices')}
            >
              Devices
            </Button>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative bg-gray-50 rounded-lg border border-gray-200 h-96 overflow-hidden">
          {/* Campus Grid */}
          <div className="absolute inset-0 opacity-10">
            {[...Array(10)].map((_, i) => (
              <div key={`h-${i}`} className="absolute w-full h-px bg-gray-400" style={{ top: `${i * 10}%` }}></div>
            ))}
            {[...Array(10)].map((_, i) => (
              <div key={`v-${i}`} className="absolute h-full w-px bg-gray-400" style={{ left: `${i * 10}%` }}></div>
            ))}
          </div>

          {/* Buildings */}
          {buildings.map(building => (
            <div
              key={building.id}
              className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                selectedBuilding?.id === building.id ? 'scale-110 z-10' : 'hover:scale-105'
              }`}
              style={{ left: `${building.x}%`, top: `${building.y}%` }}
              onClick={() => setSelectedBuilding(building)}
            >
              <div className="flex flex-col items-center">
                <div className={`p-2 rounded-full ${getStatusColor(building.status)} bg-white shadow-lg`}>
                  {getStatusIcon(building.status)}
                </div>
                <div className="mt-1 text-xs font-medium text-gray-700 text-center max-w-[80px] truncate">
                  {building.name}
                </div>
                <div className="mt-1 flex items-center">
                  <Badge variant="secondary" className="text-xs">
                    {building.devices} devices
                  </Badge>
                </div>
              </div>
            </div>
          ))}

          {/* Selected Building Info */}
          {selectedBuilding && (
            <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedBuilding.name}</h4>
                  <div className="flex items-center mt-1">
                    <Badge variant={selectedBuilding.status === 'operational' ? 'success' : 
                                selectedBuilding.status === 'warning' ? 'warning' : 
                                selectedBuilding.status === 'critical' ? 'error' : 'info'}>
                      {selectedBuilding.status.charAt(0).toUpperCase() + selectedBuilding.status.slice(1)}
                    </Badge>
                    <span className="ml-2 text-sm text-gray-500">
                      {selectedBuilding.incidents} incidents
                    </span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedBuilding(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center">
                  <Wifi className="w-4 h-4 text-gray-500 mr-1" />
                  <span>{selectedBuilding.devices} devices</span>
                </div>
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-gray-500 mr-1" />
                  <span>{selectedBuilding.incidents} incidents</span>
                </div>
                <div className="flex items-center">
                  <Zap className="w-4 h-4 text-gray-500 mr-1" />
                  <span>Operational</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span>Operational</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span>Warning</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span>Critical</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span>Maintenance</span>
          </div>
        </div>
      </div>
    </Card>
  );
}