/* shared/hotel-db.js — window.HotelDB, the hotel's one memory.
   Contract: shared/CONTRACT.md (binding).

   There is no backend. The guest app (app/), the staff app (staff/) and the
   admin app (admin/) are static pages that share the browser's localStorage.
   HotelDB owns every key below; the apps never touch these keys directly.

     roomstore.catalog     { categories:[{id,nameAr,nameEn,order}],
                             products:[{id,nameAr,nameEn,descAr,descEn,price,
                                        category,inStock,removed}] }
     roomstore.settings    { hotelNameAr, hotelNameEn, currencyAr, currencyEn,
                             timeZone, roomFormat }
     roomstore.fakeserver  { byKey, byNo, nextNo } — the hotel's order table.
                           The SHAPE IS DEFINED BY app/js/store.js (its
                           ServerDB). Each order record, as the guest's
                           Server.submitOrder creates it:
                             { orderNo, key, roomNumber,
                               lines:[{productId,nameAr,nameEn,qty,price}],
                               notes, payment ('card'|'cash'), amount (null|string),
                               total, status, createdAt (ms), fingerprint }
                           Fields HotelDB adds as the order moves (all optional,
                           absent on a fresh order):
                             updatedAt        ms of the last status change
                             log              [{ status, at, staffId }] one row
                                              per change, oldest first
                             cancelledFrom    last forward status reached before
                                              Cancelled ('New'|'Accepted'|'OnTheWay')
                             cancelledByGuest true only when the guest cancelled
                             cancelReasonAr   staff's reason, Arabic  ('' if none)
                             cancelReasonEn   staff's reason, English ('' if none)
                             cancelledBy      staffId, or 'guest'
                             cancelledAt      ms
                           The guest device record keeps ONE reason string,
                           `cancelReason`; store.js's getStatus copies the reason
                           in the guest's language into it (G-06 C08).
     roomstore.staff       { members:[{id,name,pin}], session:{memberId,since}|null }
     roomstore.admin       { email, passwordHash, session }

   Rules
   - Every read reloads from storage. Nothing is cached across calls: another
     tab may have written a moment ago. Reads hand back copies, so a caller
     can never mutate the stored value by accident.
   - Every write notifies onChange listeners in this tab; the browser's
     `storage` event notifies every other tab.
   - Plain ES5, no libraries. Demo credentials are plain demo values, not
     security (CONTRACT "Demo credentials").
*/
(function () {
  'use strict';

  var K = {
    catalog:  'roomstore.catalog',
    settings: 'roomstore.settings',
    orders:   'roomstore.fakeserver',
    staff:    'roomstore.staff',
    admin:    'roomstore.admin'
  };

  /* store.js's ServerDB starts numbering here; the two must agree. */
  var FIRST_ORDER_NO = 1042;

  /* The five canonical statuses (CONTRACT "Statuses", G-01 §5.2). */
  var FORWARD = ['New', 'Accepted', 'OnTheWay', 'Delivered'];
  var STATUSES = FORWARD.concat(['Cancelled']);

  /* ------------------------------------------------------------------ *
   * roomFormat — the room-number rule the manager sets (A-07 / AM-04).
   *
   *   roomFormat = {
   *     minLen:       1,      // integer >= 1  — fewest characters allowed
   *     maxLen:       5,      // integer >= minLen, <= 12 — most characters
   *     allowLetters: false,  // true: Latin letters A–Z / a–z allowed too
   *     separator:    '',     // '' (none) or '-' only — allowed
   *     requireDigit: true    //    between characters, never first, last or
   *   }                       //    doubled ("12-B" yes; "-12", "12--B" no).
   *                           //  requireDigit: at least one 0-9 somewhere, so a
   *                           //  lettered format still refuses "ABC".
   *
   * Length is counted on the whole trimmed value, separator included.
   * Digits are always allowed. Arabic-Indic digits are converted to 0–9 by
   * the guest's field before the rule sees them (G-04 §7.1).
   *
   * DEFAULT = { minLen:1, maxLen:5, allowLetters:false, separator:'' }:
   * digits only, 1 to 5 — exactly the guest's G-04 §7.1 behaviour, with its
   * three messages. Anything missing or invalid in a stored roomFormat falls
   * back to the default value for that field.
   * ------------------------------------------------------------------ */
  var DEFAULT_ROOM_FORMAT = { minLen: 1, maxLen: 5, allowLetters: false, separator: '', requireDigit: true };
  var SEPARATORS = ['-'];   // hyphen only: PM ruling on AM-04 disagreement 1
  var ROOM_LEN_CAP = 12;

  /* ------------------------------------------------------------------ *
   * Seeds (first run only; an existing value is never overwritten)
   * ------------------------------------------------------------------ */

  function seedSettings() {
    var D = window.Data || {};
    return {
      hotelNameAr: D.hotelNameAr || 'فندق الواحة',
      hotelNameEn: D.hotelNameEn || 'Al Waha Hotel',
      currencyAr: 'ر.س',
      currencyEn: 'SAR',
      timeZone: 'Asia/Riyadh',
      roomFormat: clone(DEFAULT_ROOM_FORMAT)
    };
  }

  function seedCatalog() {
    var D = window.Data;
    if (!D || !D.products) return null;          // nothing to seed from yet
    return {
      categories: (D.categories || []).map(function (c, i) {
        return { id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, order: i };
      }),
      products: D.products.map(function (p) {
        return {
          id: p.id, nameAr: p.nameAr, nameEn: p.nameEn,
          descAr: p.descAr || '', descEn: p.descEn || '',
          price: Number(p.price), category: p.category,
          inStock: p.inStock !== false, removed: false
        };
      })
    };
  }

  function seedStaff() {
    return {
      members: [
        { id: 's-sara',   name: 'سارة / Sara',   pin: '1111' },
        { id: 's-khalid', name: 'خالد / Khalid', pin: '2222' }
      ],
      session: null
    };
  }

  function seedAdmin() {
    return {
      email: 'manager@alwaha.example',
      passwordHash: hashPassword('alwaha2026'),
      session: null
    };
  }

  /* ------------------------------------------------------------------ *
   * Storage helpers
   * ------------------------------------------------------------------ */

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function read(key) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { return false; }
    notify(key, 'local');
    return true;
  }

  function ensure(key, seedFn) {
    var v = read(key);
    if (v != null) return v;
    v = seedFn();
    if (v != null) {
      try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
    }
    return v;
  }

  /* Not security — a demo prototype has no secrets (CONTRACT). FNV-1a, hex. */
  function hashPassword(s) {
    var h = 0x811c9dc5;
    s = String(s == null ? '' : s);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return 'fnv1a:' + ('0000000' + h.toString(16)).slice(-8);
  }

  /* ------------------------------------------------------------------ *
   * Change notification
   * ------------------------------------------------------------------ */

  var listeners = [];

  function notify(key, source) {
    var list = listeners.slice();
    for (var i = 0; i < list.length; i++) {
      try { list[i]({ key: key, source: source }); } catch (e) {}
    }
  }

  function isOwnedKey(key) {
    if (key == null) return true;                 // localStorage.clear()
    for (var k in K) if (K[k] === key) return true;
    return false;
  }

  if (window.addEventListener) {
    window.addEventListener('storage', function (e) {
      if (e.storageArea && e.storageArea !== window.localStorage) return;
      if (!isOwnedKey(e.key)) return;
      notify(e.key, 'remote');
    });
  }

  /* ------------------------------------------------------------------ *
   * Order table (shape owned by store.js — { byKey, byNo, nextNo })
   * ------------------------------------------------------------------ */

  function readTable() {
    var raw = read(K.orders);
    if (raw && raw.byKey) {
      return { byKey: raw.byKey, byNo: raw.byNo || {}, nextNo: raw.nextNo || FIRST_ORDER_NO };
    }
    return { byKey: {}, byNo: {}, nextNo: FIRST_ORDER_NO };
  }

  function writeTable(t) {
    return write(K.orders, { byKey: t.byKey, byNo: t.byNo, nextNo: t.nextNo });
  }

  function findIn(t, orderNo) {
    var key = t.byNo[String(orderNo)];
    return key ? t.byKey[key] || null : null;
  }

  function newestFirst(a, b) {
    if (b.createdAt !== a.createdAt) return (b.createdAt || 0) - (a.createdAt || 0);
    return Number(b.orderNo) - Number(a.orderNo);
  }

  function nextStatus(status) {
    var i = FORWARD.indexOf(status);
    return (i === -1 || i >= FORWARD.length - 1) ? null : FORWARD[i + 1];
  }

  function isFinal(status) { return status === 'Delivered' || status === 'Cancelled'; }

  /* Every staff/hotel change goes through here: reload, change one record,
     write back — in one synchronous step so no other code runs in between. */
  function changeOrder(orderNo, mutate) {
    var t = readTable();
    var order = findIn(t, orderNo);
    if (!order) return { ok: false, error: 'notFound', order: null };
    var err = mutate(order);
    if (err) return { ok: false, error: err, order: clone(order) };
    writeTable(t);
    return { ok: true, error: null, order: clone(order) };
  }

  function logRow(order, status, meta) {
    var at = (meta && meta.at) || Date.now();
    if (!order.log) order.log = [];
    order.log.push({ status: status, at: at, staffId: (meta && meta.staffId) || null });
    order.updatedAt = at;
  }

  /* ------------------------------------------------------------------ *
   * roomRule
   * ------------------------------------------------------------------ */

  function normaliseRoomFormat(f) {
    f = f || {};
    var d = DEFAULT_ROOM_FORMAT;
    var min = Math.floor(Number(f.minLen));
    var max = Math.floor(Number(f.maxLen));
    if (!(min >= 1 && min <= ROOM_LEN_CAP)) min = d.minLen;
    if (!(max >= 1 && max <= ROOM_LEN_CAP)) max = d.maxLen;
    if (max < min) max = min;
    return {
      minLen: min,
      maxLen: max,
      allowLetters: f.allowLetters === true,
      separator: SEPARATORS.indexOf(f.separator) !== -1 ? f.separator : '',
      requireDigit: f.requireDigit !== false
    };
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&'); }

  /* The rule the guest's G-04 F01 validates against.
     `pattern` tests the CHARACTERS only (which characters, and where the
     separator may sit); length is checked separately against minLen/maxLen,
     so the guest keeps G-04 §7.1's priority order: empty → wrong characters
     → too long (→ too short, only reachable when minLen > 1).
     `isDefault` is true when the rule is exactly the default, in which case
     the guest shows its own three reviewed messages (G-04 §7.1) unchanged.
     `messages` are for a NON-default rule only — PROVISIONAL copy until the
     admin spec (A-07 / AM-04) rules it. */
  function roomRule(format) {
    var f;
    if (format) {
      f = normaliseRoomFormat(format);
    } else {
      var s = settings();
      f = normaliseRoomFormat(s && s.roomFormat);
    }
    var cls = f.allowLetters ? '0-9A-Za-z' : '0-9';
    var sep = f.separator ? escapeRe(f.separator) : '';
    var pattern = sep
      ? new RegExp('^[' + cls + ']+(?:' + sep + '[' + cls + ']+)*$')
      : new RegExp('^[' + cls + ']+$');

    var isDefault = f.minLen === DEFAULT_ROOM_FORMAT.minLen &&
                    f.maxLen === DEFAULT_ROOM_FORMAT.maxLen &&
                    !f.allowLetters && !f.separator;

    var rangeAr = f.minLen === f.maxLen ? String(f.maxLen) : 'من ' + f.minLen + ' إلى ' + f.maxLen;
    var rangeEn = f.minLen === f.maxLen ? String(f.maxLen) : f.minLen + ' to ' + f.maxLen;
    var whatAr = f.allowLetters ? 'أرقام وحروف إنجليزية' : 'أرقام';
    var whatEn = f.allowLetters ? 'digits and letters A–Z' : 'digits';
    var sepAr = f.separator ? '، ويمكن استخدام «' + f.separator + '» بينها' : '';
    var sepEn = f.separator ? ', "' + f.separator + '" allowed between them' : '';

    return {
      pattern: pattern,
      minLen: f.minLen,
      maxLen: f.maxLen,
      allowLetters: f.allowLetters,
      separator: f.separator,
      requireDigit: f.requireDigit,
      isDefault: isDefault,
      /* One acceptance test for everyone. The guest's G-04 and admin's AM-04
         both call this, so the live test can never pass a value the guest
         would then refuse. Returns '' when valid, else 'empty' | 'chars' |
         'long' | 'short' | 'nodigit'. */
      test: function (value) {
        var v = String(value == null ? '' : value).trim();
        if (!v) return 'empty';
        if (!pattern.test(v)) return 'chars';
        if (v.length > f.maxLen) return 'long';
        if (v.length < f.minLen) return 'short';
        if (f.requireDigit && !/[0-9]/.test(v)) return 'nodigit';
        return '';
      },
      label: {
        ar: whatAr + ' فقط، ' + rangeAr + ' خانات' + sepAr,
        en: whatEn + ' only, ' + rangeEn + ' characters' + sepEn
      },
      messages: {
        chars: { ar: 'استخدم ' + whatAr + ' فقط' + sepAr,
                 en: 'Use ' + whatEn + ' only' + sepEn },
        long:  { ar: 'رقم الغرفة طويل جدًا: ' + f.maxLen + ' خانات كحد أقصى',
                 en: 'Room number is too long: ' + f.maxLen + ' characters at most' },
        short: { ar: 'رقم الغرفة قصير جدًا: ' + f.minLen + ' خانات على الأقل',
                 en: 'Room number is too short: ' + f.minLen + ' characters at least' },
        nodigit: { ar: 'رقم الغرفة يجب أن يحتوي على رقم واحد على الأقل',
                   en: 'The room number must contain at least one digit' }
      }
    };
  }

  /* ------------------------------------------------------------------ *
   * Public API
   * ------------------------------------------------------------------ */

  function catalog() {
    var c = read(K.catalog);
    if (!c) c = ensure(K.catalog, seedCatalog);
    if (!c) return { categories: [], products: [] };
    var cats = (c.categories || []).slice().sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    });
    return { categories: clone(cats), products: clone(c.products || []) };
  }

  function settings() {
    return clone(ensure(K.settings, seedSettings));
  }

  var HotelDB = {
    keys: clone(K),
    STATUSES: STATUSES.slice(),
    FORWARD: FORWARD.slice(),
    DEFAULT_ROOM_FORMAT: clone(DEFAULT_ROOM_FORMAT),

    /* ---- catalog ---- */
    catalog: catalog,
    saveCatalog: function (c) {
      return write(K.catalog, {
        categories: (c && c.categories) || [],
        products: (c && c.products) || []
      });
    },

    /* ---- settings ---- */
    settings: settings,
    saveSettings: function (s) {
      var cur = settings() || seedSettings();
      for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) cur[k] = s[k];
      cur.roomFormat = normaliseRoomFormat(cur.roomFormat);
      return write(K.settings, cur);
    },
    roomRule: roomRule,

    /* ---- orders ---- */
    orders: function () {
      var t = readTable(), out = [];
      for (var key in t.byKey) {
        if (Object.prototype.hasOwnProperty.call(t.byKey, key) && t.byKey[key]) out.push(t.byKey[key]);
      }
      out.sort(newestFirst);
      return clone(out);
    },

    getOrder: function (orderNo) {
      return clone(findIn(readTable(), orderNo));
    },

    nextStatus: nextStatus,

    /* Moves an order ONE step forward (New → Accepted → OnTheWay → Delivered),
       or cancels it when status is 'Cancelled' (delegates to cancel() with no
       reason). meta = { staffId, at }.
       Returns { ok, error, order }; error is one of
         'notFound'  — no such order
         'stale'     — the order is no longer at the step before `status`
                       (another tab moved it, or the guest cancelled); the
                       fresh order is returned so the caller can redraw
         'invalid'   — not a canonical status */
    setStatus: function (orderNo, status, meta) {
      if (status === 'Cancelled') {
        return HotelDB.cancel(orderNo, '', '', meta && meta.staffId, meta && meta.at);
      }
      if (FORWARD.indexOf(status) < 1) return { ok: false, error: 'invalid', order: HotelDB.getOrder(orderNo) };
      return changeOrder(orderNo, function (order) {
        if (nextStatus(order.status) !== status) return 'stale';
        order.status = status;
        logRow(order, status, meta);
        return null;
      });
    },

    /* A hotel/staff cancellation, allowed from any non-final status.
       cancelledByGuest stays false, so the guest's G-06 reads "The hotel
       cancelled this order" (with the reason when one is given).
       Returns { ok, error, order }; error 'notFound' or 'stale' (already
       Delivered or Cancelled). */
    cancel: function (orderNo, reasonAr, reasonEn, staffId, at) {
      var meta = { staffId: staffId || null, at: at || Date.now() };
      return changeOrder(orderNo, function (order) {
        if (isFinal(order.status)) return 'stale';
        order.cancelledFrom = order.status;
        order.cancelledByGuest = false;
        order.cancelReasonAr = String(reasonAr == null ? '' : reasonAr).trim();
        order.cancelReasonEn = String(reasonEn == null ? '' : reasonEn).trim();
        order.cancelledBy = meta.staffId;
        order.cancelledAt = meta.at;
        order.status = 'Cancelled';
        logRow(order, 'Cancelled', meta);
        return null;
      });
    },

    /* ---- staff and admin records (CONTRACT key table) ---- */
    staff: function () { return clone(ensure(K.staff, seedStaff)); },
    saveStaff: function (s) { return write(K.staff, s); },
    admin: function () { return clone(ensure(K.admin, seedAdmin)); },
    saveAdmin: function (a) { return write(K.admin, a); },
    hashPassword: hashPassword,

    /* fn({ key, source: 'local' | 'remote' }). Returns an unsubscribe fn. */
    onChange: function (fn) {
      if (typeof fn !== 'function') return function () {};
      listeners.push(fn);
      return function () {
        var i = listeners.indexOf(fn);
        if (i !== -1) listeners.splice(i, 1);
      };
    },

    /* ---- for app/js/store.js's fake server only ----
       The guest's Server creates orders and records guest cancellations with
       the client-order-key contract (G-04 §7.7), which lives in store.js.
       It reads and writes the raw table through these two, so the key and
       the shape stay owned here. Always a fresh read. */
    _readTable: function () { return readTable(); },
    _writeTable: function (t) { return writeTable(t); }
  };

  /* First run: seed what is missing, never overwrite what exists. */
  ensure(K.settings, seedSettings);
  ensure(K.catalog, seedCatalog);
  ensure(K.staff, seedStaff);
  ensure(K.admin, seedAdmin);

  window.HotelDB = HotelDB;
})();
