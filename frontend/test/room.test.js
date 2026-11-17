import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRoomCode, normalizeRoomCode, isValidRoomCode } from '../src/lib/room.js';

test('generateRoomCode menghasilkan kode 8 karakter alfanumerik lowercase', () => {
  for (let i = 0; i < 50; i += 1) {
    const code = generateRoomCode();
    assert.match(code, /^[a-z0-9]{8}$/);
  }
});

test('generateRoomCode tidak berulang', () => {
  const codes = new Set(Array.from({ length: 200 }, () => generateRoomCode()));
  assert.equal(codes.size, 200);
});

test('normalizeRoomCode merapikan input user', () => {
  assert.equal(normalizeRoomCode('  My Room!  '), 'my-room');
  assert.equal(normalizeRoomCode('Kelas---A'), 'kelas-a');
  assert.equal(normalizeRoomCode('--abc--'), 'abc');
  assert.equal(normalizeRoomCode('a'.repeat(80)).length, 48);
  assert.equal(normalizeRoomCode(''), '');
  assert.equal(normalizeRoomCode(null), '');
});

test('isValidRoomCode menolak kode kosong / aneh', () => {
  assert.equal(isValidRoomCode('abc-123'), true);
  assert.equal(isValidRoomCode(''), false);
  assert.equal(isValidRoomCode('-abc'), false);
  assert.equal(isValidRoomCode('a'.repeat(49)), false);
  assert.equal(isValidRoomCode('a b'), false);
});
