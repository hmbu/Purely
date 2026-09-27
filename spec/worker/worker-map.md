# Worker Map — Hotel In-Room Store, Delivery Worker App

Project: Hotel In-Room Store — **Delivery worker** interface specification
Author: Thinker (Agent 1)
Document language: English. UI copy: Arabic + English, Arabic first.
Map status: **Approved** — the owner delegated the decisions, and every screen file has been reconciled with the built and tested prototype (`worker/`). The prototype is the source of truth for everything the binding split design decided. A production requirement the prototype does not build is kept only where it is sound, and is marked **Not in the prototype — build as specified.**

Governing documents (all binding, none re-opened here):
- `/CLAUDE.md` locked decisions 1–7. Decisions 3, 5 and 6 are the ones this app executes; decision 6 is why a worker never accepts and never cancels.
- `/docs/operations.html` — sections "الأدوار", "رحلة الطلب", "حالات الطلب", "التوزيع على العمّال", "الدفع عند الباب". It is the reference for roles, assignment, statuses and payment at the door.
- The owner's split decision of 2026-09-27 ("the room service desk manages orders; orders must not go straight to the delivery person"), recorded as **Amendment A2** in `/spec/staff/staff-map.md`.
- `/spec/staff/staff-map.md` §4 decisions 3–5, 10–14, 17–22 and the decisions 23–31 of Amendment A2.
- `/spec/staff/screens/S-02.md` §5.2, §5.3, §5.5 and `/spec/staff/screens/SM-02.md` — the order detail and the delivery sheet the worker screens are ported from.
- `/spec/screens/G-01.md` §5.2 (the five canonical status labels, used verbatim), §7.2, §7.3, §7.6.

---

## 0. How to read this document

- `W-xx` = a full worker screen. `WM-xx` = a bottom sheet that opens on top of a worker screen and never has its own URL.
- IDs are **fixed** and never renumbered. An ID used in an earlier draft and not built is retired, never reused for something else.
- Element IDs follow `W-01-B01` (button), `W-01-F01` (field), `W-01-C01` (content block), `W-01-S01` (section). They match the `data-el` attributes of the prototype.
- Every screen file uses the eight-part template of `/CLAUDE.md`, in this order: 1 ID and name · 2 Purpose · 3 Entry and exit points · 4 Elements table · 5 Content · 6 States · 7 Field rules · 8 Acceptance criteria — followed by **§9 Decisions settled on this screen**.
- "The desk" means the room service desk app (`staff/`, screens S-01, S-02, S-03, SM-01, SM-02, SM-03), used by the supervisor. "The worker app" means this app (`worker/`), used on a delivery worker's own phone.

---

## 1. What this app is

A delivery worker carries their own phone. When the supervisor at the room service desk accepts an order, they assign it to a worker by name in the same action (desk SM-03). The order then appears on that worker's phone, with a chime, and only on that worker's phone. The worker prepares it, taps "خرجت بالطلب / I'm on my way", walks it to the room, and at the door taps "تم التوصيل واستلام المبلغ / Delivered & paid" and confirms the handover and the payment (WM-01). The order is then Delivered.

Four properties follow, and every decision in §4 traces to one of them:

1. **The worker sees their own orders and nothing else.** No queue, no other worker's orders, no New orders, no names of colleagues. The desk is the only place the whole hotel's queue exists (operations.html, "التوزيع على العمّال" rule 1).
2. **The worker moves an order forward; the desk decides everything else.** Accepting, assigning, reassigning and cancelling are desk acts. The worker has exactly two acts: "on my way" and "delivered and paid" (operations.html rules 4, 5).
3. **The worker's phone is where a wrong door is knocked on.** The room number is the largest text on every worker surface that shows one, with the sizes of the desk (staff-map §4 decision 4).
4. **The phone is in a pocket, in a lift, on a weak connection.** Every screen says when it could not refresh, and no action is ever assumed to have happened when it did not reach the system.

---

## 2. Screen and modal inventory

### 2.1 Worker screens

| ID | Name (English) | Name (Arabic) | Purpose (one line) | Why it exists | Status |
|---|---|---|---|---|---|
| W-01 | My orders | طلباتي | The live list of the orders assigned to this worker, oldest first, with the room number as the largest text on each card, a chime when a new one arrives, a notice when one leaves, and a collapsed list of today's deliveries. | The screen the worker lives in during a shift. Without it an assignment is never noticed. | **Approved** |
| W-02 | Order detail | تفاصيل الطلب | One assigned order in full: room at 64 px, guest mobile to call, what to prepare, notes, what to collect and what change to bring, and the one button that moves it forward. | Every act the worker performs happens here, after the room and the items have been read. | **Approved** |
| W-03 | Delivery worker sign-in | دخول المندوب | A 4-digit worker PIN that names the worker and starts their shift, so the desk can assign orders to them. | The desk can assign only to a worker it knows is on shift; the PIN is what puts them on shift. It is also the touch that arms audio for the chime. | **Approved** |

### 2.2 Modals (bottom sheets)

| ID | Name (English) | Name (Arabic) | Opens on top of | Purpose (one line) | Status |
|---|---|---|---|---|---|
| WM-01 | Confirm delivery and payment | تأكيد التوصيل والدفع | W-02 | At the door: the room, the payment method, the amount to collect and the change to give, confirmed on one tap that records the order as Delivered. Desk SM-02 ported with its copy. | **Approved** |
| WM-02 | End shift | إنهاء الوردية | W-01 | Confirms ending the shift; warns, without refusing, when the worker still holds orders. | **Approved** |

**Totals: 3 screens, 2 modals.**

### 2.3 Things that are deliberately NOT separate screens, modals or controls

| Item | Where it lives | Decision |
|---|---|---|
| Cancelling an order | Nowhere in the worker app | Workers never cancel (§4 decision 2). W-02 and WM-01 carry the one-line hint that sends the worker to the desk. |
| Accepting, assigning, reassigning | Nowhere in the worker app | Desk acts only (desk S-02 + SM-03). |
| An order that left this phone (reassigned, cancelled by the desk, delivered by the desk for the worker) | A notice at the top of W-01 (W-01-C05) that stays until "فهمت / Got it" (W-01-B04) | No separate "cancelled" group and no timer: the notice names the order and the reason and tells the worker what to do with anything in hand (§4 decision 7). If W-02 was open on that order, it returns to W-01 at once. |
| Today's deliveries | A collapsed section at the bottom of W-01, "تم التوصيل اليوم / Delivered today" (W-01-S03) | A read-only list of room, order number and time, so a worker can answer "did I deliver 305?". No money on it; cash reconciliation is the admin report's job. |
| New-assignment alert | Sound + the "جديد / New" marker on the card | Same chime as the desk; no push, no browser notification (§4 decision 6). |
| Contacting the desk | The hint line on W-02 and WM-01 (plain text) | The desk's phone number is not stored in the system in version 1; staff know it (§6). |

---

## 3. Navigation flow

### 3.1 End-to-end (ASCII)

```
 [Worker opens the worker URL on their own phone]
              │
              │ no live worker session            (Not in the prototype: a phone not
              ▼                                     linked to the hotel shows W-03
 ┌──────────────────────────┐                      variant B and has no way forward)
 │ W-03  دخول المندوب        │
 │ 4-digit PIN              │── supervisor PIN → stays, with its message
 └──┬───────────────────────┘
    │ correct WORKER PIN (shift starts)
    ▼
 ┌─────────────────────────────────────────────┐
 │ W-01  طلباتي / My orders                     │
 │   C05 notices (until "فهمت / Got it")        │
 │   للتوصيل الآن — {n} / To deliver now — {n}  │
 │     one list, oldest order first             │
 │   تم التوصيل اليوم ({n}) — collapsed          │
 └───┬───────────────────────┬─────────────────┘
     │ tap card              │ "إنهاء الوردية / End shift"
     ▼                       ▼
 ┌──────────┐          ┌────────────────────────┐
 │  W-02    │          │ WM-02 إنهاء الوردية؟    │── "رجوع / Back" → W-01
 │ Order    │          │ (+ warning if orders   │
 │ detail   │          │   are still held)      │── "إنهاء الوردية" → W-03
 └──┬───┬───┴───────┐  └────────────────────────┘
    │   │           │
    │   ├── B02, by status:
    │   │    Accepted & preparing ── "خرجت بالطلب / I'm on my way" ──► On the way
    │   │    On the way ── "تم التوصيل واستلام المبلغ / Delivered & paid" ──► WM-01 ──► Delivered
    │   ├── guest mobile ──► phone dialer (tel:)
    │   └── order reassigned / cancelled / delivered by the desk ──► W-01 with a C05 notice
    │
    └── back arrow / "العودة إلى طلباتي / Back to my orders" ──► W-01

 Anywhere: the shift ended elsewhere (another tab or phone) ──► W-03
```

### 3.2 Per-screen "reachable from / leads to"

| ID | Reachable from | Leads to (action → destination) |
|---|---|---|
| W-01 My orders | W-03 after a correct worker PIN; W-02 → back arrow, "العودة إلى طلباتي / Back to my orders", or the order leaving this phone; browser reload while a worker session is live | Tap an order card → W-02; "فهمت / Got it" on a notice → same screen, notice removed; "تم التوصيل اليوم / Delivered today" → same screen, section opened or closed; "إعادة المحاولة / Try again" → same screen, one refresh; "إنهاء الوردية / End shift" → WM-02; language toggle → same screen; shift found ended → W-03 |
| W-02 Order detail | W-01 → tap a card; browser reload or the order URL, for an order assigned to this worker | B02 → same screen, next status (On the way → WM-01 first); guest mobile → the phone's dialer; back arrow / "العودة إلى طلباتي / Back to my orders" → W-01; the order is reassigned, cancelled, delivered by the desk, not this worker's, or not found → W-01 with a C05 notice; shift found ended → W-03 |
| W-03 Delivery worker sign-in | The worker URL on a phone with no live worker session; WM-02 confirmed; any screen when the shift is found ended | Correct worker PIN → W-01. Wrong PIN, supervisor PIN, lockout or failure → stays with its message |
| WM-01 Confirm delivery and payment | W-02 → B02 while the status is On the way | Confirm → one request. Outcomes: delivered → closes, W-02 shows its delivered record; cancelled, reassigned or not found meanwhile → closes, W-02 returns to W-01 with the C05 notice; failure → stays open with its error line. "رجوع / Back", backdrop, browser back or Escape → closes, the order stays On the way |
| WM-02 End shift | W-01 → "إنهاء الوردية / End shift" | "إنهاء الوردية / End shift" → the shift ends and the phone signs out → W-03. "رجوع / Back", backdrop, browser back or Escape → closes, still on shift |

### 3.3 Back-navigation and history rules

1. W-02 has a back arrow; the browser back gesture does exactly what it does. W-01 and W-03 have no back arrow.
2. WM-01 and WM-02 have no URL. Each pushes one same-URL history entry only so that browser back closes it, which equals its "رجوع / Back" (ignored while WM-01's request is in flight).
3. W-01 opens at the top of the list, including on return from W-02.
4. Nothing is typed in the worker app except the PIN on W-03, so a reload never loses work. A reload does lose the W-01 notices (they are held in page memory).
5. Language: the toggle lives in the W-01 header and on W-03. Arabic (RTL) on first open; the choice is saved on the device, **separately from the desk's saved language** (§4 decision 13).

---

## 4. Decisions made in this map

Each is a decision, not a suggestion. They bind every worker screen file.

1. **A worker sees only the orders assigned to them.** An order is on W-01 when, and only when, its `assignedTo` is the signed-in worker and its status is تم القبول وجارٍ التحضير / Accepted & preparing or في الطريق / On the way. A New order is never on a worker's phone: the desk accepts and assigns in one action. A worker action on an order no longer assigned to them is refused ("not mine"), and W-02 opened for such an order returns to W-01 with a notice.
2. **Workers never cancel.** No cancel control exists anywhere in the worker app. When the guest refuses the order at the door or cannot pay, the worker calls the desk and the desk cancels with a reason (desk SM-01). W-02 and WM-01 print the ruled hint, verbatim: "الضيف رفض الطلب أو لا يوجد دفع؟ اتصل بمكتب الروم سيرفس ليلغيه / Guest refused or can't pay? Call the room service desk to cancel".
3. **The worker app has its own session, separate from the desk's.** Signing in or out on the worker app never signs the desk in or out, and the reverse, even in a browser that holds both (the prototype's `workerSession` vs `session`). **The worker app accepts worker PINs only**; a supervisor PIN typed on W-03 is refused with "هذا تطبيق المندوب. المشرف يستخدم تابلت مكتب الروم سيرفس / This is the delivery worker app. Supervisors use the room service desk tablet". It is **not counted** as a wrong attempt, and it resets the wrong-attempt count as a correct PIN does. The desk accepts supervisor PINs only (S-03 Amendment A2).
4. **Signed in = on shift.** A correct worker PIN starts the worker's shift (the desk's picker then shows them as "في الوردية / On shift"); signing in again restarts the shift's start time. "إنهاء الوردية / End shift" on W-01 opens WM-02; confirming ends the shift and signs the phone out. **Ending the shift is allowed while the worker still holds orders**: WM-02 warns that they stay assigned to the worker until the desk reassigns them, and asks the worker to tell the desk. A session is live only while its member is a worker **and** is on shift, so a shift ended on another tab or phone signs this phone out at its next check (within one second in the prototype).
   - **Not in the prototype — build as specified.** The shift and the session also end **12 hours** after sign-in (staff-map §4 decision 31): the desk treats a shift that started 12 or more hours ago as off shift even if the phone never said so, and the phone, at its next check, ends its session and shows W-03.
5. **One phone per worker at a time is not enforced.** A worker signed in on two phones sees the same orders on both; actions are idempotent by target status (staff-map §4 decision 20), so nothing is done twice. Whichever phone ends the shift ends it for the worker; the other phone finds the shift ended and shows W-03. In the prototype, one browser holds one worker session.
6. **A new assignment reaches the phone live, with the desk's chime.** W-01 refreshes on every change notification the system sends, on becoming visible, and, as a fallback, every **15 seconds** measured from the end of the previous attempt (skipped while the page is hidden), with a **15-second** timeout and never two requests in flight. A new assignment therefore appears with no reload. The chime is the desk's two-note tone, about 2 seconds, played **once per refresh** that contains at least one active order that was not in the previous refresh — a new assignment, or a reassignment from a colleague. The first successful refresh after the page loads or after a sign-in is the baseline and plays nothing. **There is no repeating chime** on the worker phone. A browser plays sound only after a touch or a key press on the page: typing the PIN on W-03 is that touch; after a reload, W-01 shows "المس الشاشة مرة واحدة لتفعيل صوت الطلبات الجديدة / Touch the screen once to turn on the new-order sound" until the worker touches the screen. **There is no sound toggle on the worker phone**: the chime is the only alert a worker has, and a muted phone misses orders.
7. **An order that leaves this phone is never removed silently.** When a refresh shows that an order that was active on this phone is no longer active and mine — reassigned to someone else, cancelled by the desk, or recorded as delivered by the desk on the worker's behalf — its card disappears and a notice (W-01-C05) appears at the top of W-01, naming the order and room and the reason, with the cancellation reason when there is one and, for a reassignment or a cancellation, "لا تتوجّه به إلى الغرفة. إن كان معك فأعده إلى الرف. / Do not take it to the room. If you have it with you, return it to the shelf." It stays until the worker taps "فهمت / Got it" (W-01-B04). There is no timer and no chime for it; the notice is announced to screen readers. The colleague's name is never shown. If W-02 is open on that order, it returns to W-01 at once. The notices are held in page memory: a reload clears them.
8. **The room number is the largest text on every worker surface that shows one**, with the desk's sizes and rules (staff-map §4 decision 4): **40 px bold** on a W-01 card, **64 px bold** on W-02, **40 px bold** in WM-01; always Western digits, leading zeros kept, laid out left-to-right in both languages, never wrapped, never truncated.
9. **Money appears only on W-02 and in WM-01.** A W-01 card names the payment method ("بطاقة / Card" or "نقدًا / Cash") so the worker takes the terminal or change, but prints no total, no amount and no change. The "Delivered today" rows print no money either. The amounts, and the change to bring, are on W-02 in S-02 §5.5's four cases verbatim, and at the door in WM-01 in SM-02 §5.3's four cases verbatim.
10. **The guest's mobile number is on W-02 only, as a `tel:` link** (operations.html "الدفع عند الباب" rule 6), under the label "جوال الضيف / Guest mobile". Never on W-01 cards, never in WM-01. No guest name, no device identifier, anywhere (locked decision 4).
11. **The worker's two verbs, and the status labels.** The five canonical labels of G-01 §5.2 are used verbatim wherever a status is named. The worker's buttons are "خرجت بالطلب / I'm on my way" (writes في الطريق / On the way) and "تم التوصيل واستلام المبلغ / Delivered & paid" (opens WM-01, whose confirm "سلّمتُ الطلب واستلمتُ المبلغ / Handed over and payment taken" writes تم التوصيل / Delivered). Each prints its result on line 2, as on the desk (staff-map §4 decision 5).
12. **Actions are idempotent, bounded, and never assumed** — staff-map §4 decision 20, unchanged: every action carries the order number and the target status, timeout **15 seconds**, no offline queue, no optimistic status change, no automatic retry. When the desk already moved the order to the target status, the worker's tap is treated as done and W-02 says the desk changed it.
13. **Language is saved on the device, separately from the desk's.** Arabic (RTL) on first open, English toggle on W-01 and W-03 (locked decision 7). It is a separate device setting because in real use they are separate devices; in the prototype, a shared browser therefore does not flip the desk's language when a worker switches theirs.
14. **The worker never edits an order** (staff-map §4 decision 18): no items, no quantities, no room, no notes, no payment method.
15. **Not in the prototype — build as specified. The worker's phone must be linked to the hotel**, like the desk device (staff-map §4 decision 22). An unlinked phone shows W-03 variant B with the desk's exact copy (S-03-C08) and no way forward. A worker's own phone shows room numbers and guest mobile numbers; a random phone must not.
16. **Names.** The worker's own name on W-01 prints the roster string exactly as stored (for example "خالد / Khalid"). No other person's name appears in the worker app.
17. **Not in the prototype — build as specified. The screen stays awake while on shift.** W-01 and W-02 request the browser's screen wake lock while visible with a live worker session, and release it on W-03. Where the browser does not support it, nothing is shown about it. Version 1 has no push and no browser notification (staff-map §4 decision 14, applied here).
18. **The guest never sees the worker.** Nothing about assignment, reassignment or the worker's name reaches any guest screen; the guest sees the five canonical statuses only (design rule 7).
19. **The hotel day starts at 04:00** (staff-map §4 decision 9): "Delivered today" lists this worker's orders delivered since the most recent 04:00 local time.

---

## 5. Build notes — how the screens map onto the shared data layer (prototype)

The screen files speak of "the system", "a request" and "a change notification", as the desk files do. In the prototype these are the calls of `/shared/hotel-db.js`; the worker app wraps them in promises with a 15-second timeout (`worker/js/core.js`, `Server`) so the in-flight and failure states exist, and a demo strip can cut the connection.

| Screen behaviour | Prototype call |
|---|---|
| Worker session on this phone | `HotelDB.staff().workerSession` `{memberId, since}` — **never** `session`, which is the desk's. Live only while the member's role is `worker` and `shift[memberId]` exists |
| Sign in / End shift | `HotelDB.startShift(memberId)` then `workerSession` written, on a correct worker PIN; `HotelDB.endShift(memberId)` then `workerSession` cleared, on WM-02's confirm |
| Role check at sign-in | The member found for the PIN must have `role === 'worker'`; `supervisor` → the supervisor message |
| Wrong-attempt lockout | 5 wrong PINs in a row lock sign-in for 60 seconds (`roomstore.workerapp.auth` in the prototype; the server's count in production) |
| My orders | Orders with `assignedTo === me` and status `Accepted` or `OnTheWay`, sorted by `createdAt` then order number; delivered today = `assignedTo === me`, status `Delivered`, its Delivered log row at or after the last 04:00 |
| Why an order left | Compared with the previous refresh: `assignedTo` changed → reassigned; `Cancelled` → cancelled; `Delivered` with a log row not by me → delivered by the desk |
| "I'm on my way" / "Delivered" | `HotelDB.setStatus(orderNo, 'OnTheWay' \| 'Delivered', {staffId: me, at})`, sent only after a fresh read confirms `assignedTo` is still this worker (the server's check, §4 decision 1) |
| Live arrival and removal | `HotelDB.onChange(fn)`, plus the 15-second poll and a refresh on becoming visible |
| "New" marker | The moment this worker last left W-01, saved per worker on the device (`roomstore.workerapp.seen`) |

---

## 6. Deferred here, for the owner to route

| Item | Why it is deferred |
|---|---|
| A cash-collected total on the worker's phone | Reconciliation belongs to the admin report (operations.html "الدفع عند الباب" rule 5); "Delivered today" lists deliveries without money. |
| A one-tap call to the desk | The desk's phone number is not stored in the system in version 1; the hint line names the desk in words. |
| Push or browser notifications when the phone is locked | Same as the desk (staff-map §6). Version 1 requires the page open and the screen on. |
| Vibration on a new assignment | Not available on every phone browser; the chime is the one alert, as on the desk. |
| Recording the method actually used and the amount received at the door | As on the desk (staff-map §4 decision 16). |
| A worker marking themselves "busy" or "on break" without ending the shift | Needs a rule the owner has not set. |
| Keeping W-01 notices across a reload | Version 1 holds them in page memory only (§4 decision 7). |
