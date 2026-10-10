"""
Campus operations data adapter.

Provides campus event planning, building capacity, and resource data.
All data is SYNTHETIC and labeled accordingly.
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional

DATA_DIR = Path(__file__).parent / "data"


def _load_json(filename: str) -> List[Dict[str, Any]]:
    """Load JSON data file."""
    filepath = DATA_DIR / filename
    if filepath.exists():
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def get_campus_buildings() -> List[Dict[str, Any]]:
    """Get all campus buildings with operational data."""
    buildings = _load_json("buildings.json")
    zones = _load_json("zones.json")
    
    # Enrich buildings with zone capacity data
    result = []
    for b in buildings:
        building_id = b.get("id", b.get("building_id", ""))
        
        # Find matching zones
        building_zones = [z for z in zones if z.get("buildingId") == building_id]
        total_capacity = sum(z.get("capacity", 0) for z in building_zones)
        
        result.append({
            "building_id": building_id,
            "name": b.get("name", "Unknown"),
            "status": b.get("status", "operational"),
            "daily_capacity": total_capacity if total_capacity > 0 else b.get("capacity"),
            "event_capacity": b.get("event_capacity", total_capacity * 10 if total_capacity > 0 else 1000),
            "base_energy_kw": b.get("base_energy_kw", 50),
            "access_points": b.get("access_points", 2),
            "provenance": "SYNTHETIC",
        })
    
    return result


def get_building_capacity(building_id: str) -> Optional[Dict[str, Any]]:
    """Get capacity details for a specific building."""
    buildings = get_campus_buildings()
    for b in buildings:
        if b["building_id"] == building_id:
            return b
    return None


def estimate_event_impact(attendance: int, duration_hours: float, building_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Estimate event impact on campus resources.
    
    Assumptions (SYNTHETIC):
    - 60% concurrent attendance
    - 0.12 kW per person for energy
    - 0.18 Mbps per person for network
    - Distribution across buildings based on event capacity
    """
    # Calculate concurrent attendance
    concurrent = int(attendance * 0.6)
    
    # Energy estimate
    energy_kw = int(concurrent * 0.12)
    
    # Network estimate
    network_mbps = int(concurrent * 0.18)
    
    # Building distribution
    target_buildings = []
    if building_ids:
        for bid in building_ids:
            b = get_building_capacity(bid)
            if b and b.get("event_capacity"):
                target_buildings.append(b)
    else:
        # Use all buildings with event capacity
        target_buildings = [b for b in get_campus_buildings() if b.get("event_capacity")]
    
    # Sort by capacity (descending)
    target_buildings.sort(key=lambda x: x.get("event_capacity", 0), reverse=True)
    
    # Distribute attendance
    total_capacity = sum(b.get("event_capacity", 0) for b in target_buildings)
    distribution = []
    remaining = concurrent
    
    for i, b in enumerate(target_buildings):
        if i == len(target_buildings) - 1:
            # Last building gets remaining
            allocated = remaining
        else:
            # Proportional allocation
            allocated = int(concurrent * b.get("event_capacity", 0) / total_capacity) if total_capacity > 0 else 0
            remaining -= allocated
        
        capacity = b.get("event_capacity", 1)
        load_percent = (allocated / capacity * 100) if capacity > 0 else 0
        
        distribution.append({
            "building_id": b["building_id"],
            "name": b["name"],
            "allocated": allocated,
            "capacity": capacity,
            "load_percent": round(load_percent, 1),
            "status": "critical" if load_percent > 100 else "attention" if load_percent > 80 else "normal",
        })
    
    return {
        "attendance": attendance,
        "concurrent": concurrent,
        "duration_hours": duration_hours,
        "energy_kw": energy_kw,
        "network_mbps": network_mbps,
        "building_distribution": distribution,
        "assumptions": [
            "60% concurrent attendance",
            "0.12 kW per person energy consumption",
            "0.18 Mbps per person network demand",
            "Distribution proportional to event capacity",
        ],
        "provenance": "SYNTHETIC",
    }


def get_campus_incidents() -> List[Dict[str, Any]]:
    """Get current campus incidents (IT + security)."""
    incidents = _load_json("incidents.json")
    buildings = get_campus_buildings()
    
    # Group incidents by building
    result = []
    for b in buildings:
        building_incidents = [i for i in incidents if i.get("buildingId") == b["building_id"] and i.get("status") in ("open", "investigating", "maintenance")]
        
        it_count = sum(1 for i in building_incidents if i.get("type", "it") == "it")
        security_count = sum(1 for i in building_incidents if i.get("type") == "security")
        
        if it_count > 0:
            result.append({
                "building_id": b["building_id"],
                "building_name": b["name"],
                "type": "it",
                "count": it_count,
                "provenance": "SYNTHETIC",
            })
        
        if security_count > 0:
            result.append({
                "building_id": b["building_id"],
                "building_name": b["name"],
                "type": "security",
                "count": security_count,
                "provenance": "SYNTHETIC",
            })
    
    return result


def search_campus(query: str) -> Dict[str, Any]:
    """
    Search campus data by keyword.
    Returns matching buildings and incidents.
    """
    query_lower = query.lower()
    
    matching_buildings = [
        b for b in get_campus_buildings()
        if query_lower in b["name"].lower() or query_lower in b["building_id"].lower()
    ]
    
    matching_incidents = [
        i for i in get_campus_incidents()
        if query_lower in i["building_name"].lower() or query_lower in i["type"].lower()
    ]
    
    return {
        "buildings": matching_buildings,
        "incidents": matching_incidents,
        "provenance": "SYNTHETIC",
    }
