/* views-orders.js — G-05 Order submitted, G-06 Order tracking, G-07 My orders,
   M-02 Cancel order?

   Owner of this file only (app/CONTRACT.md, "Files and ownership").
   Every visible string is registered below in Arabic and English, copied verbatim
   from the elements tables of /spec/screens/G-05.md, G-06.md, G-07.md, M-02.md.
   There is no backend: the only server is the in-browser stub `Server` in
   store.js. Nothing here fetches. Plain ES5 browser JavaScript, one IIFE. */
(function () {
  'use strict';

  /* =====================================================================
     1. COPY — Arabic and English, verbatim from the specs' elements tables
     ===================================================================== */

  I18N.register({
    /* The five canonical status labels — CONTRACT "Status vocabulary",
       G-01 §5.2. Used by G-06's headline and timeline and G-07's pill. */
    'status.New':       { ar: 'جديد', en: 'New' },
    'status.Accepted':  { ar: 'تم القبول وجارٍ التحضير', en: 'Accepted & preparing' },
    'status.OnTheWay':  { ar: 'في الطريق', en: 'On the way' },
    'status.Delivered': { ar: 'تم التوصيل', en: 'Delivered' },
    'status.Cancelled': { ar: 'ملغى', en: 'Cancelled' },

    /* Back arrow accessible name — G-06 §4 B01, reused by G-05 and G-07. */
    'common.back': { ar: 'رجوع', en: 'Back' },
    /* "Today" in the date-time format — G-07 §5.6. */
    'common.today': { ar: 'اليوم', en: 'Today' },

    /* Item-count wording — G-01 §7.3, used by G-07-C07 and G-06-C12 row 1. */
    'count.1':    { ar: 'منتج واحد', en: '1 item' },
    'count.2':    { ar: 'منتجان', en: '2 items' },
    'count.3to10': { ar: '{n} منتجات', en: '{n} items' },
    'count.11up': { ar: '{n} منتجًا', en: '{n} items' },

    /* Payment line — G-05 §5.4, reused word for word by G-06-C13 (G-06 §4). */
    'pay.card':        { ar: 'الدفع عند الاستلام: بطاقة', en: 'Pay on delivery: Card' },
    'pay.cash':        { ar: 'الدفع عند الاستلام: نقدًا', en: 'Pay on delivery: Cash' },
    'pay.cashAmount':  { ar: 'الدفع عند الاستلام: نقدًا — ستدفع بـ {amount} ر.س',
                         en: 'Pay on delivery: Cash — you will pay with SAR {amount}' },

    /* ---------- G-05 Order submitted ---------- */
    'g05.c01': { ar: 'تم إرسال طلبك', en: 'Order submitted' },
    'g05.c03': { ar: 'سيُوصَّل طلبك إلى الغرفة', en: 'Your order will be delivered to room' },
    'g05.c09': { ar: 'طلبك السابق وصل إلى الفندق بالفعل ولم يتغيّر. الطلب المسجَّل هو للغرفة {room}. لتغييره، ألغِ الطلب من صفحة المتابعة ما دام الفندق لم يقبله بعد، ثم أرسل طلبًا جديدًا.',
                en: 'Your earlier order already reached the hotel and was not changed. The order on file is for room {room}. To change it, cancel it from the tracking page while the hotel has not accepted it yet, then place a new order.' },
    'g05.c05': { ar: 'هل هناك خطأ في الطلب — رقم الغرفة أو المنتجات أو طريقة الدفع؟ يمكنك إلغاء الطلب من صفحة المتابعة ما دام الفندق لم يقبله بعد، ثم إرسال طلب جديد.',
                en: 'Something wrong in the order — the room number, the items, or the payment method? You can cancel it from the tracking page while the hotel has not accepted it yet, then place a new order.' },
    'g05.c06': { ar: 'رقم الطلب', en: 'Order number' },
    'g05.c07': { ar: 'الإجمالي {total} ر.س', en: 'Total SAR {total}' },
    'g05.b02': { ar: 'متابعة الطلب', en: 'Track order' },
    'g05.b03': { ar: 'العودة إلى المتجر', en: 'Back to store' },

    /* ---------- G-06 Order tracking ---------- */
    'g06.c01': { ar: 'متابعة الطلب', en: 'Order tracking' },
    'g06.c02.l1': { ar: 'لم يُلغَ الطلب — قبِله الفندق قبل وصول طلب الإلغاء',
                    en: 'The order was not cancelled — the hotel accepted it before your cancellation arrived' },
    'g06.c02.l2': { ar: 'إذا كان في الطلب أي خطأ، اتصل بالاستقبال من هاتف الغرفة الآن.',
                    en: 'If anything in the order is wrong, call reception from your room phone now.' },
    'g06.c03': { ar: 'رقم الطلب', en: 'Order number' },
    'g06.c05': { ar: 'تعذّر تحديث الحالة — هذه آخر حالة معروفة',
                 en: 'Could not update the status — this is the last known status' },
    /* C06 changes tense with the status — G-06 §5.4, §9 item 8. */
    'g06.c06.active':    { ar: 'سيُوصَّل طلبك إلى الغرفة {room}', en: 'Your order will be delivered to room {room}' },
    'g06.c06.delivered': { ar: 'تم توصيل طلبك إلى الغرفة {room}', en: 'Your order was delivered to room {room}' },
    'g06.c06.cancelled': { ar: 'كان هذا الطلب للغرفة {room}', en: 'This order was for room {room}' },
    /* C16, the repair line, two variants only — G-06 §5.4a. */
    'g06.c16.a': { ar: 'هل هناك خطأ في هذا الطلب — رقم الغرفة أو المنتجات أو طريقة الدفع؟ ألغِ الطلب ما دام الفندق لم يقبله بعد، ثم أرسل طلبًا جديدًا.',
                   en: 'Something wrong in this order — the room number, the items, or the payment method? Cancel it while the hotel has not accepted it yet, then place a new order.' },
    'g06.c16.b': { ar: 'لم يعد بالإمكان إلغاء هذا الطلب من هاتفك بعد أن قبله الفندق. إذا كان فيه أي خطأ — رقم الغرفة أو المنتجات — اتصل بالاستقبال من هاتف الغرفة الآن.',
                   en: 'This order can no longer be cancelled from your phone now that the hotel has accepted it. If anything in it is wrong — the room number or the items — call reception from your room phone now.' },
    /* C08, the cancellation line, three variants — G-06 §5.3. */
    'g06.c08.guest':  { ar: 'ألغيتَ هذا الطلب', en: 'You cancelled this order' },
    'g06.c08.hotel':  { ar: 'ألغى الفندق هذا الطلب', en: 'The hotel cancelled this order' },
    'g06.c08.reason': { ar: 'ألغى الفندق هذا الطلب: {reason}', en: 'The hotel cancelled this order: {reason}' },
    'g06.c09': { ar: 'تفاصيل الطلب', en: 'Order details' },
    'g06.c10': { ar: 'وقت الطلب: {when}', en: 'Order time: {when}' },
    'g06.c11.total': { ar: '{v} ر.س', en: 'SAR {v}' },
    'g06.c12.items':      { ar: 'المنتجات', en: 'Items' },
    'g06.c12.total':      { ar: 'الإجمالي', en: 'Total' },
    'g06.c12.totalValue': { ar: '{total} ر.س', en: 'SAR {total}' },
    'g06.c14': { ar: 'ملاحظات الطلب', en: 'Order notes' },
    /* C15, the one error state — G-06 §6.3, three lines, not to be harmonised. */
    'g06.c15.l1': { ar: 'لم نعثر على هذا الطلب', en: 'We could not find this order' },
    'g06.c15.l2': { ar: 'قد يكون أُرسل من جهاز آخر، أو لم يعد موجودًا لدى الفندق',
                    en: "It may have been sent from another device, or it is no longer in the hotel's system" },
    'g06.c15.l3': { ar: 'للسؤال عنه، اتصل بالاستقبال من هاتف الغرفة',
                    en: 'To ask about it, call reception from your room phone' },
    'g06.b02': { ar: 'إلغاء الطلب', en: 'Cancel order' },
    'g06.b03': { ar: 'إعادة الطلب', en: 'Reorder' },
    'g06.b04': { ar: 'العودة إلى المتجر', en: 'Back to store' },
    /* Timeline row state, announced by a screen reader — G-06 §7.5. */
    'g06.step.done':   { ar: 'تم', en: 'Done' },
    'g06.step.now':    { ar: 'الآن', en: 'Now' },
    'g06.step.notyet': { ar: 'لم يبدأ بعد', en: 'Not yet' },

    /* ---------- G-07 My orders ---------- */
    'g07.c01': { ar: 'طلباتي', en: 'My orders' },
    'g07.c03': { ar: 'طلب رقم {n}', en: 'Order {n}' },
    'g07.c06': { ar: '{total} ر.س', en: 'SAR {total}' },
    'g07.c07': { ar: '{count} · الغرفة {room}', en: '{count} · Room {room}' },
    'g07.c08': { ar: 'يحتفظ هذا الجهاز بآخر 20 طلبًا؛ الطلبات الجارية لا تُحذف',
                 en: 'This device keeps your last 20 orders; orders in progress are never removed' },
    'g07.c09.l1': { ar: 'لا توجد طلبات على هذا الجهاز', en: 'No orders on this device' },
    'g07.c09.l2': { ar: 'تظهر هنا الطلبات المرسلة من هذا الجهاز فقط',
                    en: 'Only orders sent from this device appear here' },
    'g07.c09.l3': { ar: 'للسؤال عن طلب أرسلته من جهاز آخر، اتصل بالاستقبال من هاتف الغرفة',
                    en: 'To ask about an order sent from another device, call reception from your room phone' },
    'g07.b02': { ar: 'تصفح المتجر', en: 'Browse the store' },

    /* ---------- M-02 Cancel order? ---------- */
    'm02.c01': { ar: 'إلغاء الطلب؟', en: 'Cancel order?' },
    'm02.c02': { ar: 'سيُلغى طلبك رقم {n}، ولن يصل إلى غرفتك.',
                 en: 'Your order {n} will be cancelled and will not be brought to your room.' },
    'm02.c03': { ar: 'لا يمكن التراجع عن الإلغاء. بعد الإلغاء يمكنك إعادة منتجات هذا الطلب إلى سلتك بضغطة واحدة من زر «إعادة الطلب» في صفحة المتابعة.',
                 en: 'This cannot be undone. After cancelling, one tap on “Reorder” on the tracking page puts this order’s items back in your cart.' },
    'm02.c04.l1': { ar: 'لم نتلقَّ تأكيدًا بوصول طلب الإلغاء إلى الفندق. اعتبر أن طلبك ما زال قائمًا حتى تتغيّر حالته إلى «ملغى».',
                    en: 'We have not received confirmation that your cancellation reached the hotel. Treat your order as still active until its status changes to “Cancelled”.' },
    'm02.c04.l2': { ar: 'تحقّق من اتصالك بالإنترنت ثم اضغط «نعم، ألغِ الطلب» مرة أخرى. إعادة المحاولة آمنة: لا يمكن إلغاء الطلب مرتين.',
                    en: 'Check your internet connection, then tap “Yes, cancel” again. Trying again is safe: an order cannot be cancelled twice.' },
    'm02.c05': { ar: 'إذا استمرت المشكلة، اتصل بالاستقبال من هاتف الغرفة واذكر رقم الطلب {n}. قد يكون الفندق قد بدأ بتحضير طلبك.',
                 en: 'If this keeps failing, call reception from your room phone and give them order number {n}. The hotel may already have started preparing your order.' },
    'm02.b01':        { ar: 'نعم، ألغِ الطلب', en: 'Yes, cancel' },
    'm02.b01.flight': { ar: 'جارٍ الإلغاء…', en: 'Cancelling…' },
    'm02.b02':        { ar: 'لا، احتفظ بالطلب', en: 'No, keep my order' }
  });

  /* =====================================================================
     2. Small helpers
     ===================================================================== */

  /* Fixed copy carries no markup, so escaping the finished string is always
     safe and covers any value interpolated into it (CONTRACT "Element IDs"
     conventions; esc() comes from i18n.js). */
  function tx(key, vars) { return esc(t(key, vars)); }

  var FORWARD_STEPS = ['New', 'Accepted', 'OnTheWay', 'Delivered'];
  var ALL_STATUSES = ['New', 'Accepted', 'OnTheWay', 'Delivered', 'Cancelled'];

  function indexIn(list, value) {
    for (var i = 0; i < list.length; i++) if (list[i] === value) return i;
    return -1;
  }

  function isFinalStatus(s) { return s === 'Delivered' || s === 'Cancelled'; }
  function isActiveStatus(s) { return s === 'New' || s === 'Accepted' || s === 'OnTheWay'; }

  /* Two decimals, half up — G-01 §7.2. The currency label lives inside the
     registered copy, so only the number is formatted here. */
  function amt(v) {
    var n = Math.round((Number(v) + Number.EPSILON) * 100) / 100;
    if (!isFinite(n)) n = 0;
    return n.toFixed(2);
  }

  function orders() {
    return (window.Store && Store.orders) ? Store.orders : [];
  }

  function findOrder(orderNo) {
    if (orderNo == null) return null;
    if (window.Store && typeof Store.getOrder === 'function') return Store.getOrder(orderNo);
    var list = orders();
    for (var i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].orderNo) === String(orderNo)) return list[i];
    }
    return null;
  }

  /* A record missing any required field, or carrying a status outside the five
     canonical values, is unreadable — G-06 §6.2, G-07 §6.3 case 2. */
  function readable(o) {
    if (!o) return false;
    if (o.orderNo == null || o.roomNumber == null) return false;
    if (o.total == null || o.createdAt == null) return false;
    if (!o.lines || !o.lines.length) return false;
    return indexIn(ALL_STATUSES, o.status) >= 0;
  }

  /* This module owns no storage. It mutates the record it was given and asks
     store.js to persist through whichever writer that module exposes.
     G-06 §5.0 limits G-06's writes to: the live status, the point of
     cancellation, and the "cancelled by the guest on this device" flag. */
  function writeOrder(order, patch) {
    if (!order) return;
    if (window.Store && typeof Store.updateOrder === 'function') {
      Store.updateOrder(order.orderNo, patch);
      return;
    }
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) order[k] = patch[k];
    }
  }

  function two(n) { return (n < 10 ? '0' : '') + n; }

  /* "اليوم HH:MM / Today HH:MM" on the device's current local date, otherwise
     "DD/MM/YYYY HH:MM"; 24-hour, Western digits — G-07 §5.6, §7.2; G-06 §7.1. */
  function whenText(createdAt) {
    var d = (createdAt instanceof Date) ? createdAt : new Date(createdAt);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var sameDay = d.getFullYear() === now.getFullYear() &&
                  d.getMonth() === now.getMonth() &&
                  d.getDate() === now.getDate();
    var time = two(d.getHours()) + ':' + two(d.getMinutes());
    var datePart = sameDay
      ? t('common.today')
      : (two(d.getDate()) + '/' + two(d.getMonth() + 1) + '/' + d.getFullYear());
    return datePart + ' ' + time;
  }

  function itemCount(order) {
    var n = 0;
    for (var i = 0; i < order.lines.length; i++) n += Number(order.lines[i].qty) || 0;
    return n;
  }

  /* Exact wording of G-01 §7.3. */
  function countWording(n) {
    if (n === 1) return t('count.1');
    if (n === 2) return t('count.2');
    if (n >= 3 && n <= 10) return t('count.3to10', { n: n });
    return t('count.11up', { n: n });
  }

  function productName(line) {
    if (I18N.lang === 'ar') return line.nameAr || line.nameEn || '';
    return line.nameEn || line.nameAr || '';   /* G-01 §5.4 fallback rule */
  }

  /* The three payment variants — G-05 §5.4; a record carrying "card" with an
     amount shows the Card variant and ignores the amount (G-05 §9 item 12). */
  function paymentLine(order) {
    if (order.payment === 'cash') {
      if (order.amount != null && order.amount !== '') {
        return tx('pay.cashAmount', { amount: amt(order.amount) });
      }
      return tx('pay.cash');
    }
    return tx('pay.card');
  }

  /* The sticky header of every screen here: the back chevron at the start edge,
     the title centred, the end edge deliberately empty — no language toggle and
     no "My orders" (G-05 §5.1, G-06 §5.1, G-07 §5.1). `.chev` is the one glyph
     the stylesheet mirrors physically for English. */
  function topbar(sectionEl, backEl, title) {
    return '<header class="topbar" data-el="' + sectionEl + '">' +
             '<div class="topbar__side">' +
               '<button type="button" class="iconbtn" data-el="' + backEl + '" data-oact="back" ' +
               'aria-label="' + tx('common.back') + '">' +
                 '<span class="iconbtn__glyph chev" aria-hidden="true">›</span>' +
               '</button>' +
             '</div>' +
             '<div class="topbar__main">' + (title || '') + '</div>' +
             '<div class="topbar__side topbar__side--end"></div>' +
           '</header>';
  }

  /* The router reuses the one #app element for every screen, so each view binds
     its delegated listener exactly once and then checks which screen is on
     display before acting. Without both halves the listeners would pile up and
     a tap on one screen would be handled by another's rules. */
  function bindOnce(root, flag, screen, type, handler) {
    if (root[flag]) return;
    root[flag] = true;
    root.addEventListener(type, function (e) {
      if (root.getAttribute('data-screen') !== screen) return;
      handler(e);
    });
  }

  /* One tap acts once — G-05 §4 B02/B03, G-06 §7.3, G-07 §7.4 (300 ms floor). */
  var tapBusy = false;
  function onceTap(fn) {
    if (tapBusy) return;
    tapBusy = true;
    setTimeout(function () { tapBusy = false; }, 300);
    fn();
  }

  /* A promise with a hard per-attempt cap. G-06 polls at 10 s (§5.5 rule 3),
     M-02 cancels at 15 s (M-02 §7.3). */
  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject({ type: 'timeout' });
      }, ms);
      promise.then(function (v) {
        if (settled) return;
        settled = true; clearTimeout(timer); resolve(v);
      }, function (e) {
        if (settled) return;
        settled = true; clearTimeout(timer); reject(e);
      });
    });
  }

  /* =====================================================================
     3. G-05 — Order submitted
     ===================================================================== */

  var g05Order = null;    /* the record the mounted G-05 is showing */

  Views['G-05'] = {
    render: function (params) {
      var order = findOrder(params.orderNo);
      /* No record for the number in the URL → G-01, silently (G-05 §3.3). */
      if (!readable(order)) return '';

      var h = '';
      h += '<section class="screen screen--g05">';

      /* S01 — header: the back arrow only; the title is in the body, under the
         success mark, because the title is the message (§5.1). */
      h += topbar('G-05-S01', 'G-05-B01', '');

      h += '<div class="screen__body stack" data-el="G-05-S02">';

      /* C02 success mark, C01 title, C03 label, C04 room number (§5.2). */
      h += '<p class="empty__glyph center" data-el="G-05-C02" aria-hidden="true">✓</p>';
      h += '<h1 class="headline center" data-el="G-05-C01">' + tx('g05.c01') + '</h1>';
      h += '<p class="center" data-el="G-05-C03">' + tx('g05.c03') + '</p>';
      /* The room number in its own bordered box, the largest text on the
         screen, shown exactly as saved with any leading zero (§5.2, §7.2). */
      h += '<div class="panel center" data-el="G-05-C04">' +
             '<span class="num num--room">' + esc(order.roomNumber) + '</span>' +
           '</div>';

      /* C09 — the already-existing notice, shown only for a response of kind
         `existing-different` (§5.2). M-01/M-03 mark that on the saved record as
         `alreadyExisting`, so the notice survives a reload; the spec's §9 item
         14 expected a hand-off that did not. Persistent, no close control,
         never a toast; `.notice` carries its own "!" icon slot, so none is
         written here. */
      if (order.alreadyExisting) {
        h += '<p class="notice" data-el="G-05-C09">' + tx('g05.c09', { room: order.roomNumber }) + '</p>';
      }

      /* C05 — the repair sentence: any mistake in the order, not the room
         number alone (§5.2, §9 item 2). Suppressed once the status is past New,
         with nothing substituted (§5.2, criterion 26). */
      if (order.status === 'New') {
        h += '<p class="small center" data-el="G-05-C05">' + tx('g05.c05') + '</p>';
      }

      h += '<p class="small center" data-el="G-05-C06">' +
             tx('g05.c06') + ' <span class="num num--order">' + esc(order.orderNo) + '</span></p>';
      h += '<p class="center bold" data-el="G-05-C07">' + tx('g05.c07', { total: amt(order.total) }) + '</p>';
      h += '<p class="small center" data-el="G-05-C08">' + paymentLine(order) + '</p>';

      /* S03 — B02 primary, then B03, 12 px apart (§4 layout order). */
      h += '<div class="stack" data-el="G-05-S03">';
      h += '<button type="button" class="btn btn--primary btn--block btn--tall" data-el="G-05-B02" data-oact="track">' + tx('g05.b02') + '</button>';
      h += '<button type="button" class="btn btn--ghost btn--block btn--tall" data-el="G-05-B03" data-oact="store">' + tx('g05.b03') + '</button>';
      h += '</div>';

      h += '</div></section>';
      return h;
    },

    mount: function (root, params) {
      var order = findOrder(params.orderNo);
      if (!readable(order)) { App.replace('/store'); return; }   /* §3.3 */
      g05Order = order;

      bindOnce(root, '__g05Bound', 'G-05', 'click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-oact]') : null;
        if (!btn || !g05Order) return;
        var act = btn.getAttribute('data-oact');
        if (act === 'track') {
          /* "Track order" REPLACES G-05 in the history (§3.3, §9 item 7). */
          onceTap(function () { g06SetOpener('G-05'); App.replace('/order/' + g05Order.orderNo); });
        } else if (act === 'store' || act === 'back') {
          /* B01, B03 and the browser back gesture are one action (§9 item 9). */
          onceTap(function () { App.replace('/store'); });
        }
      });
    }
  };

  /* =====================================================================
     4. G-06 — Order tracking
     ===================================================================== */

  /* Everything here is transient screen memory, not record data:
     - banner  : C02, held for this visit only (§5.6 rule 5)
     - stale   : C05, whether the most recent status attempt failed (§5.5 rule 7)
     - notFound: the error state of §6.3
     - gen     : bumped on every entry so a late response cannot paint an old view */
  /* A navigation counter, bumped on every hash change, so mount() can tell a
     fresh ENTRY (which clears C02, C05 and the error state — §5.6 rule 5) from
     a re-render caused by a status write or a language switch. */
  var navSeq = 0;

  var g06 = {
    orderNo: null,
    seenNav: -1,
    opener: null,
    banner: false,
    stale: false,
    notFound: false,
    gen: 0,
    timer: null,
    inFlight: false,
    modalOpen: false
  };

  /* The opener is announced by the screen that navigates here and is cleared on
     arrival, so an entry nobody announced (a reload, a direct URL, G-01's
     banner) never inherits an older screen's back destination (§3.1). */
  var pendingOpener = null;
  function g06SetOpener(id) { pendingOpener = id; }

  function g06Reset(orderNo) {
    g06.orderNo = String(orderNo);
    g06.opener = pendingOpener;
    pendingOpener = null;
    g06.banner = false;
    g06.stale = false;
    g06.notFound = false;
    g06.modalOpen = false;
    g06.gen++;
  }

  /* ---- polling (§5.5): one request on open, then every 20 s, paused while the
     tab is hidden or M-02 is open, stopped for good at Delivered/Cancelled and
     in the error state. The interval is always cleared on unmount and on any
     route change, so no timer outlives the screen. ---- */

  function stopPolling() {
    if (g06.timer) { clearInterval(g06.timer); g06.timer = null; }
  }

  function startPolling(orderNo) {
    var order = findOrder(orderNo);
    if (!order || g06.notFound) { stopPolling(); return; }
    if (isFinalStatus(order.status)) { stopPolling(); return; }   /* rule 4 */
    if (g06.timer) return;                                        /* already running */
    pollOnce();                                                   /* rule 1 */
    g06.timer = setInterval(pollTick, 20000);                     /* rule 2 */
  }

  function restartCadence() {
    stopPolling();
    var order = findOrder(g06.orderNo);
    if (!order || g06.notFound || isFinalStatus(order.status)) return;
    pollOnce();
    g06.timer = setInterval(pollTick, 20000);
  }

  function pollTick() {
    if (g06.notFound) { stopPolling(); return; }
    if (document.hidden) return;        /* rule 5 — paused while the tab is hidden */
    if (g06.modalOpen) return;          /* rule 5 — paused while M-02 is open */
    if (g06.inFlight) return;           /* rule 2 — never two in flight at once */
    pollOnce();
  }

  function pollOnce() {
    var no = g06.orderNo, gen = g06.gen;
    if (!window.Server || typeof Server.getStatus !== 'function') return;
    g06.inFlight = true;
    withTimeout(Server.getStatus(no), 10000).then(function (res) {   /* rule 3 */
      g06.inFlight = false;
      applyStatus(no, res, gen);
    }, function (err) {
      g06.inFlight = false;
      if (gen !== g06.gen) return;                       /* late: not for this view */
      if (err && err.type === 'orderNotFound') { enterNotFound(); return; }  /* rule 8 */
      g06.stale = true;                                  /* rule 7 → C05 */
      repaint06();
    });
  }

  /* A response that arrives after its 10-second cap is discarded for the screen,
     but the status it carries is still written into the record (§5.5 rule 3). */
  function applyStatus(orderNo, res, gen) {
    var status = (res && typeof res === 'object') ? res.status : res;
    if (indexIn(ALL_STATUSES, status) < 0) {
      if (gen === g06.gen) { g06.stale = true; repaint06(); }
      return;
    }
    var order = findOrder(orderNo);
    if (!order) return;

    var patch = { status: status };
    if (status === 'Cancelled') {
      /* The point of cancellation (`cancelledFrom` in the record): the server's
         value when it sends one, otherwise the last non-cancelled status the
         record held. Written once and never changed again (§5.3). */
      if (!order.cancelledFrom) {
        var point = (res && typeof res === 'object' && (res.lastReached || res.cancelledFrom)) || null;
        if (indexIn(FORWARD_STEPS, point) < 0) {
          point = (order.status && order.status !== 'Cancelled') ? order.status : 'New';
        }
        patch.cancelledFrom = point;
      }
      var reason = (res && typeof res === 'object') ? res.reason : null;
      if (reason != null) patch.cancelReason = reason;
    }
    writeOrder(order, patch);

    /* A late answer still updates the device's own data, but it may not touch
       the screen — or the timer — of a view that has moved on (§5.5 rule 3). */
    if (gen !== g06.gen) return;
    if (isFinalStatus(status)) stopPolling();          /* rule 4 */
    g06.stale = false;
    repaint06();
  }

  function enterNotFound() {
    g06.notFound = true;
    stopPolling();
    repaint06();
  }

  /* Repaint in place: the router's render() scrolls to the top, which §6.4
     forbids on a status update, so G-06 redraws its own screen and keeps the
     guest's scroll position. */
  function repaint06() {
    var root = document.getElementById('app');
    if (!root || root.getAttribute('data-screen') !== 'G-06') return;
    var y = window.pageYOffset;
    root.innerHTML = Views['G-06'].render({ orderNo: g06.orderNo });
    bind06(root);
    window.scrollTo(0, y);
  }

  function roomLineKey(status) {
    if (status === 'Delivered') return 'g06.c06.delivered';
    if (status === 'Cancelled') return 'g06.c06.cancelled';
    return 'g06.c06.active';           /* New, Accepted, OnTheWay — §5.4 */
  }

  /* The timeline — §5.3. Cancelled is NOT a fifth forward step: the steps up to
     the point of cancellation render as reached, then one terminal Cancelled
     row, and the steps after it are not rendered at all. */
  function timelineHtml(order) {
    var rows = [];
    var i;
    if (order.status !== 'Cancelled') {
      var current = indexIn(FORWARD_STEPS, order.status);
      if (current < 0) current = 0;
      for (i = 0; i < FORWARD_STEPS.length; i++) {
        rows.push({ key: FORWARD_STEPS[i],
                    state: i < current ? 'reached' : (i === current ? 'current' : 'next') });
      }
    } else {
      var p = indexIn(FORWARD_STEPS, order.cancelledFrom);
      if (p < 0) p = 0;                                  /* every record starts at New */
      for (i = 0; i <= p; i++) rows.push({ key: FORWARD_STEPS[i], state: 'reached' });
      /* The terminal row. Nothing is pushed after it — the steps that were
         never reached are not drawn at all (§5.3). */
      rows.push({ key: 'Cancelled', state: 'end' });
    }

    /* C08 — who cancelled, and why; the secondary line of the Cancelled row
       and nowhere else (§5.3). */
    var note = '';
    if (order.status === 'Cancelled') {
      var line;
      if (order.cancelledByGuest) {
        line = tx('g06.c08.guest');
      } else {
        var reason = order.cancelReason == null ? '' : String(order.cancelReason);
        if (reason.replace(/\s/g, '') === '') {
          line = tx('g06.c08.hotel');
        } else {
          if (reason.length > 120) reason = reason.slice(0, 120) + '…';   /* 120-char bound */
          line = tx('g06.c08.reason', { reason: reason });
        }
      }
      note = '<span class="timeline__note" data-el="G-06-C08">' + line + '</span>';
    }

    var h = '<ol class="timeline" data-el="G-06-S03">';
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      var srKey = r.state === 'next' ? 'g06.step.notyet'
                : (r.state === 'reached' ? 'g06.step.done' : 'g06.step.now');
      /* The marker is drawn by CSS from the row modifier; no glyph is written
         here, or the row would carry two. */
      h += '<li class="timeline__row timeline__row--' + r.state + '" data-el="G-06-C07">' +
             '<span class="timeline__marker" aria-hidden="true"></span>' +
             '<span class="timeline__label">' + tx('status.' + r.key) + '</span>' +
             '<span class="sr-only"> — ' + tx(srKey) + '</span>' +
             (r.state === 'end' ? note : '') +
           '</li>';
    }
    h += '</ol>';
    return h;
  }

  /* S05 — the fixed action bar; its contents are decided by the status alone
     (§5.8). B02 and B04 are outlined, B03 is the only filled button. */
  function actionBarHtml(order) {
    var h = '<div class="actionbar" data-el="G-06-S05"><div class="actionbar__row">';
    if (order && !g06.notFound) {
      /* Cancel only while the status is New — locked decision 6, §5.8. */
      if (order.status === 'New') {
        h += '<button type="button" class="btn btn--ghost btn--tall" data-el="G-06-B02" data-oact="cancel">' + tx('g06.b02') + '</button>';
      }
      /* Reorder only on a finished order — §5.8. */
      if (order.status === 'Delivered' || order.status === 'Cancelled') {
        h += '<button type="button" class="btn btn--primary btn--tall" data-el="G-06-B03" data-oact="reorder">' + tx('g06.b03') + '</button>';
      }
    }
    h += '<button type="button" class="btn btn--ghost btn--tall" data-el="G-06-B04" data-oact="store">' + tx('g06.b04') + '</button>';
    h += '</div></div>';
    return h;
  }

  Views['G-06'] = {
    render: function (params) {
      var order = findOrder(params.orderNo);
      var h = '<section class="screen screen--g06">';

      h += topbar('G-06-S01', 'G-06-B01',
             '<h1 class="topbar__title" data-el="G-06-C01">' + tx('g06.c01') + '</h1>');

      /* Error state — §6.3. Four triggers, one wording, body not rendered. */
      if (!readable(order) || g06.notFound) {
        h += '<div class="screen__body" data-el="G-06-S02">';
        h += '<div class="empty" data-el="G-06-C15">' +
               '<div class="empty__glyph" aria-hidden="true">?</div>' +
               '<p class="empty__title">' + tx('g06.c15.l1') + '</p>' +
               '<p class="empty__text">' + tx('g06.c15.l2') + '</p>' +
               '<p class="empty__text">' + tx('g06.c15.l3') + '</p>' +
             '</div>';
        h += '</div>';
        h += actionBarHtml(null);
        h += '</section>';
        return h;
      }

      h += '<div class="screen__body stack" data-el="G-06-S02">';

      /* C02 — the already-accepted banner, this visit only (§5.6 rule 5).
         Two lines, no close control, no icon and no link (§4), so it is a plain
         bordered block and never the `.notice` with its "!" slot. */
      if (g06.banner) {
        h += '<div class="panel" data-el="G-06-C02">' +
               '<p class="small bold">' + tx('g06.c02.l1') + '</p>' +
               '<p class="small">' + tx('g06.c02.l2') + '</p>' +
             '</div>';
      }

      h += '<p class="small start" data-el="G-06-C03">' +
             tx('g06.c03') + ' <span class="num num--order">' + esc(order.orderNo) + '</span></p>';

      h += '<h2 class="headline start" data-el="G-06-C04">' + tx('status.' + order.status) + '</h2>';

      /* C05 — stale status; never while the status is final (§4, §5.5 rule 7). */
      if (g06.stale && !isFinalStatus(order.status)) {
        h += '<p class="small muted start" data-el="G-06-C05">' + tx('g06.c05') + '</p>';
      }

      /* C06 — the room line, its own line, the largest text on the screen, its
         tense following the status (§5.4, §9 item 8). */
      h += '<p class="start" data-el="G-06-C06">' +
             tx(roomLineKey(order.status), { room: order.roomNumber }).replace(
               esc(order.roomNumber),
               '<span class="num num--room">' + esc(order.roomNumber) + '</span>') +
           '</p>';

      /* C16 — the repair line. Variant A while New, variant B once accepted;
         not rendered on Delivered, on Cancelled, in the error state, or while
         C02 is shown (§5.4a). It is a line of copy: no icon, no fill, no
         border, not tappable (§4), so it carries no `.notice` box. */
      if (!g06.banner) {
        if (order.status === 'New') {
          h += '<p class="small start" data-el="G-06-C16">' + tx('g06.c16.a') + '</p>';
        } else if (order.status === 'Accepted' || order.status === 'OnTheWay') {
          h += '<p class="small start" data-el="G-06-C16">' + tx('g06.c16.b') + '</p>';
        }
      }

      h += timelineHtml(order);

      /* S04 — order details: exactly seven things (§9 item 6). */
      h += '<div class="panel" data-el="G-06-S04">';
      h += '<h3 class="panel__title" data-el="G-06-C09">' + tx('g06.c09') + '</h3>';
      h += '<p class="small" data-el="G-06-C10">' + tx('g06.c10', { when: whenText(order.createdAt) }) + '</p>';
      for (var i = 0; i < order.lines.length; i++) {
        var l = order.lines[i];
        var lineTotal = (Number(l.qty) || 0) * (Number(l.price) || 0);
        h += '<div class="line" data-el="G-06-C11">' +
               '<span class="line__qty">' + esc(l.qty) + ' ×</span>' +
               '<span class="line__name">' + esc(productName(l)) + '</span>' +
               '<span class="line__price">' + tx('g06.c11.total', { v: amt(lineTotal) }) + '</span>' +
             '</div>';
      }
      h += '<div data-el="G-06-C12">' +
             '<p class="row row--split small"><span>' + tx('g06.c12.items') + '</span>' +
             '<span>' + esc(itemCount(order)) + '</span></p>' +
             '<p class="total"><span class="total__label">' + tx('g06.c12.total') + '</span>' +
             '<span class="total__value">' + tx('g06.c12.totalValue', { total: amt(order.total) }) + '</span></p>' +
           '</div>';
      h += '<p class="small" data-el="G-06-C13">' + paymentLine(order) + '</p>';
      var notes = order.notes == null ? '' : String(order.notes);
      if (notes.replace(/\s/g, '') !== '') {
        h += '<div data-el="G-06-C14">' +
               '<p class="small bold">' + tx('g06.c14') + '</p>' +
               '<p class="small">' + esc(notes) + '</p>' +
             '</div>';
      }
      h += '</div>';   /* S04 */

      h += '</div>';   /* S02 */
      h += actionBarHtml(order);
      h += '</section>';
      return h;
    },

    mount: function (root, params) {
      /* Every entry starts clean: the banner does not survive leaving the
         screen and coming back (§5.6 rule 5), and neither does the stale line
         or the error state. */
      if (g06.orderNo !== String(params.orderNo) || g06.seenNav !== navSeq) {
        g06Reset(params.orderNo);
        g06.seenNav = navSeq;
      }
      bind06(root);
      startPolling(g06.orderNo);
    },

    /* Called by the route-change guard below; also safe to call by hand. */
    unmount: function () { stopPolling(); g06.gen++; }
  };

  function bind06(root) {
    bindOnce(root, '__g06Bound', 'G-06', 'click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-oact]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-oact');
      var order = findOrder(g06.orderNo);

      if (act === 'back') {
        /* B01 retraces the guest's path: G-07 when G-07 opened this screen,
           G-01 otherwise (§3.2). */
        onceTap(function () {
          stopPolling(); g06.gen++;
          if (g06.opener === 'G-07') App.back('/orders');
          else App.back('/store');
        });
      } else if (act === 'store') {
        /* B04 always lands on the store with the history reset (§3.2). */
        onceTap(function () { stopPolling(); g06.gen++; App.replace('/store'); });
      } else if (act === 'cancel') {
        /* G-06 cancels nothing itself; it hands M-02 the order number and the
           current status, and waits for one of four outcomes (§5.6 rule 1). */
        onceTap(function () {
          if (!order || order.status !== 'New') return;
          g06.modalOpen = true;                     /* polling pauses (§5.5 rule 5) */
          App.openModal('M-02', { orderNo: order.orderNo, status: order.status });
        });
      } else if (act === 'reorder') {
        onceTap(function () { if (order) handoffReorder(order); });
      }
    });
  }

  /* Reorder — §5.7. G-06 hands G-03 (product identifier, quantity) pairs in the
     record's stored order and touches nothing else: not the cart, not
     availability, not the max-10 cap, no toast. */
  function handoffReorder(order) {
    var pairs = [];
    for (var i = 0; i < order.lines.length; i++) {
      pairs.push({ productId: order.lines[i].productId, qty: Number(order.lines[i].qty) || 0 });
    }
    stopPolling(); g06.gen++;
    /* G-03 owns the merge, the single availability check, the max-10 cap and
       the toast, and it navigates itself (views-shop.js `startReorder`). */
    if (Views['G-03'] && typeof Views['G-03'].startReorder === 'function') {
      Views['G-03'].startReorder(pairs, '/order/' + order.orderNo);
    } else {
      window.PendingReorder = pairs;      /* the shared field G-03 also reads */
      App.go('/cart');
    }
  }

  /* ---- The four outcomes M-02 hands back (§5.6 rule 2) ---- */

  function g06Cancelled(orderNo) {
    var order = findOrder(orderNo);
    g06.modalOpen = false;
    if (order) {
      var point = (order.status && order.status !== 'Cancelled') ? order.status : 'New';
      writeOrder(order, {
        status: 'Cancelled',
        cancelledFrom: order.cancelledFrom || point,
        cancelledByGuest: true
      });
    }
    stopPolling();                 /* final status — §5.5 rule 4 */
    repaint06();
  }

  function g06AlreadyAccepted(orderNo, status) {
    var order = findOrder(orderNo);
    g06.modalOpen = false;
    g06.banner = true;             /* C02, this visit only */
    if (order) {
      /* The real status travels on `Server.lastCancelStatus`; when it is
         missing the outcome itself still says the hotel accepted, so the record
         moves to Accepted and the immediate poll below refines it. */
      var real = status;
      if (indexIn(ALL_STATUSES, real) < 0 && window.Server) real = Server.lastCancelStatus;
      if (indexIn(ALL_STATUSES, real) < 0) real = 'Accepted';
      writeOrder(order, { status: real });
    }
    repaint06();
    restartCadence();              /* one immediate request, cadence restarts */
  }

  function g06OrderNotFound() {
    g06.modalOpen = false;
    enterNotFound();               /* directly, not via a resumed poll (§6.3) */
  }

  function g06KeepOrder() {
    /* Nothing is reported: the unchanged screen is the report (§5.6 rule 3). */
    g06.modalOpen = false;
    m02Reset();
    restartCadence();
  }

  /* ---- timer lifetime ----
     The router has no unmount hook, so the interval is cleared here on every
     route change. This module's listener is registered before app.js's, so the
     timer is stopped first and G-06's own mount() starts a fresh one when the
     new route is G-06 again. */
  window.addEventListener('hashchange', function () {
    /* The router ignores a navigation made while a modal is busy, so this must
       ignore it too, or the screen underneath would lose its poll while the
       cancellation is still in flight. */
    var host = document.getElementById('modal-root');
    var top = host && host.lastElementChild;
    if (top && top.classList.contains('is-busy')) return;
    navSeq++;
    stopPolling();
    g06.gen++;
    g06.modalOpen = false;
    m02Reset();
  });

  /* Polling pauses while the tab is hidden and sends one immediate request on
     return, restarting the cadence — §5.5 rule 5. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (!g06.timer) return;
    if (g06.modalOpen || g06.notFound) return;
    restartCadence();
  });

  /* =====================================================================
     5. G-07 — My orders
     ===================================================================== */

  var g07Gen = 0;

  /* A tap anywhere in a row opens G-06 for that order; back from there returns
     to this list (§3.2, §7.4). */
  function openRow(row) {
    onceTap(function () {
      g06SetOpener('G-07');
      App.go('/order/' + row.getAttribute('data-order'));
    });
  }

  function readableOrders() {
    var list = orders(), out = [], i;
    for (i = 0; i < list.length; i++) if (readable(list[i])) out.push(list[i]);
    /* Newest first by order time, tie-break by order number, higher first
       (§5.4). Unreadable records are skipped, never deleted (§6.3 case 2). */
    out.sort(function (a, b) {
      var ta = new Date(a.createdAt).getTime(), tb = new Date(b.createdAt).getTime();
      if (tb !== ta) return tb - ta;
      return String(b.orderNo) > String(a.orderNo) ? 1 : -1;
    });
    return out;
  }

  Views['G-07'] = {
    render: function () {
      /* The trim runs on entry, before the first frame, and never removes an
         order that is still New, Accepted or OnTheWay (§3.1, §5.4). */
      if (window.Store && typeof Store.trimOrders === 'function') Store.trimOrders();

      var list = readableOrders();
      var h = '<section class="screen screen--g07">';
      h += topbar('G-07-S01', 'G-07-B01',
             '<h1 class="topbar__title" data-el="G-07-C01">' + tx('g07.c01') + '</h1>');

      /* Empty state — §6.2. Three lines and one control. */
      if (!list.length) {
        h += '<div class="screen__body">';
        h += '<div class="empty">' +
               '<div class="empty__glyph" aria-hidden="true">▤</div>' +
               '<div data-el="G-07-C09">' +
                 '<p class="empty__title">' + tx('g07.c09.l1') + '</p>' +
                 '<p class="empty__text">' + tx('g07.c09.l2') + '</p>' +
                 '<p class="empty__text">' + tx('g07.c09.l3') + '</p>' +
               '</div>' +
               '<button type="button" class="btn btn--ghost" data-el="G-07-B02" data-oact="store">' + tx('g07.b02') + '</button>' +
             '</div>';
        h += '</div></section>';
        return h;
      }

      h += '<div class="screen__body stack" data-el="G-07-S02">';
      for (var i = 0; i < list.length; i++) {
        var o = list[i];
        /* The pill: filled for the three active statuses, outlined for the two
           finished ones (§5.3); the status is also on the element so the
           stylesheet can key off it without a second class. */
        var pill = isActiveStatus(o.status) ? 'badge--status' : '';
        /* The whole row is one tap target, with no chevron and no control
           inside it (§5.2, §7.4). Three lines, six values, nothing else. */
        h += '<div class="panel order-row tap" data-el="G-07-C02" data-order="' + esc(o.orderNo) + '" ' +
             'role="button" tabindex="0">';
        h += '<p class="row row--split">' +
               '<span class="bold" data-el="G-07-C03">' + tx('g07.c03', { n: o.orderNo }) + '</span>' +
               '<span class="badge ' + pill + '" data-status="' + esc(o.status) + '" data-el="G-07-C04">' +
                 tx('status.' + o.status) + '</span>' +
             '</p>';
        h += '<p class="row row--split small">' +
               '<span class="num" data-el="G-07-C05">' + esc(whenText(o.createdAt)) + '</span>' +
               '<span class="bold" data-el="G-07-C06">' + tx('g07.c06', { total: amt(o.total) }) + '</span>' +
             '</p>';
        h += '<p class="small" data-el="G-07-C07">' +
               tx('g07.c07', { count: countWording(itemCount(o)), room: o.roomNumber }) +
             '</p>';
        h += '</div>';
        /* No Reorder and no Cancel on a row — §5.8; the row itself is the only
           tap target, with no chevron (§5.2). */
      }
      /* C08 — the cap note, only from 20 rows (§5.4, §9 item 4). */
      if (list.length >= 20) {
        h += '<p class="small muted center" data-el="G-07-C08">' + tx('g07.c08') + '</p>';
      }
      h += '</div></section>';
      return h;
    },

    mount: function (root) {
      var gen = ++g07Gen;

      bindOnce(root, '__g07Bound', 'G-07', 'click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-oact]') : null;
        if (btn && btn.getAttribute('data-oact') === 'store') {
          onceTap(function () { App.replace('/store'); });   /* B02 resets the history */
          return;
        }
        if (btn && btn.getAttribute('data-oact') === 'back') {
          onceTap(function () { App.back('/store'); });      /* B01 → G-01 */
          return;
        }
        var row = e.target.closest ? e.target.closest('.order-row') : null;
        if (!row) return;
        openRow(row);
      });

      /* A row is a button, so Enter and Space open it too. */
      bindOnce(root, '__g07Keys', 'G-07', 'keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        var row = e.target.closest ? e.target.closest('.order-row') : null;
        if (!row) return;
        e.preventDefault();
        openRow(row);
      });

      /* Status refresh: once per entry, active orders only, 10-second limit,
         silent on failure, no polling (§5.5). The stub exposes one status per
         order, so one call is made per active order and each pill is updated
         in place; nothing is announced and no row moves. */
      if (!window.Server || typeof Server.getStatus !== 'function') return;
      var list = readableOrders();
      for (var i = 0; i < list.length; i++) {
        if (!isActiveStatus(list[i].status)) continue;
        (function (order) {
          withTimeout(Server.getStatus(order.orderNo), 10000).then(function (res) {
            var status = (res && typeof res === 'object') ? res.status : res;
            if (indexIn(ALL_STATUSES, status) < 0) return;
            writeOrder(order, { status: status });
            if (gen !== g07Gen) return;                      /* the guest has left */
            var root2 = document.getElementById('app');
            if (!root2 || root2.getAttribute('data-screen') !== 'G-07') return;
            var row = root2.querySelector('.order-row[data-order="' + order.orderNo + '"]');
            if (!row) return;
            var pill = row.querySelector('[data-el="G-07-C04"]');
            if (!pill) return;
            pill.textContent = t('status.' + status);
            pill.setAttribute('data-status', status);
            /* Filled while active, outlined once finished — §5.3. */
            pill.className = 'badge' + (isActiveStatus(status) ? ' badge--status' : '');
          }, function () { /* silent — §5.5, §6.3 case 1 */ });
        }(list[i]));
      }
    }
  };

  /* =====================================================================
     6. M-02 — Cancel order?
     ===================================================================== */

  /* Memory only, never written to the device (M-02 §5.6, §7.2):
     failures drives C04 (≥ 1) and C05 (≥ 2). */
  var m02 = { orderNo: null, failures: 0, inFlight: false, armed: false, wrap: null };

  /* The count is discarded whenever the sheet closes by any route, so a
     reopened M-02 always starts in the ready state (§7.2). */
  function m02Reset() {
    m02.orderNo = null;
    m02.failures = 0;
    m02.inFlight = false;
    m02.wrap = null;
  }

  Modals['M-02'] = {
    render: function (params) {
      var n = params.orderNo;
      var h = '<div class="sheet" data-el="M-02-S02" role="dialog" aria-modal="true">';
      h += '<h2 class="sheet__title" data-el="M-02-C01" tabindex="-1">' + tx('m02.c01') + '</h2>';
      h += '<div class="sheet__body">';
      h += '<p data-el="M-02-C02">' + tx('m02.c02', { n: n }) + '</p>';
      /* C03 names the way out concretely: Reorder on the tracking page (§5.2). */
      h += '<p data-el="M-02-C03">' + tx('m02.c03') + '</p>';
      h += '</div>';

      /* C04 from the 1st failure, C05 from the 2nd consecutive one (§5.5).
         `.sheet__note` carries the 1 px rule above it. */
      if (m02.failures >= 1) {
        h += '<div class="sheet__note" data-el="M-02-C04">' +
               '<p class="bold">' + tx('m02.c04.l1') + '</p>' +
               '<p>' + tx('m02.c04.l2') + '</p>' +
             '</div>';
      }
      if (m02.failures >= 2) {
        /* Plain text, never a dial link (§4, §7.1). */
        h += '<p class="sheet__note" data-el="M-02-C05">' + tx('m02.c05', { n: n }) + '</p>';
      }

      /* B01 outlined above; B02 "No, keep my order" is the filled primary at the
         bottom, with the wider 16 px gap — a mis-tap must fail toward the
         outcome that can be undone (§5.3, §9 items 1 and 19). */
      h += '<div class="sheet__actions sheet__actions--gap16">';
      h += '<button type="button" class="btn btn--ghost" data-el="M-02-B01" data-oact="yes"' +
           (m02.inFlight ? ' aria-busy="true"' : '') + '>' +
             (m02.inFlight
               ? '<span class="spinner" aria-hidden="true"></span>' + tx('m02.b01.flight')
               : tx('m02.b01')) +
           '</button>';
      h += '<button type="button" class="btn btn--primary' + (m02.inFlight ? ' is-disabled' : '') +
           '" data-el="M-02-B02" data-oact="no"' + (m02.inFlight ? ' disabled' : '') + '>' +
             tx('m02.b02') + '</button>';
      h += '</div></div>';
      return h;
    },

    mount: function (wrap, params) {
      if (m02.orderNo !== String(params.orderNo)) {
        m02.orderNo = String(params.orderNo);
        m02.failures = 0;                 /* a reopened sheet always starts at 0 */
        m02.inFlight = false;
      }
      m02.wrap = wrap;
      /* Both buttons ignore taps for the first 300 ms — the arming delay of
         M-01 §7.2, reused here (§6.0). */
      m02.armed = false;
      setTimeout(function () { m02.armed = true; }, 300);
      if (m02.inFlight) App.modalBusy(true);

      if (wrap.__m02Bound) return;
      wrap.__m02Bound = true;
      wrap.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-oact]') : null;
        if (!btn) return;
        var act = btn.getAttribute('data-oact');
        if (!m02.armed || m02.inFlight) return;   /* one tap = exactly one request */
        if (act === 'no') {
          App.closeModal();
          g06KeepOrder();
        } else if (act === 'yes') {
          sendCancel(params);
        }
      });
    },

    /* Backdrop, Escape and the browser back gesture are all "No, keep my order"
       while nothing is in flight; app.js blocks them while the sheet is busy. */
    onDismiss: function () { g06KeepOrder(); }
  };

  function m02Repaint(params) {
    if (!m02.wrap || !m02.wrap.parentNode) return;
    m02.wrap.innerHTML = Modals['M-02'].render(params);
  }

  /* One request per tap, carrying the order number only (§5.4). The response is
     classified into exactly four outcomes and never a fifth; anything
     unreadable, dropped, timed out or ambiguous is *failed*. */
  function sendCancel(params) {
    m02.inFlight = true;
    App.modalBusy(true);                 /* backdrop, Escape and back go inert */
    m02Repaint(params);

    if (!window.Server || typeof Server.cancelOrder !== 'function') {
      finishCancel(params, 'failed');
      return;
    }
    withTimeout(Server.cancelOrder(params.orderNo), 15000).then(function (res) {
      var kind = (res && typeof res === 'object') ? (res.kind || res.result) : res;
      if (kind === 'cancelled') {
        finishCancel(params, 'cancelled');
      } else if (kind === 'alreadyAccepted') {
        /* The real status travels on Server.lastCancelStatus (store.js). */
        finishCancel(params, 'alreadyAccepted',
          (res && typeof res === 'object' && res.status) ? res.status : (window.Server ? Server.lastCancelStatus : null));
      } else {
        finishCancel(params, 'failed');      /* ambiguous is failed, never not-found */
      }
    }, function (err) {
      if (err && err.type === 'orderNotFound') finishCancel(params, 'orderNotFound');
      else finishCancel(params, 'failed');
    });
  }

  function finishCancel(params, outcome, status) {
    m02.inFlight = false;
    App.modalBusy(false);

    /* Three of the four outcomes close the sheet and draw nothing of their own;
       G-06 does all the reporting (§6.4, §9 item 15). */
    if (outcome === 'cancelled') {
      m02Reset();
      App.closeModal();
      g06Cancelled(params.orderNo);
      return;
    }
    if (outcome === 'alreadyAccepted') {
      m02Reset();
      App.closeModal();
      g06AlreadyAccepted(params.orderNo, status);
      return;
    }
    if (outcome === 'orderNotFound') {
      m02Reset();
      App.closeModal();
      g06OrderNotFound();
      return;
    }
    /* Only a genuine failure keeps the sheet open (§5.5, §6.3). */
    m02.failures++;
    m02Repaint(params);
  }
})();
