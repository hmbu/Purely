# Worker Map — Hotel In-Room Store, Delivery Worker App

Project: Hotel In-Room Store — **Delivery worker** interface specification
Author: Thinker (Agent 1)
Document language: English. UI copy: Arabic + English, Arabic first.
Map status: **Draft** (status is changed only by the orchestrator).

Governing documents (all binding, none re-opened here):
- `/CLAUDE.md` locked decisions 1–7. Decisions 3, 5 and 6 are the ones this app executes; decision 6 is why a worker never accepts and never cancels.
- `/docs/operations.html` — sections "الأدوار", "رحلة الطلب", "حالات الطلب", "التوزيع على العمّال", "الدفع عند الباب". It is the reference for roles, assignment, statuses and payment at the door.
- The owner's split decision of 2026-09-27 ("the room service desk manages orders; orders must not go straight to the delivery person"), recorded as **Amendment A2** in `/spec/staff/staff-map.md`.
- `/spec/staff/staff-map.md` §4 decisions 3–5, 10–14, 17–22 and the new decisions 23–31 of Amendment A2. Where this map reuses a desk value (a size, a timeout, a cadence, a sentence) it names the desk rule instead of restating it differently.
- `/spec/staff/screens/S-02.md` §5.2, §5.5, §5.7 and `/spec/staff/screens/SM-02.md` — the order detail and the delivery sheet the worker screens are ported from.
- `/spec/screens/G-01.md` §5.2 (the five canonical status labels, used verbatim), §7.2, §7.3, §7.6.

---

## 0. How to read this document

- `W-xx` = a full worker screen. `WM-xx` = a modal that opens on top of a worker screen and never has its own URL.
- IDs are **fixed** and never renumbered.
- Element IDs follow `W-01-B01` (button), `W-01-F01` (field), `W-01-C01` (content block), `W-01-S01` (section).
- Every screen file uses the eight-part template of `/CLAUDE.md`, in this order: 1 ID and name · 2 Purpose · 3 Entry and exit points · 4 Elements table · 5 Content · 6 States · 7 Field rules · 8 Acceptance criteria — followed by **§9 Decisions settled on this screen**.
- Status column: `Draft` → `In cycle` → `Approved`. Only the orchestrator changes it.
- "The desk" means the room service desk app (`staff/`, screens S-01, S-02, S-03, SM-01, SM-02, SM-03), used by the supervisor. "The worker app" means this app (`worker/`), used on a delivery worker's own phone.

---

## 1. What this app is

A delivery worker carries their own phone. When the supervisor at the room service desk accepts an order, they assign it to a worker by name in the same action (desk SM-03). The order then appears on that worker's phone, with a chime, and only on that worker's phone. The worker prepares it, taps "خرجت بالطلب / I'm on my way", walks it to the room, and at the door confirms the handover and the payment (WM-01). The order is then Delivered.

Four properties follow, and every decision in §4 traces to one of them:

1. **The worker sees their own orders and nothing else.** No queue, no other worker's orders, no New orders, no names of colleagues. The desk is the only place the whole hotel's queue exists (operations.html, "التوزيع على العمّال" rule 1).
2. **The worker moves an order forward; the desk decides everything else.** Accepting, assigning, reassigning and cancelling are desk acts. The worker has exactly two acts: "on my way" and "delivered and paid" (operations.html rule 4, rule 5).
3. **The worker's phone is where a wrong door is knocked on.** The room number is the largest text on every worker surface that shows one, with the sizes of the desk (staff-map §4 decision 4).
4. **The phone is in a pocket, in a lift, on a weak connection.** Every screen states what it knows and how stale it is, and no action is ever assumed to have happened when it did not reach the system.

---

## 2. Screen and modal inventory

### 2.1 Worker screens

| ID | Name (English) | Name (Arabic) | Purpose (one line) | Why it exists | Status |
|---|---|---|---|---|---|
| W-01 | My orders | طلباتي | The live list of the orders assigned to this worker, with the room number as the largest text on each card, and a chime when a new one arrives. | The screen the worker lives in during a shift. Without it an assignment is never noticed. | Draft |
| W-02 | Order detail | تفاصيل الطلب | One assigned order in full: room at 64 px, guest mobile to call, what to prepare, notes, what to collect and what change to bring, and the one button that moves it forward. | Every act the worker performs happens here, after the room and the items have been read. | Draft |
| W-03 | Worker sign-in | دخول المندوب | A 4-digit worker PIN that names the worker and starts their shift, so the desk can assign orders to them. | The desk can assign only to a worker it knows is on shift; the PIN is what puts them on shift. It is also the touch that arms audio for the chime. | Draft |

### 2.2 Modals

| ID | Name (English) | Name (Arabic) | Opens on top of | Purpose (one line) | Status |
|---|---|---|---|---|---|
| WM-01 | Confirm delivery and payment | تأكيد التوصيل والدفع | W-02 | At the door: the room, the payment method, the amount to collect and the change to give, confirmed on one tap that records the order as Delivered. Ported from desk SM-02. | Draft |

**Totals: 3 screens, 1 modal.**

### 2.3 Things that are deliberately NOT separate screens, modals or controls

| Item | Where it lives | Decision |
|---|---|---|
| Cancelling an order | Nowhere in the worker app | Workers never cancel (§4 decision 2). W-02 and WM-01 carry the one-line hint that sends the worker to the desk. |
| Accepting, assigning, reassigning | Nowhere in the worker app | Desk acts only (desk S-02 + SM-03). |
| History of delivered orders | Nowhere in version 1 | A delivered order leaves W-01. Cash reconciliation is the admin report's job (operations.html "الدفع عند الباب" rule 5). Recorded as deferred (§6). |
| An order cancelled by the desk | A marked card at the top of W-01 until the worker taps "فهمت / Got it", and a banner on W-02 | A worker may be carrying it; a silent disappearance sends them to a door with a cancelled order (§4 decision 8). |
| An order reassigned to a colleague | Disappears from W-01 at once, with a 60-second notice line; W-02 replaces its body with a notice | Design rule 3: it disappears immediately. The notice says why the list got shorter (§4 decision 7). |
| New-assignment alert | Sound + the card on W-01 | Same mechanism as the desk chime; no push, no browser notification (§4 decision 6). |
| End of shift | Text button in the W-01 header | Refused, with a line, while the worker still holds active orders (§4 decision 4). |
| Contacting the desk | The hint line on W-02 and WM-01 (plain text) | The desk's phone number is not stored in the system in version 1; staff know it. Recorded as deferred (§6). |

---

## 3. Navigation flow

### 3.1 End-to-end (ASCII)

```
 [Worker opens the worker URL on their own phone]
              │
    ┌─────────┴────────────────┐
    │ device linked             │ device not linked
    ▼                           ▼
 ┌──────┐                   ┌────────────────────┐
 │ W-03 │                   │ W-03 variant B     │
 │ PIN  │                   │ "Device not linked"│
 └──┬───┘                   └────────────────────┘
    │ correct WORKER PIN          (no way forward)
    │ (shift starts)
    │   supervisor PIN → stays on W-03, message
    ▼
 ┌────────────────────────────────────────────┐
 │ W-01  My orders        ← the screen they    │
 │   groups, top to bottom:                    │
 │     ملغى / Cancelled (desk-cancelled,       │
 │            until "Got it")                  │
 │     تم القبول وجارٍ التحضير / Accepted & prep.│
 │     في الطريق / On the way                  │
 └───┬───────────────┬───────────────┬─────────┘
     │ tap card      │ "إنهاء        │ shift ended (12 h, or on
     │               │  الوردية"     │ another device) → W-03 with
     ▼               ▼ (0 active)    │ "Your shift has ended"
 ┌──────────┐     ┌──────┐           └──────► W-03
 │  W-02    │     │ W-03 │
 │ Order    │     └──────┘
 │ detail   │
 └──┬───┬───┴──────────────────────────────┐
    │   ├── primary action, by status:      │
    │   │    Accepted & preparing ──► On the way
    │   │    On the way ──► WM-01 ──► Delivered
    │   │                                   │
    │   ├── order cancelled by the desk ──► banner, Cancelled
    │   ├── order reassigned to a colleague ──► notice block
    │   └── guest mobile ──► phone dialer (tel:)
    │                                       │
    └── back arrow / "العودة إلى طلباتي / Back to my orders" ──► W-01
```

### 3.2 Per-screen "reachable from / leads to"

| ID | Reachable from | Leads to (action → destination) |
|---|---|---|
| W-01 My orders | W-03 after a correct worker PIN; W-02 → back arrow or "العودة إلى طلباتي / Back to my orders"; browser reload while a worker session is live | Tap an order card → W-02; "فهمت / Got it" on a cancelled card → same screen, card removed; "إنهاء الوردية / End shift" → W-03 (only with 0 active orders; otherwise stays, with a line); shift found ended → W-03; language toggle → same screen; sound toggle → same screen |
| W-02 Order detail | W-01 → tap a card; browser reload or the order URL, for an order assigned to this worker | Primary action → same screen, next status (On the way → WM-01 first); guest mobile → the phone's dialer; back arrow / "العودة إلى طلباتي / Back to my orders" → W-01; shift found ended → W-03, which returns here after a correct PIN |
| W-03 Worker sign-in | The worker URL on a device with no live worker session; W-01 → "End shift"; W-01 or W-02 when the shift is found ended | Correct worker PIN → W-01 (or back to the W-01 / W-02 the worker was on, when W-03 was reached because the shift ended); variant B leads nowhere |
| WM-01 Confirm delivery and payment | W-02 → the primary action while the status is On the way | Confirm → request sent. Four outcomes: delivered → closes, W-02 shows Delivered; cancelled meanwhile → closes, W-02 shows Cancelled with its banner; reassigned meanwhile → closes, W-02 shows the reassigned notice; failure → stays open with its error line. "رجوع / Back" or backdrop → closes, the order stays On the way |

### 3.3 Back-navigation and history rules

1. W-02 has a back arrow; the browser back gesture does exactly what it does. W-01 and W-03 have no back arrow.
2. WM-01 is not a history entry. Browser back while it is open closes it, which equals its "رجوع / Back" (except while its request is in flight, when it is ignored — SM-02 §6.1, unchanged).
3. W-01 remembers its scroll position; returning from W-02 restores it.
4. Nothing is typed in the worker app except the PIN on W-03, so a reload never loses work.
5. Language: the toggle lives in the W-01 header and on W-03. Arabic (RTL) on first open; the choice is saved on the device, **separately from the desk's saved language** (§4 decision 13).

---

## 4. Decisions made in this map

Each is a decision, not a suggestion. They bind every worker screen file.

1. **A worker sees only the orders assigned to them.** An order is on W-01 when, and only when, its `assignedTo` is the signed-in worker and its status is تم القبول وجارٍ التحضير / Accepted & preparing or في الطريق / On the way — plus the two transient cases of decisions 7 and 8. A New order is never on a worker's phone: the desk accepts and assigns in one action, so there is no accepted order without a worker and no unaccepted order with one. The server refuses any worker request about an order not assigned to that worker, and W-02 opened by URL for such an order shows its error state.
2. **Workers never cancel.** No cancel control exists anywhere in the worker app. When the guest refuses the order at the door or cannot pay, the worker calls the desk and the desk cancels with a reason (desk SM-01). W-02 and WM-01 print the ruled hint, verbatim: "الضيف رفض الطلب أو لا يوجد دفع؟ اتصل بمكتب الروم سيرفس ليلغيه / Guest refused or can't pay? Call the room service desk to cancel".
3. **The worker app has its own session, separate from the desk's.** Signing in or out on the worker app never signs the desk in or out, and the reverse, even in a browser that holds both (the prototype's `workerSession` vs `session`). **The worker app accepts worker PINs only**; a supervisor PIN typed on W-03 is refused with "هذا رمز مشرف — ادخل من جهاز مكتب الروم سيرفس / This is a supervisor PIN — sign in on the room service desk device". The desk accepts supervisor PINs only (Amendment A2 to S-03). A wrong-app PIN counts as a failed attempt toward the 5-attempt lockout of S-03 §7.1, so neither sign-in screen becomes an unlimited way to test PINs.
4. **Signed in = on shift.** A correct worker PIN starts the worker's shift (the desk's picker then shows them as "في الوردية / On shift"); "إنهاء الوردية / End shift" ends it and signs the phone out, once the system confirms (a failed request signs nothing out, W-01 §7.2). Signing in again while already on shift, on any phone, keeps the original shift start (W-03 §5.3). The shift and the session both end **12 hours** after sign-in (staff-map §4 decision 3's limit, applied to workers): the desk treats a shift that started 12 or more hours ago as off shift even if the phone never said so, and the phone, at its next check, ends its session and shows W-03. A worker **cannot end their shift while they still hold an active order** (Accepted & preparing or On the way): the tap is refused with a line telling them to deliver it or ask the desk to reassign it. The 12-hour limit is the only thing that ends a shift with orders still held, and the desk card then says the worker is off shift (Amendment A2 to S-01), so the desk sees it.
5. **One phone per worker at a time is not enforced.** A worker signed in on two phones sees the same orders on both; actions are idempotent by target status (staff-map §4 decision 20), so nothing is done twice. Whichever phone ends the shift ends it for the worker; the other phone finds the shift ended at its next check and shows W-03 (decision 4). In the prototype, one browser holds one worker session.
6. **A new assignment reaches the phone live, with the desk's chime.** W-01 updates on every change notification the system sends and, as a fallback, polls every **15 seconds** measured from the end of the previous attempt, with a **10-second** timeout (S-01 §5.5's cadence). A new assignment therefore appears with no reload, within 2 seconds when change notifications arrive and never later than 15 seconds after the desk's confirm while the connection works. The chime is the desk's single 2-second tone (S-01 §5.6 rule 1), played once per update that brings at least one order newly assigned to this worker — by an accept, or by a reassignment from a colleague — or that finds one of this worker's orders newly cancelled by the desk. The first successful update after a sign-in, a reload, or a return from a hidden page is the baseline and plays nothing. **There is no repeating chime** on the worker phone: the desk's repeat exists for New orders nobody has accepted, and every order on a worker's phone has already been accepted by a person who can phone the worker.
7. **Reassignment removes the order from the first worker's phone at once.** At the first update that shows an order of mine assigned to someone else, its card disappears from W-01 with no marker, and a notice line — "حُوِّل طلب الغرفة {room} إلى زميل — لم يعد عليك توصيله / The order for room {room} was moved to a colleague — you no longer deliver it" — stays at the top of W-01 for **60 seconds** (the desk's 60 seconds, S-01 §5.7). No chime for a removal. The colleague's name is never shown. On the receiving phone the order simply arrives, with the chime (decision 6).
8. **An order the desk cancels while it is mine is never removed silently.** It moves to a "ملغى / Cancelled" group at the top of W-01, marked "ألغى المكتب هذا الطلب — لا توصله وأعد المنتجات / The desk cancelled this order — do not deliver it, return the items", with the reason, and stays until the worker taps "فهمت / Got it" on it. The acknowledgement is saved on the device for the shift, so a reload does not bring back a card already acknowledged and does not lose one that was not. The discovery plays the chime (decision 6), because a cancelled order in hand is as urgent as a new one.
9. **The room number is the largest text on every worker surface that shows one**, with the desk's sizes and rules (staff-map §4 decision 4): **40 px bold** on a W-01 card, **64 px bold** on W-02, **40 px bold** in WM-01; always Western digits, leading zeros kept, laid out left-to-right in both languages, never wrapped, never truncated, contrast at least 7:1, never beside a number of equal or greater size.
10. **Money appears only on W-02 and in WM-01.** A W-01 card names the payment method ("بطاقة / Card" or "نقدًا / Cash") so the worker takes the terminal or change, but prints no total, no amount and no change. The amounts, and the change to bring, are on W-02 in S-02 §5.5's four cases verbatim, and at the door in WM-01 in SM-02 §5.3's four cases verbatim.
11. **The guest's mobile number is on W-02 only, as a `tel:` link** labelled for its one use — calling when nobody answers the door (operations.html "الدفع عند الباب" rule 6). Never on W-01 cards, never in WM-01. No guest name, no device identifier, anywhere (locked decision 4).
12. **The worker's two verbs, and the status labels.** The five canonical labels of G-01 §5.2 are used verbatim wherever a status is named. The worker's buttons are "خرجت بالطلب / I'm on my way" (writes في الطريق / On the way) and "تم التوصيل والدفع / Delivered and paid" (opens WM-01, whose confirm writes تم التوصيل / Delivered). Each prints its result on line 2, as on the desk (staff-map §4 decision 5).
13. **Language and sound are saved on the device, separately from the desk's.** Arabic (RTL) on first open, English toggle on W-01 and W-03 (locked decision 7). The sound toggle is on W-01 only, states its state in words, and has the desk's three variants (S-01-B02). They are separate device settings from the desk's because in real use they are separate devices; in the prototype, a shared browser therefore does not flip the desk's language when a worker switches theirs.
14. **Actions are idempotent, bounded, and never assumed** — staff-map §4 decision 20 and S-02 §5.7 rule 6, unchanged: every action carries the order number and the target status, timeout **15 seconds**, no offline queue, no optimistic status change, no automatic retry.
15. **The worker never edits an order** (staff-map §4 decision 18): no items, no quantities, no room, no notes, no payment method.
16. **The worker's phone must be linked to the hotel**, like the desk device (staff-map §4 decision 22). An unlinked phone shows W-03 variant B with the desk's exact copy and no way forward. A worker's own phone shows room numbers and guest mobile numbers; a random phone must not.
17. **Names are displayed by one rule on the desk and the worker app.** A roster name stored as "{Arabic} / {English}" (for example "خالد / Khalid") prints the part before " / " in the Arabic interface and the part after it in the English interface, each trimmed; a name with no " / " prints whole in both. This is how the design copy "نيابةً عن خالد / for Khalid" is produced from the stored "خالد / Khalid". Amendment A2 applies the same rule to every name the desk prints (staff-map §4 decision 30). The admin dashboard keeps its own rule (AM-03 §5.6: the roster string exactly as stored).
18. **The screen stays awake while on shift.** W-01 and W-02 request the browser's screen wake lock while visible with a live worker session, and release it on W-03. Where the browser does not support it, nothing is shown about it; the W-01 empty state tells the worker to keep the page open and the screen on. Version 1 has no push and no browser notification (staff-map §4 decision 14, applied here).
19. **The guest never sees the worker.** Nothing about assignment, reassignment or the worker's name reaches any guest screen; the guest sees the five canonical statuses only (design rule 7).

---

## 5. Build notes — how the screens map onto the shared data layer (prototype)

The screen files speak of "the system", "a request" and "a change notification", as the desk files do. In the prototype these are the calls of `/shared/hotel-db.js`, already implemented; the worker app uses them and re-implements nothing.

| Screen behaviour | Prototype call |
|---|---|
| Worker session on this phone | `HotelDB.staff().workerSession` `{memberId, since}` — **never** `session`, which is the desk's |
| Is a worker on shift | `HotelDB.workers()` `{id, name, onShift, since}`, with the 12-hour rule of §4 decision 4 applied to `since` by the caller |
| Sign in / End shift | `HotelDB.startShift(memberId)` on a correct worker PIN **only when the worker is not already on shift** (it overwrites the start time, which W-03 §5.3 forbids); `HotelDB.endShift(memberId)` on "إنهاء الوردية / End shift" and on the 12-hour limit |
| Role check at sign-in | The member found for the PIN must have `role === 'worker'` on W-03 and `role === 'supervisor'` on S-03 |
| Accept & assign / Reassign (desk SM-03) | `HotelDB.acceptAndAssign(orderNo, personId, {staffId, at})` → `stale` is resolved by re-reading the order (guest cancelled → S-02 banner G; accepted elsewhere → C03); `HotelDB.assign(orderNo, personId, {staffId, at})` for reassign |
| A member's name and role | `HotelDB.member(id)` → `{id, name, pin, role}` |
| My orders | Orders with `assignedTo === workerSession.memberId`, status `Accepted` or `OnTheWay` |
| "I'm on my way" / "Delivered" | `HotelDB.setStatus(orderNo, 'OnTheWay' \| 'Delivered', {staffId: memberId, at})`, sent only after a fresh read confirms `assignedTo` is still this worker (the server's check, §4 decision 1) |
| Live arrival, removal, cancellation | `HotelDB.onChange(fn)` (`source: 'remote'` for changes made in another frame or tab), plus the 15-second poll |

---

## 6. Deferred here, for the owner to route

| Item | Why it is deferred |
|---|---|
| A "delivered today" list and a cash-collected total on the worker's phone | Reconciliation belongs to the admin report (operations.html "الدفع عند الباب" rule 5); version 1 keeps the worker app to the orders in hand. |
| A one-tap call to the desk | The desk's phone number is not stored in the system in version 1; the hint line names the desk in words. |
| Push or browser notifications when the phone is locked | Same as the desk (staff-map §6). Version 1 requires the page open and the screen on (§4 decision 18). |
| Vibration on a new assignment | Not available on every phone browser; the chime is the one alert, as on the desk. |
| Recording the method actually used and the amount received at the door | As on the desk (staff-map §4 decision 16). |
| A worker marking themselves "busy" or "on break" without ending the shift | The desk sees each worker's orders in hand in the picker (SM-03); a status of its own needs a rule the owner has not set. |
