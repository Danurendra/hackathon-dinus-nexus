// Provider failure fixture for testing
export const providerFailureFixture = {
  description: "Masalah jaringan pada gateway",
  location: "Gedung C - Fakultas Ilmu Komputer",
  deviceType: "gateway",
  attachments: []
};

// Expected result structure for provider failure
export const expectedProviderFailureResult = {
  task: {
    taskId: "task-11111",
    worker: "it_helpdesk",
    status: "failed"
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
      status: "completed"
    },
    {
      stepId: "step-4",
      name: "analyze_with_ai",
      status: "failed"
    }
  ],
  error: {
    code: "PROVIDER_ERROR",
    message: "Failed to call LLM provider"
  }
};