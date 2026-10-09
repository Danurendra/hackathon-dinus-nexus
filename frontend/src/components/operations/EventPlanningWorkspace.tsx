'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Bot, CheckCircle2, Send, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { EventScenarioInput, graduationScenario, simulateEvent } from '@/data/eventSimulation';

const scenarios: Array<{ id: string; label: string; description: string; change: Partial<EventScenarioInput> }> = [
  { id: 'baseline', label: 'Baseline', description: 'Rencana awal', change: {} },
  { id: 'optimized', label: 'Optimized', description: 'Distribusi venue lebih merata', change: { concurrentOccupancy: 14500, venues: 4, availableNetworkMbps: 6200 } },
  { id: 'stress', label: 'Stress test', description: 'Kapasitas dan daya berkurang', change: { concurrentOccupancy: 21000, availablePowerKw: 2600, availableNetworkMbps: 4200 } },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_DINUSNEXUS_API_KEY;

interface AgentMessage {
  message_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export function EventPlanningWorkspace() {
  const [input, setInput] = useState<EventScenarioInput>(graduationScenario);
  const [selectedScenario, setSelectedScenario] = useState('baseline');
  const [agentMessage, setAgentMessage] = useState('');
  const [agentResponse, setAgentResponse] = useState<AgentMessage>();
  const [conversationId, setConversationId] = useState<string>();
  const [agentState, setAgentState] = useState<'idle' | 'preparing' | 'waiting' | 'error'>('idle');
  const [agentError, setAgentError] = useState<string>();
  const scenario = scenarios.find((item) => item.id === selectedScenario) ?? scenarios[0];
  const forecast = useMemo(() => simulateEvent({ ...input, ...scenario.change }), [input, scenario]);
  const comparison = useMemo(() => scenarios.map((item) => ({ ...item, forecast: simulateEvent({ ...input, ...item.change }) })), [input]);

  const update = (key: keyof EventScenarioInput, value: string) => {
    const next = Number(value);
    if (Number.isFinite(next) && next >= 0) setInput((current) => ({ ...current, [key]: next }));
  };

  const scenarioContext = () => [
    'Analisis skenario event kampus berikut sebagai Campus Operations Agent.',
    'Penting: semua angka berasal dari deterministic simulation dan planning assumptions, bukan telemetry live.',
    `Skenario: University Graduation Ceremony (${scenario.label})`,
    `Input: attendance=${input.attendance}, concurrent_occupancy=${input.concurrentOccupancy}, venue_capacity=${input.venueCapacity}, duration_hours=${input.durationHours}, available_power_kw=${input.availablePowerKw}, network_capacity_mbps=${input.availableNetworkMbps}, venues=${input.venues}`,
    `Forecast: peak_power_kw=${forecast.peakPowerKw}, energy_kwh=${forecast.energyKwh}, occupancy_percent=${forecast.occupancyPercent}, network_demand_mbps=${forecast.networkDemandMbps}, power_utilization_percent=${forecast.powerUtilizationPercent}, network_utilization_percent=${forecast.networkUtilizationPercent}, risk=${forecast.risk}`,
    `Risiko terdeteksi: ${forecast.risks.length ? forecast.risks.join(' | ') : 'tidak ada constraint melewati threshold'}`,
    `Rekomendasi deterministic engine: ${forecast.recommendations.join(' | ')}`,
    'Berikan ringkasan, fakta dari input, interpretasi, ketidakpastian, dan rekomendasi verifikasi. Jangan mengklaim data live dan jangan mengeksekusi tindakan.',
  ].join('\n');

  async function askAgent(prompt?: string) {
    const content = (prompt ?? agentMessage).trim();
    if (!content || agentState === 'preparing' || agentState === 'waiting') return;
    setAgentError(undefined);
    setAgentState('preparing');
    try {
      let activeConversationId = conversationId;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
      };
      if (!activeConversationId) {
        const conversationResponse = await fetch(`${API_BASE_URL}/api/conversations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ worker: 'campus_operations', title: 'Operations scenario analysis' }),
        });
        if (!conversationResponse.ok) throw new Error('Conversation Campus Operations tidak dapat dibuat.');
        const conversation = (await conversationResponse.json()) as { conversation_id: string };
        activeConversationId = conversation.conversation_id;
        setConversationId(activeConversationId);
      }

      setAgentState('waiting');
      const response = await fetch(`${API_BASE_URL}/api/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: prompt ? `${scenarioContext()}\n\nPertanyaan tambahan: ${content}` : `${scenarioContext()}\n\nPertanyaan: ${content}`,
          context: { worker: 'campus_operations', scenario: scenario.label },
        }),
      });
      if (!response.ok) throw new Error('Campus Operations Agent gagal memberikan analisis.');
      setAgentResponse((await response.json()) as AgentMessage);
      setAgentMessage('');
      setAgentState('idle');
    } catch (error) {
      setAgentState('error');
      setAgentError(error instanceof Error ? error.message : 'AI agent gagal dipanggil.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap gap-2"><Badge variant="primary">SCENARIO PLANNER</Badge><Badge variant="warning">PLANNING ASSUMPTIONS</Badge></div>
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
        <Card className="p-5"><h2 className="font-semibold text-textPrimary">Recommended next steps</h2><div className="mt-4 space-y-3">{forecast.recommendations.map((recommendation, index) => <div key={recommendation} className="flex gap-3 text-sm text-textSecondary"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">{index + 1}</span><span>{recommendation}</span></div>)}</div><div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-textSecondary">Sensitive operational actions require human approval and are not executed automatically.</div></Card>
      </div>

      <Card className="overflow-hidden border-indigo-100">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><Bot className="h-5 w-5" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-textPrimary">Campus Operations AI Agent</h2><Badge variant="success">CONNECTED</Badge><Badge variant="warning">SYNTHETIC CONTEXT</Badge></div>
              <p className="mt-1 text-xs text-textSecondary">Menganalisis forecast dan risiko skenario tanpa mengeksekusi tindakan operasional.</p>
            </div>
          </div>
          <button type="button" onClick={() => void askAgent('Berikan analisis utama skenario ini dan tiga langkah verifikasi sebelum eksekusi.')} disabled={agentState === 'preparing' || agentState === 'waiting'} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Sparkles className="h-4 w-4" />
            {agentState === 'waiting' ? 'Menganalisis...' : 'Analyze scenario'}
          </button>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-h-[150px] rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            {agentResponse ? (
              <div className="flex gap-3"><Bot className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" /><p className="whitespace-pre-wrap text-sm leading-6 text-textSecondary">{agentResponse.content}</p></div>
            ) : <p className="text-sm leading-6 text-textSecondary">Jalankan analisis untuk mendapatkan interpretasi AI berdasarkan input dan forecast di atas.</p>}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void askAgent(); }} className="space-y-3">
            <Textarea value={agentMessage} onChange={(event) => setAgentMessage(event.target.value)} placeholder="Tanyakan risiko venue, kapasitas, atau langkah verifikasi..." rows={4} disabled={agentState === 'preparing' || agentState === 'waiting'} />
            <button type="submit" disabled={!agentMessage.trim() || agentState === 'preparing' || agentState === 'waiting'} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="h-4 w-4" /> Kirim ke agent
            </button>
            {agentError && <p className="text-xs leading-5 text-red-700">{agentError}</p>}
            {!API_KEY && <p className="text-[11px] leading-5 text-amber-700">API key frontend belum dikonfigurasi; endpoint conversation lokal mungkin menolak request.</p>}
          </form>
        </div>
      </Card>
    </div>
  );
}

function Forecast({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: 'normal' | 'warning' | 'danger' }) {
  const color = tone === 'danger' ? 'text-red-600 bg-red-50' : tone === 'warning' ? 'text-amber-600 bg-amber-50' : 'text-indigo-600 bg-indigo-50';
  return <Card className="p-4"><div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>{icon}</div><p className="text-xs font-medium text-textSecondary">{label}</p><p className="mt-1 text-xl font-bold text-textPrimary">{value}</p><p className="mt-1 text-xs text-textSecondary">{detail}</p></Card>;
}
