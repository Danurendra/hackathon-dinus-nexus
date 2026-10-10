import { test, expect } from '@playwright/test';

test('event workflow, evidence, reload, helpdesk follow-up and persistent history', async ({ page }) => {
  const eventName = `Demo Evidence Event ${Date.now()}`;
  await page.goto('/workspace/operations');
  await page.getByRole('textbox', { name: 'Nama event' }).fill(eventName);
  await page.getByRole('button', { name: 'Jalankan workflow event' }).click();
  await expect(page.getByRole('button', { name: new RegExp(`Event assessment: ${eventName}`) })).toBeVisible();
  await expect(page.getByText('Review kebutuhan sekitar 11 AP tambahan', { exact: false })).toBeVisible();
  await page.getByText('Evidence: record asli dataset sintetis', { exact: false }).click();
  await expect(page.getByText('devices · device-AP-A2-02', { exact: true })).toBeVisible();
  await expect(page.getByText('Inspect synthetic AP inventory and active incidents', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: new RegExp(`Event assessment: ${eventName}`) })).toBeVisible();
  await page.getByRole('button', { name: 'Investigasi device-AP-A2-02' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Task IT Helpdesk' })).toBeVisible();
  await page.getByRole('link', { name: 'Buka task & execution history' }).click();
  await expect(page.getByRole('button', { name: /Investigasi Wi-Fi sebelum event/ }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Investigasi Wi-Fi sebelum event/ }).first()).toBeVisible();
});

test('backend failure is visible and the workflow can be retried on mobile', async ({ page }) => {
  const eventName = `Demo Retry Event ${Date.now()}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspace/operations');
  await page.getByRole('textbox', { name: 'Nama event' }).fill(eventName);
  await page.route('**/api/event-plans', (route) => route.fulfill({
    status: 500, contentType: 'application/json',
    body: JSON.stringify({ detail: { error: { message: 'Demo: adapter unavailable' } } }),
  }));
  await page.getByRole('button', { name: 'Jalankan workflow event' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Demo: adapter unavailable' })).toBeVisible();
  await page.unroute('**/api/event-plans');
  await page.getByRole('button', { name: 'Jalankan workflow event' }).click();
  await expect(page.getByRole('button', { name: new RegExp(`Event assessment: ${eventName}`) })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Demo: adapter unavailable' })).toHaveCount(0);
});

test('OSM Twin hands its scenario to a real operational workflow without replacing geometry', async ({ page }) => {
  const eventName = `Twin Demo Event ${Date.now()}`;
  await page.goto('/');
  await page.getByRole('button', { name: 'Scenario', exact: true }).click();
  await page.getByRole('button', { name: 'Run Simulation', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nama event' }).fill(eventName);
  await page.getByRole('button', { name: 'Jalankan workflow event' }).click();
  await expect(page.getByRole('button', { name: new RegExp(`Event assessment: ${eventName}`) })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Inspect synthetic AP inventory and active incidents' })).toBeVisible();
  await page.getByRole('button', { name: 'Ops Mode', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Day Mode', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(`Event assessment: ${eventName}`) })).toBeVisible();
});
