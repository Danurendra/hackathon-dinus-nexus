import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  analysisLabel,
  createIncident,
  decideOperation,
  loadOperationHistory,
  loadOperationRuns,
  OperationsApiError,
  validateIncident,
  type IncidentInput,
  type OperationTask,
} from "./operationsApi";

const fetchMock = vi.fn();
const input: IncidentInput = {
  description: "  Wi-Fi putus di lab  ",
  location: "",
  device_type: "",
  requested_action: "",
};
const task: OperationTask = {
  task_id: "task-1",
  run_id: "run-1",
  worker: "it_helpdesk",
  description: "Wi-Fi putus",
  status: "completed",
  created_at: "2026-10-10T01:00:00Z",
  steps: [],
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("operations API", () => {
  it("validates trimmed description without calling the backend", async () => {
    expect(
      validateIncident({ ...input, description: "    a    " }),
    ).toBeDefined();
    await expect(
      createIncident({ ...input, description: "a".repeat(2001) }),
    ).rejects.toThrow("5–2000");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a real helpdesk task with nullable filters", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(task), { status: 201 }),
    );
    await expect(createIncident(input)).resolves.toEqual(task);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/tasks$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      worker: "it_helpdesk",
      description: "Wi-Fi putus di lab",
      location: null,
      device_type: null,
      requested_action: null,
    });
  });

  it("loads only helpdesk history without caching", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [task, { ...task, worker: "campus_operations" }],
        }),
      ),
    );
    await expect(loadOperationHistory()).resolves.toEqual([task]);
    expect(fetchMock.mock.calls[0][1].cache).toBe("no-store");
  });

  it("retains the persisted task ID after workflow failure", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: {
            task_id: "failed-1",
            error: { message: "private provider detail" },
          },
        }),
        { status: 500 },
      ),
    );
    const error = await createIncident(input).catch(
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(OperationsApiError);
    expect(error).toMatchObject({ taskId: "failed-1" });
    expect((error as Error).message).not.toContain("private");
  });

  it.each([401, 409, 422, 503])(
    "handles HTTP %s with a readable error",
    async (status) => {
      fetchMock.mockResolvedValue(new Response("not JSON", { status }));
      await expect(loadOperationHistory()).rejects.toBeInstanceOf(
        OperationsApiError,
      );
    },
  );

  it("reads normalized runs with cancellation support", async () => {
    const controller = new AbortController();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [] })));
    await loadOperationRuns("task/1", controller.signal);
    expect(fetchMock.mock.calls[0][0]).toMatch(/task%2F1\/runs$/);
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it("records an approval decision, not a device action", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(task)));
    await decideOperation("task-1", "reject", "  Perlu bukti tambahan  ");
    expect(fetchMock.mock.calls[0][0]).toMatch(/task-1\/approval$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      decision: "reject",
      note: "Perlu bukti tambahan",
    });
  });

  it("never labels a skipped or failed LLM step as AI analysis success", () => {
    const withStep = (
      status: "skipped" | "completed" | "failed",
    ): OperationTask => ({
      ...task,
      steps: [{ step_id: "analyze_evidence", name: "Analyze", status }],
    });
    expect(analysisLabel(withStep("skipped"))).toContain("LLM nonaktif");
    expect(analysisLabel(withStep("failed"))).toContain("gagal");
    expect(analysisLabel(withStep("completed"))).toContain("belum tersedia");
    expect(
      analysisLabel({
        ...withStep("completed"),
        result: { analysis: { summary: "Test" } },
      }),
    ).toBe("Analisis LLM");
  });
});
