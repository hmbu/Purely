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

## Step 2 — Screens map (done, APPROVED)

8 guest screens + 4 modals = 12 entries. Checkpoint 1 was cleared by the
product manager, who approved the inventory, the navigation flow, and all 16
decisions the brief did not settle. Those 16 are now locked for v1.

| ID | English | Arabic | ID | English | Arabic |
|---|---|---|---|---|---|
| G-01 | Store | المتجر | G-05 | Order submitted | تم إرسال طلبك |
| G-02 | Product details | تفاصيل المنتج | G-06 | Order tracking | متابعة الطلب |
| G-03 | Cart | السلة | G-07 | My orders | طلباتي |
| G-04 | Checkout | إتمام الطلب | G-08 | Store unavailable | المتجر غير متاح |
| M-01 | Confirm room number | تأكيد رقم الغرفة | M-03 | Order not sent | لم يتم إرسال الطلب |
| M-02 | Cancel order? | إلغاء الطلب؟ | M-04 | Items no longer available | منتجات غير متوفرة |

---

## Step 3 — G-01 Store: full cycle run, APPROVED

The cycle ran once and closed; no second cycle was needed.

1. **Thinker** wrote the screen: 23 elements, 35 acceptance criteria. It also
   fixed the conventions every later screen inherits — Western digits in both
   languages, currency after the amount in Arabic and before it in English with
   two decimals, a 44x44px minimum tap area, 14px minimum body copy, the max-10
   quantity cap, and the five canonical order-status labels.
2. **Tester** walked it as all seven personas: 16 findings — 1 Critical,
   9 Medium, 6 Minor.
3. **Reviewer** judged all 39 items (23 elements + 16 findings):
   **30 Essential, 4 Later, 5 Remove**. All three required checks passed: no
   conflict with the locked decisions, two internal contradictions found and
   ruled, one clear purpose confirmed.
4. **Thinker** revised on the verdicts alone. Acceptance criteria 35 -> 41.

**The Critical finding and how it was settled.** G-01 showed the active-order
banner and a fully working product grid at once, so a guest trying to change a
submitted order would silently build a second, separate one that staff would
read as a single order. Ruled Essential, but fixed **only in the banner's
wording** — a second line saying anything added now is sent as a new separate
order. Disabling the grid, a warning modal, a confirmation, and any
order-editing path were all explicitly rejected, so the screen keeps one
purpose and editing a submitted order stays out of v1.

Two documentation gaps the review found in `screens-map.md` were closed by the
orchestrator: the empty-state Refresh action, and G-01's once-per-load
active-order status fetch.

`/spec/backlog.md` opened with 5 deferred items (search, load progress cue,
verified 200% large-text reflow, fresher banner status, multi-order hint).
`/spec/open-questions.md` is still not needed — every finding was ruled.

---

## Step 4 — In progress: wireframe G-01, specify the purchase path

Running in parallel right now:
- **Wireframer** draws `/wireframes/G-01.html` — main, loading, empty, error and
  active-order-banner frames, grayscale, 390px, RTL, element IDs in circles.
- **Thinker** writes G-02 (product details), G-03 (cart, incl. the only toast in
  v1 and the first stock gate) and G-04 (checkout — room number, notes,
  card/cash and the optional amount field; the highest-stakes screen).

**Next**
- Tester and reviewer cycles on G-02/G-03/G-04, then the modals M-01/M-03/M-04,
  then G-05..G-08 and M-02.
- Wireframe every approved screen, then build `/wireframes/index.html`.
- Close with the Checkpoint 3 summary.

**Waiting on a decision from the owner**
- Nothing. The product manager role was delegated, so decisions are being taken
  here and recorded in the map, the reviews and the backlog.
