/* worker/js/core.js — shared pieces of the delivery worker's phone (المندوب).
   Design: docs/operations.html ("الأدوار", "رحلة الطلب", "التوزيع على العمّال",
   "الدفع عند الباب") and the split design note (roles, workerSession, rules 1–9).
   Data: window.HotelDB only (shared/CONTRACT.md). Plain ES5, no libraries.

   Why these helpers are copied from staff/js/core.js instead of including it:
   the desk file keeps the desk's `session` (this app must use `workerSession`
   and never touch `session`), shares the desk's device keys
   (roomstore.staffapp.lang/sound/auth — one browser runs both apps in the
   demo, so the two phones would switch language together), and accepts any
   member's PIN. Everything here is worker-only and keyed
   roomstore.workerapp.*.

   Holds: shared strings, formatting, the worker "server" (HotelDB behind
   promises, with the demo's no-connection switch), the worker session and
   shift, the chime, and the Feed — the one list of "my orders" every screen
   reads, which also decides the chime and the gone-order notices. */
(function () {
  'use strict';

  I18N.register({
    /* The five canonical labels, G-01 §5.2 — the same words everywhere. */
    'w.status.New':       { ar: 'جديد', en: 'New' },
    'w.status.Accepted':  { ar: 'تم القبول وجارٍ التحضير', en: 'Accepted & preparing' },
    'w.status.OnTheWay':  { ar: 'في الطريق', en: 'On the way' },
    'w.status.Delivered': { ar: 'تم التوصيل', en: 'Delivered' },
    'w.status.Cancelled': { ar: 'ملغى', en: 'Cancelled' },

    /* Item count, G-01 §7.3 (same buckets as the desk). */
    'w.count.1':    { ar: 'منتج واحد', en: '1 item' },
    'w.count.2':    { ar: 'منتجان', en: '2 items' },
    'w.count.few':  { ar: '{n} منتجات', en: '{n} items' },
    'w.count.many': { ar: '{n} منتجًا', en: '{n} items' },

    /* Durations, S-01 §7.2 — "… ago". */
    'w.dur.lt1':  { ar: 'منذ أقل من دقيقة', en: 'less than a minute ago' },
    'w.dur.1':    { ar: 'منذ دقيقة', en: '1 min ago' },
    'w.dur.2':    { ar: 'منذ دقيقتين', en: '2 min ago' },
    'w.dur.few':  { ar: 'منذ {n} دقائق', en: '{n} min ago' },
    'w.dur.many': { ar: 'منذ {n} دقيقة', en: '{n} min ago' },
    'w.dur.h':    { ar: 'منذ {h} و{m} دقيقة', en: '{h} h {m} min ago' },
    'w.hour.1':    { ar: 'ساعة', en: '1' },
    'w.hour.2':    { ar: 'ساعتين', en: '2' },
    'w.hour.few':  { ar: '{n} ساعات', en: '{n}' },
    'w.hour.many': { ar: '{n} ساعة', en: '{n}' },

    /* Payment method words. */
    'w.pay.card': { ar: 'بطاقة', en: 'Card' },
    'w.pay.cash': { ar: 'نقدًا', en: 'Cash' },

    /* Shared copy */
    'w.room':       { ar: 'غرفة', en: 'Room' },
    'w.orderno':    { ar: 'طلب رقم {no}', en: 'Order {no}' },
    'w.sending':    { ar: 'جارٍ الإرسال…', en: 'Sending…' },
    'w.back':       { ar: 'رجوع', en: 'Back' },
    'w.after':      { ar: 'الحالة بعد الضغط: {label}', en: 'Status after tapping: {label}' },
    'w.lang.other': { ar: 'English', en: 'العربية' },
    /* The action-failure sentence of S-02-C15 / WM-01-C07, word for word. */
    'w.actionfail': { ar: 'لم يصل التحديث إلى النظام — حاول مرة أخرى', en: 'The update did not reach the system — try again' },

    /* Gone-order notices (W-01-C05): why an order left this phone. */
    'w.gone.reassigned': { ar: 'تم تحويل هذا الطلب لعامل آخر', en: 'This order was reassigned to another worker' },
    'w.gone.cancelled':  { ar: 'ألغى المكتب هذا الطلب', en: 'The desk cancelled this order' },
    'w.gone.deskDelivered': { ar: 'سجّل المكتب توصيل هذا الطلب نيابةً عنك', en: 'The desk recorded this order as delivered for you' },
    'w.gone.notMine':    { ar: 'هذا الطلب ليس محوّلًا لك', en: 'This order is not assigned to you' },
    'w.gone.notFound':   { ar: 'لم نعثر على هذا الطلب', en: 'We could not find this order' },
    'w.gone.which':      { ar: 'طلب رقم {no} · غرفة {room}', en: 'Order {no} · Room {room}' },
    'w.gone.reason':     { ar: 'السبب: {reason}', en: 'Reason: {reason}' },
    'w.gone.dont':       { ar: 'لا تتوجّه به إلى الغرفة. إن كان معك فأعده إلى الرف.', en: 'Do not take it to the room. If you have it with you, return it to the shelf.' },

    /* Demo strip and demo PIN hint — NOT product copy. */
    'w.demo.tag':    { ar: 'وضع العرض · Demo', en: 'Demo · وضع العرض' },
    'w.demo.server': { ar: 'حالة النظام', en: 'System' },
    'w.demo.ok':     { ar: 'يعمل', en: 'working' },
    'w.demo.down':   { ar: 'لا اتصال', en: 'no connection' },
    'w.demo.reset':  { ar: 'تصفير جلسة المندوب', en: 'Reset worker session' },
    'w.demo.pins':   { ar: 'رموز تجريبية للعرض فقط:', en: 'Demo PINs, for the prototype only:' }
  });

  /* ------------------------------------------------------------------ *
   * Small utilities (same rules as the desk's core.js)
   * ------------------------------------------------------------------ */
  var MIN = 60 * 1000;

  function bucket(n) {
    if (n === 1) return '1';
    if (n === 2) return '2';
    if (n >= 3 && n <= 10) return 'few';
    return 'many';
  }

  function itemQty(order) {
    var n = 0, lines = (order && order.lines) || [];
    for (var i = 0; i < lines.length; i++) n += Number(lines[i].qty) || 0;
    return n;
  }

  function countWord(n) { return t('w.count.' + bucket(n), { n: n }); }

  function duration(ms) {
    var mins = Math.floor(Math.max(0, ms) / MIN);
    if (mins < 1) return t('w.dur.lt1');
    if (mins === 1) return t('w.dur.1');
    if (mins === 2) return t('w.dur.2');
    if (mins <= 10) return t('w.dur.few', { n: mins });
    if (mins <= 59) return t('w.dur.many', { n: mins });
    var h = Math.floor(mins / 60), m = mins % 60;
    return t('w.dur.h', { h: t('w.hour.' + bucket(h), { n: h }), m: m });
  }

  /* HH:MM, 24-hour, Western digits in both languages. */
  function clock(ms) {
    var d = new Date(ms);
    var hh = d.getHours(), mm = d.getMinutes();
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }

  function westernDigits(s) {
    return String(s == null ? '' : s).replace(/[٠-٩]/g, function (c) {
      return String(c.charCodeAt(0) - 0x0660);
    }).replace(/[۰-۹]/g, function (c) {
      return String(c.charCodeAt(0) - 0x06F0);
    });
  }

  function cents(v) { return Math.round((Number(v) + Number.EPSILON) * 100); }

  /* The four payment cases (S-01 §7.3, S-02 §5.5, SM-02 §5.3). */
  function payCase(order) {
    if (!order || order.payment !== 'cash') return { kind: 'card' };
    var raw = order.amount;
    if (raw == null || String(raw).replace(/\s/g, '') === '') return { kind: 'cashNone' };
    var amt = parseFloat(westernDigits(raw).replace(/,/g, '.'));
    if (!isFinite(amt)) return { kind: 'cashNone' };
    var a = cents(amt), tot = cents(order.total);
    if (a > tot) return { kind: 'cashMore', amount: a / 100, change: (a - tot) / 100 };
    if (a === tot) return { kind: 'cashEqual', amount: a / 100 };
    return { kind: 'cashNone' };
  }

  function hasNotes(order) {
    return !!(order && order.notes && String(order.notes).replace(/\s/g, '') !== '');
  }

  function lineName(line) {
    if (I18N.lang === 'en') return line.nameEn || line.nameAr || '';
    return line.nameAr || line.nameEn || '';
  }

  function spaced(s) { return String(s == null ? '' : s).split('').join(' '); }

  function isActive(s) { return s === 'Accepted' || s === 'OnTheWay'; }

  /* The most recent 04:00 local time — the hotel day (staff map §4 decision 9). */
  function hotelDayStart(now) {
    var d = new Date(now);
    d.setHours(4, 0, 0, 0);
    if (d.getTime() > now) d.setDate(d.getDate() - 1);
    return d.getTime();
  }

  /* When the order was last assigned to `me` (the latest assignLog row). */
  function assignedAt(order, me) {
    var log = (order && order.assignLog) || [];
    for (var i = log.length - 1; i >= 0; i--) if (log[i].to === me) return log[i].at || 0;
    return (order && (order.updatedAt || order.createdAt)) || 0;
  }

  /* The log row that wrote a status (the latest one). */
  function logFor(order, status) {
    var log = (order && order.log) || [];
    for (var i = log.length - 1; i >= 0; i--) if (log[i].status === status) return log[i];
    return null;
  }

  function wasEverMine(order, me) {
    var log = (order && order.assignLog) || [];
    for (var i = 0; i < log.length; i++) if (log[i].to === me) return true;
    return false;
  }

  /* Where an order stands for this worker:
       'active'        assigned to me, Accepted or On the way
       'deliveredByMe' Delivered, assigned to me, and I recorded it
       'deskDelivered' Delivered, assigned to me, the desk recorded it for me
       'cancelled'     cancelled (by the desk) while assigned to me
       'reassigned'    was mine, now assigned to someone else
       'notMine'       never assigned to me
       'notFound'      no such order */
  function classify(order, me) {
    if (!order) return 'notFound';
    if (order.assignedTo !== me) return wasEverMine(order, me) ? 'reassigned' : 'notMine';
    if (order.status === 'Cancelled') return 'cancelled';
    if (order.status === 'Delivered') {
      var row = logFor(order, 'Delivered');
      return row && row.staffId === me ? 'deliveredByMe' : 'deskDelivered';
    }
    if (isActive(order.status)) return 'active';
    return 'notMine';
  }

  /* The desk's cancellation reason in the interface language, else the other. */
  function storedReason(o) {
    var ar = String(o.cancelReasonAr || ''), en = String(o.cancelReasonEn || '');
    var r = I18N.lang === 'en' ? (en || ar) : (ar || en);
    return r.length > 120 ? r.slice(0, 120) + '…' : r;
  }

  /* ------------------------------------------------------------------ *
   * Device-held settings, under this app's own keys.
   * ------------------------------------------------------------------ */
  var LS = {
    lang: 'roomstore.workerapp.lang',
    auth: 'roomstore.workerapp.auth',
    demo: 'roomstore.workerapp.demo',
    seen: 'roomstore.workerapp.seen'
  };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var Lang = {
    init: function () {
      I18N.lang = lsGet(LS.lang) === 'en' ? 'en' : 'ar';   /* Arabic on first open */
      I18N.apply();
    },
    toggle: function () {
      I18N.lang = I18N.lang === 'ar' ? 'en' : 'ar';
      lsSet(LS.lang, I18N.lang);
      I18N.apply();
      if (window.App && App.rerender) App.rerender();
    }
  };

  /* "Since the list was last seen" (W-01-C15): the moment this worker last
     left W-01 (opened an order, hid the page, ended the shift). */
  var Seen = {
    all: function () {
      try { return JSON.parse(lsGet(LS.seen) || '{}') || {}; } catch (e) { return {}; }
    },
    at: function (me) { return Number(Seen.all()[me]) || 0; },
    mark: function (me, at) {
      if (!me) return;
      var s = Seen.all();
      s[me] = at || Date.now();
      lsSet(LS.seen, JSON.stringify(s));
    }
  };

  /* ------------------------------------------------------------------ *
   * Chime — the desk's Web Audio chime, unchanged: two soft notes, 2 s.
   * A browser plays sound only after a touch or key press on the page;
   * typing the PIN on W-03 is that gesture.
   * ------------------------------------------------------------------ */
  var Chime = {
    ctx: null,
    armed: false,
    refused: false,
    plays: 0,          /* chimes actually scheduled (read by the demo test) */
    lastAt: 0,

    arm: function () {
      Chime.refused = false;
      try {
        if (!Chime.ctx) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          Chime.ctx = new AC();
        }
        if (Chime.ctx.state === 'suspended' && Chime.ctx.resume) Chime.ctx.resume();
        Chime.armed = true;
      } catch (e) {}
    },

    ready: function () { return Chime.armed && !Chime.refused; },

    play: function () {
      if (!Chime.armed || !Chime.ctx) {
        Chime.refused = true;
        if (window.App && App.rerender) App.rerender();
        return false;
      }
      try {
        var ctx = Chime.ctx;
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
        var t0 = ctx.currentTime + 0.02;
        tone(ctx, 880, t0, 1.0);
        tone(ctx, 660, t0 + 0.5, 1.5);
        Chime.plays++;
        Chime.lastAt = Date.now();
        return true;
      } catch (e) {
        Chime.refused = true;
        if (window.App && App.rerender) App.rerender();
        return false;
      }
    }
  };

  function tone(ctx, freq, start, len) {
    var osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + len);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + len + 0.05);
  }

  /* ------------------------------------------------------------------ *
   * Session: roomstore.staff.workerSession { memberId, since } and the
   * shift map. NEVER roomstore.staff.session — that is the desk tablet's.
   * A session is live only while its member is a worker AND is on shift,
   * so an end of shift from another tab signs this phone out too.
   * ------------------------------------------------------------------ */
  var Session = {
    current: function () {
      var s = HotelDB.staff();
      var ws = s && s.workerSession;
      if (!ws || !ws.memberId) return null;
      var m = HotelDB.member(ws.memberId);
      if (!m || m.role !== 'worker') return null;
      if (!s.shift || !s.shift[ws.memberId]) return null;
      return { memberId: ws.memberId, since: ws.since || 0, name: m.name };
    },
    me: function () { var c = Session.current(); return c ? c.memberId : null; },
    start: function (memberId) {
      HotelDB.startShift(memberId);
      var s = HotelDB.staff();                     /* fresh read: keeps the desk's session */
      s.workerSession = { memberId: memberId, since: Date.now() };
      HotelDB.saveStaff(s);
    },
    end: function () {
      var s = HotelDB.staff();
      var ws = s.workerSession;
      if (ws && ws.memberId) HotelDB.endShift(ws.memberId);
      s = HotelDB.staff();                         /* fresh read after endShift */
      s.workerSession = null;
      HotelDB.saveStaff(s);
    }
  };

  /* ------------------------------------------------------------------ *
   * The worker "server": HotelDB behind promises with a timeout, so the
   * in-flight and failure states exist. The demo strip can cut it.
   * ------------------------------------------------------------------ */
  var TIMEOUT = 15000;

  var Server = {
    latencyMs: 150,
    failMode: lsGet(LS.demo) === 'noConnection' ? 'noConnection' : 'none',

    setFailMode: function (m) {
      Server.failMode = m === 'noConnection' ? 'noConnection' : 'none';
      lsSet(LS.demo, Server.failMode);
    },

    call: function (produce) {
      return new Promise(function (resolve, reject) {
        var done = false;
        var timer = setTimeout(function () {
          if (done) return;
          done = true;
          reject({ type: 'timeout' });
        }, TIMEOUT);
        setTimeout(function () {
          if (done) return;
          if (Server.failMode === 'noConnection') {
            done = true; clearTimeout(timer); reject({ type: 'noConnection' }); return;
          }
          try {
            var v = produce();
            done = true; clearTimeout(timer); resolve(v);
          } catch (e) {
            done = true; clearTimeout(timer); reject({ type: 'serverError' });
          }
        }, Server.latencyMs);
      });
    },

    /* My orders: the active ones (oldest first), the ones delivered this
       hotel day, and what became of every order that was active last time. */
    mine: function (me, prevNos) {
      return Server.call(function () {
        var all = HotelDB.orders(), active = [], delivered = [], day = hotelDayStart(Date.now());
        var byNo = {};
        for (var i = 0; i < all.length; i++) {
          var o = all[i];
          byNo[String(o.orderNo)] = o;
          if (o.assignedTo !== me) continue;
          if (isActive(o.status)) active.push(o);
          else if (o.status === 'Delivered') {
            var row = logFor(o, 'Delivered');
            var at = row ? row.at : (o.updatedAt || 0);
            if (at >= day) delivered.push({ order: o, at: at });
          }
        }
        active.sort(function (a, b) {
          if (a.createdAt !== b.createdAt) return (a.createdAt || 0) - (b.createdAt || 0);
          return Number(a.orderNo) - Number(b.orderNo);
        });
        delivered.sort(function (a, b) { return b.at - a.at; });
        var gone = {};
        (prevNos || []).forEach(function (no) {
          var o = byNo[String(no)] || null;
          var kind = classify(o, me);
          if (kind !== 'active') gone[no] = { kind: kind, order: o };
        });
        return { active: active, delivered: delivered, gone: gone };
      });
    },

    order: function (orderNo) {
      return Server.call(function () { return HotelDB.getOrder(orderNo); });
    },

    /* A forward step by this worker. Refused as 'notMine' when the desk
       reassigned the order away a moment ago: HotelDB.setStatus does not
       know about workers, so the phone checks first, in the same step. */
    move: function (orderNo, status, me) {
      return Server.call(function () {
        var o = HotelDB.getOrder(orderNo);
        if (!o) return { ok: false, error: 'notFound', order: null };
        if (o.assignedTo !== me) return { ok: false, error: 'notMine', order: o };
        return HotelDB.setStatus(orderNo, status, { staffId: me, at: Date.now() });
      });
    },

    /* W-03 — outcomes: ok | supervisor | wrong | locked. 5 wrong in a row
       lock the field for one minute (S-03 §5.2 rule, the worker's own count). */
    signIn: function (pin) {
      return Server.call(function () {
        var auth = {};
        try { auth = JSON.parse(lsGet(LS.auth) || '{}') || {}; } catch (e) { auth = {}; }
        var now = Date.now();
        if (auth.lockedUntil && now < auth.lockedUntil) return { kind: 'locked' };
        var members = (HotelDB.staff().members) || [], hit = null;
        for (var i = 0; i < members.length; i++) if (String(members[i].pin) === pin) hit = members[i];
        if (hit && hit.role === 'worker') {
          lsSet(LS.auth, JSON.stringify({ wrong: 0, lockedUntil: 0 }));
          return { kind: 'ok', member: { id: hit.id, name: hit.name } };
        }
        if (hit) {                                   /* a supervisor: not a wrong PIN */
          lsSet(LS.auth, JSON.stringify({ wrong: 0, lockedUntil: 0 }));
          return { kind: 'supervisor' };
        }
        var wrong = (auth.wrong || 0) + 1;
        if (wrong >= 5) {
          lsSet(LS.auth, JSON.stringify({ wrong: 0, lockedUntil: now + 60 * 1000 }));
          return { kind: 'locked' };
        }
        lsSet(LS.auth, JSON.stringify({ wrong: wrong, lockedUntil: 0 }));
        return { kind: 'wrong' };
      });
    }
  };

  /* ------------------------------------------------------------------ *
   * Feed — the one "my orders" list. Refreshed on every HotelDB change,
   * every 15 s, and on becoming visible. Each successful response:
   *   - chimes once when an order appears that was not in the previous
   *     response (a new assignment or a reassignment to me); the first
   *     response after load or sign-in is the baseline and never chimes;
   *   - queues a notice for every order that left my active list for a
   *     reason other than my own delivery (W-01-C05);
   *   - tells the current screen.
   * ------------------------------------------------------------------ */
  var POLL_MS = 15000;

  var Feed = {
    me: null,
    loaded: false,      /* at least one successful response for `me` */
    failed: false,      /* the latest attempt failed */
    active: [],
    delivered: [],
    lastGone: {},       /* orderNo → { kind, order } from the latest response */
    prev: null,         /* orderNo set of the previous response; null = baseline */
    notices: [],        /* [{ no, room, kind, reason }] newest first */
    inFlight: false,
    again: false,
    gen: 0,
    timer: null,
    listeners: [],

    reset: function (me) {
      Feed.me = me || null;
      Feed.loaded = false; Feed.failed = false;
      Feed.active = []; Feed.delivered = []; Feed.lastGone = {};
      Feed.prev = null; Feed.notices = [];
      Feed.inFlight = false; Feed.again = false; Feed.gen++;
      clearTimeout(Feed.timer);
    },

    find: function (no) {
      for (var i = 0; i < Feed.active.length; i++) if (String(Feed.active[i].orderNo) === String(no)) return Feed.active[i];
      return null;
    },

    onUpdate: function (fn) { Feed.listeners.push(fn); },

    addNotice: function (kind, order, no) {
      if (kind === 'active' || kind === 'deliveredByMe') return;
      var key = String(order ? order.orderNo : no);
      for (var i = 0; i < Feed.notices.length; i++) if (Feed.notices[i].no === key) {
        Feed.notices.splice(i, 1);                /* one notice per order: the latest reason */
        break;
      }
      Feed.notices.unshift({
        no: key,
        room: order ? String(order.roomNumber) : '',
        kind: kind,
        order: order || null
      });
      if (window.App && App.announce) App.announce(t('w.gone.' + kind));
    },

    dismiss: function (no) {
      Feed.notices = Feed.notices.filter(function (n) { return n.no !== String(no); });
    },

    refresh: function () {
      if (!Feed.me) return;
      if (Feed.inFlight) { Feed.again = true; return; }
      clearTimeout(Feed.timer);
      Feed.inFlight = true;
      var g = ++Feed.gen, me = Feed.me;
      var prevNos = Feed.prev ? Object.keys(Feed.prev) : [];
      Server.mine(me, prevNos).then(function (res) {
        if (g !== Feed.gen) return;
        Feed.inFlight = false;
        var set = {}, fresh = [], i;
        for (i = 0; i < res.active.length; i++) set[res.active[i].orderNo] = true;
        if (Feed.prev !== null) {
          for (i = 0; i < res.active.length; i++) if (!Feed.prev[res.active[i].orderNo]) fresh.push(res.active[i]);
        }
        for (var no in res.gone) {
          if (Object.prototype.hasOwnProperty.call(res.gone, no)) Feed.addNotice(res.gone[no].kind, res.gone[no].order, no);
        }
        /* An order that came back to me drops its old notice. */
        for (i = 0; i < res.active.length; i++) Feed.dismiss(res.active[i].orderNo);
        Feed.prev = set;
        Feed.active = res.active;
        Feed.delivered = res.delivered;
        Feed.lastGone = res.gone;
        Feed.loaded = true;
        Feed.failed = false;
        if (fresh.length) Chime.play();            /* one chime per response */
        Feed.emit({ fresh: fresh, gone: res.gone });
        Feed.after();
      }, function () {
        if (g !== Feed.gen) return;
        Feed.inFlight = false;
        Feed.failed = true;
        Feed.emit({ fresh: [], gone: {} });
        Feed.after();
      });
    },

    after: function () {
      if (Feed.again) { Feed.again = false; Feed.refresh(); return; }
      clearTimeout(Feed.timer);
      Feed.timer = setTimeout(function () {
        if (!document.hidden) Feed.refresh();
      }, POLL_MS);
    },

    emit: function (change) {
      var list = Feed.listeners.slice();
      for (var i = 0; i < list.length; i++) { try { list[i](change); } catch (e) { if (window.console) console.error(e); } }
    }
  };

  window.WK = {
    itemQty: itemQty, countWord: countWord, duration: duration, clock: clock,
    westernDigits: westernDigits, payCase: payCase, hasNotes: hasNotes,
    lineName: lineName, spaced: spaced, isActive: isActive, assignedAt: assignedAt,
    logFor: logFor, classify: classify, storedReason: storedReason, hotelDayStart: hotelDayStart,
    Lang: Lang, Seen: Seen, Chime: Chime, Session: Session, Server: Server, Feed: Feed,
    MIN: MIN
  };
})();
