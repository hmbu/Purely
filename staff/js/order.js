/* staff/js/order.js — S-02 Order detail (تفاصيل الطلب).
   Spec: /spec/staff/screens/S-02.md. The only screen that changes an order:
   accept, on the way, delivered (through SM-02) and cancel (through SM-01).
   Every status change is one step forward through HotelDB.setStatus, which
   refuses a stale step — the cancellation race is decided there (§5.7). */
(function () {
  'use strict';

  var S = window.Staff;
  var Server = S.Server, Session = S.Session;

  I18N.register({
    's02.c01':          { ar: 'تفاصيل الطلب', en: 'Order detail' },
    's02.c02.g1':       { ar: 'ألغى الضيف هذا الطلب', en: 'The guest cancelled this order' },
    's02.c02.h1':       { ar: 'أُلغي هذا الطلب من جهاز آخر', en: 'This order was cancelled on another device' },
    's02.c02.l2':       { ar: 'لا تُحضّره ولا تتوجّه إلى الغرفة.', en: 'Do not prepare it and do not go to the room.' },
    's02.c03':          { ar: 'تغيّرت حالة هذا الطلب من جهاز آخر', en: "This order's status was changed on another device" },
    's02.c06':          { ar: 'تعذّر تحديث هذا الطلب — هذه آخر حالة معروفة', en: 'Could not refresh this order — this is the last known status' },
    's02.c08':          { ar: 'ما يجب تجهيزه — {count}', en: 'To prepare — {count}' },
    's02.c09.qty':      { ar: '×{n}', en: '×{n}' },
    's02.c11':          { ar: 'ملاحظات الضيف', en: 'Guest notes' },
    's02.c12':          { ar: 'الدفع عند الاستلام', en: 'Pay on delivery' },
    's02.c12.card':     { ar: 'الطريقة: بطاقة — أحضر جهاز الدفع', en: 'Method: Card — bring the card terminal' },
    's02.c12.cash':     { ar: 'الطريقة: نقدًا', en: 'Method: Cash' },
    's02.c12.collect':  { ar: 'المبلغ المطلوب: {total}', en: 'Amount to collect: {total}' },
    's02.c12.more':     { ar: 'سيدفع بـ {amount} — أحضر باقي {change}', en: 'Paying with {amount} — bring {change} change' },
    's02.c12.equal':    { ar: 'سيدفع بالمبلغ المطابق — لا يوجد باقٍ', en: 'Paying the exact amount — no change' },
    's02.c12.none':     { ar: 'لم يحدّد الضيف المبلغ — احمل باقيًا كافيًا', en: 'The guest did not state an amount — carry enough change' },
    's02.c13.guest':    { ar: 'ألغى الضيف هذا الطلب', en: 'The guest cancelled this order' },
    's02.c13.hotel':    { ar: 'ألغاه {name}: {reason}', en: 'Cancelled by {name}: {reason}' },
    's02.c14':          { ar: 'تم تسجيل التوصيل والدفع', en: 'Delivery and payment recorded' },
    's02.b03':          { ar: 'إلغاء الطلب', en: 'Cancel order' },
    's02.c15':          { ar: 'لم يصل التحديث إلى النظام — حاول مرة أخرى', en: 'The update did not reach the system — try again' },
    's02.c16':          { ar: 'بقبولك لن يستطيع الضيف إلغاء الطلب', en: 'Once you accept, the guest can no longer cancel it' },
    's02.b02.New':      { ar: 'قبول الطلب', en: 'Accept order' },
    's02.b02.Accepted': { ar: 'خرجت بالطلب', en: 'Heading out with the order' },
    's02.b02.OnTheWay': { ar: 'تم التوصيل والدفع', en: 'Delivered and paid' },
    'st.after':         { ar: 'الحالة بعد الضغط: {label}', en: 'Status after tapping: {label}' },
    's02.b02.opens':    { ar: 'يفتح تأكيد الدفع', en: 'Opens the payment confirmation' },
    's02.b04':          { ar: 'العودة إلى اللوحة', en: 'Back to the board' },
    's02.c17':          { ar: 'انتهت مدة الجلسة — سجّل الدخول لتنفيذ أي إجراء', en: 'The session has expired — sign in to take any action' },
    's02.c18.l1':       { ar: 'لم نعثر على هذا الطلب', en: 'We could not find this order' },
    's02.c18.l2':       { ar: 'قد يكون رقم الطلب غير صحيح، أو لم يعد الطلب موجودًا لدى الفندق', en: "The order number may be wrong, or the order is no longer in the hotel's system" },
    's02.c18.l3':       { ar: 'ارجع إلى اللوحة وافتحه من هناك', en: 'Go back to the board and open it from there' },
    /* Screen reader only (§7.5). */
    's02.sr.status':    { ar: '{no}: {label}', en: '{no}: {label}' },
    's02.sr.item':      { ar: '{n} × {name}', en: '{n} × {name}' }
  });

  var REFRESH_MS = 10000;
  var STATUSES = ['New', 'Accepted', 'OnTheWay', 'Delivered', 'Cancelled'];

  var D = { mounted: false };

  /* §6.2 — an order missing any of these is unreadable. */
  function readable(o) {
    return !!(o && o.orderNo != null && o.createdAt && o.roomNumber != null && String(o.roomNumber) !== '' &&
      o.lines && o.lines.length && (o.payment === 'card' || o.payment === 'cash') &&
      o.total != null && isFinite(Number(o.total)) && STATUSES.indexOf(o.status) !== -1);
  }

  function isFinal() { return D.order && S.isFinalStatus(D.order.status); }
  function paused() { return D.busy || D.modal || D.error; }

  /* ------------------------------------------------------------------ *
   * Refresh — one on open, then every 10 s from the end of the previous
   * attempt; paused while hidden, while a sheet is open and while an action
   * is in flight; stopped at Delivered, Cancelled and in the error state.
   * ------------------------------------------------------------------ */
  function request() {
    if (!D.mounted || paused() || isFinal()) return;
    if (D.inFlight) { D.again = true; return; }
    clearTimeout(D.timer);
    D.inFlight = true;
    var g = ++D.gen;
    Server.order(D.orderNo).then(function (o) {
      if (g !== D.gen) return;
      D.inFlight = false;
      if (!readable(o)) {
        if (!D.order) { D.error = true; draw(); return; }
        D.stale = true; draw(); after(); return;
      }
      fresh(o);
      after();
    }, function (err) {
      if (g !== D.gen) return;
      D.inFlight = false;
      if ((err && err.type === 'notFound') || !D.order) { D.error = true; draw(); return; }   /* §6.3 */
      D.stale = true;                                                                          /* C06 */
      draw();
      after();
    });
  }

  function after() {
    if (D.again) { D.again = false; request(); return; }
    schedule();
  }

  function schedule() {
    clearTimeout(D.timer);
    if (!D.mounted || isFinal() || D.error) return;
    D.timer = setTimeout(function () {
      if (!D.mounted || document.hidden) return;
      request();
    }, REFRESH_MS);
  }

  /* A response the server confirmed. A status this device did not write is
     disclosed: the banner for a cancellation, C03 for anything else. */
  function fresh(o) {
    var old = D.order;
    if (old && o.status !== old.status) {
      if (o.status === 'Cancelled') D.banner = o.cancelledByGuest ? 'G' : 'H';
      else D.external = true;
      announceStatus(o);
    }
    D.order = o;
    D.stale = false;
    draw();
  }

  function announceStatus(o) {
    App.announce(t('s02.sr.status', { no: o.orderNo, label: t('st.status.' + o.status) }));
  }

  /* ------------------------------------------------------------------ *
   * The primary action (§5.4, §5.7)
   * ------------------------------------------------------------------ */
  function primary() {
    if (!tapOk() || D.busy || !D.order) return;
    var st = D.order.status;
    if (st === 'OnTheWay') { openSheet('SM-02'); return; }   /* sends nothing */
    var target = HotelDB.nextStatus(st);
    if (!target || target === 'Delivered') return;

    D.busy = true;                  /* synchronous: a second tap finds B02 disabled */
    D.actionErr = false;
    clearTimeout(D.timer);
    D.gen++; D.inFlight = false; D.again = false;            /* refreshing pauses */
    draw();
    var sess = Session.current();
    Server.setStatus(D.order.orderNo, target, sess && sess.memberId).then(function (res) {
      if (!D.mounted) return;
      D.busy = false;
      if (res && res.order && (res.ok || res.order.status === target)) {
        /* Success — including a target the order already held (map §4 decision 20). */
        D.order = res.order;
        announceStatus(res.order);
      } else if (res && res.error === 'stale' && res.order) {
        refused(res.order);
      } else {
        D.actionErr = true;
      }
      draw();
      schedule();
    }, function () {
      if (!D.mounted) return;
      D.busy = false;
      D.actionErr = true;                                    /* C15; nothing assumed */
      draw();
      schedule();
    });
  }

  /* §5.7 rules 4–5: render the truth the server returned. */
  function refused(o) {
    if (o.status === 'Cancelled') D.banner = o.cancelledByGuest ? 'G' : 'H';
    else D.external = true;
    D.order = o;
    announceStatus(o);
  }

  function openSheet(id) {
    D.modal = true;
    clearTimeout(D.timer);
    D.gen++; D.inFlight = false; D.again = false;
    App.Modal.open(id, { order: D.order });
  }

  var tapAt = 0;
  function tapOk() {
    var now = Date.now();
    if (now - tapAt < 300) return false;
    tapAt = now;
    return true;
  }

  function goBoard() {
    if (!tapOk()) return;
    if (D.fromBoard) {
      try { history.back(); return; } catch (e) {}
    }
    App.replace('/board', { freshBoard: !App.state.lastBoard });
  }

  /* ------------------------------------------------------------------ *
   * Draw
   * ------------------------------------------------------------------ */
  function header() {
    return '<div class="s-top"><header class="s-header" data-el="S-02-S01">' +
             '<span class="s-header__side">' +
               '<button type="button" class="iconbtn" data-el="S-02-B01" aria-label="' + esc(t('st.back')) + '">' +
                 '<span class="iconbtn__glyph chev" aria-hidden="true">›</span></button>' +
             '</span>' +
             '<h1 class="s-header__title s-header__title--center" data-el="S-02-C01">' + t('s02.c01') + '</h1>' +
             '<span class="s-header__side"></span>' +
           '</header></div>';
  }

  function backButton() {
    return '<button type="button" class="btn btn--ghost s-back-btn" data-el="S-02-B04">' + t('s02.b04') + '</button>';
  }

  function payLines(o) {
    var pc = S.payCase(o);
    var total = money(o.total);
    var collect = '<p class="s-pay__collect">' + t('s02.c12.collect', { total: total }) + '</p>';
    if (pc.kind === 'card') {
      return '<p class="s-pay__line">' + t('s02.c12.card') + '</p>' + collect;
    }
    var third;
    if (pc.kind === 'cashMore') {
      third = t('s02.c12.more', {
        amount: money(pc.amount),
        change: money(pc.change)
      });
    } else if (pc.kind === 'cashEqual') {
      third = t('s02.c12.equal');
    } else {
      third = t('s02.c12.none');
    }
    return '<p class="s-pay__line">' + t('s02.c12.cash') + '</p>' + collect +
           '<p class="s-pay__line">' + third + '</p>';
  }

  /* The stored reason, never translated: of the two strings HotelDB keeps,
     the one in the interface language, else the other. Cut at 120 (§7.1). */
  function storedReason(o) {
    var ar = String(o.cancelReasonAr || ''), en = String(o.cancelReasonEn || '');
    var r = I18N.lang === 'en' ? (en || ar) : (ar || en);
    return r.length > 120 ? r.slice(0, 120) + '…' : r;
  }

  function cancelRecord(o) {
    var text;
    if (o.cancelledByGuest) {
      text = t('s02.c13.guest');
    } else {
      text = t('s02.c13.hotel', { name: esc(S.memberName(o.cancelledBy)), reason: esc(storedReason(o)) });
      text = text.replace(/:\s*$/, '');             /* no reason stored: no dangling colon */
    }
    return '<div class="s-sec s-record" data-el="S-02-C13">' +
             '<p class="s-record__label">' + t('st.status.Cancelled') + '</p>' +
             '<p class="s-record__text">' + text + '</p></div>';
  }

  function draw() {
    if (!D.mounted) return;
    var h = '<div class="s-screen s-order">' + header();
    var sess = Session.current();
    var expired = !sess || Session.expired(sess);
    D.expiredShown = expired;
    var bar = '';

    if (D.error) {
      h += '<main class="s-col"><div class="s-empty" data-el="S-02-C18">' +
             '<span class="s-icon-circle" aria-hidden="true">?</span>' +
             '<p class="s-empty__l1">' + t('s02.c18.l1') + '</p>' +
             '<p class="s-empty__l2">' + t('s02.c18.l2') + '</p>' +
             '<p class="s-empty__l3">' + t('s02.c18.l3') + '</p>' +
           '</div></main>';
      bar = backButton();
    } else if (!D.order) {
      h += '<main class="s-col s-detail" data-el="S-02-S02" aria-hidden="true">' +
             '<div class="s-skel s-skel--line"></div>' +
             '<div class="s-skel s-skel--head" style="margin-top:8px"></div>' +
             '<div class="s-skel s-skel--room" style="margin-top:16px"></div>' +
             '<div class="s-skel s-skel--row" style="margin-top:24px"></div>' +
             '<div class="s-skel s-skel--row" style="margin-top:8px"></div>' +
             '<div class="s-skel s-skel--row" style="margin-top:8px"></div>' +
           '</main>';
      bar = backButton();
    } else {
      var o = D.order, now = Date.now(), st = o.status;
      var qty = S.itemQty(o);
      h += '<main class="s-col s-detail" data-el="S-02-S02">';
      if (D.banner) {
        h += '<div class="s-banner" data-el="S-02-C02" role="alert">' +
               '<p class="s-banner__l1">' + t(D.banner === 'G' ? 's02.c02.g1' : 's02.c02.h1') + '</p>' +
               '<p class="s-banner__l2">' + t('s02.c02.l2') + '</p></div>';
      }
      if (D.external && st !== 'Cancelled') {
        h += '<p class="s-line s-line--boxed" data-el="S-02-C03" style="margin-bottom:16px">' + t('s02.c03') + '</p>';
      }
      h += '<div class="s-idline" data-el="S-02-C04"><span>' +
             t('st.orderno', { no: '<span class="num">' + esc(o.orderNo) + '</span>' }) + '</span>' +
             '<span>' + S.duration(now - (o.createdAt || now)) + '</span></div>';
      h += '<p class="s-status" data-el="S-02-C05" style="margin-top:8px">' + t('st.status.' + st) + '</p>';
      if (D.stale && !S.isFinalStatus(st)) {
        h += '<p class="s-line" data-el="S-02-C06" role="status" style="margin-top:8px">' + t('s02.c06') + '</p>';
      }
      h += '<div class="s-roomblock" data-el="S-02-C07" style="margin-top:16px" ' +
             'aria-label="' + esc(t('st.room') + ' ' + S.spaced(o.roomNumber)) + '">' +
             '<span class="s-roomblock__word" aria-hidden="true">' + t('st.room') + '</span>' +
             '<span class="s-roomno s-roomblock__no" aria-hidden="true">' + esc(o.roomNumber) + '</span></div>';

      /* Items — quantity first, names never truncated, no unit prices. */
      h += '<section class="s-sec" data-el="S-02-S03">' +
             '<h2 class="s-sec__title" data-el="S-02-C08">' + t('s02.c08', { count: S.countWord(qty) }) + '</h2><ul>';
      for (var i = 0; i < o.lines.length; i++) {
        var l = o.lines[i];
        h += '<li class="s-item" data-el="S-02-C09" aria-label="' +
               esc(t('s02.sr.item', { n: l.qty, name: S.lineName(l) })) + '">' +
               '<span class="s-item__qty" aria-hidden="true">' + t('s02.c09.qty', { n: esc(l.qty) }) + '</span>' +
               '<span class="s-item__name" aria-hidden="true">' + esc(S.lineName(l)) + '</span></li>';
      }
      h += '</ul><div class="s-items-total" data-el="S-02-C10"><span>' + S.countWord(qty) + '</span>' +
             '<span class="s-items-total__sum">' + money(o.total) + '</span></div></section>';

      if (S.hasNotes(o)) {
        h += '<section class="s-sec s-notes" data-el="S-02-C11">' +
               '<h2 class="s-sec__title" style="margin-bottom:4px">' + t('s02.c11') + '</h2>' +
               '<p class="s-notes__text">' + esc(o.notes) + '</p></section>';
      }

      h += '<section class="s-sec" data-el="S-02-C12"><h2 class="s-sec__title" style="margin-bottom:4px">' +
             t('s02.c12') + '</h2>' + payLines(o) + '</section>';

      if (st === 'Cancelled') h += cancelRecord(o);
      if (st === 'Delivered') h += '<p class="s-sec s-record" data-el="S-02-C14">' + t('s02.c14') + '</p>';

      if (!expired && S.isActiveStatus(st)) {
        h += '<button type="button" class="btn btn--ghost btn--block s-cancel" data-el="S-02-B03">' + t('s02.b03') + '</button>';
      }
      h += '</main>';

      /* S04 — exactly one button, or the session-expired bar. */
      if (expired) {
        bar = '<div class="s-expired" data-el="S-02-C17">' +
                '<div>' + t('s02.c17') + '</div>' +
                '<button type="button" class="btn" data-el="S-02-B05">' + t('st.signin.continue') + '</button></div>';
      } else if (S.isActiveStatus(st)) {
        if (D.actionErr) bar += '<p class="error" data-el="S-02-C15" role="alert">' + t('s02.c15') + '</p>';
        if (st === 'New') bar += '<p class="s-bar__consequence" data-el="S-02-C16">' + t('s02.c16') + '</p>';
        if (D.busy) {
          bar += '<button type="button" class="btn btn--primary s-primary" data-el="S-02-B02" disabled aria-disabled="true">' +
                   '<span class="s-primary__l1">' + t('st.sending') + '</span></button>';
        } else {
          var l2 = st === 'OnTheWay' ? t('s02.b02.opens') : t('st.after', { label: t('st.status.' + HotelDB.nextStatus(st)) });
          bar += '<button type="button" class="btn btn--primary s-primary" data-el="S-02-B02">' +
                   '<span class="s-primary__l1">' + t('s02.b02.' + st) + '</span>' +
                   '<span class="s-primary__l2">' + l2 + '</span></button>';
        }
      } else {
        bar = backButton();
      }
    }

    h += '<div class="s-bar" data-el="S-02-S04">' + bar + '</div></div>';
    var root = App.paint(h);
    var main = root.querySelector('.s-detail');
    var barEl = root.querySelector('.s-bar');
    if (main && barEl) main.style.paddingBottom = (barEl.offsetHeight + 16) + 'px';
    bind(root);
  }

  function bind(root) {
    root.querySelector('[data-el="S-02-B01"]').addEventListener('click', goBoard);
    var b04 = root.querySelector('[data-el="S-02-B04"]');
    if (b04) b04.addEventListener('click', goBoard);
    var b02 = root.querySelector('[data-el="S-02-B02"]');
    if (b02) b02.addEventListener('click', primary);
    var b03 = root.querySelector('[data-el="S-02-B03"]');
    if (b03) b03.addEventListener('click', function () {
      if (!tapOk() || D.modal || D.busy) return;
      openSheet('SM-01');
    });
    var b05 = root.querySelector('[data-el="S-02-B05"]');
    if (b05) b05.addEventListener('click', function () {
      if (!tapOk()) return;
      App.signIn({ view: 'S-02', orderNo: D.orderNo, order: D.order, fromBoard: D.fromBoard });
    });
  }

  /* ------------------------------------------------------------------ *
   * View contract
   * ------------------------------------------------------------------ */
  Views['S-02'] = {
    enter: function (params, ctx) {
      D = {
        mounted: true, orderNo: String(params.orderNo), order: null,
        fromBoard: !!ctx.fromBoard, error: false, stale: false, external: false,
        banner: null, busy: false, actionErr: false, modal: false,
        timer: null, inFlight: false, again: false, gen: 0
      };
      /* From a board card: drawn on the first frame from the board response,
         no skeleton (§3.1). By reload or direct URL: the loading state. */
      if (ctx.order && readable(ctx.order) && String(ctx.order.orderNo) === D.orderNo) D.order = ctx.order;
      window.scrollTo(0, 0);
      draw();
      if (isFinal()) return;               /* a finished order is read-only; nothing to refresh */
      request();
    },

    leave: function () {
      D.mounted = false;
      D.gen++;
      clearTimeout(D.timer);
    },

    draw: draw,

    onData: function () {
      if (!document.hidden) request();
    },

    onVisibility: function (visible) {
      if (visible) request();
    },

    /* SM-01 / SM-02 hand back exactly one of their outcomes (§5.8, §5.9). */
    onModalOutcome: function (id, outcome, order, variant) {
      D.modal = false;
      if (outcome === 'cancelled' || outcome === 'delivered') {
        D.order = order;
        announceStatus(order);
      } else if (outcome === 'refusedCancelled') {
        D.banner = variant === 'G' ? 'G' : 'H';
        D.order = order;
        announceStatus(order);
      } else if (outcome === 'refusedDelivered') {
        D.external = true;
        D.order = order;
        announceStatus(order);
      }
      draw();
      request();                           /* resumes with one immediate request */
    },

    tick: function (now) {
      if (!D.mounted) return;
      var sess = Session.current();
      var expired = !sess || Session.expired(sess);
      if (expired !== D.expiredShown) { D.expiredShown = expired; draw(); return; }
      if (!D.lastTick || now - D.lastTick >= 30000) {
        if (D.lastTick) draw();            /* elapsed time, every 30 s */
        D.lastTick = now;
      }
    }
  };
})();
