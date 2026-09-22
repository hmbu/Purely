/* staff/js/modals.js — SM-01 Cancel order and SM-02 Confirm delivery and
   payment. Both are bottom sheets on top of S-02 (SM-01 preamble), opened
   and closed by App.Modal. Each sends one request per confirmed tap and hands
   S-02 exactly one of the outcomes it expects (S-02 §5.8, §5.9). */
(function () {
  'use strict';

  var S = window.Staff;
  var Server = S.Server, Session = S.Session, Modal = App.Modal;

  I18N.register({
    /* SM-01 */
    'sm01.c01':     { ar: 'إلغاء الطلب', en: 'Cancel order' },
    'sm01.c02':     { ar: 'لن يُحضَّر الطلب ولن يُوصَّل، وسيرى الضيف على هاتفه أنه أُلغي مع السبب. لا يمكن التراجع عن الإلغاء.',
                      en: 'The order will not be prepared or delivered, and the guest will see on their phone that it was cancelled, with the reason. A cancellation cannot be undone.' },
    'sm01.c03':     { ar: 'سبب الإلغاء (مطلوب)', en: 'Reason for cancelling (required)' },
    'sm01.p1':      { ar: 'المنتج غير متوفر', en: 'Item not available' },
    'sm01.p2':      { ar: 'الغرفة غير صحيحة أو غير مشغولة', en: 'Room number is wrong or not occupied' },
    'sm01.p3':      { ar: 'لا أحد يجيب في الغرفة', en: 'No answer at the room' },
    'sm01.p4':      { ar: 'بطلب من الضيف', en: "At the guest's request" },
    'sm01.c04':     { ar: 'اختر سببًا للإلغاء', en: 'Choose a reason for cancelling' },
    'sm01.c05':     { ar: 'إضافة قصيرة للضيف (اختياري)', en: 'Short addition for the guest (optional)' },
    'sm01.c06':     { ar: 'اكتب بلغة الطلب: {lang}', en: "Write in the order's language: {lang}" },
    'sm01.lang.ar': { ar: 'العربية', en: 'Arabic' },
    'sm01.lang.en': { ar: 'الإنجليزية', en: 'English' },
    'sm01.c07':     { ar: '{n}/60', en: '{n}/60' },
    'sm01.c08.l1':  { ar: 'سيقرأ الضيف على هاتفه:', en: 'The guest will read on their phone:' },
    /* G-06 C08's hotel-cancelled wording, word for word. */
    'sm01.c08.l2':  { ar: 'ألغى الفندق هذا الطلب: {reason}', en: 'The hotel cancelled this order: {reason}' },
    'sm01.c09':     { ar: 'لم يصل الإلغاء إلى النظام — حاول مرة أخرى', en: 'The cancellation did not reach the system — try again' },
    'sm01.b06':     { ar: 'تأكيد الإلغاء', en: 'Confirm cancellation' },

    /* SM-02 */
    'sm02.c01':         { ar: 'تأكيد التوصيل والدفع', en: 'Confirm delivery and payment' },
    'sm02.c03':         { ar: 'الطريقة: {m}', en: 'Method: {m}' },
    'sm02.card':        { ar: 'بطاقة', en: 'Card' },
    'sm02.cash':        { ar: 'نقدًا', en: 'Cash' },
    'sm02.c04':         { ar: 'المبلغ المطلوب', en: 'Amount to collect' },
    'sm02.c05.card':    { ar: 'خذ المبلغ على جهاز الدفع', en: 'Take the payment on the card terminal' },
    'sm02.c05.more':    { ar: 'سيدفع بـ {amount} — أعطِه باقيًا {change}', en: 'Paying with {amount} — give back {change} change' },
    'sm02.c05.equal':   { ar: 'سيدفع بالمبلغ المطابق — لا يوجد باقٍ', en: 'Paying the exact amount — no change' },
    'sm02.c05.none':    { ar: 'لم يحدّد الضيف المبلغ مسبقًا — أعطِه الباقي مما يدفعه', en: 'The guest did not state an amount in advance — give change from what they pay' },
    'sm02.c06':         { ar: 'اضغط فقط بعد أن يستلم الضيف الطلب وتستلم المبلغ', en: 'Tap only after the guest has the order and you have the payment' },
    'sm02.b02':         { ar: 'سلّمتُ الطلب واستلمتُ المبلغ', en: 'Handed over and payment taken' }
  });

  var PRESETS = ['sm01.p1', 'sm01.p2', 'sm01.p3', 'sm01.p4'];
  var FREE_MAX = 60;

  function myId() { var s = Session.current(); return s ? s.memberId : null; }

  /* User-perceived characters (G-04 §7.2): one emoji counts as 1. */
  function graphemes(s) {
    s = String(s || '');
    if (window.Intl && Intl.Segmenter) {
      var out = [], it = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s);
      var iter = it[Symbol.iterator](), step;
      while (!(step = iter.next()).done) out.push(step.value.segment);
      return out;
    }
    return s.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S]/g) || [];
  }

  function trim(s) { return String(s || '').replace(/^\s+|\s+$/g, ''); }

  function footerButtons(prefix, backEl, confirmEl, confirmKey, afterStatus, busy, errKey, errEl, showErr) {
    return '<div class="s-sheet__foot" data-el="' + prefix + '-S03">' +
             (showErr ? '<p class="error" data-el="' + errEl + '" role="alert">' + t(errKey) + '</p>' : '') +
             '<button type="button" class="btn btn--ghost" data-el="' + backEl + '"' + (busy ? ' disabled aria-disabled="true"' : '') + '>' +
               t('st.back') + '</button>' +
             '<button type="button" class="btn btn--primary s-primary" data-el="' + confirmEl + '"' + (busy ? ' disabled aria-disabled="true"' : '') + '>' +
               (busy
                 ? '<span class="s-primary__l1">' + t('st.sending') + '</span>'
                 : '<span class="s-primary__l1">' + t(confirmKey) + '</span>' +
                   '<span class="s-primary__l2">' + t('st.after', { label: t('st.status.' + afterStatus) }) + '</span>') +
             '</button>' +
           '</div>';
  }

  /* ================================================================== *
   * SM-01 — Cancel order
   * ================================================================== */
  var C = {};

  function reasonIn(lang) {
    if (C.preset == null) return '';
    var free = trim(C.free);
    var preset = S.tIn(lang, PRESETS[C.preset]);
    return free ? preset + ' — ' + free : preset;          /* §7.1 composition */
  }

  function c01Html() {
    var h = '<div class="sheet s-sheet" data-el="SM-01-S02" role="dialog" aria-modal="true" aria-labelledby="sm01-title">' +
      '<div class="s-sheet__scroll">' +
        '<h2 id="sm01-title" class="s-sheet__title" data-el="SM-01-C01" tabindex="-1" data-title>' + t('sm01.c01') + '</h2>' +
        '<p class="s-effect" data-el="SM-01-C02">' + t('sm01.c02') + '</p>' +
        '<p id="sm01-c03" class="s-field-label" data-el="SM-01-C03" style="margin-top:24px">' + t('sm01.c03') + '</p>' +
        '<div role="radiogroup" aria-labelledby="sm01-c03" style="margin-top:0">';
    for (var i = 0; i < PRESETS.length; i++) {
      h += '<button type="button" class="s-preset" role="radio" data-el="SM-01-B0' + (i + 1) + '" data-i="' + i + '"' +
             ' aria-checked="' + (C.preset === i) + '">' +
             '<span class="s-preset__mark" aria-hidden="true"></span><span>' + t(PRESETS[i]) + '</span></button>';
    }
    h += '</div>' +
        '<p class="error" data-el="SM-01-C04" role="alert" hidden>' + t('sm01.c04') + '</p>' +
        '<label class="s-field-label" data-el="SM-01-C05" for="sm01-f01" style="margin-top:24px;margin-bottom:8px">' + t('sm01.c05') + '</label>' +
        '<input id="sm01-f01" class="s-input" data-el="SM-01-F01" type="text" autocomplete="off" enterkeyhint="done" aria-describedby="sm01-c06 sm01-c07">' +
        '<div class="s-fieldrow">' +
          '<span id="sm01-c06" data-el="SM-01-C06">' + t('sm01.c06', { lang: t('sm01.lang.' + C.lang) }) + '</span>' +
          '<span id="sm01-c07" class="s-counter" data-el="SM-01-C07"></span>' +
        '</div>' +
        '<div class="s-preview" data-el="SM-01-C08" aria-live="polite" hidden>' +
          '<p class="s-preview__l1">' + t('sm01.c08.l1') + '</p>' +
          '<p class="s-preview__l2" dir="' + (C.lang === 'ar' ? 'rtl' : 'ltr') + '" lang="' + C.lang + '"></p>' +
        '</div>' +
      '</div>' +
      '<div class="s-foot-slot"></div>' +
    '</div>';
    return h;
  }

  function c01PaintFooter(sheet) {
    var slot = sheet.querySelector('.s-foot-slot');
    slot.innerHTML = footerButtons('SM-01', 'SM-01-B05', 'SM-01-B06', 'sm01.b06', 'Cancelled', C.busy,
                                   'sm01.c09', 'SM-01-C09', C.failed && !C.busy);
    slot.querySelector('[data-el="SM-01-B05"]').addEventListener('click', function () { Modal.dismiss(); });
    slot.querySelector('[data-el="SM-01-B06"]').addEventListener('click', c01Confirm);
  }

  /* Partial repaint: the input is never re-created while the sheet is open. */
  function c01Paint() {
    var sheet = C.sheet;
    if (!sheet) return;
    var rows = sheet.querySelectorAll('.s-preset');
    for (var i = 0; i < rows.length; i++) {
      rows[i].setAttribute('aria-checked', String(C.preset === i));
      if (C.busy) rows[i].setAttribute('aria-disabled', 'true'); else rows[i].removeAttribute('aria-disabled');
    }
    sheet.querySelector('[data-el="SM-01-C04"]').hidden = !C.c04;
    var n = graphemes(C.free).length;
    var counter = sheet.querySelector('[data-el="SM-01-C07"]');
    counter.textContent = t('sm01.c07', { n: n });
    counter.classList.toggle('is-full', n >= FREE_MAX);
    var prev = sheet.querySelector('[data-el="SM-01-C08"]');
    prev.hidden = C.preset == null;
    if (C.preset != null) {
      prev.querySelector('.s-preview__l2').textContent = S.tIn(C.lang, 'sm01.c08.l2', { reason: reasonIn(C.lang) });
    }
    var input = sheet.querySelector('[data-el="SM-01-F01"]');
    input.readOnly = !!C.busy;
    c01PaintFooter(sheet);
  }

  function c01Confirm() {
    if (!Modal.armed() || C.busy) return;
    var now = Date.now();
    if (now - C.tapAt < 300) return;
    C.tapAt = now;
    if (C.preset == null) {
      C.c04 = true;
      c01Paint();
      var c03 = C.sheet.querySelector('[data-el="SM-01-C03"]');
      if (c03 && c03.scrollIntoView) c03.scrollIntoView({ block: 'start' });
      return;
    }
    /* In flight — entered synchronously on the tap (§6.1). */
    C.busy = true;
    C.failed = false;
    Modal.setBusy(true);
    var input = C.sheet.querySelector('[data-el="SM-01-F01"]');
    if (input) input.blur();
    c01Paint();

    /* The reason the guest reads (§7.1): the preset in the ORDER's language
       (order.lang, Arabic when an older record lacks it) plus the free line
       exactly as typed. HotelDB keeps one field per language; the reason is
       written into the field of the language it is in and the other stays
       empty, so G-06 shows this exact string whatever language the guest
       has switched to since. The staff name is never part of it — it
       travels as staffId. */
    var reason = reasonIn(C.lang);
    var reasonAr = C.lang === 'ar' ? reason : '';
    var reasonEn = C.lang === 'en' ? reason : '';
    var me = myId();

    Server.cancel(C.orderNo, reasonAr, reasonEn, me).then(function (res) {
      if (!Modal.isOpen() || Modal.cur.id !== 'SM-01') return;
      C.busy = false;
      Modal.setBusy(false);
      var o = res && res.order;
      if (res && res.ok && o) { Modal.finish('cancelled', o); return; }
      if (res && res.error === 'stale' && o) {
        if (o.status === 'Cancelled') {
          if (o.cancelledByGuest) { Modal.finish('refusedCancelled', o, 'G'); return; }
          if (o.cancelledBy && o.cancelledBy === me) { Modal.finish('cancelled', o); return; }   /* a retry that had landed */
          Modal.finish('refusedCancelled', o, 'H');
          return;
        }
        if (o.status === 'Delivered') { Modal.finish('refusedDelivered', o); return; }
      }
      c01Fail();
    }, function () {
      if (!Modal.isOpen() || Modal.cur.id !== 'SM-01') return;
      C.busy = false;
      Modal.setBusy(false);
      c01Fail();
    });
  }

  function c01Fail() {
    C.failed = true;                        /* preset and typed line kept (§5.6) */
    c01Paint();
  }

  function onFreeInput(e) {
    var el = e.target;
    var v = el.value.replace(/[\r\n]+/g, ' ');
    var g = graphemes(v);
    if (g.length > FREE_MAX) v = g.slice(0, FREE_MAX).join('');   /* hard cap, no message */
    if (v !== el.value) el.value = v;
    C.free = v;
    c01Paint();
  }

  Modals['SM-01'] = {
    init: function (params) {
      var o = params.order || {};
      C = {
        orderNo: o.orderNo, lang: S.orderLang(o), preset: null, free: '',
        c04: false, failed: false, busy: false, tapAt: 0, sheet: null
      };
    },
    html: c01Html,
    bind: function (sheet) {
      C.sheet = sheet;
      var input = sheet.querySelector('[data-el="SM-01-F01"]');
      input.value = C.free;
      input.addEventListener('input', onFreeInput);
      input.addEventListener('paste', function (e) {
        var text = '';
        try { text = e.clipboardData.getData('text') || ''; } catch (x) { return; }
        e.preventDefault();
        if (C.busy) return;
        text = text.replace(/[\r\n]+/g, ' ');
        var start = input.selectionStart, end = input.selectionEnd;
        var before = input.value.slice(0, start), afterTxt = input.value.slice(end);
        var room = FREE_MAX - graphemes(before + afterTxt).length;
        var add = graphemes(text).slice(0, Math.max(0, room)).join('');
        input.value = before + add + afterTxt;
        C.free = input.value;
        c01Paint();
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }   /* closes the keyboard, never confirms */
      });
      var rows = sheet.querySelectorAll('.s-preset');
      for (var i = 0; i < rows.length; i++) {
        rows[i].addEventListener('click', function (e) {
          if (!Modal.armed() || C.busy) return;
          C.preset = Number(e.currentTarget.getAttribute('data-i'));
          C.c04 = false;
          c01Paint();
        });
      }
      c01Paint();
    }
  };

  /* ================================================================== *
   * SM-02 — Confirm delivery and payment
   * ================================================================== */
  var M = {};

  function c02Html() {
    var o = M.order, pc = S.payCase(o);
    var method = '<b>' + t(pc.kind === 'card' ? 'sm02.card' : 'sm02.cash') + '</b>';
    var instr;
    if (pc.kind === 'card') instr = t('sm02.c05.card');
    else if (pc.kind === 'cashMore') instr = t('sm02.c05.more', {
      amount: '<b>' + money(pc.amount) + '</b>',
      change: '<b>' + money(pc.change) + '</b>'
    });
    else if (pc.kind === 'cashEqual') instr = t('sm02.c05.equal');
    else instr = t('sm02.c05.none');

    return '<div class="sheet s-sheet" data-el="SM-02-S02" role="dialog" aria-modal="true" aria-labelledby="sm02-title">' +
      '<div class="s-sheet__scroll">' +
        '<h2 id="sm02-title" class="s-sheet__title" data-el="SM-02-C01" tabindex="-1" data-title>' + t('sm02.c01') + '</h2>' +
        '<div class="s-sheet__room" data-el="SM-02-C02" aria-label="' + esc(t('st.room') + ' ' + S.spaced(o.roomNumber)) + '">' +
          '<span class="s-roomblock__word" aria-hidden="true">' + t('st.room') + '</span>' +
          '<span class="s-roomno s-sheet__roomno" aria-hidden="true">' + esc(o.roomNumber) + '</span>' +
        '</div>' +
        '<p class="s-method" data-el="SM-02-C03">' + t('sm02.c03', { m: method }) + '</p>' +
        '<div class="s-collect" data-el="SM-02-C04">' +
          '<p class="s-collect__label">' + t('sm02.c04') + '</p>' +
          '<p class="s-collect__value">' + money(o.total) + '</p>' +
        '</div>' +
        '<p class="s-instruction" data-el="SM-02-C05">' + instr + '</p>' +
        '<p class="s-consequence" data-el="SM-02-C06">' + t('sm02.c06') + '</p>' +
      '</div>' +
      footerButtons('SM-02', 'SM-02-B01', 'SM-02-B02', 'sm02.b02', 'Delivered', M.busy,
                    's02.c15', 'SM-02-C07', M.failed && !M.busy) +
    '</div>';
  }

  function c02Redraw() {
    if (!Modal.isOpen() || Modal.cur.id !== 'SM-02') return;
    Modal.draw(false);
  }

  function c02Confirm() {
    if (!Modal.armed() || M.busy) return;
    var now = Date.now();
    if (now - M.tapAt < 300) return;
    M.tapAt = now;
    M.busy = true;
    M.failed = false;
    Modal.setBusy(true);
    c02Redraw();
    Server.setStatus(M.order.orderNo, 'Delivered', myId()).then(function (res) {
      if (!Modal.isOpen() || Modal.cur.id !== 'SM-02') return;
      M.busy = false;
      Modal.setBusy(false);
      var o = res && res.order;
      /* Any Delivered answer is "delivered", whoever recorded it (§9 item 8). */
      if (o && o.status === 'Delivered' && (res.ok || res.error === 'stale')) { Modal.finish('delivered', o); return; }
      if (o && res.error === 'stale' && o.status === 'Cancelled') {
        Modal.finish('refusedCancelled', o, o.cancelledByGuest ? 'G' : 'H');
        return;
      }
      M.failed = true;
      c02Redraw();
    }, function () {
      if (!Modal.isOpen() || Modal.cur.id !== 'SM-02') return;
      M.busy = false;
      Modal.setBusy(false);
      M.failed = true;
      c02Redraw();
    });
  }

  Modals['SM-02'] = {
    init: function (params) {
      M = { order: params.order, busy: false, failed: false, tapAt: 0 };
    },
    html: c02Html,
    bind: function (sheet) {
      sheet.querySelector('[data-el="SM-02-B01"]').addEventListener('click', function () { Modal.dismiss(); });
      sheet.querySelector('[data-el="SM-02-B02"]').addEventListener('click', c02Confirm);
    }
  };
})();
