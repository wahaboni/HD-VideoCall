import { useCallback, useEffect, useId, useRef, useState } from 'react';
import QualityToggle from '../components/QualityToggle.jsx';
import {
  DEFAULT_QUALITY,
  QUALITY_STORAGE_KEY,
  normalizeQuality,
} from '../lib/quality.js';
import {
  generateRoomCode,
  isValidRoomCode,
  isValidUsername,
  normalizeRoomCode,
  sanitizeUsernameInput,
} from '../lib/room.js';
import { getToken } from '../lib/api.js';
import { NAME_COOKIE, readCookie, writeCookie, rememberRoom, readRoomHistory } from '../lib/cookieStore.js';

const QUALITY_COOKIE = 'hdvc.quality';

function readStored(key, fallback) {
  const value = readCookie(key);
  return value === null ? fallback : value;
}

function writeStored(key, value) {
  writeCookie(key, value);
}

/**
 * @param {{
 *   initialQuality?: string,
 *   initialRoom?: string,
 *   onJoin: (payload: {room: string, name: string, quality: string, token: string, wsUrl: string}) => void
 * }} props
 */
export default function Lobby({ initialQuality, initialRoom = '', onJoin }) {
  const nameId = useId();
  const roomId = useId();

  const [name, setName] = useState(() => sanitizeUsernameInput(readStored(NAME_STORAGE_KEY, '')));
  const [room, setRoom] = useState(() => (isValidRoomCode(initialRoom) ? initialRoom : generateRoomCode()));
  const [quality, setQuality] = useState(() => normalizeQuality(readStored(QUALITY_STORAGE_KEY, DEFAULT_QUALITY)));
  const [history, setHistory] = useState(() => readRoomHistory());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const nameOk = isValidUsername(name);
  const roomOk = isValidRoomCode(room);
  const canSubmit = nameOk && roomOk && !loading;

  const handleQuality = useCallback((next) => {
    setQuality(next);
    writeStored(QUALITY_STORAGE_KEY, next);
  }, []);

  const handlePickHistory = useCallback((code) => {
    setRoom(code);
    setError('');
  }, []);

  const handleRegenerate = useCallback(() => {
    setRoom(generateRoomCode());
    setError('');
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!canSubmit) return;

      const cleanName = name.trim().replace(/\s+/g, ' ');
      const cleanRoom = normalizeRoomCode(room);

      setLoading(true);
      setError('');
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { token, wsUrl } = await getToken({
          room: cleanRoom,
          username: cleanName,
          signal: controller.signal,
        });
        writeStored(NAME_STORAGE_KEY, cleanName);
        rememberRoom(cleanRoom);
        onJoin({ room: cleanRoom, name: cleanName, quality, token, wsUrl });
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setError(err?.message || 'Gagal bergabung. Coba lagi.');
      } finally {
        setLoading(false);
      }
    },
    [canSubmit, name, onJoin, quality, room],
  );

  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10 text-slate-100 sm:py-14">
      <div
        aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden opacity-80"
      >
        <div className="absolute -top-32 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-indigo-400/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-pink-300/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-sky-300/25 blur-3xl" />
      </div>

      <section className="relative w-full max-w-xl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/20 bg-cyan-400/10 shadow-2xl shadow-cyan-500/20">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-cyan-300" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="2.5" y="6" width="13" height="12" rx="3" />
              <path d="M15.5 11l5-3v8l-5-3z" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            HDVC <span className="text-cyan-300">Connect</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
            Panggilan video jernih, stabil, dan otomatis menyesuaikan jaringan.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="hdvc-glass space-y-5 rounded-3xl p-6 sm:p-8"
        >
          <div className="space-y-2">
            <label htmlFor={nameId} className="block text-sm font-medium text-slate-200">
              Nama kamu
            </label>
            <input
              id={nameId}
              name="username"
              type="text"
              autoComplete="name"
              maxLength={40}
              value={name}
              onChange={(event) => {
                setName(sanitizeUsernameInput(event.target.value));
                setError('');
              }}
              placeholder="Contoh: Budi"
              aria-invalid={name.length > 0 && !nameOk}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 aria-invalid:border-red-400"
            />
            {name.length > 0 && !nameOk && (
              <p className="text-xs text-red-600">Nama harus 1–40 karakter.</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor={roomId} className="block text-sm font-medium text-slate-200">
              Kode room
            </label>
            <div className="flex gap-2">
              <input
                id={roomId}
                name="room"
                type="text"
                inputMode="latin"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={48}
                value={room}
                onChange={(event) => {
                  setRoom(normalizeRoomCode(event.target.value));
                  setError('');
                }}
                placeholder="kode-room"
                aria-invalid={room.length > 0 && !roomOk}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 font-mono text-sm tracking-wide text-cyan-100 placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 aria-invalid:border-red-400"
              />
              <button
                type="button"
                onClick={handleRegenerate}
                title="Buat kode room baru"
                className="shrink-0 rounded-2xl border border-slate-700 bg-slate-900 px-3 text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-200"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M20 11a8 8 0 10-2.3 5.7" strokeLinecap="round" />
                  <path d="M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="sr-only">Generate kode room baru</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Bagikan kode ini ke orang lain. Huruf kecil, angka, dan tanda hubung.
            </p>
            {history.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500">Terbaru:</span>
                {history.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handlePickHistory(code)}
                    className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-0.5 font-mono text-[11px] tracking-wide text-cyan-200 transition hover:border-cyan-400/60 hover:bg-cyan-400/10"
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-200">Kualitas video</span>
            <QualityToggle value={quality} onChange={handleQuality} disabled={loading} />
            <p className="text-xs leading-5 text-slate-500">
              Simulcast, dynacast, dan adaptiveStream aktif otomatis untuk menghemat bandwidth.
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-400/40 bg-red-100/60 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:bg-cyan-300 focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                Menghubungkan…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 10l4.5-3v10L15 14" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="3" y="6" width="12" height="12" rx="2.5" />
                </svg>
                Gabung Video Call
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Tidak perlu instalasi. Kamera dan mikrofon hanya aktif setelah kamu bergabung.
        </p>
      </section>
    </main>
  );
}
