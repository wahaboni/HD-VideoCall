export const ROOM_CODE_LENGTH = 8;
export const MAX_ROOM_CODE_LENGTH = 48;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Kode room acak yang mudah dibacakan (huruf kecil + angka).
 * @returns {string}
 */
export function generateRoomCode() {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  let code = '';
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }
  return code;
}

/**
 * Rapikan input user menjadi slug room yang valid:
 * lowercase, spasi/karakter aneh → tanda hubung, maksimal 48 karakter.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeRoomCode(value) {
  if (typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_ROOM_CODE_LENGTH)
    .replace(/-+$/g, '');
}

const ROOM_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidRoomCode(value) {
  return typeof value === 'string' && ROOM_CODE_PATTERN.test(value);
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidUsername(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 40;
}

/**
 * Sanitasi nama saat diketik: buang karakter kontrol dan "<>".
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeUsernameInput(value) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f<>]/g, '') : '';
}