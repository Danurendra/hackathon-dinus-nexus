import { API_BASE_URL } from './api';
import { clearDemoKey, saveDemoKey } from './demoSession';
import { clearUserToken, readUserToken, saveUserToken } from './userSession';

export interface AccountUser { user_id: string; email: string; display_name: string; }

export async function loginAccount(email: string, password: string): Promise<void> {
  if (!email.trim() || !password) throw new Error('Isi email dan password Anda.');
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
  } catch { throw new Error('Backend belum dapat dijangkau. Periksa koneksi lalu coba lagi.'); }
  if (response.status === 401) throw new Error('Email atau password tidak cocok. Setelah 5 percobaan gagal, tunggu 15 menit.');
  if (response.status === 422) throw new Error('Format email atau password tidak valid.');
  if (!response.ok) throw new Error('Layanan login belum tersedia. Periksa PostgreSQL dan migrasi backend.');
  let token: string;
  try {
    const data = await response.json();
    if (typeof data.access_token !== 'string' || !data.access_token || !data.user?.user_id) throw new Error();
    token = data.access_token;
  } catch { throw new Error('Respons login tidak valid. Periksa URL API backend.'); }
  try { saveUserToken(token); clearDemoKey(); } catch {
    // Revoke an issued token if the browser cannot retain it.
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }).catch(() => undefined);
    throw new Error('Penyimpanan sesi diblokir browser. Izinkan session storage lalu coba lagi.');
  }
}

export async function loadAccount(signal?: AbortSignal): Promise<AccountUser | null> {
  const token = readUserToken();
  if (!token) return null;
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal });
  if (response.status === 401) { clearUserToken(); return null; }
  if (!response.ok) throw new Error('Sesi belum dapat diverifikasi.');
  const data = await response.json();
  if (!data.user?.user_id || typeof data.user.display_name !== 'string') throw new Error('Respons akun tidak valid.');
  return data.user;
}

export async function logoutAccount(): Promise<void> {
  const token = readUserToken();
  if (token) {
    let response: Response;
    try { response = await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }); }
    catch { throw new Error('Backend tidak dapat dijangkau. Sesi belum dicabut; coba keluar lagi.'); }
    if (!response.ok && response.status !== 401) throw new Error('Sesi belum dapat dicabut. Coba keluar lagi.');
    clearUserToken();
  }
  clearDemoKey();
}

export async function loginDemo(rawKey: string): Promise<void> {
  const key = rawKey.trim();
  if (!key) throw new Error('Masukkan API key demo terlebih dahulu.');
  if (key.length > 512 || /[\r\n]/.test(key)) throw new Error('Format API key tidak valid.');
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/history`, {
      headers: { 'X-API-Key': key }, cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('Backend belum dapat dijangkau. Periksa koneksi lalu coba lagi.');
  }
  if (response.status === 401 || response.status === 403) throw new Error('API key tidak cocok. Periksa key demo Anda.');
  if (!response.ok) throw new Error('Layanan belum siap. Pastikan backend dan database aktif, lalu coba lagi.');
  try {
    const data = await response.json();
    if (!Array.isArray(data?.items)) throw new Error();
  } catch {
    throw new Error('Respons backend tidak valid. Periksa konfigurasi URL API.');
  }
  // Revoke an account session before switching to the optional demo credential.
  if (readUserToken()) await logoutAccount();
  try { saveDemoKey(key); } catch {
    throw new Error('Penyimpanan sesi diblokir browser. Izinkan session storage lalu coba lagi.');
  }
}
