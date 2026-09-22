# Build contract — Hotel In-Room Store (guest web app)

Plain, clean, ordinary design. No framework, no build step, no backend.
Open `app/index.html` in a browser and it works.

## Scope note
`/CLAUDE.md` puts code out of scope. The owner explicitly asked for the working
site on top of the finished specification, so this folder is a deliberate scope
extension. The specification in `/spec/` remains the source of truth: every
behaviour, rule, limit and string here must come from it.

## Files and ownership (one owner each — never edit another module's file)
| File | Holds |
|---|---|
| `index.html` | Shell, `<div id="app">`, `<div id="modal-root">`, script order |
| `js/i18n.js` | `I18N.register()`, `t()`, language switch, RTL/LTR |
| `js/app.js` | Router, screen mounting, modal stack |
| `js/data.js` | Demo catalog + hotel settings |
| `js/store.js` | Device state, the fake server, the client-order-key contract |
| `js/views-shop.js` | G-01, G-02, G-03, G-08 |
| `js/views-checkout.js` | G-04, M-01, M-03, M-04 |
| `js/views-orders.js` | G-05, G-06, G-07, M-02 |
| `css/app.css` | All styling |

## Global objects

### `I18N`
- `I18N.register({ 'g01.add': { ar: 'أضف', en: 'Add' }, ... })` — call at module load.
- `t('g01.add')` → string in the current language.
- `t('g03.toast.skipped', { n: 2 })` → `{n}` placeholders are replaced.
- `I18N.lang` → `'ar'` | `'en'`. `I18N.setLang('en')` re-renders everything.
- Arabic is the default on first open regardless of browser language; the choice
  is saved on the device (locked decision 7, map §4 decision 12).

### `Store`
State lives on the device (`localStorage`). No login (locked decision 4).
- `Store.cart` → `[{ productId, qty, snapshot:{ nameAr, nameEn, price, image } }]`
- `Store.addToCart(productId)` / `Store.setQty(productId, qty)` / `Store.removeLine(productId)`
  — quantity is capped at **10** per line (G-01 §7.1).
- `Store.cartCount()` → sum of quantities. `Store.cartTotal()` → number.
  A line whose product left the session catalog is priced from its **snapshot**
  (G-01 §7.2 as revised, G-03 decision 10).
- `Store.orders` → newest first, the saved order record shape from M-01 §7.4:
  `{ orderNo, key, roomNumber, lines:[{productId,nameAr,nameEn,qty,price}], notes,
     payment:'card'|'cash', amount, total, status, createdAt, cancelledByGuest }`
- `Store.activeOrders()` → status in New / Accepted / OnTheWay.
- `Store.trimOrders()` — keeps the last 20 **finished** orders; a record whose
  status is New, Accepted or OnTheWay is **never deleted** (G-07 §5.4 as revised).
- `Store.sessionCatalog` → `{ [productId]: { outOfStock: bool, present: bool } }`
  Marks are written by G-03 and M-04 and never cleared within a session (G-01 §5.7).
- `Store.on('change', fn)` — fired after any mutation; the router re-renders.

### `Server` (fake, inside `store.js`)
Returns Promises, with an artificial delay, and can be told to fail so the
error paths are demonstrable.
- `Server.getCatalog()` → `{ products, categories }` or rejects.
- `Server.checkAvailability(ids)` → `{ [id]: 'available'|'outOfStock'|'notFound' }`
- `Server.submitOrder(payload)` where `payload.key` is the **client order key**:
  - new key → `{ kind:'created', order }`
  - known key, identical payload → `{ kind:'existing-identical', order }`
  - known key, different payload → `{ kind:'existing-different', order }`
  - out of stock → rejects `{ type:'outOfStock', ids:[...] }`
  - failure → rejects `{ type:'noConnection'|'timeout'|'serverError' }`
  The server **never creates a second order for a key it already holds**
  (G-04 §7.7, map §4 decision 10).
- `Server.cancelOrder(orderNo)` → `'cancelled'` | `'alreadyAccepted'` |
  rejects `{ type:'orderNotFound' }` | rejects `{ type:'failed' }` (M-02 §5.4).
- `Server.getStatus(orderNo)` → status string, or rejects.
- `Server.failMode` → `'none'|'noConnection'|'serverError'|'catalogFail'|'invalidLink'`
  set from the demo bar so every state can be shown.

### Status vocabulary — the five canonical labels (G-01 §5.2), used verbatim
`'New' | 'Accepted' | 'OnTheWay' | 'Delivered' | 'Cancelled'`
| key | ar | en |
|---|---|---|
| New | جديد | New |
| Accepted | تم القبول وجارٍ التحضير | Accepted & preparing |
| OnTheWay | في الطريق | On the way |
| Delivered | تم التوصيل | Delivered |
| Cancelled | ملغى | Cancelled |

### Views
Each view module registers into `window.Views` / `window.Modals`:
```js
Views['G-01'] = {
  render(params) { return '<section>…</section>'; },  // HTML string
  mount(root, params) { /* attach listeners to root */ }
};
```
`mount` is optional. The router replaces `#app` with `render()` then calls `mount`.

Modals are the same shape, mounted into `#modal-root` over a backdrop:
`App.openModal('M-01', params)` / `App.closeModal()`.
**M-01 is not dismissable** — backdrop and Escape do nothing there (map §4 decision 14).

### Routes (`App.go(path)`, hash based)
`#/store` G-01 · `#/product/:id` G-02 · `#/cart` G-03 · `#/checkout` G-04
`#/submitted/:orderNo` G-05 · `#/order/:orderNo` G-06 · `#/orders` G-07
G-08 is rendered in place of G-01 when the catalog cannot load.

## Element IDs
Every element that the spec gives an ID keeps it, as `data-el="G-01-B04"`.
This is how the running site can be checked against the elements tables.

## Rules that must be visible in the running app
1. Room number: **1–5 digits**, digits only, three error messages and no
   "too short" (G-04 §7.1).
2. M-01 shows the room number at **64px bold** and nothing else from the order.
3. Cash reveals the optional amount field; an amount **below the total blocks
   submission** (G-04 D9). Card never shows it.
4. Cancel appears **only while the status is New** (locked decision 6).
5. Reorder merges into the cart, caps at 10, and reports both skipped and
   capped products in **one toast** (G-03 §5.7 as revised).
6. Checkout is disabled while any line is out of stock; a failed availability
   check leaves it **enabled** with the honest helper line (G-03 F12 ruling).
7. The language toggle exists on G-01 and G-08 only.
8. Arabic is RTL and the default; English is LTR.

## Demo bar
A thin strip, clearly marked as not part of the product, that lets a reviewer
force: catalog failure, invalid link, submission failure, out-of-stock
rejection, and advancing an order's status. Without it, half the specified
states could never be seen.
