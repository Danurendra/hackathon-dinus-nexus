from src.data_adapter import (
    find_devices,
    find_incidents,
    get_device,
    get_zone,
    load_data,
    search_helpdesk,
)


def test_dataset_counts_and_relations():
    buildings = load_data("buildings")
    zones = load_data("zones")
    devices = load_data("devices")
    incidents = load_data("incidents")

    assert len(buildings) == 4
    assert len(zones) == 18
    assert len(devices) == 25
    assert len(incidents) == 12

    building_ids = {b["id"] for b in buildings}
    zone_ids = {z["id"] for z in zones}
    device_ids = {d["id"] for d in devices}

    assert all(z["buildingId"] in building_ids for z in zones)
    assert all(d["zoneId"] in zone_ids for d in devices)
    for incident in incidents:
        assert incident["buildingId"] in building_ids
        assert incident["zoneId"] in zone_ids
        assert all(dev in device_ids for dev in incident["affectedDevices"])


def test_lookup_helpers():
    assert get_zone("zone-A1")["name"] == "Laboratorium Komputer 1"
    # Dataset device types use hyphenated identifiers.
    assert get_device("device-AP-A1-01")["type"] == "access-point"
    assert get_zone("zone-does-not-exist") is None
    assert get_device("device-does-not-exist") is None


def test_find_by_zone():
    devices = find_devices("zone-A1")
    assert {d["id"] for d in devices} == {
        "device-AP-A1-01",
        "device-AP-A1-02",
        "device-SW-A1-01",
        "device-GW-A1-01",
    }

    incidents = find_incidents("zone-A1")
    assert {i["id"] for i in incidents} == {"incident-001", "incident-008"}


def test_search_network_in_zone_a1():
    result = search_helpdesk("network", zone_id="zone-A1")

    assert result["data_label"] == "SYNTHETIC"
    assert result["filters"] == {"zone_id": "zone-A1", "device_type": None}
    assert {i["id"] for i in result["matches"]["incidents"]} == {
        "incident-001",
        "incident-008",
    }
    assert result["matches"]["zones"][0]["id"] == "zone-A1"
    assert result["matches"]["buildings"][0]["id"] == "building-A"


def test_search_with_device_type_filter():
    result = search_helpdesk(
        "gangguan koneksi",
        zone_id="zone-A1",
        device_type="access_point",
    )

    assert {d["id"] for d in result["matches"]["devices"]} == {
        "device-AP-A1-01",
        "device-AP-A1-02",
    }
    assert {i["id"] for i in result["matches"]["incidents"]} == {
        "incident-001",
        "incident-008",
    }


def test_search_device_type_filter_narrows_to_requested_type():
    result = search_helpdesk("jaringan", zone_id="zone-A1", device_type="gateway")

    # zone-A1 has one gateway; access points and switches must be excluded.
    assert {d["id"] for d in result["matches"]["devices"]} == {"device-GW-A1-01"}
    # No incident in zone-A1 lists the gateway as an affected device.
    assert result["matches"]["incidents"] == []


def test_search_without_match_returns_empty_matches():
    result = search_helpdesk("quantum entanglement offsite")

    assert all(records == [] for records in result["matches"].values())


def test_search_unknown_zone_returns_no_records():
    result = search_helpdesk("network", zone_id="zone-unknown")

    assert result["matches"]["devices"] == []
    assert result["matches"]["incidents"] == []
    assert result["matches"]["zones"] == []
    assert result["matches"]["buildings"] == []


def test_search_empty_query_returns_empty_matches():
    result = search_helpdesk("")

    assert all(records == [] for records in result["matches"].values())