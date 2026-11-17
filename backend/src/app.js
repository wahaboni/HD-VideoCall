import express from 'express';
import cors from 'cors';
import {
  buildToken,
  normalizeUsername,
  resolveWsUrl,
  validateRoomName,
  validateUsername,
} from './token.js';

/**
 * Buat aplikasi Express token server.
 * @param {ReturnType<import('./config.js').loadConfig>} config
 * @returns {import('express').Express}
 */
export function createApp(config) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes('*')) return callback(null, true);
        callback(null, config.corsOrigins.includes(origin));
      },
      methods: ['GET', 'OPTIONS'],
      maxAge: 600,
    }),
  );

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/token', async (req, res) => {
    const { room, username } = req.query;

    if (!validateRoomName(room)) {
      return res.status(400).json({
        error: 'Kode room tidak valid (huruf kecil, angka, tanda hubung; 1-48 karakter).',
      });
    }

    if (!validateUsername(username)) {
      return res.status(400).json({
        error: 'Nama pengguna tidak valid (1-40 karakter, tanpa karakter kontrol).',
      });
    }

    try {
      const name = normalizeUsername(username);
      const token = await buildToken({ config, room, username: name });

      res.set('Cache-Control', 'no-store');
      return res.json({
        token,
        wsUrl: resolveWsUrl(config.wsUrl) ?? config.wsUrl,
        room,
        username: name,
      });
    } catch (error) {
      console.error('[token] gagal membuat token:', error);
      return res.status(500).json({ error: 'Gagal membuat token. Periksa konfigurasi server.' });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
  });

  return app;
}
