import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAccount, loginAccount, loginDemo, logoutAccount } from './login';
import { apiHeaders } from './api';
import { clearDemoKey } from './demoSession';
import { readUserToken } from './userSession';

const fetchMock = vi.fn();
const storage = new Map<string, string>();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('window', { sessionStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  } });
});
afterEach(() => { storage.clear(); fetchMock.mockReset(); vi.unstubAllGlobals(); });

describe('demo login', () => {
  it('rejects empty and malformed keys before requesting', async () => {
    await expect(loginDemo('   ')).rejects.toThrow('Masukkan');
    await expect(loginDemo('abc\ndef')).rejects.toThrow('Format');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('verifies a trimmed key read-only and uses it in subsequent requests', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [] })));
    await loginDemo('  demo-test  ');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/history$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store', headers: { 'X-API-Key': 'demo-test' } });
    expect(new Headers(apiHeaders()).get('X-API-Key')).toBe('demo-test');
    clearDemoKey();
    expect(storage.size).toBe(0);
  });
  it.each([401, 403, 503])('does not store rejected credentials (HTTP %s)', async (status) => {
    fetchMock.mockResolvedValue(new Response('private detail', { status }));
    await expect(loginDemo('test')).rejects.not.toThrow('private');
    expect(storage.size).toBe(0);
  });
  it('handles network failure safely', async () => {
    fetchMock.mockRejectedValue(new Error('private detail'));
    await expect(loginDemo('test')).rejects.toThrow('dijangkau');
    expect(storage.size).toBe(0);
  });
  it('rejects an unexpected API response', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: 'ok' })));
    await expect(loginDemo('test')).rejects.toThrow('Respons backend');
    expect(storage.size).toBe(0);
  });
  it('reports blocked storage without claiming success', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [] })));
    vi.stubGlobal('window', { sessionStorage: { setItem: () => { throw new Error(); } } });
    await expect(loginDemo('test')).rejects.toThrow('diblokir');
  });
  it('preserves explicit caller headers', () => {
    const headers = new Headers(apiHeaders(new Headers({ 'X-API-Key': 'override', Accept: 'application/json' })));
    expect(headers.get('X-API-Key')).toBe('override');
    expect(headers.get('Accept')).toBe('application/json');
  });
});

describe('account login', () => {
  const user = { user_id: 'staff-1', email: 'staff@example.test', display_name: 'Staff' };
  it('stores a server-issued session token, never the password', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ user, access_token: 'opaque-test-token' })));
    await loginAccount(' staff@example.test ', 'test-password');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/auth\/login$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: user.email, password: 'test-password' });
    expect(readUserToken()).toBe('opaque-test-token');
    expect(Array.from(storage.values())).not.toContain('test-password');
    expect(new Headers(apiHeaders()).get('Authorization')).toBe('Bearer opaque-test-token');
    expect(new Headers(apiHeaders()).has('X-API-Key')).toBe(false);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ user })));
    expect(await loadAccount()).toEqual(user);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await logoutAccount();
    expect(fetchMock.mock.calls[2][0]).toMatch(/\/api\/auth\/logout$/);
    expect(readUserToken()).toBeNull();
  });
  it.each([401, 422, 503])('does not store credentials after failed login %s', async (status) => {
    fetchMock.mockResolvedValue(new Response('private backend detail', { status }));
    await expect(loginAccount('staff@example.test', 'password')).rejects.not.toThrow('private');
    expect(storage.size).toBe(0);
  });
  it('clears expired sessions after server verification', async () => {
    storage.set('dinusnexus.user-session', 'expired');
    fetchMock.mockResolvedValue(new Response('{}', { status: 401 }));
    expect(await loadAccount()).toBeNull();
    expect(readUserToken()).toBeNull();
  });
  it('retains session and reports failure when logout cannot revoke it', async () => {
    storage.set('dinusnexus.user-session', 'active');
    fetchMock.mockRejectedValue(new Error('network'));
    await expect(logoutAccount()).rejects.toThrow('Sesi belum dicabut');
    expect(readUserToken()).toBe('active');
  });
});
