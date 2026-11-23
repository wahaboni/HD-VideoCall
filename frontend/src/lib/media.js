/**
 * Stop semua MediaStreamTrack lokal yang masih aktif.
 * @param {Iterable<{stop?: () => void}>} tracks
 */
export function stopMediaTracks(tracks) {
  for (const track of tracks ?? []) {
    track?.stop?.();
  }
}
