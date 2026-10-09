"""
Network operations data adapter.

Provides network topology, device health, and capacity metrics.
All data is SYNTHETIC and labeled accordingly.
"""

from typing import Dict, List, Any, Optional

# Synthetic network topology data
NETWORK_DEVICES = [
    {
        "device_id": "router-core-01",
        "type": "router",
        "location": "Gedung H - IT Operations",
        "status": "operational",
        "uptime_hours": 720,
        "bandwidth_capacity_mbps": 10000,
        "bandwidth_used_mbps": 6500,
        "utilization_percent": 65,
        "latency_ms": 2,
        "packet_loss_percent": 0.01,
        "connected_devices": 245,
    },
    {
        "device_id": "switch-dist-01",
        "type": "switch",
        "location": "Gedung D - Fakultas Teknik",
        "status": "operational",
        "uptime_hours": 480,
        "bandwidth_capacity_mbps": 1000,
        "bandwidth_used_mbps": 780,
        "utilization_percent": 78,
        "latency_ms": 1,
        "packet_loss_percent": 0.02,
        "connected_devices": 89,
    },
    {
        "device_id": "ap-lab-komputer-1",
        "type": "access_point",
        "location": "Laboratorium Komputer 1",
        "status": "attention",
        "uptime_hours": 168,
        "bandwidth_capacity_mbps": 300,
        "bandwidth_used_mbps": 285,
        "utilization_percent": 95,
        "latency_ms": 45,
        "packet_loss_percent": 2.3,
        "connected_devices": 42,
    },
    {
        "device_id": "ap-perpustakaan",
        "type": "access_point",
        "location": "Perpustakaan",
        "status": "operational",
        "uptime_hours": 336,
        "bandwidth_capacity_mbps": 300,
        "bandwidth_used_mbps": 120,
        "utilization_percent": 40,
        "latency_ms": 8,
        "packet_loss_percent": 0.05,
        "connected_devices": 28,
    },
]

NETWORK_ZONES = [
    {
        "zone_id": "zone-network-core",
        "name": "Core Network",
        "total_bandwidth_mbps": 10000,
        "used_bandwidth_mbps": 6500,
        "utilization_percent": 65,
        "device_count": 3,
    },
    {
        "zone_id": "zone-network-academic",
        "name": "Academic Buildings",
        "total_bandwidth_mbps": 5000,
        "used_bandwidth_mbps": 3200,
        "utilization_percent": 64,
        "device_count": 12,
    },
    {
        "zone_id": "zone-network-public",
        "name": "Public Areas",
        "total_bandwidth_mbps": 2000,
        "used_bandwidth_mbps": 890,
        "utilization_percent": 44,
        "device_count": 8,
    },
]


def get_network_devices(zone_id: Optional[str] = None, device_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get network devices, optionally filtered by zone or type."""
    devices = NETWORK_DEVICES
    
    if device_type:
        devices = [d for d in devices if d["type"] == device_type]
    
    if zone_id:
        # Simple zone matching by location substring
        devices = [d for d in devices if zone_id.lower() in d["location"].lower()]
    
    return devices


def get_network_zones() -> List[Dict[str, Any]]:
    """Get network zone summaries."""
    return NETWORK_ZONES


def get_device(device_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific network device by ID."""
    for device in NETWORK_DEVICES:
        if device["device_id"] == device_id:
            return device
    return None


def detect_network_anomalies() -> List[Dict[str, Any]]:
    """
    Detect network anomalies based on explicit rules.
    
    Rules:
    - Utilization > 90%: congestion warning
    - Latency > 30ms: high latency
    - Packet loss > 1%: significant packet loss
    """
    anomalies = []
    
    for device in NETWORK_DEVICES:
        if device["utilization_percent"] > 90:
            anomalies.append({
                "device_id": device["device_id"],
                "type": "congestion",
                "severity": "high",
                "message": f"Utilization {device['utilization_percent']}% exceeds 90% threshold",
                "value": device["utilization_percent"],
                "threshold": 90,
            })
        
        if device["latency_ms"] > 30:
            anomalies.append({
                "device_id": device["device_id"],
                "type": "high_latency",
                "severity": "medium",
                "message": f"Latency {device['latency_ms']}ms exceeds 30ms threshold",
                "value": device["latency_ms"],
                "threshold": 30,
            })
        
        if device["packet_loss_percent"] > 1:
            anomalies.append({
                "device_id": device["device_id"],
                "type": "packet_loss",
                "severity": "high",
                "message": f"Packet loss {device['packet_loss_percent']}% exceeds 1% threshold",
                "value": device["packet_loss_percent"],
                "threshold": 1,
            })
    
    return anomalies


def search_network(query: str) -> Dict[str, Any]:
    """
    Search network data by keyword.
    Returns matching devices and zones.
    """
    query_lower = query.lower()
    
    matching_devices = [
        d for d in NETWORK_DEVICES
        if query_lower in d["device_id"].lower() or query_lower in d["location"].lower()
    ]
    
    matching_zones = [
        z for z in NETWORK_ZONES
        if query_lower in z["name"].lower() or query_lower in z["zone_id"].lower()
    ]
    
    return {
        "devices": matching_devices,
        "zones": matching_zones,
        "provenance": "SYNTHETIC",
    }
