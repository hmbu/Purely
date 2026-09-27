/* worker/js/signin.js — W-03 Delivery worker sign-in (دخول المندوب).
   A 4-digit PIN; the 4th digit submits (the desk's S-03 behaviour). Only
   members with role `worker` get in. A supervisor PIN is not "wrong": it is
   told that this is the worker's app. Success starts the worker's shift
   (HotelDB.startShift) and writes roomstore.staff.workerSession — never the
   desk's `session`. Typing the PIN is the touch that arms the chime. */
(function () {
  'use strict';

  var W = window.WK;
  var Server = W.Server;

  I18N.register({
    'w03.c01':          { ar: 'دخول المندوب', en: 'Delivery worker sign-in' },
    'w03.c02':          { ar: 'أدخل رمزك لتبدأ ورديتك وتصلك الطلبات المحوّلة لك', en: 'Enter your PIN to start your shift and receive the orders assigned to you' },
    'w03.c03':          { ar: 'رمز الدخول (4 أرقام)', en: 'PIN (4 digits)' },
    'w03.c04.wrong':    { ar: 'رمز الدخول غير صحيح — أعد إدخاله', en: 'Wrong PIN — enter it again' },
    'w03.c04.supervisor': { ar: 'هذا تطبيق المندوب. المشرف يستخدم تابلت مكتب الروم سيرفس', en: 'This is the delivery worker app. Supervisors use the room service desk tablet' },
    'w03.c04.locked':   { ar: 'محاولات خاطئة كثيرة — انتظر دقيقة ثم حاول مرة أخرى', en: 'Too many wrong attempts — wait one minute, then try again' },
    'w03.c04.failed':   { ar: 'تعذّر الوصول إلى النظام — تحقّق من الشبكة ثم أعد إدخال الرمز', en: 'Could not reach the system — check the network, then enter the PIN again' },
    'w03.c04.short':    { ar: 'رمز الدخول 4 أرقام — أكمل إدخاله', en: 'The PIN has 4 digits — finish entering it' },
    'w03.c04.paste':    { ar: 'استخدم الأرقام فقط (0–9)', en: 'Use digits only (0–9)' },
    'w03.c05':          { ar: 'جارٍ التحقق…', en: 'Checking…' },
    'w03.c06':          { ar: 'نسيت رمزك؟ اطلبه من مشرف الروم سيرفس', en: 'Forgot your PIN? Ask the room service supervisor' },
    'w03.sr.fill':      { ar: '{n} من 4 أرقام', en: '{n} of 4 digits' }
  });

  var LOCK_MS = 60 * 1000;
  var P = { mounted: false };

  function submit() {
    if (P.busy || P.lockedUntil) return;
    var pin = P.pin;
    P.pin = '';
    P.dots = 4;
    P.busy = true;
    P.msg = null;
    var input = inputEl();
    if (input) { input.value = ''; input.blur(); }
    paintPin();
    Server.signIn(pin).then(function (res) {
      if (!P.mounted) return;
      if (res && res.kind === 'ok') {
        W.Session.start(res.member.id);
        App.afterSignIn();
        return;
      }
      P.busy = false;
      P.dots = 0;
      if (res && res.kind === 'locked') {
        P.msg = 'locked';
        P.lockedUntil = Date.now() + LOCK_MS;
        clearTimeout(P.lockTimer);
        P.lockTimer = setTimeout(function () {
          P.lockedUntil = 0;
          if (P.msg === 'locked') P.msg = null;
          paintPin();
          focusPin();
        }, LOCK_MS);
        paintPin();
        return;
      }
      P.msg = res && (res.kind === 'wrong' || res.kind === 'supervisor') ? res.kind : 'failed';
      paintPin();
      focusPin();
    }, function () {
      if (!P.mounted) return;
      P.busy = false;
      P.dots = 0;
      P.msg = 'failed';
      paintPin();
      focusPin();
    });
  }

  function onInput(e) {
    var el = e.target;
    if (P.busy || P.lockedUntil) { el.value = ''; return; }
    var raw = W.westernDigits(el.value);
    var digits = raw.replace(/[^0-9]/g, '');
    if (digits.length !== raw.length) digits = P.pin + '';   /* a non-digit is not entered */
    digits = digits.slice(0, 4);
    if (digits.length > P.pin.length) P.msg = null;           /* the next digit clears C04 */
    P.pin = digits;
    P.dots = digits.length;
    el.value = digits;
    paintPin();
    if (digits.length === 4) submit();
  }

  function onPaste(e) {
    e.preventDefault();
    if (P.busy || P.lockedUntil) return;
    var text = '';
    try { text = (e.clipboardData || window.clipboardData).getData('text') || ''; } catch (x) {}
    var v = W.westernDigits(String(text).replace(/^\s+|\s+$/g, ''));
    if (!/^[0-9]+$/.test(v)) { P.msg = 'paste'; paintPin(); return; }
    P.pin = v.slice(0, 4);
    P.dots = P.pin.length;
    P.msg = null;
    inputEl().value = P.pin;
    paintPin();
    if (P.pin.length === 4) submit();
  }

  function onKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (P.pin.length < 4 && !P.busy && !P.lockedUntil) { P.msg = 'short'; paintPin(); }
    }
  }

  function onDocKey(e) {
    if (!P.mounted) return;
    var input = inputEl();
    if (!input || document.activeElement === input) return;
    if (/^[0-9٠-٩۰-۹]$/.test(e.key) && !App.Modal.isOpen()) focusPin();
  }
  document.addEventListener('keydown', onDocKey, true);

  function inputEl() { return document.querySelector('[data-el="W-03-F01"] input'); }

  function focusPin() {
    var el = inputEl();
    if (el && !el.disabled) { try { el.focus({ preventScroll: true }); } catch (x) { el.focus(); } }
  }

  function cellsHtml() {
    var h = '';
    for (var i = 0; i < 4; i++) {
      var filled = i < P.dots;
      var next = !P.busy && !P.lockedUntil && i === P.dots;
      h += '<span class="s-pin__cell' + (next ? ' is-next' : '') + '" aria-hidden="true">' +
             (filled ? '<span class="s-pin__dot"></span>' : '') + '</span>';
    }
    return h;
  }

  function slotHtml() {
    if (P.busy) return '<p class="s-slot__checking" data-el="W-03-C06" role="status">' + t('w03.c05') + '</p>';
    if (P.msg) return '<p class="error" data-el="W-03-C05" role="alert">' + t('w03.c04.' + P.msg) + '</p>';
    return '';
  }

  /* Demo hint: the worker PINs only (2222, 3333). */
  function demoHint() {
    var members = (HotelDB.staff().members) || [], parts = [];
    for (var i = 0; i < members.length; i++) {
      if (members[i].role !== 'worker') continue;
      parts.push('<span class="num">' + esc(members[i].pin) + '</span> ' + esc(members[i].name));
    }
    return '<aside class="s-demo-hint" data-demo="true">' +
             '<span class="s-demo-hint__tag">' + t('w.demo.tag') + '</span>' +
             t('w.demo.pins') + ' ' + parts.join(' · ') + '</aside>';
  }

  function draw() {
    if (!P.mounted) return;
    var dis = P.busy || P.lockedUntil;
    var h = '<div class="s-screen w-signin-screen">' +
      '<div class="s-top"><header class="s-header" data-el="W-03-S01">' +
        '<h1 class="s-header__title" data-el="W-03-C01">' + t('w03.c01') + '</h1>' +
        '<button type="button" class="s-hbtn" data-el="W-03-B01" lang="' + I18N.other() + '">' + t('w.lang.other') + '</button>' +
      '</header></div>' +
      '<main class="s-col s-col--narrow s-signin" data-el="W-03-S02">' +
        '<p class="w-lead" data-el="W-03-C03">' + t('w03.c02') + '</p>' +
        '<label class="s-pin-label" data-el="W-03-C04" for="w03-pin">' + t('w03.c03') + '</label>' +
        '<div class="s-pin' + (dis ? ' is-disabled' : '') + '" data-el="W-03-F01">' +
          '<span class="s-pin__cells" style="display:contents">' + cellsHtml() + '</span>' +
          '<input id="w03-pin" class="s-pin__input" type="text" inputmode="numeric" pattern="[0-9]*" ' +
            'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" ' +
            'enterkeyhint="go" data-lpignore="true" data-form-type="other" name="w03-code-' + Date.now() + '" ' +
            'aria-describedby="w03-fill"' + (dis ? ' disabled' : '') + '>' +
          '<span id="w03-fill" class="sr-only">' + t('w03.sr.fill', { n: P.dots }) + '</span>' +
        '</div>' +
        '<div class="s-slot">' + slotHtml() + '</div>' +
        '<p class="s-helper" data-el="W-03-C07">' + t('w03.c06') + '</p>' +
        demoHint() +
      '</main></div>';

    var root = App.paint(h);
    root.querySelector('[data-el="W-03-B01"]').addEventListener('click', function () {
      var now = Date.now();
      if (P.tapAt && now - P.tapAt < 300) return;
      P.tapAt = now;
      W.Lang.toggle();
    });
    var input = inputEl();
    if (input) {
      input.value = P.pin;
      input.addEventListener('input', onInput);
      input.addEventListener('paste', onPaste);
      input.addEventListener('keydown', onKey);
    }
  }

  function paintPin() {
    var box = document.querySelector('[data-el="W-03-F01"]');
    if (!box) return;
    var dis = !!(P.busy || P.lockedUntil);
    box.classList.toggle('is-disabled', dis);
    box.querySelector('.s-pin__cells').innerHTML = cellsHtml();
    box.querySelector('#w03-fill').textContent = t('w03.sr.fill', { n: P.dots });
    inputEl().disabled = dis;
    var slot = document.querySelector('.s-slot');
    if (slot) slot.innerHTML = slotHtml();
  }

  Views['W-03'] = {
    enter: function () {
      P = { mounted: true, pin: '', dots: 0, busy: false, msg: null, lockedUntil: 0, lockTimer: null, tapAt: 0 };
      window.scrollTo(0, 0);
      draw();
      focusPin();
    },
    leave: function () {
      P.mounted = false;
      clearTimeout(P.lockTimer);
    },
    draw: function () { draw(); focusPin(); }
  };
})();
