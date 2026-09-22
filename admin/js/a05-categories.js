/* A-05 — الفئات / Categories. spec/admin/screens/A-05.md
   The guest's category bar, written out as rows. Order changes save at
   once; names are committed by the inline row's own Save. Every write goes
   through HotelDB.saveCatalog(). */
(function () {
  'use strict';
  var A = window.Admin;

  I18N.register({
    'a05.c01': { ar: 'الفئات', en: 'Categories' },
    'a05.c02': { ar: '{N} من 20 فئة', en: '{N} of 20 categories' },
    'a05.b01': { ar: '+ فئة جديدة', en: '+ New category' },
    'a05.c03': { ar: 'ترتيب الفئات هنا هو ترتيب شريط الفئات في المتجر. الفئة التي لا منتجات فيها لا تظهر للنزيل.',
                 en: 'The order here is the order of the category bar in the store. A category with no products is not shown to guests.' },
    'a05.col.no': { ar: '#', en: '#' },
    'a05.col.ar': { ar: 'الاسم بالعربية', en: 'Arabic name' },
    'a05.col.en': { ar: 'الاسم بالإنجليزية', en: 'English name' },
    'a05.col.products': { ar: 'المنتجات', en: 'Products' },
    'a05.col.store': { ar: 'في المتجر', en: 'In the store' },
    'a05.col.order': { ar: 'الترتيب', en: 'Order' },
    'a05.col.actions': { ar: '—', en: '—' },
    'a05.removedPlus': { ar: '+ {R} مُزال', en: '+ {R} removed' },
    'a05.shown':  { ar: 'ظاهرة', en: 'Shown' },
    'a05.hidden': { ar: 'مخفية — بلا منتجات', en: 'Hidden — no products' },
    'a05.b02': { ar: 'نقل لأعلى', en: 'Move up' },
    'a05.b03': { ar: 'نقل لأسفل', en: 'Move down' },
    'a05.b04': { ar: 'تعديل الاسم', en: 'Rename' },
    'a05.b05': { ar: 'حذف', en: 'Delete' },
    'a05.f01': { ar: 'الاسم بالعربية *', en: 'Arabic name *' },
    'a05.f02': { ar: 'الاسم بالإنجليزية *', en: 'English name *' },
    'a05.c11': { ar: 'لا يمكن حذف فئة فيها منتجات. انقل منتجاتها إلى فئة أخرى من صفحة المنتج أولًا، بما فيها المنتجات المُزالة.',
                 en: 'A category that holds products cannot be deleted. First move its products to another category on the product page, including removed products.' },
    'a05.c12': { ar: 'بلغت الحد الأقصى 20 فئة. احذف فئة فارغة لإضافة أخرى.', en: 'You have reached the maximum of 20 categories. Delete an empty category to add another.' },
    'a05.c13.l1': { ar: 'لا توجد فئات بعد', en: 'No categories yet' },
    'a05.c13.l2': { ar: 'أنشئ فئة واحدة على الأقل لتتمكن من إضافة المنتجات', en: 'Create at least one category so you can add products' },
    'a05.c15': { ar: 'تعذّر تحميل الفئات', en: 'Categories could not be loaded' },
    'a05.c05.add':    { ar: 'تمت إضافة الفئة "{name}"', en: 'The category "{name}" was added' },
    'a05.c05.rename': { ar: 'تم تغيير اسم الفئة إلى "{name}"', en: 'The category was renamed to "{name}"' },
    'a05.c05.delete': { ar: 'تم حذف الفئة "{name}"', en: 'The category "{name}" was deleted' },
    'a05.notEmpty':   { ar: 'تعذّر الحذف: أصبحت في هذه الفئة منتجات', en: 'Could not delete: this category now holds products' },
    'a05.err.f01.empty': { ar: 'أدخل اسم الفئة بالعربية', en: 'Enter the category name in Arabic' },
    'a05.err.f01.long':  { ar: 'اسم الفئة بالعربية 24 حرفًا كحد أقصى', en: 'The Arabic category name is 24 characters at most' },
    'a05.err.f01.dup':   { ar: 'توجد فئة أخرى بهذا الاسم بالعربية', en: 'Another category already has this Arabic name' },
    'a05.err.f02.empty': { ar: 'أدخل اسم الفئة بالإنجليزية', en: 'Enter the category name in English' },
    'a05.err.f02.long':  { ar: 'اسم الفئة بالإنجليزية 24 حرفًا كحد أقصى', en: 'The English category name is 24 characters at most' },
    'a05.err.f02.dup':   { ar: 'توجد فئة أخرى بهذا الاسم بالإنجليزية', en: 'Another category already has this English name' }
  });

  var MAX = 20, NAME_MAX = 24;
  var S = { row: null, failed: false, notice: null };

  function load() { return A.Cat.load(); }
  function renumber(c) { c.categories.forEach(function (k, i) { k.order = i; }); }
  function counts(c, id) {
    var a = 0, r = 0;
    c.products.forEach(function (p) { if (p.category === id) { if (p.removed) r++; else a++; } });
    return { a: a, r: r };
  }
  function len(s) { return A.trim(s).length; }
  function key(s) { return A.trim(s).toLowerCase(); }

  function validateRow() {
    var row = S.row, e = {}, order = [];
    var c = load();
    var others = (c ? c.categories : []).filter(function (k) { return !(row.mode === 'rename' && k.id === row.id); });
    function check(f, v, prop) {
      if (!len(v)) { e[f] = 'a05.err.' + f.toLowerCase() + '.empty'; order.push(f); return; }
      if (len(v) > NAME_MAX) { e[f] = 'a05.err.' + f.toLowerCase() + '.long'; order.push(f); return; }
      for (var i = 0; i < others.length; i++) {
        if (key(others[i][prop]) === key(v)) { e[f] = 'a05.err.' + f.toLowerCase() + '.dup'; order.push(f); return; }
      }
    }
    check('F01', row.ar, 'nameAr');
    check('F02', row.en, 'nameEn');
    return { errors: e, order: order };
  }

  function isDirty() {
    var r = S.row;
    return !!r && (A.trim(r.ar) !== A.trim(r.initAr) || A.trim(r.en) !== A.trim(r.initEn));
  }

  /* The inline row's Save — also AM-01's "Save and continue" for A-05. */
  function commit() {
    var r = S.row;
    if (!r || r.busy) return 'failed';
    var v = validateRow();
    r.tried = true; r.errors = v.errors;
    if (v.order.length) { r.focus = v.order[0]; return 'invalid'; }
    var c = load();
    var ok = false, name = null;
    if (c) {
      var ar = A.trim(A.oneLine(r.ar)).replace(/ {2,}/g, ' ');
      var en = A.trim(A.oneLine(r.en)).replace(/ {2,}/g, ' ');
      if (r.mode === 'add') {
        if (c.categories.length < MAX) {
          c.categories.push({ id: 'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nameAr: ar, nameEn: en, order: c.categories.length });
          renumber(c);
          ok = A.Cat.save(c);
        }
      } else {
        var k = null;
        c.categories.forEach(function (x) { if (x.id === r.id) k = x; });
        if (k) { k.nameAr = ar; k.nameEn = en; ok = A.Cat.save(c); }
      }
      name = { nameAr: ar, nameEn: en };
    }
    if (!ok) { S.failed = true; S.notice = null; return 'failed'; }
    S.failed = false; S.notice = null;
    A.setFlash('A-05', r.mode === 'add' ? 'a05.c05.add' : 'a05.c05.rename', name, 5000);
    S.row = null;
    return 'ok';
  }

  function msgHtml() {
    if (S.notice) return '<p class="error adm-flash"' + A.el('A-05-C06') + '>' + esc(t(S.notice)) + '</p>';
    if (S.failed) return '<p class="error adm-flash"' + A.el('A-05-C06') + '>' + esc(t('ad.saveFail')) + '</p>';
    var f = A.getFlash('A-05');
    if (!f) return '';
    var name = I18N.lang === 'en' ? (f.vars.nameEn || f.vars.nameAr) : (f.vars.nameAr || f.vars.nameEn);
    return '<p class="adm-confirm"' + A.el('A-05-C05') + '>' + esc(t(f.key, { name: name })) + '</p>';
  }

  function inlineRow() {
    var r = S.row;
    var dis = r.busy ? ' disabled' : '';
    function fld(f, label, prop, dir) {
      var err = r.errors[f];
      var u = len(r[prop]);
      return '<div class="adm-field adm-inline__f' + (err ? ' field--error' : '') + '" data-field="' + f + '">' +
             '<label class="adm-label" for="a05-' + f + '">' + esc(t(label)) + '</label>' +
             '<input id="a05-' + f + '" type="text" class="adm-input adm-input--40 adm-w280" dir="' + dir + '" data-prop="' + prop + '"' + A.el('A-05-' + f) + dis + ' value="' + esc(r[prop]) + '">' +
             '<div class="field__counter adm-counter' + (u > NAME_MAX ? ' is-over' : '') + '" data-counter="' + f + '"' + A.el('A-05-C09') + '>' + u + '/24</div>' +
             '<p class="error adm-ferr"' + A.el('A-05-C16') + (err ? '' : ' hidden') + '>' + (err ? esc(t(err)) : '') + '</p></div>';
    }
    return '<tr class="adm-inline"' + A.el('A-05-S03') + '><td colspan="7"><div class="adm-inline__box">' +
           fld('F01', 'a05.f01', 'ar', 'rtl') + fld('F02', 'a05.f02', 'en', 'ltr') +
           '<div class="adm-inline__btns">' +
           '<button type="button" class="btn btn--primary adm-btn36" data-act="rowsave"' + A.el('A-05-B06') + dis + '>' +
             (r.busy ? '<span' + A.el('A-05-C10') + '>' + esc(t('ad.saving')) + '</span>' : esc(t('ad.save'))) + '</button>' +
           '<button type="button" class="btn btn--ghost adm-btn36" data-act="rowcancel"' + A.el('A-05-B07') + dis + '>' + esc(t('ad.cancel')) + '</button>' +
           '</div></div></td></tr>';
  }

  var view = {
    enter: function () { S.row = null; S.failed = false; S.notice = null; },
    leave: function () { S.row = null; },
    isDirty: isDirty,
    commit: commit,
    saveBlocked: function () { return null; },
    showCommitResult: function () { A.renderView(); focusRow(); },
    flashEnded: function () { var n = document.getElementById('a05-msg'); if (n) n.innerHTML = msgHtml(); },

    render: function () {
      var c = load();
      var n = c ? c.categories.length : 0;
      var open = !!S.row;
      var h = '<div class="adm-page">';
      h += '<div class="adm-head"' + A.el('A-05-S01') + '><div><h1 class="adm-title"' + A.el('A-05-C01') + '>' + esc(t('a05.c01')) + '</h1>' +
           (c && n ? '<p class="adm-sub"' + A.el('A-05-C02') + '>' + esc(t('a05.c02', { N: n })) + '</p>' : '') + '</div>' +
           '<div class="adm-head__end">' + (n >= MAX ? '<span class="adm-note"' + A.el('A-05-C12') + '>' + esc(t('a05.c12')) + '</span>' : '') +
           '<button type="button" class="btn btn--primary adm-btn40" data-act="add"' + A.el('A-05-B01') + (open || n >= MAX || !c ? ' disabled' : '') + '>' + esc(t('a05.b01')) + '</button></div></div>';
      h += '<p class="adm-note"' + A.el('A-05-C03') + '>' + esc(t('a05.c03')) + '</p>';
      h += '<p class="adm-note"' + A.el('A-05-C04') + '>' + esc(t('ad.propagate.here')) + '</p>';
      h += '<div id="a05-msg" data-flash="A-05">' + msgHtml() + '</div>';

      if (!c) {
        h += '<div class="adm-state"><p' + A.el('A-05-C15') + '>' + esc(t('a05.c15')) + '</p>' +
             '<button type="button" class="btn btn--ghost adm-btn36" data-act="reload"' + A.el('A-05-B08') + '>' + esc(t('ad.retry')) + '</button></div>';
        return h + '</div>';
      }
      if (!n && !(open && S.row.mode === 'add')) {
        h += '<div class="adm-state"' + A.el('A-05-C13') + '><p class="bold">' + esc(t('a05.c13.l1')) + '</p><p>' + esc(t('a05.c13.l2')) + '</p></div>';
        return h + '</div>';
      }
      h += '<div class="adm-tablewrap"><table class="adm-table adm-table--cats"' + A.el('A-05-S02') + '>';
      h += '<thead><tr' + A.el('A-05-C07') + '><th class="adm-c-no">' + esc(t('a05.col.no')) + '</th><th>' + esc(t('a05.col.ar')) + '</th><th>' + esc(t('a05.col.en')) + '</th>' +
           '<th>' + esc(t('a05.col.products')) + '</th><th>' + esc(t('a05.col.store')) + '</th><th>' + esc(t('a05.col.order')) + '</th><th>' + esc(t('a05.col.actions')) + '</th></tr></thead><tbody>';
      c.categories.forEach(function (k, i) {
        if (open && S.row.mode === 'rename' && S.row.id === k.id) { h += inlineRow(); return; }
        var ct = counts(c, k.id);
        var full = ct.a + ct.r > 0;
        h += '<tr class="adm-crow" data-id="' + esc(k.id) + '"' + A.el('A-05-C08') + '>';
        h += '<td class="adm-c-no num">' + (i + 1) + '</td>';
        h += '<td lang="ar" dir="rtl" class="adm-c-name">' + esc(k.nameAr) + '</td>';
        h += '<td lang="en" dir="ltr" class="adm-c-name">' + esc(k.nameEn) + '</td>';
        h += '<td><span class="num">' + ct.a + '</span>' + (ct.r ? ' <span class="muted small">' + esc(t('a05.removedPlus', { R: ct.r })) + '</span>' : '') + '</td>';
        h += '<td class="small">' + esc(t(ct.a >= 1 ? 'a05.shown' : 'a05.hidden')) + '</td>';
        h += '<td class="adm-c-order"><button type="button" class="adm-iconbtn" data-act="up" aria-label="' + esc(t('a05.b02')) + '"' + A.el('A-05-B02') + (i === 0 || open ? ' disabled' : '') + '>↑</button>' +
             '<button type="button" class="adm-iconbtn" data-act="down" aria-label="' + esc(t('a05.b03')) + '"' + A.el('A-05-B03') + (i === n - 1 || open ? ' disabled' : '') + '>↓</button></td>';
        h += '<td class="adm-c-act"><button type="button" class="adm-textbtn" data-act="rename"' + A.el('A-05-B04') + (open ? ' disabled' : '') + '>' + esc(t('a05.b04')) + '</button>' +
             '<button type="button" class="adm-textbtn" data-act="delete"' + A.el('A-05-B05') + (full || open ? ' disabled' : '') + '>' + esc(t('a05.b05')) + '</button></td>';
        h += '</tr>';
      });
      if (open && S.row.mode === 'add') h += inlineRow();
      h += '</tbody></table></div>';
      if (n) h += '<p class="adm-note"' + A.el('A-05-C11') + '>' + esc(t('a05.c11')) + '</p>';
      return h + '</div>';
    },

    mount: function (root) {
      root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b || !root.contains(b) || b.disabled) return;
        var act = b.getAttribute('data-act');
        var tr = b.closest('.adm-crow');
        var id = tr ? tr.getAttribute('data-id') : null;
        if (act === 'reload') { A.renderView(); return; }
        if (act === 'add') {
          S.row = { mode: 'add', ar: '', en: '', initAr: '', initEn: '', errors: {}, tried: false };
          A.renderView(); focusRow('F01'); return;
        }
        if (act === 'rename') {
          var c0 = load(), k0 = null;
          c0.categories.forEach(function (x) { if (x.id === id) k0 = x; });
          if (!k0) return;
          S.row = { mode: 'rename', id: id, ar: k0.nameAr, en: k0.nameEn, initAr: k0.nameAr, initEn: k0.nameEn, errors: {}, tried: false };
          A.renderView(); focusRow('F01', true); return;
        }
        if (act === 'rowsave') { save(); return; }
        if (act === 'rowcancel') { S.row = null; A.renderView(); return; }
        if (act === 'up' || act === 'down') {
          var c = load();
          var i = -1; c.categories.forEach(function (x, j) { if (x.id === id) i = j; });
          var j2 = i + (act === 'up' ? -1 : 1);
          if (i < 0 || j2 < 0 || j2 >= c.categories.length) return;
          var tmp = c.categories[i]; c.categories[i] = c.categories[j2]; c.categories[j2] = tmp;
          renumber(c);
          S.failed = !A.Cat.save(c); S.notice = null;
          A.renderView();
          var again = document.querySelector('.adm-crow[data-id="' + id + '"] [data-act="' + act + '"]');
          if (again && !again.disabled) again.focus();
          return;
        }
        if (act === 'delete') {
          var c2 = load(), k2 = null;
          c2.categories.forEach(function (x) { if (x.id === id) k2 = x; });
          if (k2) A.Modal.open('AM-02', { variant: 'C', from: 'A-05', category: k2 });
        }
      });
      var ins = root.querySelectorAll('.adm-inline input');
      for (var i = 0; i < ins.length; i++) bindInline(ins[i]);
    }
  };

  function bindInline(el) {
    var prop = el.getAttribute('data-prop');
    var f = el.closest('[data-field]').getAttribute('data-field');
    el.addEventListener('input', function () {
      if (/[\r\n]/.test(el.value)) el.value = A.oneLine(el.value);
      S.row[prop] = el.value;
      var c = document.querySelector('[data-counter="' + f + '"]');
      if (c) { var u = len(el.value); c.textContent = u + '/24'; c.classList.toggle('is-over', u > NAME_MAX); }
    });
    el.addEventListener('blur', function () {
      if (!S.row) return;
      var collapsed = el.value.replace(/ {2,}/g, ' ');           // §7.1, visibly
      if (collapsed !== el.value) { el.value = collapsed; S.row[prop] = collapsed; }
      if (S.row.tried) {
        var v = validateRow();
        S.row.errors[f] = v.errors[f];
        if (!v.errors[f]) delete S.row.errors[f];
        var box = el.closest('[data-field]');
        box.classList.toggle('field--error', !!v.errors[f]);
        var p = box.querySelector('.adm-ferr');
        p.textContent = v.errors[f] ? t(v.errors[f]) : '';
        if (v.errors[f]) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
      }
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); S.row = null; A.renderView(); }
    });
  }

  function save() {
    var r = commit();
    A.renderView();
    if (r === 'invalid' || r === 'failed') focusRow();
  }

  function focusRow(f, atEnd) {
    var r = S.row;
    var which = f || (r && r.focus) || 'F01';
    if (r) r.focus = null;
    var el = document.getElementById('a05-' + which);
    if (el) { el.focus(); if (atEnd) { var n = el.value.length; try { el.setSelectionRange(n, n); } catch (e) {} } }
  }

  /* AM-02 variant C: delete an empty category (fresh read, re-checked). */
  A.a05 = {
    remove: function (id) {
      var c = load();
      if (!c) { S.failed = true; return false; }
      var ct = counts(c, id);
      var k = null, i = -1;
      c.categories.forEach(function (x, j) { if (x.id === id) { k = x; i = j; } });
      if (!k) return true;
      if (ct.a + ct.r > 0) {                                      // §6.3 case 6
        S.notice = 'a05.notEmpty'; S.failed = false;
        setTimeout(function () { if (S.notice === 'a05.notEmpty') { S.notice = null; var n = document.getElementById('a05-msg'); if (n) n.innerHTML = msgHtml(); } }, 5000);
        return false;
      }
      c.categories.splice(i, 1);
      renumber(c);
      var ok = A.Cat.save(c);
      S.failed = !ok; S.notice = null;
      if (ok) A.setFlash('A-05', 'a05.c05.delete', { nameAr: k.nameAr, nameEn: k.nameEn }, 5000);
      return ok;
    }
  };

  A.views['A-05'] = view;
})();
