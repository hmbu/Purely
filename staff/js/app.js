/* staff/js/app.js — router, modal manager, clock and the demo strip.
   Owns #app, #modal-root, #sr-live and #demo-bar.

   Routes (hash, so the app runs from disk):
     #/board          S-01 Orders board
     #/order/{no}     S-02 Order detail
     #/sign-in        S-03 Staff sign-in
   Modals (SM-01, SM-02) have no URL and no history entry of their own
   (map §3.3 rule 2); a same-URL history state is pushed only so that the
   browser back gesture closes the sheet instead of leaving S-02. */
(function () {
  'use strict';

  var S = window.Staff;

  I18N.register({
    'st.title.S-01': { ar: 'لوحة الطلبات', en: 'Orders board' },
    'st.title.S-02': { ar: 'تفاصيل الطلب', en: 'Order detail' },
    'st.title.S-03': { ar: 'دخول الموظف', en: 'Staff sign-in' },

    /* Demo strip — not product copy (see index.html). */
    'st.demo.device':   { ar: 'الجهاز مربوط بالفندق', en: 'Device linked to the hotel' },
    'st.demo.expire':   { ar: 'إنهاء مدة الجلسة الآن', en: 'Expire the session now' }
  });

  var ROUTES = [
    { re: /^\/board$/, view: 'S-01', params: function () { return {}; } },
    { re: /^\/order\/([^\/]+)$/, view: 'S-02', params: function (m) { return { orderNo: decodeURIComponent(m[1]) }; } },
    { re: /^\/sign-in$/, view: 'S-03', params: function () { return {}; } }
  ];

  function path() { return location.hash.replace(/^#/, '') || ''; }

  function resolve(p) {
    for (var i = 0; i < ROUTES.length; i++) {
      var m = p.match(ROUTES[i].re);
      if (m) return { view: ROUTES[i].view, params: ROUTES[i].params(m) };
    }
    return null;
  }

  var current = null;      // { view, params, def }
  var navCtx = {};         // one-shot context handed to the next view's enter()

  /* ------------------------------------------------------------------ *
   * Modal manager — staff bottom sheets (SM-01 preamble conventions)
   * ------------------------------------------------------------------ */
  var Modal = {
    cur: null,            // { id, def, params, host, openedAt, busy, closing }
    ignorePop: 0,

    isOpen: function () { return !!Modal.cur; },

    /* 300 ms arming delay after the sheet starts to appear. */
    armed: function () { return !!Modal.cur && !Modal.cur.closing && Date.now() - Modal.cur.openedAt >= 300; },

    open: function (id, params) {
      var def = Modals[id];
      if (!def || Modal.cur) return;
      var host = document.createElement('div');
      host.className = 'backdrop s-backdrop';
      host.setAttribute('data-el', id + '-S01');
      document.getElementById('modal-root').appendChild(host);
      Modal.cur = { id: id, def: def, params: params || {}, host: host, openedAt: Date.now(), busy: false, closing: false };
      def.init(Modal.cur.params);
      Modal.draw(true);
      document.getElementById('app').setAttribute('inert', '');
      document.body.classList.add('is-modal-open');
      try { history.pushState({ staffModal: id }, '', location.href); } catch (e) {}

      host.addEventListener('click', function (e) {
        if (e.target === host) Modal.dismiss();
      });
    },

    draw: function (first) {
      var c = Modal.cur;
      if (!c) return;
      c.host.innerHTML = c.def.html();
      var sheet = c.host.firstElementChild;
      c.def.bind(sheet);
      if (!first) sheet.style.animation = 'none';   // re-render in place, no second slide-up
      bindSwipe(sheet);
      var title = sheet.querySelector('[data-title]');
      if (first && title) { try { title.focus({ preventScroll: true }); } catch (e) { title.focus(); } }
    },

    setBusy: function (b) {
      if (!Modal.cur) return;
      Modal.cur.busy = !!b;
      Modal.cur.host.classList.toggle('is-busy', !!b);
    },

    /* Back, backdrop, browser back, Escape, swipe — all ignored while busy. */
    dismiss: function (fromPop) {
      var c = Modal.cur;
      if (!c || c.closing) return false;
      if (c.busy || !Modal.armed()) {
        if (fromPop) { try { history.pushState({ staffModal: c.id }, '', location.href); } catch (e) {} }
        return false;
      }
      Modal.remove(fromPop);
      if (current && current.def.onModalOutcome) current.def.onModalOutcome(c.id, 'closed');
      return true;
    },

    /* A request outcome: close within 100 ms and hand it to S-02. */
    finish: function (outcome, order, variant) {
      var c = Modal.cur;
      if (!c) return;
      Modal.remove(false);
      if (current && current.def.onModalOutcome) current.def.onModalOutcome(c.id, outcome, order, variant);
    },

    remove: function (fromPop) {
      var c = Modal.cur;
      if (!c) return;
      c.closing = true;
      Modal.cur = null;
      if (c.host.parentNode) c.host.parentNode.removeChild(c.host);
      document.getElementById('app').removeAttribute('inert');
      document.body.classList.remove('is-modal-open');
      if (!fromPop && history.state && history.state.staffModal) {
        Modal.ignorePop++;
        history.back();
      }
    },

    /* Route change or reload path: drop the sheet with no outcome. */
    drop: function () {
      if (Modal.cur) Modal.remove(true);
    }
  };

  function bindSwipe(sheet) {
    var y0 = null;
    sheet.addEventListener('touchstart', function (e) {
      var r = sheet.getBoundingClientRect();
      var t0 = e.touches[0];
      y0 = (t0 && t0.clientY - r.top <= 24) ? t0.clientY : null;
    }, { passive: true });
    sheet.addEventListener('touchend', function (e) {
      if (y0 == null) return;
      var t1 = e.changedTouches[0];
      if (t1 && t1.clientY - y0 > 48) Modal.dismiss();
      y0 = null;
    });
  }

  window.addEventListener('popstate', function () {
    if (Modal.ignorePop > 0) { Modal.ignorePop--; return; }
    if (Modal.cur) Modal.dismiss(true);
  });

  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && Modal.cur) Modal.dismiss();
  });

  /* ------------------------------------------------------------------ *
   * App
   * ------------------------------------------------------------------ */
  var App = {
    Modal: Modal,

    /* Page memory only; a reload starts it again (S-03 §5.3). */
    state: {
      tab: 'active',          // S-01 tab
      scroll: 0,              // S-01 scroll position
      lastBoard: null,        // the most recent successful board response
      returnTarget: null      // { view:'S-01' } | { view:'S-02', orderNo, order, fromBoard }
    },

    view: function () { return current ? current.view : null; },

    go: function (p, ctx) {
      navCtx = ctx || {};
      if (location.hash === '#' + p) { App.render(); return; }
      location.hash = p;
    },

    replace: function (p, ctx) {
      navCtx = ctx || {};
      if (location.hash === '#' + p) { App.render(); return; }
      location.replace('#' + p);
    },

    render: function () {
      var r = resolve(path());
      var live = S.Session.live(), sess = S.Session.current();
      if (!r) { navCtx = {}; location.replace(live ? '#/board' : '#/sign-in'); return; }
      /* Screens that need a session; an expired one still renders them
         read-only (S-01 §6.6, S-02 §6.5). */
      if (r.view !== 'S-03' && !sess) { navCtx = {}; location.replace('#/sign-in'); return; }
      if (r.view === 'S-03' && live) { navCtx = {}; location.replace('#/board'); return; }

      var ctx = navCtx; navCtx = {};
      if (current && current.def.leave) current.def.leave();
      Modal.drop();
      current = { view: r.view, params: r.params, def: Views[r.view] };
      var root = document.getElementById('app');
      root.setAttribute('data-screen', r.view);
      document.title = t('st.title.' + r.view);
      current.def.enter(r.params, ctx);
    },

    /* Language switch (and i18n.js's setLang): redraw in place. */
    rerender: function () {
      I18N.apply();
      document.title = current ? t('st.title.' + current.view) : document.title;
      drawDemo();
      if (current && current.def.draw) {
        var y = window.scrollY;
        current.def.draw();
        window.scrollTo(0, y);
      }
      if (Modal.cur) Modal.draw(false);
    },

    /* Every view draws into #app through this, keeping the scroll position. */
    paint: function (html) {
      var root = document.getElementById('app');
      var y = window.scrollY;
      root.innerHTML = html;
      if (window.scrollY !== y) window.scrollTo(0, y);
      return root;
    },

    announce: function (text) {
      var el = document.getElementById('sr-live');
      if (!el) return;
      el.textContent = '';
      setTimeout(function () { el.textContent = text; }, 30);
    },

    /* "Sign in to continue" from S-01 or S-02 (S-03 §3.1). */
    signIn: function (target) {
      App.state.returnTarget = target || null;
      App.replace('/sign-in', { expired: true });
    },

    /* S-03 §5.3 — where a correct PIN leads. */
    afterSignIn: function () {
      var rt = App.state.returnTarget;
      App.state.returnTarget = null;
      if (rt && rt.view === 'S-02') {
        App.replace('/order/' + encodeURIComponent(rt.orderNo), { order: rt.order, fromBoard: rt.fromBoard });
      } else if (rt && rt.view === 'S-01') {
        App.replace('/board', { newBaseline: true, restore: true });
      } else {
        App.replace('/board', { freshBoard: true, newBaseline: true });
      }
    },

    start: function () {
      S.Lang.init();
      /* A session past its 12 hours is discarded on load (S-03 §3.1). */
      var sess = S.Session.current();
      if (sess && S.Session.expired(sess)) S.Session.end();
      drawDemo();
      window.addEventListener('hashchange', App.render);
      App.render();
    }
  };

  /* ------------------------------------------------------------------ *
   * Shared hooks: data changes, the clock, visibility, first gesture
   * ------------------------------------------------------------------ */

  /* New orders and status changes arrive live: HotelDB fires on the
     cross-tab storage event and on same-tab writes. The views treat it as
     "send one request now". */
  HotelDB.onChange(function (e) {
    if (e.key !== HotelDB.keys.orders && e.key != null) return;
    if (current && current.def.onData) current.def.onData();
  });

  setInterval(function () {
    if (!current) return;
    var now = Date.now();
    /* A session ended on this device from another tab: back to S-03. */
    if (current.view !== 'S-03' && !S.Session.current()) { App.replace('/sign-in'); return; }
    /* 12 hours reached with a sheet open and nothing in flight: it closes
       exactly as on Back (SM-01 §3.2, SM-02 §3.2). */
    if (Modal.cur && !Modal.cur.busy && S.Session.expired(S.Session.current())) {
      var id = Modal.cur.id;
      Modal.remove(false);
      if (current.def.onModalOutcome) current.def.onModalOutcome(id, 'closed');
    }
    if (current.def.tick) current.def.tick(now);
  }, 1000);

  document.addEventListener('visibilitychange', function () {
    if (current && current.def.onVisibility) current.def.onVisibility(!document.hidden);
  });

  /* Any touch, click or key press arms audio (S-03 §5.4). On S-03 it also
     clears an earlier refusal; on S-01 only B02 does (S-01 §5.6 rule 6). */
  function gesture() {
    var wasArmed = S.Chime.armed && !S.Chime.refused;
    S.Chime.arm(current && current.view === 'S-03');
    if (!wasArmed && current && current.def.onArm) current.def.onArm();
  }
  document.addEventListener('pointerdown', gesture, true);
  document.addEventListener('keydown', gesture, true);
  document.addEventListener('touchstart', gesture, { capture: true, passive: true });

  /* ------------------------------------------------------------------ *
   * Demo strip — not part of the product
   * ------------------------------------------------------------------ */
  function drawDemo() {
    var bar = document.getElementById('demo-bar');
    if (!bar) return;
    var mode = S.Server.failMode;
    bar.innerHTML =
      '<span class="demo-bar__tag">' + t('st.demo.tag') + '</span>' +
      '<label>' + t('st.demo.server') +
        ' <select id="demo-fail">' +
          '<option value="none"' + (mode === 'none' ? ' selected' : '') + '>' + t('st.demo.ok') + '</option>' +
          '<option value="noConnection"' + (mode === 'noConnection' ? ' selected' : '') + '>' + t('st.demo.down') + '</option>' +
        '</select></label>' +
      '<label><input type="checkbox" id="demo-linked"' + (S.Device.linked() ? ' checked' : '') + '> ' +
        t('st.demo.device') + '</label>' +
      '<button type="button" id="demo-expire">' + t('st.demo.expire') + '</button>';

    bar.querySelector('#demo-fail').addEventListener('change', function (e) {
      S.Server.setFailMode(e.target.value);
    });
    bar.querySelector('#demo-linked').addEventListener('change', function (e) {
      S.Device.setLinked(e.target.checked);
      if (current && current.view === 'S-03') App.render();
    });
    bar.querySelector('#demo-expire').addEventListener('click', function () {
      var s = HotelDB.staff();
      if (!s.session) return;
      s.session.since = Date.now() - S.SESSION_MS - 1000;
      HotelDB.saveStaff(s);
      if (current && current.def.tick) current.def.tick(Date.now());
    });
  }

  window.App = App;
})();
