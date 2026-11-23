import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanDisplayName, shouldChangeName } from '../src/lib/roomForm.js';

test('cleanDisplayName merapikan spasi dan trim', () => {
  assert.equal(cleanDisplayName('  Budi   Santoso  '), 'Budi Santoso');
});

test('cleanDisplayName menolak nama kosong / terlalu panjang / non-string', () => {
  assert.equal(cleanDisplayName('   '), '');
  assert.equal(cleanDisplayName('x'.repeat(41)), '');
  assert.equal(cleanDisplayName(123), '');
  assert.equal(cleanDisplayName(null), '');
  assert.equal(cleanDisplayName(undefined), '');
});

test('cleanDisplayName membuang karakter kontrol dan <>', () => {
  assert.equal(cleanDisplayName('Bu\x00di<b>'), 'Budib');
});

test('shouldChangeName benar untuk kasus rename', () => {
  assert.equal(shouldChangeName({ current: 'Budi', next: 'Sinta' }), true);
  assert.equal(shouldChangeName({ current: 'Budi', next: '  Budi  ' }), false);
  assert.equal(shouldChangeName({ current: 'Budi', next: '   ' }), false);
  assert.equal(shouldChangeName({ current: '', next: 'Budi' }), true);
  assert.equal(shouldChangeName(), false);
});
