// Valid input fixture for testing
export const validInputFixture = {
  description: "Koneksi WiFi tidak stabil di laboratorium komputer 1",
  location: "Gedung A - Fakultas Teknik",
  deviceType: "access-point",
  attachments: []
};

// Expected result structure for valid input
export const expectedValidResult = {
  task: {
    taskId: "task-12345",
    worker: "it_helpdesk",
    status: "queued"
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
    }
  ],
  evidence: [
    {
      sourceId: "sim:device-AP-A1-01",
      observedAt: "2026-10-09T10:00:00Z",
      retrievedAt: "2026-10-09T10:15:00Z",
      simulation: true,
      label: "SIMULATED DATA"
    }
  ]
};