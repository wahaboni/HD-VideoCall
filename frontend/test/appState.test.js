import test from 'node:test';
import assert from 'node:assert/strict';
import { roomRenderKey } from '../src/lib/appState.js';

test('room render key tetap sama saat kualitas berubah', () => {
  assert.equal(roomRenderKey({ room: 'abc-123', name: 'Budi', quality: '720p' }), 'abc-123:Budi');
  assert.equal(roomRenderKey({ room: 'abc-123', name: 'Budi', quality: '1080p' }), 'abc-123:Budi');
  assert.equal(roomRenderKey({ room: 'abc-123', name: 'Budi', quality: 'auto' }), 'abc-123:Budi');
});

test('room render key berubah saat nama berubah (identitas LiveKit baru)', () => {
  assert.equal(roomRenderKey({ room: 'abc-123', name: 'Budi' }), 'abc-123:Budi');
  assert.equal(roomRenderKey({ room: 'abc-123', name: 'Sinta' }), 'abc-123:Sinta');
});

test('room render key berubah saat room berubah', () => {
  assert.notEqual(roomRenderKey({ room: 'abc', name: 'Budi' }), roomRenderKey({ room: 'xyz', name: 'Budi' }));
});
