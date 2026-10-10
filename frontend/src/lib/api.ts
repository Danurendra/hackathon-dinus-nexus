/**
 * Shared backend API configuration for the frontend.
 *
 * Protected endpoints accept a PostgreSQL account bearer session, or an
 * ``X-API-Key`` demo credential (see ``src/auth.py``). Account sessions take
 * precedence. A verified demo key in sessionStorage takes
 * precedence over the key provided at build time through
 * ``NEXT_PUBLIC_DINUSNEXUS_API_KEY``; set it in ``frontend/.env.local``
 * (see ``.env.example``). Never hard-code a key here.
 *
 * Note: ``NEXT_PUBLIC_*`` values are embedded in the browser bundle. Use a
 * dedicated non-production key for local development.
 */

import { readDemoKey } from './demoSession';
import { readUserToken } from './userSession';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

const API_KEY = process.env.NEXT_PUBLIC_DINUSNEXUS_API_KEY;

/** Read the tab's demo credential, falling back to demo build configuration. */
export function getApiKey(): string | undefined {
  return readDemoKey() ?? API_KEY;
}

/** Build-time availability; use useDemoAccess for reactive client UI. */
export const hasApiKey = Boolean(API_KEY);

export function hasWorkspaceAccess(): boolean {
  return Boolean(readUserToken() || getApiKey());
}

/**
 * Build request headers, preferring the account bearer token over demo API keys.
 * Caller-provided values in ``extra`` take precedence.
 */
export function apiHeaders(extra: HeadersInit = {}): HeadersInit {
  const headers = new Headers(extra);
  const token = readUserToken();
  if (token) {
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }
  const key = getApiKey();
  if (key && !headers.has('X-API-Key')) headers.set('X-API-Key', key);
  return headers;
}

/**
 * ``fetch`` wrapper that always targets the backend and attaches auth headers.
 * Accepts an absolute URL as-is, otherwise prefixes ``API_BASE_URL``.
 */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  return fetch(url, {
    ...init,
    headers: apiHeaders(init.headers),
  });
}
