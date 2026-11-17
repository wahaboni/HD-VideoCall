import { apiUrlFrom, parseTokenResponse } from './apiCore.js';

/**
 * Prioritas konfigurasi API:
 *   1. window.__HDVC_CONFIG__.apiUrl  -> di-inject nginx saat container start
 *      (ubah .env lalu `docker compose up -d`, tanpa rebuild).
 *   2. import.meta.env.VITE_API_URL   -> di-bake saat build (dev / CI).
 *   3. ''                             -> same-origin /api.
 */
function readRuntimeApiUrl() {
  const value = globalThis.__HDVC_CONFIG__?.apiUrl;
  return typeof value === 'string' ? value : '';
}

export const API_BASE = readRuntimeApiUrl() || String(import.meta.env?.VITE_API_URL ?? '');

/**
 * Ambil token akses room dari token server.
 * @param {{room: string, username: string, signal?: AbortSignal}} params
 * @returns {Promise<{token: string, wsUrl: string}>}
 */
export async function getToken({ room, username, signal }) {
  const query = new URLSearchParams({ room, username });
  const url = apiUrlFrom(API_BASE, `/api/token?${query.toString()}`);

  let res;
  try {
    res = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
      // Token selalu per-user: jangan pernah di-cache browser/proxy.
      cache: 'no-store',
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error(
      'Tidak bisa menghubungi token server. Periksa koneksi dan URL API (VITE_API_URL).',
      { cause: error },
    );
  }

  const body = await res.json().catch(() => null);
  return parseTokenResponse(res.status, body);
}