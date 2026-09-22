/* AM-01 unsaved changes · AM-02 confirm removal · AM-03 order details ·
   AM-04 change room-number format. spec/admin/screens/AM-0x.md */
(function () {
  'use strict';
  var A = window.Admin;
  var M = A.Modal;

  I18N.register({
    /* AM-01 */
    'am01.c01': { ar: 'تغييرات غير محفوظة', en: 'Unsaved changes' },
    'am01.c02': { ar: 'لديك تغييرات لم تُحفظ في هذه الصفحة. إذا غادرتها دون حفظ فستُفقد هذه التغييرات.',
                  en: 'You have changes on this page that are not saved. If you leave without saving, these changes will be lost.' },
    'am01.c03.format': { ar: 'تغيير صيغة رقم الغرفة يحتاج إلى تأكيد واختبار. اختر «البقاء» ثم «حفظ».',
                         en: 'Changing the room number format needs a confirmation and a test. Choose "Stay on this page", then "Save".' },
    'am01.c03.upload': { ar: 'يجري رفع صورة. يمكنك الحفظ بعد انتهاء الرفع.', en: 'An image is uploading. You can save when the upload finishes.' },
    'am01.c03.nocat':  { ar: 'لا يمكن حفظ منتج قبل إنشاء فئة واحدة على الأقل.', en: 'A product cannot be saved before at least one category exists.' },
    'am01.b03': { ar: 'البقاء', en: 'Stay on this page' },
    'am01.b02': { ar: 'تجاهل التغييرات', en: 'Discard changes' },
    'am01.b01': { ar: 'حفظ ومتابعة', en: 'Save and continue' },

    /* AM-02 */
    'am02.c01.P': { ar: 'إزالة المنتج من المتجر؟', en: 'Remove this product from the store?' },
    'am02.c01.C': { ar: 'حذف الفئة؟', en: 'Delete this category?' },
    'am02.c04':   { ar: 'هذا آخر منتج معروض للبيع. بعد إزالته لن يجد النزلاء أي منتج في المتجر.',
                    en: 'This is the last product on sale. After you remove it, guests will find no products in the store.' },
    'am02.P.1': { ar: 'لن يظهر للنزلاء في المتجر عندما يفتحونه من جديد.', en: 'Guests will no longer see it when they open the store again.' },
    'am02.P.2': { ar: 'النزيل الذي في سلته هذا المنتج لن يستطيع إرسال طلب يتضمنه.', en: 'A guest who has it in their cart cannot send an order that includes it.' },
    'am02.P.3': { ar: 'الطلبات المرسلة لا تتغيّر، ويبقى المنتج في سجل الطلبات والتقارير.', en: 'Orders already sent do not change, and the product stays in order history and reports.' },
    'am02.P.4': { ar: 'يمكنك استعادته لاحقًا من «المنتجات» باختيار «مُزال»، ويعود غير متوفر.', en: 'You can restore it later from Products by choosing Removed; it comes back out of stock.' },
    'am02.C.1': { ar: 'الفئة فارغة ولا يراها النزلاء الآن، فلن يتغيّر شيء في المتجر.', en: 'The category is empty and guests do not see it now, so nothing changes in the store.' },
    'am02.C.2': { ar: 'سيُحذف اسمها بالعربية والإنجليزية نهائيًا، ولا يمكن التراجع عن ذلك.', en: 'Its Arabic and English names will be deleted permanently. This cannot be undone.' },
    'am02.c05': { ar: 'ستُفقد التعديلات غير المحفوظة في هذه الصفحة.', en: 'Unsaved edits on this page will be lost.' },
    'am02.b01.P': { ar: 'نعم، أزل', en: 'Yes, remove' },
    'am02.b01.C': { ar: 'نعم، احذف', en: 'Yes, delete' },

    /* AM-03 */
    'am03.c01': { ar: 'الطلب رقم {n}', en: 'Order {n}' },
    'am03.c03': { ar: 'للعرض فقط — تُغيَّر حالة الطلب من واجهة الموظفين.', en: 'View only — an order\'s status is changed in the staff interface.' },
    'am03.c04': { ar: 'أُرسل في {date} الساعة {time}', en: 'Sent on {date} at {time}' },
    'am03.c05': { ar: 'الغرفة', en: 'Room' },
    'am03.c06': { ar: 'المنتجات — {count}', en: 'Items — {count}' },
    'am03.each': { ar: '{price} للقطعة', en: '{price} each' },
    'am03.c08': { ar: 'الإجمالي', en: 'Total' },
    'am03.c09': { ar: 'طريقة الدفع عند الاستلام', en: 'Payment on delivery' },
    'am03.c11.amount': { ar: 'المبلغ الذي سيدفع به: {amount}', en: 'Amount the guest will pay with: {amount}' },
    'am03.c11.none':   { ar: 'لم يحدّد النزيل المبلغ', en: 'The guest did not state an amount' },
    'am03.c12': { ar: 'ملاحظات النزيل', en: 'Guest notes' },
    'am03.c13.none': { ar: 'لا توجد ملاحظات', en: 'No notes' },
    'am03.c14': { ar: 'سجل الحالة', en: 'Status history' },
    'am03.noTime': { ar: 'الوقت غير مسجَّل', en: 'Time not recorded' },
    'am03.who.guest': { ar: 'النزيل', en: 'Guest' },
    'am03.who.unknown': { ar: 'موظف غير معروف', en: 'Unknown staff member' },
    'am03.who.hotel': { ar: 'الفندق', en: 'The hotel' },
    'am03.c16.guest':  { ar: 'ألغاه النزيل قبل أن يقبله الفندق.', en: 'The guest cancelled it before the hotel accepted it.' },
    'am03.c16.reason': { ar: 'ألغاه الفندق. السبب: {reason}', en: 'The hotel cancelled it. Reason: {reason}' },
    'am03.c16.none':   { ar: 'ألغاه الفندق دون سبب مسجَّل.', en: 'The hotel cancelled it with no reason recorded.' },
    'am03.b01': { ar: 'إغلاق', en: 'Close' },
    'am03.c18.fail':     { ar: 'تعذّر تحميل الطلب', en: 'The order could not be loaded' },
    'am03.c18.notFound': { ar: 'لم يُعثر على هذا الطلب', en: 'This order was not found' },

    /* AM-04 */
    'am04.c01': { ar: 'تغيير صيغة رقم الغرفة', en: 'Change room number format' },
    'am04.c02.cur': { ar: 'الصيغة الحالية:', en: 'Current format:' },
    'am04.c02.new': { ar: 'الصيغة الجديدة:', en: 'New format:' },
    'am04.p1.name': { ar: 'أرقام فقط', en: 'Digits only' },
    'am04.p1.sum':  { ar: 'من 1 إلى 5 أرقام فقط. يرى النزيل لوحة أرقام.', en: '1 to 5 digits only. The guest gets a number pad.' },
    'am04.p2.name': { ar: 'أرقام وحروف', en: 'Digits and letters' },
    'am04.p2.sum':  { ar: 'من 1 إلى 6 خانات: أرقام وحروف لاتينية، وتجوز بينها شرطة (-) لا تكون في البداية ولا في النهاية ولا مكرّرة. يرى النزيل لوحة المفاتيح الكاملة.',
                      en: '1 to 6 characters: digits and Latin letters, with a hyphen (-) allowed between them — never first, last or twice in a row. The guest gets the full keyboard.' },
    'am04.unknown': { ar: 'صيغة غير معروفة', en: 'Unrecognised format' },
    'am04.c03.1T': { ar: 'النزيل الذي في رقم غرفته حرف أو شرطة، مثل A-12، لن يستطيع كتابته. قد يكتب 12 وحده فيصل طلبه إلى باب غرفة أخرى.',
                     en: 'A guest whose room number has a letter or a hyphen, such as A-12, will not be able to type it. They may type 12 alone, and the order will go to another room\'s door.' },
    'am04.c03.1L': { ar: 'كل رقم غرفة من الأرقام فقط يبقى مقبولًا كما هو اليوم.', en: 'Every digits-only room number stays accepted, as it is today.' },
    'am04.c03.2':  { ar: 'يصل التغيير إلى النزيل عند فتحه المتجر من جديد. من فتح المتجر قبل الحفظ يُكمل طلبه بالصيغة السابقة.',
                     en: 'The change reaches a guest the next time they open the store. A guest who opened it before you save finishes their order under the previous format.' },
    'am04.c03.3':  { ar: 'لا يتغيّر أي طلب مُرسل، ولا يُرفض أي طلب بسبب هذه الصيغة بعد إرساله.', en: 'No sent order changes, and no order is ever refused because of this format once it is sent.' },
    'am04.c03.4':  { ar: 'يُسجَّل التغيير مع وقته وبريد حسابك تحت «آخر تغيير».', en: 'The change is recorded with its time and your account email under "Last changed".' },
    'am04.c13': { ar: 'يحفظ «تأكيد التغيير» أيضًا تعديلاتك الأخرى غير المحفوظة في إعدادات الفندق.', en: '"Confirm change" also saves your other unsaved edits on Hotel settings.' },
    'am04.c04': { ar: 'أرقام الغرف في الطلبات السابقة', en: 'Room numbers in past orders' },
    'am04.c05.checking': { ar: 'جارٍ فحص أرقام الغرف في الطلبات السابقة…', en: 'Checking room numbers in past orders…' },
    'am04.c05.none':     { ar: 'لا توجد طلبات سابقة لفحصها.', en: 'There are no past orders to check.' },
    'am04.c05.ok':       { ar: 'كل أرقام الغرف في الطلبات السابقة ({M}) تقبلها الصيغة الجديدة.', en: 'The new format accepts every room number in past orders ({M}).' },
    'am04.c05.1':        { ar: 'رقم غرفة واحد في الطلبات السابقة لا تقبله الصيغة الجديدة.', en: '1 room number in past orders is refused by the new format.' },
    'am04.c05.2':        { ar: 'رقما غرفتين في الطلبات السابقة لا تقبلهما الصيغة الجديدة.', en: '2 room numbers in past orders are refused by the new format.' },
    'am04.c05.few':      { ar: '{N} أرقام غرف في الطلبات السابقة لا تقبلها الصيغة الجديدة.', en: '{N} room numbers in past orders are refused by the new format.' },
    'am04.c05.many':     { ar: '{N} رقم غرفة في الطلبات السابقة لا تقبلها الصيغة الجديدة.', en: '{N} room numbers in past orders are refused by the new format.' },
    'am04.c05.fail':     { ar: 'تعذّر فحص الطلبات السابقة. ما زال بإمكانك الاختبار أدناه.', en: 'Past orders could not be checked. You can still use the test below.' },
    'am04.c06': { ar: 'مثل:', en: 'For example:' },
    'am04.c07': { ar: 'قد يكون بعضها خطأً كتبه نزيل. إن كان أحدها رقم غرفة حقيقيًا في فندقك فلن يستطيع نزيلها الطلب بعد هذا التغيير — اختبره أدناه.',
                  en: 'Some may be guests\' typing mistakes. If any of them is a real room at your hotel, its guest will not be able to order after this change — test it below.' },
    'am04.c08': { ar: 'اختبر الصيغة الجديدة برقم غرفة حقيقي', en: 'Test the new format with a real room number' },
    'am04.c09.T': { ar: 'اكتب رقم غرفة حقيقيًا من فندقك كما هو مكتوب على الباب. إن كان في فندقك رقم غرفة فيه حرف أو شرطة فاختبره هو، وإلا فاختبر أطول رقم غرفة لديك.',
                    en: 'Type a real room number from your hotel exactly as it appears on the door. If any room at your hotel has a letter or a hyphen, test that one; otherwise test your longest room number.' },
    'am04.c09.L': { ar: 'اكتب رقم غرفة حقيقيًا من فندقك كما هو مكتوب على الباب، ويُفضَّل رقم فيه حرف أو شرطة، فهو سبب هذا التغيير.',
                    en: 'Type a real room number from your hotel exactly as it appears on the door — preferably one with a letter or a hyphen, since that is why you are making this change.' },
    'am04.f01': { ar: 'رقم غرفة من فندقك', en: 'A room number from your hotel' },
    'am04.c10.empty': { ar: 'اكتب رقم غرفة ليُختبر بالصيغة الجديدة. يبقى «تأكيد التغيير» معطّلًا حتى يُقبل.',
                        en: 'Type a room number to test it against the new format. "Confirm change" stays disabled until it is accepted.' },
    'am04.c10.ok':    { ar: 'مقبول: يستطيع النزيل كتابة {value} بالصيغة الجديدة.', en: 'Accepted: a guest can type {value} under the new format.' },
    'am04.c10.no.1':  { ar: 'مرفوض: لن يستطيع النزيل كتابة {value} بالصيغة الجديدة.', en: 'Refused: a guest will not be able to type {value} under the new format.' },
    'am04.c10.no.2':  { ar: 'سيرى تحت الحقل: «{msg}»', en: 'Under the field they will see: "{msg}"' },
    'am04.c10.no.3':  { ar: 'إن كان هذا رقم غرفة حقيقيًا في فندقك فاختر «إلغاء» للإبقاء على الصيغة الحالية.', en: 'If this is a real room at your hotel, choose "Cancel" to keep the current format.' },
    'am04.c11.recheck': { ar: 'لم يُحفظ التغيير: الصيغة الجديدة لا تقبل رقم الاختبار.', en: 'The change was not saved: the new format refuses the test room number.' },
    'am04.b02': { ar: 'تأكيد التغيير', en: 'Confirm change' },
    /* G-04 §7.1 — the guest's own digits-only messages, quoted when the
       new rule is the default one (the guest shows exactly these). */
    'am04.g04.chars': { ar: 'استخدم الأرقام فقط (0–9)', en: 'Use digits only (0–9)' },
    'am04.g04.long':  { ar: 'رقم الغرفة طويل جدًا: 5 أرقام كحد أقصى', en: 'Room number is too long: 5 digits at most' }
  });

  function title(id, text) { return '<h2 class="adm-modal__title" id="' + id + '-title"' + A.el(id + '-C01') + '>' + esc(text) + '</h2>'; }

  /* ================================================================== *
   * AM-01 — Unsaved changes
   * ================================================================== */
  var am01 = { busy: false };
  function am01Reason() {
    var v = A.curView();
    return v && v.saveBlocked ? v.saveBlocked() : null;
  }
  function am01Stay(p) {
    if (am01.busy) return;
    var c = M.close();
    M.restoreFocus(c);
  }
  A.modals['AM-01'] = {
    width: 480,
    open: function () { am01.busy = false; },
    render: function () {
      var reason = am01Reason();
      var h = title('AM-01', t('am01.c01'));
      h += '<p class="adm-modal__body"' + A.el('AM-01-C02') + '>' + esc(t('am01.c02')) + '</p>';
      if (reason) h += '<p class="notice notice--flat adm-modal__warn"' + A.el('AM-01-C03') + '><span>' + esc(t('am01.c03.' + reason)) + '</span></p>';
      h += '<div class="adm-modal__btns">' +
           '<button type="button" class="btn btn--ghost adm-btn44" data-act="stay"' + A.el('AM-01-B03') + (am01.busy ? ' disabled' : '') + '>' + esc(t('am01.b03')) + '</button>' +
           '<button type="button" class="btn btn--ghost adm-btn44" data-act="discard"' + A.el('AM-01-B02') + (am01.busy ? ' disabled' : '') + '>' + esc(t('am01.b02')) + '</button>' +
           '<button type="button" class="btn btn--primary adm-btn44" data-act="save"' + A.el('AM-01-B01') + (reason || am01.busy ? ' disabled' : '') + '>' +
             (am01.busy ? '<span' + A.el('AM-01-C04') + '>' + esc(t('ad.saving')) + '</span>' : esc(t('am01.b01'))) + '</button></div>';
      return h;
    },
    mount: function (card, p, first) {
      card.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b || b.disabled) return;
        var act = b.getAttribute('data-act');
        if (act === 'stay') am01Stay(p);
        else if (act === 'discard') { M.close(); p.go(); }
        else if (act === 'save') {
          if (am01Reason()) return;
          var v = A.curView();
          am01.busy = true; M.redraw();
          var res = v && v.commit ? v.commit() : 'failed';
          am01.busy = false;
          M.close();
          if (res === 'ok') p.go();
          else if (v && v.showCommitResult) v.showCommitResult();      // navigation cancelled
        }
      });
      if (first) { var s = card.querySelector('[data-act="stay"]'); if (s) s.focus(); }
    },
    backdrop: am01Stay, esc: am01Stay, back: am01Stay
  };

  /* ================================================================== *
   * AM-02 — Confirm removal (P product · C category)
   * ================================================================== */
  function am02Cancel(p) { var c = M.close(); M.restoreFocus(c); }
  A.modals['AM-02'] = {
    width: 480,
    open: function (p) {
      p.lastOnSale = false;
      if (p.variant === 'P') {
        /* §5.3 — is this the only active, in-stock product? */
        try {
          var onSale = A.Cat.load().products.filter(function (x) { return !x.removed && x.inStock; });
          p.lastOnSale = onSale.length === 1 && onSale[0].id === p.product.id;
        } catch (e) { p.lastOnSale = false; }
      }
    },
    render: function (p) {
      var V = p.variant, item = V === 'P' ? p.product : p.category;
      var h = title('AM-02', t('am02.c01.' + V));
      h += '<div class="adm-modal__names"' + A.el('AM-02-C02') + '><div class="bold" lang="ar" dir="rtl">' + esc(item.nameAr) + '</div><div lang="en" dir="ltr">' + esc(item.nameEn) + '</div></div>';
      if (V === 'P' && p.lastOnSale) h += '<p class="notice adm-modal__last"' + A.el('AM-02-C04') + '><span>' + esc(t('am02.c04')) + '</span></p>';
      var lines = V === 'P' ? ['1', '2', '3', '4'] : ['1', '2'];
      h += '<ul class="adm-bullets"' + A.el('AM-02-C03') + '>' + lines.map(function (n) { return '<li>' + esc(t('am02.' + V + '.' + n)) + '</li>'; }).join('') + '</ul>';
      if (V === 'P' && p.from === 'A-04' && p.dirty) h += '<p class="notice notice--flat"' + A.el('AM-02-C05') + '><span>' + esc(t('am02.c05')) + '</span></p>';
      h += '<div class="adm-modal__btns adm-modal__btns--split">' +
           '<button type="button" class="btn btn--ghost adm-btn44" data-act="cancel"' + A.el('AM-02-B02') + '>' + esc(t('ad.cancel')) + '</button>' +
           '<button type="button" class="btn btn--primary adm-btn44" data-act="confirm"' + A.el('AM-02-B01') + '>' + esc(t('am02.b01.' + V)) + '</button></div>';
      return h;
    },
    mount: function (card, p, first) {
      card.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.getAttribute('data-act') === 'cancel') { am02Cancel(p); return; }
        var c = M.current();
        if (c && Date.now() - c.openedAt < 300) return;            // §4 B01: 300 ms guard
        M.close();
        if (p.variant === 'P') {
          var ok = !!A.Cat.remove(p.product.id);
          A.a03.removed(p.product, ok);
          if (p.from === 'A-04') A.navigate(A.a03.back(), { force: true });
          else if (A.cur.id === 'A-03') A.renderView();
        } else {
          A.a05.remove(p.category.id);
          if (A.cur.id === 'A-05') A.renderView();
        }
      });
      if (first) { var c = card.querySelector('[data-act="cancel"]'); if (c) c.focus(); }
    },
    backdrop: am02Cancel, esc: am02Cancel, back: am02Cancel
  };

  /* ================================================================== *
   * AM-03 — Order details (read-only)
   * ================================================================== */
  function am03Close() { var c = M.close(); refocusRow(c); }
  function refocusRow(c) {
    if (!c) return;
    var row = document.querySelector('.adm-orow[data-no="' + c.params.orderNo + '"]');
    if (row) row.focus(); else M.restoreFocus(c);
  }
  function rosterName(id) {
    try {
      var list = (HotelDB.staff() || {}).members || [];
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name;
    } catch (e) {}
    return null;
  }
  function histRows(o) {
    var rows = [];
    var log = o.log || [];
    function logFor(s) { for (var i = 0; i < log.length; i++) if (log[i].status === s) return log[i]; return null; }
    rows.push({ s: 'New', at: o.createdAt, who: t('am03.who.guest') });
    var reached = o.status === 'Cancelled' ? (o.cancelledFrom || 'New') : o.status;
    var fw = HotelDB.FORWARD, upto = fw.indexOf(reached);
    for (var i = 1; i <= upto; i++) {
      var l = logFor(fw[i]);
      if (l && l.at) rows.push({ s: fw[i], at: l.at, who: rosterName(l.staffId) || t('am03.who.unknown') });
      else rows.push({ s: fw[i], at: null, who: '—' });
    }
    if (o.status === 'Cancelled') {
      var lc = logFor('Cancelled');
      var at = o.cancelledAt || (lc && lc.at) || null;
      var by = o.cancelledBy != null ? o.cancelledBy : (lc && lc.staffId);
      var who;
      if (o.cancelledByGuest || by === 'guest') who = t('am03.who.guest');
      else if (by) who = rosterName(by) || t('am03.who.unknown');
      else who = t('am03.who.hotel');
      rows.push({ s: 'Cancelled', at: at, who: at ? who : '—' });
    }
    return rows;
  }
  A.modals['AM-03'] = {
    width: 640,
    open: function (p) {
      p.failed = false;
      try { p.order = HotelDB.getOrder(p.orderNo); } catch (e) { p.order = null; p.failed = true; }
    },
    render: function (p) {
      var o = p.order;
      var h = '<div class="adm-modal__head"><div class="adm-modal__headrow">' + title('AM-03', t('am03.c01', { n: p.orderNo }));
      if (o) h += '<span class="adm-pill adm-pill--status"' + A.el('AM-03-C02') + '>' + esc(t('ad.status.' + o.status)) + '</span>';
      h += '</div><p class="adm-note"' + A.el('AM-03-C03') + '>' + esc(t('am03.c03')) + '</p></div>';
      h += '<div class="adm-modal__scroll">';
      if (!o) {
        h += '<div class="adm-state"><p' + A.el('AM-03-C18') + '>' + esc(t(p.failed ? 'am03.c18.fail' : 'am03.c18.notFound')) + '</p>' +
             (p.failed ? '<button type="button" class="btn btn--ghost adm-btn36" data-act="retry"' + A.el('AM-03-B02') + '>' + esc(t('ad.retry')) + '</button>' : '') + '</div>';
      } else {
        h += '<p class="small"' + A.el('AM-03-C04') + '>' + esc(t('am03.c04', { date: A.fmtDate(o.createdAt), time: A.fmtTime(o.createdAt) })) + '</p>';
        h += '<div class="adm-am03-room"' + A.el('AM-03-C05') + '><div class="small muted">' + esc(t('am03.c05')) + '</div><div class="adm-am03-room__n"><span class="num">' + esc(o.roomNumber) + '</span></div></div>';

        h += '<section class="adm-am03-sec"' + A.el('AM-03-S03') + '><h3 class="adm-am03-h"' + A.el('AM-03-C06') + '>' + esc(t('am03.c06', { count: A.itemsLabel(A.units(o)) })) + '</h3>';
        (o.lines || []).forEach(function (l) {
          var q = Number(l.qty) || 0, pr = Number(l.price) || 0;
          h += '<div class="adm-am03-line"' + A.el('AM-03-C07') + '><div><div><span class="num">' + q + '</span> × ' + esc(A.lineName(l)) + '</div>' +
               '<div class="small muted">' + esc(t('am03.each', { price: A.money(pr) })) + '</div></div>' +
               '<div>' + esc(A.money(q * pr)) + '</div></div>';
        });
        h += '<div class="adm-am03-total"' + A.el('AM-03-C08') + '><span>' + esc(t('am03.c08')) + '</span><span>' + esc(A.money(o.total)) + '</span></div></section>';

        h += '<section class="adm-am03-sec"' + A.el('AM-03-S04') + '><h3 class="adm-am03-h"' + A.el('AM-03-C09') + '>' + esc(t('am03.c09')) + '</h3>' +
             '<p' + A.el('AM-03-C10') + '>' + esc(t(o.payment === 'cash' ? 'ad.pay.cash' : 'ad.pay.card')) + '</p>';
        if (o.payment === 'cash') {
          var s = A.settings(), amt = o.amount;
          var txt = amt != null && amt !== ''
            ? t('am03.c11.amount', { amount: I18N.lang === 'en' ? (s.currencyEn || 'SAR') + ' ' + amt : amt + ' ' + (s.currencyAr || 'ر.س') })
            : t('am03.c11.none');
          h += '<p class="small"' + A.el('AM-03-C11') + '>' + esc(txt) + '</p>';
        }
        h += '</section>';

        h += '<section class="adm-am03-sec"' + A.el('AM-03-S05') + '><h3 class="adm-am03-h"' + A.el('AM-03-C12') + '>' + esc(t('am03.c12')) + '</h3>';
        var notes = A.trim(o.notes);
        if (notes) {
          h += '<div class="adm-am03-notes"' + A.el('AM-03-C13') + '>' + String(o.notes).split(/\r?\n/).map(function (para) {
            return '<p dir="auto">' + (para ? esc(para) : '&nbsp;') + '</p>';
          }).join('') + '</div>';
        } else h += '<p class="small muted"' + A.el('AM-03-C13') + '>' + esc(t('am03.c13.none')) + '</p>';
        h += '</section>';

        h += '<section class="adm-am03-sec"' + A.el('AM-03-S06') + '><h3 class="adm-am03-h"' + A.el('AM-03-C14') + '>' + esc(t('am03.c14')) + '</h3><ol class="adm-am03-hist">';
        histRows(o).forEach(function (r) {
          h += '<li class="small"' + A.el('AM-03-C15') + '>' + esc(t('ad.status.' + r.s)) + ' · <span class="num">' + esc(r.at ? A.fmtDT(r.at) : '') + '</span>' +
               (r.at ? '' : esc(t('am03.noTime'))) + ' · ' + esc(r.who) + '</li>';
        });
        h += '</ol>';
        if (o.status === 'Cancelled') {
          var line;
          if (o.cancelledByGuest || o.cancelledBy === 'guest') line = t('am03.c16.guest');
          else { var rsn = A.a06.reasonOf(o); line = rsn ? t('am03.c16.reason', { reason: rsn }) : t('am03.c16.none'); }
          h += '<p' + A.el('AM-03-C16') + '>' + esc(line) + '</p>';
        }
        h += '</section>';
      }
      h += '</div>';
      h += '<div class="adm-modal__foot"><button type="button" class="btn btn--ghost adm-btn44" data-act="close"' + A.el('AM-03-B01') + '>' + esc(t('am03.b01')) + '</button></div>';
      return h;
    },
    mount: function (card, p, first) {
      card.classList.add('adm-modal--tall');
      card.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.getAttribute('data-act') === 'close') am03Close();
        else if (b.getAttribute('data-act') === 'retry') { A.modals['AM-03'].open(p); M.redraw(); }
      });
      if (first) { var c = card.querySelector('[data-act="close"]'); if (c) c.focus(); }
    },
    backdrop: am03Close, esc: am03Close, back: am03Close
  };

  /* ================================================================== *
   * AM-04 — Change room number format. The live test runs the guest's own
   * rule — HotelDB.roomRule(candidate).test(value) — on the UNSAVED
   * format, and "Confirm change" stays disabled until a real room passes.
   * ================================================================== */
  var am04 = null;

  function candidate() { return A.a07.PRESETS[am04.to]; }
  function rule() { return HotelDB.roomRule(candidate()); }
  function testValue() { return A.trim(A.toWestern(am04.value)); }
  /* The message the guest's G-04 prints for this reason under this rule:
     the default rule keeps G-04 §7.1's own strings; any other rule prints
     the messages HotelDB.roomRule() hands the guest (views-checkout.js). */
  function guestMessage(r, reason) {
    if (r.isDefault && (reason === 'chars' || reason === 'long')) return t('am04.g04.' + reason);
    var m = r.messages && r.messages[reason];
    return m ? (m[I18N.lang] || m.ar) : '';
  }
  function verdict() {
    var v = testValue();
    if (!v) return { state: 'empty', value: v };
    var r = rule();
    var reason = r.test(v);
    return reason ? { state: 'no', value: v, msg: guestMessage(r, reason), reason: reason } : { state: 'ok', value: v };
  }
  function confirmEnabled() {
    return !am04.busy && !am04.checking && verdict().state === 'ok';
  }

  function runHistory() {
    try {
      var list = A.orders();
      if (!list.length) { am04.history = { kind: 'none' }; return; }
      var seen = {}, distinct = [];
      list.forEach(function (o) {                       // newest first: the first spelling is the latest
        var raw = A.trim(o.roomNumber);
        if (!raw) return;
        var k = raw.toLowerCase();
        if (seen[k]) return;
        seen[k] = true;
        distinct.push(raw);
      });
      var r = rule();
      var refused = distinct.filter(function (v) { return r.test(v) !== ''; });
      am04.history = { kind: refused.length ? 'refused' : 'ok', N: refused.length, M: distinct.length, examples: refused.slice(0, 5) };
    } catch (e) { am04.history = { kind: 'fail' }; }
  }

  function presetName(k) { return k === 'p1' || k === 'p2' ? t('am04.' + k + '.name') : t('am04.unknown'); }
  function presetSum(k) { return k === 'p1' || k === 'p2' ? '<div class="small">' + esc(t('am04.' + k + '.sum')) + '</div>' : ''; }

  function historyHtml() {
    var hs = am04.history;
    var h = '';
    if (am04.checking) return '<p class="small"' + A.el('AM-04-C05') + '>' + esc(t('am04.c05.checking')) + '</p>';
    if (hs.kind === 'none') return '<p class="small"' + A.el('AM-04-C05') + '>' + esc(t('am04.c05.none')) + '</p>';
    if (hs.kind === 'fail') return '<p class="small"' + A.el('AM-04-C05') + '>' + esc(t('am04.c05.fail')) + '</p>';
    if (hs.kind === 'ok') return '<p class="small"' + A.el('AM-04-C05') + '>' + esc(t('am04.c05.ok', { M: A.count(hs.M) })) + '</p>';
    h += '<p class="small"' + A.el('AM-04-C05') + '>' + esc(t('am04.c05.' + A.bucket(hs.N), { N: A.count(hs.N) })) + '</p>';
    h += '<p class="small"' + A.el('AM-04-C06') + '>' + esc(t('am04.c06')) + ' ' +
         hs.examples.map(function (x) { return '<span class="num adm-am04-ex">' + esc(x) + '</span>'; }).join(I18N.lang === 'en' ? ', ' : '، ') + '</p>';
    h += '<p class="small"' + A.el('AM-04-C07') + '>' + esc(t('am04.c07')) + '</p>';
    return h;
  }

  function resultHtml() {
    var v = verdict();
    if (v.state === 'empty') return '<div class="adm-am04-res small"' + A.el('AM-04-C10') + '>' + esc(t('am04.c10.empty')) + '</div>';
    var shown = '⁦' + v.value + '⁩';
    if (v.state === 'ok') return '<div class="adm-am04-res is-ok"' + A.el('AM-04-C10') + '><div class="bold">' + esc(t('am04.c10.ok', { value: shown })) + '</div></div>';
    return '<div class="adm-am04-res is-no"' + A.el('AM-04-C10') + '><div class="error bold"><span>' + esc(t('am04.c10.no.1', { value: shown })) + '</span></div>' +
           '<div class="small">' + esc(t('am04.c10.no.2', { msg: v.msg })) + '</div>' +
           '<div class="small">' + esc(t('am04.c10.no.3')) + '</div></div>';
  }

  function refreshAm04(card) {
    var res = card.querySelector('[data-el="AM-04-C10"]');
    if (res) { var w = document.createElement('div'); w.innerHTML = resultHtml(); res.parentNode.replaceChild(w.firstChild, res); }
    var b2 = card.querySelector('[data-el="AM-04-B02"]');
    if (b2) b2.disabled = !confirmEnabled();
    var c11 = card.querySelector('[data-el="AM-04-C11"]');
    if (c11 && !am04.busy) { c11.parentNode.removeChild(c11); am04.saveErr = null; }
  }

  function confirmChange() {
    if (!confirmEnabled()) return;
    am04.busy = true; am04.saveErr = null; M.redraw();
    /* §5.4 step 2 — the re-check, against the exact value about to be
       written, as the last step before the write. */
    var v = testValue();
    var fmt = candidate();
    if (HotelDB.roomRule(fmt).test(v) !== '') {
      am04.busy = false; am04.saveErr = 'am04.c11.recheck'; M.redraw(); return;
    }
    var rec = A.a07.record(am04.to);
    rec.roomFormatChangedAt = Date.now();
    rec.roomFormatChangedBy = A.account();
    var ok = false;
    try { ok = HotelDB.saveSettings(rec) !== false; } catch (e) { ok = false; }
    /* §5.4 step 4 — success is a write AND a read-back of the new format. */
    if (ok) {
      try { ok = A.a07.presetOf(HotelDB.settings().roomFormat) === am04.to; } catch (e) { ok = false; }
    }
    am04.busy = false;
    if (!ok) { am04.saveErr = 'ad.formSaveFail'; M.redraw(); return; }
    am04 = null;
    M.close();
    A.a07.saved();
  }

  function am04Cancel() {
    if (!am04 || am04.busy) return;
    am04 = null;
    M.close();
    A.a07.revertFormat();
  }

  A.modals['AM-04'] = {
    width: 560,
    open: function (p) {
      am04 = { from: p.from, to: p.to, value: '', checking: true, history: null, busy: false, saveErr: null };
      setTimeout(function () {                           // §5.2: once, on open
        if (!am04) return;
        runHistory();
        am04.checking = false;
        var card = document.querySelector('#modal-root .adm-modal');
        if (!card) return;
        var box = card.querySelector('#am04-hist');
        if (box) box.innerHTML = historyHtml();
        refreshAm04(card);
      }, 30);
    },
    render: function () {
      var tight = am04.to === 'p1';
      var h = '<div class="adm-modal__head">' + title('AM-04', t('am04.c01')) + '</div><div class="adm-modal__scroll">';
      h += '<div class="adm-am04-fromto"' + A.el('AM-04-C02') + '>' +
           '<div><div class="small">' + esc(t('am04.c02.cur')) + '</div><div class="bold">' + esc(presetName(am04.from)) + '</div>' + presetSum(am04.from) + '</div>' +
           '<div><div class="small">' + esc(t('am04.c02.new')) + '</div><div class="bold">' + esc(presetName(am04.to)) + '</div>' + presetSum(am04.to) + '</div></div>';
      h += '<ul class="adm-bullets"' + A.el('AM-04-C03') + '>' +
           [tight ? '1T' : '1L', '2', '3', '4'].map(function (k) { return '<li>' + esc(t('am04.c03.' + k)) + '</li>'; }).join('') + '</ul>';
      if (A.a07.otherEdits()) h += '<p class="notice notice--flat"' + A.el('AM-04-C13') + '><span>' + esc(t('am04.c13')) + '</span></p>';
      h += '<section class="adm-am04-box"' + A.el('AM-04-S03') + '><h3 class="adm-am03-h"' + A.el('AM-04-C04') + '>' + esc(t('am04.c04')) + '</h3><div id="am04-hist">' + historyHtml() + '</div></section>';
      h += '<section class="adm-am04-box adm-am04-box--test"' + A.el('AM-04-S04') + '><h3 class="adm-am03-h"' + A.el('AM-04-C08') + '>' + esc(t('am04.c08')) + '</h3>' +
           '<p class="small"' + A.el('AM-04-C09') + '>' + esc(t(tight ? 'am04.c09.T' : 'am04.c09.L')) + '</p>' +
           '<label class="adm-label" for="am04-f01">' + esc(t('am04.f01')) + '</label>' +
           '<input id="am04-f01" type="text" dir="ltr" maxlength="20" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" class="adm-input adm-am04-input"' +
           A.el('AM-04-F01') + (am04.busy ? ' disabled' : '') + ' value="' + esc(am04.value) + '">' +
           resultHtml() + '</section>';
      if (am04.saveErr) h += '<p class="error"' + A.el('AM-04-C11') + '><span>' + esc(t(am04.saveErr)) + '</span></p>';
      h += '</div>';
      h += '<div class="adm-modal__btns adm-modal__btns--split">' +
           '<button type="button" class="btn btn--ghost adm-btn44" data-act="cancel"' + A.el('AM-04-B01') + (am04.busy ? ' disabled' : '') + '>' + esc(t('ad.cancel')) + '</button>' +
           '<button type="button" class="btn btn--primary adm-btn44" data-act="confirm"' + A.el('AM-04-B02') + (confirmEnabled() ? '' : ' disabled') + '>' +
             (am04.busy ? '<span' + A.el('AM-04-C12') + '>' + esc(t('ad.saving')) + '</span>' : esc(t('am04.b02'))) + '</button></div>';
      return h;
    },
    mount: function (card, p, first) {
      card.classList.add('adm-modal--tall');
      var f = card.querySelector('#am04-f01');
      f.addEventListener('input', function () {
        var w = A.toWestern(f.value);                    // converted as typed, visibly
        if (w.length > 20) w = w.slice(0, 20);
        if (w !== f.value) { var pos = f.selectionStart; f.value = w; try { f.setSelectionRange(pos, pos); } catch (e) {} }
        am04.value = f.value;
        refreshAm04(card);
      });
      f.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });   // Enter saves nothing
      card.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b || b.disabled) return;
        if (b.getAttribute('data-act') === 'cancel') am04Cancel();
        else confirmChange();
      });
      if (first) f.focus();
    },
    backdrop: function () {}, esc: function () {}, back: function () {}   // closes only by its two buttons
  };
})();
