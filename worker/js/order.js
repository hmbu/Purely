/* worker/js/order.js — W-02 Order detail (تفاصيل الطلب) and WM-01 Confirm
   delivery and payment — the desk's SM-02 ported to the phone with its copy
   and behaviour (docs/operations.html moves SM-02 to the worker's phone; the
   ID WM-01 follows spec/worker/worker-map.md).

   The worker moves only their own order, one step at a time:
     Accepted  → "خرجت بالطلب / I'm on my way"             → On the way
     On the way→ "تم التوصيل واستلام المبلغ / Delivered & paid" → WM-01 → Delivered
   Workers never cancel (design rule 6): W-02-C14 tells them to call the desk.
   When the order leaves this phone — reassigned, cancelled by the desk, or
   delivered by the desk on the worker's behalf — W-02 returns to W-01, where
   W-01-C05 says why. */
(function () {
  'use strict';

  var W = window.WK;
  var Feed = W.Feed, Session = W.Session, Server = W.Server;

  I18N.register({
    'w02.c01':        { ar: 'تفاصيل الطلب', en: 'Order detail' },
    'w02.c14':        { ar: 'غيّر المكتب حالة هذا الطلب نيابةً عنك', en: "The desk changed this order's status for you" },
    'w02.c15':        { ar: 'تعذّر تحديث هذا الطلب — هذه آخر حالة معروفة', en: 'Could not refresh this order — this is the last known status' },
    'w02.c05':        { ar: 'جوال الضيف', en: 'Guest mobile' },
    'w02.sr.call':    { ar: 'اتصل بالضيف على {phone}', en: 'Call the guest on {phone}' },
    'w02.c06':        { ar: 'ما يجب تجهيزه — {count}', en: 'To prepare — {count}' },
    'w02.c07.qty':    { ar: '×{n}', en: '×{n}' },
    'w02.c09':        { ar: 'ملاحظات الضيف', en: 'Guest notes' },
    'w02.c10':        { ar: 'الدفع عند الاستلام', en: 'Pay on delivery' },
    'w02.c10.card':   { ar: 'الطريقة: بطاقة — أحضر جهاز الدفع', en: 'Method: Card — bring the card terminal' },
    'w02.c10.cash':   { ar: 'الطريقة: نقدًا', en: 'Method: Cash' },
    'w02.c10.collect':{ ar: 'المبلغ المطلوب: {total}', en: 'Amount to collect: {total}' },
    'w02.c10.more':   { ar: 'سيدفع بـ {amount} — أحضر باقي {change}', en: 'Paying with {amount} — bring {change} change' },
    'w02.c10.equal':  { ar: 'سيدفع بالمبلغ المطابق — لا يوجد باقٍ', en: 'Paying the exact amount — no change' },
    'w02.c10.none':   { ar: 'لم يحدّد الضيف المبلغ — احمل باقيًا كافيًا', en: 'The guest did not state an amount — carry enough change' },
    'w02.c11':        { ar: 'الضيف رفض الطلب أو لا يوجد دفع؟ اتصل بمكتب الروم سيرفس ليلغيه', en: "Guest refused or can't pay? Call the room service desk to cancel" },
    'w02.c12':        { ar: 'تم تسجيل التوصيل والدفع', en: 'Delivery and payment recorded' },
    'w02.c12.desk':   { ar: 'سجّل المكتب التوصيل نيابةً عنك', en: 'The desk recorded the delivery for you' },
    'w02.b02.Accepted': { ar: 'خرجت بالطلب', en: "I'm on my way" },
    'w02.b02.OnTheWay': { ar: 'تم التوصيل واستلام المبلغ', en: 'Delivered & paid' },
    'w02.b02.opens':  { ar: 'يفتح تأكيد الدفع', en: 'Opens the payment confirmation' },
    'w02.b03':        { ar: 'العودة إلى طلباتي', en: 'Back to my orders' },
    'w02.c16.l1':     { ar: 'تعذّر تحميل هذا الطلب', en: 'Could not load this order' },
    'w02.c16.l2':     { ar: 'تحقّق من الشبكة ثم ارجع إلى طلباتي وافتحه من هناك', en: 'Check the network, then go back to your orders and open it from there' },
    'w02.sr.status':  { ar: '{no}: {label}', en: '{no}: {label}' },
    'w02.sr.item':    { ar: '{n} × {name}', en: '{n} × {name}' },

    /* WM-01 — the desk's SM-02 copy, word for word. */
    'wm01.c01':         { ar: 'تأكيد التوصيل والدفع', en: 'Confirm delivery and payment' },
    'wm01.c03':         { ar: 'الطريقة: {m}', en: 'Method: {m}' },
    'wm01.c04':         { ar: 'المبلغ المطلوب', en: 'Amount to collect' },
    'wm01.c05.card':    { ar: 'خذ المبلغ على جهاز الدفع', en: 'Take the payment on the card terminal' },
    'wm01.c05.more':    { ar: 'سيدفع بـ {amount} — أعطِه باقيًا {change}', en: 'Paying with {amount} — give back {change} change' },
    'wm01.c05.equal':   { ar: 'سيدفع بالمبلغ المطابق — لا يوجد باقٍ', en: 'Paying the exact amount — no change' },
    'wm01.c05.none':    { ar: 'لم يحدّد الضيف المبلغ مسبقًا — أعطِه الباقي مما يدفعه', en: 'The guest did not state an amount in advance — give change from what they pay' },
    'wm01.c06':         { ar: 'اضغط فقط بعد أن يستلم الضيف الطلب وتستلم المبلغ', en: 'Tap only after the guest has the order and you have the payment' },
    'wm01.b02':         { ar: 'سلّمتُ الطلب واستلمتُ المبلغ', en: 'Handed over and payment taken' }
  });

  var D = { mounted: false };

  function me() { return Session.me(); }

  /* Double-tap guard: a second tap on the SAME control within 300 ms is ignored. */
  var tapAt = {};
  function tapOk(key) {
    var now = Date.now();
    key = key || '';
    if (tapAt[key] && now - tapAt[key] < 300) return false;
    tapAt[key] = now;
    return true;
  }

  function announceStatus(o) {
    App.announce(t('w02.sr.status', { no: o.orderNo, label: t('w.status.' + o.status) }));
  }

  /* The order left this phone: say why on W-01 and go there. */
  function leaveFor(kind, o) {
    Feed.addNotice(kind, o, D.orderNo);
    D.mounted = false;
    App.toList(D.fromList);
  }

  /* Apply what the server says about this order, whatever the route. */
  function apply(o) {
    var kind = W.classify(o, me());
    if (kind === 'active') {
      if (D.order && o.status !== D.order.status) {
        var row = W.logFor(o, o.status);
        if (!row || row.staffId !== me()) D.deskChanged = true;
        announceStatus(o);
      }
      D.order = o;
      D.stale = false;
      draw();
      return;
    }
    if (kind === 'deliveredByMe' || kind === 'deskDelivered') {
      /* Delivered while on this screen by someone else: back to the list with
         the notice. Opened directly (reload, link) or delivered by me: the
         read-only delivered record. */
      if (kind === 'deskDelivered' && D.order && W.isActive(D.order.status)) { leaveFor(kind, o); return; }
      if (App.Modal.isOpen()) App.Modal.drop();
      D.order = o;
      D.done = kind;
      D.stale = false;
      draw();
      return;
    }
    leaveFor(kind, o);
  }

  function check() {
    if (!D.mounted) return;
    var g = ++D.gen;
    Server.order(D.orderNo).then(function (o) {
      if (!D.mounted || g !== D.gen) return;
      apply(o);
    }, function () {
      if (!D.mounted || g !== D.gen) return;
      if (!D.order) { D.loadFail = true; draw(); return; }
      D.stale = true;
      draw();
    });
  }

  /* ------------------------------------------------------------------ *
   * The primary action
   * ------------------------------------------------------------------ */
  function primary() {
    if (!tapOk('B02') || D.busy || !D.order || D.done) return;
    var st = D.order.status;
    if (st === 'OnTheWay') {                 /* sends nothing: WM-01 decides */
      App.Modal.open('WM-01', { order: D.order });
      return;
    }
    if (st !== 'Accepted') return;
    D.busy = true;
    D.actionErr = false;
    D.gen++;
    draw();
    Server.move(D.order.orderNo, 'OnTheWay', me()).then(function (res) {
      if (!D.mounted) return;
      D.busy = false;
      var o = res && res.order;
      if (o && o.assignedTo === me() && o.status === 'OnTheWay' && (res.ok || res.error === 'stale')) {
        D.order = o;                          /* success, or the desk had already done it */
        D.deskChanged = !res.ok;
        announceStatus(o);
        draw();
        return;
      }
      if (res && (res.error === 'notMine' || res.error === 'notFound' || (o && !W.isActive(o.status)))) {
        apply(o || null);
        return;
      }
      D.actionErr = true;
      draw();
    }, function () {
      if (!D.mounted) return;
      D.busy = false;
      D.actionErr = true;                      /* nothing assumed */
      draw();
    });
  }

  /* ------------------------------------------------------------------ *
   * Draw
   * ------------------------------------------------------------------ */
  function header() {
    return '<div class="s-top"><header class="s-header" data-el="W-02-S01">' +
             '<span class="s-header__side">' +
               '<button type="button" class="iconbtn" data-el="W-02-B01" aria-label="' + esc(t('w.back')) + '">' +
                 '<span class="iconbtn__glyph chev" aria-hidden="true">›</span></button>' +
             '</span>' +
             '<h1 class="s-header__title s-header__title--center" data-el="W-02-C01">' + t('w02.c01') + '</h1>' +
             '<span class="s-header__side"></span>' +
           '</header></div>';
  }

  function backButton() {
    return '<button type="button" class="btn btn--ghost s-back-btn" data-el="W-02-B03">' + t('w02.b03') + '</button>';
  }

  function payLines(o) {
    var pc = W.payCase(o);
    var collect = '<p class="s-pay__collect">' + t('w02.c10.collect', { total: money(o.total) }) + '</p>';
    if (pc.kind === 'card') return '<p class="s-pay__line">' + t('w02.c10.card') + '</p>' + collect;
    var third;
    if (pc.kind === 'cashMore') third = '<b>' + t('w02.c10.more', { amount: money(pc.amount), change: money(pc.change) }) + '</b>';
    else if (pc.kind === 'cashEqual') third = t('w02.c10.equal');
    else third = t('w02.c10.none');
    return '<p class="s-pay__line">' + t('w02.c10.cash') + '</p>' + collect +
           '<p class="s-pay__line w-change" data-case="' + pc.kind + '">' + third + '</p>';
  }

  /* The guest's mobile, one tap to call (design rule 8). Stored normalised
     ("+" then 8–15 digits); anything else is plain text, never a link. */
  function phoneBlock(o) {
    var phone = String(o.phone == null ? '' : o.phone).trim();
    if (!phone) return '';
    var value = /^\+[0-9]{8,15}$/.test(phone)
      ? '<a class="s-phone__link" data-el="W-02-B04" href="tel:' + esc(phone) + '" dir="ltr" ' +
          'aria-label="' + esc(t('w02.sr.call', { phone: W.spaced(phone) })) + '">' + esc(phone) + '</a>'
      : '<span class="s-phone__link" dir="ltr">' + esc(phone) + '</span>';
    return '<div class="s-phone" data-el="W-02-C08">' +
             '<span class="s-phone__label">' + t('w02.c05') + '</span>' + value + '</div>';
  }

  function draw() {
    if (!D.mounted) return;
    var h = '<div class="s-screen s-order w-order">' + header();
    var bar = '';

    if (D.loadFail && !D.order) {
      h += '<main class="s-col"><div class="s-empty" data-el="W-02-C19">' +
             '<span class="s-icon-circle" aria-hidden="true">!</span>' +
             '<p class="s-empty__l1">' + t('w02.c16.l1') + '</p>' +
             '<p class="s-empty__l3">' + t('w02.c16.l2') + '</p></div></main>';
      bar = backButton();
    } else if (!D.order) {
      h += '<main class="s-col s-detail" data-el="W-02-S02" aria-hidden="true">' +
             '<div class="s-skel s-skel--line"></div>' +
             '<div class="s-skel s-skel--head" style="margin-top:8px"></div>' +
             '<div class="s-skel s-skel--room" style="margin-top:16px"></div>' +
             '<div class="s-skel s-skel--row" style="margin-top:24px"></div>' +
             '<div class="s-skel s-skel--row" style="margin-top:8px"></div>' +
           '</main>';
      bar = backButton();
    } else {
      var o = D.order, now = Date.now(), st = o.status, qty = W.itemQty(o);
      h += '<main class="s-col s-detail" data-el="W-02-S02">';
      if (D.deskChanged && !D.done) h += '<p class="s-line s-line--boxed" data-el="W-02-C03" style="margin-bottom:16px">' + t('w02.c14') + '</p>';
      if (D.stale && !D.done) h += '<p class="s-line" data-el="W-02-C06" role="status" style="margin-bottom:8px">' + t('w02.c15') + '</p>';
      h += '<div class="s-idline" data-el="W-02-C04"><span>' +
             t('w.orderno', { no: '<span class="num">' + esc(o.orderNo) + '</span>' }) + '</span>' +
             '<span>' + W.duration(now - (o.createdAt || now)) + '</span></div>';
      h += '<p class="s-status" data-el="W-02-C05" style="margin-top:8px">' + t('w.status.' + st) + '</p>';
      h += '<div class="s-roomblock" data-el="W-02-C07" style="margin-top:16px" ' +
             'aria-label="' + esc(t('w.room') + ' ' + W.spaced(o.roomNumber)) + '">' +
             '<span class="s-roomblock__word" aria-hidden="true">' + t('w.room') + '</span>' +
             '<span class="s-roomno s-roomblock__no" aria-hidden="true">' + esc(o.roomNumber) + '</span></div>';
      h += phoneBlock(o);

      h += '<section class="s-sec" data-el="W-02-S03">' +
             '<h2 class="s-sec__title" data-el="W-02-C09">' + t('w02.c06', { count: W.countWord(qty) }) + '</h2><ul>';
      for (var i = 0; i < o.lines.length; i++) {
        var l = o.lines[i];
        h += '<li class="s-item" data-el="W-02-C10" aria-label="' + esc(t('w02.sr.item', { n: l.qty, name: W.lineName(l) })) + '">' +
               '<span class="s-item__qty" aria-hidden="true">' + t('w02.c07.qty', { n: esc(l.qty) }) + '</span>' +
               '<span class="s-item__name" aria-hidden="true">' + esc(W.lineName(l)) + '</span></li>';
      }
      h += '</ul><div class="s-items-total" data-el="W-02-C11"><span>' + W.countWord(qty) + '</span>' +
             '<span class="s-items-total__sum">' + money(o.total) + '</span></div></section>';

      if (W.hasNotes(o)) {
        h += '<section class="s-sec s-notes" data-el="W-02-C12">' +
               '<h2 class="s-sec__title" style="margin-bottom:4px">' + t('w02.c09') + '</h2>' +
               '<p class="s-notes__text">' + esc(o.notes) + '</p></section>';
      }

      h += '<section class="s-sec" data-el="W-02-C13"><h2 class="s-sec__title" style="margin-bottom:4px">' +
             t('w02.c10') + '</h2>' + payLines(o) + '</section>';

      if (D.done) {
        h += '<p class="s-sec s-record w-record" data-el="W-02-C16">' + t(D.done === 'deskDelivered' ? 'w02.c12.desk' : 'w02.c12') + '</p>';
      } else {
        h += '<p class="s-sec w-hint" data-el="W-02-C14">' + t('w02.c11') + '</p>';
      }
      h += '</main>';

      if (D.done) {
        bar = backButton();
      } else {
        if (D.actionErr) bar += '<p class="error" data-el="W-02-C17" role="alert">' + t('w.actionfail') + '</p>';
        if (D.busy) {
          bar += '<button type="button" class="btn btn--primary s-primary" data-el="W-02-B02" disabled aria-disabled="true">' +
                   '<span class="s-primary__l1">' + t('w.sending') + '</span></button>';
        } else {
          var l2 = st === 'OnTheWay' ? t('w02.b02.opens') : t('w.after', { label: t('w.status.OnTheWay') });
          bar += '<button type="button" class="btn btn--primary s-primary" data-el="W-02-B02" data-status="' + st + '">' +
                   '<span class="s-primary__l1">' + t('w02.b02.' + st) + '</span>' +
                   '<span class="s-primary__l2">' + l2 + '</span></button>';
        }
      }
    }

    h += '<div class="s-bar" data-el="W-02-S04">' + bar + '</div></div>';
    var root = App.paint(h);
    var main = root.querySelector('.s-detail');
    var barEl = root.querySelector('.s-bar');
    if (main && barEl) main.style.paddingBottom = (barEl.offsetHeight + 16) + 'px';

    root.querySelector('[data-el="W-02-B01"]').addEventListener('click', goList);
    var b03 = root.querySelector('[data-el="W-02-B03"]');
    if (b03) b03.addEventListener('click', goList);
    var b02 = root.querySelector('[data-el="W-02-B02"]');
    if (b02) b02.addEventListener('click', primary);
  }

  function goList() {
    if (!tapOk('back')) return;
    D.mounted = false;
    App.toList(D.fromList);
  }

  /* ------------------------------------------------------------------ *
   * View contract
   * ------------------------------------------------------------------ */
  Views['W-02'] = {
    enter: function (params, ctx) {
      D = {
        mounted: true, orderNo: String(params.orderNo), order: null, fromList: !!ctx.fromList,
        busy: false, actionErr: false, deskChanged: false, stale: false, done: null,
        loadFail: false, gen: 0, lastTick: 0
      };
      /* From a W-01 card: drawn on the first frame from the Feed, no skeleton. */
      D.order = Feed.find(D.orderNo);
      window.scrollTo(0, 0);
      draw();
      check();
    },

    leave: function () { D.mounted = false; D.gen++; },

    draw: draw,

    /* Every Feed response: the order is still mine and active → redraw in
       place; otherwise ask the server what became of it (apply). Held while
       this phone's own request is in flight — its answer decides. */
    onFeed: function () {
      if (!D.mounted || D.busy || D.done) return;
      if (App.Modal.isOpen() && App.Modal.cur.busy) return;
      var f = Feed.find(D.orderNo);
      if (f) { apply(f); if (App.Modal.isOpen()) App.Modal.draw(false); return; }
      if (Feed.failed) { if (D.order) { D.stale = true; draw(); } return; }
      check();
    },

    onModalOutcome: function (id, outcome, order) {
      if (!D.mounted) return;
      if (outcome === 'delivered') {
        D.order = order;
        D.done = W.classify(order, me()) === 'deskDelivered' ? 'deskDelivered' : 'deliveredByMe';
        D.deskChanged = false;
        announceStatus(order);
        draw();
        return;
      }
      if (outcome === 'gone') { apply(order); return; }
      draw();
      check();
    },

    tick: function (now) {
      if (!D.mounted) return;
      if (!D.lastTick) { D.lastTick = now; return; }
      if (now - D.lastTick >= 30000) { D.lastTick = now; if (!App.Modal.isOpen()) draw(); }
    }
  };

  /* ================================================================== *
   * WM-01 — Confirm delivery and payment (the desk's SM-02, on the phone)
   * ================================================================== */
  var M = {};

  function c02Html() {
    var o = M.order, pc = W.payCase(o);
    var method = '<b>' + t(pc.kind === 'card' ? 'w.pay.card' : 'w.pay.cash') + '</b>';
    var instr;
    if (pc.kind === 'card') instr = t('wm01.c05.card');
    else if (pc.kind === 'cashMore') instr = t('wm01.c05.more', {
      amount: '<b>' + money(pc.amount) + '</b>',
      change: '<b>' + money(pc.change) + '</b>'
    });
    else if (pc.kind === 'cashEqual') instr = t('wm01.c05.equal');
    else instr = t('wm01.c05.none');
    var busy = M.busy;

    return '<div class="sheet s-sheet" data-el="WM-01-S02" role="dialog" aria-modal="true" aria-labelledby="sm02-title">' +
      '<div class="s-sheet__scroll">' +
        '<h2 id="sm02-title" class="s-sheet__title" data-el="WM-01-C01" tabindex="-1" data-title>' + t('wm01.c01') + '</h2>' +
        '<div class="s-sheet__room" data-el="WM-01-C02" aria-label="' + esc(t('w.room') + ' ' + W.spaced(o.roomNumber)) + '">' +
          '<span class="s-roomblock__word" aria-hidden="true">' + t('w.room') + '</span>' +
          '<span class="s-roomno s-sheet__roomno" aria-hidden="true">' + esc(o.roomNumber) + '</span>' +
        '</div>' +
        '<p class="s-method" data-el="WM-01-C03">' + t('wm01.c03', { m: method }) + '</p>' +
        '<div class="s-collect" data-el="WM-01-C04">' +
          '<p class="s-collect__label">' + t('wm01.c04') + '</p>' +
          '<p class="s-collect__value">' + money(o.total) + '</p>' +
        '</div>' +
        '<p class="s-instruction" data-el="WM-01-C05">' + instr + '</p>' +
        '<p class="s-line s-line--boxed w-sheet-hint" data-el="WM-01-C08">' + t('w02.c11') + '</p>' +
        '<p class="s-consequence" data-el="WM-01-C06">' + t('wm01.c06') + '</p>' +
      '</div>' +
      '<div class="s-sheet__foot" data-el="WM-01-S03">' +
        (M.failed && !busy ? '<p class="error" data-el="WM-01-C07" role="alert">' + t('w.actionfail') + '</p>' : '') +
        '<button type="button" class="btn btn--ghost" data-el="WM-01-B01"' + (busy ? ' disabled aria-disabled="true"' : '') + '>' + t('w.back') + '</button>' +
        '<button type="button" class="btn btn--primary s-primary" data-el="WM-01-B02"' + (busy ? ' disabled aria-disabled="true"' : '') + '>' +
          (busy
            ? '<span class="s-primary__l1">' + t('w.sending') + '</span>'
            : '<span class="s-primary__l1">' + t('wm01.b02') + '</span>' +
              '<span class="s-primary__l2">' + t('w.after', { label: t('w.status.Delivered') }) + '</span>') +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function c02Redraw() {
    if (!App.Modal.isOpen() || App.Modal.cur.id !== 'WM-01') return;
    App.Modal.draw(false);
  }

  function c02Confirm() {
    var Modal = App.Modal;
    if (!Modal.armed() || M.busy) return;
    var now = Date.now();
    if (now - M.tapAt < 300) return;
    M.tapAt = now;
    M.busy = true;
    M.failed = false;
    Modal.setBusy(true);
    c02Redraw();
    Server.move(M.order.orderNo, 'Delivered', me()).then(function (res) {
      if (!Modal.isOpen() || Modal.cur.id !== 'WM-01') return;
      M.busy = false;
      Modal.setBusy(false);
      var o = res && res.order;
      /* Any Delivered answer for my order is "delivered", whoever recorded it. */
      if (o && o.status === 'Delivered' && o.assignedTo === me() && (res.ok || res.error === 'stale')) {
        Modal.finish('delivered', o);
        return;
      }
      if (res && (res.error === 'notMine' || res.error === 'notFound' || (o && o.status === 'Cancelled'))) {
        Modal.finish('gone', o || null, true);   /* W-02 goes back to W-01 */
        return;
      }
      M.failed = true;
      c02Redraw();
    }, function () {
      if (!Modal.isOpen() || Modal.cur.id !== 'WM-01') return;
      M.busy = false;
      Modal.setBusy(false);
      M.failed = true;
      c02Redraw();
    });
  }

  Modals['WM-01'] = {
    init: function (params) {
      M = { order: params.order, busy: false, failed: false, tapAt: 0 };
    },
    html: function () {
      /* Redrawn from the latest order this screen knows (a Feed update). */
      if (D.order && String(D.order.orderNo) === String(M.order.orderNo)) M.order = D.order;
      return c02Html();
    },
    bind: function (sheet) {
      sheet.querySelector('[data-el="WM-01-B01"]').addEventListener('click', function () { App.Modal.dismiss(); });
      sheet.querySelector('[data-el="WM-01-B02"]').addEventListener('click', c02Confirm);
    }
  };
})();
