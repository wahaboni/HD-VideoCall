/**
 * Bagian murni dari klien API (tanpa import.meta.env / fetch) supaya bisa
 * diuji dengan node:test.
 */

/**
 * @param {string} base
 * @param {string} path
 * @returns {string}
 */
export function apiUrlFrom(base, path) {
  const trimmed = String(base ?? '').replace(/\/+$/, '');
  return `${trimmed}${path}`;
}

/**
 * Validasi isi respons token server.
 * @param {number} status
 * @param {any} body
 * @returns {{token: string, wsUrl: string}}
 */
export function parseTokenResponse(status, body) {
  if (status < 200 || status >= 300) {
    throw new Error(body?.error || `Token server menolak permintaan (HTTP ${status}).`);
  }
  if (!body?.token || !body?.wsUrl) {
    throw new Error('Token server mengembalikan respons yang tidak lengkap.');
  }
  return { token: body.token, wsUrl: body.wsUrl };
}