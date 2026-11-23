import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, buildHash } from '../src/lib/hashRoute.js';

test('hash kosong berarti lobby', () => {
  assert.deepEqual(parseHash(''), { view: 'lobby' });
  assert.deepEqual(parseHash('#'), { view: 'lobby' });
  assert.deepEqual(parseHash('#/'), { view: 'lobby' });
  assert.deepEqual(parseHash('#/room/'), { view: 'lobby' });
});

test('hash room membawa nama dan kualitas', () => {
  const route = parseHash('#/room/abc-123?name=Bob&q=1080p');
  assert.equal(route.view, 'room');
  assert.equal(route.room, 'abc-123');
  assert.equal(route.name, 'Bob');
  assert.equal(route.quality, '1080p');
});

test('kualitas tak dikenal jatuh ke 720p', () => {
  assert.equal(parseHash('#/room/abc?q=4k').quality, '720p');
  assert.equal(parseHash('#/room/abc').quality, '720p');
});

test('buildHash lalu parseHash round-trip', () => {
  const hash = buildHash({ room: 'abc-123', name: 'Budi Santoso', quality: '1080p' });
  const route = parseHash(hash);
  assert.equal(route.room, 'abc-123');
  assert.equal(route.name, 'Budi Santoso');
  assert.equal(route.quality, '1080p');
});

test('buildHash lalu parseHash mendukung AUTO', () => {
  const route = parseHash(buildHash({ room: 'abc-123', quality: 'auto' }));
  assert.equal(route.quality, 'auto');
});

test('buildHash meng-encode karakter khusus', () => {
  const hash = buildHash({ room: 'abc', name: 'A & B', quality: '720p' });
  assert.ok(!hash.includes('A & B'));
  assert.equal(parseHash(hash).name, 'A & B');
});
