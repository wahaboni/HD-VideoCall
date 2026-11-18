# Design: Tema macOS Light Frosted Glass (Glassmorphism)

Tanggal: 2026-11-19
Status: Disetujui

## Intent

Restyle tampilan frontend HD-VC agar terlihat seperti macOS light mode dengan efek frosted glass (glassmorphism): panel semi-transparan, backdrop blur, gradasi wallpaper cerah. Alasan: permintaan user, tampilan lebih modern.

## Goals

- Lobby, Room, kontrol LiveKit, QualityToggle memakai bahasa visual macOS: panel kaca putih transparan, blur kuat, border halus, shadow lembut, rounded besar.
- Background gradasi cerah (biru-pink-ungu lembut) seperti wallpaper macOS.
- Font stack `-apple-system` first (SF Pro di Mac).

## Non-goals

- Tidak mengubah logika apa pun (routing, token, quality, LiveKit config).
- Tidak membuat dark mode / auto theme (ditolak user).
- Area video dalam meeting tetap gelap demi kontras video; hanya panel kontrol yang frosted.

## Approaches

1. **Light frosted, semua bagian** — dipilih. Konsisten penuh, cocok permintaan.
2. Dark glass — ditolak user.
3. Auto prefers-color-scheme dua tema — ditolak (kerja dua kali).

## Desain

- `index.css`: background body gradasi cerah; CSS variable LiveKit (`--lk-*`) diubah ke nuansa terang; override `.lk-control`/`.lk-chat` jadi kaca putih transparan + blur.
- `Lobby.jsx`: form panel `bg-white/60 backdrop-blur-2xl border-white/40`, input putih transparan, text slate-800/900, blob background cerah.
- `Room.jsx`: header bar kaca (seperti macOS menu bar), popover Bagikan kaca, tombol Keluar merah transparan.
- `QualityToggle.jsx`: segmented control gaya macOS (kapsul putih transparan, item aktif putih solid + shadow).
- `App.jsx`: spinner fallback disesuaikan warna terang.

## Dibebaskan ke builder

- Nilai eksak warna gradasi dan radius, sepanjang konsisten dengan look macOS light.
