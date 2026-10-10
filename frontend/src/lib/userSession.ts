const STORAGE_KEY = 'dinusnexus.user-session';

export function readUserToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function saveUserToken(token: string): void {
  window.sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearUserToken(): void {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be blocked. */ }
}
