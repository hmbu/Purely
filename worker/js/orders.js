/* worker/js/orders.js — W-01 My orders (طلباتي) and WM-02 End shift.
   Only orders where assignedTo === me, status Accepted or On the way, oldest
   first (docs/operations.html "التوزيع على العمّال", design rule 1). The
   list is live: WK.Feed refreshes on every HotelDB change, so a new
   assignment appears — with the chime — and a reassignment away disappears,
   with no reload. Money is never shown here (design rule 8): the payment
   method only. */
(function () {
  'use strict';

  var W = window.WK;
  var Feed = W.Feed, Session = W.Session;

  I18N.register({
    'w01.c01':        { ar: 'طلباتي', en: 'My orders' },
    'w01.b02':        { ar: 'إنهاء الوردية', en: 'End shift' },
    'w01.c02':        { ar: '{name} — في الوردية منذ {time}', en: '{name} — on shift since {time}' },
    'w01.c03':        { ar: 'المس الشاشة مرة واحدة لتفعيل صوت الطلبات الجديدة', en: 'Touch the screen once to turn on the new-order sound' },
    'w01.c11':        { ar: 'للتوصيل الآن — {n}', en: 'To deliver now — {n}' },
    'w01.c05':        { ar: 'جديد', en: 'New' },
    'w01.card.meta':  { ar: '{count} · {method}', en: '{count} · {method}' },
    'w01.card.when':  { ar: 'حُوّل لك {ago}', en: 'Assigned to you {ago}' },
    'w01.c06.l1':     { ar: 'لا توجد طلبات محوّلة لك الآن', en: 'No orders assigned to you right now' },
    'w01.c06.l2':     { ar: 'تظهر هنا فور أن يحوّلها لك مكتب الروم سيرفس، مع نغمة', en: 'They appear here as soon as the room service desk assigns them to you, with a chime' },
    'w01.c10':        { ar: 'تعذّر تحديث طلباتك — هذه آخر قائمة معروفة', en: 'Could not refresh your orders — this is the last known list' },
    'w01.c10.first':  { ar: 'تعذّر تحميل طلباتك — تحقّق من الشبكة', en: 'Could not load your orders — check the network' },
    'w01.b04':        { ar: 'إعادة المحاولة', en: 'Try again' },
    'w01.b05':        { ar: 'فهمت', en: 'Got it' },
    'w01.b03':        { ar: 'تم التوصيل اليوم ({n})', en: 'Delivered today ({n})' },
    'w01.c08':        { ar: 'غرفة {room} · طلب رقم {no}', en: 'Room {room} · Order {no}' },
    'w01.c08.desk':   { ar: 'سجّله المكتب', en: 'Recorded by the desk' },
    'w01.sr.card':    { ar: 'غرفة {room}، {status}، {count}، {method}', en: 'Room {room}, {status}, {count}, {method}' },
    'w01.sr.new':     { ar: 'طلب جديد لك: غرفة {room}', en: 'New order for you: room {room}' },

    /* WM-02 End shift */
    'wm02.c01':       { ar: 'إنهاء الوردية؟', en: 'End your shift?' },
    'wm02.c02':       { ar: 'ستخرج من التطبيق ولن تصلك طلبات جديدة حتى تسجّل دخولك مرة أخرى.', en: 'You will be signed out and will not receive new orders until you sign in again.' },
    'wm02.c03':       { ar: 'معك {count} لم يُسلَّم بعد. يبقى محوّلًا لك حتى يحوّله المكتب لعامل آخر — أبلغ المكتب قبل أن تغادر.', en: 'You still have {count} not delivered. It stays assigned to you until the desk reassigns it — tell the desk before you leave.' },
    'wm02.b02':       { ar: 'إنهاء الوردية', en: 'End shift' },
    'w.orders.1':     { ar: 'طلب واحد', en: '1 order' },
    'w.orders.2':     { ar: 'طلبان', en: '2 orders' },
    'w.orders.few':   { ar: '{n} طلبات', en: '{n} orders' },
    'w.orders.many':  { ar: '{n} طلبًا', en: '{n} orders' }
  });

  var L = { mounted: false };

  function me() { return Session.me(); }

  function ordersWord(n) {
    var b = n === 1 ? '1' : n === 2 ? '2' : (n >= 3 && n <= 10) ? 'few' : 'many';
    return t('w.orders.' + b, { n: n });
  }

  /* Double-tap guard: a second tap on the SAME control within 300 ms is ignored. */
  var tapAt = {};
  function tapOk(key) {
    var now = Date.now();
    key = key || '';
    if (tapAt[key] && now - tapAt[key] < 300) return false;
    tapAt[key] = now;
    return true;
  }

  /* ------------------------------------------------------------------ *
   * Draw
   * ------------------------------------------------------------------ */
  function noticeHtml(n) {
    var o = n.order;
    var reason = (n.kind === 'cancelled' && o) ? W.storedReason(o) : '';
    var which = n.room ? t('w.gone.which', { no: '<span class="num">' + esc(n.no) + '</span>', room: '<span class="w-ltr">' + esc(n.room) + '</span>' }) : '';
    var dont = (n.kind === 'reassigned' || n.kind === 'cancelled');
    return '<div class="s-banner w-notice" data-el="W-01-C05" data-order="' + esc(n.no) + '" data-kind="' + n.kind + '" role="alert">' +
             '<p class="s-banner__l1">' + t('w.gone.' + n.kind) + '</p>' +
             (which ? '<p class="s-banner__l2">' + which + '</p>' : '') +
             (reason ? '<p class="s-banner__l2">' + t('w.gone.reason', { reason: esc(reason) }) + '</p>' : '') +
             (dont ? '<p class="s-banner__l2">' + t('w.gone.dont') + '</p>' : '') +
             '<button type="button" class="w-notice__ok" data-el="W-01-B04" data-order="' + esc(n.no) + '">' + t('w01.b05') + '</button>' +
           '</div>';
  }

  function cardHtml(o, now) {
    var qty = W.itemQty(o);
    var method = t(o.payment === 'cash' ? 'w.pay.cash' : 'w.pay.card');
    var at = W.assignedAt(o, me());
    var isNew = at > L.seenAt;
    return '<button type="button" class="s-card w-card" data-el="W-01-C07" data-order="' + esc(o.orderNo) + '"' +
             ' aria-label="' + esc(t('w01.sr.card', { room: W.spaced(o.roomNumber), status: t('w.status.' + o.status), count: W.countWord(qty), method: method })) + '">' +
             '<span class="s-card__top">' +
               '<span class="s-card__room"><span class="s-card__roomword">' + t('w.room') + '</span>' +
               '<span class="s-roomno s-card__roomno">' + esc(o.roomNumber) + '</span></span>' +
               (isNew ? '<span class="s-chip s-chip--late w-new" data-el="W-01-C15">' + t('w01.c05') + '</span>' : '') +
             '</span>' +
             '<span class="w-card__status">' + t('w.status.' + o.status) + '</span>' +
             '<span class="w-card__meta">' + t('w01.card.meta', { count: W.countWord(qty), method: '<b>' + method + '</b>' }) + '</span>' +
             '<span class="s-card__meta"><span>' + t('w.orderno', { no: '<span class="num">' + esc(o.orderNo) + '</span>' }) + '</span>' +
               '<span>' + t('w01.card.when', { ago: W.duration(now - (at || now)) }) + '</span></span>' +
           '</button>';
  }

  function deliveredHtml() {
    var list = Feed.delivered;
    if (!list.length) return '';
    var h = '<section class="w-done" data-el="W-01-S03">' +
      '<button type="button" class="w-done__toggle" data-el="W-01-B06" aria-expanded="' + (L.open ? 'true' : 'false') + '" aria-controls="w01-done">' +
        '<span>' + t('w01.b03', { n: '<span class="num">' + list.length + '</span>' }) + '</span>' +
        '<span class="w-done__chev" aria-hidden="true">' + (L.open ? '▴' : '▾') + '</span>' +
      '</button>' +
      '<ul id="w01-done"' + (L.open ? '' : ' hidden') + '>';
    for (var i = 0; i < list.length; i++) {
      var o = list[i].order, row = W.logFor(o, 'Delivered');
      var desk = row && row.staffId !== me();
      h += '<li class="w-done__row" data-el="W-01-C16" data-order="' + esc(o.orderNo) + '">' +
             '<span>' + t('w01.c08', { room: '<span class="w-ltr">' + esc(o.roomNumber) + '</span>', no: '<span class="num">' + esc(o.orderNo) + '</span>' }) +
               (desk ? ' <span class="w-done__desk">· ' + t('w01.c08.desk') + '</span>' : '') + '</span>' +
             '<span class="w-done__time">' + W.clock(list[i].at) + '</span>' +
           '</li>';
    }
    return h + '</ul></section>';
  }

  function draw() {
    if (!L.mounted) return;
    var sess = Session.current();
    if (!sess) return;
    var now = Date.now();
    var shift = HotelDB.workers().filter(function (w) { return w.id === sess.memberId; })[0];
    var since = (shift && shift.since) || sess.since || now;

    var h = '<div class="s-screen w-list-screen">' +
      '<div class="s-top"><header class="s-header" data-el="W-01-S01">' +
        '<h1 class="s-header__title" data-el="W-01-C02">' + t('w01.c01') + '</h1>' +
        '<button type="button" class="s-hbtn" data-el="W-01-B01" lang="' + I18N.other() + '">' + t('w.lang.other') + '</button>' +
        '<button type="button" class="s-hbtn s-hbtn--end" data-el="W-01-B03">' + t('w01.b02') + '</button>' +
      '</header>' +
      '<p class="w-shiftline" data-el="W-01-C01">' + t('w01.c02', { name: esc(sess.name), time: '<span class="num">' + W.clock(since) + '</span>' }) + '</p>' +
      '</div>' +
      '<main class="s-list w-list" data-el="W-01-S02">';

    if (!W.Chime.ready()) h += '<p class="s-line s-line--boxed w-sound" data-el="W-01-C14">' + t('w01.c03') + '</p>';

    if (Feed.failed) {
      h += '<div class="w-fail" data-el="W-01-C04" role="status"><p class="s-line">' +
             t(Feed.loaded ? 'w01.c10' : 'w01.c10.first') + '</p>' +
             '<button type="button" class="btn btn--sm" data-el="W-01-B05">' + t('w01.b04') + '</button></div>';
    }

    for (var i = 0; i < Feed.notices.length; i++) h += noticeHtml(Feed.notices[i]);

    if (!Feed.loaded && !Feed.failed) {
      h += '<div data-el="W-01-C12" aria-hidden="true">' +
             '<div class="s-skel s-skel--card"></div>' +
             '<div class="s-skel s-skel--card" style="margin-top:12px"></div></div>';
    } else if (Feed.loaded) {
      var list = Feed.active;
      if (!list.length) {
        h += '<div class="s-empty" data-el="W-01-C11">' +
               '<span class="s-icon-circle" aria-hidden="true">✓</span>' +
               '<p class="s-empty__l1">' + t('w01.c06.l1') + '</p>' +
               '<p class="s-empty__l3">' + t('w01.c06.l2') + '</p></div>';
      } else {
        h += '<section class="s-group"><h2 class="s-group__title" data-el="W-01-C06">' +
               t('w01.c11', { n: '<span class="num">' + list.length + '</span>' }) + '</h2><div class="s-cards">';
        for (var j = 0; j < list.length; j++) h += cardHtml(list[j], now);
        h += '</div></section>';
      }
      h += deliveredHtml();
    }
    h += '</main></div>';

    var root = App.paint(h);
    root.querySelector('[data-el="W-01-B01"]').addEventListener('click', function () {
      if (!tapOk('B01')) return;
      W.Lang.toggle();
    });
    root.querySelector('[data-el="W-01-B03"]').addEventListener('click', function () {
      if (!tapOk('B02') || App.Modal.isOpen()) return;
      App.Modal.open('WM-02', { open: Feed.active.length });
    });
    var b04 = root.querySelector('[data-el="W-01-B05"]');
    if (b04) b04.addEventListener('click', function () { if (tapOk('B04')) Feed.refresh(); });
    var b03 = root.querySelector('[data-el="W-01-B06"]');
    if (b03) b03.addEventListener('click', function () {
      if (!tapOk('B03')) return;
      L.open = !L.open;
      draw();
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-el="W-01-B04"]'), function (b) {
      b.addEventListener('click', function () {
        Feed.dismiss(b.getAttribute('data-order'));
        draw();
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-el="W-01-C07"]'), function (c) {
      c.addEventListener('click', function () {
        if (!tapOk('C04')) return;
        var no = c.getAttribute('data-order');
        App.go('/order/' + encodeURIComponent(no), { fromList: true });
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * View contract
   * ------------------------------------------------------------------ */
  Views['W-01'] = {
    enter: function () {
      L = { mounted: true, open: L.open || false, seenAt: W.Seen.at(me()), lastTick: 0 };
      window.scrollTo(0, 0);
      draw();
      Feed.refresh();
    },
    leave: function () {
      L.mounted = false;
      W.Seen.mark(me());                    /* "the list was last seen" now */
    },
    draw: draw,
    onFeed: function (change) {
      if (change && change.fresh) {
        for (var i = 0; i < change.fresh.length; i++) {
          App.announce(t('w01.sr.new', { room: W.spaced(change.fresh[i].roomNumber) }));
        }
      }
      draw();
    },
    onArm: function () { draw(); },
    onVisibility: function (visible) {
      if (!visible) W.Seen.mark(me());
      else { L.seenAt = W.Seen.at(me()); draw(); }
    },
    onModalOutcome: function () { draw(); },
    tick: function (now) {
      if (!L.mounted) return;
      if (!L.lastTick) { L.lastTick = now; return; }
      if (now - L.lastTick >= 30000) { L.lastTick = now; if (!App.Modal.isOpen()) draw(); }
    }
  };

  /* ================================================================== *
   * WM-02 — End shift (confirm first)
   * ================================================================== */
  var E = {};

  Modals['WM-02'] = {
    init: function (params) { E = { open: params.open || 0 }; },
    html: function () {
      return '<div class="sheet s-sheet" data-el="WM-02-S02" role="dialog" aria-modal="true" aria-labelledby="wm01-title">' +
        '<div class="s-sheet__scroll">' +
          '<h2 id="wm01-title" class="s-sheet__title" data-el="WM-02-C01" tabindex="-1" data-title>' + t('wm02.c01') + '</h2>' +
          '<p class="s-effect" data-el="WM-02-C02">' + t('wm02.c02') + '</p>' +
          (E.open ? '<p class="s-boxline w-warn" data-el="WM-02-C03">' + t('wm02.c03', { count: ordersWord(E.open) }) + '</p>' : '') +
        '</div>' +
        '<div class="s-sheet__foot" data-el="WM-02-S03">' +
          '<button type="button" class="btn btn--ghost" data-el="WM-02-B01">' + t('w.back') + '</button>' +
          '<button type="button" class="btn btn--primary s-primary" data-el="WM-02-B02"><span class="s-primary__l1">' + t('wm02.b02') + '</span></button>' +
        '</div>' +
      '</div>';
    },
    bind: function (sheet) {
      sheet.querySelector('[data-el="WM-02-B01"]').addEventListener('click', function () { App.Modal.dismiss(); });
      sheet.querySelector('[data-el="WM-02-B02"]').addEventListener('click', function () {
        if (!App.Modal.armed()) return;
        App.Modal.remove(true);             /* the sign-in replace below takes over the sheet's entry */
        App.endShift();
      });
    }
  };
})();
