/**
 * Identity stabil untuk Room. Quality berubah sebagai prop, bukan lifecycle key.
 * Nama masuk key: ganti nama = ganti identitas LiveKit = reconnect.
 * @param {{room?: string, name?: string}} route
 */
export function roomRenderKey({ room = '', name = '' } = {}) {
  return `${room}:${name}`;
}
