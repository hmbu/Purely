# Shared contract — guest, staff and admin on one hotel

Three static apps, no backend, one memory:

| Folder | Who | Spec |
|---|---|---|
| `app/` | the guest, on their phone | `/spec/screens/` (approved, frozen) |
| `staff/` | hotel staff, desk tablet or phone | `/spec/staff/` |
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
| `roomstore.catalog` | `{ categories:[{id,nameAr,nameEn,order}], products:[{id,nameAr,nameEn,descAr,descEn,price,category,inStock,removed}] }` | admin; seeded once from `window.Data` |
| `roomstore.settings` | `{ hotelNameAr, hotelNameEn, currencyAr, currencyEn, timeZone, roomFormat, roomFormatChangedAt, roomFormatChangedBy }` — `roomFormat` is `{ minLen, maxLen, allowLetters, separator, requireDigit }`, separator `''` or `'-'` only | admin |
| `roomstore.fakeserver` | the hotel's order table `{ byKey, byNo, nextNo }` — shape defined by `app/js/store.js` | guest (create), staff (status), admin (read) |
| `roomstore.staff` | `{ members:[{id,name,pin}], session:{memberId, since} }` | staff, admin |
| `roomstore.admin` | `{ email, passwordHash, session }` | admin |

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
- `HotelDB.setStatus(orderNo, status, meta)` — `meta` carries `{ staffId, at }`.
- `HotelDB.cancel(orderNo, reasonAr, reasonEn, staffId)`.
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
- Staff PINs: `1111` (سارة / Sara), `2222` (خالد / Khalid)
- Admin: `manager@alwaha.example` / `alwaha2026`

Stored as plain demo values. This is not security and the README says so.
