# Open questions

Owner: Reviewer (Agent 3), on behalf of whoever raises the question.
Purpose: hold every question that the project cannot answer by itself, so that version 1 ships with its limitations **recorded and visible** instead of silent.

## How to use this file

- One section per question, in ID order: **OQ-01**, **OQ-02**, … IDs are fixed and never reused, even after a question is closed (a closed question keeps its ID and is marked `Closed`, with the answer written into it).
- A later cycle **appends** a new section below the last one; it never rewrites another question's section. Only the product manager changes a `Status` from `Open` to `Answered`, and only the agent who owns the affected screen applies the answer.
- Every question carries the same eight headings, in this order: **Type**, **Status**, **Raised by**, **Affects**, **The question**, **What version 1 does today, and who it blocks**, **Proposed alternative (already worked out)**, **What must change if the answer is yes**.
- **Two types are allowed** (`CLAUDE.md` § "Locked decisions" defines the second):
  - **Type A — unresolved fact or decision.** Something outside the project must be known or decided before a rule can be finalised. The spec still states a version-1 rule; the question records why that rule may be wrong for the real hotel.
  - **Type B — objection to a locked decision.** An agent disagrees with one of the seven locked decisions in `/CLAUDE.md` or one of the sixteen approved decisions in `/spec/screens-map.md` §4. The objection is written here with a proposed alternative, and the decision is **not** changed unilaterally.
- A question does not block approval of a screen by itself. What it blocks is stated in its own **Affects** line.
- Items deferred to version 2 belong in `/spec/backlog.md`, not here. A question may point at a backlog row; a backlog row may point back at a question.

## Index

| ID | Type | Question (short) | Affects | Status |
|---|---|---|---|---|
| OQ-01 | A | Do the target hotel's room numbers contain letters or separators? | G-04, M-01, M-03 (build, not approval) | **Open** |

---

## OQ-01 — Do the target hotel's room numbers contain letters or separators?

**Type:** A — unresolved fact about the real hotel.

**Status:** **Open.** Raised 2026-09-22, cycle 1 of G-04. An answer is needed **before G-04 and M-01 are built**; it is not needed before they are approved, because version 1 as specified is complete and self-consistent without it.

**Raised by:** Reviewer (Agent 3), ruling R2 in `/spec/reviews/G-04.md`, on tester finding F10 (`/spec/tests/G-04.md`, Persona 4c, Critical).

**Affects:** `/spec/screens/G-04.md` §4 (F01 row), §5.3, §7.1 and its acceptance criteria; `/spec/screens/M-01.md` §5.2, §6.2, §7.6 and its acceptance criteria; `/spec/screens/M-03.md` §7.1. Backlog row **G-04-L6** is blocked on this answer. It does **not** affect any other screen: the room number is typed in exactly one place.

### The question

Does the hotel this store is being built for use room labels that contain anything other than the digits 0–9 — Latin letters (`12B`, `A-12`, `3B`), hyphens, slashes, spaces, or a wing/floor prefix? And if it does, is that true of every room or only of a named part of the building (a wing, a villa block, a suite floor)?

A second question rides along with it, because the same answer settles it: is there any room whose label differs from another only by a leading zero (`07` and `7` as two different doors)? Version 1 keeps leading zeros exactly as typed and therefore treats them as two different labels.

### What version 1 does today, and who it blocks

G-04 §7.1 accepts **Western digits 0–9 only**, 1 to 5 of them (1–5 after ruling R1 in the G-04 review; it was 2–5 in the first draft), and F01 opens a **numeric keypad with no letter keys**. Arabic-Indic digits are converted to Western digits; every other character is rejected with `استخدم الأرقام فقط (0–9)` / `Use digits only (0–9)`.

Consequences if the hotel does use letters or separators:

1. A guest in room `12B` **cannot type their room number at all** — the on-screen keyboard has no letters, and a pasted value is rejected.
2. The error message reads as though the guest mistyped, not as though the product does not support their hotel's numbering. The guest is given no way to understand the real problem.
3. The likely guest behaviour is to type the numeric part only (`12` for `12B`), which is syntactically valid, passes every check, is confirmed in large type on M-01, and is delivered to a different real door. **No message, no confirmation and no cancellation window catches this**, because nothing in the system is ever told that anything is wrong.
4. The alternative guest behaviour is to abandon the order, which the product never learns about.

**This is why the question is recorded rather than answered here:** the fix is cheap and fully worked out below, but choosing it without knowing the hotel's numbering would either add an unnecessary keyboard and validation surface to the highest-stakes field in the product, or leave a whole wing of guests unable to order.

### Proposed alternative (already worked out)

If the answer is "yes, the hotel uses letters and/or separators":

| Rule | Proposed value |
|---|---|
| Accepted character set | Western digits `0–9`; Latin letters `A–Z` and `a–z`; and two separators, the hyphen `-` and a single space. Arabic-Indic and Extended Arabic-Indic digits are still converted to `0–9` as typed (unchanged). Arabic letters are **not** accepted: the room label staff read on a door and on the order ticket is Latin/numeric. |
| Case | Accepted in either case and **sent exactly as typed**; the interface never uppercases or lowercases what the guest entered (the no-silent-rewrite rule that governs this whole screen). |
| Structure | Must contain **at least one digit**; may not begin or end with a separator; may not contain two adjacent separators. |
| Length | **1 to 6 characters** after trimming, counted including separators. Six covers `A-1204`, `12B`, `3B`, `1204`. Trailing and leading spaces are trimmed as today. |
| Keyboard | The device's **default text keyboard** in the current interface language, not the numeric keypad — letters must be typeable. `autocorrect`, `autocapitalize` and `autocomplete` are all off (an autocorrected room number is exactly the silent value change this screen forbids). |
| Error copy | Replaces the "wrong characters" message: `استخدم أرقام وحروف رقم غرفتك فقط` / `Use only the digits and letters of your room number`. The "too long" message becomes: `رقم الغرفة طويل جدًا: 6 خانات كحد أقصى` / `Room number is too long: 6 characters at most`. A new message covers the structure rule: `اكتب رقم غرفتك كما هو مكتوب على الباب` / `Enter your room number exactly as it appears on your door`. |
| Placeholder | Still **none**, and no example inside or beside the field (G-04 §5.3): an example room label next to the field can be mistaken for a pre-filled value. Examples may appear only inside an error message, never at rest. |
| M-01 display | The value is rendered at **64 px bold** as today for 1–5 characters. For a 6-character value the size drops to **48 px bold** on one line — it never wraps, never shrinks below 48 px, and is still at least 2.5 × any other text on M-01. Letters are rendered as typed; the screen reader reads the value **character by character** (`one two bee`), never as a word or a quantity. |
| Leading zeros | Unchanged: kept exactly as typed, `07` and `7` stay two distinct labels. |

If the answer is "no, digits only": nothing changes. The rule set in G-04 §7.1 as revised by R1 stands, and this question is closed as `Answered — no change`.

### What must change if the answer is yes

**`/spec/screens/G-04.md`**
1. §4, the **F01** row: the keyboard description changes from "numeric keypad with digits 0–9 only" to the default text keyboard with autocorrect, autocapitalize and autocomplete off.
2. §5.3: the recorded-limitation paragraph added by ruling R2 is **deleted** and replaced by the new character-set rule; the "no placeholder, no example" rule is kept unchanged.
3. §7.1: the "Accepted characters", "Length", "Spaces", "Input type / keyboard" and "Auto-complete / auto-correct" rows are replaced with the table above; the message table gains the structure message and rewrites the wrong-character and too-long messages.
4. §7.8: still hands the trimmed string byte-for-byte; no change to the contract, only to what can be in the string.
5. Acceptance criteria 9, 13, 14, 15, 16 and 18 are rewritten for the new character set and bound, and one criterion is added for the structure rule.
6. **Unchanged by this answer:** no room-list validation (backlog G-04-L5), no pre-fill (§5.3), and the post-submission sighting of the room number on G-05 and G-06 ordered by ruling R3.

**`/spec/screens/M-01.md`**
7. §5.2 and §7.6: the 64 px rule gains the 48 px exception for a 6-character value; the "digits, laid out left-to-right" rule becomes "characters, laid out left-to-right in both languages"; the screen-reader rule becomes character-by-character.
8. §6.2: the guarantee "a room number of 1–5 digits" becomes "a room label of 1–6 accepted characters".
9. Acceptance criteria 3, 4 and 30 are rewritten accordingly.

**`/spec/screens/M-03.md`**
10. §7.1: `{room}` is described as the trimmed room label of 1–6 accepted characters rather than 1–5 digits. The C04 copy itself does not change.

### Residual risk recorded with this question

Two risks survive whatever the answer is, and they are recorded here so they are accepted knowingly rather than overlooked (both come from ruling R3 in `/spec/reviews/G-04.md`):

1. **A confidently wrong room number is not detectable by the device.** A guest who believes their room is `350` when it is `305` types a valid label, confirms it in 64 px type on M-01, and staff walk to a real but wrong door. Version 1's mitigations are: M-01's large-type confirmation (locked decision 2); the room number shown again on **G-05** and on **G-06** while the order is still New; and cancel-while-New (locked decision 6) followed by a fresh order. The stronger mitigation — checking the typed value against the hotel's real room list — is deferred as backlog **G-04-L5** and is backend work, not a guest-interface line.
2. **The duplicate-order repair depends on the guest reading that room number.** Under ruling R5 the client order key is stable for a checkout session, so a resubmission after a lost response returns the order that already exists rather than creating a second one — which means the order the guest receives may carry the room number they typed *before* an edit. That is why the G-05/G-06 room-number requirement in R3 is part of the duplicate-safety contract and not a cosmetic choice.

---

## OQ-01 — residual risks recorded by the product manager

Added after the M-01 review and the coordinated key-contract revision. These
are accepted for version 1, not solved. They are listed here so the build team
and the hotel see them before launch rather than after.

| # | Residual risk | Why it is accepted for v1 | What would remove it |
|---|---|---|---|
| R-1 | A guest who mistypes a room number they *believe* is correct will confirm it at M-01, because the modal can only re-show what was typed. | The product deliberately has no login and no room list, so nothing on the device can know the real room. Adding a re-type step or a room picker would tax every order to catch a rare slip. | Validating the room number against the hotel's real room list (backlog G-04-L5). |
| R-2 | A guest in a hotel with letters or separators in its room numbers (`A-12`, `12B`) cannot enter their real room, and a value like `12` passes every check and is delivered to a different real door. | v1 targets numeric room numbers; the alternative charset is worked out and ready but needs the hotel's answer first. | The hotel answering the OQ-01 question above, then applying the recorded changes to G-04 §5.3, M-01 and M-03. |
| R-3 | A guest who force-closes the browser mid-submission **and** then empties their cart loses the pending-submission record, so a new checkout generates a new key and could create a second order. | Both actions are needed together, and the pending record already closes the ordinary closed-tab case. Holding the key past an emptied cart would keep a stale attempt alive indefinitely. | A server-side check for a recent unresolved order from the same room before creating a new one. |
| R-4 | A reload inside the 15-second window of a cancellation that actually succeeded leaves the order correctly Cancelled but attributed to the hotel rather than the guest. | Writing the flag before the server answers would be a lie in the two other outcomes. The order's state is right; only the attribution line is wrong. | The server recording who cancelled and returning it with the status. |

---

## OQ-02 — Card refused at the door and the guest has no cash

**Type:** A (unresolved operational fact). Raised by the staff specification, SM-02 §9 item 6.

**The gap.** Payment is on delivery (locked decision 3). If the card terminal refuses the
guest's card and the guest has no cash, the order can be neither delivered nor paid. None of
the four cancellation presets in SM-01 §5.2 names a payment failure.

**What version 1 does.** The staff member cancels with the closest preset and explains in the
optional free-text line, which the guest reads verbatim on G-06. Nothing is lost, and the
cancellation reason stays honest.

**What would close it.** The hotel deciding its own policy: charge the room folio, hold the
items at reception, or cancel. That is a hotel business rule, not an interface decision, and it
may need a fifth preset or a payment status that locked decision 5 does not have. Either change
needs the owner.

---

## OQ-01 — addendum: the full change list if letters are allowed

Raised by admin screen A-07 §9 item 12. The original OQ-01 change list named G-04, M-01 and
M-03 only. If the hotel's room numbers contain letters or separators, these frozen texts also
describe the room number as digits and must change in the same pass:

| File | What describes the room as digits |
|---|---|
| `spec/screens/G-05.md` §5.2, §7.2 | "1–5 Western digits"; screen reader reads it "one digit at a time" |
| `spec/screens/G-06.md` §7, room-number row | "1–5 Western digits"; screen reader reads "room digits one at a time" |
| `spec/screens/G-07.md` §7, room-number row | "Western digits" |
| `spec/staff/staff-map.md` §4 decision 4 | "always Western digits" |

A six-character label fits every one of these boxes at its stated size, so only the wording and
the screen-reader rule change, not the layout. The admin setting that switches the format is
A-07, protected by AM-04's live test against a real room number.
