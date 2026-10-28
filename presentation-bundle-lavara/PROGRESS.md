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

## Agenda update (user request, content.json edited with permission)
- Bundle: الهوية · نموذج العمل (new, placeholder) · المنتجات والعلامات (concepts + brands selection merged) · ديمو المنتج الرقمي.
- Lavara: الهوية · نموذج العمل (new) · المنتجات والعطور (fragrances + concepts merged) · التحديث التجاري (new) · ديمو المنتج الرقمي.
- Shared: مراجعة النموذج التشغيلي (new) · مراجعة النموذج المالي · التحديث القانوني · الاعتماد (decision station renamed; `decision.title/titleEn`, editable in the control panel).
- "قصة التجربة الكاملة" is hidden in both projects (not deleted).
- Opening section (welcome + Q1 review) postponed; approach proposed to the user, waiting for content.
- Titles simplified (user): Bundle الهوية · نموذج العمل · المنتجات · المنتج الرقمي; Lavara adds الأعمال; shared النموذج التشغيلي · النموذج المالي · القانوني · الاعتماد. Each station shows a short Arabic line (`section.desc`, `decision.desc`) instead of the English label.
- Project opening slides show the brand wordmark instead of the written name (title template option `showLogo`).

## Working slides merged (Lavara_-_Working_Slides.pptx)
- New templates: `updates` (status cards + a decision ask), `sectors` (columns with client logos), `finance` (bar charts on one shared scale + side panel). They take the colours of the section they sit in (`--ssec` = the brand's second colour).
- Shared › القانوني: contract diagram updated to the deck (Al Majed's new line, "ملكية 100%" arrow); added "المستجدات ونقاط الاتفاق".
- Lavara › الأعمال: "تواصلنا مع أكثر من 35 جهة في أربعة قطاعات" with 20 client logos (`assets/lavara/clients/`).
- Shared › النموذج المالي: revenue charts for both models first, then the money flow. Model screenshots in `assets/shared/`.
- Not added: the deck cover, the "المالية" divider (each section has its own cover) and the second revenue layout (same content, sides swapped).
- Placeholders kept from the deck for the user to fill: revenue headline "[الخلاصة الرئيسية…]", the three agreement points, and the tripartite agreement duration "[__]".
- Themed per project (user: same theme per project, not copy-paste): Lavara sectors use framed panels on its ivory surface, Roman numerals, a dark lead panel and logos tinted in its ink; shared slides use the editorial paper cards of its diagrams (inset hairline, brass rule, no pills); revenue bars take each project's colour (Bundle green, Lavara terracotta; chart `color` field); Bundle gets rounded cards.

## Edit text on the show (key E)
- `js/core/editor.js`: E toggles edit mode (any keyboard layout, `e.code`). Slide texts are bound to the slide-data string they show (exact match, in order); hub titles/descriptions, project tagline and the approval station are marked with `edAttr()`. Enter saves, Shift+Enter new line, Esc reverts; clicks on editable text never navigate.
- Saving: `patchContent()` in `store.js` reloads the latest content.json, changes only that field and commits it with the fresh sha (retries on a concurrent commit), so control-panel or other-device changes are never overwritten. Works on the device where GitHub is connected in the control panel (same site, same browser storage); otherwise the bar says it is not saved.
- Not editable here: chart number lists, images, layout (control panel).
- Tested with a mocked GitHub API: one commit, only the edited field changed, a concurrent change elsewhere kept.

## Cleaner slides (user)
- Small labels above slide titles hidden everywhere (`settings.eyebrows`, default false; toggle in the control panel's global settings).
- Bottom line on slides: project logo · section · page number only (shared area shows its name, it has no logo). Nothing on the project page.

## Business model canvases (Bundle_BM_Workshop v10, Purely_business_model v4.1)
- New `canvas` template: the nine blocks in the standard layout (RTL), one line per block, value proposition as the single solid block, blocks reveal in storytelling order (segments → value → channels → relationships → revenue → resources → activities → partners → costs). Dressed for Bundle, Lavara and shared.
- Bundle › نموذج العمل: the workshop's main screen (each block's question + its status: decision needed / linked / numbers in the financial model).
- Lavara › نموذج العمل: Purely's model, the headline of each block only.
- Design rule written into this folder's CLAUDE.md so every future addition follows its project's identity.
- Canvases revised (user): block titles larger (the question), a short answer under each. Bundle answers = the workshop's leaning options and proposed inputs (badge "الاتجاه المرجّح" until the workshop decides); Purely answers = each block's headline plus its key facts.

## Validation-phase brief (Almajed_260824_CEO_work1.pptx)
- Business models replaced with the brief's updated content (Bundle and hotel supplies), numbered in the brief's reading order (1 segments … 9 costs), reveal follows the same order. Meeting notes moved to speaker notes.
- The hotel canvas's partners box in the brief is a copy of Bundle's; Purely's partners kept and the user told.
- Operating models → shared › النموذج التشغيلي: new `flow` template (six phases right to left, steps, owner teams, decision gates, rework loops) accented in each project's colour, plus "المخطط الكامل" opening the original flowchart full screen (`js/core/zoom.js`: wheel/± zoom, drag, double-click fit, Esc; it owns the keyboard while open). Images: `assets/shared/opmodel-*.webp`.
- Not added: the brief's cover, section dividers, summary and next-steps pages.
