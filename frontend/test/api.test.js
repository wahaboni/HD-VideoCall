import test from 'node:test';
import assert from 'node:assert/strict';
import { apiUrlFrom, parseTokenResponse } from '../src/lib/apiCore.js';

test('apiUrlFrom menggabungkan base dan path', () => {
  assert.equal(apiUrlFrom('', '/api/token'), '/api/token');
  assert.equal(apiUrlFrom('http://localhost:3001', '/api/token'), 'http://localhost:3001/api/token');
  assert.equal(apiUrlFrom('https://video.example.com/', '/api/token'), 'https://video.example.com/api/token');
});

test('parseTokenResponse menerima respons valid', () => {
  const result = parseTokenResponse(200, { token: 'abc', wsUrl: 'ws://localhost:7880' });
  assert.deepEqual(result, { token: 'abc', wsUrl: 'ws://localhost:7880' });
});

test('parseTokenResponse melempar pesan error dari server', () => {
  assert.throws(
    () => parseTokenResponse(400, { error: 'Kode room tidak valid.' }),
    /Kode room tidak valid/,
  );
});

test('parseTokenResponse menangani body kosong / tidak lengkap', () => {
  assert.throws(() => parseTokenResponse(502, null), /HTTP 502/);
  assert.throws(() => parseTokenResponse(200, { token: 'abc' }), /tidak lengkap/);
});