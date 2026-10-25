# Project: Bundle × Lavara Cinematic Presentation

This folder is a standalone project. The hotel in-room store rules in the repository root `CLAUDE.md` (agents, spec template, wireframes, checkpoints) do NOT apply here.

- Brief: the user's project brief (phases 1–6, with section 13 "Final decisions" overriding earlier sections).
- Lavara: use the SECOND proposal (Alternative 2) only.
- Never invent brand elements; extract from `brand-source/`.
- Arabic text never gets letter-spacing.
- Stop and wait for the user's approval after each phase. Track status in `PROGRESS.md`.

## Content safety (the user edits content online)
- `content.json` is owned by the user: they edit it in the control panel, which commits it to this branch. NEVER modify or commit `content.json` from a session (a local pre-commit hook blocks it; override only if the user explicitly asks: `ALLOW_CONTENT=1 git commit …`).
- Always `git pull --rebase origin <branch>` before pushing, so control-panel commits are kept.
- New features: put defaults in `SETTING_DEFAULTS` (`js/core/model.js`); they fill missing keys only and never change existing values.
- Every push that touches this folder redeploys the site (GitHub Pages workflow); the single-file version is rebuilt in CI from the latest content at `/dist/presentation-standalone.html` (not committed).
