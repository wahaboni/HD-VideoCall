# Camera Switch Fix dan Tailwind UI Redesign

## Intent

Ganti kualitas video tanpa membuat kamera delay, lalu rapikan UI/UX seluruh
flow lobby dan room dengan tema dark glass/neon yang konsisten dan responsive.

## Root cause

`frontend/src/App.jsx` memberi `Room` key berdasarkan kualitas:

```jsx
key={`${route.room}:${route.quality}`}
```

Saat kualitas berubah, React unmount seluruh `Room` dan `LiveKitRoom`. Kamera
dan koneksi media ikut restart. Fix: key hanya memakai identitas room yang
stabil, atau hapus key jika tidak dibutuhkan. Perubahan kualitas diteruskan
melalui props/state tanpa reconnect room.

## Goals

- Ganti `720p`, `1080p`, atau `AUTO` tanpa disconnect/reconnect LiveKit.
- Kamera tetap aktif tanpa delay panjang saat mode berubah.
- Lobby punya hierarki jelas: identitas aplikasi, input nama/room, kualitas,
  dan tombol join.
- Room punya header ringkas, status koneksi, Bagikan, quality selector, dan
  Keluar yang mudah ditemukan.
- Participant grid tetap full-screen dan responsive.
- Control bar, chat, kamera, mikrofon, screen share tetap berfungsi.
- Tema dark glass/neon memakai utility Tailwind dan CSS token yang konsisten.
- Kontras, focus ring, keyboard navigation, dan label accessible tetap ada.

## Non-goals

- Tidak mengubah API token, LiveKit server, TURN, atau deployment.
- Tidak mengubah algoritme AUTO quality selain memastikan perubahan manual tidak
  reconnect room.
- Tidak menambah dependency UI.
- Tidak membuat fitur active speaker atau recording.

## Approaches

1. **Fix lifecycle + redesign layered components — dipilih.** Stabilkan Room
   identity, lalu style existing Lobby/Room/QualityToggle/Grid/controls.
   Trade-off: beberapa file UI berubah, tetapi media lifecycle tetap sederhana.
2. Remount hanya kamera track melalui LiveKit API. Lebih terisolasi, tetapi
   tetap perlu sinkronisasi capture state dan lebih mudah menimbulkan race.
3. Pertahankan remount room dan tambahkan reconnect loading. Ditolak karena
   delay kamera tetap ada dan pengalaman pengguna buruk.

## Rancangan teknis

- `frontend/src/App.jsx`: ubah key Room menjadi stabil berdasarkan room saja,
  sehingga quality prop berubah tanpa remount LiveKitRoom.
- `frontend/src/pages/Room.jsx`: pertahankan `LiveKitRoom`; rapikan header,
  status kualitas aktif, popup Bagikan, participant grid, dan controls.
- `frontend/src/pages/Lobby.jsx`: susun ulang panel dengan dark glass, field
  states, quality card, helper text, dan join CTA.
- `frontend/src/components/QualityToggle.jsx`: segmented control dark glass
  dengan AUTO sebagai opsi utama, focus state, dan label ringkas.
- `frontend/src/index.css`: token warna, background ambient, panel glass,
  room chrome, grid, controls, dan mobile breakpoints. Tailwind utilities
  tetap dipakai untuk layout komponen.
- Tests: tambah regression test untuk stable Room key logic/helper bila logic
  diekstrak; pertahankan seluruh quality, route, frontend, dan backend tests.

## Perilaku kualitas

- Manual quality change mengubah capture settings tanpa mengubah `session` dan
  tanpa reconnect `LiveKitRoom`.
- AUTO controller tetap mengubah track kamera saat tier berubah.
- Header menampilkan `AUTO · 720p` atau label manual aktif.

## Selesai jika

Test regression lifecycle lulus, frontend build lulus, seluruh existing tests
lulus, kualitas dapat diganti saat room aktif tanpa remount room, dan lobby/room
tampil konsisten pada desktop serta mobile.
