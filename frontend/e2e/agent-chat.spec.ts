import { expect, test } from '@playwright/test';

test('role chat, evidence, reload, recovery and mobile keyboard', async ({ page }) => {
  const sessions = new Map<string, { conversation_id: string; worker: string; messages: object[] }>();
  let fail = false;
  await page.route('**/api/conversations**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/api/conversations' && method === 'POST') {
      const worker = route.request().postDataJSON().worker;
      const session = { conversation_id: `session-${sessions.size}`, worker, messages: [] };
      sessions.set(session.conversation_id, session);
      return route.fulfill({ json: session, headers });
    }
    const session = sessions.get(path.split('/')[3]);
    if (!session) return route.fulfill({ status: 404, json: {}, headers });
    if (path.endsWith('/messages')) {
      if (fail) return route.fulfill({ status: 502, json: { detail: 'Provider sementara gagal' }, headers });
      const user = { message_id: `u-${session.messages.length}`, role: 'user', content: route.request().postDataJSON().content };
      const assistant = {
        message_id: `a-${session.messages.length}`, role: 'assistant',
        content: `### Ringkasan\n**${session.worker}**\n- Perlu verifikasi manusia`,
        metadata: { model: 'mock', evidence: [{ dataset: 'devices', source_id: 'device-AP-A2-02', record: { status: 'offline' } }] },
      };
      session.messages.push(user, assistant);
      return route.fulfill({ status: 201, json: assistant, headers });
    }
    return route.fulfill({ json: session, headers });
  });
  await page.goto('/workspace/agents');
  const input = page.getByRole('textbox', { name: /Instruksi untuk/ });
  await expect(input).toBeEnabled();
  await page.getByRole('button', { name: 'Gunakan contoh instruksi' }).click();
  await page.getByRole('button', { name: 'Kirim instruksi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ringkasan', exact: true })).toBeVisible();
  await page.getByText('Evidence adapter · SYNTHETIC · 1 record').click();
  await page.getByText('devices: device-AP-A2-02', { exact: true }).click();
  await expect(page.getByText('offline', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Network Operations Agent.*Network capacity/ }).click();
  await expect(input).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Ringkasan', exact: true })).toHaveCount(0);
  await input.fill('Analisis anomali jaringan');
  await page.getByRole('button', { name: 'Kirim instruksi', exact: true }).click();
  await expect(page.getByText('network_operations', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ringkasan', exact: true })).toBeVisible();
  await expect(page.getByText('it_helpdesk', { exact: true })).toBeVisible();
  fail = true;
  await input.fill('Cek lagi');
  await page.getByRole('button', { name: 'Kirim instruksi', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Provider sementara gagal' })).toBeVisible();
  await expect(input).toHaveValue('Cek lagi');
  fail = false;
  await page.getByRole('button', { name: 'Kirim instruksi', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Provider sementara gagal' })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await input.focus();
  await expect(input).toBeFocused();
  await input.fill('Apa langkah berikutnya?');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Kirim instruksi', exact: true })).toBeFocused();
});
