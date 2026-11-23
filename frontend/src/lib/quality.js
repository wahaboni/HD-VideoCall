/**
 * Preset kualitas video. Default 720p hemat bandwidth, opsi 1080p untuk
 * koneksi dan kamera yang mendukung.
 */
export const QUALITY_PRESETS = Object.freeze({
  '360p': Object.freeze({
    key: '360p',
    label: 'Low 360p',
    width: 640,
    height: 360,
    frameRate: 24,
    maxBitrate: 700_000,
  }),
  '720p': Object.freeze({
    key: '720p',
    label: 'HD 720p',
    width: 1280,
    height: 720,
    frameRate: 30,
    maxBitrate: 2_500_000,
  }),
  '1080p': Object.freeze({
    key: '1080p',
    label: 'Full HD 1080p',
    width: 1920,
    height: 1080,
    frameRate: 30,
    maxBitrate: 4_500_000,
  }),
});

export const DEFAULT_QUALITY = '720p';
export const AUTO_QUALITY = 'auto';
export const QUALITY_KEYS = Object.freeze([AUTO_QUALITY, '720p', '1080p']);
export const QUALITY_STORAGE_KEY = 'hdvc.quality';
/**
 * @param {unknown} value
 * @returns {'720p'|'1080p'}
 */
export function normalizeQuality(value) {
  return value === AUTO_QUALITY || Object.hasOwn(QUALITY_PRESETS, value) ? value : DEFAULT_QUALITY;
}

const QUALITY_ORDER = Object.freeze(['360p', '720p', '1080p']);

/**
 * Pilih tier berikutnya berdasarkan statistik jaringan.
 * packetLoss berupa rasio 0..1, RTT dalam milidetik.
 * @param {{packetLoss?: number, rtt?: number, current?: string}} stats
 */
export function qualityForNetwork({ packetLoss, rtt, current } = {}) {
  if (current === undefined) return DEFAULT_QUALITY;
  const currentKey = QUALITY_ORDER.includes(current) ? current : DEFAULT_QUALITY;
  const index = QUALITY_ORDER.indexOf(currentKey);
  if (!Number.isFinite(packetLoss) || !Number.isFinite(rtt)) return currentKey;

  if (packetLoss >= 0.08 || rtt >= 400) return QUALITY_ORDER[Math.max(0, index - 1)];
  if (packetLoss <= 0.02 && rtt <= 150) return QUALITY_ORDER[Math.min(QUALITY_ORDER.length - 1, index + 1)];
  return currentKey;
}

/**
 * Simulcast layer: kamera mengirim beberapa resolusi sekaligus supaya
 * peserta dengan bandwidth kecil tetap dapat stream ringan.
 * @param {{width: number, height: number, frameRate: number, maxBitrate: number}} preset
 */
function simulcastLayers(preset) {
  return [
    { width: 320, height: 180, frameRate: 15, maxBitrate: 150_000 },
    { width: 640, height: 360, frameRate: 20, maxBitrate: 500_000 },
    {
      width: preset.width,
      height: preset.height,
      frameRate: preset.frameRate,
      maxBitrate: preset.maxBitrate,
    },
  ];
}

/**
 * @param {unknown} quality
 */
export function videoCaptureDefaults(quality) {
  const key = normalizeQuality(quality);
  const preset = QUALITY_PRESETS[key === AUTO_QUALITY ? DEFAULT_QUALITY : key];
  return {
    resolution: {
      width: preset.width,
      height: preset.height,
      frameRate: preset.frameRate,
    },
  };
}

/**
 * Opsi untuk <LiveKitRoom>. simulcast + dynacast + adaptiveStream aktif.
 * @param {unknown} quality
 */
export function roomOptions(quality) {
  const normalized = normalizeQuality(quality);
  const key = normalized === AUTO_QUALITY ? DEFAULT_QUALITY : normalized;
  const preset = QUALITY_PRESETS[key];

  return {
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: videoCaptureDefaults(key),
    screenShareCaptureDefaults: {
      resolution: { width: 1920, height: 1080, frameRate: 30 },
      contentHint: 'detail',
    },
    publishDefaults: {
      simulcast: true,
      videoSimulcastLayers: simulcastLayers(preset),
      videoCodec: 'vp9',
      dtx: true,
      red: true,
      stopMicTrackOnMute: false,
    },
  };
}

/**
 * Ambil preset lengkap; selalu mengembalikan objek valid.
 * @param {unknown} quality
 */
export function qualityPreset(quality) {
  const key = normalizeQuality(quality);
  return QUALITY_PRESETS[key === AUTO_QUALITY ? DEFAULT_QUALITY : key];
}
