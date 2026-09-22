/* A-06 — الطلبات / Orders. spec/admin/screens/A-06.md
   Read-only order history from HotelDB.orders(): filters kept in the URL, a
   summary of the whole filtered set, 50 rows a page, and a CSV built in the
   browser (a Blob download — there is no server). */
(function () {
  'use strict';
  var A = window.Admin;

  I18N.register({
    'a06.c01': { ar: 'الطلبات', en: 'Orders' },
    'a06.b02': { ar: 'تصدير CSV', en: 'Export CSV' },
    'a06.c03': { ar: 'جارٍ التصدير…', en: 'Exporting…' },
    'a06.f01': { ar: 'الفترة', en: 'Period' },
    'a06.f01.today':  { ar: 'اليوم', en: 'Today' },
    'a06.f01.7d':     { ar: 'آخر 7 أيام', en: 'Last 7 days' },
    'a06.f01.30d':    { ar: 'آخر 30 يومًا', en: 'Last 30 days' },
    'a06.f01.custom': { ar: 'فترة مخصصة', en: 'Custom range' },
    'a06.f02': { ar: 'من', en: 'From' },
    'a06.f03': { ar: 'إلى', en: 'To' },
    'a06.b03': { ar: 'تطبيق', en: 'Apply' },
    'a06.f04': { ar: 'الحالة', en: 'Status' },
    'a06.f04.all': { ar: 'كل الحالات', en: 'All statuses' },
    'a06.f05': { ar: 'الغرفة', en: 'Room' },
    'a06.c05': { ar: 'تُحفظ الطلبات 365 يومًا. أقدم تاريخ متاح: {date}', en: 'Orders are kept for 365 days. Earliest available date: {date}' },
    'a06.c06': { ar: 'الطلبات', en: 'Orders' },
    'a06.c07': { ar: 'المسلَّمة', en: 'Delivered' },
    'a06.c08': { ar: 'الإيراد', en: 'Revenue' },
    'a06.c09': { ar: 'منها نقدًا', en: 'Of which cash' },
    'a06.c10': { ar: 'منها بطاقة', en: 'Of which card' },
    'a06.col.no':     { ar: 'رقم الطلب', en: 'Order' },
    'a06.col.time':   { ar: 'الوقت', en: 'Time' },
    'a06.col.room':   { ar: 'الغرفة', en: 'Room' },
    'a06.col.items':  { ar: 'المنتجات', en: 'Items' },
    'a06.col.total':  { ar: 'الإجمالي', en: 'Total' },
    'a06.col.pay':    { ar: 'الدفع', en: 'Payment' },
    'a06.col.status': { ar: 'الحالة', en: 'Status' },
    'a06.b06': { ar: 'السابق', en: 'Previous' },
    'a06.b07': { ar: 'التالي', en: 'Next' },
    'a06.c14': { ar: 'الصفحة {p} من {P}', en: 'Page {p} of {P}' },
    'a06.c15.l1': { ar: 'لا توجد طلبات بعد', en: 'No orders yet' },
    'a06.c15.l2': { ar: 'تظهر هنا الطلبات التي يرسلها النزلاء من المتجر', en: 'Orders that guests send from the store appear here' },
    'a06.c16': { ar: 'لا توجد طلبات تطابق عوامل التصفية', en: 'No orders match these filters' },
    'a06.c18': { ar: 'تعذّر تحميل الطلبات', en: 'Orders could not be loaded' },
    'a06.c19': { ar: 'تعذّر تصدير الملف — تحقّق من الاتصال وحاول مرة أخرى', en: 'The file could not be exported — check your connection and try again' },
    /* §7.2 */
    'a06.err.date.empty':  { ar: 'أدخل التاريخ', en: 'Enter the date' },
    'a06.err.date.format': { ar: 'اكتب التاريخ بالصيغة يوم/شهر/سنة، مثل 22/09/2026', en: 'Write the date as DD/MM/YYYY, for example 22/09/2026' },
    'a06.err.date.real':   { ar: 'هذا التاريخ غير موجود', en: 'This date does not exist' },
    'a06.err.date.future': { ar: 'لا يمكن اختيار تاريخ بعد اليوم', en: 'You cannot choose a date after today' },
    'a06.err.date.old':    { ar: 'تُحفظ الطلبات 365 يومًا فقط — أقدم تاريخ متاح {date}', en: 'Orders are kept for 365 days only — the earliest available date is {date}' },
    'a06.err.date.order':  { ar: 'تاريخ البداية بعد تاريخ النهاية', en: 'The start date is after the end date' },
    /* §7.3 */
    'a06.err.room.chars': { ar: 'رقم الغرفة يحتوي على أرقام وحروف لاتينية وشرطة أو مسافة فقط', en: 'A room number contains only digits, Latin letters, a hyphen or a space' },
    'a06.err.room.long':  { ar: 'رقم الغرفة 6 خانات كحد أقصى', en: 'A room number is 6 characters at most' },
    /* §7.7 — CSV header */
    'a06.csv.no':     { ar: 'رقم الطلب', en: 'Order number' },
    'a06.csv.date':   { ar: 'التاريخ', en: 'Date' },
    'a06.csv.time':   { ar: 'الوقت', en: 'Time' },
    'a06.csv.room':   { ar: 'الغرفة', en: 'Room' },
    'a06.csv.status': { ar: 'الحالة', en: 'Status' },
    'a06.csv.pay':    { ar: 'الدفع', en: 'Payment' },
    'a06.csv.amount': { ar: 'المبلغ الذي سيدفع به', en: 'Amount the guest will pay with' },
    'a06.csv.items':  { ar: 'المنتجات', en: 'Items' },
    'a06.csv.units':  { ar: 'عدد القطع', en: 'Units' },
    'a06.csv.total':  { ar: 'الإجمالي ({label})', en: 'Total ({label})' },
    'a06.csv.notes':  { ar: 'الملاحظات', en: 'Notes' },
    'a06.csv.last':   { ar: 'آخر تغيير للحالة', en: 'Last status change' },
    'a06.csv.reason': { ar: 'سبب الإلغاء', en: 'Cancellation reason' }
  });

  var PER_PAGE = 50;
  var PERIODS = ['today', '7d', '30d'];
  var S = {};

  function defaults() {
    return { p: '30d', from: null, to: null, status: '', room: '', page: 1 };
  }

  /* ---- URL ⇄ applied filters (§7.6) ---- */
  function fromQuery(q) {
    var f = defaults(), bad = false;
    if (q.p && PERIODS.indexOf(q.p) >= 0) f.p = q.p;
    else if (q.p === 'custom') {
      var a = A.parseIso(q.from), b = A.parseIso(q.to);
      if (a && b && !rangeError(a, b)) { f.p = 'custom'; f.from = a; f.to = b; } else bad = true;
    } else if (q.p) bad = true;
    if (q.status) { if (HotelDB.STATUSES.indexOf(q.status) >= 0) f.status = q.status; else bad = true; }
    if (q.room) { var r = roomNorm(q.room); if (!roomError(r)) f.room = A.trim(r); else bad = true; }
    if (q.page) { var n = parseInt(q.page, 10); if (n >= 1 && String(n) === String(q.page)) f.page = n; else bad = true; }
    return { f: f, bad: bad };
  }
  function toHash(f) {
    return A.buildHash('/orders', {
      p: f.p, from: f.p === 'custom' ? A.isoYMD(f.from) : '', to: f.p === 'custom' ? A.isoYMD(f.to) : '',
      status: f.status, room: f.room, page: f.page > 1 ? f.page : ''
    });
  }
  function syncUrl() { A.replaceHash(toHash(S.f)); }
  function isDefault(f) { return f.p === '30d' && !f.status && !f.room; }

  function rangeOf(f) { return f.p === 'custom' ? A.range(f.from, f.to) : A.period(f.p); }

  /* ---- Field rules ---- */
  function roomNorm(v) { return A.toWestern(v); }
  function roomError(v) {
    var s = A.trim(v);
    if (!s) return null;
    if (!/^[0-9A-Za-z\- ]+$/.test(s)) return 'a06.err.room.chars';
    if (s.length > 6) return 'a06.err.room.long';
    return null;
  }
  function parseDate(raw) {
    var v = A.trim(A.toWestern(raw)).replace(/[-.]/g, '/');
    if (!v) return { err: 'a06.err.date.empty' };
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
    if (!m) return { err: 'a06.err.date.format' };
    var ymd = { y: +m[3], m: +m[2], d: +m[1] };
    var chk = A.ymdAdd(ymd, 0);
    if (ymd.m < 1 || ymd.m > 12 || ymd.d < 1 || chk.y !== ymd.y || chk.m !== ymd.m || chk.d !== ymd.d) return { err: 'a06.err.date.real' };
    if (A.ymdCmp(ymd, A.today()) > 0) return { err: 'a06.err.date.future' };
    if (A.ymdCmp(ymd, A.earliestYMD()) < 0) return { err: 'a06.err.date.old' };
    return { ymd: ymd };
  }
  function rangeError(a, b) {
    if (A.ymdCmp(b, A.today()) > 0 || A.ymdCmp(a, A.earliestYMD()) < 0) return true;
    return A.ymdCmp(a, b) > 0;
  }

  /* ---- The "fetch": the whole filtered set, newest first ---- */
  function fetch() {
    try {
      var f = S.f, rng = rangeOf(f);
      var room = f.room ? f.room.toLowerCase() : '';
      var list = A.ordersIn(rng).filter(function (o) {
        if (f.status && o.status !== f.status) return false;
        if (room && A.trim(o.roomNumber).toLowerCase() !== room) return false;
        return true;
      });
      var sum = { orders: list.length, delivered: 0, revenue: 0, cash: 0, card: 0 };
      list.forEach(function (o) {
        if (o.status !== 'Delivered') return;
        var tot = Number(o.total) || 0;
        sum.delivered++; sum.revenue += tot;
        if (o.payment === 'cash') sum.cash += tot; else sum.card += tot;
      });
      S.list = list; S.sum = sum; S.anyEver = A.orders().length > 0; S.failed = false;
      var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
      if (f.page > pages) { f.page = pages; syncUrl(); }
    } catch (e) { S.failed = true; S.list = []; S.sum = null; }
    S.fetchedAt = Date.now();
  }

  /* ---- CSV (§7.7) ---- */
  function cell(v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;                    // formula guard
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function reasonOf(o) {
    if (o.status !== 'Cancelled') return '';
    var ar = A.trim(o.cancelReasonAr), en = A.trim(o.cancelReasonEn);
    return I18N.lang === 'en' ? (en || ar) : (ar || en);
  }
  A.a06 = { reasonOf: reasonOf };
  function buildCsv(list) {
    var s = A.settings();
    var label = I18N.lang === 'en' ? (s.currencyEn || 'SAR') : (s.currencyAr || 'ر.س');
    var head = ['no', 'date', 'time', 'room', 'status', 'pay', 'amount', 'items', 'units', 'total', 'notes', 'last', 'reason']
      .map(function (k) { return cell(t('a06.csv.' + k, { label: label })); }).join(',');
    var rows = [head];
    list.forEach(function (o) {
      var items = (o.lines || []).map(function (l) { return (Number(l.qty) || 0) + ' × ' + A.lineName(l); }).join(' | ');
      var last = o.updatedAt || o.cancelledAt || o.createdAt;
      rows.push([
        o.orderNo, A.fmtDate(o.createdAt), A.fmtTime(o.createdAt), o.roomNumber,
        t('ad.status.' + o.status), t(o.payment === 'cash' ? 'ad.pay.cash' : 'ad.pay.card'),
        o.payment === 'cash' && o.amount != null && o.amount !== '' ? String(o.amount) : '',
        items, A.units(o), A.amount(o.total), o.notes || '', A.fmtDT(last), reasonOf(o)
      ].map(cell).join(','));
    });
    return '﻿' + rows.join('\r\n') + '\r\n';
  }
  function exportCsv() {
    S.exporting = true; S.exportFailed = false; A.renderView();
    setTimeout(function () {
      try {
        fetch();
        var csv = buildCsv(S.list);
        var rng = rangeOf(S.f);
        var name = 'orders_' + A.isoYMD(rng.fromYMD) + '_' + A.isoYMD(rng.toYMD) + '.csv';
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = name; a.style.display = 'none';
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 1000);
        A.lastCsv = { name: name, text: csv };
      } catch (e) { S.exportFailed = true; }
      S.exporting = false;
      if (A.cur.id === 'A-06') A.renderView();
    }, 50);
  }

  /* ---- Rendering ---- */
  function fig(el, label, value) {
    return '<div class="adm-fig adm-fig--88"' + A.el(el) + '><div class="adm-fig__label">' + esc(label) + '</div>' +
           '<div class="adm-fig__value adm-fig__value--24">' + esc(value) + '</div></div>';
  }
  function filterErr(field) {
    var k = S.errs[field];
    if (!k) return '';
    return '<p class="error adm-ferr"' + A.el('A-06-C04') + '>' + esc(t(k, { date: A.fmtYMD(A.earliestYMD()) })) + '</p>';
  }
  function hasErr() { return !!(S.errs.from || S.errs.to || S.errs.room); }

  var view = {
    enter: function (params, query) {
      var r = fromQuery(query || {});
      S = { f: r.f, errs: {}, exporting: false, exportFailed: false };
      S.sel = r.f.p;
      S.roomText = r.f.room;
      S.fromText = r.f.p === 'custom' ? A.fmtYMD(r.f.from) : '';
      S.toText = r.f.p === 'custom' ? A.fmtYMD(r.f.to) : '';
      if (r.bad) syncUrl(); else syncUrl();
      fetch();
    },
    render: function () {
      var f = S.f;
      var h = '<div class="adm-page">';
      var empty = !S.failed && !S.list.length;
      var canExport = !empty && !S.failed && !S.exporting && !hasErr();
      h += '<div class="adm-head"' + A.el('A-06-S01') + '><div class="adm-head__title"><h1 class="adm-title"' + A.el('A-06-C01') + '>' + esc(t('a06.c01')) + '</h1>' +
           '<span class="adm-fresh"><span' + A.el('A-06-C02') + '>' + esc(t('ad.updated', { time: A.fmtTime(S.fetchedAt) })) + '</span>' +
           '<button type="button" class="btn btn--ghost adm-btn36" data-act="refresh"' + A.el('A-06-B01') + '>' + esc(t('ad.refresh')) + '</button></span></div>' +
           '<div class="adm-head__end"><button type="button" class="btn btn--ghost adm-btn40" data-act="export"' + A.el('A-06-B02') + (canExport ? '' : ' disabled') + '>' +
           (S.exporting ? '<span' + A.el('A-06-C03') + '>' + esc(t('a06.c03')) + '</span>' : esc(t('a06.b02'))) + '</button></div></div>';
      if (S.exportFailed) h += '<p class="error"' + A.el('A-06-C19') + '>' + esc(t('a06.c19')) + '</p>';

      /* Filters */
      h += '<div class="adm-filters adm-filters--wrap"' + A.el('A-06-S02') + '>';
      h += '<label class="adm-flabel"><span>' + esc(t('a06.f01')) + '</span><select class="adm-input adm-input--40 adm-w200"' + A.el('A-06-F01') + '>';
      PERIODS.concat(['custom']).forEach(function (k) {
        h += '<option value="' + k + '"' + (S.sel === k ? ' selected' : '') + '>' + esc(t('a06.f01.' + k)) + '</option>';
      });
      h += '</select></label>';
      if (S.sel === 'custom') {
        h += '<label class="adm-flabel' + (S.errs.from ? ' field--error' : '') + '"><span>' + esc(t('a06.f02')) + '</span><input type="text" inputmode="numeric" class="adm-input adm-input--40 adm-w140 num" data-date="from"' + A.el('A-06-F02') + ' value="' + esc(S.fromText) + '">' + filterErr('from') + '</label>';
        h += '<label class="adm-flabel' + (S.errs.to ? ' field--error' : '') + '"><span>' + esc(t('a06.f03')) + '</span><input type="text" inputmode="numeric" class="adm-input adm-input--40 adm-w140 num" data-date="to"' + A.el('A-06-F03') + ' value="' + esc(S.toText) + '">' + filterErr('to') + '</label>';
        h += '<button type="button" class="btn btn--ghost adm-btn40 adm-self-end" data-act="apply"' + A.el('A-06-B03') + '>' + esc(t('a06.b03')) + '</button>';
      }
      h += '<label class="adm-flabel"><span>' + esc(t('a06.f04')) + '</span><select class="adm-input adm-input--40 adm-w240"' + A.el('A-06-F04') + '>';
      h += '<option value="">' + esc(t('a06.f04.all')) + '</option>';
      HotelDB.STATUSES.forEach(function (k) {
        h += '<option value="' + k + '"' + (f.status === k ? ' selected' : '') + '>' + esc(t('ad.status.' + k)) + '</option>';
      });
      h += '</select></label>';
      h += '<label class="adm-flabel' + (S.errs.room ? ' field--error' : '') + '"><span>' + esc(t('a06.f05')) + '</span><input type="text" dir="ltr" autocomplete="off" class="adm-input adm-input--40 adm-w140"' + A.el('A-06-F05') + ' value="' + esc(S.roomText) + '">' + filterErr('room') + '</label>';
      h += '<button type="button" class="adm-textbtn adm-self-end" data-act="clear"' + A.el('A-06-B04') + (isDefault(f) ? ' hidden' : '') + '>' + esc(t('ad.clearFilters')) + '</button>';
      h += '</div>';
      h += '<p class="adm-note"' + A.el('A-06-C05') + '>' + esc(t('a06.c05', { date: A.fmtYMD(A.earliestYMD()) })) + '</p>';

      /* Summary strip */
      var s = S.sum, dash = S.failed;
      h += '<div class="adm-figs adm-figs--5"' + A.el('A-06-S03') + '>';
      h += fig('A-06-C06', t('a06.c06'), dash ? '—' : A.count(s.orders));
      h += fig('A-06-C07', t('a06.c07'), dash ? '—' : A.count(s.delivered));
      h += fig('A-06-C08', t('a06.c08'), dash ? '—' : A.money(s.revenue));
      h += fig('A-06-C09', t('a06.c09'), dash ? '—' : A.money(s.cash));
      h += fig('A-06-C10', t('a06.c10'), dash ? '—' : A.money(s.card));
      h += '</div><p class="adm-foot"' + A.el('A-06-C11') + '>' + esc(t('ad.revenueNote')) + '</p>';

      /* Table */
      h += '<section class="adm-list"' + A.el('A-06-S04') + '>';
      if (S.failed) {
        h += '<div class="adm-state"><p' + A.el('A-06-C18') + '>' + esc(t('a06.c18')) + '</p><button type="button" class="btn btn--ghost adm-btn36" data-act="refresh"' + A.el('A-06-B08') + '>' + esc(t('ad.retry')) + '</button></div>';
      } else if (empty) {
        if (!S.anyEver && isDefault(f)) h += '<div class="adm-state"' + A.el('A-06-C15') + '><p class="bold">' + esc(t('a06.c15.l1')) + '</p><p>' + esc(t('a06.c15.l2')) + '</p></div>';
        else h += '<div class="adm-state"' + A.el('A-06-C16') + '><p>' + esc(t('a06.c16')) + '</p><button type="button" class="adm-textbtn" data-act="clear"' + A.el('A-06-B04') + '>' + esc(t('ad.clearFilters')) + '</button></div>';
      } else {
        var pages = Math.max(1, Math.ceil(S.list.length / PER_PAGE));
        var page = Math.min(f.page, pages);
        var slice = S.list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
        h += '<div class="adm-tablewrap"><table class="adm-table adm-table--orders"><thead><tr' + A.el('A-06-C12') + '>' +
             ['no', 'time', 'room', 'items', 'total', 'pay', 'status'].map(function (k) { return '<th>' + esc(t('a06.col.' + k)) + '</th>'; }).join('') +
             '</tr></thead><tbody>';
        slice.forEach(function (o) {
          h += '<tr class="adm-orow" tabindex="0" data-no="' + esc(o.orderNo) + '"' + A.el('A-06-C13') + '>' +
               '<td class="num" data-cell="no"' + A.el('A-06-B05') + '>' + esc(o.orderNo) + '</td>' +
               '<td><span class="num">' + esc(A.fmtDT(o.createdAt)) + '</span></td>' +
               '<td><span class="num adm-room">' + esc(o.roomNumber) + '</span></td>' +
               '<td>' + esc(A.itemsLabel(A.units(o))) + '</td>' +
               '<td>' + esc(A.money(o.total)) + '</td>' +
               '<td>' + esc(t(o.payment === 'cash' ? 'ad.pay.cash' : 'ad.pay.card')) + '</td>' +
               '<td><span class="adm-pill adm-pill--status">' + esc(t('ad.status.' + o.status)) + '</span></td></tr>';
        });
        h += '</tbody></table></div>';
        if (pages > 1) {
          h += '<div class="adm-pager"' + A.el('A-06-S05') + '>' +
               '<button type="button" class="btn btn--ghost adm-btn36" data-act="prev"' + A.el('A-06-B06') + (page <= 1 ? ' disabled' : '') + '>' + esc(t('a06.b06')) + '</button>' +
               '<span class="small"' + A.el('A-06-C14') + '>' + esc(t('a06.c14', { p: page, P: pages })) + '</span>' +
               '<button type="button" class="btn btn--ghost adm-btn36" data-act="next"' + A.el('A-06-B07') + (page >= pages ? ' disabled' : '') + '>' + esc(t('a06.b07')) + '</button></div>';
        }
      }
      h += '</section></div>';
      return h;
    },

    mount: function (root) {
      function apply(resetPage) {
        if (resetPage) S.f.page = 1;
        syncUrl(); fetch(); A.renderView();
      }
      root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (b && root.contains(b)) {
          if (b.disabled) return;
          var act = b.getAttribute('data-act');
          if (act === 'refresh') { fetch(); A.renderView(); }
          else if (act === 'export') exportCsv();
          else if (act === 'clear') {
            S.f = defaults(); S.sel = '30d'; S.errs = {}; S.roomText = ''; S.fromText = ''; S.toText = '';
            apply(true);
          } else if (act === 'apply') applyCustom();
          else if (act === 'prev' || act === 'next') { S.f.page += act === 'prev' ? -1 : 1; syncUrl(); A.renderView(); window.scrollTo(0, 0); }
          return;
        }
        var row = e.target.closest('.adm-orow');
        if (row && root.contains(row)) A.Modal.open('AM-03', { orderNo: row.getAttribute('data-no') });
      });
      root.addEventListener('keydown', function (e) {
        var row = e.target.closest && e.target.closest('.adm-orow');
        if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); A.Modal.open('AM-03', { orderNo: row.getAttribute('data-no') }); }
      });

      var per = root.querySelector('[data-el="A-06-F01"]');
      per.addEventListener('change', function () {
        if (per.value === 'custom') {
          /* Prefilled with the boundaries of the selected period; nothing
             is applied until Apply (§4 F01). */
          var rng = rangeOf(S.f);
          S.sel = 'custom'; S.fromText = A.fmtYMD(rng.fromYMD); S.toText = A.fmtYMD(rng.toYMD); S.errs.from = null; S.errs.to = null;
          A.renderView();
          var ff = document.querySelector('[data-el="A-06-F02"]'); if (ff) ff.focus();
        } else {
          S.sel = per.value; S.f.p = per.value; S.f.from = null; S.f.to = null; S.errs.from = null; S.errs.to = null;
          apply(true);
        }
      });
      var st = root.querySelector('[data-el="A-06-F04"]');
      st.addEventListener('change', function () { S.f.status = st.value; apply(true); });

      var dates = root.querySelectorAll('[data-date]');
      for (var i = 0; i < dates.length; i++) (function (el) {
        var which = el.getAttribute('data-date');
        el.addEventListener('input', function () {
          var w = A.toWestern(el.value);                 // converted as typed
          if (w !== el.value) { var p = el.selectionStart; el.value = w; try { el.setSelectionRange(p, p); } catch (x) {} }
          if (which === 'from') S.fromText = el.value; else S.toText = el.value;
        });
        el.addEventListener('blur', function () {
          var v = A.trim(A.toWestern(el.value)).replace(/[-.]/g, '/');
          var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
          if (m) v = A.pad2(+m[1]) + '/' + A.pad2(+m[2]) + '/' + m[3];   // padded on blur
          el.value = v;
          if (which === 'from') S.fromText = v; else S.toText = v;
        });
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); el.blur(); applyCustom(); } });
      })(dates[i]);

      var room = root.querySelector('[data-el="A-06-F05"]');
      room.addEventListener('input', function () {
        var w = A.toWestern(room.value);
        if (w !== room.value) { var p = room.selectionStart; room.value = w; try { room.setSelectionRange(p, p); } catch (x) {} }
        S.roomText = room.value;
      });
      function applyRoom() {
        var v = A.trim(room.value);
        var err = roomError(v);
        S.errs.room = err;
        if (!err && v !== S.f.room) { S.f.room = v; apply(true); return; }
        if (err || (!err && hadRoomErr)) A.renderView();
      }
      var hadRoomErr = !!S.errs.room;
      room.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); applyRoom(); } });
      room.addEventListener('change', applyRoom);
    }
  };

  function applyCustom() {
    var a = parseDate(S.fromText), b = parseDate(S.toText);
    S.errs.from = a.err || null; S.errs.to = b.err || null;
    if (!a.err && !b.err && A.ymdCmp(a.ymd, b.ymd) > 0) S.errs.from = 'a06.err.date.order';
    if (S.errs.from || S.errs.to) { A.renderView(); return; }
    S.f.p = 'custom'; S.f.from = a.ymd; S.f.to = b.ymd; S.f.page = 1;
    S.fromText = A.fmtYMD(a.ymd); S.toText = A.fmtYMD(b.ymd);
    syncUrl(); fetch(); A.renderView();
  }

  A.views['A-06'] = view;
})();
