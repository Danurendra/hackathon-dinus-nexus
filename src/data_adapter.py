import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"


def load_data(name: str) -> list[dict]:
    with (DATA_DIR / f"{name}.json").open(encoding="utf-8") as file:
        return json.load(file)


def find_devices(zone_id: str | None = None) -> list[dict]:
    devices = load_data("devices")
    if zone_id:
        devices = [d for d in devices if d["zoneId"] == zone_id]
    return devices


def find_incidents(zone_id: str | None = None) -> list[dict]:
    incidents = load_data("incidents")
    if zone_id:
        incidents = [i for i in incidents if i["zoneId"] == zone_id]
    return incidents


def get_device(device_id: str) -> dict | None:
    return next(
        (d for d in load_data("devices") if d["id"] == device_id),
        None,
    )


def get_zone(zone_id: str) -> dict | None:
    return next(
        (z for z in load_data("zones") if z["id"] == zone_id),
        None,
    )


def search_helpdesk(
    query: str,
    zone_id: str | None = None,
    device_type: str | None = None,
) -> dict:
    import re

    datasets = {
        "devices": load_data("devices"),
        "incidents": load_data("incidents"),
        "zones": load_data("zones"),
        "buildings": load_data("buildings"),
    }

    # Expand common terms into vocabulary used by the datasets.
    synonyms = {
        "network": ["jaringan", "wifi", "koneksi", "internet"],
        "jaringan": ["network", "wifi", "koneksi", "internet"],
        "wifi": ["wi-fi", "jaringan", "koneksi", "internet"],
        "wi-fi": ["wifi", "jaringan", "koneksi", "internet"],
        "internet": ["jaringan", "wifi", "koneksi"],
        "connection": ["koneksi", "jaringan", "wifi"],
        "access_point": ["access-point", "access point", "ap"],
        "access-point": ["access_point", "access point", "ap"],
        "ap": ["access-point", "access point"],
    }

    stop_words = {
        "dan", "di", "ke", "dari", "yang", "untuk",
        "ada", "pada", "the", "is", "a", "an", "in",
        "on", "at", "with", "and", "or",
    }

    raw_words = re.findall(
        r"[a-zA-Z0-9_-]+",
        query.lower(),
    )
    keywords = {
        word for word in raw_words
        if len(word) > 1 and word not in stop_words
    }

    expanded_keywords = set(keywords)
    for word in keywords:
        expanded_keywords.update(synonyms.get(word, []))

    normalized_type = (
        device_type.lower().replace("_", "-").replace(" ", "-")
        if device_type
        else None
    )

    # Resolve the selected zone and its building.
    zones = datasets["zones"]
    selected_zone = next(
        (z for z in zones if z["id"].lower() == zone_id.lower()),
        None,
    ) if zone_id else None

    building_id = (
        selected_zone["buildingId"] if selected_zone else None
    )

    # Select devices matching the requested context.
    matching_devices = []
    for device in datasets["devices"]:
        if zone_id and device.get("zoneId") != zone_id:
            continue

        actual_type = device.get("type", "").lower()
        if normalized_type and actual_type != normalized_type:
            continue

        matching_devices.append(device)

    matching_device_ids = {
        device["id"] for device in matching_devices
    }

    matches = {}

    for dataset_name, records in datasets.items():
        scored_records = []

        for record in records:
            # Apply location context.
            if zone_id:
                if dataset_name in ("devices", "incidents"):
                    if record.get("zoneId") != zone_id:
                        continue
                elif dataset_name == "zones":
                    if record.get("id") != zone_id:
                        continue
                elif dataset_name == "buildings":
                    if record.get("id") != building_id:
                        continue

            # Apply device-type context to devices and related incidents.
            if normalized_type and dataset_name == "devices":
                if record not in matching_devices:
                    continue

            if normalized_type and dataset_name == "incidents":
                affected = set(record.get("affectedDevices", []))
                if not affected.intersection(matching_device_ids):
                    continue

            searchable_text = (
                json.dumps(record, ensure_ascii=False).lower()
            )

            matched_keywords = [
                word for word in expanded_keywords
                if word in searchable_text
            ]

            # A selected zone/device is meaningful context even if
            # its identifier is not repeated in the report text.
            context_match = bool(zone_id or normalized_type)

            if matched_keywords or context_match:
                scored_records.append({
                    "record": record,
                    "matched_keywords": matched_keywords,
                    "match_count": len(matched_keywords),
                })

        scored_records.sort(
            key=lambda item: item["match_count"],
            reverse=True,
        )

        # Return original records separately from search metadata.
        matches[dataset_name] = [
            item["record"] for item in scored_records
        ]

    return {
        "data_label": "SYNTHETIC",
        "query": query,
        "filters": {
            "zone_id": zone_id,
            "device_type": device_type,
        },
        "matches": matches,
    }

