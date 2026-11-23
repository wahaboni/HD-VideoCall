import test from 'node:test';
import assert from 'node:assert/strict';
import { roomRenderKey } from '../src/lib/appState.js';

test('room render key tetap sama saat kualitas berubah', () => {
  assert.equal(roomRenderKey({ room: 'abc-123', quality: '720p' }), 'abc-123');
  assert.equal(roomRenderKey({ room: 'abc-123', quality: '1080p' }), 'abc-123');
  assert.equal(roomRenderKey({ room: 'abc-123', quality: 'auto' }), 'abc-123');
});
