/* A-01 — تسجيل الدخول / Sign in. spec/admin/screens/A-01.md
   The one manager account (CONTRACT "Demo credentials"). The credentials are
   plain demo values held by HotelDB; the demo hint below the card says so.
   This is not security and does not pretend to be. */
(function () {
  'use strict';
  var A = window.Admin;

  I18N.register({
    'a01.c01': { ar: 'لوحة تحكم متجر الفندق', en: 'Hotel store dashboard' },
    'a01.f01': { ar: 'البريد الإلكتروني', en: 'Email' },
    'a01.f02': { ar: 'كلمة المرور', en: 'Password' },
    'a01.b03.show': { ar: 'إظهار', en: 'Show' },
    'a01.b03.hide': { ar: 'إخفاء', en: 'Hide' },
    'a01.b01': { ar: 'تسجيل الدخول', en: 'Sign in' },
    'a01.c03': { ar: 'تم تسجيل خروجك', en: 'You are signed out' },
    'a01.c04': { ar: 'انتهت الجلسة بعد 60 دقيقة دون نشاط. أي تعديلات لم تُحفظ قد فُقدت.',
                 en: 'Your session ended after 60 minutes of inactivity. Any unsaved edits were lost.' },
    'a01.c05': { ar: 'جارٍ التحقق…', en: 'Checking…' },
    'a01.c06': { ar: 'هل نسيت كلمة المرور؟ تواصل مع الجهة التي ركّبت النظام لإعادة ضبطها.',
                 en: 'Forgot your password? Contact whoever installed the system to reset it.' },
    /* §7.4 */
    'a01.err.emailEmpty': { ar: 'أدخل البريد الإلكتروني', en: 'Enter your email' },
    'a01.err.emailBad':   { ar: 'تحقّق من صيغة البريد الإلكتروني', en: 'Check the email address' },
    'a01.err.pwEmpty':    { ar: 'أدخل كلمة المرور', en: 'Enter your password' },
    'a01.err.pwShort':    { ar: 'كلمة المرور 8 أحرف على الأقل', en: 'Your password is at least 8 characters' },
    'a01.err.wrong':      { ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', en: 'Your email or password is incorrect' },
    'a01.err.conn':       { ar: 'تعذّر الاتصال — تحقّق من الاتصال وحاول مرة أخرى', en: 'Could not connect — check your connection and try again' },
    'a01.err.locked':     { ar: 'تم إيقاف المحاولات مؤقتًا بعد 5 محاولات فاشلة. حاول مرة أخرى بعد {N} دقيقة.',
                            en: 'Sign-in is paused after 5 failed attempts. Try again in {N} minutes.' },
    /* The demo hint — CONTRACT "Demo credentials". Not part of the product. */
    'a01.demo.tag':  { ar: 'وضع العرض · Demo', en: 'Demo · وضع العرض' },
    'a01.demo.line': { ar: 'بيانات دخول تجريبية للعرض فقط. هذه ليست حماية حقيقية.',
                       en: 'Demo sign-in details, for this prototype only. This is not real security.' },
    'a01.demo.email': { ar: 'البريد:', en: 'Email:' },
    'a01.demo.pw':    { ar: 'كلمة المرور:', en: 'Password:' }
  });

  var S = {};          // screen state, kept across a language re-render
  var lockTimer = null;

  function reset() {
    S = { email: '', pw: '', show: false, busy: false, errors: [], notice: null };
  }
  reset();

  function lockedMinutes() {
    var until = A.fails.lockedUntil();
    if (!until) return 0;
    return Math.max(1, Math.ceil((until - Date.now()) / 60000));
  }

  function validEmail(v) {
    return v.length >= 5 && v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  var view = {
    enter: function () {
      reset();
      S.notice = A.notice;        // 'signedout' | 'expired' | null (C04 wins)
      A.notice = null;
    },
    leave: function () { if (lockTimer) { clearInterval(lockTimer); lockTimer = null; } S.show = false; },

    render: function () {
      var mins = lockedMinutes();
      var locked = mins > 0;
      var dis = locked || S.busy;
      var h = '<div class="adm-signin">';
      h += '<button type="button" class="adm-textbtn adm-signin__lang" lang="' + I18N.other() + '"' + A.el('A-01-B02') + '>' + esc(t('ad.af.b06')) + '</button>';
      h += '<form class="adm-signin__card" novalidate' + A.el('A-01-S01') + '>';
      h += '<h1 class="adm-signin__title"' + A.el('A-01-C01') + '>' + esc(t('a01.c01')) + '</h1>';
      if (S.notice === 'expired') h += '<p class="adm-note"' + A.el('A-01-C04') + '>' + esc(t('a01.c04')) + '</p>';
      else if (S.notice === 'signedout') h += '<p class="adm-note"' + A.el('A-01-C03') + '>' + esc(t('a01.c03')) + '</p>';

      h += '<label class="adm-label" for="a01-f01">' + esc(t('a01.f01')) + '</label>';
      h += '<input id="a01-f01" class="adm-input num" type="email" autocomplete="username" autocapitalize="off" spellcheck="false"' +
           A.el('A-01-F01') + (dis ? ' disabled' : '') + ' value="' + esc(S.email) + '">';
      h += '<label class="adm-label" for="a01-f02">' + esc(t('a01.f02')) + '</label>';
      h += '<div class="adm-pw">';
      h += '<input id="a01-f02" class="adm-input" type="' + (S.show ? 'text' : 'password') + '" autocomplete="current-password" ' +
           'autocorrect="off" autocapitalize="off" spellcheck="false"' + A.el('A-01-F02') + (dis ? ' disabled' : '') + ' value="' + esc(S.pw) + '">';
      h += '<button type="button" class="adm-pw__toggle"' + A.el('A-01-B03') + (S.pw ? '' : ' hidden') + (dis ? ' disabled' : '') + '>' +
           esc(t(S.show ? 'a01.b03.hide' : 'a01.b03.show')) + '</button>';
      h += '</div>';

      var msgs = locked ? [t('a01.err.locked', { N: mins })] : S.errors.map(function (k) { return t(k); });
      h += '<div class="error adm-signin__err" role="alert"' + A.el('A-01-C02') + (msgs.length ? '' : ' hidden') + '><div>' +
           msgs.map(function (m) { return '<div>' + esc(m) + '</div>'; }).join('') + '</div></div>';

      var canSubmit = !dis && S.email.length > 0 && S.pw.length > 0;
      h += '<button type="submit" class="btn btn--primary btn--block adm-btn44"' + A.el('A-01-B01') + (canSubmit ? '' : ' disabled') + '>' +
           (S.busy ? '<span' + A.el('A-01-C05') + '>' + esc(t('a01.c05')) + '</span>' : esc(t('a01.b01'))) + '</button>';
      h += '</form>';
      h += '<p class="adm-signin__help"' + A.el('A-01-C06') + '>' + esc(t('a01.c06')) + '</p>';

      h += '<aside class="adm-demo" data-demo="true">' +
             '<span class="demo-bar__tag">' + esc(t('a01.demo.tag')) + '</span>' +
             '<p>' + esc(t('a01.demo.line')) + '</p>' +
             '<p>' + esc(t('a01.demo.email')) + ' <code class="num">manager@alwaha.example</code></p>' +
             '<p>' + esc(t('a01.demo.pw')) + ' <code class="num">alwaha2026</code></p>' +
           '</aside>';
      h += '</div>';
      return h;
    },

    mount: function (root) {
      var f1 = root.querySelector('#a01-f01');
      var f2 = root.querySelector('#a01-f02');
      var b1 = root.querySelector('[data-el="A-01-B01"]');
      var b3 = root.querySelector('[data-el="A-01-B03"]');
      var form = root.querySelector('form');

      function refresh() {
        var dis = lockedMinutes() > 0 || S.busy;
        b1.disabled = dis || !S.email.length || !S.pw.length;
        if (b3) { if (S.pw) b3.removeAttribute('hidden'); else b3.setAttribute('hidden', ''); }
      }
      function edited() {
        var hadNotice = S.errors.length || S.notice;
        S.errors = []; S.notice = null;               // §4 C02–C04: cleared on edit
        if (hadNotice) {
          var c2 = root.querySelector('[data-el="A-01-C02"]');
          if (c2 && !lockedMinutes()) { c2.setAttribute('hidden', ''); c2.firstChild.innerHTML = ''; }
          var n = root.querySelector('[data-el="A-01-C03"], [data-el="A-01-C04"]');
          if (n) n.parentNode.removeChild(n);
        }
        refresh();
      }
      f1.addEventListener('input', function () { S.email = f1.value; edited(); });
      f2.addEventListener('input', function () { S.pw = f2.value; edited(); });
      f1.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); f2.focus(); } });
      if (b3) b3.addEventListener('click', function () {
        S.show = !S.show;
        f2.type = S.show ? 'text' : 'password';
        b3.textContent = t(S.show ? 'a01.b03.hide' : 'a01.b03.show');
      });
      root.querySelector('[data-el="A-01-B02"]').addEventListener('click', function () { A.toggleLang(); });
      form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });

      if (lockTimer) clearInterval(lockTimer);
      if (lockedMinutes() > 0) {
        lockTimer = setInterval(function () {
          if (A.cur.id !== 'A-01') { clearInterval(lockTimer); lockTimer = null; return; }
          if (!lockedMinutes()) {                   // §6.6: back to default, both empty
            clearInterval(lockTimer); lockTimer = null;
            reset(); A.render();
            var e1 = document.getElementById('a01-f01'); if (e1) e1.focus();
          } else {
            var c2 = document.querySelector('[data-el="A-01-C02"]');
            if (c2) c2.firstChild.innerHTML = '<div>' + esc(t('a01.err.locked', { N: lockedMinutes() })) + '</div>';
          }
        }, 15000);
      }
      if (!S.busy && !lockedMinutes()) {
        if (!S.email) f1.focus(); else if (document.activeElement === document.body) f1.focus();
      }
    }
  };

  function submit() {
    if (S.busy || lockedMinutes()) return;
    var email = A.trim(S.email);
    var pw = S.pw;                                   // never trimmed (§7.2)
    var errs = [];
    if (!email) errs.push('a01.err.emailEmpty');
    else if (!validEmail(email)) errs.push('a01.err.emailBad');
    if (!pw) errs.push('a01.err.pwEmpty');
    else if (pw.length < 8) errs.push('a01.err.pwShort');
    if (errs.length) { S.errors = errs; A.render(); return; }

    S.busy = true; S.show = false; S.errors = [];
    A.render();
    /* The "request": HotelDB's admin record, read fresh. A short pause keeps
       the in-flight state (§6.1) visible, as a real request would. */
    setTimeout(function () {
      var rec = null;
      try { rec = HotelDB.admin(); } catch (e) { rec = null; }
      S.busy = false;
      if (!rec) { S.errors = ['a01.err.conn']; A.render(); return; }   // does not count (§7.3)
      var ok = String(rec.email || '').toLowerCase() === email.toLowerCase() &&
               rec.passwordHash === HotelDB.hashPassword(pw);
      if (!ok) {
        A.fails.add();
        S.pw = ''; S.errors = ['a01.err.wrong'];
        A.render();
        var f2 = document.getElementById('a01-f02');
        if (f2 && !f2.disabled) f2.focus();
        return;
      }
      A.fails.clear();
      if (!A.startSession()) { S.errors = ['a01.err.conn']; A.render(); return; }
      var next = A.takeNext();
      reset();
      A.navigate(next || '#/overview', { force: true });
    }, 250);
  }

  A.views['A-01'] = view;
})();
