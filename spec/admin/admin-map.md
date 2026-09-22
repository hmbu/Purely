# Admin Map — Hotel Manager Dashboard (Back Office)

Project: Hotel In-Room Store.
Author: Thinker (Agent 1).
Document language: English. UI copy: Arabic + English, Arabic first.
Governing documents: `/CLAUDE.md` locked decisions 1–7; `/spec/screens-map.md` §4 decisions 1–16; the approved guest screens in `/spec/screens/`.

**Scope note.** `/CLAUDE.md` lists the admin dashboard as out of scope. The owner has since put it **in scope**. This map and the files in `/spec/admin/screens/` are the admin specification. They do not change one character of the guest specification: `/spec/screens/`, `/spec/screens-map.md`, `/spec/open-questions.md`, `/spec/backlog.md` are frozen and were not edited. Where the admin side needs something from the guest side, it is recorded in §6 of this file as a flag for the owner, never as an edit.

Status of this map: **Draft — awaiting the owner.** No admin screen is Approved and none may be wireframed yet.

---

## 0. How to read this document

- `A-xx` = a full admin screen with its own URL. `AM-xx` = a modal that opens on top of an admin screen and has no URL.
- IDs are fixed and never renumbered. A removed screen keeps its ID and is marked `Removed`.
- Element IDs inside the screen files follow `A-01-B01` (button), `A-01-F01` (field), `A-01-C01` (content block), `A-01-S01` (section), `AM-01-B01`, etc.
- The shared frame (sidebar, top bar) that surrounds every screen except `A-01` is specified **once**, in §4 of this file, with its own ID family `AF-…`. It is one component; duplicating it into six elements tables would create six places where the same button could drift. This is the same reasoning the guest spec uses for repeated elements ("one ID for the whole family", G-01 §4).
- Every screen file uses the same eight-part template as the guest screens, in the same order — **1 ID and name, 2 Purpose, 3 Entry and exit points, 4 Elements table, 5 Content, 6 States, 7 Field rules, 8 Acceptance criteria** — followed by **9 Decisions settled on this screen**.

---

## 1. Who this interface is for, and what that rules out

The hotel manager. A laptop, in an office, maybe once a week, under no time pressure. The dashboard answers four questions and nothing else:

1. **Is anything wrong right now?** (nothing to sell, orders nobody accepted, products out of stock)
2. **How did the store do?** (money, orders, what sold)
3. **What do we sell, at what price, and is it in stock?**
4. **What does this hotel call itself, in what currency, and what does a room number look like here?**

What that rules out, deliberately:

- **No running a single order.** No accept, no status change, no cancel, no "on the way" from the dashboard. Locked decision 5's transitions belong to the staff interface. `A-06` is read-only history and reporting. If the manager sees an order stuck at New, the fix is a person, not a button.
- **No live operations view.** No auto-refreshing order board, no sound, no notifications, no polling. The manager opens the dashboard weekly, not all day.
- **No guest-side messaging.** No promotions, no banners, no push, no coupons — the guest interface has no place to show any of them.
- **No staff accounts, roles or permissions in version 1.** One account type: manager. §6 flag 4.
- **No charts.** Numbers and lists only. A seven-day revenue number answers "how did we do"; a sparkline is a component to build, translate, make RTL and maintain, for the same answer.

---

## 2. Screen and modal inventory

### 2.1 Screens

| ID | Name (Arabic) | Name (English) | Purpose (one line) | Why this screen exists | Status |
|---|---|---|---|---|---|
| A-01 | تسجيل الدخول | Sign in | The only unauthenticated screen: email and password, into the dashboard. | Prices, stock and the room-number format are behind it; a back office reachable by URL alone is an open till. | **Approved** |
| A-02 | نظرة عامة | Overview | What needs attention right now, then the period's money and top products. | The screen the manager opens first; it must be worth opening, so it leads with breakage (nothing to sell, orders nobody accepted) before it reports revenue. | **Approved** |
| A-03 | المنتجات | Products | The full catalog as one searchable table: name, category, price, in-stock switch, edit. | The daily-work screen. Stock is switched here inline, because "the water is finished" is the most frequent edit in a hotel store and must not cost a screen change. | **Approved** |
| A-04 | تفاصيل المنتج | Product details | Add or edit one product: both names, both descriptions, category, price, image, stock. | Creating and editing are the same 8 fields with the same rules; two screens would be two places for the same validation to drift. One screen, two modes. | **Approved** |
| A-05 | الفئات | Categories | The category list, their order, renaming, adding, removing. | The guest's sticky category bar renders chips **in the catalog's order** (G-01 §5.3), so that order is a product decision and needs a place to be made. | **Approved** |
| A-06 | الطلبات | Orders | Order history with date, status and room filters, a summary of the filtered set, and CSV export. | Answers "what did we sell, to which rooms, and how much cash is staff meant to have collected" — the reconciliation screen. | **Approved** |
| A-07 | إعدادات الفندق | Hotel settings | Hotel name (both languages), currency label, time zone, **room-number format**, change password. | The four values the whole product prints or validates against, in one place. It is also where OQ-01 is closed operationally. | **Approved** |

**7 screens.**

### 2.2 Modals

| ID | Name (Arabic) | Name (English) | Opens on top of | Purpose | Status |
|---|---|---|---|---|---|
| AM-01 | تغييرات غير محفوظة | Unsaved changes | A-04, A-07 | Guards a navigation away from an edited, unsaved form: Save, Discard, or Stay. | **Approved** |
| AM-02 | تأكيد الإزالة | Confirm removal | A-03, A-04 (variant P — product), A-05 (variant C — category) | Confirms removing a product from the store, or deleting an empty category, and states the exact guest-side consequence. | **Approved** |
| AM-03 | تفاصيل الطلب | Order details | A-06 | Read-only contents of one order: items, quantities, prices, room, payment, notes, status history. | **Approved** |
| AM-04 | تغيير صيغة رقم الغرفة | Change room number format | A-07 | The protected confirmation for the one setting that can break every future order: consequence text plus a live test of a real room number against the new rule. | **Approved** |

**4 modals. 7 screens + 4 modals = 11 files.**

### 2.3 Things that are deliberately NOT their own screen

| Item | Where it lives instead | Decision |
|---|---|---|
| Add product | `A-04` in create mode | Same fields, same rules; a separate "new product" screen would duplicate every field rule. |
| Sidebar, top bar, hotel name, language toggle, sign out | The global frame, §4 of this map (`AF-…`) | One component, one ID set, specified once. |
| Search and filters on the catalog | Fields inside `A-03` | A filter is not a destination. |
| Reporting | The summary strip on `A-06` plus the period band on `A-02` | No "Reports" screen in version 1: a third place for numbers is a third place for them to disagree. |
| Image upload | A field inside `A-04` | No media library in version 1; an image belongs to exactly one product. |
| Password change | A field group inside `A-07` | One account, one password; a screen for it would be almost empty. |
| Store open / closed switch | **Nowhere.** See §6 flag 3 | The guest interface has no "store closed" screen. To stop selling, the manager switches products out of stock or empties the catalog; the guest then sees G-01's already-specified empty state. |

---

## 3. Navigation flow

### 3.1 End-to-end (ASCII)

```
 [Manager opens the dashboard URL on a laptop]
              │
     ┌────────┴─────────┐
     │ no valid session │ valid session
     ▼                  ▼
  ┌──────┐          ┌──────┐
  │ A-01 │──sign in→│ A-02 │  Overview (default landing)
  │Sign  │          └──┬───┘
  │ in   │◄── sign out / 60 min idle ── (any screen)
  └──────┘             │
                       ├── "طلبات جديدة… / New orders…"  ──► A-06 filtered: status = New
                       ├── "منتجات غير متوفرة / Out-of-stock products" ──► A-03 filtered: Out of stock
                       ├── "لا توجد منتجات للبيع / Nothing to sell"     ──► A-03 (no filter)
                       └── top-product row ──► A-04 for that product
     Sidebar (always): A-02 · A-03 · A-05 · A-06 · A-07
                       │
   ┌───────────────────┼─────────────────────┬──────────────────┐
   ▼                   ▼                     ▼                  ▼
┌──────┐           ┌──────┐              ┌──────┐           ┌──────┐
│ A-03 │           │ A-05 │              │ A-06 │           │ A-07 │
│Prod- │           │Cate- │              │Orders│           │Sett- │
│ ucts │           │gories│              └──┬───┘           │ ings │
└──┬───┘           └──┬───┘                 │               └──┬───┘
   │                  │                     ├─ row click ──► AM-03 (read-only)
   ├─ "+ منتج جديد"   ├─ add / rename       │                  │
   │   ──► A-04 (create)                    └─ "تصدير CSV"     ├─ Save ──► saved, stays
   ├─ row click ──► A-04 (edit)             │    ──► file       │
   ├─ stock switch ──► saved immediately    │      downloads    ├─ room-number format changed
   └─ "إزالة" ──► AM-02 (variant P)         │                   │   + Save ──► AM-04
                      │                                          │        ├─ "تأكيد" ──► saved
   A-04 ──► Save ──► A-03    ──► AM-02 (P)  │                    │        └─ "إلغاء" ──► A-07, unchanged
        └─► leave with unsaved edits ──► AM-01                   └─ leave with unsaved edits ──► AM-01
   A-05 ──► delete empty category ──► AM-02 (variant C)
```

### 3.2 Per-screen "reachable from / leads to"

| ID | Reachable from | Leads to (action → destination) |
|---|---|---|
| A-01 | The dashboard URL with no valid session; "تسجيل الخروج / Sign out" on any screen; 60 minutes of inactivity; a request refused because the session expired | "تسجيل الدخول / Sign in" (valid) → the screen the manager was trying to reach, or A-02 when there was none |
| A-02 | Sidebar "نظرة عامة / Overview"; the default landing after sign-in | Attention rows → A-06 (status New) or A-03 (filtered / unfiltered); top-product row → A-04 in edit mode; sidebar → any screen |
| A-03 | Sidebar "المنتجات / Products"; A-02 attention rows; A-04 after Save or Cancel; AM-02 variant P after removal | "+ منتج جديد / New product" → A-04 create; row → A-04 edit; stock switch → stays, saved immediately; "إزالة / Remove" → AM-02 variant P; sidebar → any screen |
| A-04 | A-03 ("+ منتج جديد" = create, row = edit); A-02 top-product row (edit) | "حفظ / Save" → A-03 with the saved-confirmation line; "إلغاء / Cancel" or sidebar with unsaved edits → AM-01; "إزالة / Remove" (edit mode) → AM-02 variant P |
| A-05 | Sidebar "الفئات / Categories" | "+ فئة جديدة / New category" → inline row on A-05; "↑ / ↓" → order saved immediately; "حذف / Delete" (empty category only) → AM-02 variant C; sidebar → any screen |
| A-06 | Sidebar "الطلبات / Orders"; A-02 attention row (pre-filtered to status New) | Row → AM-03; "تصدير CSV / Export CSV" → a file download, stays on A-06; sidebar → any screen |
| A-07 | Sidebar "إعدادات الفندق / Hotel settings" | "حفظ / Save" with the room-number format unchanged → saved in place; "حفظ" with it changed → AM-04; leaving with unsaved edits → AM-01 |
| AM-01 | A-04 or A-07, on any navigation away from a form with unsaved edits | "حفظ ومتابعة / Save and continue" → validates and saves, then the requested navigation; "تجاهل التغييرات / Discard changes" → the requested navigation, edits lost; "البقاء / Stay on this page" → closes |
| AM-02 | A-03 or A-04 (variant P); A-05 (variant C) | "نعم، أزل / Yes, remove" → performs it, closes, the list shows the confirmation line; "إلغاء / Cancel" or backdrop click → closes, nothing changed |
| AM-03 | A-06, clicking a row | "إغلاق / Close", backdrop click or Esc → A-06, unchanged. No other action: the modal is read-only |
| AM-04 | A-07, "حفظ / Save" while the room-number format differs from the saved one | "تأكيد التغيير / Confirm change" (enabled only after the test passes) → the whole settings form is saved, back to A-07; "إلغاء / Cancel" → closes, the format reverts to the saved value, other edits kept. Backdrop click and Esc do **not** close it |

### 3.3 Navigation rules that apply to every admin screen

1. The sidebar is present on every screen except A-01 and is never hidden. It is the only navigation: there is no back arrow on any admin screen, and the browser back button follows the URL history normally.
2. Leaving a form with unsaved edits always opens AM-01 — by sidebar click, by browser back, by closing the tab (the browser's own "leave site?" prompt), or by clicking "إلغاء / Cancel". There is no silent loss of typed work anywhere in the dashboard.
3. Only A-04 and A-07 have a Save button. Everything else that changes data — the stock switch on A-03, the order buttons on A-05, removals confirmed in AM-02 — is a single value with an immediate visible effect and is saved the moment it is used, with the failure rule in §5.4.
4. There is no draft or publish step. A saved change is live for the next guest who loads the store. §5.3 states exactly when an already-open guest sees it.
5. Modals close on backdrop click and Esc, **except AM-04**, which closes only through its own two buttons — the same protection locked decision 2 gives M-01 on the guest side, for the same reason: it is the last point before a value that misroutes orders is committed.
6. Every list screen keeps its filters in the URL, so a filtered view can be reloaded, bookmarked and linked to from A-02.

---

## 4. The global frame (`AF-…`)

Present on A-02 through A-07. Not present on A-01.

Reference viewport **1440 × 900**. Minimum supported width **1024 px**. Below 1024 px the whole frame is replaced by `AF-C03` (§4.3): version 1 has no mobile or tablet layout for the dashboard, because the tasks here are typing, table reading and CSV export.

### 4.1 Elements

| ID | Type | Text (Arabic) | Text (English) | Behavior on click | Disabled / hidden when |
|---|---|---|---|---|---|
| AF-S01 | Section — sidebar, fixed, 240 px wide, full height, at the start edge (right in Arabic, left in English), 1 px gray border on its inner edge | — | — | Not clickable as a whole; contains AF-C01 and AF-B01–AF-B05 | Hidden only under 1024 px (AF-C03) |
| AF-C01 | Content block — hotel name, top of the sidebar, 18 px bold, up to 2 lines then ellipsis; the value for the current admin language from settings (A-07) | *Hotel name, Arabic value* | *Hotel name, English value* | Nothing happens | Never hidden. Before settings are loaded, a 160 × 18 px gray placeholder |
| AF-B01 | Button — nav item, 44 px tall, full sidebar width, label 15 px; the active item is filled gray with a 3 px bar on its start edge | نظرة عامة | Overview | Opens A-02 | Never |
| AF-B02 | Button — nav item | المنتجات | Products | Opens A-03 with no filter | Never |
| AF-B03 | Button — nav item | الفئات | Categories | Opens A-05 | Never |
| AF-B04 | Button — nav item | الطلبات | Orders | Opens A-06 with the default filters (§A-06) | Never |
| AF-B05 | Button — nav item | إعدادات الفندق | Hotel settings | Opens A-07 | Never |
| AF-S02 | Section — top bar, 56 px tall, spans the content area, 1 px gray bottom border; contains AF-C02, AF-B06, AF-B07 | — | — | Not clickable as a whole | Hidden only under 1024 px |
| AF-C02 | Content block — the signed-in account's email, 13 px, at the end edge of the top bar, before AF-B07 | *account email* | *account email* | Nothing happens | Never hidden |
| AF-B06 | Button — language toggle, text button, 15 px, in the top bar | English | العربية | Switches the **dashboard** to the other language and direction in place, no reload, no data lost, unsaved form edits kept exactly as typed. Saves the choice in this browser | Never disabled. Its label is always the name of the other language, written in that language |
| AF-B07 | Button — sign out, outlined, 36 px tall | تسجيل الخروج | Sign out | Ends the session and opens A-01. If a form has unsaved edits, AM-01 opens first | Never disabled |
| AF-C03 | Content block — the too-narrow notice, full screen, centered, replaces everything | افتح لوحة التحكم على حاسوب محمول أو مكتبي<br>تحتاج الشاشة إلى عرض 1024 بكسل على الأقل | Open the dashboard on a laptop or desktop<br>The screen needs to be at least 1024 px wide | Nothing happens | Shown only while the viewport is narrower than 1024 px. It appears and disappears live as the window is resized; nothing typed is lost while it is shown |

### 4.2 Frame content rules

- The active nav item is the screen currently shown. A-04 marks "المنتجات / Products" active; AM-01–AM-04 do not change the active item.
- The admin language is **Arabic (RTL) by default**, matching locked decision 7, and is saved per browser. It is independent of every guest device: changing the dashboard language changes nothing a guest sees.
- The admin language never decides which language a product is edited in. Both language fields are always shown, always editable, always labelled, whichever language the dashboard is in.
- No notification bell, no unread badge, no help centre, no search across the dashboard, no breadcrumb.

### 4.3 Session rules (shared by every screen)

- A session ends after **60 minutes with no click, keystroke or navigation**. The next action opens A-01 with `A-01-C04` (§A-01). Unsaved form edits are lost at that point; this is stated in `A-01-C04`'s copy so the cause is never a mystery.
- "تسجيل الخروج / Sign out" ends the session immediately.
- A session survives a page reload and a closed tab within the 60 minutes.
- Any request that comes back "session expired" behaves exactly like the idle timeout.

---

## 5. Contracts with the frozen guest specification

These are the points where this dashboard touches the guest interface. Every one of them was checked against the approved file named.

### 5.1 The catalog the dashboard edits is the catalog the guest browses

| Value edited here | Where the guest sees it | Frozen rule that governs it |
|---|---|---|
| Product name, Arabic and English | G-01 card name, G-02 title and heading, G-03 line name, AM-03 rows, G-07 order rows | G-01 §5.4 item 2 (2 lines then ellipsis); G-02 §5.3 |
| Description, Arabic and English | G-02 description section only | G-02 §5.4: rendered up to 500 characters, cut at the last space, "…"; absent in both languages → the section is hidden entirely |
| Price | G-01 card, G-02, G-03 line and total, G-04 summary, G-05, G-06, G-07 | G-01 §7.2: two decimals always, currency after the amount in Arabic, before it in English, Western digits |
| Category and category order | G-01 sticky chip bar and section order | G-01 §5.3: chips in the catalog's order, one chip per **non-empty** category, no "All" chip |
| In stock / out of stock | G-01 C07 badge, G-02, G-03 line form and the availability check, M-04 at submission | G-01 §5.7, G-03 §5.6, M-04 |
| Product removed from the catalog | No card on G-01; its cart line falls back to the line's own snapshot and is treated as out of stock | G-01 §5.7 last bullet; G-03 §5.2 item 2 and decision 10 |
| Hotel name | G-01 header C01 | G-01 §5.1: missing English value falls back to Arabic |
| Currency label | Everywhere a price is printed | G-01 §7.2 — the **label** is configurable, its **position** is not |
| Room number format | G-04 F01 keyboard and validation; M-01 display size; M-03 `{room}` | OQ-01 in `/spec/open-questions.md`; §5.5 below |

### 5.2 Prices: what the manager types, what the store does with it

1. The manager types **an amount only**, never a currency symbol, into one field on A-04: digits, optionally one decimal separator, at most two decimal places. `12`, `12.5`, `12.50` are all accepted; `12.505` is not.
2. On leaving the field, the value is normalised **visibly, in front of the manager, before saving**: Arabic-Indic digits become Western digits, a typed `,` becomes `.`, and the amount is padded to exactly two decimals (`12` → `12.00`). Nothing is normalised silently at save time; what the field shows is what is stored.
3. Directly under the field, `A-04-C04` prints the amount exactly as each guest interface will render it — Arabic `12.00 ر.س` and English `SAR 12.00` — using the currency label from A-07. The manager sees the guest's price before saving it.
4. The stored unit price is a decimal with exactly two places. **No rounding ever happens to a unit price.** The only rounding in the product is `quantity × unit price`, half up, on the guest side (G-03 §7.2); the dashboard does not repeat it, does not pre-multiply, and does not store a rounded variant.
5. Bounds: **0.01 to 9999.99**. Zero and negative amounts are rejected — a free item is not modelled in version 1, because the guest's pay-on-delivery flow has no zero-total case anywhere.
6. Changing a price **never changes an order that was already submitted**: the total is frozen in the order record at submission (G-07 §5, "the total is never recomputed"). A price change affects new carts and new orders only. A guest with the store already open keeps the old price until the next catalog fetch (§5.3), and pays the price shown in their own cart.
7. The currency **label** is a text value in A-07 (default `ر.س` / `SAR`). Its position is fixed by G-01 §7.2 and is not editable anywhere in the dashboard: no setting, no checkbox, no per-product override.

### 5.3 When a change reaches a guest

A guest who already has the store open holds a **session catalog copy** (G-01 §5.7) and does not re-fetch by itself. Therefore:

| Change made here | Reaches a guest who opens the store afterwards | Reaches a guest who already has it open |
|---|---|---|
| Price, name, description, image, category, category order | On their next catalog fetch: page load, reload, "تحديث / Refresh" on G-01's empty state, or "Retry" on G-08 | Not until one of those happens; their cart keeps the price they saw |
| Switched **out of stock** | Same as above | Also at the cart availability check (G-03 §5.6) and, as the final gate, at submission (M-04) |
| Switched **back in stock** | Same as above | **Not** until a catalog fetch: G-03 never clears an out-of-stock mark (G-03 §5.6 result table, decision 5). A guest who saw it unavailable keeps seeing that until they reload |
| Removed from the store | Same as above | Their existing cart line survives, is priced from its own snapshot and is treated as out of stock (G-03 §5.2 item 2) |
| Hotel name, currency label | Same as above | Not until a catalog fetch |
| Room-number format | Their next store load | **Never mid-session**, and it can never invalidate a value already typed — §5.5 rule 4 |

This table is printed in plain language on A-03 (`A-03-C05`) and A-04 (`A-04-C09`) so the manager is never surprised that "it didn't change on my phone".

### 5.4 Immediate saves and how they fail

The stock switch (A-03), the category order buttons (A-05) and the removals confirmed in AM-02 save immediately. Each one:

- applies optimistically on screen within 100 ms;
- on failure (no connection, server error, 5-second timeout) **reverts to its previous value on screen** and shows the screen's error line: `تعذّر حفظ التغيير — تحقّق من الاتصال وحاول مرة أخرى` / `The change could not be saved — check your connection and try again`;
- never leaves the screen showing a value that is not stored. A reverted switch is the truth, and the manager can try again.

### 5.5 Room-number format: closing OQ-01 operationally

`OQ-01` asks whether the target hotel's room labels contain letters or separators. The hotel answers it **on A-07**, by choosing one of exactly two presets. Summary here; the full specification, including everything it changes, is in `A-07` §5.4 and `AM-04`.

1. **Two presets, no third option, no free text.** `أرقام فقط / Digits only` (1–5 digits, 0–9 — character-for-character the rule G-04 §7.1 already ships) and `أرقام وحروف / Digits and letters` (the alternative already worked out and reviewed in OQ-01: digits, Latin letters, hyphen and single space, at least one digit, no leading/trailing/double separator, 1–6 characters). There is **no regular expression field, no custom pattern, no editable length, no per-wing rule.** A free pattern is the single feature most able to break every future order in this product, and it would put a validation language in front of a hotel manager.
2. **The default is `أرقام فقط / Digits only`**, identical to today's approved G-04 behaviour. A hotel that never opens A-07 behaves exactly as the approved guest spec describes.
3. **Changing it is protected by AM-04**, a modal that cannot be dismissed by backdrop click or Esc, states the consequence in plain language, and **requires the manager to type a real room number from their own hotel into a test field and see it accepted by the new rule** before "تأكيد التغيير / Confirm change" becomes enabled. It is a live test against the exact rule about to be saved, not a promise. Switching to `Digits only` in a hotel with a room `A-12` therefore fails in front of the manager, on their own data, before anything is saved.
4. **The format governs guest input only; it never rejects a submitted order.** The setting decides the keyboard and the client-side validation on G-04. Whatever value reaches the server is stored and delivered. A tightened format therefore cannot invalidate a room number a guest already typed, cannot fail a submission mid-checkout, and needs no new guest-side error state — none exists for it, and inventing one would mean editing the frozen guest spec.
5. **It takes effect on a guest's next store load** and never mid-session, because it travels with the catalog like every other store setting (§5.3).
6. **An audit line sits under the setting**: `آخر تغيير: {date} — {account}` / `Last changed: {date} — {account}`. If room numbers start failing, the first question ("did someone change this, and when") is answered on the screen itself.

### 5.6 Reporting definitions, fixed once

Used identically by A-02 and A-06. They are stated here so the two screens can never disagree.

| Term | Definition |
|---|---|
| Order | One submitted order record, in any of the five statuses of locked decision 5. |
| Delivered order | Status `تم التوصيل / Delivered`. |
| **Revenue** | The sum of the stored totals of **Delivered orders only**. Payment happens at the door (locked decision 3), so New, Accepted & preparing and On the way are not money yet, and Cancelled never will be. Every revenue number in this dashboard is delivered-only, and both screens say so on screen. |
| Average order value | Revenue ÷ number of delivered orders, two decimals. With zero delivered orders it prints `—`, never `0.00`. |
| Cancellation rate | Cancelled orders ÷ all orders in the period, as a whole-number percentage, rounded half up. With zero orders it prints `—`. |
| Units sold | The sum of quantities across the lines of **Delivered orders only**. |
| A day | 00:00:00 to 23:59:59 in the **hotel time zone** set in A-07. Every period boundary, every date column and the CSV export use it. |
| The period | Selected on the screen. A-02 defaults to the last 7 days including today; A-06 defaults to the last 30 days including today. |

### 5.7 Fees, service charges, tax and discounts — the ruling

**There is no field anywhere in this dashboard for a delivery fee, a service charge, a tax or VAT line, a discount, or a promo code, and none will be added in version 1.**

Reason, stated as a conflict avoided rather than a preference: G-03 decision 7 fixes the guest's totals block at exactly two rows, Items and Total, and states that "the catalog unit price is the amount the guest pays per unit, and the Total is the amount staff collect at the door". M-04, G-04, G-05, G-06 and G-07 all print that same single total. A fee entered here would produce an amount that **no approved guest screen can display**, so the guest would agree to one number at M-01 and staff would ask for another at the door. That is an operational error, not a missing feature.

The dashboard states the consequence to the manager in one line on A-04 next to the price field and on A-07: `السعر الذي تُدخله هو ما يدفعه النزيل. لا تُضاف رسوم توصيل أو خدمة أو ضريبة على الطلب.` / `The price you enter is what the guest pays. No delivery, service or tax charge is added to an order.` If the hotel needs a service charge, it is included in the unit price. Anything more is version 2 and needs a guest-side change first (§6 flag 2).

---

## 6. Flags for the owner (conflicts, dependencies, and one recorded objection)

Written here rather than acted on, exactly as `/CLAUDE.md` requires.

1. **OQ-01 preset B needs the guest files updated before it can be switched on.** A-07 can offer `أرقام وحروف / Digits and letters`, but G-04 §7.1 today accepts digits only and G-04's F01 opens a numeric keypad. OQ-01 already contains the fully worked-out change list ("What must change if the answer is yes", items 1–10). **The owner must decide one of two things:** (a) order those changes applied to G-04, M-01 and M-03, so both presets are real — recommended, because the setting is then a genuine answer to OQ-01; or (b) ship version 1 with the second preset visible but disabled on A-07, labelled with the copy in A-07 §5.4, in which case OQ-01 stays open. The dashboard specification is written for (a) and A-07 §6 describes exactly what the screen looks like under (b). **The Thinker has not edited the guest spec either way.**
2. **Fees and tax are ruled out, not deferred pending a preference.** §5.7. If the hotel needs a fee line, a guest-side decision must be reopened first (G-03 decision 7); that is an owner decision, not an admin screen.
3. **There is no "close the store" switch, and the guest interface is the reason.** A closed store has no screen: G-08 covers a failed catalog and an invalid link, not a deliberate closure, and G-01's empty state says "لا توجد منتجات حاليًا / No products right now", which is true but not "we are closed". Version 1 therefore offers no switch; to stop selling, the manager switches products out of stock. **If the owner wants a real closure**, it needs a guest screen or a G-01 state that does not exist today. Related: map §4 decision 16 ("store hours are not modelled") stands — this dashboard adds no opening hours.
4. **The dashboard has a login while the guest has none.** Locked decision 4 ("No guest login") is about guests; it is not contradicted. But version 1 assumes **one manager account per hotel**, created when the system is installed: no self-signup, no second user, no roles, and **no self-service password reset** — A-01 tells the manager to contact the installer, and A-07 offers "change password" for someone who is already signed in. If more than one person at the hotel will use this, or if a forgotten password must be recoverable without the installer, that is an owner decision and a version-2 screen.
5. **A-02's "new orders nobody accepted" row assumes a staff interface exists** that moves an order from New to Accepted & preparing (locked decision 5). If staff acceptance ships later than this dashboard, that row will always read the total number of new orders and should be switched off until then.
6. **Order history is kept for 365 days** in version 1 (A-06 §7). If the hotel's accounting needs more, say so before the build: it is a storage decision, not a screen.
7. **No objection to any locked decision is raised by this map.** Everything above either follows an approved decision or records a dependency on one.

---

## 7. Coverage check against the owner's brief

| Requirement from the brief | Where it is specified |
|---|---|
| An overview worth opening | A-02 — attention band first (nothing to sell, orders nobody accepted, out-of-stock count), then delivered orders, revenue, average order value, cancellation rate, top 5 products |
| Product list with stock and price | A-03 — one table, price column, in-stock switch on each row, search and filters |
| Adding and editing a product | A-04 — one screen, two modes, both languages, price, category, image, stock |
| Categories | A-05 — add, rename in both languages, order (guest chip order), delete only when empty |
| Order history with essential reporting | A-06 — date, status and room filters, summary of the filtered set, AM-03 for one order, CSV export |
| Hotel settings including the room-number format | A-07 — hotel name, currency label, time zone, room-number format (+ AM-04), change password |
| Catalog in both languages, price, category, stock | A-04 fields; §5.1 |
| Price format the guest already ships | §5.2; A-04 `C04` live preview in both languages |
| No fee, service charge or tax anywhere | §5.7; ruled explicitly, with the reason and the conflict it avoids |
| Five fixed statuses, reported not invented | §5.6; A-06 status filter uses the five labels of G-01 §5.2 verbatim |
| OQ-01 closed operationally, and protected | §5.5; A-07 §5.4; AM-04 |
