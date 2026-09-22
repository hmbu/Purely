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

## Step 4 — All twelve screens specified, tested, reviewed and APPROVED

Every screen and modal completed its cycle: Thinker wrote it, Tester walked it
as the seven personas, Reviewer ruled every element and every finding, Thinker
revised on the verdicts alone. No screen needed more than one cycle, and no
Critical finding is left open.

| ID | Elements | Criteria | Status | Wireframe |
|---|---|---|---|---|
| G-01 Store | 23 | 42 | Approved | yes |
| G-02 Product details | 24 | 52 | Approved | yes |
| G-03 Cart | 20 | 43 | Approved | yes |
| G-04 Checkout | 28 | 60 | Approved (OQ-01 open) | yes |
| G-05 Order submitted | 15 | 30 | Approved | yes |
| G-06 Order tracking | 25 | 54 | Approved | in progress |
| G-07 My orders | 13 | 35 | Approved | yes |
| G-08 Store unavailable | 10 | 36 | Approved | yes |
| M-01 Confirm room number | 8 | 38 | Approved | yes |
| M-02 Cancel order? | 9 | 33 | Approved | in progress |
| M-03 Order not sent | 8 | 26 | Approved | yes |
| M-04 Items unavailable | 9 | 27 | Approved | yes |

### The ten Critical findings and how each was settled

Every one was the same shape: the guest believes one thing, the system knows
another, and nothing says so. Each was fixed with honest wording or by removing
a state — never by building new machinery.

1. **G-01** — the active-order banner sat above a working product grid, so a
   guest "changing" an order silently built a second one. Fixed in the banner's
   wording. Disabling the grid, a warning modal and an editing path all rejected.
2. **G-02** — the same warning was missing where the Add button actually is.
   One identical line added, read from the device, no extra request.
3. **G-03** — Reorder capped a line at ten and dropped the excess silently.
   The existing toast now reports it, with Arabic plural forms for both cases.
4. **G-04** — a guest in room 7 could not order; a padded "07" passed every
   check and would reach a different door. Room numbers now take 1 to 5 digits.
5. **G-04** — alphanumeric rooms are still unsupported. This needs a fact about
   the real hotel, so it is OQ-01 with the alternative already worked out.
6. **G-04** — nothing said the order had not been sent after M-04. A persistent
   notice now does.
7. **G-04 / M-01** — the key rule replaced itself on every edit, re-creating the
   duplicate it existed to prevent; the first correction would then have let the
   server swallow a corrected room number. Settled across five files at once.
8. **G-06** — past New, Cancel disappeared and nothing replaced it. One line now
   says the window is closed and to call reception.
9. **G-08** — a catalog failure could consume the cancel window locked decision
   6 grants. The map was amended so both variants reach the saved orders.
10. **M-02** — "no such order" was rendered as a connection failure, telling the
    guest to retry the one action that could never succeed. It became a fourth
    outcome that closes the sheet, not a fourth error message.

### Also fixed along the way

- **G-07's trim** could delete an order still being tracked. Active orders are
  now never deleted, and a list of 23 active orders is simply drawn longer.
- **Two fit proofs** were recomputed with the safe-area inset counted. G-06's
  held. G-05's did not, so the guarantee was reduced honestly rather than
  shrinking an element to rescue the claim.
- **Eight map gaps** closed, and two map rows amended by the product manager
  where the structure itself blocked a fix.

### Files

`/spec/backlog.md` — deferred to v2, by screen.
`/spec/open-questions.md` — OQ-01 plus four accepted residual risks.

**Step 5 — Wireframes: all twelve drawn, plus the index.**

13 files, 6233 lines, every one fully grayscale at 390px RTL with each
element's ID in a circle beside it. States were drawn, not just the happy
path: the failed availability check with Checkout still enabled, the cart's
three toast cases, G-04's four error states, G-06's five statuses plus the
cancellation race, and G-08 with and without a saved order.

`/wireframes/index.html` links all twelve and draws 34 labelled arrows from
the map's own routing table. Two documented routes were initially omitted to
reduce clutter and were restored: the wireframer's rule is that it never
removes what the spec has, and those two were gaps the review had closed.

---

# PROJECT COMPLETE

| | |
|---|---|
| Screens and modals | 12, all **Approved** |
| Specification | 4,226 lines across 12 files |
| Elements specified | 192 |
| Acceptance criteria | 751 |
| Test reports | 12 (seven personas each) |
| Review files | 12 (every element and every finding ruled) |
| Wireframes | 13 files, 6,233 lines |
| Deferred to v2 | 49 items in `backlog.md` |
| Open questions | 1 question, 4 accepted residual risks |
| Critical findings found and closed | 10 |
| Commits | 52 |

**What is waiting on the owner:** OQ-01 — does the target hotel use letters or
separators in its room numbers? Version 1 accepts 1–5 digits. The alternative
is fully worked out and the files that must change are listed; it needs the
hotel's answer before build, not before spec.
