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

## Step 2 — Screens map (done)

**What was done**
- Thinker wrote `/spec/screens-map.md` (216 lines): **8 guest screens + 4 modals = 12 entries**,
  every one with an Arabic + English name, a one-line purpose, and `Status = Draft`.
- The map also fixes: the element-ID convention for the screen files
  (`-B` button, `-F` field, `-C` card, `-S` section), the Status vocabulary
  (`Draft` → `In cycle` → `Approved`), a full ASCII end-to-end flow, a per-screen
  "reachable from / leads to" table, back-navigation and persistence rules, a
  coverage check against the brief and the seven personas, and a list of 16
  decisions the brief did not settle.
- `/spec/screens/`, `/spec/tests/`, `/spec/reviews/` are intentionally still empty —
  Checkpoint 1 forbids writing any screen before the map is approved.

**Inventory**

| ID | English | Arabic |
|---|---|---|
| G-01 | Store | المتجر |
| G-02 | Product details | تفاصيل المنتج |
| G-03 | Cart | السلة |
| G-04 | Checkout | إتمام الطلب |
| G-05 | Order submitted | تم إرسال طلبك |
| G-06 | Order tracking | متابعة الطلب |
| G-07 | My orders | طلباتي |
| G-08 | Store unavailable | المتجر غير متاح |
| M-01 | Confirm room number | تأكيد رقم الغرفة |
| M-02 | Cancel order? | إلغاء الطلب؟ |
| M-03 | Order not sent | لم يتم إرسال الطلب |
| M-04 | Items no longer available | منتجات غير متوفرة |

**Next**
- **CHECKPOINT 1 — stopped, waiting for the owner's approval.**
- On approval: start the work cycle on G-01 (Thinker → Tester → Reviewer → Thinker),
  then mark G-01 `Approved` and hand it to the Wireframer, then stop again at
  Checkpoint 2 so the owner can judge the level of detail and the wireframe style.

**Waiting on a decision from the owner**
1. Approval of the 12-entry screen list and the navigation flow.
2. Confirm or override the 16 decisions in section 4 of `screens-map.md` —
   most notably: no splash screen, no search in v1, order-level notes,
   a separate success screen (G-05), reorder merges into the cart, and
   store opening hours not modeled.
