/* admin/js/core.js — the hotel manager's dashboard: shared helpers, the
   session, the router, the global frame (admin-map §4, AF-…) and the modal
   host. Plain ES5, no libraries, no build step, no fetch.

   Data: every read and write goes through window.HotelDB (shared/hotel-db.js,
   CONTRACT.md). Nothing here caches the hotel's data across calls.
   Device-held values (the dashboard language, the sign-in failure counter,
   the remembered address) live under their own keys, so they never touch the
   guest app's 'roomstore.lang' or any key HotelDB owns. */
(function () {
  'use strict';

  var A = {};
  window.Admin = A;
  /* i18n.js's setLang() calls App.rerender(); the dashboard switches language
     through A.toggleLang(), but a caller of setLang() still reaches us. */
  window.App = { rerender: function () { A.rerender(); } };

  A.views = {};
  A.modals = {};

  /* ------------------------------------------------------------------ *
   * Strings used by the frame and by more than one screen
   * ------------------------------------------------------------------ */
  I18N.register({
    /* admin-map §4.1 */
    'ad.af.b01': { ar: 'نظرة عامة', en: 'Overview' },
    'ad.af.b02': { ar: 'المنتجات', en: 'Products' },
    'ad.af.b03': { ar: 'الفئات', en: 'Categories' },
    'ad.af.b04': { ar: 'الطلبات', en: 'Orders' },
    'ad.af.b05': { ar: 'إعدادات الفندق', en: 'Hotel settings' },
    'ad.af.b06': { ar: 'English', en: 'العربية' },
    'ad.af.b07': { ar: 'تسجيل الخروج', en: 'Sign out' },
    'ad.af.c03.l1': { ar: 'افتح لوحة التحكم على حاسوب محمول أو مكتبي', en: 'Open the dashboard on a laptop or desktop' },
    'ad.af.c03.l2': { ar: 'تحتاج الشاشة إلى عرض 1024 بكسل على الأقل', en: 'The screen needs to be at least 1024 px wide' },
    'ad.doc.title': { ar: 'لوحة تحكم متجر الفندق', en: 'Hotel store dashboard' },

    /* G-01 §5.2 — the five canonical statuses, verbatim */
    'ad.status.New':       { ar: 'جديد', en: 'New' },
    'ad.status.Accepted':  { ar: 'تم القبول وجارٍ التحضير', en: 'Accepted & preparing' },
    'ad.status.OnTheWay':  { ar: 'في الطريق', en: 'On the way' },
    'ad.status.Delivered': { ar: 'تم التوصيل', en: 'Delivered' },
    'ad.status.Cancelled': { ar: 'ملغى', en: 'Cancelled' },

    /* G-04 B03/B04 line 1 */
    'ad.pay.card': { ar: 'بطاقة', en: 'Card' },
    'ad.pay.cash': { ar: 'نقدًا', en: 'Cash' },

    /* G-01 §7.3 — item-count wording */
    'ad.items.1':    { ar: 'منتج واحد', en: '1 item' },
    'ad.items.2':    { ar: 'منتجان', en: '2 items' },
    'ad.items.few':  { ar: '{n} منتجات', en: '{n} items' },
    'ad.items.many': { ar: '{n} منتجًا', en: '{n} items' },

    /* Shared copy, each quoted verbatim by the screens that name it */
    'ad.retry':      { ar: 'إعادة المحاولة', en: 'Try again' },
    'ad.saving':     { ar: 'جارٍ الحفظ…', en: 'Saving…' },
    'ad.save':       { ar: 'حفظ', en: 'Save' },
    'ad.cancel':     { ar: 'إلغاء', en: 'Cancel' },
    'ad.refresh':    { ar: 'تحديث', en: 'Refresh' },
    'ad.updated':    { ar: 'آخر تحديث {time}', en: 'Last updated {time}' },
    'ad.clearFilters': { ar: 'مسح عوامل التصفية', en: 'Clear filters' },
    /* admin-map §5.4 */
    'ad.saveFail':   { ar: 'تعذّر حفظ التغيير — تحقّق من الاتصال وحاول مرة أخرى',
                       en: 'The change could not be saved — check your connection and try again' },
    /* A-04 C12 / A-07 C18 / AM-04 C11 */
    'ad.formSaveFail': { ar: 'تعذّر الحفظ — تحقّق من الاتصال وحاول مرة أخرى. لم يُفقد ما كتبته.',
                         en: 'Could not save — check your connection and try again. Nothing you typed was lost.' },
    /* A-04 C08 / A-07 C17 */
    'ad.checkFields': { ar: 'راجع الحقول المميزة بالأعلى', en: 'Check the highlighted fields above' },
    /* A-03 C05 / A-05 C04 */
    'ad.propagate.here': { ar: 'تظهر أي تغييرات هنا للنزيل عند فتحه المتجر من جديد.',
                           en: 'Changes here reach a guest the next time they open the store.' },
    /* A-04 C09 / A-07 C20 */
    'ad.propagate':  { ar: 'تظهر التغييرات للنزيل عند فتحه المتجر من جديد.',
                       en: 'Changes reach a guest the next time they open the store.' },
    /* admin-map §5.7 — A-04 C03 / A-07 C08 */
    'ad.noFees':     { ar: 'السعر الذي تُدخله هو ما يدفعه النزيل. لا تُضاف رسوم توصيل أو خدمة أو ضريبة على الطلب.',
                       en: 'The price you enter is what the guest pays. No delivery, service or tax charge is added to an order.' },
    /* A-02 C08 / A-06 C11 */
    'ad.revenueNote': { ar: 'يشمل الإيراد الطلبات المسلَّمة فقط، لأن الدفع يتم عند الاستلام.',
                        en: 'Revenue counts delivered orders only, because payment happens on delivery.' },
    'ad.removedTag':  { ar: 'مُزال', en: 'Removed' }
  });

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */
  var LS = { lang: 'roomstore.adminapp.lang', fails: 'roomstore.adminapp.fails' };
  var SS = { next: 'roomstore.adminapp.next' };

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function ssDel(k) { try { sessionStorage.removeItem(k); } catch (e) {} }

  A.el = function (id) { return ' data-el="' + id + '"'; };

  /* Arabic-Indic ٠–٩ and Extended Arabic-Indic ۰–۹ → 0–9. */
  A.toWestern = function (s) {
    return String(s == null ? '' : s)
      .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); })
      .replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); });
  };
  A.trim = function (s) { return String(s == null ? '' : s).replace(/^\s+|\s+$/g, ''); };
  A.oneLine = function (s) { return String(s == null ? '' : s).replace(/[\r\n]+/g, ' '); };
  A.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  A.settings = function () {
    var s = null;
    try { s = HotelDB.settings(); } catch (e) { s = null; }
    return s || {};
  };

  /* Two decimals always, half up (G-01 §7.2) — the rule i18n.js money() uses.
     money() prints the fixed default label; the dashboard prints the label the
     manager saved on A-07, in the guest's position: after the amount in
     Arabic, before it in English. */
  A.amount = function (v) {
    var n = Math.round((Number(v) + Number.EPSILON) * 100) / 100;
    return n.toFixed(2);
  };
  A.moneyIn = function (lang, v, s) {
    s = s || A.settings();
    var a = A.amount(v);
    return lang === 'en' ? (s.currencyEn || 'SAR') + ' ' + a : a + ' ' + (s.currencyAr || 'ر.س');
  };
  A.money = function (v, s) { return A.moneyIn(I18N.lang, v, s); };

  /* Counts: a comma separator at 1000 and above, both languages (A-02 §7.3). */
  A.count = function (n) {
    n = Math.round(Number(n) || 0);
    if (Math.abs(n) < 1000) return String(n);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  /* The four plural buckets of A-02 §5.2 / G-01 §7.3. */
  A.bucket = function (n) {
    if (n === 1) return '1';
    if (n === 2) return '2';
    if (n >= 3 && n <= 10) return 'few';
    return 'many';
  };
  A.itemsLabel = function (n) { return t('ad.items.' + A.bucket(n), { n: A.count(n) }); };
  A.units = function (order) {
    var u = 0;
    (order.lines || []).forEach(function (l) { u += Number(l.qty) || 0; });
    return u;
  };
  A.lineName = function (line) {        // AM-03 §5.3 rule 2 — the order's own copy
    var ar = A.trim(line && line.nameAr), en = A.trim(line && line.nameEn);
    var v = I18N.lang === 'en' ? (en || ar) : (ar || en);
    return v || '—';
  };
  A.productName = function (p) {
    if (!p) return '';
    return I18N.lang === 'en' ? (p.nameEn || p.nameAr || '') : (p.nameAr || p.nameEn || '');
  };
  A.catName = A.productName;

  A.num = function (s) { return '<span class="num">' + esc(s) + '</span>'; };

  /* ------------------------------------------------------------------ *
   * Hotel time zone (A-07 F05). Every date, time and period boundary in the
   * dashboard is computed in it; the browser's own zone is never used.
   * ------------------------------------------------------------------ */
  var dtfCache = {};
  function dtf(tz) {
    if (!(tz in dtfCache)) {
      try {
        dtfCache[tz] = new Intl.DateTimeFormat('en-US', {
          timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
        });
      } catch (e) { dtfCache[tz] = null; }
    }
    return dtfCache[tz];
  }
  A.validTz = function (tz) { return !!(tz && dtf(tz)); };
  A.tz = function (s) {
    s = s || A.settings();
    return A.validTz(s.timeZone) ? s.timeZone : 'Asia/Riyadh';
  };
  A.parts = function (ms, tz) {
    var f = dtf(tz || A.tz()) || dtf('UTC');
    var o = {};
    f.formatToParts(new Date(ms)).forEach(function (p) {
      if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10);
    });
    if (o.hour === 24) o.hour = 0;
    return { y: o.year, m: o.month, d: o.day, H: o.hour, M: o.minute, S: o.second };
  };
  A.offset = function (ms, tz) {
    var p = A.parts(ms, tz);
    return Date.UTC(p.y, p.m - 1, p.d, p.H, p.M, p.S) - Math.floor(ms / 1000) * 1000;
  };
  A.offsetLabel = function (tz, at) {
    var off = Math.round(A.offset(at || Date.now(), tz) / 60000);
    var sign = off < 0 ? '-' : '+';
    off = Math.abs(off);
    return 'UTC' + sign + A.pad2(Math.floor(off / 60)) + ':' + A.pad2(off % 60);
  };
  /* 00:00:00 of a calendar day in the hotel zone, as an instant. */
  A.dayStart = function (ymd, tz) {
    tz = tz || A.tz();
    var guess = Date.UTC(ymd.y, ymd.m - 1, ymd.d);
    var off = A.offset(guess, tz);
    var ms = guess - off;
    var off2 = A.offset(ms, tz);
    if (off2 !== off) ms = guess - off2;
    return ms;
  };
  A.ymdAdd = function (ymd, n) {
    var d = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + n));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
  };
  A.today = function (tz) { var p = A.parts(Date.now(), tz); return { y: p.y, m: p.m, d: p.d }; };
  A.ymdCmp = function (a, b) { return (a.y - b.y) || (a.m - b.m) || (a.d - b.d); };
  A.fmtYMD = function (ymd) { return A.pad2(ymd.d) + '/' + A.pad2(ymd.m) + '/' + ymd.y; };
  A.isoYMD = function (ymd) { return ymd.y + '-' + A.pad2(ymd.m) + '-' + A.pad2(ymd.d); };
  A.parseIso = function (s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var ymd = { y: +m[1], m: +m[2], d: +m[3] };
    var chk = A.ymdAdd(ymd, 0);
    return (chk.y === ymd.y && chk.m === ymd.m && chk.d === ymd.d) ? ymd : null;
  };
  A.fmtDate = function (ms, tz) { var p = A.parts(ms, tz); return A.fmtYMD(p); };
  A.fmtTime = function (ms, tz) { var p = A.parts(ms, tz); return A.pad2(p.H) + ':' + A.pad2(p.M); };
  A.fmtDT = function (ms, tz) { return A.fmtDate(ms, tz) + ' ' + A.fmtTime(ms, tz); };

  /* The three fixed periods (A-02 §7.1, A-06 §7.1), plus an explicit range.
     `to` is exclusive: the start of the day after the last day. */
  A.range = function (fromYMD, toYMD) {
    return { fromYMD: fromYMD, toYMD: toYMD, from: A.dayStart(fromYMD), to: A.dayStart(A.ymdAdd(toYMD, 1)) };
  };
  A.period = function (key) {
    var today = A.today();
    if (key === 'today') return A.range(today, today);
    if (key === '7d') return A.range(A.ymdAdd(today, -6), today);
    return A.range(A.ymdAdd(today, -29), today);
  };
  /* A-06 §7.5 — 365 days of history: today minus 364 days is the first. */
  A.earliestYMD = function () { return A.ymdAdd(A.today(), -364); };

  /* Every order the hotel holds (newest first), within retention. */
  A.orders = function () {
    var list = [];
    try { list = HotelDB.orders() || []; } catch (e) { list = []; }
    var min = A.dayStart(A.earliestYMD());
    return list.filter(function (o) { return o && (o.createdAt || 0) >= min; });
  };
  A.ordersIn = function (rng, list) {
    return (list || A.orders()).filter(function (o) {
      return o.createdAt >= rng.from && o.createdAt < rng.to;
    });
  };

  /* Skeleton bars (A-02 C12 pulse): grey, no text. */
  A.skeleton = function (rows, elId) {
    var h = '<div class="adm-skel"' + (elId ? A.el(elId) : '') + ' aria-hidden="true">';
    for (var i = 0; i < rows; i++) h += '<div class="adm-skel__bar"></div>';
    return h + '</div>';
  };

  /* ------------------------------------------------------------------ *
   * Transient confirmation lines (A-03 C06, A-05 C05, A-07 C19…)
   * ------------------------------------------------------------------ */
  var flashes = {};
  A.setFlash = function (screen, key, vars, ms, extra) {
    var f = { key: key, vars: vars || {}, until: Date.now() + ms, extra: extra || null, seq: Math.random() };
    flashes[screen] = f;
    setTimeout(function () {
      if (flashes[screen] !== f) return;
      delete flashes[screen];
      var n = document.querySelector('[data-flash="' + screen + '"]');
      if (n) { n.innerHTML = ''; n.setAttribute('hidden', ''); }
      var v = A.views[screen];
      if (v && v.flashEnded && A.cur.id === screen) v.flashEnded(f);
    }, ms);
    return f;
  };
  A.getFlash = function (screen) {
    var f = flashes[screen];
    if (f && Date.now() < f.until) return f;
    return null;
  };
  A.clearFlash = function (screen) { delete flashes[screen]; };

  /* ------------------------------------------------------------------ *
   * Language — Arabic (RTL) by default, saved in this browser, and
   * independent of every guest device (admin-map §4.2).
   * ------------------------------------------------------------------ */
  A.initLang = function () {
    I18N.lang = lsGet(LS.lang) === 'en' ? 'en' : 'ar';
    I18N.apply();
  };
  A.toggleLang = function () {
    I18N.lang = I18N.lang === 'ar' ? 'en' : 'ar';
    lsSet(LS.lang, I18N.lang);
    I18N.apply();
    A.rerender();
  };

  /* ------------------------------------------------------------------ *
   * Sign-in failure counter (A-01 §6.6), shared with A-07's current-password
   * check (A-07 §5.6). Per browser; survives a reload.
   * ------------------------------------------------------------------ */
  var WINDOW_MS = 15 * 60 * 1000;
  A.fails = {
    read: function () {
      var v = null;
      try { v = JSON.parse(lsGet(LS.fails) || 'null'); } catch (e) { v = null; }
      if (!v || typeof v !== 'object') v = { list: [], lockUntil: 0 };
      var now = Date.now();
      if (v.lockUntil && now >= v.lockUntil) v = { list: [], lockUntil: 0 };
      v.list = (v.list || []).filter(function (x) { return now - x < WINDOW_MS; });
      return v;
    },
    write: function (v) { lsSet(LS.fails, JSON.stringify(v)); },
    lockedUntil: function () { var v = A.fails.read(); return v.lockUntil && Date.now() < v.lockUntil ? v.lockUntil : 0; },
    /* Returns true when this failure is the fifth: the lock starts now. */
    add: function () {
      var v = A.fails.read();
      v.list.push(Date.now());
      if (v.list.length >= 5) v.lockUntil = Date.now() + WINDOW_MS;
      A.fails.write(v);
      return !!v.lockUntil;
    },
    clear: function () { A.fails.write({ list: [], lockUntil: 0 }); }
  };

  /* ------------------------------------------------------------------ *
   * Session (admin-map §4.3): 60 minutes with no click, keystroke or
   * navigation. Kept in HotelDB's admin record, so it survives a reload.
   * ------------------------------------------------------------------ */
  var IDLE_MS = 60 * 60 * 1000;
  var lastTouch = 0;
  A.notice = null;               // 'signedout' | 'expired' — read once by A-01

  function rawSession() {
    var a = null;
    try { a = HotelDB.admin(); } catch (e) { a = null; }
    return (a && a.session && a.session.email) ? a.session : null;
  }
  A.account = function () { var a = HotelDB.admin() || {}; return a.email || ''; };
  A.session = function () {
    var s = rawSession();
    if (!s) return null;
    if (Date.now() - (s.lastActive || s.since || 0) > IDLE_MS) return null;
    return s;
  };
  A.sessionExpired = function () {
    var s = rawSession();
    return !!s && Date.now() - (s.lastActive || s.since || 0) > IDLE_MS;
  };
  A.startSession = function () {
    var a = HotelDB.admin();
    var now = Date.now();
    a.session = { id: 's' + now.toString(36) + Math.random().toString(36).slice(2, 7),
                  email: a.email, since: now, lastActive: now };
    lastTouch = now;
    return HotelDB.saveAdmin(a);
  };
  A.endSession = function () {
    var a = HotelDB.admin();
    if (a && a.session) { a.session = null; HotelDB.saveAdmin(a); }
  };
  A.touch = function () {
    var now = Date.now();
    if (now - lastTouch < 30000) return;
    lastTouch = now;
    var a = HotelDB.admin();
    if (a && a.session) { a.session.lastActive = now; HotelDB.saveAdmin(a); }
  };

  /* ------------------------------------------------------------------ *
   * Router — hash URLs. Filters live in the query part (admin-map §3.3
   * rule 6); a screen updating its own filters uses replaceState, so the
   * screen is not rebuilt under the manager's cursor.
   * ------------------------------------------------------------------ */
  var ROUTES = [
    { re: /^\/signin$/,               id: 'A-01', pub: true },
    { re: /^\/overview$/,             id: 'A-02', nav: 'b01' },
    { re: /^\/products\/new$/,        id: 'A-04', nav: 'b02', p: function () { return { mode: 'create' }; } },
    { re: /^\/products\/([^\/]+)$/,   id: 'A-04', nav: 'b02', p: function (m) { return { mode: 'edit', id: decodeURIComponent(m[1]) }; } },
    { re: /^\/products$/,             id: 'A-03', nav: 'b02' },
    { re: /^\/categories$/,           id: 'A-05', nav: 'b03' },
    { re: /^\/orders$/,               id: 'A-06', nav: 'b04' },
    { re: /^\/settings$/,             id: 'A-07', nav: 'b05' }
  ];
  var NAV = [
    { k: 'b01', el: 'AF-B01', hash: '#/overview' },
    { k: 'b02', el: 'AF-B02', hash: '#/products' },
    { k: 'b03', el: 'AF-B03', hash: '#/categories' },
    { k: 'b04', el: 'AF-B04', hash: '#/orders' },
    { k: 'b05', el: 'AF-B05', hash: '#/settings' }
  ];

  A.parseHash = function (h) {
    h = String(h || '').replace(/^#/, '');
    var q = '', i = h.indexOf('?');
    if (i >= 0) { q = h.slice(i + 1); h = h.slice(0, i); }
    var query = {};
    q.split('&').forEach(function (kv) {
      if (!kv) return;
      var j = kv.indexOf('=');
      var k = j < 0 ? kv : kv.slice(0, j);
      var v = j < 0 ? '' : kv.slice(j + 1);
      try { query[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) {}
    });
    return { path: h, query: query };
  };
  A.buildHash = function (path, query) {
    var parts = [];
    for (var k in query) {
      if (Object.prototype.hasOwnProperty.call(query, k) && query[k] != null && query[k] !== '') {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(query[k]));
      }
    }
    return '#' + path + (parts.length ? '?' + parts.join('&') : '');
  };

  function match(path) {
    for (var i = 0; i < ROUTES.length; i++) {
      var m = path.match(ROUTES[i].re);
      if (m) return { r: ROUTES[i], params: ROUTES[i].p ? ROUTES[i].p(m) : {} };
    }
    return null;
  }

  A.cur = { id: null, hash: '', params: {}, query: {}, nav: null };
  var expectHash = null;

  function curView() { return A.cur.id ? A.views[A.cur.id] : null; }
  A.curView = curView;

  /* Replaces the URL without a hashchange and without a history entry. */
  A.replaceHash = function (h) {
    try { history.replaceState(null, '', h); } catch (e) { location.replace(h); }
    A.cur.hash = h;
  };

  function route() {
    var h = location.hash || '#/overview';
    var ph = A.parseHash(h);
    var m = match(ph.path);
    if (!m) { h = '#/overview'; A.replaceHash(h); ph = A.parseHash(h); m = match(ph.path); }

    if (!m.r.pub && !A.session()) {
      if (A.sessionExpired()) { A.endSession(); A.notice = 'expired'; }
      ssSet(SS.next, h);                                  // A-01 §3.2: used once
      h = '#/signin'; A.replaceHash(h); ph = A.parseHash(h); m = match(ph.path);
    } else if (m.r.pub && A.session()) {
      h = '#/overview'; A.replaceHash(h); ph = A.parseHash(h); m = match(ph.path);
    }

    var prev = curView();
    if (prev && prev.leave) prev.leave();
    A.Modal.close();
    A.cur = { id: m.r.id, hash: h, params: m.params, query: ph.query, nav: m.r.nav || null };
    var v = curView();
    if (v && v.enter) v.enter(m.params, ph.query);
    A.render();
    window.scrollTo(0, 0);
    if (v && v.afterEnter) v.afterEnter();
  }
  A.route = route;

  /* A navigation the manager asked for. With an unsaved edit on the current
     screen it opens AM-01 first (admin-map §3.3 rule 2). */
  A.navigate = function (h, opts) {
    opts = opts || {};
    var v = curView();
    if (!opts.force && v && v.isDirty && v.isDirty()) {
      A.Modal.open('AM-01', { origin: A.cur.id, go: function () { A.navigate(h, { force: true }); } });
      return;
    }
    if (location.hash === h) { route(); return; }
    expectHash = h;
    location.hash = h;
  };

  /* After a successful sign-in: the remembered admin address, used once. */
  A.takeNext = function () {
    var n = ssGet(SS.next);
    ssDel(SS.next);
    if (!n) return null;
    var m = match(A.parseHash(n).path);
    return (m && !m.r.pub) ? n : null;
  };
  A.forgetNext = function () { ssDel(SS.next); };

  A.signOut = function () {
    var v = curView();
    var go = function () {
      var vv = curView();
      if (vv && vv.leave) vv.leave();
      A.endSession();
      A.forgetNext();
      A.notice = 'signedout';
      A.navigate('#/signin', { force: true });
    };
    if (v && v.isDirty && v.isDirty()) { A.Modal.open('AM-01', { origin: A.cur.id, go: go }); return; }
    go();
  };

  /* Idle timeout or a refused session: A-01 with C04, the current address
     remembered (A-01 §3.1). Unsaved edits are lost, and C04 says so. */
  A.expire = function () {
    if (A.cur.id && A.cur.id !== 'A-01') ssSet(SS.next, A.cur.hash);
    var v = curView();
    if (v && v.leave) v.leave();
    A.cur.id = null;              // nothing left to guard
    A.endSession();
    A.notice = 'expired';
    A.Modal.close();
    expectHash = '#/signin';
    if (location.hash === '#/signin') { expectHash = null; route(); } else location.hash = '#/signin';
  };

  window.addEventListener('hashchange', function () {
    var h = location.hash;
    if (expectHash !== null && h === expectHash) { expectHash = null; route(); return; }
    expectHash = null;
    if (!A.cur.id || A.cur.id === 'A-01') { route(); return; }
    /* Browser back / forward / a typed address. */
    if (A.Modal.current()) {
      try { history.pushState(null, '', A.cur.hash); } catch (e) {}
      A.Modal.back();
      return;
    }
    var v = curView();
    if (v && v.isDirty && v.isDirty()) {
      try { history.pushState(null, '', A.cur.hash); } catch (e) {}
      A.Modal.open('AM-01', { origin: A.cur.id, go: function () { A.navigate(h, { force: true }); } });
      return;
    }
    route();
  });

  /* Closing the tab with an unsaved edit: the browser's own prompt. */
  window.addEventListener('beforeunload', function (e) {
    var v = curView();
    if (v && v.isDirty && v.isDirty()) { e.preventDefault(); e.returnValue = ''; return ''; }
  });

  /* Activity keeps the session alive; the first action after 60 idle
     minutes opens A-01 instead of doing what it was aimed at. */
  function activity(e) {
    if (!A.cur.id || A.cur.id === 'A-01') return;
    if (!A.session()) {
      e.preventDefault(); e.stopPropagation();
      if (A.sessionExpired()) A.expire(); else route();
      return;
    }
    A.touch();
  }
  document.addEventListener('click', activity, true);
  document.addEventListener('keydown', activity, true);

  /* ------------------------------------------------------------------ *
   * Rendering: the global frame (admin-map §4) around the current screen
   * ------------------------------------------------------------------ */
  function frameHtml() {
    var s = A.settings();
    var hotel = I18N.lang === 'en' ? (s.hotelNameEn || s.hotelNameAr || '') : (s.hotelNameAr || s.hotelNameEn || '');
    var h = '<div class="adm-frame">';
    h += '<aside class="adm-side"' + A.el('AF-S01') + '>';
    h += '<div class="adm-side__hotel"' + A.el('AF-C01') + '>' + esc(hotel) + '</div>';
    h += '<nav class="adm-nav">';
    NAV.forEach(function (n) {
      var on = A.cur.nav === n.k;
      h += '<button type="button" class="adm-nav__item' + (on ? ' is-active' : '') + '"' + A.el(n.el) +
           ' data-href="' + n.hash + '"' + (on ? ' aria-current="page"' : '') + '>' + esc(t('ad.af.' + n.k)) + '</button>';
    });
    h += '</nav></aside>';
    h += '<div class="adm-content">';
    h += '<header class="adm-top"' + A.el('AF-S02') + '>';
    h += '<button type="button" class="adm-textbtn" lang="' + I18N.other() + '"' + A.el('AF-B06') + '>' + esc(t('ad.af.b06')) + '</button>';
    h += '<span class="adm-top__email num"' + A.el('AF-C02') + '>' + esc(A.account()) + '</span>';
    h += '<button type="button" class="btn btn--ghost adm-btn36"' + A.el('AF-B07') + '>' + esc(t('ad.af.b07')) + '</button>';
    h += '</header>';
    h += '<div class="adm-narrow" role="note"' + A.el('AF-C03') + '><p>' + esc(t('ad.af.c03.l1')) + '</p><p>' + esc(t('ad.af.c03.l2')) + '</p></div>';
    h += '<main id="adm-view" class="adm-main" data-screen="' + A.cur.id + '"></main>';
    h += '</div></div>';
    return h;
  }

  function bindFrame(root) {
    var navs = root.querySelectorAll('.adm-nav__item');
    for (var i = 0; i < navs.length; i++) {
      navs[i].addEventListener('click', function () { A.navigate(this.getAttribute('data-href')); });
    }
    var lang = root.querySelector('[data-el="AF-B06"]');
    if (lang) lang.addEventListener('click', function () { A.toggleLang(); });
    var out = root.querySelector('[data-el="AF-B07"]');
    if (out) out.addEventListener('click', function () { A.signOut(); });
  }

  A.render = function () {
    document.title = t('ad.doc.title');
    var root = document.getElementById('adm');
    var v = curView();
    if (!v) { root.innerHTML = ''; return; }
    if (A.cur.id === 'A-01') {
      root.className = 'adm adm--bare';
      root.innerHTML = v.render(A.cur.params);
      if (v.mount) v.mount(root, A.cur.params);
      return;
    }
    root.className = 'adm';
    root.innerHTML = frameHtml();
    bindFrame(root);
    A.renderView();
  };

  /* Redraws only the screen inside the frame. */
  A.renderView = function () {
    var old = document.getElementById('adm-view');
    var v = curView();
    if (!old || !v) return;
    /* A fresh element each time, so listeners a screen bound on its root
       during the previous draw never pile up. */
    var main = old.cloneNode(false);
    main.setAttribute('data-screen', A.cur.id);
    old.parentNode.replaceChild(main, old);
    main.innerHTML = v.render(A.cur.params);
    if (v.mount) v.mount(main, A.cur.params);
  };

  /* Only the hotel name in the sidebar (A-07 §5.1: new name at once). */
  A.refreshHotelName = function () {
    var n = document.querySelector('[data-el="AF-C01"]');
    if (!n) return;
    var s = A.settings();
    n.textContent = I18N.lang === 'en' ? (s.hotelNameEn || s.hotelNameAr || '') : (s.hotelNameAr || s.hotelNameEn || '');
  };

  A.rerender = function () {
    I18N.apply();
    A.render();
    A.Modal.redraw();
  };

  /* ------------------------------------------------------------------ *
   * Modal host. One modal at a time: AM-01 never stacks on another
   * (AM-01 §5.4). Each modal states how it answers the backdrop, Esc and
   * browser back.
   * ------------------------------------------------------------------ */
  var M = { cur: null };
  A.Modal = M;
  M.current = function () { return M.cur; };
  M.open = function (id, params) {
    var def = A.modals[id];
    if (!def) return;
    if (M.cur) M.close();
    M.cur = { id: id, def: def, params: params || {}, prevFocus: document.activeElement, openedAt: Date.now() };
    if (def.open) def.open(M.cur.params);
    draw(true);
  };
  function draw(first) {
    var host = document.getElementById('modal-root');
    host.innerHTML = '';
    if (!M.cur) { document.body.classList.remove('is-modal-open'); return; }
    var c = M.cur, def = c.def;
    var bd = document.createElement('div');
    bd.className = 'backdrop adm-backdrop';
    bd.setAttribute('data-el', c.id + '-S01');
    bd.innerHTML = '<div class="adm-modal adm-modal--' + (def.width || 480) + '" role="dialog" aria-modal="true" ' +
                   'aria-labelledby="' + c.id + '-title"' + A.el(c.id + '-S02') + '>' + def.render(c.params) + '</div>';
    host.appendChild(bd);
    document.body.classList.add('is-modal-open');
    bd.addEventListener('click', function (e) {
      if (e.target === bd && def.backdrop) def.backdrop(c.params);
    });
    var card = bd.firstChild;
    if (def.mount) def.mount(card, c.params, first);
  }
  M.redraw = function () { if (M.cur) draw(false); };
  M.close = function () {
    var c = M.cur;
    M.cur = null;
    draw(false);
    if (c && c.def.closed) c.def.closed(c.params);
    return c;
  };
  M.restoreFocus = function (c) {
    if (c && c.prevFocus && c.prevFocus.focus && document.body.contains(c.prevFocus)) {
      try { c.prevFocus.focus(); } catch (e) {}
    }
  };
  M.back = function () { if (M.cur && M.cur.def.back) M.cur.def.back(M.cur.params); };

  document.addEventListener('keydown', function (e) {
    if (!M.cur) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (M.cur.def.esc) M.cur.def.esc(M.cur.params);
      return;
    }
    if (e.key === 'Tab') {                          // focus stays inside the card
      var card = document.querySelector('#modal-root .adm-modal');
      if (!card) return;
      var f = card.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]');
      if (!f.length) { e.preventDefault(); return; }
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !card.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !card.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
  });

  /* ------------------------------------------------------------------ *
   * Start
   * ------------------------------------------------------------------ */
  A.start = function () {
    A.initLang();
    if (!location.hash) A.replaceHash('#/overview');
    route();
  };
})();
