# Build notes (phases 2–5, plus phase 6 sample content)

## Decisions applied (from the user, 2026-10-25)
- Header logos: no company or partner logo for now. The two **project** logos (Bundle and Lavara wordmarks) are used. A company or partner logo can be added later in the control panel under Global settings › Header logos.
- Fonts: one title font and one body font, shared by both projects. Defaults: **Thmanyah Serif Display 500** for titles and **Thmanyah Sans 400** for body text. Both can be changed in the panel.
- Bundle: **Direction 1** (green `#245845`, pink, brick, lime, peach, sky, cream, ink).
- Lavara: proposal 2 (Alternative 2). The palette was sampled from that proposal's pages: umber `#3C2E25`, ivory `#F3F2E0`, paper `#F8F2E8`, terracotta `#AD6243`, rust `#8F2E02`, ochre `#926A28`, sage `#959163`, olive `#5B634A`.
- `transition-demo.html`: ignored.

## Logos
Extracted from the PDFs as vector paths and saved as `currentColor` SVGs:
- `assets/bundle/bundle-wordmark.svg`, `assets/bundle/bundle-isotype.svg`
- `assets/lavara/lavara-wordmark.svg`, `assets/lavara/lavara-monogram.svg` (the framed "A"), `assets/lavara/lavara-almajed.svg`

Because each SVG uses a single colour, the show tints it automatically for light or dark backgrounds.

## Engine (presentation.html)
- **Stage:** 16:9, letterboxed. `1rem` = stage width ÷ 160, which is 24px at 3840px.
- **Levels:**
  - Universe: the two worlds, each with a live brand texture that comes to life on hover.
  - Project hub: sections shown as stations.
  - Section: slides advance horizontally.
- **Camera:** each zoom scales the outgoing level toward the chosen element while the next level grows out of the same point (1.5s, power3.inOut).
- **Header logos:** a FLIP animation moves them from large and centred on the Universe to small in the top-left corner inside a project.
- **Transitions:** Layered Drift (default), Fade, Brand Veil, Mask Reveal, Cut, and Brand section. Each slide picks its own.
- **Section → section:** a brand cover with a title card (number + name), about 2.8s.
- **Brand textures** (WebGL2, rendered at half internal resolution):
  - Bundle: gooey metaballs with grain.
  - Lavara: domain-warped mist and foam.
- **Sound** (Web Audio, generated in code, no music):
  - Bundle: soft pops.
  - Lavara: breeze and silk.
  - Levels: barely audible between slides, more present between sections, a gentle swell on zoom.
- **Flow:** Universe → project → sections → back to Universe after the last section → next unvisited project → Decision Point → Closing.
- **Decision Point:** brand-neutral with a slow ambient "breath". Selections come from the remote or a mouse click, are logged with date and time, and feed the Closing summary. The discussion timer is silent and counts up.
- **Closing:** three layouts can be chosen in the panel (see open questions).
- **Reduced motion:** honoured automatically, or forced on or off in the panel.

## Templates
| Template | Notes |
|---|---|
| Full image | |
| Image + text | |
| Video | Full-bleed or framed |
| Title only | |
| Statement | |
| Brand board | Logo → mark → palette → type, revealed in sequence |
| Device frame | Phone, laptop, or both. Screens cycle automatically |
| Three concepts | Click (or use the remote) to focus one |
| Brand grid | Logos appear in colour on hover |
| Journey | "Next" reveals one stage at a time |

## Control panel (control.html)
- **Structure tree:** projects › sections › slides. You can add, delete (with undo), duplicate, hide or rename (double-click) any item, and drag to reorder or move a slide into another section.
- **Slide editor:** pick a template and only its fields appear. Images have fit and focal-point controls; videos have autoplay, mute and loop. Each slide also has a transition, a background and presenter notes.
- **Live preview:** an embedded copy of the show that updates on every edit.
- **Live sync:** edits are pushed to any open show window and auto-saved to `content.json`.
- **Brands tab:** logos, colours, palette, texture and intensity, the Universe visual, sound and an optional font override per project.
- **Global settings tab:** Universe layout (halves or circles), motion speed, HUD, start slide, fonts (you can upload new ones), header logos, sound, video and flow.
- **Decision & Closing tab:** decision groups and options, the closing layout and text, and the decision log with JSON and CSV export.
- **Live show tab:** remote QR code and links, full remote controls, notes, next item, timer and a jump tree.
- **Backup tab:** manual backup, version history with restore, and JSON export and import. If the panel is opened without the launcher, it falls back to the File System Access API.

## Remote (remote.html)
Built for mobile with large touch targets:
- next and previous, section jumps, and back one level;
- Universe, Decision Point and Closing;
- black screen and mute;
- a jump tree, presenter notes, a preview of the next slide (with thumbnail) and a timer;
- the Decision panel and concept-focus buttons.

It also keeps the phone screen awake during the show.

## Testing done
Tested in headless Chromium against the running launcher, with WebGL emulated in software:
- the full flow through both projects, the Decision Point and the Closing;
- every template;
- concept focus and journey stages;
- the control panel: an edit reached the open show live and was saved to `content.json`, and a backup was created;
- remote → show commands;
- 4K layout: root 24px, titles ≈106px, body ≈43px, Arabic letter-spacing `normal`.

No console errors and no failed requests.

**Not yet verified:** 60fps on the real presentation machine. Software rendering cannot measure it. Run it in Chrome full-screen at 3840×2160 on the target machine. If needed, lower *Global settings › Motion › Texture resolution*.

## Sample content
Every slide carries sample Arabic copy taken from the brand files (taglines, purpose, values, process). Sample media is cropped from the brand PDFs. Real content and final 4K media still need to be added through the panel.
