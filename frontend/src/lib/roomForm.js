import { isValidUsername, sanitizeUsernameInput } from './room.js';

/**
 * Rapikan nama untuk disimpan/dipakai: trim, kolapse spasi.
 * Mengembalikan string kosong bila invalid.
 * @param {unknown} value
 * @returns {string}
 */
export function cleanDisplayName(value) {
  if (typeof value !== 'string') return '';
  const clean = sanitizeUsernameInput(value).trim().replace(/\s+/g, ' ');
  return isValidUsername(clean) ? clean : '';
}

/**
 * Cek apakah perlu pindah nama (berbeda dan valid).
 * @param {{current: string, next: string}} names
 * @returns {boolean}
 */
export function shouldChangeName({ current = '', next = '' } = {}) {
  const cleanNext = cleanDisplayName(next);
  return cleanNext.length > 0 && cleanNext !== current;
}
