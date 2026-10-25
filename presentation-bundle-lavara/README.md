# Bundle × Lavara — Cinematic Presentation

Standalone project. It is **separate from the hotel in-room store project** in the rest of this repository and shares no code, rules, or agents with it.

## Planned structure
```
presentation-bundle-lavara/
├── presentation.html      # the show only (no editing UI)
├── control.html           # full control panel
├── remote.html            # mobile remote (served by the launcher)
├── content.json           # single source of truth: content + settings
├── server/                # tiny local launcher (HTTP + WebSocket + QR)
├── assets/
│   ├── fonts/thmanyah/    # Thmanyah Sans / Serif Text / Serif Display (woff2)
│   ├── logos/             # header logos (ours + partner)
│   ├── bundle/            # Bundle media + brand marks
│   ├── lavara/            # Lavara media + brand marks
│   └── vendor/            # GSAP (local, no CDN)
├── brand-source/          # original brand PDFs (reference only)
└── docs/                  # phase reports
```

## Phases
1. Brand extraction summary → **waiting for approval** (`docs/01-brand-extraction.md`)
2. Canvas, 3 zoom levels, motion system
3. 10 templates
4. Both brand identities applied
5. Control panel + live sync + remote
6. Content + final 4K test
