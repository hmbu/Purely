/* Device state, the fake server, and the client-order-key contract.
   Owner of: window.Store, window.Server, window.Demo.

   Nothing in here is guest-facing. Every rule below cites the spec section it
   comes from; where the spec and convenience disagree, the spec wins.

   Device storage (locked decision 4: no login, the guest's orders live on their
   own device). Three lifetimes are deliberately different:
     - localStorage  : cart, order list, pending-submission record. Survives a
                       closed tab, a browser restart and a reload.
     - sessionStorage: the checkout draft only. Tab-scoped on purpose, so a
                       closed tab destroys the typed values (G-04 §7.7).
     - memory        : the session catalog copy. Cleared only by the next
                       catalog fetch, which is exactly what a reload does
                       (G-01 §5.7).
*/
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Constants
   * ------------------------------------------------------------------ */

  /* Quantity cap per cart line. G-01 §7.1, G-03 §7.1, G-03 §5.7 step 2. */
  var MAX_PER_LINE = 10;

  /* The device keeps the last 20 FINISHED orders. G-07 §5.4. */
  var FINISHED_CAP = 20;

  /* A pending-submission record older than 24 hours is discarded.
     G-04 §7.7 rule 9 (c). */
  var PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

  /* Timeouts.
     The spec values are the ones a real build must ship:
        submission     15 s  (M-01 §7.3, M-02 §7.3)
        catalog        10 s  (G-01 §6.1)
        availability    5 s  (G-03 §5.6)
     The DEMO values below are deliberately much lower, because a reviewer
     should not sit through fifteen seconds of nothing to see a timeout state.
     Each constant names its spec value so the swap is a one-line change. */
  var TIMEOUT_MS = {
    submit:       3000,   // spec: 15000
    cancel:       3000,   // spec: 15000
    catalog:      2500,   // spec: 10000
    availability: 1500,   // spec: 5000
    status:       2500    // spec: 10000 (G-06 §5.5 status poll)
  };

  /* Artificial latency, so the in-flight states (M-01's lock, G-03's
     "Checking availability…", G-01's skeleton) are actually visible.
     Raise Server.latencyMs above a TIMEOUT_MS value from the console to make
     the genuine timeout path fire. */
  var LATENCY_MS = 450;

  var K = {
    cart:    'roomstore.cart',
    orders:  'roomstore.orders',
    pending: 'roomstore.pending',      // the pending-submission record, G-04 §7.7 rule 7
    draft:   'roomstore.draft',        // tab-scoped checkout draft, G-04 §7.7
    server:  'roomstore.fakeserver',   // the fake server's pretend database
    demo:    'roomstore.demo.failMode'
  };

  /* ------------------------------------------------------------------ *
   * Storage helpers — every read and write is guarded, because private
   * browsing and blocked site data must not break the store.
   * ------------------------------------------------------------------ */

  function readJSON(store, key, fallback) {
    try {
      var raw = store.getItem(key);
      if (raw == null) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }

  function writeJSON(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function removeKey(store, key) {
    try { store.removeItem(key); } catch (e) {}
  }

  function clone(v) {
    return v == null ? v : JSON.parse(JSON.stringify(v));
  }

  function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  /* ------------------------------------------------------------------ *
   * Store
   * ------------------------------------------------------------------ */

  var listeners = { change: [] };

  var Store = {
    /* [{ productId, qty, snapshot:{ nameAr, nameEn, price, image } }] */
    cart: [],

    /* Newest first. The record shape is M-01 §7.4 step 1. */
    orders: [],

    /* { [productId]: { outOfStock: bool, present: bool } } — G-01 §5.7.
       In memory only: a mark is cleared by the next catalog fetch and by
       nothing else, and a browser reload IS a catalog fetch. */
    sessionCatalog: {},

    on: function (event, fn) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },

    emit: function (event) {
      var list = listeners[event || 'change'] || [];
      for (var i = 0; i < list.length; i++) {
        try { list[i](); } catch (e) {}
      }
    },

    /* Called once by the router on DOMContentLoaded (app.js). */
    init: function () {
      Store.cart = normaliseCart(readJSON(localStorage, K.cart, []));
      Store.orders = normaliseOrders(readJSON(localStorage, K.orders, []));
      Store.sessionCatalog = {};
      sessionProducts = {};
      catalogLoaded = false;
      expirePending();                       // G-04 §7.7 rule 9 (c)
      Server.failMode = readJSON(localStorage, K.demo, 'none');
      /* No ServerDB load here: the hotel's order table is read fresh from
         storage on every call (shared/CONTRACT.md), never held in memory. */
    },

    /* ---------------- session catalog copy (G-01 §5.7) ---------------- */

    /* Written once per successful catalog fetch, by G-01 / G-08's Retry.
       This is the ONLY thing that clears an out-of-stock mark: a product the
       fetched catalog lists as available comes back available. */
    setSessionCatalog: function (products) {
      Store.sessionCatalog = {};
      sessionProducts = {};
      (products || []).forEach(function (p) {
        sessionProducts[p.id] = p;
        Store.sessionCatalog[p.id] = { present: true, outOfStock: !p.inStock };
      });
      catalogLoaded = true;
      Store.emit('change');
    },

    /* Written by G-03's stock re-check (§5.6) and by M-04 (§3.1), never by
       G-01. A mark for a product that is not in the copy at all is still
       recorded, so the mark survives even for a product the hotel removed. */
    markOutOfStock: function (productId) {
      var mark = Store.sessionCatalog[productId];
      if (!mark) mark = Store.sessionCatalog[productId] = { present: false, outOfStock: false };
      mark.outOfStock = true;
      Store.emit('change');
    },

    markManyOutOfStock: function (ids) {
      (ids || []).forEach(function (id) {
        var mark = Store.sessionCatalog[id];
        if (!mark) mark = Store.sessionCatalog[id] = { present: false, outOfStock: false };
        mark.outOfStock = true;
      });
      Store.emit('change');
    },

    /* The product as held in the session catalog copy, or null when the hotel
       removed it from the catalog after the line was added (G-01 §5.7 last
       bullet). Callers must fall back to the line's snapshot. */
    sessionProduct: function (productId) {
      return sessionProducts[productId] || null;
    },

    catalogIsLoaded: function () { return catalogLoaded; },

    /* True when the line must be drawn in its out-of-stock form: either it
       carries a mark, or its product is gone from the copy altogether
       (G-03 decision 10: a missing product is treated as out of stock). */
    isOutOfStock: function (productId) {
      var mark = Store.sessionCatalog[productId];
      if (!catalogLoaded) return false;
      if (!mark) return true;
      return !!mark.outOfStock;
    },

    /* ------------------------- cart (G-01 §7.1) ------------------------ */

    cartLine: function (productId) {
      for (var i = 0; i < Store.cart.length; i++) {
        if (Store.cart[i].productId === productId) return Store.cart[i];
      }
      return null;
    },

    cartQty: function (productId) {
      var line = Store.cartLine(productId);
      return line ? line.qty : 0;
    },

    /* Adds one unit; creates the line at quantity 1 when there is none.
       Line order is add order and never changes (G-03 decision 12). */
    addToCart: function (productId) {
      var line = Store.cartLine(productId);
      if (line) {
        line.qty = Math.min(MAX_PER_LINE, line.qty + 1);
      } else {
        var p = sessionProducts[productId] || findInData(productId);
        if (!p) return;
        Store.cart.push({
          productId: productId,
          qty: 1,
          /* The snapshot is taken when the line is created and never updated.
             It is what prices and names the line after the product leaves the
             catalog (G-01 §7.2 as revised, G-03 decision 10). There are no
             images in this build, so image is null and the views draw the
             placeholder. */
          snapshot: { nameAr: p.nameAr, nameEn: p.nameEn, price: p.price, image: null }
        });
      }
      persistCart();
    },

    /* qty <= 0 removes the line. "−" at 1 removes it, with no confirmation
       and no undo (G-01 §7.1, G-03 decision 3). */
    setQty: function (productId, qty) {
      qty = Math.floor(Number(qty) || 0);
      if (qty <= 0) { Store.removeLine(productId); return; }
      var line = Store.cartLine(productId);
      if (!line) return;
      line.qty = Math.min(MAX_PER_LINE, qty);
      persistCart();
    },

    removeLine: function (productId) {
      Store.cart = Store.cart.filter(function (l) { return l.productId !== productId; });
      persistCart();
    },

    /* M-04 §5.6 step 1 / §7.3: the sold-out lines leave the cart in ONE write,
       never one line at a time, so the cart is never briefly half-removed and
       the router re-renders once. */
    removeLines: function (productIds) {
      var ids = productIds || [];
      if (!ids.length) return;
      Store.cart = Store.cart.filter(function (l) { return ids.indexOf(l.productId) === -1; });
      persistCart();
    },

    /* Emptying the cart ends the checkout session, so the client order key and
       its pending record go with it (G-04 §7.7 rule 9 (b)). */
    clearCart: function () {
      Store.cart = [];
      Store.clearPending();
      persistCart();
    },

    /* Helper for the Reorder merge (G-03 §5.7 step 2). Adds n units and
       reports whether the cap swallowed some of them, which is counter C of
       the toast. Returns { added, capped }. */
    addQty: function (productId, n) {
      n = Math.max(0, Math.floor(Number(n) || 0));
      var line = Store.cartLine(productId);
      var before = line ? line.qty : 0;
      if (!line) {
        var p = sessionProducts[productId] || findInData(productId);
        if (!p) return { added: 0, capped: false };
        line = {
          productId: productId,
          qty: 0,
          snapshot: { nameAr: p.nameAr, nameEn: p.nameEn, price: p.price, image: null }
        };
        Store.cart.push(line);
      }
      var after = Math.min(MAX_PER_LINE, before + n);
      line.qty = after;
      /* A product counts toward C when existing + requested > 10, INCLUDING
         the case where the line already stood at 10 and nothing was added.
         G-03 §5.7, "The two merge counters". */
      return { added: after - before, capped: (before + n) > MAX_PER_LINE };
    },

    /* The merged cart is written to the device once, not per line
       (G-03 §5.7 step 3). */
    persistCart: function () { persistCart(); },

    /* Sum of quantities, not of lines: 3 bottles = 3 items (G-01 §7.3). */
    cartCount: function () {
      var n = 0;
      Store.cart.forEach(function (l) { n += l.qty; });
      return n;
    },

    /* Unit price comes from the session catalog copy while the product is
       present there; otherwise from the line's own snapshot, so the floating
       bar on G-01 and the Total on G-03 can never disagree for the same cart
       (G-01 §7.2, G-03 decision 10). */
    unitPrice: function (line) {
      var p = sessionProducts[line.productId];
      return Number(p ? p.price : (line.snapshot ? line.snapshot.price : 0));
    },

    lineName: function (line, lang) {
      var p = sessionProducts[line.productId] || line.snapshot || {};
      return (lang || I18N.lang) === 'en' ? p.nameEn : p.nameAr;
    },

    cartTotal: function () {
      var total = 0;
      Store.cart.forEach(function (l) { total += Store.unitPrice(l) * l.qty; });
      return round2(total);
    },

    maxPerLine: MAX_PER_LINE,

    /* --------------- checkout draft (G-04 §7.7, tab-scoped) ------------ */

    /* Four typed values plus the awaiting-resubmission bit. sessionStorage, so
       a closed or discarded tab starts empty and nothing is reconstructed. */
    getDraft: function () {
      return readJSON(sessionStorage, K.draft, {
        room: '', notes: '', payment: null, amount: '', awaitingResubmission: false
      });
    },

    setDraft: function (patch) {
      var d = Store.getDraft();
      for (var key in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, key)) d[key] = patch[key];
      }
      writeJSON(sessionStorage, K.draft, d);
      return d;
    },

    clearDraft: function () { removeKey(sessionStorage, K.draft); },

    /* ---------- client order key + pending record (G-04 §7.7) ---------- */

    /* Rule 1: the key identifies the SUBMISSION ATTEMPT, not the values it
       carries. It is generated once per checkout session, the first time M-01
       opens — unless the device still holds an unresolved pending-submission
       record, whose key is adopted instead (rule 8). That adoption is what
       protects the guest who force-closed the tab mid-submission: the next
       submission carries the same key, so the server either creates the order
       or hands back the one it already has. */
    orderKey: function () {
      var pending = Store.getPending();
      if (pending && pending.key) return pending.key;      // rule 8: adopt
      if (!currentKey) currentKey = makeKey();             // rule 1: generate
      return currentKey;
    },

    /* Rule 7: written in the same synchronous step as M-01's in-flight lock,
       before any response can arrive. Device-scoped, never tab-scoped.
       The three descriptive values exist only so a human reading device state
       can recognise the attempt; nothing in version 1 displays them. */
    writePending: function (info) {
      var existing = Store.getPending();
      var key = Store.orderKey();
      var record = {
        key: key,
        firstSentAt: existing && existing.key === key ? existing.firstSentAt : Date.now(),
        roomNumber: info && info.roomNumber != null ? String(info.roomNumber) : '',
        total: info && info.total != null ? info.total : 0,
        lineCount: info && info.lineCount != null ? info.lineCount : 0
      };
      writeJSON(localStorage, K.pending, record);
      currentKey = key;
      return record;
    },

    getPending: function () {
      expirePending();
      return readJSON(localStorage, K.pending, null);
    },

    /* Rule 3, the ONE replacement case: a stock rejection is a response the
       device received and READ, in which the server states definitively that
       no order was created for that key. An edit made after a lost or
       ambiguous response proves nothing, which is why M-03 never does this.
       The record is not deleted — its key is replaced in place and its time of
       first send becomes this moment, so the 24-hour bound always has a start
       and the rejected key can never be adopted by a later checkout. */
    replaceKeyAfterStockRejection: function () {
      currentKey = makeKey();
      var existing = readJSON(localStorage, K.pending, null);
      if (existing) {
        existing.key = currentKey;
        existing.firstSentAt = Date.now();
        writeJSON(localStorage, K.pending, existing);
      }
      return currentKey;
    },

    /* Rule 9: the key and the record are discarded together, in exactly three
       cases — (a) a success-side response of any kind is applied, (b) the cart
       is emptied, (c) 24 hours after the first send. An M-03 outcome, an M-04
       outcome and a closed tab clear nothing. */
    clearPending: function () {
      removeKey(localStorage, K.pending);
      currentKey = null;
    },

    /* ------------------------ orders (M-01 §7.4) ----------------------- */

    /* Step 1: save the order the SERVER returned, never the payload just sent.
       Names are stored in both languages so G-06 and G-07 still render the
       order after a language switch and after a product leaves the catalog.
       The status is the one the server returned; New is a default only when
       the response carries none — M-01 never writes New over a status the
       hotel already moved past, because that would promise a cancellation the
       guest no longer has (locked decision 6). */
    saveOrder: function (order) {
      var record = {
        orderNo: String(order.orderNo),
        key: order.key,
        roomNumber: String(order.roomNumber),
        lines: (order.lines || []).map(function (l) {
          return {
            productId: l.productId,
            nameAr: l.nameAr,
            nameEn: l.nameEn,
            qty: l.qty,
            price: l.price
          };
        }),
        notes: order.notes || '',
        payment: order.payment,                       // 'card' | 'cash'
        amount: order.amount == null ? null : order.amount,
        total: round2(order.total),
        status: order.status || 'New',
        createdAt: order.createdAt || Date.now(),     // ms epoch; G-07 sorts on it
        cancelledByGuest: false,
        /* Written later by G-06 §5.3 when a cancellation succeeds: the last
           status reached before Cancelled. Never changed once written. */
        cancelledFrom: null
      };
      Store.orders = Store.orders.filter(function (o) { return o.orderNo !== record.orderNo; });
      Store.orders.unshift(record);
      /* M-01 writes one record per success and never trims; only G-07 trims
         (G-07 §5.4, "No screen other than G-07 trims the list"). */
      persistOrders();
      return record;
    },

    getOrder: function (orderNo) {
      orderNo = String(orderNo);
      for (var i = 0; i < Store.orders.length; i++) {
        if (Store.orders[i].orderNo === orderNo) return Store.orders[i];
      }
      return null;
    },

    updateOrder: function (orderNo, patch) {
      var rec = Store.getOrder(orderNo);
      if (!rec) return null;
      for (var key in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, key)) rec[key] = patch[key];
      }
      persistOrders();
      return rec;
    },

    /* New / Accepted / OnTheWay — the three statuses that make an order
       trackable, bannerable on G-01, and undeletable by the trim. */
    activeOrders: function () {
      return Store.orders.filter(function (o) {
        return o.status === 'New' || o.status === 'Accepted' || o.status === 'OnTheWay';
      });
    },

    /* G-07 §5.4, applied by G-07 on every entry, before the first frame.
       1. A record whose status is New, Accepted or OnTheWay is NEVER deleted,
          whatever its age and whatever the length of the list.
       2. While more than 20 records are held AND at least one is finished,
          delete the oldest finished one; repeat.
       3. Stop at 20 or fewer, OR when every remaining record is active — in
          which case the list is simply longer than 20. A list of 23 rows, all
          active, is a correct list. */
    trimOrders: function () {
      var removed = 0;
      for (;;) {
        if (Store.orders.length <= FINISHED_CAP) break;
        var oldestFinishedIndex = -1;
        for (var i = 0; i < Store.orders.length; i++) {
          var o = Store.orders[i];
          if (o.status !== 'Delivered' && o.status !== 'Cancelled') continue;
          if (oldestFinishedIndex === -1) { oldestFinishedIndex = i; continue; }
          if (isOlder(o, Store.orders[oldestFinishedIndex])) oldestFinishedIndex = i;
        }
        if (oldestFinishedIndex === -1) break;   // every remaining record is active
        Store.orders.splice(oldestFinishedIndex, 1);
        removed++;
      }
      sortOrders();
      if (removed) persistOrders(); else writeJSON(localStorage, K.orders, Store.orders);
      return removed;
    },

    finishedCap: FINISHED_CAP,

    /* Used by the demo reset. Wipes every trace this app keeps on the device. */
    wipeDevice: function () {
      removeKey(localStorage, K.cart);
      removeKey(localStorage, K.orders);
      removeKey(localStorage, K.pending);
      removeKey(localStorage, K.server);
      removeKey(localStorage, K.demo);
      removeKey(sessionStorage, K.draft);
      try { localStorage.removeItem('roomstore.lang'); } catch (e) {}
    }
  };

  /* ------------------------------------------------------------------ *
   * Store internals
   * ------------------------------------------------------------------ */

  var sessionProducts = {};   // productId -> product object from the last fetch
  var catalogLoaded = false;
  var currentKey = null;      // the key of the current checkout session

  /* The hotel's live catalog (shared/hotel-db.js), removed products excluded,
     so a price or stock change made in admin reaches the guest's catalog
     fetch, the G-03 availability check and the submission check alike. */
  function liveProducts() {
    var c = window.HotelDB ? HotelDB.catalog() : { products: (window.Data && Data.products) || [] };
    return (c.products || []).filter(function (p) { return p && !p.removed; });
  }

  function liveCategories() {
    var c = window.HotelDB ? HotelDB.catalog() : { categories: (window.Data && Data.categories) || [] };
    return c.categories || [];
  }

  function findInData(productId) {
    var list = liveProducts();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === productId) return list[i];
    }
    return null;
  }

  function persistCart() {
    writeJSON(localStorage, K.cart, Store.cart);
    Store.emit('change');
  }

  function persistOrders() {
    sortOrders();
    writeJSON(localStorage, K.orders, Store.orders);
    Store.emit('change');
  }

  /* Newest first by order time; ties (possible only when two records fell back
     to device time in the same second) broken by order number, higher first.
     G-07 §5.4, "Sort". */
  function sortOrders() {
    Store.orders.sort(function (a, b) {
      if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
      return Number(b.orderNo) - Number(a.orderNo);
    });
  }

  function isOlder(a, b) {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt;
    return Number(a.orderNo) < Number(b.orderNo);
  }

  function normaliseCart(raw) {
    if (!raw || !raw.length) return [];
    var out = [];
    raw.forEach(function (l) {
      if (!l || !l.productId) return;
      out.push({
        productId: l.productId,
        qty: Math.min(MAX_PER_LINE, Math.max(1, Math.floor(Number(l.qty) || 1))),
        snapshot: l.snapshot || { nameAr: '', nameEn: '', price: 0, image: null }
      });
    });
    return out;
  }

  function normaliseOrders(raw) {
    if (!raw || !raw.length) return [];
    var out = raw.filter(function (o) { return o && o.orderNo; });
    out.forEach(function (o) {
      if (o.cancelledByGuest == null) o.cancelledByGuest = false;
      if (o.cancelledFrom === undefined) o.cancelledFrom = null;
    });
    out.sort(function (a, b) {
      if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
      return Number(b.orderNo) - Number(a.orderNo);
    });
    return out;
  }

  /* G-04 §7.7 rule 9 (c): a key from a previous day describes an order the
     hotel has long since delivered or cancelled, and which staff can see on
     their own screens. */
  function expirePending() {
    var rec = readJSON(localStorage, K.pending, null);
    if (!rec) return;
    if (Date.now() - (rec.firstSentAt || 0) > PENDING_MAX_AGE_MS) {
      removeKey(localStorage, K.pending);
      currentKey = null;
    }
  }

  function makeKey() {
    return 'k-' + Date.now().toString(36) + '-' +
           Math.floor(Math.random() * 1e9).toString(36);
  }

  /* ------------------------------------------------------------------ *
   * The fake server
   *
   * It is not a backend design; it is the behaviour the technical team must
   * build, made runnable so the specified states can be seen. Its "database"
   * is one localStorage entry, separate from device state, so a reload does
   * not make the hotel forget the orders it holds — which is what makes the
   * client-order-key contract demonstrable at all.
   * ------------------------------------------------------------------ */

  /* The hotel's order table is shared with the staff and admin apps
     (shared/CONTRACT.md), which change it from other tabs. So ServerDB holds
     NOTHING in memory: every call reads the table fresh from storage through
     HotelDB, and a write is always read-change-write in one synchronous step.
     A copy kept from startup would go stale the moment staff accept an order,
     and G-06 would never see the acceptance.

       table.byKey : clientOrderKey -> stored order (the hotel's copy)
       table.byNo  : orderNo        -> clientOrderKey
       table.nextNo: the next order number to hand out */
  var ServerDB = {
    read: function () { return HotelDB._readTable(); },

    write: function (table) { HotelDB._writeTable(table); },

    byOrderNo: function (table, orderNo) {
      var key = table.byNo[String(orderNo)];
      return key ? table.byKey[key] || null : null;
    }
  };

  /* Latency plus a real timeout race. With LATENCY_MS at 450 and the demo
     timeouts at 1.5–3 s the timeout never fires by itself; raise
     Server.latencyMs from the console to exercise it. */
  function respond(kind, produce) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject({ type: 'timeout' });
      }, TIMEOUT_MS[kind]);

      setTimeout(function () {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { produce(resolve, reject); }
        catch (e) { reject({ type: 'serverError' }); }
      }, Server.latencyMs);
    });
  }

  /* Every call honours failMode, so the demo bar can force each path. The two
     transport failures apply to every call; the other modes are scoped to the
     call they can actually break. */
  function transportFailure() {
    if (Server.failMode === 'noConnection') return { type: 'noConnection' };
    if (Server.failMode === 'serverError') return { type: 'serverError' };
    return null;
  }

  /* --- the payload fingerprint: how identical is told from different ---
     G-04 §7.7 rule 4 lists exactly what makes two submissions "the same
     order": the lines, their quantities, the room number, the payment method,
     the amount and the notes. Everything else in the payload is deliberately
     excluded:
       - the interface language, because a guest who switched to English after
         a lost response submitted the same order, not a different one;
       - the total, because it is derived from the lines and would only add a
         second way for the same difference to be detected;
       - the key itself, which is the identity being matched, not a value.
     Lines are sorted by product identifier before hashing so that a cart the
     guest rebuilt in a different order still compares equal. Quantity and
     price are compared, and price is included because a line at a changed
     price is a different order to the hotel even at the same quantity.
     The comparison is a plain string equality on this canonical form: it is
     the whole of the identical/different decision, and it must stay
     conservative — anything not listed above must NOT make a retry look like
     a new order, because that is how a lost response turns into two trays at
     the door. */
  function fingerprint(payload) {
    var lines = (payload.lines || []).slice().sort(function (a, b) {
      return a.productId < b.productId ? -1 : (a.productId > b.productId ? 1 : 0);
    }).map(function (l) {
      return l.productId + '×' + l.qty + '@' + round2(l.price);
    }).join('|');
    return [
      'room:' + String(payload.roomNumber == null ? '' : payload.roomNumber),
      'pay:' + String(payload.payment || ''),
      'amt:' + (payload.amount == null || payload.amount === '' ? 'none' : String(payload.amount)),
      'notes:' + String(payload.notes == null ? '' : payload.notes),
      'lines:' + lines
    ].join('§');
  }

  /* A cancellation the HOTEL made (staff or admin, through HotelDB.cancel)
     carries two facts the guest's device cannot work out alone: the step it
     was cancelled from, and the reason staff gave. getStatus resolves a plain
     status string (G-01's banner and G-07 read it as one), so the two facts
     are written onto the device record here, before the status is resolved,
     in exactly the fields G-06 reads: `cancelledFrom` (§5.3 — written once,
     never changed; G-06 then keeps it) and `cancelReason` (C08, one string,
     in the language the guest is using). Written silently: G-06's own write
     of the status, a moment later, persists and repaints. A guest
     cancellation needs nothing here — G-06 records it itself (§5.3). */
  function noteHotelCancellation(orderNo, held) {
    if (held.cancelledByGuest) return;
    var rec = Store.getOrder(orderNo);
    if (!rec || rec.cancelledFrom) return;
    var from = held.cancelledFrom;
    if (from !== 'New' && from !== 'Accepted' && from !== 'OnTheWay') return;
    rec.cancelledFrom = from;
    var ar = String(held.cancelReasonAr || ''), en = String(held.cancelReasonEn || '');
    var reason = I18N.lang === 'en' ? (en || ar) : (ar || en);
    if (reason.replace(/\s/g, '') !== '') rec.cancelReason = reason;
    writeJSON(localStorage, K.orders, Store.orders);
  }

  var Server = {
    /* 'none' | 'noConnection' | 'serverError' | 'catalogFail' | 'invalidLink'
       plus two demo-bar modes the index.html strip offers:
       'outOfStock' (rejection at submission) and 'orderNotFound'. */
    failMode: 'none',

    latencyMs: LATENCY_MS,

    /* The spec and demo timeout values, exposed so a reviewer can read them. */
    timeouts: TIMEOUT_MS,

    /* Companion value to cancelOrder's 'alreadyAccepted' resolution: the real
       status the hotel holds. M-02 §5.4 hands "already accepted, WITH that
       status" to G-06, and the contract fixes the resolved value to a plain
       string, so the status travels here. Read it immediately after the
       promise resolves. */
    lastCancelStatus: null,

    /* G-01 §6.1: the catalog request. 10 s in the spec, TIMEOUT_MS.catalog
       here. A failure of any kind sends the guest to G-08, whose variant is
       chosen from the rejection type. */
    getCatalog: function () {
      return respond('catalog', function (resolve, reject) {
        if (Server.failMode === 'invalidLink') { reject({ type: 'invalidLink' }); return; }
        if (Server.failMode === 'catalogFail') { reject({ type: 'serverError' }); return; }
        var fail = transportFailure();
        if (fail) { reject(fail); return; }
        /* The hotel's live catalog (HotelDB), removed products excluded, so a
           price or stock change made in admin reaches G-01 on the next fetch. */
        resolve({ products: clone(liveProducts()), categories: clone(liveCategories()) });
      });
    },

    /* G-03 §5.6: one request, all the identifiers, no quantities, reserves
       nothing. Stock is yes/no per product in version 1 — there is no
       "only 2 left". */
    checkAvailability: function (ids) {
      return respond('availability', function (resolve, reject) {
        var fail = transportFailure();
        if (fail) { reject(fail); return; }
        var out = {};
        (ids || []).forEach(function (id) {
          var p = findInData(id);
          if (!p) out[id] = 'notFound';
          else out[id] = p.inStock ? 'available' : 'outOfStock';
        });
        resolve(out);
      });
    },

    /* ================================================================
       submitOrder — the client order key contract, G-04 §7.7 rule 4.

       THE ONE RULE THIS FUNCTION EXISTS FOR: the server never creates a
       second order for a key it already holds, and it never merges, updates
       or overwrites the stored order with newly submitted values.

       Why it matters more than anything else in this file: the guest has no
       login and no account, so a lost response is indistinguishable, on the
       device, from a response that never left. The only thing that can tell
       "my request arrived and the answer was lost" from "my request never
       arrived" is the key the device attached to the attempt. If this
       function ever created a second order for a known key, a guest on a weak
       connection tapping "Confirm and send" twice would get two trays at the
       door, and the hotel would have no way to know which one the guest meant.

       Three success kinds, and nothing else on the success side:
         created            - no order for this key; the submitted order is
                              created. Plain success.
         existing-identical - an order exists for this key and the payload is
                              the same order. The stored order is returned and
                              the guest is told NOTHING extra: this is the
                              duplicate-safe retry working exactly as designed.
         existing-different - an order exists for this key and the payload
                              differs (most often a corrected room number).
                              Nothing is created, nothing is merged, nothing
                              is overwritten: the STORED order comes back,
                              marked already existing, carrying the room
                              number and the status the hotel holds. G-05
                              tells the guest, and the repair path is locked
                              decision 6: cancel while New, then order again.

       Identical versus different is decided by comparing the canonical
       fingerprint of the payload (see fingerprint() above) against the one
       recorded when the order was created. Same fingerprint → identical.
       Any difference in lines, quantities, room number, payment, amount or
       notes → different. Language, total and the key itself are excluded on
       purpose; they are not the order.
       ================================================================ */
    submitOrder: function (payload) {
      return respond('submit', function (resolve, reject) {
        var fail = transportFailure();
        if (fail) { reject(fail); return; }

        /* Stock rejection. The hotel creates nothing, which is precisely why
           M-04 is allowed to replace the key afterwards (G-04 §7.7 rule 3):
           this is a response the device received and read, stating that no
           order exists for that key. Note that we return BEFORE touching
           ServerDB — no record is written on this path. */
        if (Server.failMode === 'outOfStock') {
          var ids = [];
          (payload.lines || []).forEach(function (l) {
            var p = findInData(l.productId);
            if (p && !p.inStock) ids.push(l.productId);
          });
          /* Everything in the cart happens to be in stock: reject the first
             line anyway, so the demo always reaches M-04. */
          if (!ids.length && payload.lines && payload.lines.length) {
            ids.push(payload.lines[0].productId);
          }
          reject({ type: 'outOfStock', ids: ids });
          return;
        }

        var db = ServerDB.read();
        var key = payload.key;
        var held = key ? db.byKey[key] : null;
        var print = fingerprint(payload);

        if (held) {
          /* The key is already held. Under no circumstance is a second order
             created here, and the stored order is returned untouched. */
          resolve({
            kind: print === held.fingerprint ? 'existing-identical' : 'existing-different',
            order: clone(held)
          });
          return;
        }

        var orderNo = String(db.nextNo++);
        var order = {
          orderNo: orderNo,
          key: key,
          roomNumber: String(payload.roomNumber),
          lines: (payload.lines || []).map(function (l) {
            return {
              productId: l.productId,
              nameAr: l.nameAr,
              nameEn: l.nameEn,
              qty: l.qty,
              price: round2(l.price)
            };
          }),
          notes: payload.notes || '',
          payment: payload.payment,
          amount: payload.amount == null || payload.amount === '' ? null : payload.amount,
          total: round2(payload.total),
          status: 'New',
          createdAt: Date.now(),
          fingerprint: print
        };
        db.byKey[key] = order;
        db.byNo[orderNo] = key;
        ServerDB.write(db);
        resolve({ kind: 'created', order: clone(order) });
      });
    },

    /* M-02 §5.4. Four outcomes and never a fifth; the ambiguous ones all fall
       to 'failed', which is the classification that keeps the sheet open and
       the retry available. Cancelling is idempotent: a second request for an
       order already cancelled answers 'cancelled' again, which is what lets
       M-02's copy promise that trying again is safe. */
    cancelOrder: function (orderNo) {
      return respond('cancel', function (resolve, reject) {
        Server.lastCancelStatus = null;
        if (transportFailure()) { reject({ type: 'failed' }); return; }
        if (Server.failMode === 'orderNotFound') { reject({ type: 'orderNotFound' }); return; }

        var db = ServerDB.read();
        var order = ServerDB.byOrderNo(db, orderNo);
        if (!order) { reject({ type: 'orderNotFound' }); return; }

        if (order.status === 'New' || order.status === 'Cancelled') {
          /* The hotel's copy records who cancelled and from where, so staff
             and admin can tell a guest cancellation from their own. An order
             that is already Cancelled is left exactly as it is. */
          if (order.status === 'New') {
            var now = Date.now();
            order.status = 'Cancelled';
            order.cancelledFrom = 'New';
            order.cancelledByGuest = true;
            order.cancelledBy = 'guest';
            order.cancelledAt = now;
            order.updatedAt = now;
            if (!order.log) order.log = [];
            order.log.push({ status: 'Cancelled', at: now, staffId: 'guest' });
            ServerDB.write(db);
          }
          Server.lastCancelStatus = 'Cancelled';
          resolve('cancelled');
          return;
        }
        /* Accepted, OnTheWay or Delivered: the race is resolved by the hotel,
           not by the device. The real status travels on lastCancelStatus. */
        Server.lastCancelStatus = order.status;
        resolve('alreadyAccepted');
      });
    },

    /* G-06 §5.5 / G-01's banner. Resolves one of the five canonical status
       strings, or rejects. */
    getStatus: function (orderNo) {
      return respond('status', function (resolve, reject) {
        var fail = transportFailure();
        if (fail) { reject(fail); return; }
        if (Server.failMode === 'orderNotFound') { reject({ type: 'orderNotFound' }); return; }
        var order = ServerDB.byOrderNo(ServerDB.read(), orderNo);
        if (!order) { reject({ type: 'orderNotFound' }); return; }
        if (order.status === 'Cancelled') noteHotelCancellation(orderNo, order);
        resolve(order.status);
      });
    },

    /* Used only by the demo bar: moves the hotel's own copy forward. */
    _advance: function (orderNo, status) {
      var res = HotelDB.setStatus(orderNo, status, { staffId: 'demo', at: Date.now() });
      return res.ok ? status : null;
    }
  };

  /* ------------------------------------------------------------------ *
   * Demo bar — NOT part of the product.
   *
   * Half the specified states (catalog failure, invalid link, submission
   * failure, stock rejection, a status moving forward) can never be triggered
   * by the guest, so a reviewer could never see them. This wires the strip in
   * index.html; it adds nothing to the product and reads nothing the product
   * reads.
   * ------------------------------------------------------------------ */

  var STATUS_ORDER = ['New', 'Accepted', 'OnTheWay', 'Delivered'];

  var Demo = {
    init: function () {
      var select = document.getElementById('demo-fail');
      var advance = document.getElementById('demo-advance');
      var reset = document.getElementById('demo-reset');

      if (select) {
        select.value = Server.failMode;
        select.addEventListener('change', function () {
          Server.failMode = select.value;
          writeJSON(localStorage, K.demo, Server.failMode);
        });
      }

      /* Moves the newest ACTIVE order one step along locked decision 5:
         New → Accepted → OnTheWay → Delivered. Cancelled is terminal and is
         never reached this way; it is reached by the guest cancelling. */
      if (advance) {
        advance.addEventListener('click', function () {
          var active = Store.activeOrders();
          if (!active.length) return;
          var order = active[0];                       // activeOrders is newest first
          var i = STATUS_ORDER.indexOf(order.status);
          if (i === -1 || i >= STATUS_ORDER.length - 1) return;
          var next = STATUS_ORDER[i + 1];
          Server._advance(order.orderNo, next);        // the hotel's copy
          Store.updateOrder(order.orderNo, { status: next });  // the device record
          Store.emit('change');
        });
      }

      if (reset) {
        reset.addEventListener('click', function () {
          Store.wipeDevice();
          location.hash = '#/store';
          location.reload();
        });
      }
    }
  };

  window.Store = Store;
  window.Server = Server;
  window.Demo = Demo;
})();
