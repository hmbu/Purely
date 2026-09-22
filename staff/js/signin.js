/* staff/js/signin.js — S-03 Staff sign-in (دخول الموظف).
   Spec: /spec/staff/screens/S-03.md. A 4-digit PIN, the 4th digit submits.
   While nobody is signed in it keeps counting the queue and keeps chiming
   with the board's rules (§5.5). Any touch here arms audio (§5.4). */
(function () {
  'use strict';

  var S = window.Staff;
  var Server = S.Server, Alert = S.Alert, Chime = S.Chime, Session = S.Session;

  I18N.register({
    's03.c01':        { ar: 'دخول الموظف', en: 'Staff sign-in' },
    's03.c02':        { ar: 'انتهت مدة الجلسة — أدخل رمزك لتعود إلى حيث كنت', en: 'The session has expired — enter your PIN to return to where you were' },
    's03.c06.count':  { ar: 'طلبات نشطة الآن: {n} — جديدة: {m}', en: 'Active orders now: {n} — new: {m}' },
    's03.c06.none':   { ar: 'لا توجد طلبات نشطة الآن', en: 'No active orders right now' },
    's03.c06.fail':   { ar: 'تعذّر تحديث عدد الطلبات', en: 'Could not update the order count' },
    's03.c07.off':    { ar: 'الصوت متوقف — لن تسمع نغمة الطلبات الجديدة. يمكن تشغيله من اللوحة بعد الدخول', en: 'Sound is off — you will not hear the new-order chime. It can be turned on from the board after signing in' },
    's03.c07.blocked':{ ar: 'الصوت لم يُفعَّل بعد — المس الشاشة مرة واحدة لتفعيله', en: 'Sound is not enabled yet — touch the screen once to enable it' },
    's03.c03':        { ar: 'رمز الدخول (4 أرقام)', en: 'PIN (4 digits)' },
    's03.c04.wrong':  { ar: 'رمز الدخول غير صحيح — أعد إدخاله', en: 'Wrong PIN — enter it again' },
    's03.c04.locked': { ar: 'محاولات خاطئة كثيرة — انتظر دقيقة ثم حاول مرة أخرى', en: 'Too many wrong attempts — wait one minute, then try again' },
    's03.c04.failed': { ar: 'تعذّر الوصول إلى النظام — تحقّق من الشبكة ثم أعد إدخال الرمز', en: 'Could not reach the system — check the network, then enter the PIN again' },
    's03.c04.short':  { ar: 'رمز الدخول 4 أرقام — أكمل إدخاله', en: 'The PIN has 4 digits — finish entering it' },
    's03.c04.paste':  { ar: 'استخدم الأرقام فقط (0–9)', en: 'Use digits only (0–9)' },
    's03.c05':        { ar: 'جارٍ التحقق…', en: 'Checking…' },
    's03.c09':        { ar: 'نسيت رمزك؟ اطلبه من المناوب المسؤول', en: 'Forgot your PIN? Ask the duty manager' },
    's03.c08.l1':     { ar: 'هذا الجهاز غير مربوط بنظام الفندق', en: "This device is not linked to the hotel's system" },
    's03.c08.l2':     { ar: 'لا يمكن الدخول أو استلام الطلبات عليه', en: 'You cannot sign in or receive orders on it' },
    's03.c08.l3':     { ar: 'اطلب من مدير الفندق ربط هذا الجهاز', en: 'Ask the hotel manager to link this device' },
    /* Screen reader only (§7.7). */
    's03.sr.fill':    { ar: '{n} من 4 أرقام', en: '{n} of 4 digits' }
  });

  var QUEUE_MS = 15000;
  var LOCK_MS = 60 * 1000;

  var P = { mounted: false };

  /* ------------------------------------------------------------------ *
   * Queue summary (§5.5): counts and New order numbers/times only.
   * ------------------------------------------------------------------ */
  function queueRequest() {
    if (!P.mounted || P.variantB) return;
    if (P.qInFlight) return;
    clearTimeout(P.qTimer);
    P.qInFlight = true;
    var g = ++P.qGen;
    Server.queue().then(function (res) {
      if (g !== P.qGen) return;
      P.qInFlight = false;
      P.queue = { n: res.active, m: res.news.length };
      P.news = res.news;
      Alert.observe(res.news);                  /* S-01 §5.6 rules, baseline per §5.5 rule 3 */
      paintQueue();
      qSchedule();
    }, function (err) {
      if (g !== P.qGen) return;
      P.qInFlight = false;
      if (err && err.type === 'notLinked') { toVariantB(); return; }
      P.queue = 'fail';
      paintQueue();
      qSchedule();
    });
  }

  function qSchedule() {
    clearTimeout(P.qTimer);
    P.qTimer = setTimeout(function () {
      if (!P.mounted || document.hidden) return;
      queueRequest();
    }, QUEUE_MS);
  }

  function toVariantB() {
    P.variantB = true;
    P.qGen++;
    clearTimeout(P.qTimer);
    draw();
  }

  /* ------------------------------------------------------------------ *
   * Sign-in (§5.2) — exactly five outcomes
   * ------------------------------------------------------------------ */
  function submit() {
    if (P.busy || P.lockedUntil) return;
    var pin = P.pin;
    P.pin = '';                   /* the digits are not kept once sent */
    P.dots = 4;
    P.busy = true;
    P.msg = null;
    var input = inputEl();
    if (input) { input.value = ''; input.blur(); }
    paintPin();
    Server.signIn(pin).then(function (res) {
      if (!P.mounted) return;
      if (res && res.kind === 'ok') {
        P.qGen++; clearTimeout(P.qTimer);          /* the queue request stops */
        Session.start(res.member.id);
        App.afterSignIn();
        return;
      }
      P.busy = false;
      P.dots = 0;
      if (res && res.kind === 'notLinked') { toVariantB(); return; }
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
      P.msg = (res && res.kind === 'wrong') ? 'wrong' : 'failed';
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
    var raw = S.westernDigits(el.value);
    var digits = raw.replace(/[^0-9]/g, '');
    /* A non-digit is not entered and shows no message (§7.1). */
    if (digits.length !== raw.length) digits = P.pin + '';
    digits = digits.slice(0, 4);
    if (digits.length > P.pin.length) P.msg = null;   /* the next digit clears C04 */
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
    var v = S.westernDigits(String(text).replace(/^\s+|\s+$/g, ''));
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

  /* Digits typed anywhere on the page go into F01 (§5.2 step 1). */
  function onDocKey(e) {
    if (!P.mounted || P.variantB) return;
    var input = inputEl();
    if (!input || document.activeElement === input) return;
    if (/^[0-9٠-٩۰-۹]$/.test(e.key) && !App.Modal.isOpen()) focusPin();
  }
  document.addEventListener('keydown', onDocKey, true);

  function inputEl() { return document.querySelector('[data-el="S-03-F01"] input'); }

  function focusPin() {
    var el = inputEl();
    if (el && !el.disabled) { try { el.focus({ preventScroll: true }); } catch (x) { el.focus(); } }
  }

  /* ------------------------------------------------------------------ *
   * Draw — full on entry and language switch, partial while typing
   * ------------------------------------------------------------------ */
  function queueHtml() {
    if (P.queue === null) return '';
    if (P.queue === 'fail') return t('s03.c06.fail');
    if (P.queue.n === 0) return t('s03.c06.none');
    return t('s03.c06.count', { n: '<span class="num">' + P.queue.n + '</span>', m: '<span class="num">' + P.queue.m + '</span>' });
  }

  function soundKey() {
    if (!Chime.soundOn()) return 's03.c07.off';
    if (!Chime.armed || Chime.refused) return 's03.c07.blocked';
    return null;
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
    if (P.busy) return '<p class="s-slot__checking" data-el="S-03-C05" role="status">' + t('s03.c05') + '</p>';
    if (P.msg) return '<p class="error" data-el="S-03-C04" role="alert">' + t('s03.c04.' + P.msg) + '</p>';
    return '';
  }

  function demoHint() {
    var members = (HotelDB.staff().members) || [], parts = [];
    for (var i = 0; i < members.length; i++) {
      parts.push('<span class="num">' + esc(members[i].pin) + '</span> ' + esc(members[i].name));
    }
    return '<aside class="s-demo-hint" data-demo="true">' +
             '<span class="s-demo-hint__tag">' + t('st.demo.tag') + '</span>' +
             t('st.demo.pins') + ' ' + parts.join(' · ') + '</aside>';
  }

  function draw() {
    if (!P.mounted) return;
    var h = '<div class="s-screen s-signin-screen">' +
      '<div class="s-top"><header class="s-header" data-el="S-03-S01">' +
        '<h1 class="s-header__title" data-el="S-03-C01">' + t('s03.c01') + '</h1>' +
        '<button type="button" class="s-hbtn" data-el="S-03-B01" lang="' + I18N.other() + '">' + t('st.lang.other') + '</button>' +
      '</header></div>' +
      '<main class="s-col s-col--narrow s-signin" data-el="S-03-S02">';

    if (P.variantB) {
      h += '<div class="s-empty" data-el="S-03-C08">' +
             '<span class="s-icon-circle" aria-hidden="true">!</span>' +
             '<p class="s-empty__l1">' + t('s03.c08.l1') + '</p>' +
             '<p class="s-empty__l2">' + t('s03.c08.l2') + '</p>' +
             '<p class="s-empty__l3">' + t('s03.c08.l3') + '</p>' +
           '</div>';
    } else {
      var sk = soundKey();
      h += (P.showC02 ? '<p class="s-boxline" data-el="S-03-C02">' + t('s03.c02') + '</p>' : '') +
           '<p class="s-queue" data-el="S-03-C06" aria-live="polite">' + queueHtml() + '</p>' +
           '<p class="s-soundline" data-el="S-03-C07"' + (sk ? '' : ' hidden') + '>' + (sk ? t(sk) : '') + '</p>' +
           '<label class="s-pin-label" data-el="S-03-C03" for="s03-pin">' + t('s03.c03') + '</label>' +
           '<div class="s-pin' + (P.busy || P.lockedUntil ? ' is-disabled' : '') + '" data-el="S-03-F01">' +
             '<span class="s-pin__cells" style="display:contents">' + cellsHtml() + '</span>' +
             '<input id="s03-pin" class="s-pin__input" type="text" inputmode="numeric" pattern="[0-9]*" ' +
               'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" ' +
               'enterkeyhint="go" data-lpignore="true" data-form-type="other" name="s03-code-' + Date.now() + '" ' +
               'aria-describedby="s03-fill"' + (P.busy || P.lockedUntil ? ' disabled' : '') + '>' +
             '<span id="s03-fill" class="sr-only">' + t('s03.sr.fill', { n: P.dots }) + '</span>' +
           '</div>' +
           '<div class="s-slot">' + slotHtml() + '</div>' +
           '<p class="s-helper" data-el="S-03-C09">' + t('s03.c09') + '</p>' +
           demoHint();
    }
    h += '</main></div>';

    var root = App.paint(h);
    root.querySelector('[data-el="S-03-B01"]').addEventListener('click', function () {
      var now = Date.now();
      if (P.tapAt && now - P.tapAt < 300) return;
      P.tapAt = now;
      S.Lang.toggle();                      /* digits typed, lockout, message kept */
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
    var box = document.querySelector('[data-el="S-03-F01"]');
    if (!box) return;
    box.classList.toggle('is-disabled', !!(P.busy || P.lockedUntil));
    box.querySelector('.s-pin__cells').innerHTML = cellsHtml();
    box.querySelector('#s03-fill').textContent = t('s03.sr.fill', { n: P.dots });
    var input = inputEl();
    input.disabled = !!(P.busy || P.lockedUntil);
    var slot = document.querySelector('.s-slot');
    if (slot) slot.innerHTML = slotHtml();
  }

  function paintQueue() {
    var el = document.querySelector('[data-el="S-03-C06"]');
    if (el) el.innerHTML = queueHtml();
  }

  function paintSound() {
    var el = document.querySelector('[data-el="S-03-C07"]');
    if (!el) return;
    var sk = soundKey();
    el.hidden = !sk;
    el.innerHTML = sk ? t(sk) : '';
  }

  /* ------------------------------------------------------------------ *
   * View contract
   * ------------------------------------------------------------------ */
  Views['S-03'] = {
    enter: function (params, ctx) {
      P = {
        mounted: true, pin: '', dots: 0, busy: false, msg: null,
        lockedUntil: 0, lockTimer: null,
        queue: null, news: [], qTimer: null, qInFlight: false, qGen: 0,
        showC02: !!ctx.expired && !!App.state.returnTarget,
        variantB: !S.Device.linked(),      /* decided on the device, first frame */
        tapAt: 0
      };
      if (!ctx.expired) {
        /* No return target unless reached from a "Sign in to continue". */
        App.state.returnTarget = null;
      }
      window.scrollTo(0, 0);
      draw();
      if (P.variantB) return;
      focusPin();
      queueRequest();
    },

    leave: function () {
      P.mounted = false;
      P.qGen++;
      clearTimeout(P.qTimer);
      clearTimeout(P.lockTimer);
    },

    draw: function () {
      draw();
      focusPin();
    },

    onData: function () {
      if (!document.hidden) queueRequest();
    },

    onVisibility: function (visible) {
      if (visible) queueRequest();
    },

    onArm: function () { paintSound(); },

    tick: function (now) {
      if (!P.mounted || P.variantB) return;
      if (P.news && P.news.length) Alert.tick(P.news, now);   /* the 60 s repeat while Late */
    }
  };
})();
