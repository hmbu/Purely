/* worker/js/app.js — router, bottom-sheet manager, live updates, the demo strip.
   Owns #app, #modal-root, #sr-live and #demo-bar.

   Routes (hash, so the app runs from disk):
     #/sign-in        W-03 Worker sign-in       (دخول المندوب)
     #/orders         W-01 My orders            (طلباتي)
     #/order/{no}     W-02 Order detail         (تفاصيل الطلب)
   Sheets: WM-01 Confirm delivery and payment (the desk's SM-02, ported with
   its copy; ID per spec/worker/worker-map.md) and WM-02 End shift. Sheets have no URL; a same-URL history state is pushed only
   so the browser back gesture closes the sheet instead of leaving the screen. */
(function () {
  'use strict';

  var W = window.WK;

  I18N.register({
    'w.title.W-01': { ar: 'طلباتي', en: 'My orders' },
    'w.title.W-02': { ar: 'تفاصيل الطلب', en: 'Order detail' },
    'w.title.W-03': { ar: 'دخول المندوب', en: 'Delivery worker sign-in' }
  });

  var ROUTES = [
    { re: /^\/orders$/, view: 'W-01', params: function () { return {}; } },
    { re: /^\/order\/([^\/]+)$/, view: 'W-02', params: function (m) { return { orderNo: decodeURIComponent(m[1]) }; } },
    { re: /^\/sign-in$/, view: 'W-03', params: function () { return {}; } }
  ];

  function path() { return location.hash.replace(/^#/, '') || ''; }

  function resolve(p) {
    for (var i = 0; i < ROUTES.length; i++) {
      var m = p.match(ROUTES[i].re);
      if (m) return { view: ROUTES[i].view, params: ROUTES[i].params(m) };
    }
    return null;
  }

  var current = null;
  var navCtx = {};

  /* ------------------------------------------------------------------ *
   * Bottom sheets — the desk's staff-sheet conventions (SM-01 preamble):
   * 300 ms arming delay, not dismissable while a request is in flight.
   * ------------------------------------------------------------------ */
  var Modal = {
    cur: null,
    ignorePop: 0,

    isOpen: function () { return !!Modal.cur; },
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
      try { history.pushState({ workerModal: id }, '', location.href); } catch (e) {}
      host.addEventListener('click', function (e) { if (e.target === host) Modal.dismiss(); });
    },

    draw: function (first) {
      var c = Modal.cur;
      if (!c) return;
      c.host.innerHTML = c.def.html();
      var sheet = c.host.firstElementChild;
      c.def.bind(sheet);
      if (!first) sheet.style.animation = 'none';
      var title = sheet.querySelector('[data-title]');
      if (first && title) { try { title.focus({ preventScroll: true }); } catch (e) { title.focus(); } }
    },

    setBusy: function (b) {
      if (!Modal.cur) return;
      Modal.cur.busy = !!b;
      Modal.cur.host.classList.toggle('is-busy', !!b);
    },

    dismiss: function (fromPop) {
      var c = Modal.cur;
      if (!c || c.closing) return false;
      if (c.busy || !Modal.armed()) {
        if (fromPop) { try { history.pushState({ workerModal: c.id }, '', location.href); } catch (e) {} }
        return false;
      }
      Modal.remove(fromPop);
      if (current && current.def.onModalOutcome) current.def.onModalOutcome(c.id, 'closed');
      return true;
    },

    /* keepHistory: the caller navigates away next (App.toList), so the
       sheet's history entry is left for that navigation to account for. */
    finish: function (outcome, order, keepHistory) {
      var c = Modal.cur;
      if (!c) return;
      Modal.remove(!!keepHistory);
      if (current && current.def.onModalOutcome) current.def.onModalOutcome(c.id, outcome, order);
    },

    remove: function (fromPop) {
      var c = Modal.cur;
      if (!c) return;
      c.closing = true;
      Modal.cur = null;
      if (c.host.parentNode) c.host.parentNode.removeChild(c.host);
      document.getElementById('app').removeAttribute('inert');
      document.body.classList.remove('is-modal-open');
      if (!fromPop && history.state && history.state.workerModal) {
        Modal.ignorePop++;
        history.back();
      }
    },

    drop: function () { if (Modal.cur) Modal.remove(true); }
  };

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
      var sess = W.Session.current();
      if (!r) { navCtx = {}; location.replace(sess ? '#/orders' : '#/sign-in'); return; }
      if (r.view !== 'W-03' && !sess) { navCtx = {}; location.replace('#/sign-in'); return; }
      if (r.view === 'W-03' && sess) { navCtx = {}; location.replace('#/orders'); return; }
      if (sess && W.Feed.me !== sess.memberId) { W.Feed.reset(sess.memberId); W.Feed.refresh(); }

      var ctx = navCtx; navCtx = {};
      if (current && current.def.leave) current.def.leave();
      Modal.drop();
      current = { view: r.view, params: r.params, def: Views[r.view] };
      var root = document.getElementById('app');
      root.setAttribute('data-screen', r.view);
      document.title = t('w.title.' + r.view);
      current.def.enter(r.params, ctx);
    },

    rerender: function () {
      I18N.apply();
      if (current) document.title = t('w.title.' + current.view);
      drawDemo();
      if (current && current.def.draw) {
        var y = window.scrollY;
        current.def.draw();
        window.scrollTo(0, y);
      }
      if (Modal.cur) Modal.draw(false);
    },

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

    /* Back to W-01 from W-02 — by the back button, or because the order left
       this phone. When W-02 was opened from the list, step back in history
       (past a sheet's entry if one is still there) so the list is not
       stacked twice; otherwise replace. */
    toList: function (fromList) {
      var extra = 0;
      if (Modal.cur) Modal.remove(true);
      if (history.state && history.state.workerModal) extra = 1;
      if (fromList) { try { history.go(-(1 + extra)); return; } catch (e) {} }
      App.replace('/orders');
    },

    /* W-03 success: the first Feed response is the chime baseline. */
    afterSignIn: function () {
      var me = W.Session.me();
      W.Feed.reset(me);
      W.Feed.refresh();
      App.replace('/orders');
    },

    /* WM-02 confirmed, or the demo reset. */
    endShift: function () {
      var me = W.Session.me();
      if (me) W.Seen.mark(me);
      W.Session.end();                 /* the staff-key change may already have routed to W-03 */
      W.Feed.reset(null);
      if (!current || current.view !== 'W-03') App.replace('/sign-in');
    },

    start: function () {
      W.Lang.init();
      drawDemo();
      window.addEventListener('hashchange', App.render);
      App.render();
    }
  };

  /* ------------------------------------------------------------------ *
   * Live updates, the clock, visibility, the first gesture
   * ------------------------------------------------------------------ */

  /* HotelDB fires on the cross-tab storage event and on same-tab writes. */
  HotelDB.onChange(function (e) {
    if (e.key === HotelDB.keys.staff || e.key == null) {
      /* A shift ended (or a session changed) elsewhere: re-check at once. */
      if (current && current.view !== 'W-03' && !W.Session.current()) { W.Feed.reset(null); App.replace('/sign-in'); return; }
    }
    if (e.key === HotelDB.keys.orders || e.key == null) {
      if (W.Feed.me) W.Feed.refresh();
    }
  });

  W.Feed.onUpdate(function (change) {
    if (current && current.def.onFeed) current.def.onFeed(change);
  });

  setInterval(function () {
    if (!current) return;
    if (current.view !== 'W-03' && !W.Session.current()) { W.Feed.reset(null); App.replace('/sign-in'); return; }
    if (current.def.tick) current.def.tick(Date.now());
  }, 1000);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && W.Feed.me) W.Feed.refresh();
    if (current && current.def.onVisibility) current.def.onVisibility(!document.hidden);
  });

  /* Any touch, click or key press arms audio. */
  function gesture() {
    var was = W.Chime.ready();
    W.Chime.arm();
    if (!was && current && current.def.onArm) current.def.onArm();
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
    var mode = W.Server.failMode;
    bar.innerHTML =
      '<span class="demo-bar__tag">' + t('w.demo.tag') + '</span>' +
      '<label>' + t('w.demo.server') +
        ' <select id="demo-fail">' +
          '<option value="none"' + (mode === 'none' ? ' selected' : '') + '>' + t('w.demo.ok') + '</option>' +
          '<option value="noConnection"' + (mode === 'noConnection' ? ' selected' : '') + '>' + t('w.demo.down') + '</option>' +
        '</select></label>' +
      '<button type="button" id="demo-reset">' + t('w.demo.reset') + '</button>';

    bar.querySelector('#demo-fail').addEventListener('change', function (e) {
      W.Server.setFailMode(e.target.value);
      if (W.Feed.me) W.Feed.refresh();
    });
    bar.querySelector('#demo-reset').addEventListener('click', function () {
      if (Modal.cur) Modal.drop();
      App.endShift();
    });
  }

  window.App = App;
})();
