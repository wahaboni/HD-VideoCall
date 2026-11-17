import { resolveWsUrl } from './token.js';

const DEFAULTS = {
  apiKey: 'devkey',
  apiSecret: 'secret',
  wsUrl: 'ws://localhost:7880',
  port: 3001,
  corsOrigin: 'http://localhost:5173',
  tokenTtl: '6h',
};

/**
 * Baca konfigurasi dari environment (dengan default mode dev).
 * @param {NodeJS.ProcessEnv} env
 * @returns {{apiKey: string, apiSecret: string, wsUrl: string, port: number, corsOrigins: string[], tokenTtl: string}}
 */
export function loadConfig(env = process.env) {
  const corsOrigins = String(env.CORS_ORIGIN ?? DEFAULTS.corsOrigin)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const port = Number.parseInt(env.PORT ?? '', 10);

  return {
    apiKey: env.LIVEKIT_API_KEY || DEFAULTS.apiKey,
    apiSecret: env.LIVEKIT_API_SECRET || DEFAULTS.apiSecret,
    wsUrl: resolveWsUrl(env.LIVEKIT_WS_URL ?? DEFAULTS.wsUrl),
    port: Number.isFinite(port) && port > 0 && port < 65536 ? port : DEFAULTS.port,
    corsOrigins: corsOrigins.length > 0 ? corsOrigins : [DEFAULTS.corsOrigin],
    tokenTtl: env.TOKEN_TTL || DEFAULTS.tokenTtl,
  };
}

export const DEFAULT_CONFIG = DEFAULTS;
