# PROGRESS

Living log of the specification work. Updated after every step.

---

## Step 1 — Team setup (done)

**What was done**
- `CLAUDE.md` placed at the project root as the single source of truth.
- Project skeleton created: `/spec/screens/`, `/spec/tests/`, `/spec/reviews/`, `/wireframes/`.
- The four subagent definition files created verbatim in `.claude/agents/`:
  `thinker.md`, `tester.md`, `reviewer.md`, `wireframer.md`.

**Model confirmation**

| Agent | Model assigned in CLAUDE.md | Model actually running | Match |
|---|---|---|---|
| thinker | fable | Fable 5.1 (`claude-fable-5-1`) | yes |
| tester | sonnet | Sonnet 5 (`claude-sonnet-5`) | yes |
| reviewer | opus | Opus 5 (`claude-opus-5`) | yes |
| wireframer | sonnet | Sonnet 5 (`claude-sonnet-5`) | yes |

**Known environment caveat**
The agent registry for the current session was loaded at session start, before
`.claude/agents/` existed, so the four agents are not yet callable by name in
this session. They are being run with their exact persona instructions and
their exact assigned models via explicit model selection, which produces the
same behaviour. From the next session onward they will be callable by name
(`thinker`, `tester`, `reviewer`, `wireframer`) with no change to the files.

**Next**
- Thinker writes `/spec/screens-map.md`.

**Waiting on a decision from the owner**
- Nothing yet.

---

## Step 2 — Screens map (in progress)

**What is being done**
- Thinker is writing `/spec/screens-map.md`: every screen and modal with a
  fixed ID, an Arabic + English name, a one-line purpose, the full navigation
  flow, and a status column set to `Draft`.

**Next**
- **CHECKPOINT 1** — stop and wait for the owner's approval of the map before
  any screen file is written.

**Waiting on a decision from the owner**
- Approval of `screens-map.md` (Checkpoint 1).
