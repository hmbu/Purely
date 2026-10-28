# Project: Bundle × Lavara Cinematic Presentation

This folder is a standalone project. The hotel in-room store rules in the repository root `CLAUDE.md` (agents, spec template, wireframes, checkpoints) do NOT apply here.

- Brief: the user's project brief (phases 1–6, with section 13 "Final decisions" overriding earlier sections).
- Lavara: use the SECOND proposal (Alternative 2) only.
- Never invent brand elements; extract from `brand-source/`.
- Arabic text never gets letter-spacing.
- Stop and wait for the user's approval after each phase. Track status in `PROGRESS.md`.

## Identity sources (user decision, strict)
- Bundle: only `brand-source/bundle-brand.pdf` (its palettes, grainy gradient shapes — arches, half/quarter circles, gradient spheres — pills, rounded cards). The gift-products deck follows it.
- Lavara: only `brand-source/lavara-brand.pdf`, Alternative 2: the LAVARA wordmark, the framed "A" monogram, the round LA·VA·RA seal, hairline frames/lines, its palette, numbering as (001). No shapes, gradients or markers from anywhere else (no diamonds, no Roman numerals, no borrowed Bundle shapes).
- Never take identity from working files (HTML/PPTX decks the user sends): they give content only.

## Design rule: every addition wears its project's identity (user decision)
- Any slide added to any project must look like that project, never one generic style pasted everywhere, and never a copy of the source file's look (PPTX/HTML material is re-composed, not pasted).
- Templates take colours only from the slide tokens (`--sbg --sfg --stitle --saccent --ssec --ssurf`), never hard-coded brand hex.
- Every new template gets a dressing for each identity in `css/show.css`:
  - Bundle (`[data-style="bubbles"]`): soft rounded shapes (≈2rem radius), pills, gentle lift.
  - Lavara (`[data-brand="lavara"]`): panels on its ivory surface with a hairline inset frame, one dark lead panel, Roman numerals or a small diamond, status as an underline, logos tinted in its ink.
  - Shared (`[data-brand="shared"]`): editorial paper cards like its diagrams (inset hairline, short brass rule on top), no pills.
- Colour sets for multi-item slides come from the tone layer (`.tn-t1…t5` in `css/show.css`), defined per identity from its own palette; Bundle's tones are the grainy gradients of its gift-products deck (lime-green, sky-blue, lilac-pink, sunset, lime).
- Restrained: one highlighted element per slide at most, motion = the existing stagger. Check every new slide in all identities it can appear in before pushing.
- No small eyebrow labels above titles (`settings.eyebrows` false); the slide footer is logo · section · page only.

## Content safety (the user edits content online)
- `content.json` is owned by the user: they edit it in the control panel, which commits it to this branch. NEVER modify or commit `content.json` from a session (a local pre-commit hook blocks it; override only if the user explicitly asks: `ALLOW_CONTENT=1 git commit …`).
- Always `git pull --rebase origin <branch>` before pushing, so control-panel commits are kept.
- New features: put defaults in `SETTING_DEFAULTS` (`js/core/model.js`); they fill missing keys only and never change existing values.
- Every push that touches this folder redeploys the site (GitHub Pages workflow); the single-file version is rebuilt in CI from the latest content at `/dist/presentation-standalone.html` (not committed).
