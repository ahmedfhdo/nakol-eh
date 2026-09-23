# Icon sources

`icon.svg` (rounded, for normal icons and the favicon) and `icon-maskable.svg`
(full-bleed, content inside the 80% safe zone for Android adaptive icons).

The PNGs in `public/icons/` are rendered from these at:
- `pwa-192.png`, `pwa-512.png` ← icon.svg (transparent corners)
- `maskable-512.png` ← icon-maskable.svg
- `apple-touch-icon.png` (180×180) ← icon-maskable.svg (iOS rounds the corners itself)

`public/favicon.svg` is a copy of `icon.svg`. If you change the design, re-export
the PNGs with any SVG renderer (Inkscape, a browser screenshot, `npx @vite-pwa/assets-generator`).
