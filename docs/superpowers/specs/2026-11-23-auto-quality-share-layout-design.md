# AUTO Quality dan Layout Bagikan

## Intent

Tambah mode `AUTO` yang menyesuaikan kualitas video terhadap kondisi jaringan.
Pindahkan/tegaskan tombol `Bagikan` di sisi kanan atas header room agar mudah
ditemukan.

## Goals

- AUTO mulai pada 720p.
- Turun ke 360p saat packet loss/RTT menunjukkan jaringan buruk.
- Naik ke 1080p setelah koneksi stabil.
- Hindari perubahan kualitas berulang dengan hysteresis dan cooldown.
- Mode manual 720p/1080p tetap bekerja.
- URL room dan penyimpanan kualitas mendukung `auto`.
- Tombol Bagikan berada di header kanan, sebelum kontrol kualitas dan Keluar.

## Non-goals

- Tidak menjamin 1080p jika kamera atau bandwidth tidak mampu.
- Tidak mengubah konfigurasi TURN, server LiveKit, atau deployment VPS.
- Tidak memutus koneksi room saat kualitas berubah.

## Pendekatan

1. `navigator.connection` saja: ringan, tetapi tidak cukup akurat untuk kondisi
   WebRTC yang berubah.
2. Delegasi penuh ke `adaptiveStream`/dynacast: minim kode, tetapi tidak
   mengatur capture quality secara eksplisit.
3. **Statistik WebRTC + adaptiveStream/dynacast**: dipilih karena memantau
   kondisi aktual, mendukung jaringan buruk dan bagus, serta tetap memakai
   optimasi LiveKit yang sudah ada.

## Rancangan

- `frontend/src/lib/quality.js`: tambah preset `360p`, key `auto`, resolver
  tier AUTO, batas packet loss/RTT, cooldown, dan opsi capture.
- `frontend/src/components/QualityToggle.jsx`: tambah tombol `AUTO`.
- `frontend/src/pages/Room.jsx`: pantau statistik LiveKit/WebRTC secara berkala;
  ubah kualitas capture saat tier berubah tanpa reconnect room; tampilkan status
  kualitas aktif.
- `frontend/src/lib/hashRoute.js` dan state lobby: pertahankan `auto` saat
  link dibagikan dan refresh.
- `frontend/test/quality.test.js` serta route tests: uji preset, resolver,
  hysteresis, dan round-trip `auto`.
- Tombol `Bagikan` tetap memakai popup link yang ada, tetapi urutan header
  menjadi identitas room, `Bagikan`, quality control, lalu `Keluar`.

## Selesai jika

Test frontend/backend lulus, build frontend lulus, AUTO tersedia di lobby dan
room, link AUTO dapat dibuka ulang, serta tombol Bagikan tampil di kanan atas.
