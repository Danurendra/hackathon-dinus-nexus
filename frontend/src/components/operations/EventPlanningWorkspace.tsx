'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EventScenarioInput, graduationScenario, simulateEvent } from '@/data/eventSimulation';

const scenarios: Array<{ id: string; label: string; description: string; change: Partial<EventScenarioInput> }> = [
  { id: 'baseline', label: 'Baseline', description: 'Rencana awal', change: {} },
  { id: 'optimized', label: 'Optimized', description: 'Distribusi venue lebih merata', change: { concurrentOccupancy: 14500, venues: 4, availableNetworkMbps: 6200 } },
  { id: 'stress', label: 'Stress test', description: 'Kapasitas dan daya berkurang', change: { concurrentOccupancy: 21000, availablePowerKw: 2600, availableNetworkMbps: 4200 } },
];

export function EventPlanningWorkspace() {
  const [input, setInput] = useState<EventScenarioInput>(graduationScenario);
  const [selectedScenario, setSelectedScenario] = useState('baseline');
  const scenario = scenarios.find((item) => item.id === selectedScenario) ?? scenarios[0];
  const forecast = useMemo(() => simulateEvent({ ...input, ...scenario.change }), [input, scenario]);
  const comparison = useMemo(() => scenarios.map((item) => ({ ...item, forecast: simulateEvent({ ...input, ...item.change }) })), [input]);

  const update = (key: keyof EventScenarioInput, value: string) => {
    const next = Number(value);
    if (Number.isFinite(next) && next >= 0) setInput((current) => ({ ...current, [key]: next }));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap gap-2"><Badge variant="primary">SCENARIO PLANNER</Badge><Badge variant="warning">EXAMPLE ASSUMPTIONS</Badge></div>
        <h1 className="text-3xl font-bold tracking-tight text-textPrimary">Event Planning & Simulation</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-textSecondary">Uji rencana acara kampus sebelum eksekusi. Forecast ini deterministic dan menggunakan asumsi yang dapat diubah, bukan telemetry live.</p>
      </div>

      <Card className="overflow-hidden border-indigo-100">
        <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-r from-indigo-50 to-white p-5 md:flex-row md:items-center md:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Active scenario</p><h2 className="mt-1 text-xl font-semibold text-textPrimary">University Graduation Ceremony</h2><p className="mt-1 text-sm text-textSecondary">39.000 total attendance · 6 jam · 3 venue simulasi</p></div>
          <div className="flex rounded-lg border border-border bg-white p-1">{scenarios.map((item) => <button key={item.id} type="button" onClick={() => setSelectedScenario(item.id)} className={`rounded-md px-3 py-2 text-xs font-semibold transition ${selectedScenario === item.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-textSecondary hover:bg-slate-50'}`}>{item.label}</button>)}</div>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-3">
          <Input label="Total attendance" type="number" value={input.attendance} onChange={(e) => update('attendance', e.target.value)} />
          <Input label="Concurrent occupancy" type="number" value={input.concurrentOccupancy} onChange={(e) => update('concurrentOccupancy', e.target.value)} />
          <Input label="Venue capacity" type="number" value={input.venueCapacity} onChange={(e) => update('venueCapacity', e.target.value)} />
          <Input label="Duration (hours)" type="number" value={input.durationHours} onChange={(e) => update('durationHours', e.target.value)} />
          <Input label="Available power (kW)" type="number" value={input.availablePowerKw} onChange={(e) => update('availablePowerKw', e.target.value)} />
          <Input label="Network capacity (Mbps)" type="number" value={input.availableNetworkMbps} onChange={(e) => update('availableNetworkMbps', e.target.value)} />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Forecast label="Peak power" value={`${forecast.peakPowerKw.toLocaleString('id-ID')} kW`} detail={`${forecast.powerUtilizationPercent}% capacity`} icon={<Zap className="h-5 w-5" />} tone={forecast.powerUtilizationPercent > 85 ? 'warning' : 'normal'} />
        <Forecast label="Energy estimate" value={`${forecast.energyKwh.toLocaleString('id-ID')} kWh`} detail="peak demand dipisahkan" icon={<BarChart3 className="h-5 w-5" />} tone="normal" />
        <Forecast label="Peak occupancy" value={`${forecast.occupancyPercent}%`} detail={`${input.concurrentOccupancy.toLocaleString('id-ID')} concurrent`} icon={<AlertTriangle className="h-5 w-5" />} tone={forecast.occupancyPercent > 90 ? 'danger' : 'normal'} />
        <Forecast label="Network demand" value={`${forecast.networkDemandMbps.toLocaleString('id-ID')} Mbps`} detail={`${forecast.networkUtilizationPercent}% capacity`} icon={<CheckCircle2 className="h-5 w-5" />} tone={forecast.networkUtilizationPercent > 80 ? 'warning' : 'normal'} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-4"><h2 className="font-semibold text-textPrimary">Scenario comparison</h2><p className="mt-1 text-xs text-textSecondary">Perbandingan forecast menggunakan input event yang sama.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-textSecondary"><tr><th className="px-5 py-3 font-semibold">Scenario</th><th className="px-5 py-3 font-semibold">Peak power</th><th className="px-5 py-3 font-semibold">Occupancy</th><th className="px-5 py-3 font-semibold">Network</th><th className="px-5 py-3 font-semibold">Risk</th></tr></thead><tbody className="divide-y divide-border">{comparison.map((item) => <tr key={item.id} className={item.id === selectedScenario ? 'bg-indigo-50/60' : 'bg-white'}><td className="px-5 py-3"><p className="font-medium text-textPrimary">{item.label}</p><p className="text-xs text-textSecondary">{item.description}</p></td><td className="px-5 py-3 text-textSecondary">{item.forecast.peakPowerKw.toLocaleString('id-ID')} kW</td><td className="px-5 py-3 text-textSecondary">{item.forecast.occupancyPercent}%</td><td className="px-5 py-3 text-textSecondary">{item.forecast.networkDemandMbps.toLocaleString('id-ID')} Mbps</td><td className="px-5 py-3"><Badge variant={item.forecast.risk === 'high' ? 'error' : item.forecast.risk === 'medium' ? 'warning' : 'success'}>{item.forecast.risk}</Badge></td></tr>)}</tbody></table></div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-textPrimary">Risk & evidence</h2><p className="mt-1 text-xs text-textSecondary">Hasil kalkulasi dari parameter skenario aktif</p></div><Badge variant={forecast.risk === 'high' ? 'error' : forecast.risk === 'medium' ? 'warning' : 'success'}>{forecast.risk.toUpperCase()} RISK</Badge></div>{forecast.risks.length ? <ul className="mt-5 space-y-3">{forecast.risks.map((risk) => <li key={risk} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{risk}</li>)}</ul> : <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Tidak ada constraint melewati threshold konfigurasi.</div>}<p className="mt-5 text-[11px] leading-5 text-textSecondary">Sumber: deterministic simulation engine. Nilai adalah estimasi berbasis asumsi, bukan pengukuran aktual atau jaminan keselamatan.</p></Card>
        <Card className="p-5"><h2 className="font-semibold text-textPrimary">Recommended next steps</h2><div className="mt-4 space-y-3">{forecast.recommendations.map((recommendation, index) => <div key={recommendation} className="flex gap-3 text-sm text-textSecondary"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">{index + 1}</span><span>{recommendation}</span></div>)}</div><div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-textSecondary">Sensitive operational actions require human approval and are not executed by this prototype.</div></Card>
      </div>
    </div>
  );
}

function Forecast({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: 'normal' | 'warning' | 'danger' }) {
  const color = tone === 'danger' ? 'text-red-600 bg-red-50' : tone === 'warning' ? 'text-amber-600 bg-amber-50' : 'text-indigo-600 bg-indigo-50';
  return <Card className="p-4"><div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>{icon}</div><p className="text-xs font-medium text-textSecondary">{label}</p><p className="mt-1 text-xl font-bold text-textPrimary">{value}</p><p className="mt-1 text-xs text-textSecondary">{detail}</p></Card>;
}
