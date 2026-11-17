import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig(process.env);
const app = createApp(config);

const server = app.listen(config.port, () => {
  console.log(`[token-server] listening on http://localhost:${config.port}`);
  console.log(`[token-server] LiveKit wsUrl: ${config.wsUrl}`);
  console.log(`[token-server] CORS origins: ${config.corsOrigins.join(', ')}`);
});

function shutdown(signal) {
  console.log(`[token-server] ${signal} diterima, menutup server...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
