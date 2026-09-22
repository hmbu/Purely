# Screens Map — Guest Interface

Project: Hotel In-Room Store — Guest Interface Specification
Author: Thinker (Agent 1)
Document language: English. UI names/labels: Arabic + English.
Governing document: `/CLAUDE.md` (locked decisions 1–7 apply to every screen below).
Map status: **APPROVED by the product manager.** Checkpoint 1 is cleared; screen files may be written.

---

## 0. How to read this document

- `G-xx` = a full guest screen. `M-xx` = a modal that opens on top of a guest screen and never has its own URL.
- IDs are **fixed**. Once assigned they are never renumbered, even if a screen is later removed (a removed screen keeps its ID and is marked `Removed`).
- Element IDs in the screen files will follow `G-01-B01` (button), `G-01-F01` (field), `G-01-C01` (card/content block), `G-01-S01` (section), `M-01-B01`, etc.
- **Status column** values: `Draft` (written or not yet written, not approved) → `In cycle` (tester/reviewer loop running) → `Approved` (reviewer verdicts applied, no Critical finding remains; wireframer may draw it). Only the orchestrator changes this column. Every screen starts at `Draft`.

---

## 1. Screen and modal inventory

### 1.1 Guest screens

| ID | Name (English) | Name (Arabic) | Purpose (one line) | Status |
|---|---|---|---|---|
| G-01 | Store | المتجر | Landing screen after the QR scan: sticky category bar, product grid with add and +/− on each card, floating cart bar. | **Approved** |
| G-02 | Product details | تفاصيل المنتج | Full view of one product: large image, name, description, price, availability, add and +/− controls. |**Approved** |
| G-03 | Cart | السلة | Review and adjust the selected products and quantities before checkout; see the total. |**Approved** |
| G-04 | Checkout | إتمام الطلب | Enter room number, optional order notes, choose payment on delivery (card / cash + optional "amount you will pay with"), review summary, submit. |**Approved** (OQ-01 open) |
| G-05 | Order submitted | تم إرسال طلبك | Success confirmation with order number and room number; entry to tracking. | Draft |
| G-06 | Order tracking | متابعة الطلب | Timeline of the order's status (New → Accepted & preparing → On the way → Delivered / Cancelled), order details, cancel before acceptance, reorder after completion. | Draft |
| G-07 | My orders | طلباتي | List of orders stored on this device (no login), newest first; opens tracking for any of them. | Draft |
| G-08 | Store unavailable | المتجر غير متاح | Full-screen replacement for G-01 when the store cannot be loaded (no connection / server error → Retry) or the scanned link is not valid (no Retry). | Draft |

### 1.2 Modals

| ID | Name (English) | Name (Arabic) | Opens on top of | Purpose (one line) | Status |
|---|---|---|---|---|---|
| M-01 | Confirm room number | تأكيد رقم الغرفة | G-04 | Mandatory (locked decision 2): shows the typed room number in large type; guest confirms or goes back to edit. Cannot be dismissed by tapping outside. | Draft |
| M-02 | Cancel order? | إلغاء الطلب؟ | G-06 | Confirms cancellation of an order that is still in status "New" (locked decision 6). | Draft |
| M-03 | Order not sent | لم يتم إرسال الطلب | G-04 | Shown when the submission request fails (connection dropped / server error). Retry or close; the order data is kept. | Draft |
| M-04 | Items no longer available | منتجات غير متوفرة | G-04 | Shown when the server rejects the submission because one or more cart items went out of stock; lists them and lets the guest remove them or go back to the cart. | Draft |

**Totals: 8 screens, 4 modals.**

### 1.3 Things that are deliberately NOT separate screens or modals

These are elements or states inside the screens above. They are listed here so nobody looks for a missing screen.

| Item | Where it lives | Decision |
|---|---|---|
| Language toggle (AR / EN) | Header of G-01 and G-08 | A single tap switches the whole interface in place; no language selection screen. Arabic (RTL) is shown on first open regardless of browser language (locked decision 7). The choice is saved on the device and reused on the next open. |
| Category browsing | Sticky horizontal category bar at the top of G-01 | Tapping a category chip scrolls the product list to that category's section on the same screen; the active chip follows the scroll position. No separate category screen. |
| Floating cart bar | Bottom of G-01 and G-02 | Appears only when the cart has at least one item; shows item count and total; tapping it opens G-03. |
| Active-order banner | Top of the product list on G-01 | Shown while the device has an order in status New / Accepted & preparing / On the way; tapping it opens G-06 for that order. |
| Loading, empty, error, success | Inside each screen | Every screen file specifies its own states per the template. Only the "store cannot load at all" case is promoted to its own screen (G-08) because it replaces G-01 entirely (no header, no cart bar). |
| "Order already accepted, cannot cancel" | Banner state on G-06 | Result of a lost race between the guest's cancel and staff acceptance; not a modal. |
| Toast after Reorder | G-03, after Reorder | The only transient toast in version 1. It reports both the products skipped because they are no longer available and the products whose line hit the maximum of 10 so the extra units were not added; the exact bilingual copy and its plural forms live in the G-03 file. |

---

## 2. Navigation flow

### 2.1 End-to-end journey (ASCII)

```
 [Guest scans the hotel-wide QR code]
              │
              ▼
      URL opens in mobile browser (no app, no login)
              │
    ┌─────────┴──────────┐
    │ catalog loaded      │ catalog failed / link invalid
    ▼                     ▼
 ┌──────┐            ┌──────┐   Retry (connection/server case only)
 │ G-01 │◄───────────│ G-08 │◄──┐
 │Store │            └──┬───┘   │
 └──┬───┘               └───────┘
    │
    ├── tap category chip ──────────► scrolls within G-01
    ├── tap language toggle ────────► G-01 re-rendered in the other language
    ├── tap "Add" / + / − on card ──► cart updated in place, floating cart bar appears/updates
    ├── tap product card ───────────► G-02 Product details
    │                                   ├── "Add" / + / − ──► cart updated in place
    │                                   ├── floating cart bar ──► G-03
    │                                   └── back ──► G-01
    ├── tap "My orders" icon ───────► G-07 My orders
    │                                   ├── tap an order ──► G-06
    │                                   ├── "Browse the store" (empty state) ──► G-01
    │                                   └── back ──► G-01
    ├── tap active-order banner ────► G-06 Order tracking (that order)
    └── tap floating cart bar ──────► G-03 Cart
                                        ├── + / − (− at qty 1 removes the line)
                                        ├── "Continue shopping" ──► G-01
                                        ├── back ──► screen it was opened from (G-01 or G-02)
                                        └── "Checkout" ──► G-04 Checkout
                                                             │
                                                             ├── back / "Edit cart" ──► G-03
                                                             ├── type room number, notes,
                                                             │   choose Card or Cash
                                                             │   (Cash reveals optional
                                                             │   "Amount you will pay with")
                                                             └── "Submit order" ──► inline field
                                                                  validation; if valid ──► M-01
                                                                                            │
                                   ┌────────────────────────────────────────────────────────┤
                                   │ "Edit room number" ──► closes, cursor in room field    │
                                   │                                          on G-04       │
                                   └─ "Confirm and send" ──► submission request ────────────┤
                                                                                            │
                     ┌─────────────────────────┬──────────────────────────┬─────────────────┘
                     │ success                 │ connection/server error  │ item(s) out of stock
                     ▼                         ▼                          ▼
                  ┌──────┐                  ┌──────┐                   ┌──────┐
                  │ G-05 │                  │ M-03 │                   │ M-04 │
                  └──┬───┘                  └──┬───┘                   └──┬───┘
                     │                         ├── "Retry" ──► same        ├── "Remove them and continue"
                     │                         │   request again           │     ──► G-04 with updated summary
                     │                         │   (same outcomes)         │     (or G-03 empty state if the
                     │                         └── "Close" ──► G-04,       │      cart became empty)
                     │                             nothing lost            └── "Back to cart" ──► G-03
                     │
                     ├── "Track order" ──► G-06 Order tracking
                     └── "Back to store" ──► G-01 (cart is now empty)
                                                  ▲
                  ┌──────┐                        │
                  │ G-06 │────── back ────────────┘ (or ──► G-07 when opened from G-07)
                  └──┬───┘
                     │  timeline: New → Accepted & preparing → On the way → Delivered
                     │            (or Cancelled at any point before Delivered)
                     │
                     ├── status New:      "Cancel order" ──► M-02
                     │                                        ├── "Yes, cancel" ──► G-06 shows Cancelled
                     │                                        │     (if staff accepted first: G-06 shows
                     │                                        │      new status + "already accepted" banner)
                     │                                        └── "Keep order" ──► closes
                     ├── status Delivered or Cancelled:
                     │                    "Reorder" ──► items added to cart ──► G-03
                     │                                   (unavailable items skipped + toast)
                     └── any status:      "Back to store" ──► G-01
```

### 2.2 Per-screen "reachable from / leads to" table

| ID | Reachable from | Leads to (action → destination) |
|---|---|---|
| G-01 Store | QR scan (entry point); G-08 → Retry; G-02 → back; G-03 → back or "Continue shopping"; G-05 → "Back to store" / browser back; G-06 → back or "Back to store"; G-07 → back or "Browse the store" | Product card → G-02; floating cart bar → G-03; "My orders" icon → G-07; active-order banner → G-06; category chip → scroll in place; language toggle → same screen, other language; Add / + / − → cart updated in place; "Refresh" (empty state only) → re-fetches the catalog and stays on G-01 |
| G-02 Product details | G-01 → product card; browser reload or a direct URL on a product page | Back → G-01; Add / + / − → cart updated in place; floating cart bar → G-03; error state "Product not available" → "Back to store" → G-01. On the reload / direct-URL path only, G-02 fetches the catalog itself: failure → G-08, and back then goes to the top of G-01 with no remembered scroll position. |
| G-03 Cart | browser reload or a direct URL on the cart; G-01 or G-02 → floating cart bar; G-04 → back or "Edit cart"; M-04 → "Back to cart" or "Remove them and continue" when the cart became empty; G-06 → "Reorder" | Back → G-01 or G-02 (whichever opened it); "Continue shopping" (empty state) → G-01; + / − → line updated (− at qty 1 removes the line); "Checkout" → G-04. "Checkout" is disabled while the cart is empty or while any line is marked out of stock. |
| G-04 Checkout | G-03 → "Checkout"; M-01 → "Edit room number"; M-03 → "Close" or a failed "Retry"; M-04 → "Remove them and continue" (cart not empty) | Back / "Edit cart" → G-03; Card ↔ Cash selection → in place (Cash shows the optional amount field); "Submit order" → inline validation errors on G-04, or M-01 when valid |
| G-05 Order submitted | M-01 → "Confirm and send" (success); M-03 → "Retry" (success) | "Track order" → G-06; "Back to store" → G-01; browser back → G-01 (G-04 and M-01 are removed from the history, the cart is already empty) |
| G-06 Order tracking | G-05 → "Track order"; G-07 → tap an order; G-01 → active-order banner; M-02 → "Yes, cancel" or "Keep order" | Back → G-07 if opened from G-07, otherwise G-01; "Cancel order" (status New only) → M-02; "Reorder" (status Delivered or Cancelled only) → G-03 with the items added; "Back to store" → G-01; error state "Order not found" → "Back to store" → G-01 |
| G-07 My orders | G-01 → "My orders" icon; G-06 → back (when opened from G-07) | Tap an order → G-06; "Browse the store" (empty state) → G-01; back → G-01 |
| G-08 Store unavailable | QR scan when the catalog cannot be loaded or the link is not valid; G-01 → reload that fails; G-02 or G-03 → reload / direct URL whose catalog fetch fails | "Retry" (connection/server variant only) → loading → G-01 on success, G-08 again on failure; language toggle → same screen, other language; "My orders" → G-07, shown on BOTH variants whenever the device holds at least one saved order. The invalid-link variant has no Retry and tells the guest to ask reception, but it still offers "My orders" when one exists. **Amended by the product manager after the G-08 test:** G-07 and G-06 render entirely from the device and need no catalog, so a catalog failure must never consume the guest's cancel-before-acceptance window (locked decision 6). When the device holds no order, neither variant shows the control. |
| M-01 Confirm room number | G-04 → "Submit order" (all fields valid) | "Confirm and send" → request sent. Four outcomes: a new order created → G-05; an order already existed for this attempt and matches → G-05, treated as a plain success; an order already existed and the submitted values differ → G-05 with the already-existing notice, showing the order the hotel actually holds; connection/server failure → M-03; out-of-stock rejection → M-04; "Edit room number" → close, focus the room number field on G-04. Backdrop tap and browser back do NOT close it. |
| M-02 Cancel order? | G-06 → "Cancel order" | "Yes, cancel" → request sent: success → G-06 with status Cancelled; already accepted → G-06 with the real status and an "already accepted" banner; connection failure → error text inside M-02 with the same two buttons; "Keep order" / backdrop tap → close, G-06 unchanged |
| M-03 Order not sent | M-01 → submission failed (connection/server); M-03 → "Retry" failed again | "Retry" → the same request is sent again with the same client order key (so a lost response never creates a duplicate order): success → G-05, including the already-existing case where the stored order is shown rather than a second one created; failure → M-03; out of stock → M-04; "Close" / backdrop tap → G-04 with every field kept |
| M-04 Items no longer available | M-01 → submission rejected for stock; M-03 → "Retry" rejected for stock | "Remove them and continue" → items removed from the cart: cart still has items → G-04 with updated summary (the guest taps "Submit order" again), cart empty → G-03 empty state; "Back to cart" / backdrop tap → G-03 with the items marked out of stock |

### 2.3 Back-navigation and history rules (apply to every screen)

1. Every screen except G-01 and G-08 has a back arrow in its header. The browser back gesture/button does exactly what the back arrow does.
2. Modals are not history entries. Browser back while a modal is open closes the modal (same as its dismiss action) — except M-01, where browser back is ignored and the guest must use one of its two buttons.
3. After a successful submission, G-04 and M-01 are dropped from the history: back from G-05 goes to G-01, never to the checkout of an already-sent order.
4. The cart is saved on the device and survives a page reload or closed browser tab. It is emptied only by the guest (− to zero / M-04 removal) or by a successful submission.
5. On a successful submission the order (number, items, room number, payment choice, timestamp, last known status) is saved on the device; that is the only source for G-07 (locked decision 4). G-06 always fetches the live status from the server and updates the saved copy. G-01 also fetches the status of active orders once per load, for the active-order banner only; it does not poll, and on failure it shows the last known saved status with no error text.
6. Language: the header toggle on G-01/G-08 is the only way to switch. All other screens use the current language. The choice persists on the device.

---

## 3. Journey coverage check (against the brief)

| Journey from the brief / task | Screens and modals that cover it |
|---|---|
| Open the store from one hotel-wide QR, no login, no download | Entry → G-01 (or G-08 on failure) |
| Browse by category (sticky horizontal category bar) | G-01 |
| Product detail | G-02 |
| Add / +/− on the card, floating cart bar | G-01, G-02 → G-03 |
| Cart | G-03 |
| Checkout with room-number entry (locked decision 1) | G-04 |
| Mandatory room-number confirmation in large type (locked decision 2) | M-01 |
| Payment on delivery: card or cash, optional "Amount you will pay with" (locked decision 3) | G-04 |
| Order notes | G-04 |
| Order submitted | G-05 |
| Tracking with the five statuses as a timeline (locked decision 5) | G-06 |
| Cancel only before acceptance (locked decision 6) | G-06 → M-02, plus the "already accepted" banner on G-06 |
| Past orders stored on the device (locked decision 4) | G-07 (+ active-order banner on G-01) |
| Reorder | G-06 → G-03 |
| Language toggle, Arabic RTL default (locked decision 7) | Header element on G-01 and G-08 |
| Weak connection during submission (tester persona 6) | M-03, with the duplicate-safe retry rule |
| Item went out of stock before submitting (tester persona 5) | M-04, out-of-stock badges on G-01/G-02/G-03, disabled "Checkout" on G-03 |
| Wrong room number (tester persona 4) | M-01 large-type confirmation; after sending, cancel via M-02 while status is New, then order again |
| Change the order after submitting (tester persona 7) | No editing after submission in version 1: cancel while New (M-02) and reorder (G-06 → G-03) |
| Store cannot load / link not valid | G-08 |

---

## 4. Decisions made in this map that the brief did not settle

**Status: all 16 decisions below are APPROVED by the product manager.** They are
locked for version 1 in the same way as the locked decisions in `/CLAUDE.md`.
Any agent who disagrees writes the objection to `/spec/open-questions.md` with a
proposed alternative, and does not change the decision unilaterally.

Each of these is a decision, not a suggestion.

1. **No welcome/splash screen.** The QR opens G-01 directly. Anything the guest needs to know (hotel name, "pay on delivery") is shown inside G-01's header.
2. **No search field in version 1.** The brief mentions category browsing only. Search can be proposed for `/spec/backlog.md` by the reviewer.
3. **Category chips scroll within G-01** instead of opening a category screen (matches the Nana reference: sticky horizontal bar over one long list).
4. **Order notes live on G-04 (order level), not per product.** The brief says "notes on the order".
5. **Product detail (G-02) exists** even though cards already have Add and +/−, because the card cannot hold a description or a large image.
6. **G-05 is a separate success screen** rather than jumping straight to tracking, so the room number and order number are shown once, clearly, before tracking begins.
7. **Reorder merges** the previous order's items into the current cart (quantities are added to existing lines); items that are now unavailable are skipped and reported in one toast. No "replace cart?" modal.
8. **Reorder is offered only on G-06** (for Delivered or Cancelled orders), not on the G-07 list rows, so it exists in one place.
9. **"Checkout" on G-03 is disabled while any cart line is out of stock**; the guest removes the line first. This is the first stock gate; M-04 is the second gate at submission time.
10. **Duplicate-safe retry.** Every submission carries a client-generated order key; "Retry" in M-03 reuses it, so a request whose response was lost never creates two orders. (This is a behavior rule for the technical team, not backend design.)
11. **Cancellation race.** If the guest confirms cancellation after staff already accepted, the order is not cancelled; G-06 shows the real status and an "already accepted" banner. No separate modal.
12. **Language toggle placement:** G-01 and G-08 headers only. Arabic on first open regardless of browser language; the toggle choice is saved on the device.
13. **G-08 is one screen with two variants** (connection/server failure with Retry; invalid link without Retry) rather than two screens, because the layout is identical except for the button.
14. **M-01 cannot be dismissed** by backdrop tap or browser back; only its two buttons close it. The other three modals close on backdrop tap, which equals their "Close / Keep / Back" action.
15. **Cancelled by the hotel** (staff cancels for any reason) uses the same Cancelled status on G-06 with an optional one-line reason from staff; no separate status is added to locked decision 5.
16. **Store hours are not modeled.** The brief does not mention opening hours, so the store is treated as always open in version 1.
