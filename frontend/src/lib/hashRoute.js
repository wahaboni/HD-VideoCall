import { normalizeQuality } from './quality.js';

/**
 * Routing hash sederhana tanpa dependensi router.
 * Format: #/room/<kode>?name=<nama>&q=<kualitas>
 */

/**
 * @typedef {{view: 'lobby'} | {view: 'room', room: string, name: string, quality: '720p'|'1080p'}} Route
 */

/**
 * @param {string} hash
 * @returns {Route}
 */
export function parseHash(hash) {
  const raw = String(hash ?? '').replace(/^#/, '').replace(/^\//, '');
  if (!raw) return { view: 'lobby' };

  const [pathPart, queryPart = ''] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  if (segments[0] !== 'room' || segments.length < 2) return { view: 'lobby' };

  const room = decodeURIComponent(segments[1] ?? '').trim();
  if (!room) return { view: 'lobby' };

  const params = new URLSearchParams(queryPart);
  return {
    view: 'room',
    room,
    name: (params.get('name') ?? '').trim(),
    quality: normalizeQuality(params.get('q')),
  };
}

/**
 * @param {{room: string, name?: string, quality?: string}} route
 * @returns {string}
 */
export function buildHash({ room, name = '', quality = '720p' }) {
  const params = new URLSearchParams();
  if (name) params.set('name', name);
  params.set('q', normalizeQuality(quality));
  return `#/room/${encodeURIComponent(room)}?${params.toString()}`;
}

/**
 * URL room yang bisa dibagikan.
 * @param {{room: string, quality?: string}} route
 */
export function roomLink({ room, quality = '720p' }) {
  const { origin, pathname } = globalThis.location;
  return `${origin}${pathname}${buildHash({ room, quality })}`;
}