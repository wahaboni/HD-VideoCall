import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useLocalParticipant,
} from '@livekit/components-react';
import QualityToggle from '../components/QualityToggle.jsx';
import { qualityForNetwork, roomOptions, qualityPreset, videoCaptureDefaults } from '../lib/quality.js';
import { getToken } from '../lib/api.js';
import { roomLink } from '../lib/hashRoute.js';

/**
 * @param {{token: string|undefined, wsUrl: string|undefined}} data
 */
function Connecting({ message }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-400" aria-hidden="true" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function AutoQualityController({ onQuality }) {
  const { localParticipant } = useLocalParticipant();
  const activeRef = useRef('720p');
  const statsRef = useRef(null);
  const changedAtRef = useRef(0);

  useEffect(() => {
    const timer = globalThis.setInterval(async () => {
      if (!localParticipant) return;
      try {
        const report = await localParticipant?._room?.engine?.pcManager?.publisher?.getStats?.();
        if (!report) return;
        let packetsLost = 0;
        let packetsSent = 0;
        let rtt = 0;
        report.forEach((stat) => {
          if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
            packetsLost += stat.packetsLost || 0;
            packetsSent += stat.packetsSent || 0;
          }
          if (stat.type === 'candidate-pair' && stat.currentRoundTripTime) {
            rtt = Math.max(rtt, stat.currentRoundTripTime * 1000);
          }
        });
        const previous = statsRef.current;
        statsRef.current = { packetsLost, packetsSent };
        if (!previous) return;
        const sentDelta = packetsSent - previous.packetsSent;
        const lostDelta = packetsLost - previous.packetsLost;
        const packetLoss = sentDelta > 0 ? Math.max(0, lostDelta / (sentDelta + lostDelta)) : undefined;
        const next = qualityForNetwork({ packetLoss, rtt, current: activeRef.current });
        if (next === activeRef.current || Date.now() - changedAtRef.current < 15_000) return;
        const publication = [...localParticipant.videoTrackPublications.values()]
          .find((item) => item.source === 'camera' && item.track);
        await publication?.track?.restartTrack(videoCaptureDefaults(next));
        activeRef.current = next;
        changedAtRef.current = Date.now();
        onQuality(next);
      } catch {
        // Statistik tidak tersedia pada browser/transport tertentu.
      }
    }, 5_000);
    return () => globalThis.clearInterval(timer);
  }, [localParticipant, onQuality]);

  return null;
}

/**
 * @param {{
 *   room: string,
 *   name: string,
 *   quality: string,
 *   session: {token: string, wsUrl: string} | null,
 *   onLeave: () => void,
 *   onQualityChange: (quality: string) => void
 * }} props
 */
export default function Room({ room, name, quality, session, onLeave, onQualityChange }) {
  const [credentials, setCredentials] = useState(session);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(!session);
  const [showInfo, setShowInfo] = useState(false);
  const abortRef = useRef(null);
  const preset = qualityPreset(quality === 'auto' ? '720p' : quality);
  const [activeQuality, setActiveQuality] = useState(quality === 'auto' ? '720p' : quality);

  // Refresh / buka link langsung: hash tidak membawa token, ambil dari server.
  useEffect(() => {
    if (session || !name) {
      setConnecting(false);
      return undefined;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setConnecting(true);
    setError('');

    getToken({ room, username: name, signal: controller.signal })
      .then((result) => setCredentials(result))
      .catch((err) => {
        if (err?.name !== 'AbortError') setError(err?.message || 'Gagal memuat token.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setConnecting(false);
      });

    return () => controller.abort();
  }, [name, room, session]);

  const handleDisconnect = useCallback(() => {
    abortRef.current?.abort();
    onLeave();
  }, [onLeave]);

  const options = roomOptions(quality);

  useEffect(() => {
    setActiveQuality(quality === 'auto' ? '720p' : quality);
  }, [quality]);

  if (!name) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-center">
        <h1 className="text-lg font-semibold text-white">Nama belum diisi</h1>
        <p className="max-w-sm text-sm text-slate-400">
          Link room ini tidak menyertakan nama. Masukkan nama di lobby untuk bergabung.
        </p>
        <button
          type="button"
          onClick={onLeave}
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
        >
          Ke lobby
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-center">
        <h1 className="text-lg font-semibold text-white">Gagal bergabung ke room</h1>
        <p className="max-w-md text-sm text-red-300">{error}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCredentials(null);
              setError('');
            }}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
          >
            Coba lagi
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10"
          >
            Ke lobby
          </button>
        </div>
      </div>
    );
  }

  if (connecting || !credentials) {
    return <Connecting message="Menyiapkan koneksi video…" />;
  }

  return (
    <div className="hdvc-room relative flex h-full flex-col bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-2xl">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/60" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              Room <span className="font-mono text-indigo-300">{room}</span>
            </p>
            <p className="truncate text-xs text-slate-500">
              {name} · {quality === 'auto' ? `AUTO · ${qualityPreset(activeQuality).label}` : `${preset.label} @${preset.frameRate}fps`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowInfo((open) => !open)}
              aria-expanded={showInfo}
              className="rounded-lg border border-indigo-300/50 bg-indigo-500/80 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300/70"
            >
              Bagikan
            </button>
            {showInfo && (
              <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-white/50 bg-white/80 p-3 shadow-xl backdrop-blur-2xl">
                <p className="mb-2 text-xs text-slate-600">Link room (tanpa nama):</p>
                <input
                  readOnly
                  value={roomLink({ room, quality })}
                  onFocus={(event) => event.currentTarget.select()}
                  className="w-full rounded-lg border border-slate-300 bg-white/70 px-2 py-1.5 font-mono text-[11px] text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(roomLink({ room, quality }))}
                  className="mt-2 w-full rounded-lg bg-indigo-500 px-2 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600"
                >
                  Salin link
                </button>
              </div>
            )}
          </div>
          <QualityToggle value={quality} onChange={onQualityChange} compact />
          <button
            type="button"
            onClick={handleDisconnect}
            className="rounded-lg border border-red-400/40 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/30"
          >
            Keluar
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <LiveKitRoom
          serverUrl={credentials.wsUrl}
          token={credentials.token}
          connect
          audio
          video={options.videoCaptureDefaults}
          options={{
            adaptiveStream: options.adaptiveStream,
            dynacast: options.dynacast,
            videoCaptureDefaults: options.videoCaptureDefaults,
            screenShareCaptureDefaults: options.screenShareCaptureDefaults,
            publishDefaults: options.publishDefaults,
          }}
          onDisconnected={handleDisconnect}
          onError={(err) => setError(err?.message || 'Koneksi ke server media terputus.')}
          data-lk-theme="default"
          className="h-full"
        >
          {quality === 'auto' && <AutoQualityController onQuality={setActiveQuality} />}
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}
