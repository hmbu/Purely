/* views-checkout.js — G-04 Checkout, M-01 Confirm room number,
   M-03 Order not sent, M-04 Items no longer available.

   Sources (every rule below cites the section it comes from):
     /spec/screens/G-04.md  — the checkout form, the field rules, and §7.7,
                              the single home of the client-order-key contract
     /spec/screens/M-01.md  — the mandatory confirmation and the one send
     /spec/screens/M-03.md  — the failure sheet and the duplicate-safe retry
     /spec/screens/M-04.md  — the stock-rejection sheet
     /app/CONTRACT.md       — globals, view shape, modal API, router, class names

   No backend. `Server` is the stub in store.js; nothing here ever fetches.

   Class names are css/app.css's own vocabulary — the design system — and
   this file invents none:
     screen, screen--checkout, topbar, topbar__side, topbar__main,
     topbar__title, iconbtn, iconbtn__glyph, chev,
     notice, notice--flat, error,
     panel, panel__title, line, line__name, line__price, divider,
     total, total__label, total__value,
     field, field--error, field__label, field__hint, field__input,
     field__input--big, field__area, field__wrap, field__suffix,
     field__counter, field__counter--full,
     section__title, choice, choice__mark, choice__label, choice__sub,
     is-selected, actionbar, btn, btn--primary, btn--ghost, btn--block,
     btn--link, is-disabled, spinner,
     dialog, dialog__title, dialog__lead, dialog__room, dialog__actions,
     sheet, sheet__title, sheet__icon, sheet__body, sheet__actions,
     pad, pad-x, row, row--split, small, muted, num
   The router supplies `backdrop` / `backdrop--locked` / `is-busy` on the
   modal wrapper (app.js), so no modal here draws its own backdrop element. */

(function () {
  'use strict';

  /* ================================================================
     1. Copy — every visible string, Arabic and English verbatim from
        the elements tables and the field-rules message tables.
     ================================================================ */

  I18N.register({
    /* ---- G-04 ------------------------------------------------- */
    /* §4 B01: icon only. Accessible name per the back-arrow convention
       set by G-03 §4 B01 ("رجوع / Back"); no new copy is invented here. */
    'g04.b01.aria':   { ar: 'رجوع', en: 'Back' },
    'g04.c01':        { ar: 'إتمام الطلب', en: 'Checkout' },
    'g04.c13':        { ar: 'لم يتم إرسال طلبك بعد. راجع الملخص ثم اضغط «إرسال الطلب».',
                        en: 'Your order has not been sent yet. Review the summary, then tap "Submit order".' },
    'g04.c02':        { ar: 'ملخص الطلب', en: 'Order summary' },
    /* §5.2 / §7.5 rule 4: "{qty} × {name}", "×" is U+00D7, Western digits. */
    'g04.c03.line':   { ar: '{qty} × {name}', en: '{qty} × {name}' },
    'g04.c04':        { ar: 'الإجمالي', en: 'Total' },
    'g04.b02':        { ar: 'تعديل السلة', en: 'Edit cart' },
    'g04.c05':        { ar: 'رقم الغرفة', en: 'Room number' },
    'g04.c07':        { ar: 'ملاحظات على الطلب (اختياري)', en: 'Order notes (optional)' },
    'g04.c08':        { ar: '{n}/200', en: '{n}/200' },
    'g04.c14':        { ar: 'تم اختصار ملاحظتك إلى 200 حرف',
                        en: 'Your note was shortened to 200 characters' },
    'g04.c09':        { ar: 'طريقة الدفع عند الاستلام', en: 'Payment on delivery' },
    'g04.b03.line1':  { ar: 'بطاقة', en: 'Card' },
    'g04.b03.line2':  { ar: 'سيحضر الموظف جهاز الدفع بالبطاقة إلى غرفتك',
                        en: 'Staff will bring a card terminal to your room' },
    'g04.b04.line1':  { ar: 'نقدًا', en: 'Cash' },
    'g04.b04.line2':  { ar: 'ادفع نقدًا للموظف عند الاستلام',
                        en: 'Pay the staff member in cash on delivery' },
    'g04.c11.line1':  { ar: 'المبلغ الذي ستدفع به (اختياري)',
                        en: 'Amount you will pay with (optional)' },
    'g04.c11.line2':  { ar: 'ليحضر الموظف الباقي معه', en: 'So staff can bring your change' },
    /* §4 F03: the currency label from store settings, static inside the field. */
    'g04.f03.currency': { ar: 'ر.س', en: 'SAR' },
    'g04.b05':        { ar: 'إرسال الطلب', en: 'Submit order' },

    /* G-04 §7.1 — the three room-number messages, and there is no fourth:
       no "too short" message exists, by decision. */
    'g04.err.room.empty': { ar: 'اكتب رقم غرفتك', en: 'Enter your room number' },
    'g04.err.room.chars': { ar: 'استخدم الأرقام فقط (0–9)', en: 'Use digits only (0–9)' },
    'g04.err.room.long':  { ar: 'رقم الغرفة طويل جدًا: 5 أرقام كحد أقصى',
                            en: 'Room number is too long: 5 digits at most' },

    /* G-04 §7.3 — the payment-choice message. */
    'g04.err.pay':        { ar: 'اختر طريقة الدفع', en: 'Choose a payment method' },

    /* G-04 §7.4 — the three amount messages. */
    'g04.err.amount.chars': { ar: 'استخدم الأرقام الصحيحة فقط (0–9) بدون فواصل',
                              en: 'Use whole numbers only (0–9), no decimals' },
    'g04.err.amount.long':  { ar: 'المبلغ طويل جدًا: 5 أرقام كحد أقصى',
                              en: 'Amount is too long: 5 digits at most' },
    'g04.err.amount.low':   { ar: 'المبلغ أقل من إجمالي الطلب ({total}). اكتب المبلغ الكامل الذي ستدفعه، أو اترك الحقل فارغًا',
                              en: 'This is less than the order total ({total}). Enter the full amount you will pay, or leave this field empty' },

    /* ---- M-01 ------------------------------------------------- */
    'm01.c01': { ar: 'تأكيد رقم الغرفة', en: 'Confirm room number' },
    'm01.c02': { ar: 'سيُوصَّل طلبك إلى الغرفة', en: 'Your order will be delivered to room' },
    'm01.b02': { ar: 'تعديل رقم الغرفة', en: 'Edit room number' },
    'm01.b01': { ar: 'تأكيد وإرسال', en: 'Confirm and send' },
    'm01.c04': { ar: 'جارٍ الإرسال…', en: 'Sending…' },

    /* ---- M-03 ------------------------------------------------- */
    'm03.c01': { ar: 'لم يتم إرسال الطلب', en: 'Order not sent' },
    'm03.c02': { ar: 'لم نتلقَّ تأكيدًا بوصول طلبك إلى الفندق.',
                 en: 'We have not received confirmation that your order reached the hotel.' },
    'm03.c03.connection': { ar: 'تحقّق من اتصالك بالإنترنت ثم أعد المحاولة. إعادة المحاولة آمنة ولن تُرسل طلبك مرتين.',
                            en: 'Check your internet connection, then try again. Retrying is safe and will never send your order twice.' },
    'm03.c03.server':     { ar: 'حدث خطأ من جهتنا. أعد المحاولة بعد لحظات. إعادة المحاولة آمنة ولن تُرسل طلبك مرتين.',
                            en: 'Something went wrong on our side. Try again in a moment. Retrying is safe and will never send your order twice.' },
    'm03.c04': { ar: 'إذا استمرت المشكلة، اتصل بالاستقبال من هاتف الغرفة وأخبرهم برقم غرفتك {room}. يمكنهم التحقق مما إذا كان طلبك قد وصل، أو أخذه منك هاتفيًا.',
                 en: 'If this keeps failing, call reception from your room phone and tell them your room number, {room}. They can check whether your order arrived, or take it by phone.' },
    'm03.b01':      { ar: 'إعادة المحاولة', en: 'Retry' },
    'm03.b01.busy': { ar: 'جارٍ الإرسال…', en: 'Sending…' },
    'm03.b02':      { ar: 'إغلاق', en: 'Close' },

    /* ---- M-04 ------------------------------------------------- */
    'm04.c01.one':   { ar: 'منتج لم يعد متوفرًا', en: 'One item is no longer available' },
    'm04.c01.many':  { ar: 'بعض المنتجات لم تعد متوفرة', en: 'Some items are no longer available' },
    'm04.c01.all':   { ar: 'نفد كل ما في طلبك', en: 'Everything in your order has sold out' },
    'm04.c02.one':   { ar: 'لم يتم إرسال طلبك: نفد هذا المنتج. أزله ثم أرسل باقي الطلب.',
                       en: 'Your order was not sent: this item has sold out. Remove it, then send the rest of your order.' },
    'm04.c02.many':  { ar: 'لم يتم إرسال طلبك: نفدت هذه المنتجات. أزلها ثم أرسل باقي الطلب.',
                       en: 'Your order was not sent: these items have sold out. Remove them, then send the rest of your order.' },
    'm04.c02.all':   { ar: 'لم يتم إرسال طلبك ولم يصل إلى الفندق. أزل المنتجات من السلة واختر منتجات أخرى من المتجر.',
                       en: 'Your order was not sent and did not reach the hotel. Remove the items from your cart and choose other products from the store.' },
    'm04.c03.row':   { ar: '{qty} × {name}', en: '{qty} × {name}' },
    'm04.c04':       { ar: 'الإجمالي بعد الإزالة', en: 'Total after removal' },
    'm04.b01.some.one':  { ar: 'إزالته والمتابعة', en: 'Remove it and continue' },
    'm04.b01.some.many': { ar: 'إزالتها والمتابعة', en: 'Remove them and continue' },
    'm04.b01.all.one':   { ar: 'إزالته من السلة', en: 'Remove it from the cart' },
    'm04.b01.all.many':  { ar: 'إزالتها من السلة', en: 'Remove them from the cart' },
    'm04.b02':       { ar: 'العودة إلى السلة', en: 'Back to cart' }
  });

  /* ================================================================
     2. Storage — the checkout draft, and the pending-submission record
        that carries the client order key. G-04 §7.7.
     ================================================================ */

  /* The draft is TAB-scoped: closing the tab destroys the typed values
     (G-04 §7.7, criterion 44). sessionStorage is exactly that lifetime. */
  var DRAFT_KEY = 'roomstore.checkoutDraft';
  /* The pending-submission record is DEVICE-scoped, in the same storage as
     the cart and the order list, never in the draft (G-04 §7.7 rule 7). */
  var PENDING_KEY = 'roomstore.pendingSubmission';
  /* G-04 §7.7 rule 9 (c): the record expires 24 hours after the first send. */
  var PENDING_MAX_AGE = 24 * 60 * 60 * 1000;

  var NOTES_MAX = 200;      /* G-04 §7.2 */
  var ROOM_MAX = 5;         /* G-04 §7.1 — 1 to 5 digits */
  var AMOUNT_MAX = 5;       /* G-04 §7.4 */
  var SUBMIT_DEBOUNCE = 300;/* G-04 §7.6 rule 7 */
  var ARM_DELAY = 300;      /* M-01 §7.2 */
  var SEND_TIMEOUT = 15000; /* M-01 §7.3 rule 7; M-03 §7.3 */
  var HEADER_H = 56;        /* G-04 §4 S01 */

  function emptyDraft() {
    return {
      room: '',       /* raw, as typed (G-04 §7.7) */
      notes: '',
      payment: '',    /* '' | 'card' | 'cash' — no default (G-04 §7.3) */
      amount: '',
      awaiting: false,/* the awaiting-resubmission flag behind C13 */
      attempts: 0,    /* M-03 §7.2, stored with the draft */
      lastTotal: null /* the total at the previous render (G-04 §7.5 rule 8) */
    };
  }

  function readDraft() {
    try {
      var raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return emptyDraft();
      var d = JSON.parse(raw);
      var base = emptyDraft();
      for (var k in base) {
        if (Object.prototype.hasOwnProperty.call(base, k) && d[k] !== undefined) base[k] = d[k];
      }
      return base;
    } catch (e) { return emptyDraft(); }
  }

  function saveDraft(d) {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) {}
  }

  function clearDraft() {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) {}
    draft = emptyDraft();
  }

  function readPending() {
    try {
      var raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      var r = JSON.parse(raw);
      if (!r || !r.key) return null;
      /* rule 9 (c): 24 hours after the recorded time of first send. */
      if (r.firstSentAt && (Date.now() - r.firstSentAt) > PENDING_MAX_AGE) {
        clearPending();
        return null;
      }
      return r;
    } catch (e) { return null; }
  }

  function writePending(r) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(r)); } catch (e) {}
  }

  function clearPending() {
    try { localStorage.removeItem(PENDING_KEY); } catch (e) {}
  }

  function newKey() {
    return 'k-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /* The client order key the device currently holds.
     G-04 §7.7 rule 1: generated once per checkout session, the first time B05
     opens M-01 — unless an unresolved pending-submission record exists, whose
     key is adopted instead (rule 8).
     G-04 §7.7 rule 2: NEVER replaced because a value changed.
     G-04 §7.7 rule 3: replaced in exactly one case — when M-04 opens. */
  var sessionKey = null;

  function acquireKey() {
    if (sessionKey) return sessionKey;
    var rec = readPending();
    sessionKey = (rec && rec.key) ? rec.key : newKey();   /* rule 8, then rule 1 */
    return sessionKey;
  }

  /* M-01 §7.3 rule 9 — written in the same synchronous step as the in-flight
     lock, before any response can arrive. Exactly five values, none displayed.
     If a record for this key already exists, its time of first send is kept. */
  function writePendingRecord(payload) {
    var old = readPending();
    writePending({
      key: payload.key,
      firstSentAt: (old && old.key === payload.key && old.firstSentAt) ? old.firstSentAt : Date.now(),
      roomNumber: payload.roomNumber,
      total: payload.total,
      lineCount: payload.lines.length
    });
  }

  /* G-04 §7.7 rule 9 (a) and (b) — the key and the record are discarded
     together: on an applied success-side response, or on an emptied cart. */
  function discardKeyAndRecord() {
    sessionKey = null;
    clearPending();
  }

  var draft = readDraft();

  /* ================================================================
     3. Values — digits, trimming, money, cart lines
     ================================================================ */

  /* G-04 §7.1 / §7.4: Arabic-Indic (U+0660–0669) and Extended Arabic-Indic
     (U+06F0–06F9) digits are accepted and converted to 0–9 AS THEY ARE TYPED.
     Nothing else is converted or stripped — a wrong character must survive so
     that the guest sees the error that explains it. */
  function toWestern(s) {
    return String(s == null ? '' : s)
      .replace(/[٠-٩]/g, function (c) {
        return String.fromCharCode(c.charCodeAt(0) - 0x0660 + 48);
      })
      .replace(/[۰-۹]/g, function (c) {
        return String.fromCharCode(c.charCodeAt(0) - 0x06F0 + 48);
      });
  }

  /* G-04 §7: "trim" = remove spaces, tabs and line breaks at both ends. */
  function trim(s) {
    return String(s == null ? '' : s).replace(/^[\s ]+/, '').replace(/[\s ]+$/, '');
  }

  /* G-04 §7.2: the 200 counted as user-perceived characters — one emoji is 1,
     one line break is 1. Surrogate pairs are counted as a single character. */
  function chars(s) {
    return String(s == null ? '' : s).match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S]/g) || [];
  }
  function charCount(s) { return chars(s).length; }
  function cutTo(s, n) { return chars(s).slice(0, n).join(''); }

  function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  function cartLines() {
    return (window.Store && Store.cart) ? Store.cart : [];
  }

  /* The unit price as held in the session catalog copy, falling back to the
     line's own snapshot when the product has left it (CONTRACT "Store", G-01
     §7.2 as revised, G-03 decision 10). The contract's sessionCatalog entry
     carries only {outOfStock, present}, so the snapshot is the price source
     unless store.js also parks a price there. */
  function unitPrice(line) {
    var mark = Store.sessionCatalog ? Store.sessionCatalog[line.productId] : null;
    if (mark && typeof mark.price === 'number') return mark.price;
    if (line.snapshot && typeof line.snapshot.price === 'number') return line.snapshot.price;
    return 0;
  }

  function lineTotal(line) { return round2(unitPrice(line) * (Number(line.qty) || 0)); }

  function sumLines(lines) {
    var t = 0;
    for (var i = 0; i < lines.length; i++) t += lineTotal(lines[i]);
    return round2(t);
  }

  /* G-04 §7.5 rule 2 — one total, used in C04, in B05 and in the {total} of
     the "lower than total" message. Store.cartTotal() is the authoritative
     computation (CONTRACT), so G-03 and G-04 can never disagree. */
  function cartTotal() {
    if (window.Store && typeof Store.cartTotal === 'function') return round2(Store.cartTotal());
    return sumLines(cartLines());
  }

  /* Name in the current language; the Arabic name is shown in the English
     interface when the English name is missing (G-01 §5.4, M-04 §5.3). */
  function lineName(line) {
    var s = line.snapshot || {};
    if (I18N.lang === 'en') return s.nameEn || s.nameAr || '';
    return s.nameAr || s.nameEn || '';
  }

  function isMarkedOutOfStock(productId) {
    var m = Store.sessionCatalog ? Store.sessionCatalog[productId] : null;
    return !!(m && m.outOfStock);
  }

  /* ================================================================
     4. Validation — G-04 §7.1, §7.3, §7.4
     ================================================================ */

  /* G-04 §7.1. Exactly three cases, in this priority order. There is no
     "too short" case and none may be added: with a minimum of one digit the
     only short value is an empty one, which has its own message.
     `includeEmpty` is false for blur validation (the empty check fires on
     submit only) and true once "Submit order" has been tapped. */
  function roomError(raw, includeEmpty) {
    var v = trim(toWestern(raw));
    var rule = roomRule();
    if (!v) return includeEmpty ? 'g04.err.room.empty' : null;
    if (!rule.pattern.test(v)) return rule.isDefault ? 'g04.err.room.chars' : 'g04.err.room.rule.chars';
    if (v.length > rule.maxLen) return rule.isDefault ? 'g04.err.room.long' : 'g04.err.room.rule.long';
    /* Reachable only when the manager raised the minimum above 1 (never with
       the default rule). Checked on submit only, like the empty case: unlike
       the two blur checks, a short value CAN become valid by typing more. */
    if (includeEmpty && v.length < rule.minLen) return 'g04.err.room.rule.short';
    return null;
  }

  /* The room-number rule comes from the hotel's settings (shared/hotel-db.js,
     HotelDB.roomRule()), set by the manager in A-07 / AM-04. The DEFAULT rule
     is exactly G-04 §7.1 — digits only, 1 to 5 — and uses the three reviewed
     messages above, unchanged. A non-default rule brings its own messages from
     HotelDB (provisional until the admin spec rules them); they are registered
     under separate keys, so the three §7.1 strings are never touched. */
  var DEFAULT_ROOM_RULE = { pattern: /^[0-9]+$/, minLen: 1, maxLen: ROOM_MAX,
                            allowLetters: false, separator: '', isDefault: true };

  function roomRule() {
    var rule = null;
    try { rule = window.HotelDB ? HotelDB.roomRule() : null; } catch (e) { rule = null; }
    if (!rule || !(rule.pattern instanceof RegExp)) return DEFAULT_ROOM_RULE;
    if (!rule.isDefault && rule.messages) {
      I18N.register({
        'g04.err.room.rule.chars': rule.messages.chars,
        'g04.err.room.rule.long':  rule.messages.long,
        'g04.err.room.rule.short': rule.messages.short
      });
    }
    return rule;
  }

  /* F01's keyboard attributes. The default rule keeps exactly the digits-only
     keypad of G-04 §7.1; a rule that allows letters or a separator needs the
     text keyboard, since the numeric keypad cannot type them. */
  function roomInputAttrs() {
    var rule = roomRule();
    if (rule.allowLetters || rule.separator) return 'type="text" inputmode="text" ';
    return 'type="text" inputmode="numeric" pattern="[0-9]*" ';
  }

  /* G-04 §7.4. Three cases, in this priority order. An empty field never
     errors. An amount lower than the total BLOCKS submission — it is an
     error, not a warning. An amount equal to the total is valid. */
  function amountError(raw, total) {
    var v = trim(toWestern(raw));
    if (!v) return null;
    if (!/^[0-9]+$/.test(v)) return 'g04.err.amount.chars';
    if (v.length > AMOUNT_MAX) return 'g04.err.amount.long';
    if (Number(v) + 1e-9 < total) return 'g04.err.amount.low';
    return null;
  }

  /* G-04 §7.4 "Leading zeros": rewritten on blur — "0100" becomes "100",
     "0" stays "0". Only a value that is all digits is rewritten. */
  function stripLeadingZeros(v) {
    if (!/^[0-9]+$/.test(v)) return v;
    return v.replace(/^0+(?=[0-9])/, '');
  }

  /* ================================================================
     5. G-04 — Checkout
     ================================================================ */

  var leaving = false;        /* a success is navigating away; draw nothing */
  var guardTripped = false;   /* §3.1 guard fired on this render */
  var lastSubmitTap = 0;      /* §7.6 rule 7 debounce */
  var roomMode = 'blur';      /* 'blur' | 'submit' — see roomError() */
  var showC14 = false;        /* C14 is transient, never persisted */
  var pasteInNotes = false;
  /* Raised around the device writes M-04 performs as it opens: those writes
     can fire Store's change event, which re-renders G-04 before the modal
     wrapper has been appended, and the §3.1 guard must not fire then. */
  var suppressGuard = false;

  function modalOpen() {
    var host = document.getElementById('modal-root');
    return !!(host && host.children.length);
  }

  /* §3.1 "Guard on every render": zero cart lines, or any line marked out of
     stock in the session catalog copy, and G-04 is not drawn — G-03 replaces
     it in the history. The guard does not run while one of this screen's own
     modals is open on top of it (M-01, M-03, M-04 all sit over a live G-04). */
  function guardFails() {
    var lines = cartLines();
    if (!lines.length) return true;
    for (var i = 0; i < lines.length; i++) {
      if (isMarkedOutOfStock(lines[i].productId)) return true;
    }
    return false;
  }

  /* .error carries the shared "!" icon slot as a pseudo-element, so the view
     writes the message and nothing else; the text is the node's own content,
     which is what setError() below rewrites. */
  function errorHtml(id, text, hidden) {
    return '<p class="error" data-el="' + id + '" id="' + id + '" role="alert"' +
           (hidden ? ' hidden' : '') + '>' + (text ? esc(text) : '') + '</p>';
  }

  function summaryHtml(total) {
    var lines = cartLines();
    var h = '<section class="panel" data-el="G-04-S02">';
    h += '<h2 class="panel__title" data-el="G-04-C02">' + esc(t('g04.c02')) + '</h2>';
    /* §5.2: one line per cart line, in cart order, all of them, no expander. */
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      h += '<p class="row row--split small" data-el="G-04-C03">' +
             '<span class="line__name">' +
               t('g04.c03.line', { qty: Number(line.qty) || 0, name: esc(lineName(line)) }) +
             '</span>' +
             '<span class="line__price">' + esc(money(lineTotal(line))) + '</span>' +
           '</p>';
    }
    h += '<hr class="divider">';
    h += '<p class="total" data-el="G-04-C04">' +
           '<span class="total__label">' + esc(t('g04.c04')) + '</span>' +
           '<span class="total__value">' + esc(money(total)) + '</span></p>';
    h += '<button type="button" class="btn btn--link" data-el="G-04-B02">' +
           esc(t('g04.b02')) + '</button>';
    h += '</section>';
    return h;
  }

  /* C11 + F03 (+ C12) are RENDERED ONLY while Cash is selected (§4, criterion
     24: with Card they are not rendered at all). */
  function cashBlockHtml(amountValue, amountErr, total) {
    return '<div class="field' + (amountErr ? ' field--error' : '') + '">' +
      '<div data-el="G-04-C11">' +
        '<label class="field__label" for="g04-f03">' + esc(t('g04.c11.line1')) + '</label>' +
        '<span class="field__hint">' + esc(t('g04.c11.line2')) + '</span>' +
      '</div>' +
      '<div class="field__wrap">' +
        '<input id="g04-f03" class="field__input" data-el="G-04-F03" type="text" ' +
          'inputmode="numeric" pattern="[0-9]*" autocomplete="off" autocorrect="off" ' +
          'autocapitalize="off" spellcheck="false" aria-describedby="G-04-C12" ' +
          'aria-invalid="' + (amountErr ? 'true' : 'false') + '" ' +
          'value="' + esc(amountValue) + '">' +
        '<span class="field__suffix" aria-hidden="true">' + esc(t('g04.f03.currency')) + '</span>' +
      '</div>' +
      errorHtml('G-04-C12', amountErr ? t(amountErr, { total: money(total) }) : '', !amountErr) +
    '</div>';
  }

  Views['G-04'] = {
    render: function () {
      guardTripped = false;
      if (leaving) return '';

      if (!modalOpen() && !suppressGuard) {
        if (guardFails()) { guardTripped = true; return ''; }
      } else if (!cartLines().length) {
        /* A modal just emptied the cart and is navigating; draw nothing. */
        return '';
      }

      draft = readDraft();
      var total = cartTotal();

      /* §7.5 rule 8 — re-validation on total change. Whenever G-04 is
         rendered and the total differs from the total at the previous render
         in this tab, and Cash is selected and F03 is not empty, the
         "lower than total" rule runs immediately. No other field is touched,
         and no other error is ever shown before the guest interacts (§7.6
         rule 8). */
      var amountErr = null;
      if (draft.payment === 'cash' && trim(draft.amount) !== '' &&
          draft.lastTotal !== null && draft.lastTotal !== total) {
        if (amountError(draft.amount, total) === 'g04.err.amount.low') {
          amountErr = 'g04.err.amount.low';
        }
      }
      draft.lastTotal = total;
      saveDraft(draft);

      var notesCount = charCount(draft.notes);
      var chevron = I18N.lang === 'ar' ? '›' : '‹';

      var h = '<div class="screen screen--checkout">';

      /* ---- S01 header ---- */
      h += '<header class="topbar" data-el="G-04-S01">' +
             '<div class="topbar__side">' +
               '<button type="button" class="iconbtn" data-el="G-04-B01" ' +
                 'aria-label="' + esc(t('g04.b01.aria')) + '">' +
                 '<span class="iconbtn__glyph" aria-hidden="true">' + chevron + '</span>' +
               '</button>' +
             '</div>' +
             '<div class="topbar__main">' +
               '<h1 class="topbar__title" data-el="G-04-C01">' + esc(t('g04.c01')) + '</h1>' +
             '</div>' +
             '<div class="topbar__side topbar__side--end" aria-hidden="true"></div>' +
           '</header>';

      /* No padded body wrapper: every block below carries its own inset
         (.panel has a margin, .field a padding, .section__title a padding),
         which is how the stylesheet composes a screen. */
      h += '<div>';

      /* ---- C13: persistent notice, only while the awaiting-resubmission
             flag is set. Never shown after M-03 (§4, C13 row). ---- */
      if (draft.awaiting) {
        h += '<div class="pad">' +
               '<p class="notice" data-el="G-04-C13" role="status">' +
                 '<span>' + esc(t('g04.c13')) + '</span></p>' +
             '</div>';
      }

      /* ---- S02 summary ---- */
      h += summaryHtml(total);

      /* ---- S03 room number ---- */
      h += '<section class="field" data-el="G-04-S03">' +
             '<label class="field__label" for="g04-f01" data-el="G-04-C05">' +
               esc(t('g04.c05')) + '</label>' +
             '<input id="g04-f01" class="field__input field__input--big" data-el="G-04-F01" ' +
               roomInputAttrs() + 'autocomplete="off" ' +
               'autocorrect="off" autocapitalize="off" spellcheck="false" ' +
               'aria-describedby="G-04-C06" aria-invalid="false" ' +
               'value="' + esc(draft.room) + '">' +
             errorHtml('G-04-C06', '', true) +
           '</section>';

      /* ---- S04 notes ---- */
      h += '<section class="field" data-el="G-04-S04">' +
             '<label class="field__label" for="g04-f02" data-el="G-04-C07">' +
               esc(t('g04.c07')) + '</label>' +
             '<textarea id="g04-f02" class="field__area" data-el="G-04-F02" rows="3">' +
               esc(draft.notes) + '</textarea>' +
             '<p class="field__counter' + (notesCount >= NOTES_MAX ? ' field__counter--full' : '') +
               '" data-el="G-04-C08">' + esc(t('g04.c08', { n: notesCount })) + '</p>' +
             '<p class="notice notice--flat" data-el="G-04-C14" role="status" hidden>' +
               '<span>' + esc(t('g04.c14')) + '</span></p>' +
           '</section>';

      /* ---- S05 payment: no option is selected by default (§5.5) ---- */
      h += '<section data-el="G-04-S05">' +
             '<h2 class="section__title" id="G-04-C09" data-el="G-04-C09">' +
               esc(t('g04.c09')) + '</h2>' +
             '<div class="pad-x" role="radiogroup" aria-labelledby="G-04-C09">' +
               payOptionHtml('G-04-B03', 'g04.b03', draft.payment === 'card') +
               payOptionHtml('G-04-B04', 'g04.b04', draft.payment === 'cash') +
             '</div>' +
             '<div class="pad-x">' + errorHtml('G-04-C10', '', true) + '</div>' +
             '<div data-slot="cash">' +
               (draft.payment === 'cash' ? cashBlockHtml(draft.amount, amountErr, total) : '') +
             '</div>' +
           '</section>';

      h += '</div>'; /* body */

      /* ---- S06 bottom bar. B05 is NEVER disabled (§7.6 rule 1). ---- */
      h += '<div class="actionbar" data-el="G-04-S06">' +
             '<button type="button" class="btn btn--primary btn--block" data-el="G-04-B05">' +
               '<span>' + esc(t('g04.b05')) + '</span>' +
               '<span class="num bold">' + esc(money(total)) + '</span>' +
             '</button>' +
           '</div>';

      h += '</div>';
      return h;
    },

    mount: function (root) {
      if (guardTripped) {
        /* G-03 replaces G-04 in the history, so the guest cannot go "back"
           to a G-04 that was never shown (§3.1). An emptied cart also ends
           the checkout session, discarding the key (§7.7 rule 9 b). */
        if (!cartLines().length) { discardKeyAndRecord(); clearDraft(); }
        App.replace('/cart');
        return;
      }
      if (leaving || !root.querySelector('[data-el="G-04-B05"]')) return;

      /* §7.6 rule 8: errors are never shown before the guest interacts, so a
         freshly drawn G-04 starts with the blur ruleset again — the empty
         room-number message belongs to submit alone. */
      roomMode = 'blur';

      var f01 = root.querySelector('[data-el="G-04-F01"]');
      var f02 = root.querySelector('[data-el="G-04-F02"]');
      var c06 = root.querySelector('[data-el="G-04-C06"]');
      var c08 = root.querySelector('[data-el="G-04-C08"]');
      var c14 = root.querySelector('[data-el="G-04-C14"]');
      var c10 = root.querySelector('[data-el="G-04-C10"]');
      var cashSlot = root.querySelector('[data-slot="cash"]');

      showC14 = false;

      function markField(inputEl, on) {
        var field = inputEl.closest ? inputEl.closest('.field') : null;
        if (field) field.classList.toggle('field--error', !!on);
      }

      function setError(errEl, inputEl, key, vars) {
        if (!errEl) return;
        if (key) {
          errEl.textContent = t(key, vars);
          errEl.removeAttribute('hidden');
          if (inputEl) {
            /* The stylesheet draws the error state from the field wrapper
               (.field--error .field__input), so the modifier goes there. */
            markField(inputEl, true);
            inputEl.setAttribute('aria-invalid', 'true');
          }
        } else {
          errEl.setAttribute('hidden', 'hidden');
          errEl.textContent = '';
          if (inputEl) {
            markField(inputEl, false);
            inputEl.setAttribute('aria-invalid', 'false');
          }
        }
      }

      function amountInput() { return root.querySelector('[data-el="G-04-F03"]'); }
      function amountErrEl() { return root.querySelector('[data-el="G-04-C12"]'); }

      function validateRoom() {
        /* §7.6 rule 4: once an error is shown, every keystroke re-validates
           and removes it the moment the value is valid. The empty case is
           only ever part of the set after "Submit order" was tapped. */
        var key = roomError(f01.value, roomMode === 'submit');
        setError(c06, f01, key);
        return key;
      }

      function validateAmount() {
        var input = amountInput();
        if (!input) return null;
        var key = amountError(input.value, cartTotal());
        setError(amountErrEl(), input, key, { total: money(cartTotal()) });
        return key;
      }

      /* ---- F01: Arabic-Indic digits converted as they are typed (§7.1) ---- */
      f01.addEventListener('input', function () {
        var caret = null;
        try { caret = f01.selectionStart; } catch (e) {}
        var conv = toWestern(f01.value);
        if (conv !== f01.value) {
          f01.value = conv;                       /* 1:1 substitution, caret holds */
          if (caret !== null) { try { f01.setSelectionRange(caret, caret); } catch (e) {} }
        }
        draft.room = f01.value;
        saveDraft(draft);
        if (c06 && !c06.hasAttribute('hidden')) validateRoom();
      });

      /* §7.1: wrong characters and too long fire on blur; empty does not. */
      f01.addEventListener('blur', function () { validateRoom(); });

      /* ---- F02: hard cap at 200, counter always visible, C14 on a cut
             paste only (§7.2) ---- */
      f02.addEventListener('paste', function () { pasteInNotes = true; });

      f02.addEventListener('input', function () {
        var wasPaste = pasteInNotes;
        pasteInNotes = false;

        /* C14 is hidden again on the next change to F02, whatever it is. */
        if (showC14) { showC14 = false; c14.setAttribute('hidden', 'hidden'); }

        if (charCount(f02.value) > NOTES_MAX) {
          var caret = null;
          try { caret = f02.selectionStart; } catch (e) {}
          f02.value = cutTo(f02.value, NOTES_MAX);
          if (caret !== null) {
            var pos = Math.min(caret, f02.value.length);
            try { f02.setSelectionRange(pos, pos); } catch (e) {}
          }
          /* The 201st TYPED character is simply not entered — no message.
             A pasted text longer than the room left is cut and C14 is shown. */
          if (wasPaste) { showC14 = true; c14.removeAttribute('hidden'); }
        }

        var n = charCount(f02.value);
        c08.textContent = t('g04.c08', { n: n });
        if (n >= NOTES_MAX) c08.classList.add('field__counter--full');
        else c08.classList.remove('field__counter--full');

        draft.notes = f02.value;
        saveDraft(draft);
      });

      /* ---- B03 / B04: radio behaviour, no way back to "neither" (§7.3) ---- */
      function selectPayment(which) {
        if (draft.payment === which) return;   /* tapping the selected row does nothing */
        draft.payment = which;

        var b03 = root.querySelector('[data-el="G-04-B03"]');
        var b04 = root.querySelector('[data-el="G-04-B04"]');
        b03.classList.toggle('is-selected', which === 'card');
        b03.setAttribute('aria-checked', which === 'card' ? 'true' : 'false');
        b04.classList.toggle('is-selected', which === 'cash');
        b04.setAttribute('aria-checked', which === 'cash' ? 'true' : 'false');

        /* Either tap clears C10 (§4, C10 row). */
        setError(c10, null, null);

        if (which === 'card') {
          /* Card hides C11/F03/C12 and CLEARS the amount and its error, so an
             amount is never sent with a card order (§7.4 "Shown"). */
          draft.amount = '';
          cashSlot.innerHTML = '';
        } else {
          cashSlot.innerHTML = cashBlockHtml(draft.amount, null, cartTotal());
          bindAmount();
          /* F03 is not focused automatically (§3.2, B04 row). */
        }
        saveDraft(draft);
      }

      function bindAmount() {
        var input = amountInput();
        if (!input) return;
        input.addEventListener('input', function () {
          var caret = null;
          try { caret = input.selectionStart; } catch (e) {}
          var conv = toWestern(input.value);
          if (conv !== input.value) {
            input.value = conv;
            if (caret !== null) { try { input.setSelectionRange(caret, caret); } catch (e) {} }
          }
          draft.amount = input.value;
          saveDraft(draft);
          var errEl = amountErrEl();
          if (errEl && !errEl.hasAttribute('hidden')) validateAmount();
        });
        input.addEventListener('blur', function () {
          /* §7.4: leading zeros are rewritten on blur; this is the only value
             the validation itself ever changes (§7.6 rule 6). */
          var rewritten = stripLeadingZeros(trim(toWestern(input.value)));
          if (rewritten !== input.value) input.value = rewritten;
          draft.amount = input.value;
          saveDraft(draft);
          validateAmount();
        });
      }
      bindAmount();

      root.querySelector('[data-el="G-04-B03"]')
        .addEventListener('click', function () { selectPayment('card'); });
      root.querySelector('[data-el="G-04-B04"]')
        .addEventListener('click', function () { selectPayment('cash'); });

      /* ---- B01 / B02: both go to G-03 with the draft kept (§3.2) ---- */
      root.querySelector('[data-el="G-04-B01"]')
        .addEventListener('click', function () { App.go('/cart'); });
      root.querySelector('[data-el="G-04-B02"]')
        .addEventListener('click', function () { App.go('/cart'); });

      /* ---- B05: validation sequence (§7.6) ---- */
      root.querySelector('[data-el="G-04-B05"]').addEventListener('click', function () {
        /* rule 7: further taps are ignored for 300 ms, so a double-tap can
           never open M-01 twice or run the validation twice. */
        var now = Date.now();
        if (now - lastSubmitTap < SUBMIT_DEBOUNCE) return;
        lastSubmitTap = now;

        /* rule 2: close the keyboard and blur the focused field, which fires
           that field's own blur validation. */
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur();
        }

        roomMode = 'submit';
        var total = cartTotal();

        var rErr = roomError(f01.value, true);
        var pErr = draft.payment ? null : 'g04.err.pay';
        var aErr = (draft.payment === 'cash' && amountInput())
          ? amountError(amountInput().value, total) : null;

        /* rule 3: ALL failing elements show their error at once. */
        setError(c06, f01, rErr);
        setError(c10, null, pErr);
        if (amountInput()) setError(amountErrEl(), amountInput(), aErr, { total: money(total) });

        /* rule 3: scroll to the FIRST failing element in the order
           F01 → payment → F03, and focus it when it is a field. */
        if (rErr) { scrollToLabel(root.querySelector('[data-el="G-04-C05"]')); focusField(f01); return; }
        if (pErr) { scrollToLabel(root.querySelector('[data-el="G-04-C09"]')); return; }
        if (aErr) { scrollToLabel(root.querySelector('[data-el="G-04-C11"]')); focusField(amountInput()); return; }

        /* §6.4 success: C13 and C14 are removed and the awaiting-resubmission
           flag is cleared at the moment M-01 opens. */
        if (draft.awaiting) {
          draft.awaiting = false;
          saveDraft(draft);
          var c13 = root.querySelector('[data-el="G-04-C13"]');
          if (c13 && c13.parentNode) c13.parentNode.removeChild(c13);
        }
        if (showC14) { showC14 = false; c14.setAttribute('hidden', 'hidden'); }

        /* §7.8: the handoff. The order is NEVER sent from G-04 (locked
           decision 2); only M-01's "Confirm and send" sends it. */
        var payload = buildPayload(f01.value, f02.value, draft.payment,
                                   amountInput() ? amountInput().value : '', total);
        App.openModal('M-01', { room: payload.roomNumber, payload: payload });
      });
    }
  };

  /* §4 B03 / B04 — identical rows, label on line 1 and helper on line 2. */
  function payOptionHtml(id, copyKey, selected) {
    return '<button type="button" class="choice' + (selected ? ' is-selected' : '') +
      '" data-el="' + id + '" role="radio" aria-checked="' + (selected ? 'true' : 'false') + '">' +
      '<span class="choice__mark" aria-hidden="true"></span>' +
      '<span>' +
        '<span class="choice__label">' + esc(t(copyKey + '.line1')) + '</span>' +
        '<span class="choice__sub">' + esc(t(copyKey + '.line2')) + '</span>' +
      '</span></button>';
  }

  function focusField(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    try { var n = el.value.length; el.setSelectionRange(n, n); } catch (e) {}
  }

  /* §7.6 rule 3: the first failing element's label sits 16 px below the
     56 px header, animated. */
  function scrollToLabel(el) {
    if (!el) return;
    var top = el.getBoundingClientRect().top + (window.pageYOffset || 0) - (HEADER_H + 16);
    if (top < 0) top = 0;
    try { window.scrollTo({ top: top, behavior: 'smooth' }); }
    catch (e) { window.scrollTo(0, top); }
  }

  /* §7.8 — what G-04 hands to M-01, read-only. */
  function buildPayload(roomRaw, notesRaw, payment, amountRaw, total) {
    var lines = cartLines().map(function (line) {
      var s = line.snapshot || {};
      return {
        productId: line.productId,
        qty: Number(line.qty) || 0,
        price: unitPrice(line),
        /* Names in BOTH languages, as held in the session catalog copy at
           open, so the saved record survives a language switch (M-01 §7.4). */
        nameAr: s.nameAr || '',
        nameEn: s.nameEn || ''
      };
    });
    var amt = trim(toWestern(amountRaw));
    return {
      key: acquireKey(),                          /* §7.7 rules 1, 2, 8 */
      roomNumber: trim(toWestern(roomRaw)),       /* trimmed, leading zeros kept */
      notes: trim(notesRaw),                      /* only spaces/breaks → empty */
      payment: payment,
      amount: (payment === 'cash' && amt !== '') ? Number(amt) : null,
      total: total,
      lang: I18N.lang,
      lines: lines
    };
  }

  /* ================================================================
     6. The one send, shared by M-01's "Confirm and send" and M-03's "Retry"
     ================================================================ */

  /* M-01 §7.5 — four buckets, no fifth. Every result of the request falls
     into exactly one of: success (three kinds), stock rejection, failure. */
  function sendAttempt(payload, done) {
    var settled = false;
    var sentAt = Date.now();
    var timer = null;
    var visHandler = null;

    function settle(bucket, data) {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (visHandler) document.removeEventListener('visibilitychange', visHandler);
      done(bucket, data);
    }

    /* M-01 §7.3 rule 7 / §3.3: 15 seconds of WALL-CLOCK time from the moment
       the request was sent, not a timer that pauses in the background. */
    function checkTimeout() {
      if (Date.now() - sentAt >= SEND_TIMEOUT) settle('failure', { kind: 'timeout' });
    }
    timer = setTimeout(checkTimeout, SEND_TIMEOUT);
    visHandler = function () { if (!document.hidden) checkTimeout(); };
    document.addEventListener('visibilitychange', visHandler);

    Server.submitOrder(payload).then(function (res) {
      /* M-01 §3.3: a response arriving after M-01 has left the loading state
         is discarded and never applied. */
      if (settled) return;
      if (res && (res.kind === 'created' || res.kind === 'existing-identical' ||
                  res.kind === 'existing-different')) {
        settle('success', res);
      } else {
        settle('failure', { kind: 'server-error' });  /* unrecognized response */
      }
    }, function (err) {
      err = err || {};
      if (settled) {
        /* M-03 §5.4 last row: a stock rejection arriving after the timeout
           still writes its out-of-stock marks, without opening M-04. */
        if (err.type === 'outOfStock' && err.ids && err.ids.length) markOutOfStock(err.ids);
        return;
      }
      if (err.type === 'outOfStock') {
        /* M-03 §5.4 / M-04 §3.1: a rejection whose list is empty or
           unreadable is NOT a stock rejection — it is a server failure. */
        if (err.ids && err.ids.length) settle('stock', { ids: err.ids });
        else settle('failure', { kind: 'server-error' });
      } else if (err.type === 'noConnection') {
        settle('failure', { kind: 'no-connection' });
      } else if (err.type === 'timeout') {
        settle('failure', { kind: 'timeout' });
      } else {
        settle('failure', { kind: 'server-error' });
      }
    });
  }

  /* Routes one settled outcome. `payload` is the identical payload that was
     sent; it is what M-03 retries and what M-04 is handed. */
  function handleOutcome(bucket, data, payload) {
    if (bucket === 'success') { applySuccess(data, payload); return; }

    if (bucket === 'stock') {
      /* M-04 §6.2: a rejection whose products are all absent from the cart is
         also treated as a server failure; M-04 is never drawn with no rows. */
      var rows = rejectedLines(data.ids);
      if (!rows.length) { openFailure(payload, 'server-error'); return; }
      App.closeAllModals();
      App.openModal('M-04', { ids: data.ids, payload: payload });
      return;
    }

    openFailure(payload, data.kind);
  }

  function openFailure(payload, kind) {
    /* M-03 §7.2: the attempt count starts at 1 when M-03 first opens for a
       key and rises by one per failed attempt; C04 appears from 3. */
    draft = readDraft();
    draft.attempts = (Number(draft.attempts) || 0) + 1;
    saveDraft(draft);
    App.closeAllModals();
    App.openModal('M-03', { payload: payload, kind: kind });
  }

  function rejectedLines(ids) {
    var out = [];
    var lines = cartLines();
    for (var i = 0; i < lines.length; i++) {
      for (var j = 0; j < ids.length; j++) {
        if (lines[i].productId === ids[j]) { out.push(lines[i]); break; }
      }
    }
    return out;   /* in cart order (M-04 §5.3) */
  }

  /* M-01 §7.4 — the five steps, in this order, all before G-05 is shown.
     The steps are the same for all three success kinds; only the flag in
     step 5 differs. */
  function applySuccess(res, payload) {
    leaving = true;

    var order = (res && res.order) ? res.order : {};

    /* 1. Save the order record — THE ORDER THE SERVER RETURNED, never the
          payload just sent, and with ITS status, defaulting to New only when
          the response carries no status. Writing New over a status the hotel
          already moved past would promise a cancellation that is gone. */
    var record = {
      orderNo: order.orderNo,
      key: payload.key,
      roomNumber: (order.roomNumber != null) ? order.roomNumber : payload.roomNumber,
      lines: normalizeLines(order.lines, payload.lines),
      notes: (order.notes != null) ? order.notes : payload.notes,
      payment: (order.payment != null) ? order.payment : payload.payment,
      amount: (order.amount !== undefined) ? order.amount : payload.amount,
      total: (order.total != null) ? order.total : payload.total,
      status: order.status || 'New',
      createdAt: order.createdAt || Date.now(),
      cancelledByGuest: false,
      /* G-04 §7.7 rule 5 / M-01 §7.4 step 5: the already-existing flag that
         G-05 reads to draw its notice. It travels on the record so it also
         survives a reload of G-05. */
      alreadyExisting: res.kind === 'existing-different'
    };
    saveOrderRecord(record);

    /* 2. Empty the cart — deliberate for existing-different too: a cart left
          behind would be checked out again under a NEW key and would create
          the real duplicate this contract exists to prevent. */
    emptyCart();

    /* 3. Discard the checkout draft, the client order key and the
          pending-submission record (G-04 §7.7 rule 9 a). */
    clearDraft();
    discardKeyAndRecord();

    /* 4 + 5. Replace G-04 in the history, close M-01 and show G-05. */
    App.closeAllModals();
    App.replace('/submitted/' + encodeURIComponent(String(record.orderNo)));
    leaving = false;
  }

  function normalizeLines(serverLines, payloadLines) {
    var src = (serverLines && serverLines.length) ? serverLines : payloadLines;
    return src.map(function (l) {
      var fallback = null;
      for (var i = 0; i < payloadLines.length; i++) {
        if (payloadLines[i].productId === l.productId) { fallback = payloadLines[i]; break; }
      }
      fallback = fallback || {};
      return {
        productId: l.productId,
        nameAr: l.nameAr || fallback.nameAr || '',
        nameEn: l.nameEn || fallback.nameEn || '',
        qty: (l.qty != null) ? l.qty : fallback.qty,
        price: (l.price != null) ? l.price : fallback.price
      };
    });
  }

  /* ---- The three device writes the CONTRACT does not name a method for.
          Each prefers a store.js method when one exists and falls back to the
          documented state shape, so nothing here invents an API. ---- */

  function saveOrderRecord(record) {
    if (typeof Store.addOrder === 'function') { Store.addOrder(record); return; }
    if (typeof Store.saveOrder === 'function') { Store.saveOrder(record); return; }
    Store.orders.unshift(record);                    /* newest first (CONTRACT) */
    if (typeof Store.save === 'function') Store.save();
    else if (typeof Store.persist === 'function') Store.persist();
  }

  function emptyCart() {
    if (typeof Store.clearCart === 'function') { Store.clearCart(); return; }
    var ids = cartLines().map(function (l) { return l.productId; });
    for (var i = 0; i < ids.length; i++) Store.removeLine(ids[i]);
  }

  /* G-01 §5.7: the marks are written into the session catalog copy and never
     cleared within a session. M-04 is one of the two writers. */
  function markOutOfStock(ids) {
    /* The plural writer takes the list; Store.markOutOfStock takes ONE id, so
       handing it the array would file a mark under a stringified array. */
    if (typeof Store.markManyOutOfStock === 'function') { Store.markManyOutOfStock(ids); return; }
    if (typeof Store.markOutOfStock === 'function') {
      for (var k = 0; k < ids.length; k++) Store.markOutOfStock(ids[k]);
      return;
    }
    if (!Store.sessionCatalog) Store.sessionCatalog = {};
    for (var i = 0; i < ids.length; i++) {
      var entry = Store.sessionCatalog[ids[i]] || { present: true };
      entry.outOfStock = true;
      Store.sessionCatalog[ids[i]] = entry;
    }
  }

  function removeLines(ids) {
    /* M-04 §5.6 step 1 / §7.3: one write, never one line at a time. */
    if (typeof Store.removeLines === 'function') { Store.removeLines(ids); return; }
    for (var i = 0; i < ids.length; i++) Store.removeLine(ids[i]);
  }

  /* ================================================================
     7. M-01 — Confirm room number (not dismissable)
     ================================================================ */

  Modals['M-01'] = {
    render: function (p) {
      var room = String(p.room == null ? '' : p.room);
      /* §5.2: read one digit at a time, so a leading zero is heard. */
      var spoken = room.split('').join(' ');
      return '<div class="dialog" data-el="M-01-S02" role="dialog" aria-modal="true" ' +
               'aria-labelledby="M-01-C01">' +
        '<h2 class="dialog__title" id="M-01-C01" data-el="M-01-C01" tabindex="-1">' +
          esc(t('m01.c01')) + '</h2>' +
        '<p class="dialog__lead" data-el="M-01-C02">' + esc(t('m01.c02')) + '</p>' +
        /* C03: 64 px bold, and NOTHING ELSE from the order is on this card —
           no total, no payment method, no item count (§5.4). .dialog__room is
           the 64px box; nothing else on the screen is near that size. */
        '<div class="dialog__room" data-el="M-01-C03">' +
          '<span dir="ltr" aria-label="' + esc(spoken) + '">' +
            esc(room) + '</span>' +
        '</div>' +
        /* No close control: the modal is not dismissable and its only two
           exits are these buttons (§3.2; the router blocks backdrop and
           Escape for M-01). */
        '<div class="dialog__actions">' +
          '<button type="button" class="btn btn--ghost btn--block" data-el="M-01-B02">' +
            esc(t('m01.b02')) + '</button>' +
          '<button type="button" class="btn btn--primary btn--block" data-el="M-01-B01">' +
            '<span>' + esc(t('m01.b01')) + '</span></button>' +
        '</div>' +
      '</div>';
    },

    mount: function (wrap, p) {
      wrap.setAttribute('data-el', 'M-01-S01');   /* the backdrop is S01 */

      var b01 = wrap.querySelector('[data-el="M-01-B01"]');
      var b02 = wrap.querySelector('[data-el="M-01-B02"]');
      var armedAt = Date.now();
      var inFlight = false;                        /* §7.3 layer 2 */

      function armed() { return Date.now() - armedAt >= ARM_DELAY; }

      b02.addEventListener('click', function () {
        /* §7.2 arming delay, then §3.2: closes at once, nothing is sent,
           the draft and the key are untouched. G-04 focuses F01 again. */
        if (!armed() || inFlight) return;
        App.closeModal();
        var f01 = document.querySelector('[data-el="G-04-F01"]');
        focusField(f01);
      });

      b01.addEventListener('click', function () {
        if (!armed() || inFlight) return;

        /* §7.3 layer 1: the lock happens synchronously on the tap, BEFORE the
           payload is assembled, so no window exists for a second tap. */
        inFlight = true;
        b01.setAttribute('aria-disabled', 'true');
        b01.innerHTML = '<span class="row" data-el="M-01-C04">' +
          '<span class="spinner" aria-hidden="true"></span>' +
          '<span>' + esc(t('m01.c04')) + '</span></span>';
        b02.classList.add('is-disabled');
        b02.setAttribute('aria-disabled', 'true');
        b02.disabled = true;
        App.modalBusy(true);

        /* §7.3 rule 9: the pending-submission record is written in the SAME
           synchronous step as the lock, before any response can arrive. */
        writePendingRecord(p.payload);

        /* §7.3 layer 3: one request per instance. §7.3 layer 4: the key is
           sent exactly as handed — M-01 never creates or changes a key. */
        sendAttempt(p.payload, function (bucket, data) {
          handleOutcome(bucket, data, p.payload);
        });
      });
    }
  };

  /* ================================================================
     8. M-03 — Order not sent
     ================================================================ */

  function m03Variant(kind) {
    /* M-03 §5.2: connection covers "could not be sent / dropped / no response
       within 15 s"; server covers an error or unreadable response. */
    return kind === 'server-error' ? 'server' : 'connection';
  }

  Modals['M-03'] = {
    render: function (p) {
      draft = readDraft();
      var attempts = Number(draft.attempts) || 0;
      var room = String(p.payload.roomNumber == null ? '' : p.payload.roomNumber);

      var h = '<div class="sheet" data-el="M-03-S02" role="dialog" aria-modal="true" ' +
                'aria-labelledby="M-03-C01">' +
        '<h2 class="sheet__title" id="M-03-C01" data-el="M-03-C01" tabindex="-1">' +
          '<span class="sheet__icon" aria-hidden="true">!</span>' +
          '<span>' + esc(t('m03.c01')) + '</span></h2>' +
        '<p class="sheet__body" data-el="M-03-C02">' + esc(t('m03.c02')) + '</p>' +
        /* The variant shown is the one for the LATEST failed attempt. */
        '<p class="sheet__body" data-el="M-03-C03">' +
          esc(t('m03.c03.' + m03Variant(p.kind))) + '</p>';

      /* §5.3: the reception line appears from the 3rd consecutive failed
         attempt for this key, and stays until the attempt count resets. */
      if (attempts >= 3) {
        h += '<hr class="divider">' +
             '<p class="sheet__body" data-el="M-03-C04">' +
               t('m03.c04', { room: esc(room) }) + '</p>';
      }

      h += '<div class="sheet__actions">' +
        '<button type="button" class="btn btn--primary btn--block" data-el="M-03-B01">' +
          '<span>' + esc(t('m03.b01')) + '</span></button>' +
        '<button type="button" class="btn btn--ghost btn--block" data-el="M-03-B02">' +
          esc(t('m03.b02')) + '</button>' +
      '</div></div>';
      return h;
    },

    mount: function (wrap, p) {
      wrap.setAttribute('data-el', 'M-03-S01');
      var b01 = wrap.querySelector('[data-el="M-03-B01"]');
      var b02 = wrap.querySelector('[data-el="M-03-B02"]');
      var inFlight = false;

      b02.addEventListener('click', function () {
        /* §3.2: G-04 is shown exactly as it was; the key is kept and C13 is
           never shown after M-03. */
        if (inFlight) return;
        App.closeModal();
      });

      b01.addEventListener('click', function () {
        if (inFlight) return;
        inFlight = true;

        /* §6.1: B01 inert at 100 % opacity with the spinner and the sending
           label; B02 at 50 % and inert; the backdrop inert (is-busy). */
        b01.setAttribute('aria-disabled', 'true');
        b01.innerHTML = '<span class="row">' +
          '<span class="spinner" aria-hidden="true"></span>' +
          '<span>' + esc(t('m03.b01.busy')) + '</span></span>';
        b02.classList.add('is-disabled');
        b02.setAttribute('aria-disabled', 'true');
        b02.disabled = true;
        App.modalBusy(true);

        /* §5.5 rule 1: the byte-identical payload with the SAME client order
           key. Nothing is recomputed — not the prices, not the total, not the
           language field. Retry writes no second pending record (§5.5 rule 6). */
        sendAttempt(p.payload, function (bucket, data) {
          if (bucket === 'failure') {
            /* §3.1 row 2: the same sheet re-renders in place — count + 1,
               variant per the latest failure, buttons back to rest. */
            draft = readDraft();
            draft.attempts = (Number(draft.attempts) || 0) + 1;
            saveDraft(draft);
            p.kind = data.kind;
            App.modalBusy(false);
            wrap.innerHTML = Modals['M-03'].render(p);
            Modals['M-03'].mount(wrap, p);
            return;
          }
          App.modalBusy(false);
          handleOutcome(bucket, data, p.payload);
        });
      });
    }
  };

  /* ================================================================
     9. M-04 — Items no longer available
     ================================================================ */

  function m04Case(rows) {
    /* §5.2: the case is decided by comparing the rejection list with the
       device cart. "All" means every cart line is listed. */
    var all = rows.length >= cartLines().length;
    if (all) return { all: true, one: rows.length === 1 };
    return { all: false, one: rows.length === 1 };
  }

  Modals['M-04'] = {
    render: function (p) {
      /* §3.1 — ON OPENING, BEFORE ANY TAP:
         (a) an out-of-stock mark is written for EVERY product in the rejection
             list, in the cart or not, because the marks record a fact the
             server stated, not a decision the guest has made;
         (b) in the same step the client order key is replaced with a new one
             and M-03's attempt count is reset to 0. This is the single
             key-replacement case in the whole product (G-04 §7.7 rule 3):
             a stock rejection is the server stating definitively that no
             order was created for that key, which a lost response never does.
             The pending-submission record is NOT deleted — the key it holds
             becomes the new key and its time of first send becomes now. */
      if (!p._opened) {
        p._opened = true;
        suppressGuard = true;
        try {
          markOutOfStock(p.ids);

          var fresh = newKey();
          sessionKey = fresh;
          var rec = readPending();
          writePending({
            key: fresh,
            firstSentAt: Date.now(),               /* the moment M-04 opened */
            roomNumber: rec ? rec.roomNumber : p.payload.roomNumber,
            total: rec ? rec.total : p.payload.total,
            lineCount: rec ? rec.lineCount : p.payload.lines.length
          });

          draft = readDraft();
          draft.attempts = 0;                      /* M-03 §7.2 reset */
          saveDraft(draft);
        } finally {
          suppressGuard = false;
        }
      }

      var rows = rejectedLines(p.ids);
      p._rows = rows;
      var kind = m04Case(rows);

      var c01Key = kind.all ? 'm04.c01.all' : (kind.one ? 'm04.c01.one' : 'm04.c01.many');
      var c02Key = kind.all ? 'm04.c02.all' : (kind.one ? 'm04.c02.one' : 'm04.c02.many');
      var b01Key = kind.all
        ? (kind.one ? 'm04.b01.all.one' : 'm04.b01.all.many')
        : (kind.one ? 'm04.b01.some.one' : 'm04.b01.some.many');

      var h = '<div class="sheet" data-el="M-04-S02" role="dialog" aria-modal="true" ' +
                'aria-labelledby="M-04-C01">' +
        '<h2 class="sheet__title" id="M-04-C01" data-el="M-04-C01" tabindex="-1">' +
          esc(t(c01Key)) + '</h2>' +
        /* Every variant opens with the plain statement that the order was not
           sent, in the same words G-04-C13 uses (§5.2). */
        '<p class="sheet__body" data-el="M-04-C02">' + esc(t(c02Key)) + '</p>';

      /* §5.3: four rows visible, the half fifth row is the scroll cue; no
         "show more", no arrow, no count line. Rows carry name and quantity
         only — no image, no price, no control. */
      h += '<div data-el="M-04-S03">';
      for (var i = 0; i < rows.length; i++) {
        h += '<p class="line line--plain" data-el="M-04-C03">' +
               t('m04.c03.row', {
                 qty: Number(rows[i].qty) || 0,
                 name: esc(lineName(rows[i]))
               }) + '</p>';
      }
      h += '</div>';

      /* §5.4: the new total, directly under the list, in the "some" cases
         only. Hidden in the "all" case — 0.00 is not shown. */
      if (!kind.all) {
        var remaining = [];
        var lines = cartLines();
        for (var j = 0; j < lines.length; j++) {
          var listed = false;
          for (var k = 0; k < rows.length; k++) {
            if (rows[k].productId === lines[j].productId) { listed = true; break; }
          }
          if (!listed) remaining.push(lines[j]);
        }
        h += '<p class="total" data-el="M-04-C04">' +
               '<span class="total__label">' + esc(t('m04.c04')) + '</span>' +
               '<span class="total__value">' + esc(money(sumLines(remaining))) + '</span></p>';
      }

      h += '<div class="sheet__actions">' +
        '<button type="button" class="btn btn--primary btn--block" data-el="M-04-B01">' +
          esc(t(b01Key)) + '</button>' +
        '<button type="button" class="btn btn--ghost btn--block" data-el="M-04-B02">' +
          esc(t('m04.b02')) + '</button>' +
      '</div></div>';
      return h;
    },

    mount: function (wrap, p) {
      wrap.setAttribute('data-el', 'M-04-S01');
      var b01 = wrap.querySelector('[data-el="M-04-B01"]');
      var b02 = wrap.querySelector('[data-el="M-04-B02"]');
      var done = false;

      b01.addEventListener('click', function () {
        /* §4 B01: further taps are ignored once tapped, so a double-tap can
           neither remove twice nor navigate twice. */
        if (done) return;
        done = true;

        var ids = (p._rows || []).map(function (l) { return l.productId; });
        removeLines(ids);                          /* §5.6 step 1, one write */

        if (cartLines().length) {
          /* §3.2: back to G-04, scrolled to the top, summary rebuilt, every
             form value kept, the amount re-validated against the new total,
             and C13 shown with the awaiting-resubmission flag set. */
          draft = readDraft();
          draft.awaiting = true;
          saveDraft(draft);
          App.closeModal();
          App.render();
        } else {
          /* §3.2: the cart became empty — G-04 is popped and G-03 shows its
             empty state. The key and the record go with the emptied cart
             (G-04 §7.7 rule 9 b). */
          discardKeyAndRecord();
          clearDraft();
          App.closeModal();
          App.replace('/cart');
        }
      });

      b02.addEventListener('click', function () {
        if (done) return;
        done = true;
        exitToCart(true);
      });
    },

    /* The backdrop and browser back are identical to B02 (§3.2). The router
       calls onDismiss and then removes the modal, so the navigation is
       deferred by one turn to let the stack empty first. */
    onDismiss: function () {
      setTimeout(function () { exitToCart(false); }, 0);
    }
  };

  /* §3.2 B02: the cart is unchanged, the key is the fresh one installed when
     M-04 opened, and G-04 is popped so G-03 sits where it was. */
  function exitToCart(closeFirst) {
    if (closeFirst) App.closeModal();
    App.replace('/cart');
  }
})();
