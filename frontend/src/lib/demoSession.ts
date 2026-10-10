// Demo access only, not a user identity or a server-side authorization boundary.
const STORAGE_KEY = 'dinusnexus.demo-key';

export function readDemoKey(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function saveDemoKey(key: string): void {
  window.sessionStorage.setItem(STORAGE_KEY, key);
}

export function clearDemoKey(): void {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be blocked. */ }
}
