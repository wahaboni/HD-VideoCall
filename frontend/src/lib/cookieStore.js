/**
 * Persistensi browser berbasis cookie (bukan localStorage).
 * Semua preferensi user — nama, kualitas, riwayat room — disimpan di sini.
 */

export const NAME_COOKIE = 'hdvc.username';
export const HISTORY_COOKIE = 'hdvc.rooms';
export const MAX_ROOM_HISTORY = 8;
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/**
 * Baca satu cookie berdasarkan nama.
 * @param {string} name
 * @returns {string|null}
 */
export function readCookie(name) {
  try {
    const raw = globalThis.document?.cookie;
    if (typeof raw !== 'string' || raw === '') return null;
    for (const part of raw.split(';')) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      const key = part.slice(0, eq).trim();
      if (key === name) {
        return decodeURIComponent(part.slice(eq + 1).trim());
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Tulis satu cookie (1 tahun, path root, same-site lax).
 * @param {string} name
 * @param {string} value
 * @returns {string|null} string cookie yang di-set, atau null bila gagal
 */
export function writeCookie(name, value) {
  try {
    const cookie = `${name}=${encodeURIComponent(value)}; max-age=${ONE_YEAR_SECONDS}; path=/; samesite=lax`;
    globalThis.document.cookie = cookie;
    return cookie;
  } catch {
    return null;
  }
}

/**
 * Parse riwayat room dari JSON string. Aman untuk input aneh.
 * @param {unknown} raw
 * @returns {string[]}
 */
export function parseRoomHistory(raw) {
  if (typeof raw !== 'string' || raw === '') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === 'string');
  } catch {
    return [];
  }
}

/**
 * Gabungkan kode room baru dengan riwayat lama: terbaru di depan,
 * dedup, maksimal MAX_ROOM_HISTORY item. Kode kosong diabaikan.
 * @param {string[]} history
 * @param {string} code
 * @returns {string[]}
 */
export function mergeRoomHistory(history, code) {
  const existing = Array.isArray(history) ? history.filter((item) => typeof item === 'string') : [];
  const clean = typeof code === 'string' ? code.trim() : '';
  if (!clean) return [...existing];
  return [clean, ...existing.filter((item) => item !== clean)].slice(0, MAX_ROOM_HISTORY);
}

/**
 * Baca riwayat room dari cookie.
 * @returns {string[]}
 */
export function readRoomHistory() {
  return parseRoomHistory(readCookie(HISTORY_COOKIE));
}

/**
 * Simpan kode room ke riwayat cookie, lalu kembalikan history baru.
 * @param {string} code
 * @returns {string[]}
 */
export function rememberRoom(code) {
  const next = mergeRoomHistory(readRoomHistory(), code);
  writeCookie(HISTORY_COOKIE, JSON.stringify(next));
  return next;
}
