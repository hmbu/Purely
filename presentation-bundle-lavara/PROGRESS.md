# Progress

## Done
- Phase 1: brand extraction (`docs/01-brand-extraction.md`). The user's decisions are recorded in `docs/02-build-notes.md`.
- Phase 2: canvas, 3 zoom levels and the motion system (Layered Drift, brand section cover, camera zooms, header-logo FLIP).
- Phase 3: 10 templates.
- Phase 4: both identities applied:
  - Bundle Direction 1: metaballs, gradient orbs, pill eyebrows.
  - Lavara Alt 2: mist, hairline frames, framed monogram.
  - Vector logos extracted.
- Phase 5: control panel, live sync, auto-save with backups, mobile remote with QR code, Decision Point and Closing.
- Phase 6 (partial): sample content for every agenda section in both projects; 4K layout check in headless Chrome.

## Next
- Replace the sample copy and media with final content (4K images and videos).
- Test on the real presentation machine: Chrome full-screen at 3840×2160, 60fps, sound and the phone remote over Wi-Fi.

## Round 2 (user feedback: not premium enough for executives)
- Header logos are now Rimthan (company) and Al Majed Oud (partner); the closing screen uses them too.
- Nine opening screens: 1 Cinematic, 2 Portals, 3 Monolith, 4 Editorial Index, 5 Title card, 6 Monograms, 7 Invitation cards, 8 Horizon, 9 Giant type. The original two are kept as 10–11. Compare them in `docs/opening-screen-options.png`, or switch live with the small 1–11 chooser at the bottom-left of the opening screen.
- New "quiet" executive tone, now the default:
  - section covers in solid brand colour with soft moving light;
  - no bubbles or mist between slides;
  - project hub shown as numbered hairline columns;
  - restrained eyebrows.
- "Expressive" brings back the brand textures.

## Round 3
- Opening screen: **Living horizon**, a merge of option 8 and option 10, is now the default.
  - The two halves show their brand colours, each with a calm live texture: soft drifting bubbles for Bundle and faint smoke for Lavara.
  - A line of light crosses the screen and its glow drifts slowly along it.
  - On hover, the light glides to the hovered project in that project's colour.
- The corporate logos sit with their divider exactly on the centre line.
- Online editing and publishing through GitHub (`docs/03-publishing.md`). The control panel has a new **Publish** tab, and its history and uploads work through GitHub.

## Round 4
- New project page:
  - brand colour with a calm live texture;
  - the wordmark large;
  - sections as stations on a line of light, with the light resting on the next section and a soft ring marking it;
  - visited sections shown in the accent colour.
- Between sections: a strong zoom out to the project page and the light glides to the next station. The show then waits for the presenter's Next press (`flow.afterSection`: `wait` (default) or `auto`). The setting `flow.sectionTransition` is `hub` (default) or `cover`. Both are in the control panel under global settings.
- Universe ↔ project: the chosen world's brand plate grows to full screen (transform-only morph, `#morph`), then the project page fades in. The reverse runs on the way back.
- Hub light: positioned in layout pixels (immune to camera scaling), and it always returns to the current target station. Hover is ignored while a transition runs, and pages ignore the pointer during camera moves (`#stage.is-moving`).
- Lavara wordmark is now Alternative 1, including the "by Al Majed Oud" lockup. The isotype stays Alternative 2 (framed A monogram).
- Lavara palette: mostly Alternative 2, plus Alt 1 gold ochre `#926A23` and Alt 3 sage `#929E7A`.

## Waiting for the user's decision
0. One-time GitHub setup (see `docs/03-publishing.md`): enable Pages and create the token.
1. Closing layout: (a) both logos + a closing line [current default], (b) both project marks + a line + contact, (c) a calm discussion screen.
2. Higher-resolution brand imagery for the opening screen (current covers are cropped from the PDFs; Bundle's art is 1080px).

## Shared area (legal · financial · decisions)
- Entry: scroll down from the opening screen (wheel, ↓, swipe up, or the faint arrow, no text). Scroll up or ↑ returns.
- It is a project with `kind: "shared"` and a light identity (ivory / brass / charcoal). Its page lists its sections like Bundle and Lavara, and ends with a "Decisions" station that opens the Decision Point in the same identity.
- Default content (added only when missing; deleting it in the panel sets `sharedRemoved`):
  - Legal: "What changes in the contract" (current, then proposed on Next) and "Proposed structure".
  - Financial: "Money flow".
- New slide template `diagram`: boxes on a grid with arrows, labels, frames, and step-by-step reveal. Fully editable in the control panel.
- Show order: Bundle → Lavara → shared area → decisions → closing.

## Lavara background: care-product materials instead of fog
- Team feedback: the Lavara "mist" texture reads as fog. Foam was suggested and rejected (reads cheap / bath product).
- Added three styles, chosen per brand in the control panel (Brands › Lavara › "شكل ملمس لافارا"; field `brand.textureStyle`):
  - `silk` liquid soap: glossy poured folds with a moving sheen.
  - `lather` the liquid soap with a light lather (scattered small bubbles in soft patches), added at the user's request.
  - Round 2 ("still moves like fog, want heavy liquid soap, more options"): liquid styles rebuilt as a lit height field with sharp softbox reflections; added `pour` (folds sliding down), `drop` (damped rings on thick gel), `swirl` (liquid and cream ribbon stirred). Selector moved to its own group at the top of Lavara's brand settings.
  - `soap` handmade soap bar: marbled swirls with fine flecks.
  - `amber` light through perfume / oil: warm caustics.
- `mist` stays the default until the user picks one (content.json is untouched).
- Brand review (Alternative 2): palette is brown #3C2E25, terracotta #AD6243, ivory, paper, ochre #926A28, plus a **sage green** used on bottles, soap and boxes that is not yet in the brand config. Waiting for the user's decision on adding it.
