from src.main import helpdesk_graph, inspect_report, prepare_result


def _initial_state(**overrides):
    state = {
        "task_id": "task-test",
        "description": "Wi-Fi di Laboratorium Komputer 1 mengalami gangguan koneksi.",
        "location": "zone-A1",
        "device_type": "access_point",
        "status": "queued",
        "steps": [],
        "findings": {},
        "result": {},
    }
    state.update(overrides)
    return state


def test_inspect_report_collects_source_ids():
    output = inspect_report(_initial_state())

    assert output["status"] == "running"
    assert output["steps"][0]["step_id"] == "inspect_report"
    assert output["steps"][0]["status"] == "completed"

    source_ids = set(output["steps"][0]["source_ids"])
    assert {"device-AP-A1-01", "device-AP-A1-02"} <= source_ids
    assert {"incident-001", "incident-008"} <= source_ids


def test_prepare_result_preserves_findings_and_builds_evidence():
    inspected = inspect_report(_initial_state())
    state = {**_initial_state(), **inspected}

    output = prepare_result(state)

    assert output["status"] == "completed"
    assert output["result"]["data_label"] == "SYNTHETIC"
    assert output["result"]["facts"]
    assert output["result"]["evidence"]
    assert output["result"]["uncertainty"]
    assert output["result"]["recommendations"]

    evidence_ids = [e["source_id"] for e in output["result"]["evidence"]]
    assert len(evidence_ids) == len(set(evidence_ids)), "evidence must be de-duplicated"

    # Every piece of evidence must point at a real synthetic record.
    datasets = {e["dataset"] for e in output["result"]["evidence"]}
    assert datasets <= {"devices", "incidents", "zones", "buildings"}


def test_graph_end_to_end_completes_with_filters():
    output = helpdesk_graph.invoke(_initial_state())

    assert output["status"] == "completed"
    assert [step["step_id"] for step in output["steps"]] == [
        "inspect_report",
        "prepare_result",
    ]

    finding_devices = {
        record["id"] for record in output["findings"]["matches"]["devices"]
    }
    assert finding_devices == {"device-AP-A1-01", "device-AP-A1-02"}


def test_graph_without_context_still_completes():
    output = helpdesk_graph.invoke(
        _initial_state(location=None, device_type=None, description="jaringan")
    )

    assert output["status"] == "completed"
    # A broad query without location context matches records from any zone.
    assert output["findings"]["matches"]["incidents"]


def test_graph_empty_result_is_not_a_diagnosis():
    output = helpdesk_graph.invoke(
        _initial_state(
            description="quantum entanglement offsite",
            location=None,
            device_type=None,
        )
    )

    assert output["status"] == "completed"
    assert output["result"]["facts"] == []
    assert output["result"]["evidence"] == []