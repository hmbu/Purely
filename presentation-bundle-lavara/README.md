# Bundle × Lavara — Cinematic Presentation

A standalone project, separate from the hotel in-room store project in the rest of this repository.

## Running the show (offline, one folder)
1. Install **Node.js LTS** once (https://nodejs.org).
2. Start the launcher:
   - macOS: double-click `start.command`
   - Windows: double-click `start.bat`
   - Terminal: `node server/server.js` (add `--port 8090` to change the port, or `--open-chrome` to open Chrome)
3. The launcher prints three links and a QR code:
   - **Presentation**: `http://localhost:8080/presentation.html` (full-screen with `F`)
   - **Control panel**: `http://localhost:8080/control.html`
   - **Remote**: `http://<local-ip>:8080/remote` (scan the QR from the presenter's phone on the same Wi-Fi)

`start.command` and `start.bat` open Chrome with a dedicated profile and `--autoplay-policy=no-user-gesture-required`, so transition sounds and videos work without a click on the show screen.

### Why a launcher (and not `file://`)
Chrome blocks `fetch()` of `content.json` and ES modules over `file://`. The launcher is a small Node server with no dependencies (`server/server.js`) that:
- serves every file, with HTTP Range support so 4K videos can seek without stuttering;
- reads and writes `content.json` through `/api/content`, keeping automatic backups in `data/backups/` (at most one per minute, up to 200 files);
- relays live sync between the show, the control panel and the remote over WebSocket;
- logs decisions to `data/decisions-log.json`;
- accepts media and font uploads from the control panel into `assets/`.

If no second device can connect, the remote also works on the same machine (`BroadcastChannel` fallback).

## Files
```
presentation.html   the show only (no editing UI)
control.html        full control panel
remote.html         mobile remote
content.json        single source of truth: all content + settings
server/             launcher (server.js + qrcode.js, MIT)
js/core/            shared modules: model, sync, store, fonts, templates, texture (WebGL), sound (Web Audio)
css/                show.css, control.css, remote.css
assets/fonts/thmanyah/   Thmanyah Sans / Serif Text / Serif Display (woff2, 5 weights each)
assets/bundle/  assets/lavara/   logos (vector SVG extracted from the brand PDFs) + sample media
assets/vendor/      GSAP 3.12.5 (local, no CDN)
brand-source/       original brand PDFs (reference)
docs/               phase reports
```

## In-show keyboard
| Key | Action |
|---|---|
| `←` / `Space` / `PageDown` / `Enter` | Next |
| `→` / `PageUp` | Previous |
| `Shift` + arrow | Next / previous section |
| `Esc` | Zoom out one level (closes a focused concept first) |
| `1`–`9` | Jump to section (or to project on the Universe screen) |
| `F` | Full screen |
| `B` | Black screen |
| `M` | Mute |

Presentation clickers (PageUp / PageDown) work out of the box.

## Single-file version (phone / tablet / quick share)
`dist/presentation-standalone.html` is one self-contained file (about 5 MB). Content, fonts, logos and images are embedded, so it opens directly on any device with no launcher. Rotate the phone to landscape. Controls: swipe right or tap the left third to go next; swipe left or tap the right third to go back; swipe down to zoom out.
Videos are not embedded. Editing, live sync and the remote need the full version.
Rebuild it after editing content: `python3 tools/build_single.py` (requires Python + Pillow and `npx esbuild`).
