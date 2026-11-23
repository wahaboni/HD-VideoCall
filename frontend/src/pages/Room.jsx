import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LiveKitRoom,
  ParticipantTile,
  ControlBar,
  Chat,
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import QualityToggle from '../components/QualityToggle.jsx';
import { qualityForNetwork, roomOptions, qualityPreset, videoCaptureDefaults } from '../lib/quality.js';
import { getToken } from '../lib/api.js';
import { roomLink } from '../lib/hashRoute.js';
import { stopMediaTracks } from '../lib/media.js';

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

function ParticipantGrid() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="hdvc-conference">
      <div className="lk-grid-layout hdvc-participant-grid">
        {tracks.map((trackRef) => (
          <ParticipantTile
            key={`${trackRef.participant.identity}:${trackRef.source}`}
            trackRef={trackRef}
          />
        ))}
      </div>
      {chatOpen && <Chat className="hdvc-chat-panel" />}
      <div className="hdvc-control-bar">
        <ControlBar
          controls={{ microphone: true, camera: true, chat: false, screenShare: true, leave: false }}
        />
        <button
          type="button"
          aria-label={chatOpen ? 'Tutup chat' : 'Buka chat'}
          aria-pressed={chatOpen}
          onClick={() => setChatOpen((open) => !open)}
          className="lk-button hdvc-chat-toggle"
        >
          Chat
        </button>
      </div>
    </div>
  );
}

function RoomMediaCleanup() {
  const roomContext = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => () => {
    const tracks = [...(localParticipant?.videoTrackPublications?.values?.() ?? [])]
      .concat([...((localParticipant?.audioTrackPublications?.values?.() ?? []))])
      .map((publication) => publication.track?.mediaStreamTrack)
      .filter(Boolean);
    stopMediaTracks(tracks);
    try {
      roomContext.disconnect(true);
    } catch {
      // Room mungkin sudah disconnected oleh server.
    }
  }, [localParticipant, roomContext]);

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
    <div className="hdvc-room relative flex h-full flex-col bg-slate-950">
      <header className="z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 bg-slate-950/85 px-4 py-3 shadow-xl shadow-slate-950/20 backdrop-blur-2xl sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_12px] shadow-emerald-400/80" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              Room <span className="font-mono text-cyan-300">{room}</span>
            </p>
            <p className="truncate text-xs text-slate-500">
              <span className="text-slate-400">{name}</span> · {quality === 'auto' ? <span className="text-cyan-300">AUTO · {qualityPreset(activeQuality).label}</span> : preset.label}
            </p>
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowInfo((open) => !open)}
              aria-expanded={showInfo}
              className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 shadow-sm hover:bg-cyan-400/20"
            >
              Bagikan
            </button>
            {showInfo && (
              <div className="absolute right-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl shadow-slate-950/60 backdrop-blur-2xl">
                <p className="mb-2 text-xs text-slate-400">Link room (tanpa nama):</p>
                <input
                  readOnly
                  value={roomLink({ room, quality })}
                  onFocus={(event) => event.currentTarget.select()}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-[11px] text-cyan-100"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(roomLink({ room, quality }))}
                  className="mt-2 w-full rounded-xl bg-cyan-400 px-2 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
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
            className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
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
            stopLocalTrackOnUnpublish: true,
          }}
          onDisconnected={handleDisconnect}
          onError={(err) => setError(err?.message || 'Koneksi ke server media terputus.')}
          data-lk-theme="default"
          className="h-full"
        >
          <RoomMediaCleanup />
          {quality === 'auto' && <AutoQualityController onQuality={setActiveQuality} />}
          <ParticipantGrid />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}
