/**
 * Identity stabil untuk Room. Quality berubah sebagai prop, bukan lifecycle key.
 * @param {{room?: string}} route
 */
export function roomRenderKey({ room = '' } = {}) {
  return String(room);
}
