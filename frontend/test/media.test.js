import test from 'node:test';
import assert from 'node:assert/strict';
import { stopMediaTracks } from '../src/lib/media.js';

test('stopMediaTracks menghentikan semua track lokal', () => {
  const calls = [];
  stopMediaTracks([
    { stop: () => calls.push('camera') },
    { stop: () => calls.push('microphone') },
  ]);
  assert.deepEqual(calls, ['camera', 'microphone']);
});

test('stopMediaTracks aman untuk track kosong', () => {
  assert.doesNotThrow(() => stopMediaTracks([undefined, null]));
});
