# Staff Map — Hotel In-Room Store, Staff Interface

Project: Hotel In-Room Store — **Staff** interface specification
Author: Thinker (Agent 1)
Document language: English. UI copy: Arabic + English, Arabic first.
Map status: **Draft** — first issue of a newly opened scope.

Governing documents (all binding, none re-opened here):
- `/CLAUDE.md` locked decisions 1–7. Decisions 3, 5 and 6 are the ones this interface executes.
- `/spec/screens-map.md` §4 decisions 11 and 15 (the cancellation race; "cancelled by the hotel" carries an optional one-line staff reason).
- `/spec/screens/G-01.md` §5.2 — the five canonical status labels, used **verbatim** here — and §7.2, §7.3, §7.6 (digits, currency, counts, touch targets).
- `/spec/screens/G-04.md` §7.7 — the client order key contract and the three server response kinds; §7.8 — what the submission payload carries, including the order's interface language.
- `/spec/screens/G-06.md` §5.3, §5.5, §5.6, §7.1 — the guest's view of the same order: the timeline, the cancellation line, the 120-character bound on the staff reason, and the four outcomes of a guest cancellation.

**Scope note.** `/CLAUDE.md` put the staff interface out of scope; the owner has now put it in scope. Nothing in `/spec/screens/`, `/spec/*.md` or `/wireframes/` is changed by this document. Where the staff interface needs a value the guest specification already fixed, it reuses it verbatim rather than restating it differently.

---

## 0. How to read this document

- `S-xx` = a full staff screen. `SM-xx` = a modal that opens on top of a staff screen and never has its own URL.
- IDs are **fixed** and never renumbered.
- Element IDs follow `S-01-B01` (button), `S-01-F01` (field), `S-01-C01` (content block), `S-01-S01` (section).
- Every screen file uses the same eight-part template as the guest screens, in the same order: 1 ID and name · 2 Purpose · 3 Entry and exit points · 4 Elements table · 5 Content · 6 States · 7 Field rules · 8 Acceptance criteria — followed by **§9 Decisions settled on this screen**.
- Status column: `Draft` → `In cycle` → `Approved`. Only the orchestrator changes it.

---

## 1. What this interface is, and the one screen it is built around

A staff member on a phone or a desk tablet receives the hotel's orders, accepts them, prepares them, walks them to the room, and marks them delivered while taking payment at the door. It is an internal tool used under time pressure, often at 2 AM, sometimes with a tray in one hand.

Three properties follow, and every decision in this map is traceable to one of them:

1. **There is one screen they live in.** The board (`S-01`) is what sits open on the desk. Everything else is entered from it and returns to it. A staff member who learns one screen can run a shift.
2. **A wrong room is the failure this product was designed against.** The guest side shows the room number at 64 px before sending (M-01) and at 28 px while tracking (G-06 §5.4). The staff side is where a wrong room becomes a knock on the wrong door, so §4 decision 4 fixes its treatment here.
3. **Accepting is consequential.** The moment staff accept, the guest's cancellation window closes for good (locked decision 6, G-06 §5.6). The interface treats acceptance as an act performed on the order's own screen, never from a moving list (§4 decision 6).

---

## 2. Screen and modal inventory

### 2.1 Staff screens

| ID | Name (English) | Name (Arabic) | Purpose (one line) | Why it exists | Status |
|---|---|---|---|---|---|
| S-01 | Orders board | لوحة الطلبات | The live queue: every order that still needs staff, grouped by status, with the room number as the largest text on each card; plus a "Done today" tab for look-ups. | The one screen they live in. Without it nobody knows an order arrived. | Draft |
| S-02 | Order detail | تفاصيل الطلب | One order in full: room number at 64 px, what to collect, notes, what to take at the door and what change to bring, and the single button that moves it to the next status. | Every consequential act happens here, after the room number and the items have been read. | Draft |
| S-03 | Staff sign-in | دخول الموظف | A 4-digit staff PIN that names who is on shift; second variant when the device is not linked to the hotel. | Staff actions are attributable and cash is collected; see §4 decision 2. It is also the tap that unlocks audio for the arrival chime. | Draft |

### 2.2 Modals

| ID | Name (English) | Name (Arabic) | Opens on top of | Purpose (one line) | Status |
|---|---|---|---|---|---|
| SM-01 | Cancel order | إلغاء الطلب | S-02 | Cancels an order with a **required** reason — four preset reasons plus an optional 60-character line — which the guest reads verbatim on G-06 §5.3. | Draft |
| SM-02 | Confirm delivery and payment | تأكيد التوصيل والدفع | S-02 | The only place money is stated: what to collect, in which method, and what change to give, confirmed at the door before the order becomes Delivered. | Draft |

**Totals: 3 screens, 2 modals.**

### 2.3 Things that are deliberately NOT separate screens or modals

| Item | Where it lives | Decision |
|---|---|---|
| Past orders / history | "منتهية اليوم / Done today" tab on S-01 | A second tab on the board, not a fourth screen: the card, the sorting rules and the route into S-02 are already specified once (§4 decision 9). |
| Accepting an order | S-02 only | No accept button on any list row and no confirmation modal for it (§4 decision 6). |
| Moving an order to "On the way" and to "Delivered" | S-02 only | One rule for all status changes, so there is nothing to learn per status (§4 decision 6). Delivery additionally passes through SM-02 because that is where money changes hands. |
| "The guest cancelled before you accepted" | Banner state on S-02 (`S-02-C06`) and a marked card on S-01 for 60 seconds | The mirror of the guest's own treatment of the same race (G-06 §5.6 uses a banner, not a modal) — map §4 decision 11 (guest map) and §4 decision 8 here. |
| New-order alert | Sound + count on S-01 | No browser notifications, no push, no separate alert screen (§4 decision 7). |
| End of shift | Text button in the S-01 header, leading to S-03 | No confirmation modal: the cost of a mis-tap is re-typing four digits, and S-03 keeps showing the active-order count and keeps chiming (§4 decision 3). |
| Staff account management, product/stock editing, prices, reports, guest history | Nowhere | Out of scope: this interface fulfils orders. The admin dashboard remains out of scope per `/CLAUDE.md`. |

---

## 3. Navigation flow

### 3.1 End-to-end (ASCII)

```
 [Staff opens the staff URL on the desk tablet or a phone]
              │
    ┌─────────┴───────────────┐
    │ device linked            │ device not linked
    ▼                          ▼
 ┌──────┐                  ┌───────────────────┐
 │ S-03 │                  │ S-03 variant B    │
 │ PIN  │                  │ "Device not linked"│
 └──┬───┘                  └───────────────────┘
    │ correct PIN                (no PIN field; no way forward
    ▼                             from this interface)
 ┌───────────────────────────────────────────────┐
 │ S-01  Orders board        ← the screen they   │
 │  tabs: [نشطة / Active] [منتهية اليوم / Done]  │
 │  groups in Active, top to bottom:             │
 │    جديد / New                                 │
 │    تم القبول وجارٍ التحضير / Accepted & prep.  │
 │    في الطريق / On the way                     │
 └───┬─────────────┬──────────────┬──────────────┘
     │             │              │
     │ tap card    │ "إنهاء       │ session expired (12 h)
     │             │  الوردية"    │  → bar + "Sign in to continue"
     ▼             ▼              └──────► S-03
 ┌──────────┐   ┌──────┐
 │  S-02    │   │ S-03 │
 │ Order    │   └──────┘
 │ detail   │
 └──┬───┬───┴────────────────────────────────┐
    │   │                                     │
    │   ├── primary action, by status:        │
    │   │    New  ──► Accepted & preparing    │
    │   │    Accepted & preparing ──► On the way
    │   │    On the way ──► SM-02 ──► Delivered
    │   │                                     │
    │   ├── "إلغاء الطلب / Cancel order" ──► SM-01
    │   │        ├── reason chosen + confirm ──► S-02 shows Cancelled
    │   │        └── "رجوع / Back" ──► closes, nothing changed
    │   │                                     │
    │   └── accept refused because the guest  │
    │       cancelled first ──► S-02 shows    │
    │       Cancelled + banner S-02-C06       │
    │                                         │
    └── "العودة إلى اللوحة / Back to the board" ──► S-01
```

### 3.2 Per-screen "reachable from / leads to"

| ID | Reachable from | Leads to (action → destination) |
|---|---|---|
| S-01 Orders board | S-03 after a correct PIN; S-02 → back arrow or "Back to the board"; browser reload while a session is live | Tap an order card → S-02; tap a tab → the other tab, same screen; "إنهاء الوردية / End shift" → S-03; "تسجيل الدخول للمتابعة / Sign in to continue" (session-expired bar) → S-03; language toggle → same screen, other language; sound toggle → same screen, sound on/off |
| S-02 Order detail | S-01 → tap a card (Active or Done today); browser reload or a direct URL on an order | Primary action → same screen, next status (On the way → SM-02 first); "إلغاء الطلب / Cancel order" → SM-01; back arrow / "العودة إلى اللوحة / Back to the board" → S-01 at the tab and scroll position it was left at; "تسجيل الدخول للمتابعة / Sign in to continue" (session expired) → S-03; error state "الطلب غير موجود / Order not found" → "Back to the board" → S-01 |
| S-03 Staff sign-in | The staff URL on a device with no live session; S-01 → "End shift"; S-01 or S-02 → "Sign in to continue"; a session that reached its 12-hour limit | Correct PIN → S-01, Active tab, top of the list (or back to the S-02 the staff member was on, when S-03 was reached from the session-expired bar on S-02); variant B (device not linked) leads nowhere from this interface |
| SM-01 Cancel order | S-02 → "إلغاء الطلب / Cancel order" (statuses New, Accepted & preparing, On the way) | Confirm → request sent. Three outcomes: cancelled → closes, S-02 shows Cancelled with the reason; the order was already Delivered or already Cancelled → closes, S-02 re-renders in that status with its banner; failure → the modal stays open with its error line and its two buttons. "رجوع / Back" or backdrop tap → closes, nothing changed |
| SM-02 Confirm delivery and payment | S-02 → the primary action while the status is On the way | Confirm → request sent. Three outcomes: delivered → closes, S-02 shows Delivered; the order was cancelled meanwhile → closes, S-02 shows Cancelled with its banner; failure → the modal stays open with its error line. "رجوع / Back" or backdrop tap → closes, the order stays On the way |

### 3.3 Back-navigation and history rules (apply to every staff screen)

1. S-02 has a back arrow in its header; the browser back gesture does exactly what it does. S-01 and S-03 have no back arrow.
2. Modals are not history entries. Browser back while SM-01 or SM-02 is open closes it, which equals its "رجوع / Back" action. No staff modal is undismissable: neither of them performs an action by being open.
3. S-01 remembers which tab was active and the scroll position; returning from S-02 restores both.
4. A browser reload never loses staff work, because nothing is typed on a staff screen except the PIN on S-03 and the optional reason line in SM-01, and neither survives — nor needs to.
5. Language: the toggle lives in the S-01 header and on S-03. Arabic (RTL) on first open; the choice is saved on the device.

---

## 4. Decisions made in this map that the brief did not settle

Each of these is a decision, not a suggestion. They bind every staff screen file.

1. **Three screens and two modals, and no more.** Every screen a busy staff member must learn is a cost paid at 2 AM. Anything that could be a tab, a group, a state or a line of copy was made one.
2. **Staff do identify themselves: a 4-digit PIN per staff member, entered once per shift on S-03.** The guest is anonymous because the guest is a customer whose identity the hotel does not need; a staff member performs acts that cannot be undone — closing the guest's cancellation window, cancelling an order the guest is waiting for, and collecting cash at a door — and a hotel must be able to say who did each one. The PIN is the lightest identification that achieves it: four digits, one field, one hand, no email, no password, no per-device account. The name of the person on shift is printed in the board header so nobody is unknowingly acting under someone else's name.
3. **No idle lock, and the session ends only by "End shift" or after 12 hours.** A board that locks itself is a board that stops showing orders, and a missed order is a worse failure than a mis-attributed tap on a device that lives in a staff-only area. At 12 hours the board keeps rendering, keeps refreshing and keeps chiming, but every action is replaced by "تسجيل الدخول للمتابعة / Sign in to continue" — so an expired session can never silently swallow an order.
4. **The room number is the largest text on every staff surface that shows one, and it is never the second-largest number on its line.** On a board card it is **40 px bold**; on S-02 it is **64 px bold**, the same size the guest saw at confirmation (M-01); in SM-02, at the door, it is **40 px bold** above the amount. It is never truncated, never abbreviated, never rendered beside a number of equal or greater size (order number, price, elapsed time), always Western digits with leading zeros kept, always laid out left-to-right in both languages, contrast at least 7:1. 64 px is reserved for S-02 rather than the board because a 64 px card fits two orders on a screen and a staff member who must scroll to see the queue misses orders — a different failure, traded knowingly.
5. **The five canonical status labels of G-01 §5.2 are used verbatim wherever a status is named** — جديد / New, تم القبول وجارٍ التحضير / Accepted & preparing, في الطريق / On the way, تم التوصيل / Delivered, ملغى / Cancelled. Action buttons are verbs, and each one prints the resulting canonical label on its second line ("الحالة بعد الضغط: … / Status after tapping: …"), so a verb is never mistaken for a status name.
6. **Every status change happens on S-02 and nowhere else.** No accept button on a list row, no swipe gesture, no long-press: a list that refreshes under a finger is the classic way to accept the wrong order, and every step of the job requires reading the room and the items anyway. One rule, no exceptions, nothing to learn per status.
7. **Accepting has no confirmation modal.** Its consequence is carried by where it lives (the order's own screen, under a 64 px room number and the full item list) and by the ruled helper line under the button: "بقبولك لن يستطيع الضيف إلغاء الطلب / Once you accept, the guest can no longer cancel it". A modal on the most frequent action of the night is a tax paid on every correct accept to slow a rare wrong one; the read-before-act placement prevents more errors at lower cost. There is no "undo accept": an order accepted by mistake is cancelled through SM-01 with a reason, which is what the guest is honestly told.
8. **The cancellation race is decided by the server, and staff are told plainly.** The board does not pre-filter and does not guess. If the guest cancelled first, the accept request is refused, S-02 re-renders as Cancelled and shows the banner "ألغى الضيف هذا الطلب قبل قبولك له — لا تُحضّره / The guest cancelled this order before you accepted it — do not prepare it". On S-01, a card that the guest cancelled stays **in place for 60 seconds**, marked and no longer openable for action, before it moves to "Done today", so a staff member who glanced at the board and walked to the store room finds out why it is gone.
9. **"Done today" is a tab, not a screen, and "today" ends at 04:00 local time.** The hotel day boundary is 04:00 so a night shift's own orders stay together in one list. The tab holds orders that reached Delivered or Cancelled since the last 04:00, newest first, capped at 50 rows with no pagination in version 1.
10. **The board is FIFO, oldest first, and cards never move under a finger.** Within each group the oldest order is at the top, so a new arrival is appended at the bottom of its group and never pushes an existing card. Re-ordering and removals caused by a refresh are never applied while a touch is in progress.
11. **Refresh cadences, decided with numbers.** S-01 refreshes the whole board every **15 seconds**, measured from the end of the previous attempt, with a **10-second** timeout. S-02 refreshes its one order every **10 seconds** with the same timeout. Both pause while the browser tab is hidden and send one immediate request when it returns. The guest's G-06 polls every 20 seconds because a guest watches one order; staff hold the hotel's whole queue, and a New order that has waited a minute is a guest standing in a room.
12. **Staleness is stated with a number, not hidden.** When the most recent refresh failed, the board shows "تعذّر تحديث اللوحة — آخر تحديث منذ {N} / Could not refresh the board — last updated {N} ago", and after **2 minutes** without a successful refresh the line becomes a dark-filled bar. G-01 and G-07 stay silent in the same case because they are pointers; a staff member acting on a stale queue must know how stale it is.
13. **A New order older than 5 minutes is Late.** It gains the chip "متأخر / Late" and it is what makes the chime repeat. Five minutes is the point at which a guest who ordered a bottle of water starts wondering whether the QR code worked.
14. **The new-order alert is a sound plus a count on the board, and nothing else.** A 2-second chime when the board first sees an order it has not shown before, and a repeat every **60 seconds** while any order is Late (decision 13). No browser notifications, no push, no vibration, no e-mail: version 1 requires the staff device to stay awake on the board. The sound toggle is visible at all times, and a muted board says so in words, so no device is ever silently mute.
15. **A cancellation reason is required of staff, and preset reasons are sent in the guest's language.** G-06 §5.3 prints the reason verbatim and never translates it, so a free-text-only box would show Arabic staff shorthand to an English-reading guest, and a staff member in a hurry would leave it empty. SM-01 offers four presets plus an optional 60-character line; the app sends the preset text **in the language the order was submitted in** (G-04 §7.8 carries it in the payload), and the free line exactly as typed. The combined string never exceeds the 120 characters G-06 §5.3 bounds.
16. **Delivery passes through SM-02 because that is the only moment money moves.** The modal states the amount to collect, the method, and the change to bring back, and its confirm button is what sets Delivered. Version 1 records no "method actually used" and no collected amount: the order's stored payment choice is what the hotel reconciles.
17. **Change is computed and printed, never left as arithmetic at the door.** For cash with a stated amount: change = amount − total, two decimals. Equal amounts print "المبلغ مطابق — لا يوجد باقٍ / Exact amount — no change". A cash order with no stated amount, or with an amount not greater than the total, prints "نقدًا — لم يحدّد الضيف المبلغ / Cash — the guest did not state an amount" with the instruction to carry change. A card order prints "بطاقة — أحضر جهاز الدفع / Card — bring the card terminal".
18. **Staff never edit an order.** No adding items, no changing quantities, no changing the room number, no editing notes, no changing the payment method. The guest side offers no editing either (guest map §3); an order that is wrong is cancelled with a reason and re-placed by the guest. This keeps one truth for both sides.
19. **Staff see no guest identity, because there is none.** An order carries a room number, contents, notes, a payment choice and times. There is no guest name, no phone number, no device identifier and no order history per guest anywhere in this interface (locked decision 4).
20. **Action requests are idempotent by target status.** Every status change sends the order number and the target status; a target the order already holds is accepted with no second effect. A staff member who taps twice, or retries after a timeout, can never double-advance an order. Action timeout is **15 seconds**; on failure the button returns to its normal state and an inline line says the update did not reach the system.
21. **Arabic (RTL) is the default staff language too, with an English toggle** in the S-01 header and on S-03, saved on the device. The hotel's staff are the same population locked decision 7 was written for, and a spec with one language rule has one fewer thing to get wrong.
22. **The staff interface runs in a browser, with no download and no app store**, on a device the hotel links once. An unlinked device gets S-03 variant B and no way forward from this interface — there is deliberately no self-service way to turn a random phone into a staff terminal.

---

## 5. Coverage check (against the task)

| Requirement | Where it is covered |
|---|---|
| Seeing new orders arrive | S-01: the New group, the arrival chime, the count, the Late chip |
| Opening one order | S-01 card → S-02 |
| Accepting it | S-02 primary action in status New, with its consequence line |
| Moving it through the statuses | S-02 primary action: New → Accepted & preparing → On the way → (SM-02) → Delivered |
| Seeing the room number | S-01 card at 40 px; S-02 at 64 px; SM-02 at 40 px (§4 decision 4) |
| Seeing what to collect | S-02 items section, quantity first, plus the notes block |
| Payment and change (locked decision 3) | S-01 payment chip; S-02 payment block; SM-02 at the door (§4 decisions 16, 17) |
| Cancelling with a reason | S-02 → SM-01, reason required, guest reads it on G-06 (§4 decision 15) |
| Nothing to do | S-01 empty state, both tabs |
| Staff identification | S-03, 4-digit PIN; name in the board header (§4 decision 2) |
| The cancel-before-accept race | S-02 banner + the 60-second marked card on S-01 (§4 decision 8) |
| The five statuses, verbatim | §4 decision 5, applied in every screen file |

---

## 6. Deferred here, for the owner to route (not written into `/spec/backlog.md`, which is frozen)

| Item | Why it is deferred |
|---|---|
| One-tap "On the way" for several prepared orders at once | Batch actions need a selection model; §4 decision 6 keeps one rule for version 1. |
| A pick-list with checkboxes on S-02 | Needs saved per-item state and a rule for a half-picked order. |
| Recording the payment method actually used, and the amount collected | Reconciliation feature; version 1 states what to collect and records nothing new (§4 decision 16). |
| History older than the current hotel day | Needs search and paging (§4 decision 9 caps the tab at 50 rows). |
| Browser or push notifications when the board is not in the foreground | Version 1 requires the board to stay awake (§4 decision 14). |
| Per-status timestamps shown to staff and to guests | The guest side already deferred them (G-06 §9 item 5). |
| A printed or on-screen end-of-shift summary | Reporting belongs to the admin dashboard, which is out of scope. |
