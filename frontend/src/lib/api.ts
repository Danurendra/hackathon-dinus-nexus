/**
 * Shared backend API configuration for the frontend.
 *
 * The backend protects the task and history endpoints with an ``X-API-Key``
 * header (see ``src/auth.py``). The key is provided at build time through
 * ``NEXT_PUBLIC_DINUSNEXUS_API_KEY``; set it in ``frontend/.env.local``
 * (see ``.env.example``). Never hard-code a key here.
 *
 * Note: ``NEXT_PUBLIC_*`` values are embedded in the browser bundle. Use a
 * dedicated non-production key for local development.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

const API_KEY = process.env.NEXT_PUBLIC_DINUSNEXUS_API_KEY;

/** True when an API key is configured (callers can show a setup hint). */
export const hasApiKey = Boolean(API_KEY);

/**
 * Build request headers, adding ``X-API-Key`` when configured.
 * Caller-provided values in ``extra`` take precedence.
 */
export function apiHeaders(extra: HeadersInit = {}): HeadersInit {
  return {
    ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
    ...extra,
  };
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