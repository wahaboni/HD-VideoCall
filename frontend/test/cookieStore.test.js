import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRoomHistory,
  mergeRoomHistory,
  readCookie,
  writeCookie,
  readRoomHistory,
  rememberRoom,
  HISTORY_COOKIE,
  NAME_COOKIE,
} from '../src/lib/cookieStore.js';

function withCookies(values, fn) {
  const original = globalThis.document;
  globalThis.document = { cookie: values };
  try {
    return fn();
  } finally {
    globalThis.document = original;
  }
}

test('parseRoomHistory mengembalikan array kosong untuk input invalid', () => {
  assert.deepEqual(parseRoomHistory(undefined), []);
  assert.deepEqual(parseRoomHistory(''), []);
  assert.deepEqual(parseRoomHistory('not-json'), []);
  assert.deepEqual(parseRoomHistory('{"a":1}'), []);
  assert.deepEqual(parseRoomHistory('[1, 2]'), []);
  assert.deepEqual(parseRoomHistory(null), []);
});

test('parseRoomHistory menerima JSON array string', () => {
  assert.deepEqual(parseRoomHistory('["abc12345","kelas-a"]'), ['abc12345', 'kelas-a']);
});

test('mergeRoomHistory menaruh kode terbaru di depan, dedup, maks 8', () => {
  const initial = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  assert.deepEqual(mergeRoomHistory(initial, 'a'), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  assert.deepEqual(mergeRoomHistory(initial, 'i'), ['i', 'a', 'b', 'c', 'd', 'e', 'f', 'g']);
  assert.deepEqual(mergeRoomHistory([], 'abc'), ['abc']);
  assert.deepEqual(mergeRoomHistory(['a'], ''), ['a']);
  assert.deepEqual(mergeRoomHistory(['a'], '  '), ['a']);
});

test('mergeRoomHistory memfilter item non-string', () => {
  assert.deepEqual(mergeRoomHistory(['a', 5, null, 'b'], 'c'), ['c', 'a', 'b']);
});

test('readCookie membaca nilai cookie berdasarkan nama', () => {
  withCookies('hdvc.username=Budi; other=1', () => {
    assert.equal(readCookie('hdvc.username'), 'Budi');
  });
  withCookies('other=1', () => {
    assert.equal(readCookie('hdvc.username'), null);
  });
  withCookies('', () => {
    assert.equal(readCookie('hdvc.username'), null);
  });
  withCookies('hdvc.username=Nama%20Panjang%20Dua', () => {
    assert.equal(readCookie('hdvc.username'), 'Nama Panjang Dua');
  });
});

test('readCookie aman saat document tidak ada', () => {
  const original = globalThis.document;
  globalThis.document = undefined;
  try {
    assert.equal(readCookie('hdvc.username'), null);
  } finally {
    globalThis.document = original;
  }
});

test('writeCookie mengirim string "name=value" ke document.cookie', () => {
  let captured = '';
  withCookies('', () => {
    captured = writeCookie('hdvc.username', 'Budi');
  });
  assert.match(captured, /^hdvc\.username=Budi;/);
  assert.match(captured, /max-age=31536000/);
  assert.match(captured, /path=\//);
  assert.match(captured, /samesite=lax/i);
});

test('writeCookie aman saat document tidak ada', () => {
  const original = globalThis.document;
  globalThis.document = undefined;
  try {
    assert.equal(writeCookie('hdvc.username', 'Budi'), null);
  } finally {
    globalThis.document = original;
  }
});

test('rememberRoom menulis history JSON hasil merge cookie lama', () => {
  let captured = '';
  withCookies(`${HISTORY_COOKIE}=${encodeURIComponent('["old","abc12345"]')}`, () => {
    globalThis.document = {
      get cookie() {
        return `${HISTORY_COOKIE}=${encodeURIComponent('["old","abc12345"]')}`;
      },
      set cookie(value) {
        captured = value;
      },
    };
    const result = rememberRoom('kelas-a');
    assert.deepEqual(result, ['kelas-a', 'old', 'abc12345']);
  });
  assert.match(captured, new RegExp(`^${HISTORY_COOKIE.replace('.', '\\.')}=`));
  const value = captured.split(';')[0].split('=').slice(1).join('=');
  assert.deepEqual(JSON.parse(decodeURIComponent(value)), ['kelas-a', 'old', 'abc12345']);
});

test('readRoomHistory membaca dari document.cookie', () => {
  withCookies(`${HISTORY_COOKIE}=${encodeURIComponent('["abc12345"]')}`, () => {
    assert.deepEqual(readRoomHistory(), ['abc12345']);
  });
  withCookies('', () => {
    assert.deepEqual(readRoomHistory(), []);
  });
});

test('konstanta cookie pakai prefix hdvc', () => {
  assert.equal(NAME_COOKIE, 'hdvc.username');
  assert.equal(HISTORY_COOKIE, 'hdvc.rooms');
});
