import json
from pathlib import Path

base = Path("src/data")
files = ["buildings", "zones", "devices", "incidents"]

data = {
    name: json.loads((base / f"{name}.json").read_text())
    for name in files
}

ids = {
    name: {item["id"] for item in records}
    for name, records in data.items()
}

errors = []

for zone in data["zones"]:
    if zone["buildingId"] not in ids["buildings"]:
        errors.append(f"Zona {zone['id']}: gedung tidak ditemukan")

for device in data["devices"]:
    if device["zoneId"] not in ids["zones"]:
        errors.append(f"Perangkat {device['id']}: zona tidak ditemukan")

for incident in data["incidents"]:
    if incident["buildingId"] not in ids["buildings"]:
        errors.append(f"Insiden {incident['id']}: gedung tidak ditemukan")
    if incident["zoneId"] not in ids["zones"]:
        errors.append(f"Insiden {incident['id']}: zona tidak ditemukan")
    for device_id in incident["affectedDevices"]:
        if device_id not in ids["devices"]:
            errors.append(f"Insiden {incident['id']}: perangkat {device_id} tidak ditemukan")

for name, records in data.items():
    print(f"{name}: {len(records)} record")

print(f"\nMasalah ditemukan: {len(errors)}")
for error in errors:
    print("ERROR:", error)

if not errors:
    print("PASS: relasi data valid")
