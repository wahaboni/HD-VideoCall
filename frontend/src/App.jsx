import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import Lobby from './pages/Lobby.jsx';
import { parseHash, buildHash } from './lib/hashRoute.js';

// LiveKit components berat (~250 kB gzip). Lobby tetap ringan;
// bundle room baru diunduh saat user benar-benar bergabung.
const Room = lazy(() => import('./pages/Room.jsx'));

function RoomFallback() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-500" aria-hidden="true" />
      <p className="text-sm text-slate-500">Memuat ruang meeting…</p>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(() => parseHash(globalThis.location.hash));
  const [session, setSession] = useState(null);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(globalThis.location.hash));
    globalThis.addEventListener('hashchange', onHashChange);
    return () => globalThis.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next) => {
    const hash = next.view === 'room' ? buildHash(next) : '#/';
    if (globalThis.location.hash !== hash) {
      globalThis.location.hash = hash;
    } else {
      setRoute(parseHash(hash));
    }
  }, []);

  const handlers = useMemo(
    () => ({
      onJoin({ room, name, quality, token, wsUrl }) {
        setSession({ token, wsUrl });
        navigate({ view: 'room', room, name, quality });
      },
      onLeave() {
        setSession(null);
        setRoute({ view: 'lobby' });
        if (globalThis.location.hash !== '#/') {
          globalThis.history.replaceState(null, '', `${globalThis.location.pathname}`);
        }
      },
      onQualityChange(quality) {
        if (route.view !== 'room') return;
        navigate({ ...route, quality });
      },
    }),
    [navigate, route],
  );

  if (route.view === 'room') {
    return (
      <Suspense fallback={<RoomFallback />}>
        <Room
          key={`${route.room}:${route.quality}`}
          room={route.room}
          name={route.name}
          quality={route.quality}
          session={session}
          onLeave={handlers.onLeave}
          onQualityChange={handlers.onQualityChange}
        />
      </Suspense>
    );
  }

  return <Lobby initialQuality={route.quality} onJoin={handlers.onJoin} />;
}