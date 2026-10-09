export interface EventScenarioInput {
  attendance: number;
  concurrentOccupancy: number;
  durationHours: number;
  venueCapacity: number;
  venues: number;
  availablePowerKw: number;
  availableNetworkMbps: number;
}

export interface EventForecast {
  energyKwh: number;
  peakPowerKw: number;
  occupancyPercent: number;
  networkDemandMbps: number;
  networkUtilizationPercent: number;
  powerUtilizationPercent: number;
  risk: 'low' | 'medium' | 'high';
  risks: string[];
  recommendations: string[];
}

export function simulateEvent(input: EventScenarioInput): EventForecast {
  const occupancyPercent = (input.concurrentOccupancy / input.venueCapacity) * 100;
  const peakPowerKw = input.concurrentOccupancy * 0.12 + input.attendance * 0.01 + input.venues * 85;
  const energyKwh = peakPowerKw * input.durationHours * 0.72;
  const networkDemandMbps = input.concurrentOccupancy * 0.18 + input.attendance * 0.01;
  const powerUtilizationPercent = (peakPowerKw / input.availablePowerKw) * 100;
  const networkUtilizationPercent = (networkDemandMbps / input.availableNetworkMbps) * 100;
  const risks: string[] = [];

  if (occupancyPercent > 90) risks.push(`Kapasitas venue mencapai ${Math.round(occupancyPercent)}% dari konfigurasi.`);
  if (powerUtilizationPercent > 85) risks.push(`Cadangan daya tersisa ${Math.max(0, Math.round(100 - powerUtilizationPercent))}%.`);
  if (networkUtilizationPercent > 80) risks.push(`Permintaan jaringan mencapai ${Math.round(networkUtilizationPercent)}% dari kapasitas.`);

  const risk = risks.length >= 2 ? 'high' : risks.length === 1 ? 'medium' : 'low';
  const recommendations = [
    occupancyPercent > 90 ? 'Redistribusikan peserta ke venue pendukung atau staggered arrival.' : 'Pertahankan distribusi venue dan pantau arus kedatangan.',
    powerUtilizationPercent > 85 ? 'Siapkan review daya cadangan oleh tim fasilitas berwenang.' : 'Validasi daftar peralatan dan jadwal operasi sebelum eksekusi.',
    networkUtilizationPercent > 80 ? 'Prioritaskan traffic operasional dan siapkan access point tambahan.' : 'Konfirmasi kapasitas Wi-Fi dengan pemilik infrastruktur.',
  ];

  return {
    energyKwh: Math.round(energyKwh),
    peakPowerKw: Math.round(peakPowerKw),
    occupancyPercent: Math.round(occupancyPercent * 10) / 10,
    networkDemandMbps: Math.round(networkDemandMbps),
    networkUtilizationPercent: Math.round(networkUtilizationPercent * 10) / 10,
    powerUtilizationPercent: Math.round(powerUtilizationPercent * 10) / 10,
    risk,
    risks,
    recommendations,
  };
}

export const graduationScenario: EventScenarioInput = {
  attendance: 39000,
  concurrentOccupancy: 18000,
  durationHours: 6,
  venueCapacity: 20000,
  venues: 3,
  availablePowerKw: 3200,
  availableNetworkMbps: 5000,
};
