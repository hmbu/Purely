# Phase 1 — Brand Extraction Summary (Bundle × Lavara)

Status: **waiting for approval** — no presentation code is written until this is confirmed.

Sources (copied into `brand-source/`):
- `bundle-brand.pdf` — "MUSED X Bundle — Color Palette, Typography Presentation" (17 pages)
- `lavara-brand.pdf` — "MUSED x Lavara — Logo, Logo Alternatives & Isotype" (21 pages)
- Thmanyah font family → `assets/fonts/thmanyah/` (woff2, 3 families × 5 weights)

---

## 1. Bundle

**Positioning (p.2):** corporate gifting for HR / office managers / founders. Values: *Thoughtful · Effortless · Trusted*. Tagline: "Corporate gifting, human feeling."

**Logo (p.3–4):** serif wordmark "Bundle" whose "B" is also the standalone isotype (a ribbon/bow-like B with a subtle Arabic-script curve). Variations: main logo, logo + descriptor line, isotype "B". The isotype is used as a bow on gift boxes and inside orange circles.

**Two palette/type directions exist in the file** (needs your choice — see Open questions):

| | Direction 1 (p.5–10) | Direction 2 (p.11–15) |
|---|---|---|
| Primary | Green `#245845` | Deep green `#31554B` |
| Accents | Pink `#F2A9C2`, Brick `#9F3517`, Lime `#AEE67F`, Peach `#ECC39F`, Sky `#CCE2F2`, Cream `#F1EBE1` | Sky `#B7D8F9`, Blue `#4B81E7`, Orange `#D6673A`, Lime-yellow `#DFE392`, Lilac `#EDC6F7`, Stone `#F0EEEA` |
| Neutrals | `#F9FAFC`, Ink `#0A1215` | `#F9FAFC`, Ink `#0A1215` |
| Type (Latin) | Fustat (header/body), Amiri (subheader) | Source Serif 4 (header), Google Sans (subheader/body) |

**Graphic language (both directions):**
- Full circles, half circles, pills/capsules and rounded tiles; stacked circles in a column (p.14).
- Soft multi-color gradients inside shapes (blue→sky, pink→orange, lime→green) + **film grain** texture.
- Rounded cards, gift-box tiles with ribbons, pill labels ("Design", "Order", "Celebrate").
- Process as a horizontal timeline of gradient circles: Plan → Design → Order → Receive → Celebrate.
- Light warm-cream backgrounds, green used "in place of black".

**Imagery:** bright natural-light office lifestyle; colorful product still-lifes on pastel backgrounds.

**Motion personality (derived):** lively, rounded, friendly — circles that merge/split (gooey metaballs) with grain-textured gradients; springy but controlled (expo/back-out with low overshoot).

---

## 2. Lavara — Proposal 2 ONLY ("Alternative 2", p.9–14)

**Positioning (p.2):** first Saudi perfume house made exclusively for luxury hotels. Values: *Luxury · Experimental · Made for 5-stars*. Lines: "A stay to remember, a scent made for you." · "Fragrance & care" · "Botanical Origins / Floral Essences / Rare Blooms / Natural Alchemy / Sensory Rituals / The Art of Perfumery / An Ode to Nature". Endorsement: "by Al Majed Oud".

**Logo (Alt 2):** classic high-contrast serif caps "LAVARA" — hairline + thick strokes, soft floral terminals. Described as *"feminine, calm and luxurious"*.
- Variations (p.11): main wordmark · wordmark + serif caps descriptor · **isotype: ornamental "A" monogram with curled flourishes inside a thin rectangular frame** (like a monogram on hotel towels).
- Endorsed versions (p.12): "LAVARA / BY AL MAJED OUD" and "LAVARA × Al majed oud".

**Palette (Alt 2 — not given as hex in the file; sampled from the Alt 2 pages, to be confirmed):**

| Role | Hex (sampled) | Where |
|---|---|---|
| Deep umber (primary dark) | `#3C2E25` | p.10 logo background, p.14 |
| Ivory (logo on dark) | `#F2EEDC` approx. | p.10 wordmark |
| Paper cream (light bg) | `#F8F1E6` | p.13 embossed paper |
| Terracotta | `#AF6545` | p.14 business card |
| Burnt orange (deep) | `#8C2D01` | p.13 soap |
| Ochre / gold | `#795110` – `#926A23` | p.13 background, gold box |
| Sage | `#8F9878` approx. | p.13 box |
| Olive | `#60684F` | p.14 soap |

**Graphic language:** blind embossing / debossing on textured cotton paper, hairline rectangular frames, generous empty space, vertical wordmark placements, tactile materials (paper, soap, glass, brushed metal).

**Imagery:** warm, low-key hotel interiors, amber light, wood, spa details, products shot on muted earth-tone backdrops.

**Motion personality (derived):** slow, airy, weightless — mist/breeze drifting, soft foam dissolves, hairline rules that draw themselves, emboss-like light reveals. Long eases (sine/expo inOut), no overshoot.

---

## 3. Typography — Thmanyah (received)

| Family | Weights | Suggested default use |
|---|---|---|
| Thmanyah Sans | Light, Regular, Medium, Bold, Black | Body in both brands; Bundle titles |
| Thmanyah Serif Display | Light → Black | Lavara titles (echoes the high-contrast serif logo) |
| Thmanyah Serif Text | Light → Black | Lavara body / statements |

Rule: `letter-spacing: 0` on all Arabic text, always. Latin eyebrows may use tracking.

---

## 4. Logos — extraction plan
Both PDFs contain the logos as **vector paths** (no raster). They will be extracted to clean SVGs in `assets/logos/` and `assets/bundle|lavara/`:
- Bundle: wordmark, isotype "B"
- Lavara (Alt 2): wordmark, framed "A" monogram, "by Al Majed Oud" lockup
- MUSED wordmark (appears on both covers)

## 5. Open questions (blocking Phase 2)
1. **Bundle direction:** Direction 1 or Direction 2?
2. **`transition-demo.html`** is mentioned as attached but was not received.
3. **Header logos:** which is "our company" and which is "partner"? (MUSED appears on both covers.) Please send SVG files, or approve using the MUSED wordmark extracted from the PDFs.
4. **Lavara Alt 2 palette:** approve the sampled colors above (the file has no official hex values for Alt 2).
5. **Default fonts per brand:** approve the suggestion in §3.
