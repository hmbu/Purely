# Backlog — deferred to version 2

Owner: Reviewer (Agent 3)
Purpose: nothing classified **Later** in `/spec/reviews/` is lost. Every item here was judged useful but not required for version 1.

## How to use this file

- One section per screen or modal, in ID order (`G-01` … `G-08`, then `M-01` … `M-04`). A later reviewer cycle **appends** a new section or new rows; it never rewrites another screen's section.
- Every row carries: the **source screen ID**, the **item**, and the **one-line reason for deferring**.
- The `Ref` column points at the finding or element ID in that screen's review file, so the ruling behind the deferral can always be found.
- An item leaves this file only when the product manager pulls it into a version; the reviewer never promotes an item on its own.
- Items classified **Remove** are *not* listed here — they are rejected, and the reason lives in the review file.

---

## G-01 — Store (المتجر)

Source review: `/spec/reviews/G-01.md` (cycle 1). Four Later verdicts, plus one partly-deferred ruling.

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| G-01-L1 | F-01 | **Product search on G-01** — a search field in or under the header that filters the catalog by product name. | Genuinely useful once the catalog grows, but a room-store catalog navigable by category chips does not break without it. |
| G-01-L2 | F-02 | **Progress feedback and an early escape during the catalog load** — a visible progress or elapsed-time cue, and a guest-initiated "try again now" before the 10-second timeout. | The wait already ends in G-08 with a Retry, so the journey completes; this is comfort during a wait, not a fix for a break. |
| G-01-L3 | F-08 (deferred part) | **Verified large-text layout** — product cards, 2-line name truncation and the sticky bars tested and reflowing correctly at 200 % browser text scaling. | v1 only guarantees that zoom and text scaling are never disabled; a tested reflowing layout is a design-and-build effort beyond a spec line. |
| G-01-L4 | F-13 | **Fresher active-order status on the banner** — a retry after a failed status fetch, or a "last updated" indication when the shown status may be stale. | G-06 holds the live status and is one tap from the banner, so a stale label is a trust nuisance, not a broken journey. |
| G-01-L5 | F-14 | **Indication of more than one active order** — a count or "+1 more" on the banner when the device holds several active orders. | "My orders" (B02) is permanently visible in the header and lists them all, so no order is unreachable. |

---

## G-02 — Product details (تفاصيل المنتج)

Source review: `/spec/reviews/G-02.md` (cycle 1). Five Later verdicts, all from tester findings; no element and no screen decision was deferred.

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| G-02-L1 | F1 | **A language toggle reachable from G-02** — a way to switch Arabic ↔ English without going back to G-01 (for example a toggle in G-02's header, whose end edge is deliberately empty in v1). | The foreign guest sets the language on G-01 before ever reaching a product and the choice is saved on the device, so the detour exists only once, on a first open. |
| G-02-L2 | F3 | **A zoomable or full-screen product image** — tapping C02 to enlarge the photo, or a pinch-zoom viewer for reading on-package text. | Page pinch-zoom is already guaranteed and enlarges a full-width photo, so a dedicated image viewer is polish, not a missing step. |
| G-02-L3 | F5 | **Defined reflow for the badge and helper strings at enlarged text size** — a stated wrap/truncation rule for C07, C06, C08 and C13 when the guest raises the browser or OS text size. | v1 guarantees only that zoom and text scaling are never disabled; a verified layout at enlarged sizes is design-and-build work (it joins G-01-L3). |
| G-02-L4 | F7 | **"Read more" for long descriptions** — expanding the description beyond the 500-character cut instead of ending it with "…". | Hotel room-store descriptions are short; this is a scale problem that appears with a catalog version 1 does not have. |
| G-02-L5 | F10 | **Keeping the G-01 scroll position across a reload of G-02** — returning to the position the guest left instead of the top of the list after a reload or direct-URL open. | The guest still lands on G-01 and can browse on, so this is comfort on a rare path, not a broken journey. |

---

## G-03 — Cart (السلة)

Source review: `/spec/reviews/G-03.md` (cycle 1). Nine Later verdicts, all from tester findings; no element and no screen decision was deferred.

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| G-03-L1 | F1 | **Feedback when a disabled "Checkout" is tapped** — a shake, a tooltip, or a momentary emphasis of the helper line (C08) when the guest taps B05 while it is at 50 % opacity. | The explanation already sits one line above the button and the availability wait ends by itself within 5 seconds, so this is comfort during a short wait, not a fix for a break. |
| G-03-L2 | F3 | **A language toggle reachable from G-03** — switching Arabic ↔ English without going back to G-01 (extends G-02-L1 to the cart). | The choice is made once on G-01 and saved on the device, so the detour exists only on a first open. |
| G-03-L3 | F4 | **A stronger disabled-Checkout signal** — emphasis (weight, icon, or border change) on C08 and on B05's disabled state instead of 14 px plain text plus 50 % opacity. | C08 is already at the screen's body size with no internal contradiction to fix, so extra emphasis is visual design, which is out of scope for version 1. |
| G-03-L4 | F5 | **A contrast pass on the out-of-stock badge** — readable text-on-fill for G-03-C06 and the identical G-01-C07 / G-02-C07 badges. | G-01 was approved with this styling, so changing it on one screen alone would create divergence; the fix belongs to the design step, across all three screens at once. |
| G-03-L5 | F7 | **An undo for a removed line** — a short-lived "تراجع / Undo" after "−" at quantity 1 or after "Remove". | The guest can simply re-add the product — nothing is lost but a few taps — and a confirmation on every removal would tax every guest to protect a rare slip. |
| G-03-L6 | F13 | **Clearing an out-of-stock mark without a catalog fetch** — letting an "available" response, or a refresh control on G-03, unblock a product marked earlier in the session. | A mark is only written from an explicit server statement, a browser reload already restores the product, and clearing marks would mean rewriting the one-way rule in Approved G-01 §5.7. |
| G-03-L7 | F16 | **Distinguishing the two waits on the reload path** — telling the guest whether the catalog fetch or the availability check is running during the up-to-15-second worst case (joins G-01-L2). | Both waits end in a defined outcome (G-08 or the failure helper line), so this is progress feedback, not a missing step. |
| G-03-L8 | F18 | **A retry for a failed availability check on G-03** — a control that re-runs the check without leaving the screen. | The next entry re-runs the check and M-04 remains the net, so a Retry control is a second network affordance for a rare failure. |
| G-03-L9 | F21 | **Naming the skipped items after a Reorder merge** — listing which products were not added instead of counting them. | The count already tells the guest something is missing and the merged cart is on screen, so naming items is a refinement on a toast that is already carrying two sentences in version 1. |

---

## G-04 — Checkout (إتمام الطلب)

Source review: `/spec/reviews/G-04.md` (cycle 1). Ten Later verdicts from tester findings, plus one partly-deferred ruling (G-04-L5, the deferred half of the Critical-3 ruling R3).

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| G-04-L1 | F1, F20 | **Checkout values carried to the next order** — remembering the room number, payment method and cash amount for a second order placed from the same device, behind an explicit re-confirmation rather than a silent pre-fill. | Retyping 1–5 digits and one payment tap is friction, not a break, and any remembered value needs its own re-confirmation design to stay as safe as the no-pre-fill rule it would replace. |
| G-04-L2 | F3 | **A language toggle reachable from G-04** — switching Arabic ↔ English without leaving checkout (G-04's header end edge is deliberately empty in v1). | The language is chosen on G-01 and saved on the device, so the detour exists only on a first open; same ruling as G-02-L1. |
| G-04-L3 | F6 | **Legibility of the small numeric strings** — a larger character counter (C08, 12 px) and a more visible currency label inside F03, verified at enlarged browser text size. | The 200-character cap now has its own explicit notice (C14), so the counter is no longer the only channel; the size work joins the deferred enlarged-text items G-01-L3 and G-02-L3. |
| G-04-L4 | F7 | **A stronger selected state for the payment rows** — a clearer treatment than the 1 px → 2 px border change plus the 24 px radio fill on B03/B04. | v1 already avoids colour-alone signalling and meets the accessibility rule; strengthening the treatment is visual design, which CLAUDE.md puts out of scope for now. |
| G-04-L5 | F8 (deferred part of R3) | **Room-list validation** — checking the typed room number against the hotel's real room list (or a picker/directory), so an existing-but-wrong number can be questioned. | v1 has no room list on the device and the check is backend work; the cheap half of the ruling (the guest meets the number again on G-05/G-06 while cancel is still possible) is being built instead. |
| G-04-L6 | F10 (blocked on OQ-01) | **Alphanumeric and separated room numbers in F01** — accepting labels such as "A-12", "12B" or "3B", with the text keyboard and the length bound proposed in OQ-01. | Whether the target hotel needs it is an unresolved fact recorded as OQ-01; v1 stays digits-only as a recorded limitation rather than a silent one. |
| G-04-L7 | F12 | **A helper line under the room-number label** — pointing the guest at the number on their door or key card, with no example digits. | M-01's large type plus the new G-05/G-06 sighting already give the guest two chances to catch a wrong number; a hint improves the odds, it does not add a missing step. |
| G-04-L8 | F15 | **Naming the items M-04 removed** — a line on G-04 listing the products dropped from the order, instead of only a shorter summary and a lower total. | The rebuilt summary plus the new "not sent yet" notice already say what is being sent and that it still has to be sent; naming the removed lines is a refinement. |
| G-04-L9 | F18 | **A checkout draft that survives the tab** — keeping the typed values when the tab is closed or discarded by the browser or the OS. | A longer-lived draft reintroduces the stale-value risk the no-pre-fill rule exists to prevent, so it needs its own re-confirmation design before it can be safe. |
| G-04-L10 | F23 | **Unit prices in the order summary** — showing the per-unit price beside each "{qty} × {name}" line so a line total can be checked on G-04. | G-03 shows every unit price and is one tap away from the summary via "Edit cart"; this is at-a-glance convenience on the confirmation view. |

---

*(Later screens append their sections below this line.)*

---

## G-05 — Order submitted (تم إرسال طلبك)

Source review: `/spec/reviews/G-05.md` (cycle 1). Two Later verdicts, both from tester findings; no element and no screen decision was deferred.

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| G-05-L1 | G-05-02 | **A language toggle reachable from G-05** — switching Arabic ↔ English without going back to G-01, or a visible cue that a toggle exists there (G-05's header carries only the back arrow in v1). | The language is chosen on G-01 and saved on the device, so the detour exists only on a first open; same ruling as G-02-L1, G-03-L2, G-04-L2, G-07-L1, M-01-L1, M-03-L1 and M-04-L2. |
| G-05-L2 | G-05-01 | **An estimated delivery time on the confirmation** — a "your order usually arrives in about N minutes" line, or any ETA, beside the order details. | Version 1 has no server field and, more importantly, no hotel commitment behind a time, so a number here would be a promise the hotel never made; the feature waits for that commitment rather than being rejected. |

---

## G-06 — Order tracking (متابعة الطلب)

Source review: `/spec/reviews/G-06.md` (cycle 1). Four Later verdicts, all from tester findings, recorded in three rows (G-06-L1 carries two findings that must be designed together); no element and no screen decision was deferred, and the Critical finding was ruled Essential (new element G-06-C16).

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| G-06-L1 | G-06-04, G-06-05 | **Status-freshness indication on G-06** — telling a fresh poll apart from one up to ~30 seconds old (a "last updated" time, a relative age, or a subtle refresh cue), and letting the failed-poll notice C05 escalate or say how long the status has been unconfirmed. | The only decision the guest takes from the status is whether to tap "Cancel order", and §5.6 rule 4 has the **server** resolve that race (the *already accepted* outcome plus banner C02), so a 30-second-old label cannot produce a wrong outcome — and every cheap candidate (a timestamp, a refresh control, a periodic spinner) adds a number or a movement the guest cannot act on differently. Extends G-01-L4 and G-07-L3 to the live screen, decided on its own merits. |
| G-06-L2 | G-06-08 | **Per-status timestamps supplied by the server** — an "accepted at HH:MM" style time on each timeline row and a delivered-at time on a finished order, beside the existing order time in C10. | Version 1's server sends no per-status times, and a time observed by the phone is the moment this screen saw the change, not the moment it happened, so printing one would be a claim the hotel never made; it becomes cheap and truthful as soon as the server supplies the values. |
| G-06-L3 | G-06-10 | **A post-cancellation signal for an order the hotel cancelled** — most precisely, G-01's active-order banner distinguishing Delivered from Cancelled (instead of disappearing identically for both) until the guest has opened the order once. | Push is impossible without a login and would breach locked decision 4, so nothing can reach a guest who is not looking; the only on-screen surface is **Approved** G-01's banner, whose new visibility, lifetime and dismissal rules are version-2 design rather than a one-line change, and the guest is uninformed rather than misinformed — G-07 lists the order with its status and G-06 states who cancelled it and why. |

---

## G-07 — My orders (طلباتي)

Source review: `/spec/reviews/G-07.md` (cycle 1). Four Later verdicts, all from tester findings; no element and no screen decision was deferred.

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| G-07-L1 | F1 | **A language toggle reachable from G-07** — switching Arabic ↔ English without going back to G-01, for the direct-URL or reload entry on a device with no saved choice. | The language is chosen once on G-01 and saved on the device, and the icon-only back arrow is a working exit, so the detour exists only on a first open; same ruling as G-02-L1, G-03-L2, G-04-L2, M-01-L1, M-03-L1 and M-04-L2. |
| G-07-L2 | F2 | **A stronger visual difference between the Delivered and Cancelled rows** — shape, weight, or an icon instead of the outlined pill differing only by dark versus gray label text. | Both are final states with no action attached, so confusing them costs the guest nothing they can act on wrongly; strengthening the treatment is visual design, like G-03-L3 and G-04-L4. |
| G-07-L3 | F3 | **Live-versus-last-known indication on the row pill** — a "last updated" cue, or a retry after a failed status refresh (extends G-01-L4 from the banner to the list). | G-06 holds the live status one tap away and re-fetches it before showing any control, so a stale pill on this screen can never be acted on. |
| G-07-L4 | F10 | **A visible cue when a pill updates in place** — a momentary highlight or transition when the status refresh changes a row's label under the guest's eyes. | The value that appears is the true one and the old one was never acted on, so the missing cue costs nothing today; a change highlight is motion design. |

---

## G-08 — Store unavailable (المتجر غير متاح)

Source review: `/spec/reviews/G-08.md` (cycle 1). Two Later verdicts, both from tester findings; no element and no screen decision was deferred, and the two Critical findings were ruled Essential (new element G-08-B03).

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| G-08-L1 | F3 | **A reception phone number on G-08** — the hotel's extension cached from an earlier successful catalog load, shown in C04 and dialable as a `tel:` link. | The number arrives with the store settings in exactly the request that failed, so a dial link needs a cached value and a staleness rule; the room phone's reception key works today. |
| G-08-L2 | F4 | **A quiet "the connection is back" cue** — a non-navigating hint when the device reports it is online again, so a guest who gave up is invited to tap Retry. | Self-navigation stays rejected outright (a screen that changes under a travelling finger is worse than one that waits), so only the cue is deferred — the same split as M-03-L2. |

---

## M-01 — Confirm room number (تأكيد رقم الغرفة)

Source review: `/spec/reviews/M-01.md` (cycle 1). Three Later verdicts, all from tester findings; no element and no modal decision was deferred.

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| M-01-L1 | F-2.1 | **A way to fix the language from M-01** — a language toggle on the modal, or icons beside the two text-only button labels, for a guest who reached a non-dismissable confirmation in a language they cannot read. | The language is chosen on G-01 and saved on the device, and "تعديل رقم الغرفة / Edit room number" is a working exit back to G-04, so the detour exists only on a first open; same ruling as G-02-L1 and G-04-L2. |
| M-01-L2 | F-3.2 | **A stronger disabled signal for B02 in the loading state** — a clearer treatment than 50 % opacity on the outlined "Edit room number" button while the request is in flight. | Tapping the button in that state does nothing at all, so the cost of not perceiving the disabled state is zero; strengthening the treatment is visual design, like G-03-L3 and G-04-L4. |
| M-01-L3 | F-6.1, F-6.3 | **Progress feedback during the send wait** — an elapsed-time cue, a "still trying" line, or any progress indication during the up-to-15-second wait, including across repeated M-03 retry cycles. | The wait is capped and ends in a defined outcome with a Retry, and the device-scoped client order key (ruling R2) removes the duplicate-order harm a guest could cause by acting on the silence; this is comfort during a wait, as already deferred in G-01-L2 and G-03-L7. |

---

## M-02 — Cancel order? (إلغاء الطلب؟)

Source review: `/spec/reviews/M-02.md` (cycle 1). Two Later verdicts, both from tester findings; no element and no modal decision was deferred.

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| M-02-L1 | F5 | **Progress feedback during the in-flight cancellation** — an elapsed-time or progress cue during the up-to-15-second wait in which the sheet cannot be dismissed (joins G-01-L2, G-03-L7, M-01-L3 and M-03-L2). | The wait is capped at 15 seconds and always ends in a defined outcome, and the lock itself is Essential (a dismissable in-flight modal leaves an *already accepted* answer with nowhere to land); racing staff acceptance does not change this, because a cue removes no seconds from the request and losing the race returns the designed *already accepted* outcome, not a broken journey. |
| M-02-L2 | F2 | **A language toggle reachable from M-02** — switching Arabic ↔ English without closing the cancel sheet and walking back to G-01. | The language is chosen on G-01 and saved on the device, so the detour exists only on a first open; same ruling as G-02-L1, G-03-L2, G-04-L2, M-01-L1, M-03-L1 and M-04-L2. |

---

## M-03 — Order not sent (لم يتم إرسال الطلب)

Source review: `/spec/reviews/M-03.md` (cycle 1). Two Later verdicts, both from tester findings; no element and no modal decision was deferred.

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| M-03-L1 | F3 | **A language toggle reachable from M-03** — switching Arabic ↔ English without closing the failure sheet and walking back through G-04 → G-03 → G-01. | The language is chosen on G-01 and saved on the device, so the detour exists only on a first open; same ruling as G-02-L1, G-03-L2, G-04-L2 and M-01-L1. |
| M-03-L2 | F4 | **Progress feedback during an in-flight retry** — an elapsed-time or progress cue during the up-to-15-second wait in which the sheet cannot be dismissed (joins G-01-L2, G-03-L7 and M-01-L3). | The wait is capped at 15 seconds and always ends in a defined outcome, and the lock itself is Essential (a dismissable in-flight modal leaves an arriving success with nowhere to land), so only the cue is deferred. |

---

## M-04 — Items no longer available (منتجات غير متوفرة)

Source review: `/spec/reviews/M-04.md` (cycle 1). Two Later verdicts, both from tester findings; no element and no modal decision was deferred.

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| M-04-L1 | F1 | **Images and unit prices in the rejected-item rows** — a 64 px thumbnail and the unit price beside each "{qty} × {name}" row, so a guest who browsed by photo can recognise what is being removed. | Removal is by product identifier, so nothing wrong ever reaches staff; "Back to cart" shows every image and price one tap away, and extra columns add height to a sheet that must fit on one screen. |
| M-04-L2 | F2 | **A language toggle reachable from M-04** — switching Arabic ↔ English without leaving the rejection sheet. | Same ruling as M-03-L1: the language is chosen once on G-01 and saved on the device, so the detour exists only on a first open. |
