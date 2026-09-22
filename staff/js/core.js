/* staff/js/core.js — shared pieces of the staff interface.
   Spec: /spec/staff/ (staff-map.md + S-01, S-02, S-03, SM-01, SM-02).
   Data: window.HotelDB only (shared/CONTRACT.md). Plain ES5, no libraries.

   Holds: the strings every staff screen uses, formatting (durations, item
   counts, payment cases), the staff "server" (HotelDB behind promises with a
   timeout, so the specified in-flight, timeout and failure states exist),
   the session, the saved language and sound setting, the Web Audio chime and
   the new-order alert rules (S-01 §5.6). */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Strings used on more than one staff screen. Verbatim from the specs.
   * ------------------------------------------------------------------ */
  I18N.register({
    /* The five canonical labels, G-01 §5.2 (map §4 decision 5). */
    'st.status.New':       { ar: 'جديد', en: 'New' },
    'st.status.Accepted':  { ar: 'تم القبول وجارٍ التحضير', en: 'Accepted & preparing' },
    'st.status.OnTheWay':  { ar: 'في الطريق', en: 'On the way' },
    'st.status.Delivered': { ar: 'تم التوصيل', en: 'Delivered' },
    'st.status.Cancelled': { ar: 'ملغى', en: 'Cancelled' },

    /* Item count, G-01 §7.3. */
    'st.count.1':    { ar: 'منتج واحد', en: '1 item' },
    'st.count.2':    { ar: 'منتجان', en: '2 items' },
    'st.count.few':  { ar: '{n} منتجات', en: '{n} items' },
    'st.count.many': { ar: '{n} منتجًا', en: '{n} items' },

    /* Durations, S-01 §7.2 — elapsed form ("… ago"). */
    'st.dur.lt1':  { ar: 'أقل من دقيقة', en: 'less than a minute' },
    'st.dur.1':    { ar: 'منذ دقيقة', en: '1 min ago' },
    'st.dur.2':    { ar: 'منذ دقيقتين', en: '2 min ago' },
    'st.dur.few':  { ar: 'منذ {n} دقائق', en: '{n} min ago' },
    'st.dur.many': { ar: 'منذ {n} دقيقة', en: '{n} min ago' },
    'st.dur.h':    { ar: 'منذ {h} و{m} دقيقة', en: '{h} h {m} min ago' },
    /* The same values where the sentence already supplies "ago" (C02). */
    'st.durb.lt1':  { ar: 'أقل من دقيقة', en: 'less than a minute' },
    'st.durb.1':    { ar: 'منذ دقيقة', en: '1 min' },
    'st.durb.2':    { ar: 'منذ دقيقتين', en: '2 min' },
    'st.durb.few':  { ar: 'منذ {n} دقائق', en: '{n} min' },
    'st.durb.many': { ar: 'منذ {n} دقيقة', en: '{n} min' },
    'st.durb.h':    { ar: 'منذ {h} و{m} دقيقة', en: '{h} h {m} min' },
    /* Arabic hour forms: 1 ساعة, 2 ساعتين, 3–10 {H} ساعات, 11+ {H} ساعة. */
    'st.hour.1':    { ar: 'ساعة', en: '1' },
    'st.hour.2':    { ar: 'ساعتين', en: '2' },
    'st.hour.few':  { ar: '{n} ساعات', en: '{n}' },
    'st.hour.many': { ar: '{n} ساعة', en: '{n}' },

    /* Shared copy */
    'st.room':       { ar: 'غرفة', en: 'Room' },
    'st.orderno':    { ar: 'طلب رقم {no}', en: 'Order {no}' },
    'st.sending':    { ar: 'جارٍ الإرسال…', en: 'Sending…' },
    'st.back':       { ar: 'رجوع', en: 'Back' },
    'st.signin.continue': { ar: 'تسجيل الدخول للمتابعة', en: 'Sign in to continue' },
    'st.lang.other': { ar: 'English', en: 'العربية' },

    /* Demo strip and demo PIN hint — NOT product copy. Required by
       shared/CONTRACT.md "Demo credentials"; kept visibly apart. */
    'st.demo.tag':    { ar: 'وضع العرض · Demo', en: 'Demo · وضع العرض' },
    'st.demo.server': { ar: 'حالة النظام', en: 'System' },
    'st.demo.ok':     { ar: 'يعمل', en: 'working' },
    'st.demo.down':   { ar: 'لا اتصال', en: 'no connection' },
    'st.demo.pins':   { ar: 'رموز تجريبية للعرض فقط:', en: 'Demo PINs, for the prototype only:' }
  });

  /* ------------------------------------------------------------------ *
   * Small utilities
   * ------------------------------------------------------------------ */
  var MIN = 60 * 1000;

  function bucket(n) {
    if (n === 1) return '1';
    if (n === 2) return '2';
    if (n >= 3 && n <= 10) return 'few';
    return 'many';
  }

  /* t() in a language other than the interface's (SM-01 C08, the presets). */
  function tIn(lang, key, vars) {
    var keep = I18N.lang;
    I18N.lang = lang === 'en' ? 'en' : 'ar';
    try { return t(key, vars); } finally { I18N.lang = keep; }
  }

  function moneyIn(lang, value) {
    var n = Math.round((Number(value) + Number.EPSILON) * 100) / 100;
    var s = n.toFixed(2);
    return lang === 'en' ? 'SAR ' + s : s + ' ر.س';
  }

  function itemQty(order) {
    var n = 0, lines = (order && order.lines) || [];
    for (var i = 0; i < lines.length; i++) n += Number(lines[i].qty) || 0;
    return n;
  }

  function countWord(n) { return t('st.count.' + bucket(n), { n: n }); }

  /* S-01 §7.2. `bare` drops the "ago" the C02 sentence already supplies. */
  function duration(ms, bare) {
    var p = bare ? 'st.durb.' : 'st.dur.';
    var mins = Math.floor(Math.max(0, ms) / MIN);
    if (mins < 1) return t(p + 'lt1');
    if (mins === 1) return t(p + '1');
    if (mins === 2) return t(p + '2');
    if (mins <= 10) return t(p + 'few', { n: mins });
    if (mins <= 59) return t(p + 'many', { n: mins });
    var h = Math.floor(mins / 60), m = mins % 60;
    return t(p + 'h', { h: t('st.hour.' + bucket(h), { n: h }), m: m });
  }

  /* Western digits: Arabic-Indic and Extended Arabic-Indic → 0–9 (G-04 §7.1). */
  function westernDigits(s) {
    return String(s == null ? '' : s).replace(/[٠-٩]/g, function (c) {
      return String(c.charCodeAt(0) - 0x0660);
    }).replace(/[۰-۹]/g, function (c) {
      return String(c.charCodeAt(0) - 0x06F0);
    });
  }

  function cents(v) { return Math.round((Number(v) + Number.EPSILON) * 100); }

  /* The four payment cases (S-01 §7.3, S-02 §5.5, SM-02 §5.3).
     'card' ignores any amount; 'cashMore' carries the change. */
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

  /* SM-01 §7.1: the order's interface language; Arabic when missing. */
  function orderLang(order) {
    var l = order && (order.lang || order.language);
    return l === 'en' ? 'en' : 'ar';
  }

  /* Digits one at a time for a screen reader ("0 3 0 5"). */
  function spaced(s) { return String(s == null ? '' : s).split('').join(' '); }

  function isActiveStatus(s) { return s === 'New' || s === 'Accepted' || s === 'OnTheWay'; }
  function isFinalStatus(s) { return s === 'Delivered' || s === 'Cancelled'; }

  /* The most recent 04:00 local time (map §4 decision 9). */
  function hotelDayStart(now) {
    var d = new Date(now);
    d.setHours(4, 0, 0, 0);
    if (d.getTime() > now) d.setDate(d.getDate() - 1);
    return d.getTime();
  }

  function finalAt(order) {
    return order.cancelledAt || order.updatedAt || order.createdAt || 0;
  }

  function memberName(id) {
    if (!id || !window.HotelDB) return '';
    var s = HotelDB.staff(), list = (s && s.members) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name;
    return String(id);
  }

  /* ------------------------------------------------------------------ *
   * Device-held settings. Language and sound belong to the staff device,
   * so they live under their own keys and never touch the guest app's
   * 'roomstore.lang' in a browser that runs both.
   * ------------------------------------------------------------------ */
  var LS = {
    lang:     'roomstore.staffapp.lang',
    sound:    'roomstore.staffapp.sound',
    auth:     'roomstore.staffapp.auth',
    demo:     'roomstore.staffapp.demo',
    unlinked: 'roomstore.staffapp.unlinked'
  };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* The hotel link held on the device (S-03 §5.0, §5.6). Linking a device is
     done outside this interface; this prototype treats every device as linked
     unless the demo strip marks it unlinked, so variant B can be seen. */
  var Device = {
    linked: function () { return lsGet(LS.unlinked) !== '1'; },
    setLinked: function (on) { lsSet(LS.unlinked, on ? '0' : '1'); }
  };

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

  /* ------------------------------------------------------------------ *
   * Chime — Web Audio, one 2-second tone (S-01 §5.6 rule 1). No files.
   * ------------------------------------------------------------------ */
  var Chime = {
    ctx: null,
    armed: false,      /* a touch, click or key press reached this page */
    refused: false,    /* a playback was refused; wait for S-01-B02 */
    plays: 0,          /* chimes actually scheduled (read by the demo test) */
    lastAt: 0,

    soundOn: function () { return lsGet(LS.sound) !== 'off'; },
    setSound: function (on) { lsSet(LS.sound, on ? 'on' : 'off'); },

    /* S-03 §5.4 — called from a user gesture. `clearRefusal` is true on
       S-03, where any touch arms audio (§5.4 rule 2); on S-01 a refusal is
       cleared only by S-01-B02 (S-01 §5.6 rule 6). */
    arm: function (clearRefusal) {
      if (clearRefusal) Chime.refused = false;
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

    /* 'on' | 'off' | 'blocked' — the three labels of S-01-B02. */
    state: function () {
      if (!Chime.soundOn()) return 'off';
      return Chime.refused ? 'blocked' : 'on';
    },

    play: function () {
      if (!Chime.soundOn() || Chime.refused) return false;
      if (!Chime.armed || !Chime.ctx) {
        Chime.refused = true;                 /* §5.6 rule 6 */
        if (window.App && App.rerender) App.rerender();
        return false;
      }
      try {
        var ctx = Chime.ctx;
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
        var t0 = ctx.currentTime + 0.02;
        tone(ctx, 880, t0, 1.0);             /* two soft notes, 2 s in all */
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

  /* The alert rules shared by S-01 and S-03 (S-01 §5.6, S-03 §5.5 rule 3).
     `prev` is the set of New order numbers in the previous successful
     response; null means the next response is the baseline. */
  var LATE_MS = 5 * MIN;
  var Alert = {
    prev: null,
    resetBaseline: function () { Alert.prev = null; },
    handOver: function (set) { Alert.prev = set; },
    /* newList: [{ orderNo, createdAt }] of the orders in status New. */
    observe: function (newList) {
      var set = {}, fresh = false, i;
      for (i = 0; i < newList.length; i++) set[newList[i].orderNo] = true;
      if (Alert.prev !== null) {
        for (i = 0; i < newList.length; i++) if (!Alert.prev[newList[i].orderNo]) fresh = true;
      }
      Alert.prev = set;
      if (fresh) Chime.play();               /* one chime per response */
    },
    isLate: function (order, now) {
      return order.status === 'New' && (now - (order.createdAt || now)) > LATE_MS;
    },
    /* Called every second: the 60-second repeat while any New order is Late. */
    tick: function (newList, now) {
      var late = false;
      for (var i = 0; i < newList.length; i++) {
        if ((now - (newList[i].createdAt || now)) > LATE_MS) { late = true; break; }
      }
      if (late && now - Chime.lastAt >= 60 * 1000) {
        if (!Chime.play()) Chime.lastAt = now;   /* muted or refused: wait anyway */
      }
    }
  };

  /* ------------------------------------------------------------------ *
   * The staff "server": HotelDB behind promises. Every request has the
   * specified timeout; a late answer is discarded. The demo strip can cut
   * the connection so the failure states can be seen.
   * ------------------------------------------------------------------ */
  var TIMEOUT = { board: 10000, order: 10000, action: 15000, signin: 15000, queue: 10000 };

  var Server = {
    latencyMs: 180,
    failMode: lsGet(LS.demo) === 'noConnection' ? 'noConnection' : 'none',

    setFailMode: function (m) {
      Server.failMode = m === 'noConnection' ? 'noConnection' : 'none';
      lsSet(LS.demo, Server.failMode);
    },

    call: function (kind, produce) {
      return new Promise(function (resolve, reject) {
        var done = false;
        var timer = setTimeout(function () {
          if (done) return;
          done = true;
          reject({ type: 'timeout' });
        }, TIMEOUT[kind]);
        setTimeout(function () {
          if (done) return;
          if (Server.failMode === 'noConnection') {
            done = true; clearTimeout(timer); reject({ type: 'noConnection' }); return;
          }
          try {
            produce(function (v) { if (!done) { done = true; clearTimeout(timer); resolve(v); } },
                    function (e) { if (!done) { done = true; clearTimeout(timer); reject(e); } });
          } catch (e) {
            if (!done) { done = true; clearTimeout(timer); reject({ type: 'serverError' }); }
          }
        }, Server.latencyMs);
      });
    },

    /* "Give me the board" — one response feeds both tabs (S-01 §5.5 rule 4). */
    board: function () {
      return Server.call('board', function (ok) { ok(HotelDB.orders()); });
    },

    order: function (orderNo) {
      return Server.call('order', function (ok, fail) {
        var o = HotelDB.getOrder(orderNo);
        if (!o) fail({ type: 'notFound' }); else ok(o);
      });
    },

    /* { ok, error, order } straight from HotelDB. */
    setStatus: function (orderNo, status, staffId) {
      return Server.call('action', function (ok) {
        ok(HotelDB.setStatus(orderNo, status, { staffId: staffId, at: Date.now() }));
      });
    },

    cancel: function (orderNo, reasonAr, reasonEn, staffId) {
      return Server.call('action', function (ok) {
        ok(HotelDB.cancel(orderNo, reasonAr, reasonEn, staffId));
      });
    },

    /* S-03 §5.5 rule 1: counts, and each New order's number and time. */
    queue: function () {
      return Server.call('queue', function (ok, fail) {
        if (!Device.linked()) { fail({ type: 'notLinked' }); return; }
        var all = HotelDB.orders(), n = 0, list = [];
        for (var i = 0; i < all.length; i++) {
          if (isActiveStatus(all[i].status)) n++;
          if (all[i].status === 'New') list.push({ orderNo: all[i].orderNo, createdAt: all[i].createdAt });
        }
        ok({ active: n, news: list });
      });
    },

    /* S-03 §5.2 — five outcomes. The wrong-PIN count is the "server's",
       kept apart from anything the screen shows (S-03 §5.2 step 6). */
    signIn: function (pin) {
      return Server.call('signin', function (ok) {
        if (!Device.linked()) { ok({ kind: 'notLinked' }); return; }
        var auth = {};
        try { auth = JSON.parse(lsGet(LS.auth) || '{}') || {}; } catch (e) { auth = {}; }
        var now = Date.now();
        if (auth.lockedUntil && now < auth.lockedUntil) { ok({ kind: 'locked' }); return; }
        var members = (HotelDB.staff().members) || [], hit = null;
        for (var i = 0; i < members.length; i++) if (String(members[i].pin) === pin) hit = members[i];
        if (hit) {
          lsSet(LS.auth, JSON.stringify({ wrong: 0, lockedUntil: 0 }));
          ok({ kind: 'ok', member: { id: hit.id, name: hit.name } });
          return;
        }
        var wrong = (auth.wrong || 0) + 1;
        if (wrong >= 5) {
          lsSet(LS.auth, JSON.stringify({ wrong: 0, lockedUntil: now + 60 * 1000 }));
          ok({ kind: 'locked' });
        } else {
          lsSet(LS.auth, JSON.stringify({ wrong: wrong, lockedUntil: 0 }));
          ok({ kind: 'wrong' });
        }
      });
    }
  };

  /* ------------------------------------------------------------------ *
   * Session (map §4 decisions 2, 3): { memberId, since } in HotelDB's
   * roomstore.staff. It ends at "End shift" or 12 hours after sign-in.
   * ------------------------------------------------------------------ */
  var SESSION_MS = 12 * 60 * MIN;
  var Session = {
    raw: function () {
      var s = HotelDB.staff();
      return s && s.session && s.session.memberId ? s.session : null;
    },
    current: function () {
      var r = Session.raw();
      if (!r) return null;
      return { memberId: r.memberId, since: r.since || 0, name: memberName(r.memberId) };
    },
    expired: function (sess) {
      return !!sess && (Date.now() - (sess.since || 0)) >= SESSION_MS;
    },
    live: function () {
      var s = Session.current();
      return s && !Session.expired(s) ? s : null;
    },
    start: function (memberId) {
      var s = HotelDB.staff();
      s.session = { memberId: memberId, since: Date.now() };
      HotelDB.saveStaff(s);
    },
    end: function () {
      var s = HotelDB.staff();
      s.session = null;
      HotelDB.saveStaff(s);
    }
  };

  window.Staff = {
    tIn: tIn, moneyIn: moneyIn, itemQty: itemQty, countWord: countWord,
    duration: duration, westernDigits: westernDigits, payCase: payCase,
    hasNotes: hasNotes, lineName: lineName, orderLang: orderLang, spaced: spaced,
    isActiveStatus: isActiveStatus, isFinalStatus: isFinalStatus,
    hotelDayStart: hotelDayStart, finalAt: finalAt, memberName: memberName,
    Lang: Lang, Chime: Chime, Alert: Alert, Server: Server, Session: Session,
    Device: Device, SESSION_MS: SESSION_MS,
    MIN: MIN
  };
})();
