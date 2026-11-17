/* Default untuk `vite dev` dan `vite preview`.
 * Saat production, file ini DIGANTI oleh nginx (50-runtime-config.sh) dari
 * env VITE_API_URL di .env root — tidak perlu rebuild image.
 *
 * Kosong = same-origin /api (Vite dev mem-proxy /api ke localhost:3001). */
window.__HDVC_CONFIG__ = {
  apiUrl: '',
};