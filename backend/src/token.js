import { AccessToken } from 'livekit-server-sdk';
import { randomBytes } from 'node:crypto';

export const ROOM_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;
export const USERNAME_PATTERN = /^[^\u0000-\u001f\u007f<>]{1,40}$/;

/**
 * Kode room: huruf kecil, angka, tanda hubung. 1-48 karakter.
 * @param {unknown} value
 * @returns {boolean}
 */
export function validateRoomName(value) {
  return typeof value === 'string' && ROOM_PATTERN.test(value);
}

/**
 * Nama pengguna: 1-40 karakter, tanpa karakter kontrol atau "<>".
 * @param {unknown} value
 * @returns {boolean}
 */
export function validateUsername(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && USERNAME_PATTERN.test(trimmed);
}

/**
 * Normalisasi base URL LiveKit menjadi ws:// atau wss://.
 * Mengembalikan null bila input tidak bisa dipakai.
 * @param {string} raw
 * @returns {string | null}
 */
export function resolveWsUrl(raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;

  let url;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol === 'http:') url.protocol = 'ws:';
  else if (url.protocol === 'https:') url.protocol = 'wss:';
  else if (url.protocol !== 'ws:' && url.protocol !== 'wss:') return null;

  return url.toString().replace(/\/$/, '');
}

/**
 * Rapikan nama pengguna: trim dan kolaps spasi.
 * @param {string} username
 * @returns {string}
 */
export function normalizeUsername(username) {
  return String(username).trim().replace(/\s+/g, ' ');
}

/**
 * Identity unik supaya dua orang bernama sama tidak saling tendang.
 * @param {string} username
 * @returns {string}
 */
export function uniqueIdentity(username) {
  const suffix = randomBytes(3).toString('hex');
  const base = normalizeUsername(username).slice(0, 40).replace(/\s+/g, '_');
  return `${base}-${suffix}`;
}

/**
 * Buat JWT akses room untuk satu peserta.
 * @param {{config: object, room: string, username: string, identity?: string}} params
 * @returns {Promise<string>}
 */
export async function buildToken({ config, room, username, identity }) {
  const at = new AccessToken(config.apiKey, config.apiSecret, {
    identity: identity ?? uniqueIdentity(username),
    name: username.trim(),
    ttl: config.tokenTtl,
  });

  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return at.toJwt();
}
