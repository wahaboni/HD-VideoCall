import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenVerifier } from 'livekit-server-sdk';
import { validateRoomName, validateUsername, resolveWsUrl, uniqueIdentity } from '../src/token.js';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const config = {
  apiKey: 'devkey',
  apiSecret: 'secret',
  wsUrl: 'ws://localhost:7880',
  port: 3001,
  corsOrigins: ['http://localhost:5173'],
  tokenTtl: '6h',
};

test('validateRoomName menerima kode room normal', () => {
  assert.equal(validateRoomName('abc-123'), true);
  assert.equal(validateRoomName('a'), true);
  assert.equal(validateRoomName('a'.repeat(48)), true);
});

test('validateRoomName menolak input tidak valid', () => {
  for (const bad of ['', 'a b', 'a'.repeat(49), '<script>', 'ABC', '-abc', 'room_name', null, undefined, 42]) {
    assert.equal(validateRoomName(bad), false, `harus menolak ${JSON.stringify(bad)}`);
  }
});

test('validateUsername menolak input tidak valid', () => {
  assert.equal(validateUsername('Budi'), true);
  assert.equal(validateUsername('Budi Santoso'), true);
  for (const bad of ['', 'a'.repeat(41), 'a<b>', 'line\nbreak', null, undefined, '   ']) {
    assert.equal(validateUsername(bad), false, `harus menolak ${JSON.stringify(bad)}`);
  }
});

test('resolveWsUrl menghasilkan skema websocket yang valid', () => {
  assert.equal(resolveWsUrl('ws://localhost:7880'), 'ws://localhost:7880');
  assert.equal(resolveWsUrl('http://localhost:7880'), 'ws://localhost:7880');
  assert.equal(resolveWsUrl('https://video.example.com'), 'wss://video.example.com');
  assert.equal(resolveWsUrl('video.example.com'), 'wss://video.example.com');
  assert.equal(resolveWsUrl('wss://video.example.com/rtc'), 'wss://video.example.com/rtc');
  assert.equal(resolveWsUrl(''), null);
  assert.equal(resolveWsUrl('ftp://x'), null);
});

test('uniqueIdentity membedakan user bernama sama', () => {
  const a = uniqueIdentity('Budi');
  const b = uniqueIdentity('Budi');
  assert.notEqual(a, b);
  assert.ok(a.startsWith('Budi'));
});

test('loadConfig memakai default mode dev', () => {
  const cfg = loadConfig({});
  assert.equal(cfg.apiKey, 'devkey');
  assert.equal(cfg.apiSecret, 'secret');
  assert.equal(cfg.wsUrl, 'ws://localhost:7880');
  assert.equal(cfg.port, 3001);
  assert.deepEqual(cfg.corsOrigins, ['http://localhost:5173']);
});

async function withServer(fn) {
  const app = createApp(config);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('GET /api/token mengembalikan token yang valid', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/token?room=abc-123&username=Budi`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('access-control-allow-origin') ?? '', /localhost:5173/);
    const body = await res.json();
    assert.equal(body.wsUrl, 'ws://localhost:7880');
    assert.equal(typeof body.token, 'string');

    const verifier = new TokenVerifier(config.apiKey, config.apiSecret);
    const claims = await verifier.verify(body.token);
    assert.equal(claims.video.room, 'abc-123');
    assert.ok(claims.sub);
    assert.equal(claims.video.roomJoin, true);
    assert.equal(claims.video.canPublish, true);
    assert.equal(claims.video.canSubscribe, true);
  });
});

test('GET /api/token menolak input tidak valid dengan 400', async () => {
  await withServer(async (base) => {
    for (const qs of [
      'room=abc&username=',
      'room=&username=Budi',
      'room=a%20b&username=Budi',
      'room=abc&username=' + 'x'.repeat(41),
      'username=Budi',
    ]) {
      const res = await fetch(`${base}/api/token?${qs}`);
      assert.equal(res.status, 400, `harus 400 untuk ${qs}`);
      const body = await res.json();
      assert.equal(typeof body.error, 'string');
    }
  });
});

test('GET /healthz mengembalikan ok', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/healthz`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });
});

test('preflight CORS dijawab dengan header yang benar', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/token?room=abc&username=Budi`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' },
    });
    assert.equal(res.status, 204);
    assert.match(res.headers.get('access-control-allow-origin') ?? '', /localhost:5173/);
    assert.match(res.headers.get('access-control-allow-methods') ?? '', /GET/i);
  });
});
