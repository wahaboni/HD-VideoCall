# Auto-fit Participant Grid

## Intent

Tampilkan semua peserta aktif dalam layout grid yang otomatis menyesuaikan jumlah
peserta dan memenuhi area video room.

## Behavior

- 1 peserta: satu tile memenuhi area.
- 2 peserta: dua kolom.
- 3–4 peserta: grid dua kolom.
- 5–6 peserta: grid tiga kolom.
- 7+ peserta: grid responsif dengan kolom maksimum empat.
- Tile memakai `object-fit: cover`, tanpa distorsi.
- Grid tetap memenuhi tinggi dan lebar area video.
- Peserta baru masuk/keluar memicu layout baru otomatis.
- Kontrol LiveKit dan audio tetap tersedia.

## Approach

Gunakan `useTracks` dan `ParticipantTile` dari LiveKit Components, lalu render
semua track dalam `.lk-grid-layout` dan atur kolom melalui CSS `:has()` dan
container queries. `GridLayout` bawaan tidak dipakai karena mem-pagination tile
berdasarkan perkiraan kapasitas viewport, bertentangan dengan kebutuhan semua
peserta tetap terlihat.

Alternatif custom participant map ditolak karena harus mengelola track, metadata,
screen share, dan lifecycle sendiri.

## Changes

- `frontend/src/pages/Room.jsx`: ganti video area `VideoConference` dengan
  participant grid LiveKit; pertahankan ControlBar dan Chat.
- `frontend/src/index.css`: style grid full-screen, jumlah kolom responsif,
  tile tanpa distorsi, dan breakpoint mobile.
- `frontend/test/`: tambah unit/helper test jika logic kolom diekstrak; CSS
  diverifikasi lewat build dan manual browser check.

## Non-goals

- Tidak mengubah AUTO quality.
- Tidak mengubah audio, chat, screen share, atau kontrol room.
- Tidak membuat mode active-speaker.

## Selesai jika

Room 1, 2, 3, dan 4 peserta menampilkan semua tile dalam area penuh; peserta
masuk/keluar mengubah grid; frontend test dan build lulus.
