"""Evidence-backed event assessment; no live telemetry or operational writes."""

import math
import json
import os
import time
from datetime import datetime, timezone
from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ConfigDict, Field, model_validator

from src.data_adapter import load_data
from src.llm.analysis import analyze_findings


class EventPlanInput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    name: str = Field(min_length=3, max_length=200)
    attendance: int = Field(ge=1, le=100000)
    concurrent_occupancy: int = Field(alias="concurrentOccupancy", ge=1, le=100000)
    duration_hours: float = Field(alias="durationHours", gt=0, le=168)
    venue_capacity: int = Field(alias="venueCapacity", ge=1, le=100000)
    venues: int = Field(ge=1, le=100)
    available_power_kw: float = Field(alias="availablePowerKw", gt=0, le=1000000)
    available_network_mbps: float = Field(alias="availableNetworkMbps", gt=0, le=1000000)

    @model_validator(mode="after")
    def validate_plan(self):
        if not self.name.strip():
            raise ValueError("Event name must not be blank")
        if self.concurrent_occupancy > self.attendance:
            raise ValueError("Concurrent occupancy cannot exceed attendance")
        return self


class EventState(TypedDict):
    input: dict
    records: dict
    forecast: dict
    result: dict
    steps: list[dict]


class EventStepError(RuntimeError):
    def __init__(self, steps):
        super().__init__("Event assessment failed")
        self.steps = steps


def measured_step(key, name, action):
    def node(state):
        started_at = datetime.now(timezone.utc).isoformat()
        start = time.perf_counter()
        step = {"step_id": key, "name": name, "started_at": started_at}
        try:
            update = action(state)
            step.update(status=update.pop("step_status", "completed"), source_ids=update.pop("source_ids", []))
        except Exception as exc:
            step.update(status="failed", error={"code": "EVENT_ASSESSMENT_FAILED", "message": "Event data or calculation unavailable."})
            step["duration_ms"] = round((time.perf_counter() - start) * 1000, 3)
            raise EventStepError(state["steps"] + [step]) from exc
        step["duration_ms"] = round((time.perf_counter() - start) * 1000, 3)
        step["completed_at"] = datetime.now(timezone.utc).isoformat()
        step["detail"] = f"Measured duration: {step['duration_ms']} ms"
        return {**update, "steps": state["steps"] + [step]}
    return node


def inspect_records(state):
    records = {dataset: load_data(dataset) for dataset in ("devices", "incidents")}
    records["devices"] = [d for d in records["devices"] if d["type"] == "access-point"]
    records["incidents"] = [i for i in records["incidents"] if i["status"] in {"open", "investigating", "maintenance"}]
    if not records["devices"]:
        raise ValueError("No access-point inventory available")
    return {"records": records, "source_ids": [r["id"] for rows in records.values() for r in rows]}


def calculate_impact(state):
    p = state["input"]
    power = p["concurrent_occupancy"] * 0.12 + p["attendance"] * 0.01 + p["venues"] * 85
    network = p["concurrent_occupancy"] * 0.18 + p["attendance"] * 0.01
    online_aps = sum(d["status"] == "online" for d in state["records"]["devices"])
    # AP throughput is an explicit planning assumption, not device telemetry.
    access_capacity = online_aps * 200
    return {"forecast": {
        "peakPowerKw": round(power), "energyKwh": round(power * p["duration_hours"] * 0.72),
        "occupancyPercent": round(p["concurrent_occupancy"] / p["venue_capacity"] * 100, 1),
        "networkDemandMbps": round(network),
        "powerUtilizationPercent": round(power / p["available_power_kw"] * 100, 1),
        "networkUtilizationPercent": round(network / p["available_network_mbps"] * 100, 1),
        "onlineAccessPoints": online_aps, "estimatedAccessCapacityMbps": access_capacity,
        "additionalAccessPoints": max(0, math.ceil((network - access_capacity) / 200)),
    }}


def prepare_assessment(state):
    f = state["forecast"]
    risks, recommendations = [], []
    if f["occupancyPercent"] > 90:
        risks.append(f"Beban venue diperkirakan {f['occupancyPercent']}% dari kapasitas rencana.")
        recommendations.append("Tinjau kapasitas venue; bagi peserta menjadi sesi atau venue pendukung.")
    if f["powerUtilizationPercent"] > 85:
        risks.append(f"Pemakaian daya diperkirakan {f['powerUtilizationPercent']}% dari alokasi rencana.")
        recommendations.append("Minta tim fasilitas meninjau daya cadangan dan daftar peralatan.")
    if f["networkUtilizationPercent"] > 80:
        risks.append(f"Permintaan uplink diperkirakan {f['networkUtilizationPercent']}% dari kapasitas rencana.")
    if f["additionalAccessPoints"]:
        risks.append(f"Kapasitas akses estimasi {f['estimatedAccessCapacityMbps']} Mbps lebih rendah dari kebutuhan {f['networkDemandMbps']} Mbps.")
        recommendations.append(f"Review kebutuhan sekitar {f['additionalAccessPoints']} AP tambahan; verifikasi cakupan dan throughput terlebih dahulu.")
    unavailable = [d for d in state["records"]["devices"] if d["status"] != "online"]
    if unavailable:
        risks.append(f"Dataset sintetis mencatat {len(unavailable)} AP tidak online.")
        recommendations.append("Buat investigasi IT Helpdesk untuk AP tidak online sebelum acara; jangan restart otomatis.")
    if state["records"]["incidents"]:
        recommendations.append("Tinjau insiden aktif di inventory kampus; belum ada pemetaan venue event ke lokasi insiden.")
    recommendations.append("Konfirmasikan rencana dengan pemilik fasilitas dan jaringan; tidak ada tindakan yang telah dieksekusi.")
    facts = [{"dataset": dataset, "record": record} for dataset, rows in state["records"].items() for record in rows]
    return {"result": {
        "event_input": state["input"], "forecast": f,
        "risk": "high" if len(risks) >= 2 else "medium" if risks else "low",
        "facts": facts, "evidence": [{"dataset": item["dataset"], "source_id": item["record"]["id"]} for item in facts],
        "interpretation": risks or ["Tidak ada ambang risiko yang terlampaui dalam model ini."],
        "recommendations": recommendations,
        "uncertainty": [
            "Event dimasukkan pengguna, bukan dideteksi dari kalender atau telemetry live.",
            "Inventory kampus sintetis; relevansi perangkat ke venue belum diverifikasi.",
            "Kapasitas venue, daya, uplink dan kehadiran adalah asumsi pengguna, bukan hasil pengukuran.",
            "Formula estimasi: 0.12 kW/orang serentak + 0.01 kW/peserta + 85 kW/venue; energi = daya × jam × 0.72.",
            "Jaringan = 0.18 Mbps/orang serentak + 0.01 Mbps/peserta; asumsi 200 Mbps/AP online, bukan kapasitas terukur.",
            "Kalkulasi dan deteksi risiko berbasis aturan deterministik; review AI opsional tidak mengganti facts. Bukan jaminan keselamatan acara.",
        ], "data_label": "SYNTHETIC", "analysis_mode": "deterministic",
    }}


def analyze_event(state):
    if os.getenv("LLM_ENABLED", "false").strip().lower() not in {"1", "true", "yes", "on"}:
        return {"step_status": "skipped"}
    # Reuse the existing bounded digest, Structured Outputs and retry policy.
    # Facts and source IDs remain untouched; the model only supplies commentary.
    report = "Tinjau risiko event kampus dan rekomendasikan langkah verifikasi, bukan eksekusi aksi. "
    report += "Semua input dan forecast berikut adalah asumsi/simulasi, bukan kondisi live: "
    report += json.dumps({"input": state["input"], "forecast": state["forecast"],
                          "risks": state["result"]["interpretation"],
                          "assumptions": state["result"]["uncertainty"]}, ensure_ascii=False)
    analysis = analyze_findings(report, {"matches": state["records"]})
    return {"result": {**state["result"], "analysis": analysis, "analysis_mode": "llm_assisted"}}


builder = StateGraph(EventState)
builder.add_node("inspect_event_records", measured_step("inspect_event_records", "Inspect synthetic AP inventory and active incidents", inspect_records))
builder.add_node("calculate_event_impact", measured_step("calculate_event_impact", "Calculate event resource impact", calculate_impact))
builder.add_node("prepare_event_assessment", measured_step("prepare_event_assessment", "Detect risks and recommend safe next steps", prepare_assessment))
builder.add_node("analyze_event_evidence", measured_step("analyze_event_evidence", "Optional AI review of event evidence", analyze_event))
builder.add_edge(START, "inspect_event_records")
builder.add_edge("inspect_event_records", "calculate_event_impact")
builder.add_edge("calculate_event_impact", "prepare_event_assessment")
builder.add_edge("prepare_event_assessment", "analyze_event_evidence")
builder.add_edge("analyze_event_evidence", END)
event_graph = builder.compile()
