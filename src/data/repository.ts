import { CampusBuilding, CampusZone, CampusDevice, Incident } from '../domain/types';
import { rawBuildings, rawZones, rawDevices, rawIncidents } from './seed';

// In-memory repository for synthetic data
export class DataRepository {
  private buildings: CampusBuilding[];
  private zones: CampusZone[];
  private devices: CampusDevice[];
  private incidents: Incident[];

  constructor() {
    this.buildings = rawBuildings.map(b => ({ ...b, id: `sim:${b.id}` }));
    this.zones = rawZones.map(z => ({ ...z, id: `sim:${z.id}` }));
    this.devices = rawDevices.map(d => ({ ...d, id: `sim:${d.id}` }));
    this.incidents = rawIncidents.map(i => ({ ...i, id: `sim:${i.id}` }));
  }

  // Read-only operations for buildings
  getBuilding(id: string): CampusBuilding | null {
    return this.buildings.find(b => b.id === id) || null;
  }

  listBuildings(): CampusBuilding[] {
    return [...this.buildings];
  }

  // Read-only operations for zones
  getZone(id: string): CampusZone | null {
    return this.zones.find(z => z.id === id) || null;
  }

  listZones(): CampusZone[] {
    return [...this.zones];
  }

  getZonesByBuilding(buildingId: string): CampusZone[] {
    return this.zones.filter(z => z.buildingId === buildingId);
  }

  // Read-only operations for devices
  getDevice(id: string): CampusDevice | null {
    return this.devices.find(d => d.id === id) || null;
  }

  listDevices(): CampusDevice[] {
    return [...this.devices];
  }

  getDevicesByZone(zoneId: string): CampusDevice[] {
    return this.devices.filter(d => d.zoneId === zoneId);
  }

  getDevicesByStatus(status: string): CampusDevice[] {
    return this.devices.filter(d => d.status === status);
  }

  // Read-only operations for incidents
  getIncident(id: string): Incident | null {
    return this.incidents.find(i => i.id === id) || null;
  }

  listIncidents(): Incident[] {
    return [...this.incidents];
  }

  getIncidentsByZone(zoneId: string): Incident[] {
    return this.incidents.filter(i => i.zoneId === zoneId);
  }

  getIncidentsByBuilding(buildingId: string): Incident[] {
    return this.incidents.filter(i => i.buildingId === buildingId);
  }

  getIncidentsByStatus(status: string): Incident[] {
    return this.incidents.filter(i => i.status === status);
  }

  getIncidentsByPriority(priority: string): Incident[] {
    return this.incidents.filter(i => i.priority === priority);
  }

  // Search methods
  searchDevices(query: string): CampusDevice[] {
    return this.devices.filter(device => 
      device.name.toLowerCase().includes(query.toLowerCase()) ||
      device.type.toLowerCase().includes(query.toLowerCase())
    );
  }

  searchIncidents(query: string): Incident[] {
    return this.incidents.filter(incident => 
      incident.title.toLowerCase().includes(query.toLowerCase()) ||
      incident.description.toLowerCase().includes(query.toLowerCase())
    );
  }
}