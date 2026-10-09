// Tool failure fixture for testing
export const toolFailureFixture = {
  description: "Perangkat tidak ditemukan di jaringan",
  location: "Gedung B - Fakultas Ekonomi",
  deviceType: "unknown-device",
  attachments: []
};

// Expected result structure for tool failure
export const expectedToolFailureResult = {
  task: {
    taskId: "task-67890",
    worker: "it_helpdesk",
    status: "running"
  },
  steps: [
    {
      stepId: "step-1",
      name: "validate_input",
      status: "completed"
    },
    {
      stepId: "step-2",
      name: "create_task",
      status: "completed"
    },
    {
      stepId: "step-3",
      name: "device_lookup",
      status: "failed"
    }
  ],
  evidence: [
    {
      sourceId: "sim:device-unknown-device",
      observedAt: "2026-10-09T10:15:00Z",
      retrievedAt: "2026-10-09T10:16:00Z",
      simulation: true,
      label: "SIMULATED DATA",
      status: "failed"
    }
  ]
};