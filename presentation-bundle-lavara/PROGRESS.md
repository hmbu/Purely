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

## Bundle gift products (Bundle-Gift-Products_2.html)
- Bundle › المنتجات now opens with: occasions (focus now / later), three product pages (one per occasion group, tabs on top), product sources, categories with a photo collage; then the existing concepts and packages; partners & suppliers last. The old placeholder brand grid is hidden, not deleted.
- New templates: `occasions`, `showcase`, `sources`, `categories`, `partners`, coloured through a per-identity tone layer (`.tn-t1…t5`).
- Bundle-wide touches taken from the deck (light): grainy shape mosaic on Bundle title slides (`.t-mosaic`), the business model's value block in the deck's green gradient, lime status pills, softer image corners.
- Assets: `assets/bundle/gifts/`, `assets/bundle/partners/`. Not added: the deck's cover and thank-you pages.
- Operating model (user): phases slide, then the full flowchart as its own next slide (new `figure` template) instead of a button. The flowcharts were recoloured from black to a transparent base (`assets/shared/opmodel-*-light.png`): white boxes kept with a fine outline, grey lines and labels turned to ink, coloured chips and loop lines kept; the slide's paper shows through. Clicking the figure still zooms.
- Financial model: sides swapped (screenshots panel first on the right, charts after).

## Lavara products (lavara-products_2.html + the user's outline)
- Lavara › المنتجات after its opening statement: product categories (refill as the dark lead panel, single use, diffusers) → refill lineup (five cut-out bottles on one shelf, same width so real proportions show) → perfumes compare (Al Majed vs Lavara, advantages/challenges) → operations numbers (factories, trials, samples, perfumes; values "—" until the user fills them). Earlier slides of the section kept after these.
- New templates `lineup`, `compare`, `stats`, dressed for all three identities. Bottle images in `assets/lavara/products/` (cutouts were already clean; no external background-removal tool used).

## Identity review against the source files (user)
- Lavara: removed everything not in its brand file: Bundle's grainy shapes in the categories cards (now its framed monogram), gradient tones (now flat palette colours), diamonds in the business model and the comparison (now typographic + / −), diamond journey dots (now small squares like the monogram frame), Roman numerals (now (001) as in the brand file, including the concepts labels).
- Bundle: its shapes, gradients, pills and rounded cards are all in bundle-brand.pdf; kept.
- Flagged to the user (content, not design): the blue line video in both identity sections, the empty video slide in Lavara products, the yellow/black "SCAN ME" photo in Lavara's digital product.
- Bundle (user: the products pages had been copied from the working deck): title-slide decoration is now the brand file's stacked grainy circles (the mosaic and leaf shapes were from the deck, removed); the six product pages are redrawn in the brand file's application language: white floating cards with soft shadows, gradient-sphere icons, stacked white pills with sphere bullets, solid/gradient pills for group titles and tabs. Content unchanged.

## Symbol-led section titles · Bundle backgrounds
- Section titles: every section now opens with its title card (`settings.flow.titleCards`, default on; off = the previous zoom from the project page). The project's symbol (Bundle's B, Lavara's framed A) appears small and solid, grows into a large faint shadow and the title opens from its centre. Bundle title slides show the B as a large faint shadow behind the logo (Lavara's already had its A).
- Bundle backgrounds (control panel › الهويات › بندل › «خلفية بندل المتحركة»): `orbs` separate grainy gradient spheres that drift and bounce, never merging (set as Bundle's choice); `strips` the Purpose page's strips with circles/half circles/rounded columns; `stacks` columns of touching circles (website page); `bubbles` the previous merging bubbles. Gradients are bundle-brand.pdf's pairs, flat and grainy.
- A shader that fails to compile disables every background: each new mode was compiled and rendered in a browser before pushing.
- Symbol shadow (user): never directly behind the brand; it sits at the bottom-right corner, large and cut by the edge (about half shows), on title slides and at the end of the section-title animation (the symbol opens the title in the centre, then slides to the corner).

## Bundle products: frames off, sources as columns, Bundle motion (2026-10-28)
- Product photos (showcase, categories) have no white frames: rounded photos on the page, tag pill on the photo.
- Sources: each source is a rounded-end brand column rising from the floor with its words above; Bundle's own line is the green column with the symbol.
- Bundle title slides: wordmark only (stacked circles removed); the half-cut symbol shadow stays bottom-right.
- Motion for Bundle slides follows its gift catalogue: elements rise into place (cubic-bezier .2,.7,.2,1, staggered); columns grow from the floor; between product pages the group pills stay and the highlight slides to the next group.
- Waiting: user review.
- Follow-up: sources back to the original card idea (pill, words, one brand shape rising from the card floor: column, cut circle, half circle, slim column; green card for Bundle's line). Partners placed as in the gift catalogue (right under the title, green band with white tiles, white band with cream tiles), logos no longer cropped.
- Follow-up: occasion group titles are now the same gradient pills as the product-page tabs, on the same columns; moving on from occasions they rise into the tabs, then the examples come up.

## Titles, Lavara colours, shared identity (2026-10-28)
- Hub section titles larger (2.9rem, descriptions 1.55rem); slide titles larger (5.6rem, close to the gift catalogue's 72px).
- Lavara boxes: colour blocks from Alternative 2 (terracotta, sage, ochre, olive) with ivory words, inset hairline, (001) and the framed A; business model tinted by family with the value in terracotta; sectors with the lead in terracotta and colour bands on the rest.
- Shared frame: its own identity ("the dossier"): ivory sheets, square corners, no shadows, a solid top rule in the party's colour, copper index and copper-square labels; the decision is the ink sheet.
- Section title cards pick dark text on light grounds (the shared frame's titles were white on white).
- Waiting: the decision content from the user.

## Lavara products motion, canvas parts, numbers (2026-10-28)
- Product categories (sl-lp-cats) now use the concepts template with a new "stepFocus" option: the arrow moves the focus refill → single use → perfume dispensers (focused grows a little, others step back); each has its own image (placeholders from the brand samples until the user picks).
- Entrances: refill lineup "dives" (blur + zoom settle, bottles rise from the middle outwards, shelf line draws); operations tiles open from the floor and count up; perfume cards open like curtains with points line by line.
- Business model canvas in three colour-coded parts with a small legend: feasibility (right), desirability with the value at its centre (left), viability (bottom). Legend names editable.
- Operations numbers: 3 factories, +50 trials, +40 samples, +30 perfumes. Sectors: hotels block in dark brown.
- Follow-up: Lavara words only white or near-black; canvas parts as solid colour families (olive / ochre / terracotta) with the value in dark brown; Lavara boxes lifted slightly with barely rounded corners.

## Bundle main-screen scenes (2026-10-28)
- Five new Bundle backgrounds, each with its own ground from the brand palette and motion from brand shapes only: meadow (cream, shapes floating and turning), sunrise (sky, half circles rising/setting, hanging columns), bloom (pink, breathing field of circles), rhythm (lime, columns rising and falling with spheres), orbit (deep green, spheres on orbits). The middle stays calm for the wordmark and stations; the hub's ink follows the ground. Chosen in the control panel (Bundle's animated background).
- Waiting: the user's pick.
- Follow-up: sky scene with rising bubbles (skybubbles), lighter grain; stage, section covers and project morphs take the scene's ground and ink (no leftover green); control panel switch «لون بندل بالكامل»: green (original, orbs) or sky (skybubbles). Bundle set to sky at the user's request.
- Follow-up: product pages show each photo whole (own shape, never cropped, tag on the photo); tabs and products moved a little lower.
- Follow-up: shared-frame cards for Al Majed Oud and Rimthan carry their logos and party colours (gold, indigo; entity teal); revenue bars rise slowly year after year; Lavara lineup entrance slower; Bundle product photos back to one size, whole product visible, crop from the top.
- Follow-up: Bundle product photos breathe with a slow light zoom.
- Follow-up: product photo zoom only on entry (settles and holds) and a light zoom on exit; no continuous zoom.

## Full review fixes (2026-10-28)
- Contract diagram scaled to fit when all steps show; Al Majed cards show the logo (which carries the name) without repeating it; Lavara video caption clear of the footer; business-model text no longer clipped; Lavara revenue years 2027–2031 like Bundle; opening-screen chooser hidden; green orbs calm in the middle of the hub; section title → first slide without an empty beat; Bundle sources shapes ~40% larger, categories list centred, product pages centred; footer larger.
- Not touched (user decision): digital product sections, decision page, operating-model flowcharts.
- Videos without autoplay: the first «next» starts them (later presses move on); click on the video, the P key, and a play/pause button in the control panel (live) and on the remote; a quiet play mark shows while paused.

## Section transitions: the station is the door (2026-10-28)
- Entering a section from the project page: the station's number and name travel to the middle and become the section title (the rest of the page steps back, the symbol settles faint in the corner), then the title lifts away and the first slide enters. Leaving: the slide closes in a circle into its station's dot while the page returns; the light then moves to the next station. Replaces the separate cover card on section entry (cover cards remain for the 'cover' setting and slide transitions).
- Follow-up: section entry styles, chosen with one tap in the control panel (global settings): 'merged' (default: the brand cover and symbol as before, with the station's own number and name flying into it), 'cover' (the previous cover card exactly), 'door' (station title alone, slide closes into its station on exit). Merged/cover exit = the previous camera pull-back.
- Follow-up: shared frame company cards — Al Majed Oud: black logo only on an oud-gold card; Rimthan: white logo on a deep charcoal card.
- Follow-up: company cards show only the logo (no Arabic name in text) for both Al Majed Oud and Rimthan.
- Section exit made calm: the slide eases back while the already-built project page settles in; stations rise softly, the line is not redrawn.
- Identity sections: the wordmark travels between the title slide and the identity board (both directions), changing colour on the way, while the rest of the slide changes around it.
- Lavara digital product: new slide «لوحة التحكم للفندق» (screens template: two offset screenshots + numbered points); the two screenshots are uploaded by the user in the control panel.
- Decision page → «الاعتماد»: perfumes/oils decision (Al Majed only / Lavara only / both), then approval rows for the financial, operating and legal models, business model, tripartite agreement and CEO (اعتماد / اعتماد مع تعديل / تأجيل); more than three items show as rows.
