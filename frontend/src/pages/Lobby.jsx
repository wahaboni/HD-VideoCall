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

const NAME_STORAGE_KEY = 'hdvc.username';

function readStored(key, fallback) {
  try {
    return globalThis.localStorage?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    /* localStorage diblokir: abaikan */
  }
}

/**
 * @param {{onJoin: (payload: {room: string, name: string, quality: string, token: string, wsUrl: string}) => void}} props
 */
export default function Lobby({ onJoin }) {
  const nameId = useId();
  const roomId = useId();

  const [name, setName] = useState(() => sanitizeUsernameInput(readStored(NAME_STORAGE_KEY, '')));
  const [room, setRoom] = useState(() => generateRoomCode());
  const [quality, setQuality] = useState(() => normalizeQuality(readStored(QUALITY_STORAGE_KEY, DEFAULT_QUALITY)));
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
    <main className="relative flex min-h-full items-center justify-center px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <section className="relative w-full max-w-xl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/15 ring-1 ring-brand-500/40">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-brand-300" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="2.5" y="6" width="13" height="12" rx="3" />
              <path d="M15.5 11l5-3v8l-5-3z" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            HD Video Call
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Masukkan nama dan kode room untuk memulai panggilan video berkualitas HD.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl shadow-black/40 backdrop-blur"
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
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            {name.length > 0 && !nameOk && (
              <p className="text-xs text-amber-400">Nama harus 1–40 karakter.</p>
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 font-mono text-sm tracking-wide text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <button
                type="button"
                onClick={handleRegenerate}
                title="Buat kode room baru"
                className="shrink-0 rounded-xl border border-slate-700 bg-slate-800/80 px-3 text-slate-300 transition hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
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
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-200">Kualitas video</span>
            <QualityToggle value={quality} onChange={handleQuality} disabled={loading} />
            <p className="text-xs text-slate-500">
              Simulcast, dynacast, dan adaptiveStream aktif otomatis untuk menghemat bandwidth.
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
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