/* A-07 — إعدادات الفندق / Hotel settings. spec/admin/screens/A-07.md
   Four settings saved together through HotelDB.saveSettings(); a changed
   room-number format is saved only through AM-04. The password group is
   separate, with its own button, and is never saved by "Save". */
(function () {
  'use strict';
  var A = window.Admin;

  I18N.register({
    'a07.c01': { ar: 'إعدادات الفندق', en: 'Hotel settings' },
    'a07.c02': { ar: 'اسم الفندق', en: 'Hotel name' },
    'a07.f01': { ar: 'الاسم بالعربية *', en: 'Name in Arabic *' },
    'a07.f02': { ar: 'الاسم بالإنجليزية *', en: 'Name in English *' },
    'a07.c04': { ar: 'يظهر في أعلى المتجر للنزيل بلغة واجهته، وفي أعلى لوحة التحكم.', en: 'Shown at the top of the store in the guest\'s language, and at the top of this dashboard.' },
    'a07.c05': { ar: 'رمز العملة', en: 'Currency label' },
    'a07.f03': { ar: 'بالعربية *', en: 'In Arabic *' },
    'a07.f04': { ar: 'بالإنجليزية *', en: 'In English *' },
    'a07.c06.l1': { ar: 'كما يراها النزيل:', en: 'As the guest sees it:' },
    'a07.c06.l2': { ar: 'بالعربية 12.00 {ar} — بالإنجليزية {en} 12.00', en: 'In Arabic 12.00 {ar} — in English {en} 12.00' },
    'a07.c07': { ar: 'تغيير الرمز لا يغيّر أي سعر ولا أي طلب مُرسل — يغيّر الرمز المطبوع بجانب المبالغ فقط.', en: 'Changing the label changes no price and no submitted order — only the label printed beside amounts.' },
    'a07.c09': { ar: 'المنطقة الزمنية', en: 'Time zone' },
    'a07.f05': { ar: 'المنطقة الزمنية للفندق *', en: 'Hotel time zone *' },
    'a07.c10.l1': { ar: 'تُحسب بها الأيام والفترات والتواريخ في لوحة التحكم وفي ملف التصدير، ولا تغيّر شيئًا لدى النزيل.', en: 'Days, periods and dates in this dashboard and in the export are computed in it. It changes nothing for guests.' },
    'a07.c10.l2': { ar: 'الوقت الآن في هذه المنطقة: {time}', en: 'Time now in this zone: {time}' },
    'a07.c11': { ar: 'صيغة رقم الغرفة', en: 'Room number format' },
    'a07.c12': { ar: 'ما يستطيع النزيل كتابته في حقل رقم الغرفة عند إتمام الطلب.', en: 'What a guest can type in the room number field at checkout.' },
    'a07.p1.l1': { ar: 'أرقام فقط', en: 'Digits only' },
    'a07.p1.l2': { ar: 'من 1 إلى 5 أرقام، مثل 7 أو 305 أو 1204. يرى النزيل لوحة أرقام.', en: '1 to 5 digits, for example 7, 305 or 1204. The guest gets a number pad.' },
    'a07.p2.l1': { ar: 'أرقام وحروف', en: 'Digits and letters' },
    /* PM ruling: the hyphen is the only separator — the older "or a single
       space" of this helper line is not offered. */
    'a07.p2.l2': { ar: 'من 1 إلى 6 خانات: أرقام وحروف لاتينية، ويجوز بينها شرطة، مثل 12B أو A-12. يرى النزيل لوحة المفاتيح الكاملة.',
                   en: '1 to 6 characters: digits and Latin letters, with a hyphen between them, for example 12B or A-12. The guest gets the full keyboard.' },
    'a07.c14.at':    { ar: 'آخر تغيير: {when} — {who}', en: 'Last changed: {when} — {who}' },
    'a07.c14.never': { ar: 'لم تُغيَّر منذ تركيب النظام', en: 'Not changed since the system was installed' },
    'a07.c15': { ar: 'تغيير هذه الصيغة يطلب منك عند الحفظ تأكيدًا واختبارًا برقم غرفة حقيقي من فندقك.', en: 'Changing this format asks you, when you save, to confirm it and test it with a real room number from your hotel.' },
    'a07.c19': { ar: 'تم حفظ الإعدادات', en: 'Settings saved' },
    'a07.c22': { ar: 'تغيير كلمة المرور', en: 'Change password' },
    'a07.c26': { ar: 'تُستخدم هذه الحقول لزر «تغيير كلمة المرور» فقط، ولا يحفظها زر «حفظ»، وتُمسح عند مغادرة الصفحة.', en: 'These fields are used only by "Change password". "Save" does not save them, and they are cleared when you leave the page.' },
    'a07.f07': { ar: 'كلمة المرور الحالية', en: 'Current password' },
    'a07.f08': { ar: 'كلمة المرور الجديدة', en: 'New password' },
    'a07.c23': { ar: 'من 8 إلى 72 حرفًا. يمكن استخدام أي أحرف ومسافات.', en: '8 to 72 characters. Any characters and spaces can be used.' },
    'a07.f09': { ar: 'أعد كتابة كلمة المرور الجديدة', en: 'Type the new password again' },
    'a07.b02.show': { ar: 'إظهار', en: 'Show' },
    'a07.b02.hide': { ar: 'إخفاء', en: 'Hide' },
    'a07.b03': { ar: 'تغيير كلمة المرور', en: 'Change password' },
    'a07.c24': { ar: 'جارٍ التغيير…', en: 'Changing…' },
    'a07.c25.ok': { ar: 'تم تغيير كلمة المرور. سُجّل الخروج من أي متصفح آخر.', en: 'Your password was changed. Any other browser was signed out.' },
    'a07.c28': { ar: 'تعذّر تحميل الإعدادات', en: 'Settings could not be loaded' },
    /* §7.1 */
    'a07.err.f01.empty': { ar: 'أدخل اسم الفندق بالعربية', en: 'Enter the hotel name in Arabic' },
    'a07.err.f01.long':  { ar: 'اسم الفندق بالعربية 24 حرفًا كحد أقصى', en: 'The Arabic hotel name is 24 characters at most' },
    'a07.err.f02.empty': { ar: 'أدخل اسم الفندق بالإنجليزية', en: 'Enter the hotel name in English' },
    'a07.err.f02.long':  { ar: 'اسم الفندق بالإنجليزية 24 حرفًا كحد أقصى', en: 'The English hotel name is 24 characters at most' },
    /* §7.2 */
    'a07.err.f03.empty': { ar: 'أدخل رمز العملة بالعربية', en: 'Enter the currency label in Arabic' },
    'a07.err.f04.empty': { ar: 'أدخل رمز العملة بالإنجليزية', en: 'Enter the currency label in English' },
    'a07.err.cur.long':  { ar: 'رمز العملة 4 خانات كحد أقصى', en: 'The currency label is 4 characters at most' },
    'a07.err.cur.chars': { ar: 'رمز العملة بلا أرقام أو مسافات، مثل ر.س أو SAR', en: 'The currency label has no digits or spaces, for example ر.س or SAR' },
    /* §7.5 */
    'a07.err.f07.empty': { ar: 'أدخل كلمة المرور الحالية', en: 'Enter your current password' },
    'a07.err.f07.wrong': { ar: 'كلمة المرور الحالية غير صحيحة', en: 'Your current password is incorrect' },
    'a07.err.f08.empty': { ar: 'أدخل كلمة المرور الجديدة', en: 'Enter a new password' },
    'a07.err.f08.short': { ar: 'كلمة المرور الجديدة 8 أحرف على الأقل', en: 'The new password must be at least 8 characters' },
    'a07.err.f08.long':  { ar: 'كلمة المرور الجديدة 72 حرفًا كحد أقصى', en: 'The new password is 72 characters at most' },
    'a07.err.f08.same':  { ar: 'اختر كلمة مرور مختلفة عن الحالية', en: 'Choose a password different from the current one' },
    'a07.err.f08.email': { ar: 'لا تستخدم بريدك الإلكتروني كلمةً للمرور', en: 'Do not use your email address as your password' },
    'a07.err.f09.empty': { ar: 'أعد كتابة كلمة المرور الجديدة', en: 'Type the new password again' },
    'a07.err.f09.diff':  { ar: 'كلمتا المرور غير متطابقتين', en: 'The two passwords do not match' },
    'a07.err.pw.conn':   { ar: 'تعذّر تغيير كلمة المرور — تحقّق من الاتصال وحاول مرة أخرى', en: 'The password could not be changed — check your connection and try again' }
  });

  /* The two presets, stored in the data layer's real roomFormat shape. */
  var PRESETS = {
    p1: { minLen: 1, maxLen: 5, allowLetters: false, separator: '', requireDigit: true },
    p2: { minLen: 1, maxLen: 6, allowLetters: true, separator: '-', requireDigit: true }
  };
  function presetOf(fmt) {
    if (!fmt) return 'p1';
    var r = HotelDB.roomRule(fmt);           // the data layer's own normalisation
    for (var k in PRESETS) {
      var p = PRESETS[k];
      if (r.minLen === p.minLen && r.maxLen === p.maxLen && r.allowLetters === p.allowLetters &&
          r.separator === p.separator && r.requireDigit === p.requireDigit) return k;
    }
    return null;                             // AM-04 §5.5: "Unrecognised format"
  }

  var S = null, clock = null, tzList = null;

  function fromSettings(s) {
    return { nameAr: s.hotelNameAr || '', nameEn: s.hotelNameEn || '', curAr: s.currencyAr || '', curEn: s.currencyEn || '',
             tz: A.validTz(s.timeZone) ? s.timeZone : 'Asia/Riyadh', preset: presetOf(s.roomFormat) };
  }
  function len(s) { return A.trim(s).length; }

  function curError(v, which) {
    var s = A.trim(v);
    if (!s) return 'a07.err.' + which + '.empty';
    if (s.length > 4) return 'a07.err.cur.long';
    if (/[0-9٠-٩۰-۹\s]/.test(s)) return 'a07.err.cur.chars';
    return null;
  }
  function validate() {
    var v = S.v, e = {}, order = [];
    function put(f, k) { e[f] = k; order.push(f); }
    if (!len(v.nameAr)) put('F01', 'a07.err.f01.empty'); else if (len(v.nameAr) > 24) put('F01', 'a07.err.f01.long');
    if (!len(v.nameEn)) put('F02', 'a07.err.f02.empty'); else if (len(v.nameEn) > 24) put('F02', 'a07.err.f02.long');
    var c3 = curError(v.curAr, 'f03'); if (c3) put('F03', c3);
    var c4 = curError(v.curEn, 'f04'); if (c4) put('F04', c4);
    return { errors: e, order: order };
  }
  function differs(a, b) {
    return A.trim(a.nameAr) !== A.trim(b.nameAr) || A.trim(a.nameEn) !== A.trim(b.nameEn) ||
           A.trim(a.curAr) !== A.trim(b.curAr) || A.trim(a.curEn) !== A.trim(b.curEn) ||
           a.tz !== b.tz || a.preset !== b.preset;
  }
  function otherEdits() {                     // AM-04 C13: F01–F05 only
    var a = S.v, b = S.saved;
    return A.trim(a.nameAr) !== A.trim(b.nameAr) || A.trim(a.nameEn) !== A.trim(b.nameEn) ||
           A.trim(a.curAr) !== A.trim(b.curAr) || A.trim(a.curEn) !== A.trim(b.curEn) || a.tz !== b.tz;
  }
  function isDirty() { return !!S && !S.loadFailed && differs(S.v, S.saved); }

  /* The settings record as it will be written (§7.7). */
  function record(presetKey) {
    var v = S.v;
    var squash = function (x) { return A.trim(A.oneLine(x)).replace(/ {2,}/g, ' '); };
    return { hotelNameAr: squash(v.nameAr), hotelNameEn: squash(v.nameEn), currencyAr: A.trim(v.curAr), currencyEn: A.trim(v.curEn),
             timeZone: v.tz, roomFormat: PRESETS[presetKey] ? JSON.parse(JSON.stringify(PRESETS[presetKey])) : undefined };
  }

  function afterSaved() {
    S.saved = fromSettings(A.settings());
    S.v = JSON.parse(JSON.stringify(S.saved));
    S.errors = {}; S.tried = false; S.saveFailed = false;
    A.setFlash('A-07', 'a07.c19', {}, 5000);
    A.refreshHotelName();
  }

  /* Save with the format unchanged — also AM-01's "Save and continue". */
  function commit() {
    if (!S || S.busy) return 'failed';
    var r = validate();
    S.tried = true; S.errors = r.errors; S.saveFailed = false;
    if (r.order.length) { S.focus = r.order[0]; return 'invalid'; }
    if (S.v.preset !== S.saved.preset) return 'failed';     // only AM-04 may save it
    S.busy = true;
    var rec = record(S.saved.preset);
    if (!rec.roomFormat) delete rec.roomFormat;              // unchanged, untouched
    var ok = false;
    try { ok = HotelDB.saveSettings(rec) !== false; } catch (e) { ok = false; }
    S.busy = false;
    if (!ok) { S.saveFailed = true; return 'failed'; }
    afterSaved();
    return 'ok';
  }

  function zones() {
    if (tzList) return tzList;
    var ids = [];
    try { if (Intl.supportedValuesOf) ids = Intl.supportedValuesOf('timeZone'); } catch (e) { ids = []; }
    if (!ids.length) ids = ['Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Amman', 'Africa/Cairo', 'Europe/London', 'UTC'];
    ids = ids.filter(A.validTz);
    var now = Date.now();
    tzList = ids.map(function (id) { return { id: id, off: A.offset(now, id), label: id + ' (' + A.offsetLabel(id, now) + ')' }; })
      .sort(function (a, b) { return (a.off - b.off) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
    return tzList;
  }

  /* ---- Rendering ---- */
  function errLine(f) {
    var k = S.errors[f];
    return '<p class="error adm-ferr" data-err="' + f + '"' + A.el('A-07-C16') + (k ? '' : ' hidden') + '>' + (k ? esc(t(k)) : '') + '</p>';
  }
  function input(f, key, prop, extra, dir) {
    var dis = S.busy ? ' disabled' : '';
    return '<div class="adm-field' + (S.errors[f] ? ' field--error' : '') + '" data-field="' + f + '">' +
           '<label class="adm-label" for="a07-' + f + '">' + esc(t(key)) + '</label>' +
           '<input id="a07-' + f + '" type="text" class="adm-input ' + (extra || '') + '" data-prop="' + prop + '"' + (dir ? ' dir="' + dir + '"' : '') + A.el('A-07-' + f) + dis + ' value="' + esc(S.v[prop]) + '">' +
           (f === 'F01' || f === 'F02' ? '<div class="field__counter adm-counter' + (len(S.v[prop]) > 24 ? ' is-over' : '') + '" data-counter="' + f + '"' + A.el('A-07-C03') + '>' + len(S.v[prop]) + '/24</div>' : '') +
           errLine(f) + '</div>';
  }
  function currencyPreview() {
    var ok = !curError(S.v.curAr, 'f03') && !curError(S.v.curEn, 'f04');
    return '<div class="adm-note adm-preview" id="a07-c06"' + A.el('A-07-C06') + (ok ? '' : ' hidden') + '>' +
           '<div>' + esc(t('a07.c06.l1')) + '</div><div>' +
           esc(t('a07.c06.l2', { ar: A.trim(S.v.curAr), en: A.trim(S.v.curEn) })) +
           '</div></div>';
  }
  function auditLine() {
    var s = A.settings();
    if (!s.roomFormatChangedAt) return esc(t('a07.c14.never'));
    return esc(t('a07.c14.at', { when: A.fmtDT(s.roomFormatChangedAt), who: s.roomFormatChangedBy || '' }));
  }
  function pwField(f, key, prop, ac, withRule) {
    var p = S.pw, dis = p.busy ? ' disabled' : '';
    return '<div class="adm-field' + (p.errors[f] ? ' field--error' : '') + '" data-field="' + f + '">' +
           '<label class="adm-label" for="a07-' + f + '">' + esc(t(key)) + '</label>' +
           '<input id="a07-' + f + '" type="' + (p.show ? 'text' : 'password') + '" autocomplete="' + ac + '" class="adm-input adm-w360" data-pw="' + prop + '"' + A.el('A-07-' + f) + dis + ' value="' + esc(p[prop]) + '">' +
           (withRule ? '<p class="adm-note"' + A.el('A-07-C23') + '>' + esc(t('a07.c23')) + '</p>' : '') +
           '<p class="error adm-ferr"' + (p.errors[f] ? '' : ' hidden') + '>' + (p.errors[f] ? esc(t(p.errors[f])) : '') + '</p></div>';
  }

  var view = {
    enter: function () {
      var s = null;
      try { s = HotelDB.settings(); } catch (e) { s = null; }
      S = { errors: {}, tried: false, busy: false, saveFailed: false, loadFailed: !s,
            pw: { cur: '', nw: '', conf: '', show: false, busy: false, errors: {}, result: null } };
      if (s) { S.saved = fromSettings(s); S.v = JSON.parse(JSON.stringify(S.saved)); }
      tzList = null;
    },
    leave: function () {
      if (clock) { clearInterval(clock); clock = null; }
      S = null;                                 // password fields emptied (§5.6)
    },
    isDirty: isDirty,
    commit: commit,
    saveBlocked: function () { return S && S.v && S.v.preset !== S.saved.preset ? 'format' : null; },
    showCommitResult: function () { A.renderView(); focusFirst(); },
    flashEnded: function () { var n = document.getElementById('a07-msg'); if (n) n.innerHTML = msgHtml(); },

    render: function () {
      var h = '<div class="adm-page adm-page--form">';
      h += '<div class="adm-head"' + A.el('A-07-S01') + '><h1 class="adm-title"' + A.el('A-07-C01') + '>' + esc(t('a07.c01')) + '</h1></div>';
      if (S.loadFailed) {
        return h + '<div class="adm-state"><p' + A.el('A-07-C28') + '>' + esc(t('a07.c28')) + '</p>' +
               '<button type="button" class="btn btn--ghost adm-btn36" data-act="reload"' + A.el('A-07-B04') + '>' + esc(t('ad.retry')) + '</button></div></div>';
      }
      var dis = S.busy ? ' disabled' : '';
      h += '<form class="adm-form adm-settings" novalidate' + A.el('A-07-S02') + '>';

      h += '<section class="adm-sect"' + A.el('A-07-S03') + '><h2 class="adm-sect__title"' + A.el('A-07-C02') + '>' + esc(t('a07.c02')) + '</h2>';
      h += '<div class="adm-pair">' + input('F01', 'a07.f01', 'nameAr', '', 'rtl') + input('F02', 'a07.f02', 'nameEn', '', 'ltr') + '</div>';
      h += '<p class="adm-note"' + A.el('A-07-C04') + '>' + esc(t('a07.c04')) + '</p></section>';

      h += '<section class="adm-sect"' + A.el('A-07-S04') + '><h2 class="adm-sect__title"' + A.el('A-07-C05') + '>' + esc(t('a07.c05')) + '</h2>';
      h += '<div class="adm-pair adm-pair--narrow">' + input('F03', 'a07.f03', 'curAr', 'adm-w160', 'rtl') + input('F04', 'a07.f04', 'curEn', 'adm-w160', 'ltr') + '</div>';
      h += currencyPreview();
      h += '<p class="adm-note"' + A.el('A-07-C07') + '>' + esc(t('a07.c07')) + '</p>';
      h += '<p class="adm-note"' + A.el('A-07-C08') + '>' + esc(t('ad.noFees')) + '</p></section>';

      h += '<section class="adm-sect"' + A.el('A-07-S05') + '><h2 class="adm-sect__title"' + A.el('A-07-C09') + '>' + esc(t('a07.c09')) + '</h2>';
      h += '<div class="adm-field"><label class="adm-label" for="a07-F05">' + esc(t('a07.f05')) + '</label>';
      h += '<select id="a07-F05" class="adm-input adm-w360" dir="ltr"' + A.el('A-07-F05') + dis + '>';
      var list = zones(), seen = false;
      list.forEach(function (z) { if (z.id === S.v.tz) seen = true; });
      if (!seen) list = [{ id: S.v.tz, label: S.v.tz + ' (' + A.offsetLabel(S.v.tz) + ')' }].concat(list);
      list.forEach(function (z) { h += '<option value="' + esc(z.id) + '"' + (z.id === S.v.tz ? ' selected' : '') + '>' + esc(z.label) + '</option>'; });
      h += '</select></div>';
      h += '<div class="adm-note"' + A.el('A-07-C10') + '><div>' + esc(t('a07.c10.l1')) + '</div><div id="a07-clock">' +
           esc(t('a07.c10.l2', { time: A.fmtTime(Date.now(), S.v.tz) })) + '</div></div></section>';

      h += '<section class="adm-sect"' + A.el('A-07-S06') + '><h2 class="adm-sect__title"' + A.el('A-07-C11') + '>' + esc(t('a07.c11')) + '</h2>';
      h += '<p class="adm-note"' + A.el('A-07-C12') + '>' + esc(t('a07.c12')) + '</p>';
      h += '<div class="adm-radios" role="radiogroup"' + A.el('A-07-F06') + '>';
      ['p1', 'p2'].forEach(function (k) {
        var on = S.v.preset === k;
        h += '<label class="choice adm-radio' + (on ? ' is-selected' : '') + '"><input type="radio" name="a07-fmt" class="sr-only" value="' + k + '"' + (on ? ' checked' : '') + dis + '>' +
             '<span class="choice__mark" aria-hidden="true"></span><span><span class="choice__label">' + esc(t('a07.' + k + '.l1')) + '</span>' +
             '<span class="choice__sub">' + esc(t('a07.' + k + '.l2')) + '</span></span></label>';
      });
      h += '</div>';
      h += '<p class="adm-note"' + A.el('A-07-C14') + '>' + auditLine() + '</p>';
      h += '<p class="adm-note"' + A.el('A-07-C15') + '>' + esc(t('a07.c15')) + '</p></section>';

      h += '<p class="adm-note"' + A.el('A-07-C20') + '>' + esc(t('ad.propagate')) + '</p>';
      h += '<div id="a07-msg" data-flash="A-07">' + msgHtml() + '</div>';
      h += '<div class="adm-actions"><button type="submit" class="btn btn--primary adm-btn44 adm-w160"' + A.el('A-07-B01') + (isDirty() && !S.busy ? '' : ' disabled') + '>' +
           (S.busy ? '<span' + A.el('A-07-C21') + '>' + esc(t('ad.saving')) + '</span>' : esc(t('ad.save'))) + '</button></div>';
      h += '</form>';

      /* Password group (§5.6) */
      var p = S.pw, anyPw = p.cur || p.nw || p.conf;
      h += '<section class="adm-pwbox"' + A.el('A-07-S07') + '>';
      h += '<div class="adm-pwbox__head"><h2 class="adm-sect__title"' + A.el('A-07-C22') + '>' + esc(t('a07.c22')) + '</h2>' +
           '<button type="button" class="adm-textbtn" data-act="pwshow"' + A.el('A-07-B02') + (anyPw ? '' : ' hidden') + '>' + esc(t(p.show ? 'a07.b02.hide' : 'a07.b02.show')) + '</button></div>';
      h += '<p class="adm-note"' + A.el('A-07-C26') + '>' + esc(t('a07.c26')) + '</p>';
      h += pwField('F07', 'a07.f07', 'cur', 'current-password');
      h += pwField('F08', 'a07.f08', 'nw', 'new-password', true);
      h += pwField('F09', 'a07.f09', 'conf', 'new-password');
      h += '<button type="button" class="btn btn--ghost adm-btn44" data-act="pwchange"' + A.el('A-07-B03') + (p.cur && p.nw && p.conf && !p.busy ? '' : ' disabled') + '>' +
           (p.busy ? '<span' + A.el('A-07-C24') + '>' + esc(t('a07.c24')) + '</span>' : esc(t('a07.b03'))) + '</button>';
      if (p.result) h += '<p class="' + (p.result === 'a07.c25.ok' ? 'adm-confirm' : 'error') + '"' + A.el('A-07-C25') + '>' + esc(t(p.result)) + '</p>';
      h += '</section></div>';
      return h;
    },

    mount: function (root) {
      root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b || !root.contains(b) || b.disabled) return;
        var act = b.getAttribute('data-act');
        if (act === 'reload') { view.enter(); A.renderView(); }
        else if (act === 'pwshow') {
          S.pw.show = !S.pw.show;
          var ins = root.querySelectorAll('[data-pw]');
          for (var i = 0; i < ins.length; i++) ins[i].type = S.pw.show ? 'text' : 'password';
          b.textContent = t(S.pw.show ? 'a07.b02.hide' : 'a07.b02.show');
        } else if (act === 'pwchange') changePassword();
      });
      var form = root.querySelector('form');
      if (!form) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!isDirty() || S.busy) return;
        if (S.v.preset !== S.saved.preset) {
          var r = validate();
          S.tried = true; S.errors = r.errors; S.saveFailed = false;
          if (r.order.length) { S.focus = r.order[0]; A.renderView(); focusFirst(); return; }  // AM-04 does not open
          A.Modal.open('AM-04', { from: S.saved.preset, to: S.v.preset });
          return;
        }
        commit();
        A.renderView();
        focusFirst();
      });

      var ins = root.querySelectorAll('[data-prop]');
      for (var i = 0; i < ins.length; i++) bindField(ins[i]);
      var tz = root.querySelector('#a07-F05');
      tz.addEventListener('change', function () { S.v.tz = tz.value; updateClock(); updateSave(); });
      var radios = root.querySelectorAll('input[name="a07-fmt"]');
      for (var j = 0; j < radios.length; j++) radios[j].addEventListener('change', function () {
        S.v.preset = this.value;
        var ls = root.querySelectorAll('.adm-radio');
        for (var k = 0; k < ls.length; k++) ls[k].classList.toggle('is-selected', ls[k].querySelector('input').checked);
        updateSave();
      });

      var pws = root.querySelectorAll('[data-pw]');
      for (var m = 0; m < pws.length; m++) (function (el) {
        var prop = el.getAttribute('data-pw');
        var f = el.closest('[data-field]').getAttribute('data-field');
        el.addEventListener('input', function () {
          S.pw[prop] = el.value;
          if (S.pw.errors[f]) {                       // each message clears when its field is edited
            delete S.pw.errors[f];
            var box = el.closest('[data-field]'); box.classList.remove('field--error');
            var pe = box.querySelector('.adm-ferr'); pe.textContent = ''; pe.setAttribute('hidden', '');
          }
          if (S.pw.result && S.pw.result !== 'a07.c25.ok') { S.pw.result = null; var r = document.querySelector('[data-el="A-07-C25"]'); if (r) r.parentNode.removeChild(r); }
          var p = S.pw;
          var b3 = document.querySelector('[data-el="A-07-B03"]'); if (b3) b3.disabled = !(p.cur && p.nw && p.conf) || p.busy;
          var b2 = document.querySelector('[data-el="A-07-B02"]'); if (b2) { if (p.cur || p.nw || p.conf) b2.removeAttribute('hidden'); else b2.setAttribute('hidden', ''); }
        });
        if (prop === 'conf') el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); changePassword(); } });
      })(pws[m]);

      if (clock) clearInterval(clock);
      clock = setInterval(updateClock, 60000);
    }
  };

  function msgHtml() {
    if (!S) return '';
    if (S.saveFailed) return '<p class="error"' + A.el('A-07-C18') + '>' + esc(t('ad.formSaveFail')) + '</p>';
    if (S.tried && Object.keys(S.errors).length) return '<p class="error"' + A.el('A-07-C17') + '>' + esc(t('ad.checkFields')) + '</p>';
    if (A.getFlash('A-07')) return '<p class="adm-confirm"' + A.el('A-07-C19') + '>' + esc(t('a07.c19')) + '</p>';
    return '';
  }

  function bindField(el) {
    var prop = el.getAttribute('data-prop');
    var f = el.closest('[data-field]').getAttribute('data-field');
    el.addEventListener('input', function () {
      if (/[\r\n]/.test(el.value)) el.value = A.oneLine(el.value);
      S.v[prop] = el.value;
      var c = document.querySelector('[data-counter="' + f + '"]');
      if (c) { var u = len(el.value); c.textContent = u + '/24'; c.classList.toggle('is-over', u > 24); }
      if (prop === 'curAr' || prop === 'curEn') {
        var old = document.getElementById('a07-c06');
        if (old) { var w = document.createElement('div'); w.innerHTML = currencyPreview(); old.parentNode.replaceChild(w.firstChild, old); }
      }
      updateSave();
    });
    el.addEventListener('blur', function () {
      if (!S) return;
      if (prop === 'nameAr' || prop === 'nameEn') {
        var c2 = el.value.replace(/ {2,}/g, ' ');
        if (c2 !== el.value) { el.value = c2; S.v[prop] = c2; }
      }
      if (S.tried) {
        var k = validate().errors[f];
        if (k) S.errors[f] = k; else delete S.errors[f];
        var box = el.closest('[data-field]');
        box.classList.toggle('field--error', !!k);
        var p = box.querySelector('[data-err]');
        p.textContent = k ? t(k) : '';
        if (k) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
      }
    });
  }

  function updateSave() {
    var b = document.querySelector('[data-el="A-07-B01"]');
    if (b) b.disabled = !isDirty() || S.busy;
  }
  function updateClock() {
    var n = document.getElementById('a07-clock');
    if (n && S && S.v) n.textContent = t('a07.c10.l2', { time: A.fmtTime(Date.now(), S.v.tz) });
  }
  function focusFirst() {
    if (!S || !S.focus) return;
    var el = document.getElementById('a07-' + S.focus);
    S.focus = null;
    if (el) el.focus();
  }

  function changePassword() {
    var p = S.pw;
    if (p.busy || !(p.cur && p.nw && p.conf)) return;
    var e = {};
    var rec = HotelDB.admin() || {};
    if (!p.cur) e.F07 = 'a07.err.f07.empty';
    if (!p.nw) e.F08 = 'a07.err.f08.empty';
    else if (p.nw.length < 8) e.F08 = 'a07.err.f08.short';
    else if (p.nw.length > 72) e.F08 = 'a07.err.f08.long';
    else if (p.nw === p.cur) e.F08 = 'a07.err.f08.same';
    else if (p.nw.toLowerCase() === String(rec.email || '').toLowerCase()) e.F08 = 'a07.err.f08.email';
    if (!p.conf) e.F09 = 'a07.err.f09.empty';
    else if (p.conf !== p.nw) e.F09 = 'a07.err.f09.diff';
    p.errors = e; p.result = null;
    if (Object.keys(e).length) { A.renderView(); return; }
    p.busy = true; p.show = false; A.renderView();
    setTimeout(function () {
      if (!S) return;
      var a = null;
      try { a = HotelDB.admin(); } catch (x) { a = null; }
      p.busy = false;
      if (!a) { p.result = 'a07.err.pw.conn'; A.renderView(); return; }
      if (a.passwordHash !== HotelDB.hashPassword(p.cur)) {
        if (A.fails.add()) {                       // the fifth: the session ends, A-01 locked
          A.endSession(); A.forgetNext(); A.notice = null;
          S = null; A.navigate('#/signin', { force: true });
          return;
        }
        p.errors = { F07: 'a07.err.f07.wrong' };
        A.renderView();
        return;
      }
      a.passwordHash = HotelDB.hashPassword(p.nw);
      /* A new session id: this browser stays signed in, any session held
         elsewhere under the old id is no longer the account's session. */
      if (a.session) a.session.id = 's' + Date.now().toString(36);
      var ok = HotelDB.saveAdmin(a) !== false;
      if (!ok) { p.result = 'a07.err.pw.conn'; A.renderView(); return; }
      p.cur = ''; p.nw = ''; p.conf = ''; p.errors = {}; p.result = 'a07.c25.ok';
      A.renderView();
      setTimeout(function () {
        if (S && S.pw === p && p.result === 'a07.c25.ok') {
          p.result = null;
          var r = document.querySelector('[data-el="A-07-C25"]'); if (r) r.parentNode.removeChild(r);
        }
      }, 10000);
    }, 200);
  }

  /* For AM-04. */
  A.a07 = {
    PRESETS: PRESETS,
    presetOf: presetOf,
    otherEdits: function () { return !!S && otherEdits(); },
    record: function (presetKey) { return record(presetKey); },
    /* AM-04 Cancel: the format returns to the saved one, other edits kept. */
    revertFormat: function () {
      if (!S) return;
      S.v.preset = S.saved.preset;
      A.renderView();
      var r = document.querySelector('input[name="a07-fmt"]:checked') || document.querySelector('input[name="a07-fmt"]');
      if (r) r.focus();
    },
    saved: function () { afterSaved(); A.renderView(); }
  };

  A.views['A-07'] = view;
})();
