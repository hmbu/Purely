# Shared contract — guest, staff and admin on one hotel

Three static apps, no backend, one memory:

| Folder | Who | Spec |
|---|---|---|
| `app/` | the guest, on their phone | `/spec/screens/` (approved, frozen) |
| `staff/` | room service desk (supervisor), desk tablet | `/spec/staff/` |
| `worker/` | delivery worker, the worker's own phone | `/spec/worker/` |
| `admin/` | the manager, on a laptop | `/spec/admin/` |
| `shared/` | the hotel's data, used by all three | this file |

## Why this works without a server
All three apps read and write the same browser `localStorage`. A write in one tab
fires a `storage` event in every other tab, so the staff board updates the moment a
guest orders, and the guest's tracking screen updates the moment staff accept.
Verified in Chromium for `file://` pages in different folders.

**Browser note.** Chrome and Edge share `file://` storage across folders. Firefox and
Safari may not; for them, serve the repo root with `python3 -m http.server` and open
`http://localhost:8000/`. The root `index.html` says this.

## `shared/hotel-db.js` → `window.HotelDB`
Owns every key below. The three apps never touch these keys directly; they go through
HotelDB, so the shapes cannot drift.

| Key | Holds | Written by |
|---|---|---|
| `roomstore.catalog` | `{ categories:[{id,nameAr,nameEn,order}], products:[{id,nameAr,nameEn,descAr,descEn,price,category,inStock,qty,removed}] }` — `qty` whole units 0–9999 (A-03 Amendment A1) | admin; guest submission and any cancellation change `qty`; seeded once from `window.Data` |
| `roomstore.settings` | `{ hotelNameAr, hotelNameEn, currencyAr, currencyEn, timeZone, roomFormat, roomFormatChangedAt, roomFormatChangedBy }` — `roomFormat` is `{ minLen, maxLen, allowLetters, separator, requireDigit }`, separator `''` or `'-'` only | admin |
| `roomstore.fakeserver` | the hotel's order table `{ byKey, byNo, nextNo }` — shape defined by `app/js/store.js` | guest (create), staff (status), admin (read) |
| `roomstore.staff` | `{ members:[{id,name,pin,role:'supervisor'\|'worker'}], session:{memberId, since} (desk), workerSession:{memberId, since} (worker phone), shift:{memberId: sinceMs} }` | staff, worker, admin |
| `roomstore.admin` | `{ email, passwordHash, session }` | admin |

### The order record (one entry of `byKey`)
`{ orderNo, key, roomNumber, phone, lines:[{productId,nameAr,nameEn,qty,price}], notes,
payment:'card'|'cash', amount, total, status, createdAt, lang, fingerprint }` plus the
status fields HotelDB adds as the order moves (see the header of `shared/hotel-db.js`).

- **`phone`** — the guest's mobile number, **required** at checkout since the owner's
  decision of 2026-09-27 (G-04 §7.11). Always stored normalised: `+` then 8–15 digits
  (a Saudi `05…` or `5…` number becomes `+9665…`). It is part of the payload
  **fingerprint**, so a corrected number after a lost response returns
  `existing-different`, exactly as a corrected room number does. An order created
  before the field existed holds `''`.
- Where it appears: staff **S-02** order detail, as a `tel:` link next to the room
  block (never on the S-01 board cards); admin **AM-03** order details and the
  **A-06 CSV** "Mobile number" column (under the same formula guard as every
  cell). It is **not** on M-01 and not on the guest's G-05, G-06 or G-07.

### API
- `HotelDB.catalog()` / `HotelDB.saveCatalog(c)` — the guest's `Server.getCatalog()` must
  read this, so a price or stock change in admin reaches the guest.
- `HotelDB.settings()` / `HotelDB.saveSettings(s)`.
- `HotelDB.roomRule()` → `{ pattern: RegExp, minLen, maxLen, allowLetters, label }`, derived
  from `settings.roomFormat`. The guest's G-04 room field validates against this.
  Default = digits only, 1–5, exactly today's behaviour, so nothing changes until the
  manager changes it in A-07 through AM-04.
- `HotelDB.orders()` → every order the hotel holds, newest first.
- `HotelDB.getOrder(orderNo)`.
- `HotelDB.setStatus(orderNo, status, meta)` — `meta` carries `{ staffId, at }`. Used for
  OnTheWay and Delivered (by the worker, or by the desk on the worker's behalf).
- `HotelDB.acceptAndAssign(orderNo, workerId, meta)` — the desk's ONE accept action:
  New → Accepted with `assignedTo` set. There is no accepted order without a worker.
- `HotelDB.assign(orderNo, workerId, meta)` — reassign while Accepted or OnTheWay.
- `HotelDB.workers()`, `HotelDB.member(id)`, `HotelDB.startShift(id)`, `HotelDB.endShift(id)`
  — the worker list the desk assigns from; a worker is on shift while signed in.
- `HotelDB.cancel(orderNo, reasonAr, reasonEn, staffId)` — also returns the order's units to stock.
- `HotelDB.sellable(product)` — true only when the product is not removed, its switch
  `inStock` is on **and** `qty > 0`. The guest app shows a product as orderable only
  when this is true; the guest never sees `qty`.
- `HotelDB.reserveStock(lines)` → `{ ok, ids }` — called by the guest's
  `Server.submitOrder` just before it creates an order. All lines or none: if any line
  asks for more than is sellable, nothing is deducted and `ids` names those lines
  (the order is rejected as out of stock, M-04).
- `HotelDB.returnStock(lines)` — puts units back. Called on **every** cancellation:
  the guest's own (store.js `cancelOrder`) and staff/admin (`HotelDB.cancel`). A
  delivered order keeps its units deducted.
- `HotelDB.onChange(fn)` — fires on the cross-tab `storage` event **and** on same-tab writes.
- **Every read reloads from storage.** Never cache the order table in memory across
  calls: another tab may have changed it.

## Required change to the guest app (the one real bug this exposed)
`app/js/store.js` loads `ServerDB` once at startup and then trusts its memory. Once staff
can change an order from another tab, that copy goes stale and the guest's tracking
screen would never see an acceptance. `ServerDB` must reload from storage before every
read. Nothing else about the guest's behaviour changes.

## Statuses
The five canonical keys, labels verbatim from G-01 §5.2:
`New` جديد · `Accepted` تم القبول وجارٍ التحضير · `OnTheWay` في الطريق ·
`Delivered` تم التوصيل · `Cancelled` ملغى

Staff move an order forward one step at a time. Cancelling is always possible for staff;
for the guest only while `New` (locked decision 6). Once staff accept, the guest's
cancel button must disappear on their next poll — that is the loop to demonstrate.

## Demo credentials (a prototype has to be enterable)
Seeded on first run and shown on each sign-in screen as a clearly marked demo hint:
- Room service desk (supervisor): `1111` (سارة / Sara)
- Delivery workers: `2222` (خالد / Khalid), `3333` (أحمد / Ahmed)
- Admin: `manager@alwaha.example` / `alwaha2026`

Stored as plain demo values. This is not security and the README says so.
