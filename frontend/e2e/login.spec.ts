import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Never reach a live backend, create tasks, or call a paid LLM.
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path === '/api/conversations' ? [] : { items: [] } });
  });
});

test('login verifies access, survives reload, and logout clears tab credentials', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Selamat datang kembali.' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  await page.getByRole('button', { name: 'API key demo', exact: true }).click();
  await page.getByLabel('API key demo', { exact: false }).fill('demo-browser-test');
  await page.getByRole('button', { name: 'Tampilkan API key' }).click();
  await expect(page.locator('#demo-key')).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Masuk ke workspace' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'Keluar demo' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Keluar demo' })).toBeVisible();
  await page.getByRole('button', { name: 'Keluar demo' }).click();
  await expect(page).toHaveURL('/login');
  expect(await page.evaluate(() => sessionStorage.getItem('dinusnexus.demo-key'))).toBeNull();
});

test('rejected key shows an error and permits retry', async ({ page }) => {
  await page.route('**/api/history', (route) => route.fulfill({ status: 401, json: { detail: 'private' } }));
  await page.goto('/login');
  await page.getByRole('button', { name: 'API key demo', exact: true }).click();
  await page.locator('#demo-key').fill('wrong-demo-key');
  await page.getByRole('button', { name: 'Masuk ke workspace' }).click();
  await expect(page.locator('#login-error')).toContainText('API key tidak cocok');
  await expect(page.getByRole('button', { name: 'Masuk ke workspace' })).toBeEnabled();
  expect(await page.evaluate(() => sessionStorage.getItem('dinusnexus.demo-key'))).toBeNull();
});

test('mobile, keyboard focus, dark mode and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'DinusNexus — buka workspace' })).toBeFocused();
  await page.getByRole('button', { name: 'Aktifkan mode gelap' }).click();
  await expect(page.locator('[data-theme]')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#login-email')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/login-mobile-dark.png', fullPage: true });
});

test('PostgreSQL account contract: login, verified reload and server logout', async ({ page }) => {
  let active = false;
  const user = { user_id: 'account-test-1', email: 'staff@example.test', display_name: 'Campus Staff' };
  await page.route('**/api/auth/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/login')) {
      expect(route.request().postDataJSON()).toEqual({ email: user.email, password: 'test-password-only' });
      active = true;
      return route.fulfill({ json: { user, access_token: 'account-browser-test' } });
    }
    expect(route.request().headers().authorization).toBe('Bearer account-browser-test');
    if (path.endsWith('/logout')) { active = false; return route.fulfill({ status: 204 }); }
    return route.fulfill({ status: active ? 200 : 401, json: active ? { user } : {} });
  });
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Tampilkan password' }).click();
  await expect(page.locator('#login-password')).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Masuk ke workspace' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('Campus Staff', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Keluar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Keluar', exact: true }).click();
  await expect(page).toHaveURL('/login');
  expect(active).toBe(false);
  expect(await page.evaluate(() => sessionStorage.getItem('dinusnexus.user-session'))).toBeNull();
});

test('account rejection is actionable without exposing backend detail', async ({ page }) => {
  await page.route('**/api/auth/login', (route) => route.fulfill({ status: 401, json: { detail: 'private' } }));
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('staff@example.test');
  await page.getByLabel('Password', { exact: true }).fill('incorrect');
  await page.getByRole('button', { name: 'Masuk ke workspace' }).click();
  await expect(page.locator('#login-error')).toContainText('Email atau password tidak cocok');
  await expect(page.getByRole('button', { name: 'Masuk ke workspace' })).toBeEnabled();
});

test('desktop light and dark layouts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/login');
  await expect(page.getByText('SYNTHETIC', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/login-desktop-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Aktifkan mode gelap' }).click();
  await page.screenshot({ path: 'test-results/login-desktop-dark.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
