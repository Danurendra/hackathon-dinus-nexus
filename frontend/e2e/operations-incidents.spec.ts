import { expect, test, type Page } from "@playwright/test";

const seedTask = {
  task_id: "ops-task-1",
  run_id: "ops-run-1",
  worker: "it_helpdesk",
  description: "Wi-Fi putus di laboratorium",
  location: "zone-A1",
  status: "completed",
  created_at: "2026-10-10T03:00:00Z",
  steps: [
    {
      step_id: "analyze_evidence",
      name: "Analyze evidence with LLM",
      status: "skipped",
      detail: "LLM disabled",
    },
  ],
  result: {
    facts: [
      { dataset: "devices", record: { id: "device-test", status: "offline" } },
    ],
    evidence: [{ dataset: "devices", source_id: "device-test" }],
    interpretation: ["Fixture lookup completed"],
    uncertainty: ["Synthetic, not live"],
    recommendations: ["Verify device manually"],
  },
};

async function mockBackend(page: Page, initial: unknown[] = []) {
  let items = [...initial];
  let failed = false;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/history") return route.fulfill({ json: { items } });
    if (path.endsWith("/runs"))
      return route.fulfill({
        json: { items: [{ run_id: seedTask.run_id, steps: seedTask.steps }] },
      });
    if (path === "/api/tasks" && request.method() === "POST") {
      if (failed)
        return route.fulfill({
          status: 500,
          json: { detail: { task_id: "ops-task-1" } },
        });
      const body = request.postDataJSON();
      expect(body.worker).toBe("it_helpdesk");
      const task = {
        ...seedTask,
        description: body.description,
        status: body.requested_action ? "waiting_for_approval" : "completed",
        approval: body.requested_action
          ? { action: body.requested_action, status: "pending" }
          : null,
      };
      items = [task];
      return route.fulfill({ status: 201, json: task });
    }
    if (path.endsWith("/approval")) {
      const body = request.postDataJSON();
      const task = {
        ...seedTask,
        status: body.decision === "approve" ? "completed" : "cancelled",
        approval: {
          action: "restart_device",
          status: body.decision === "approve" ? "approved" : "rejected",
          note: body.note,
        },
      };
      items = [task];
      return route.fulfill({ json: task });
    }
    // No request can reach a live backend or paid provider in this suite.
    return route.fulfill({ status: 404, json: { detail: "Not mocked" } });
  });
  return {
    fail: () => {
      failed = true;
    },
    recover: () => {
      failed = false;
    },
  };
}

test("incident intake, normalized steps, evidence and reload", async ({
  page,
}) => {
  await mockBackend(page);
  await page.goto("/workspace/operations?view=incidents");
  await expect(
    page.getByText("Belum ada investigasi tersimpan.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Deskripsi gangguan").fill(seedTask.description);
  await page
    .getByRole("button", { name: "Jalankan investigasi agent" })
    .click();
  await expect(
    page.getByText("Task dan hasil workflow tersimpan di backend."),
  ).toBeVisible();
  await expect(page.getByText("Deterministik · LLM nonaktif")).toBeVisible();
  await expect(page.getByText("Analyze evidence with LLM")).toBeVisible();
  await page
    .locator("summary")
    .filter({ hasText: "devices · device-test" })
    .click();
  await expect(page.getByText('"offline"', { exact: false })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Wi-Fi putus di laboratorium/ }),
  ).toBeVisible();
  await page.getByLabel("Cari laporan").fill("does-not-exist");
  await expect(
    page.getByText("Tidak ada laporan yang cocok dengan filter."),
  ).toBeVisible();
  await expect(
    page.getByText("Pilih laporan untuk melihat langkah", { exact: false }),
  ).toBeVisible();
});

test("human approval records decision without execution", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/workspace/operations?view=incidents");
  await page.getByRole("button", { name: "Contoh dengan approval" }).click();
  await page
    .getByRole("button", { name: "Jalankan investigasi agent" })
    .click();
  await page
    .getByLabel("Catatan approval (opsional)")
    .fill("Perlu bukti tambahan");
  await page.getByRole("button", { name: "Tolak permintaan" }).click();
  await expect(
    page.getByText("Penolakan dicatat dan task dibatalkan."),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Catatan: Perlu bukti tambahan")).toBeVisible();
});

test("mobile failure and retry have no fabricated progress", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  const backend = await mockBackend(page);
  await page.goto("/workspace/operations?view=incidents");
  await page.getByRole("button", { name: "Contoh gangguan Wi-Fi" }).click();
  backend.fail();
  await page
    .getByRole("button", { name: "Jalankan investigasi agent" })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Request gagal" }),
  ).toBeVisible();
  backend.recover();
  await page
    .getByRole("button", { name: "Jalankan investigasi agent" })
    .click();
  await expect(
    page.getByText("Task dan hasil workflow tersimpan di backend."),
  ).toBeVisible();
  const bounds = await page.getByTestId("incident-operations").boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
});

test("history failure has a recovery action", async ({ page }) => {
  await mockBackend(page, [seedTask]);
  await page.route("**/api/history", (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.goto("/workspace/operations?view=incidents");
  await expect(
    page.getByRole("alert").filter({ hasText: "Database tidak tersedia" }),
  ).toBeVisible();
  await page.unroute("**/api/history");
  await page.getByRole("button", { name: "Muat ulang riwayat" }).click();
  await expect(
    page.getByRole("button", { name: /Wi-Fi putus di laboratorium/ }),
  ).toBeVisible();
});

test("completed LLM analysis is distinct from source facts and keyboard accessible", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await mockBackend(page, [
    {
      ...seedTask,
      steps: [
        {
          step_id: "analyze_evidence",
          name: "Analyze evidence with LLM",
          status: "completed",
        },
      ],
      llm_model: "mock-model",
      input_tokens: 10,
      output_tokens: 5,
      result: {
        ...seedTask.result,
        analysis: {
          summary: "Mock interpretation from evidence",
          findings: ["Verify before diagnosis"],
        },
      },
    },
  ]);
  await page.goto("/workspace/operations?view=incidents");
  await expect(page.getByText("Analisis LLM", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Mock interpretation from evidence"),
  ).toBeVisible();
  await expect(page.getByText("Evidence & fakta dataset")).toBeVisible();
  await page.getByLabel("Deskripsi gangguan").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Zona dataset")).toBeFocused();
});
