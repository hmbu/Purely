/* A-03 — المنتجات / Products. spec/admin/screens/A-03.md
   The catalog in the guest's own order. Stock is switched here, inline, and
   saved at once through HotelDB.saveCatalog() — the same record the guest's
   Server.getCatalog() reads, so the next guest catalog fetch shows it. */
(function () {
  'use strict';
  var A = window.Admin;

  I18N.register({
    'a03.c01': { ar: 'المنتجات', en: 'Products' },
    'a03.c02': { ar: '{T} منتجًا — {A} معروض، {O} غير متوفر، {R} مُزال', en: '{T} products — {A} on sale, {O} out of stock, {R} removed' },
    'a03.b01': { ar: '+ منتج جديد', en: '+ New product' },
    'a03.f01': { ar: 'ابحث بالاسم', en: 'Search by name' },
    'a03.f02.all':  { ar: 'كل الفئات', en: 'All categories' },
    'a03.f02.none': { ar: 'بلا فئة', en: 'No category' },
    'a03.f03.all':     { ar: 'الكل', en: 'All' },
    'a03.f03.onsale':  { ar: 'معروض', en: 'On sale' },
    'a03.f03.out':     { ar: 'غير متوفر', en: 'Out of stock' },
    'a03.f03.removed': { ar: 'مُزال', en: 'Removed' },
    'a03.f02.label': { ar: 'الفئة', en: 'Category' },
    'a03.f03.label': { ar: 'التوفر', en: 'Stock' },
    'a03.c03': { ar: '{name} — {N} منتجات', en: '{name} — {N} products' },
    'a03.b04.on':  { ar: 'معروض', en: 'On sale' },
    'a03.b04.off': { ar: 'غير متوفر', en: 'Out of stock' },
    'a03.b05.remove':  { ar: 'إزالة', en: 'Remove' },
    'a03.b05.restore': { ar: 'استعادة', en: 'Restore' },
    'a03.b06': { ar: 'نقل لأعلى', en: 'Move up' },
    'a03.b07': { ar: 'نقل لأسفل', en: 'Move down' },
    'a03.c06.edit':    { ar: 'تم حفظ التغييرات على "{name}"', en: 'Changes to "{name}" were saved' },
    'a03.c06.create':  { ar: 'تمت إضافة "{name}" إلى المتجر', en: '"{name}" was added to the store' },
    'a03.c06.remove':  { ar: 'تمت إزالة "{name}" من المتجر', en: '"{name}" was removed from the store' },
    'a03.c06.restore': { ar: 'تمت استعادة "{name}" — لا يزال غير متوفر حتى تشغّل التوفر',
                         en: '"{name}" was restored — it stays out of stock until you switch it on' },
    'a03.c08.l1': { ar: 'لا توجد منتجات بعد', en: 'No products yet' },
    'a03.c08.l2': { ar: 'أضف أول منتج ليظهر في المتجر', en: 'Add your first product so it appears in the store' },
    'a03.c09': { ar: 'لا توجد منتجات تطابق البحث', en: 'No products match your search' },
    'a03.c11': { ar: 'بلغت الحد الأقصى 200 منتج. أزل منتجًا لإضافة آخر.', en: 'You have reached the maximum of 200 products. Remove one to add another.' },
    'a03.loadErr': { ar: 'تعذّر تحميل المنتجات', en: 'Products could not be loaded' }
  });

  var MAX_PRODUCTS = 200;

  /* ------------------------------------------------------------------ *
   * Catalog operations — each one a fresh read, one change, one write
   * (admin-map §5.4). Shared with A-04, A-05 and AM-02.
   * ------------------------------------------------------------------ */
  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  }
  var Cat = {
    load: function () { try { return HotelDB.catalog(); } catch (e) { return null; } },
    save: function (c) { try { return HotelDB.saveCatalog(c) !== false; } catch (e) { return false; } },
    product: function (id) {
      var c = Cat.load(); if (!c) return null;
      var i = find(c.products, id);
      return i < 0 ? null : c.products[i];
    },
    change: function (id, fn) {
      var c = Cat.load(); if (!c) return null;
      var i = find(c.products, id);
      if (i < 0) return null;
      fn(c.products[i], c, i);
      return Cat.save(c) ? c.products[find(c.products, id)] || c.products[i] : null;
    },
    setStock: function (id, on) { return Cat.change(id, function (p) { p.inStock = !!on; }); },
    remove: function (id) { return Cat.change(id, function (p) { p.removed = true; }); },
    /* A-03 §5.6: a restored product always comes back out of stock. */
    restore: function (id) { return Cat.change(id, function (p) { p.removed = false; p.inStock = false; }); },
    /* One place earlier (-1) or later (+1) among the active products of the
       same category; the products array order IS the guest's order. */
    move: function (id, dir) {
      var c = Cat.load(); if (!c) return false;
      var i = find(c.products, id); if (i < 0) return false;
      var p = c.products[i];
      var j = i + dir;
      while (j >= 0 && j < c.products.length && (c.products[j].category !== p.category || c.products[j].removed)) j += dir;
      if (j < 0 || j >= c.products.length) return false;
      var tmp = c.products[j]; c.products[j] = p; c.products[i] = tmp;
      return Cat.save(c);
    },
    catIds: function (c) { var m = {}; (c.categories || []).forEach(function (k) { m[k.id] = k; }); return m; }
  };
  A.Cat = Cat;

  /* ------------------------------------------------------------------ */

  var S = { q: '', cat: '', stock: '', failed: false, loadFailed: false, busyStock: {} };
  var debounce = null;

  function norm(s) { return A.toWestern(String(s || '')).toLowerCase(); }
  function filterActive() { return !!(A.trim(S.q) || S.cat || S.stock); }

  function syncUrl() {
    var h = A.buildHash('/products', { q: S.q, cat: S.cat, stock: S.stock });
    A.replaceHash(h);
    A.lastProductsHash = h;
  }

  function productMatches(p, cats) {
    var q = norm(A.trim(S.q));
    if (q && norm(p.nameAr).indexOf(q) < 0 && norm(p.nameEn).indexOf(q) < 0) return false;
    if (S.cat === '__none') { if (cats[p.category]) return false; }
    else if (S.cat && p.category !== S.cat) return false;
    if (S.stock === 'removed') return !!p.removed;
    if (p.removed) return false;                        // "All" excludes removed (§7.2)
    if (S.stock === 'onsale') return !!p.inStock;
    if (S.stock === 'out') return !p.inStock;
    return true;
  }

  function counts(c) {
    var T = c.products.length, R = 0, Av = 0, O = 0;
    c.products.forEach(function (p) { if (p.removed) R++; else if (p.inStock) Av++; else O++; });
    return { T: T, A: Av, O: O, R: R };
  }

  function thumb(p) {
    return '<span class="adm-thumb" aria-hidden="true">' +
           (p.image ? '<img src="' + esc(p.image) + '" alt="">' : '<span class="adm-thumb__icon">▢</span>') + '</span>';
  }

  function rowHtml(p, cats, grouped, first, last, flash) {
    var catName = cats[p.category] ? A.catName(cats[p.category]) : t('a03.f02.none');
    var on = !!p.inStock && !p.removed;
    var busy = !!S.busyStock[p.id];
    var cls = 'adm-prow' + (p.removed ? ' is-removed' : '') + (flash ? ' is-flash' : '');
    var h = '<tr class="' + cls + '" data-id="' + esc(p.id) + '"' + A.el('A-03-C04') + '>';
    h += '<td class="adm-prow__img" data-open' + A.el('A-03-B03') + '>' + thumb(p) + '</td>';
    h += '<td class="adm-prow__name" data-open><span class="adm-prow__ar" lang="ar" dir="rtl">' + esc(p.nameAr || '') + '</span>' +
         '<span class="adm-prow__en" lang="en" dir="ltr">' + (p.nameEn ? esc(p.nameEn) : '&nbsp;') + '</span>' +
         (p.removed ? '<span class="adm-pill">' + esc(t('ad.removedTag')) + '</span>' : '') + '</td>';
    h += '<td class="adm-prow__cat" data-open>' + esc(catName) + '</td>';
    h += '<td class="adm-prow__price" data-open>' + esc(A.money(p.price)) + '</td>';
    h += '<td class="adm-prow__stock"><button type="button" role="switch" aria-checked="' + on + '" class="adm-switch' + (on ? ' is-on' : '') + '"' +
         A.el('A-03-B04') + ' data-ctl="stock"' + (p.removed || busy ? ' disabled' : '') + '>' +
         '<span class="adm-switch__track" aria-hidden="true"><span class="adm-switch__knob"></span></span>' +
         '<span class="adm-switch__word">' + esc(t(on ? 'a03.b04.on' : 'a03.b04.off')) + '</span></button></td>';
    h += '<td class="adm-prow__order">';
    if (grouped) {
      h += '<button type="button" class="adm-iconbtn" data-ctl="up" aria-label="' + esc(t('a03.b06')) + '"' + A.el('A-03-B06') + (first || p.removed ? ' disabled' : '') + '>↑</button>' +
           '<button type="button" class="adm-iconbtn" data-ctl="down" aria-label="' + esc(t('a03.b07')) + '"' + A.el('A-03-B07') + (last || p.removed ? ' disabled' : '') + '>↓</button>';
    }
    h += '</td>';
    h += '<td class="adm-prow__act"><button type="button" class="adm-textbtn" data-ctl="' + (p.removed ? 'restore' : 'remove') + '"' + A.el('A-03-B05') + '>' +
         esc(t(p.removed ? 'a03.b05.restore' : 'a03.b05.remove')) + '</button></td>';
    return h + '</tr>';
  }

  function listHtml() {
    var c = Cat.load();
    if (!c) {
      return '<div class="adm-state"><p>' + esc(t('a03.loadErr')) + '</p><button type="button" class="adm-textbtn" data-ctl="reload">' + esc(t('ad.retry')) + '</button></div>';
    }
    var cats = Cat.catIds(c);
    var flash = A.getFlash('A-03');
    var fl = flash && flash.extra && Date.now() < flash.extra.outlineUntil ? flash.extra.rowId : null;
    if (!c.products.length && !filterActive()) {
      return '<div class="adm-state"' + A.el('A-03-C08') + '><p class="bold">' + esc(t('a03.c08.l1')) + '</p><p>' + esc(t('a03.c08.l2')) + '</p></div>';
    }
    var h = '<div class="adm-tablewrap"><table class="adm-table adm-table--products"><tbody>';
    var any = false;
    if (!filterActive()) {
      var groups = (c.categories || []).map(function (k) { return { cat: k, items: [] }; });
      var idx = {}; groups.forEach(function (g, i) { idx[g.cat.id] = i; });
      var orphan = { cat: null, items: [] };
      c.products.forEach(function (p) {
        if (p.removed) return;
        if (p.category in idx) groups[idx[p.category]].items.push(p); else orphan.items.push(p);
      });
      if (orphan.items.length) groups.push(orphan);
      groups.forEach(function (g) {
        var name = g.cat ? A.catName(g.cat) : t('a03.f02.none');
        h += '<tr class="adm-ghead"' + A.el('A-03-C03') + '><th colspan="7">' + esc(t('a03.c03', { name: name, N: A.count(g.items.length) })) + '</th></tr>';
        g.items.forEach(function (p, i) {
          any = true;
          h += rowHtml(p, cats, true, i === 0, i === g.items.length - 1, fl === p.id);
        });
      });
    } else {
      var order = {}; (c.categories || []).forEach(function (k, i) { order[k.id] = i; });
      var list = c.products.map(function (p, i) { return { p: p, i: i }; })
        .filter(function (x) { return productMatches(x.p, cats); })
        .sort(function (a, b) {
          var ca = a.p.category in order ? order[a.p.category] : 1e6;
          var cb = b.p.category in order ? order[b.p.category] : 1e6;
          return (ca - cb) || (a.i - b.i);
        });
      if (!list.length) {
        return '<div class="adm-state"' + A.el('A-03-C09') + '><p>' + esc(t('a03.c09')) + '</p>' +
               '<button type="button" class="adm-textbtn" data-ctl="clear"' + A.el('A-03-B02') + '>' + esc(t('ad.clearFilters')) + '</button></div>';
      }
      list.forEach(function (x) { any = true; h += rowHtml(x.p, cats, false, false, false, fl === x.p.id); });
    }
    h += '</tbody></table></div>';
    return h;
  }

  function flashHtml() {
    if (S.failed) return '<p class="error adm-flash"' + A.el('A-03-C07') + '>' + esc(t('ad.saveFail')) + '</p>';
    var f = A.getFlash('A-03');
    if (!f) return '';
    var name = I18N.lang === 'en' ? (f.vars.nameEn || f.vars.nameAr) : (f.vars.nameAr || f.vars.nameEn);
    return '<p class="adm-confirm"' + A.el('A-03-C06') + '>' + esc(t(f.key, { name: name })) + '</p>';
  }

  function headerCounts(c) {
    if (!c || (!c.products.length && !filterActive())) return '';
    var k = counts(c);
    return esc(t('a03.c02', { T: A.count(k.T), A: A.count(k.A), O: A.count(k.O), R: A.count(k.R) }));
  }

  var view = {
    enter: function (params, query) {
      S.q = A.oneLine(query.q || '').slice(0, 60);
      S.cat = query.cat || '';
      S.stock = ['onsale', 'out', 'removed'].indexOf(query.stock) >= 0 ? query.stock : '';
      S.busyStock = {};
      A.lastProductsHash = A.cur.hash;
    },
    leave: function () { if (debounce) { clearTimeout(debounce); debounce = null; } },
    afterEnter: function () {
      var f = A.getFlash('A-03');
      var id = (f && f.extra && f.extra.rowId) || A.lastRowId;
      A.lastRowId = null;
      if (id) {
        var row = document.querySelector('.adm-prow[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
        if (row && row.scrollIntoView) row.scrollIntoView({ block: 'center' });
      }
    },
    flashEnded: function () { var n = document.getElementById('a03-flash'); if (n) n.innerHTML = flashHtml(); },

    render: function () {
      var c = Cat.load();
      var total = c ? c.products.length : 0;
      var full = total >= MAX_PRODUCTS;
      var h = '<div class="adm-page">';
      h += '<div class="adm-head"' + A.el('A-03-S01') + '><div><h1 class="adm-title"' + A.el('A-03-C01') + '>' + esc(t('a03.c01')) + '</h1>' +
           '<p class="adm-sub" id="a03-counts"' + A.el('A-03-C02') + '>' + headerCounts(c) + '</p></div>' +
           '<div class="adm-head__end">' + (full ? '<span class="adm-note"' + A.el('A-03-C11') + '>' + esc(t('a03.c11')) + '</span>' : '') +
           '<button type="button" class="btn btn--primary adm-btn40" data-ctl="new"' + A.el('A-03-B01') + (full ? ' disabled' : '') + '>' + esc(t('a03.b01')) + '</button></div></div>';

      h += '<div class="adm-filters"' + A.el('A-03-S02') + '>';
      h += '<span class="adm-search"><span class="adm-search__icon" aria-hidden="true">⌕</span>' +
           '<input type="search" class="adm-input adm-input--40" maxlength="60" placeholder="' + esc(t('a03.f01')) + '" aria-label="' + esc(t('a03.f01')) + '"' +
           A.el('A-03-F01') + ' value="' + esc(S.q) + '"></span>';
      h += '<select class="adm-input adm-input--40 adm-w200" aria-label="' + esc(t('a03.f02.label')) + '"' + A.el('A-03-F02') + '>';
      h += '<option value="">' + esc(t('a03.f02.all')) + '</option>';
      var cats = c ? Cat.catIds(c) : {};
      (c ? c.categories : []).forEach(function (k) {
        h += '<option value="' + esc(k.id) + '"' + (S.cat === k.id ? ' selected' : '') + '>' + esc(A.catName(k)) + '</option>';
      });
      var orphan = c && c.products.some(function (p) { return !cats[p.category]; });
      if (orphan || S.cat === '__none') h += '<option value="__none"' + (S.cat === '__none' ? ' selected' : '') + '>' + esc(t('a03.f02.none')) + '</option>';
      h += '</select>';
      h += '<select class="adm-input adm-input--40 adm-w200" aria-label="' + esc(t('a03.f03.label')) + '"' + A.el('A-03-F03') + '>';
      [['', 'all'], ['onsale', 'onsale'], ['out', 'out'], ['removed', 'removed']].forEach(function (o) {
        h += '<option value="' + o[0] + '"' + (S.stock === o[0] ? ' selected' : '') + '>' + esc(t('a03.f03.' + o[1])) + '</option>';
      });
      h += '</select>';
      h += '<button type="button" class="adm-textbtn" data-ctl="clear" id="a03-clear"' + A.el('A-03-B02') + (filterActive() ? '' : ' hidden') + '>' + esc(t('ad.clearFilters')) + '</button>';
      h += '</div>';

      h += '<p class="adm-note"' + A.el('A-03-C05') + '>' + esc(t('ad.propagate.here')) + '</p>';
      h += '<div id="a03-flash" data-flash="A-03">' + flashHtml() + '</div>';
      h += '<section class="adm-list" id="a03-list"' + A.el('A-03-S03') + '>' + listHtml() + '</section>';
      return h + '</div>';
    },

    mount: function (root) {
      var q = root.querySelector('[data-el="A-03-F01"]');
      var fc = root.querySelector('[data-el="A-03-F02"]');
      var fs = root.querySelector('[data-el="A-03-F03"]');

      function refreshList() {
        syncUrl();
        var list = document.getElementById('a03-list');
        if (list) list.innerHTML = listHtml();
        var clear = document.getElementById('a03-clear');
        if (clear) { if (filterActive()) clear.removeAttribute('hidden'); else clear.setAttribute('hidden', ''); }
        var cn = document.getElementById('a03-counts');
        if (cn) cn.innerHTML = headerCounts(Cat.load());
        var fl = document.getElementById('a03-flash');
        if (fl) fl.innerHTML = flashHtml();
      }

      q.addEventListener('input', function () {
        S.q = A.oneLine(q.value);
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(function () { debounce = null; refreshList(); }, 250);   // §7.1
      });
      fc.addEventListener('change', function () { S.cat = fc.value; refreshList(); });
      fs.addEventListener('change', function () { S.stock = fs.value; refreshList(); });

      root.addEventListener('click', function (e) {
        var ctl = e.target.closest('[data-ctl]');
        var row = e.target.closest('.adm-prow');
        if (ctl && root.contains(ctl)) {
          if (ctl.disabled) return;
          var act = ctl.getAttribute('data-ctl');
          var id = row ? row.getAttribute('data-id') : null;
          if (act === 'new') {
            A.navigate(A.buildHash('/products/new', { cat: S.cat && S.cat !== '__none' ? S.cat : '' }));
          } else if (act === 'clear') {
            S.q = ''; S.cat = ''; S.stock = '';
            q.value = ''; fc.value = ''; fs.value = '';
            refreshList();
          } else if (act === 'reload') {
            refreshList();
          } else if (act === 'stock') {
            var p = Cat.product(id);
            if (!p || p.removed) return;
            /* Optimistic: flipped on screen, then saved; reverted on failure. */
            S.busyStock[id] = true;
            ctl.classList.toggle('is-on'); ctl.setAttribute('aria-checked', String(!p.inStock));
            var res = Cat.setStock(id, !p.inStock);
            delete S.busyStock[id];
            S.failed = !res;
            refreshList();
          } else if (act === 'up' || act === 'down') {
            var ok = Cat.move(id, act === 'up' ? -1 : 1);
            S.failed = !ok;
            refreshList();
            var again = document.querySelector('.adm-prow[data-id="' + id + '"] [data-ctl="' + act + '"]');
            if (again && !again.disabled) again.focus();
          } else if (act === 'remove') {
            var pr = Cat.product(id);
            if (pr) A.Modal.open('AM-02', { variant: 'P', from: 'A-03', product: pr });
          } else if (act === 'restore') {
            var r = Cat.restore(id);
            S.failed = !r;
            if (r) A.setFlash('A-03', 'a03.c06.restore', { nameAr: r.nameAr, nameEn: r.nameEn }, 5000);
            refreshList();
          }
          return;
        }
        if (row && root.contains(row)) {
          A.lastRowId = row.getAttribute('data-id');
          A.navigate('#/products/' + encodeURIComponent(row.getAttribute('data-id')));
        }
      });

      /* The row outline lasts 3 seconds (§3.1). */
      var fl = root.querySelector('.adm-prow.is-flash');
      if (fl) setTimeout(function () { fl.classList.remove('is-flash'); }, 3000);
    }
  };

  /* For AM-02 and A-04: an action whose result belongs on A-03. */
  A.a03 = {
    removed: function (p, ok) {
      S.failed = !ok;
      if (ok) A.setFlash('A-03', 'a03.c06.remove', { nameAr: p.nameAr, nameEn: p.nameEn }, 5000);
      else A.clearFlash('A-03');
    },
    saved: function (p, mode) {
      S.failed = false;
      A.setFlash('A-03', mode === 'create' ? 'a03.c06.create' : 'a03.c06.edit',
                 { nameAr: p.nameAr, nameEn: p.nameEn }, 5000, { rowId: p.id, outlineUntil: Date.now() + 3000 });
    },
    back: function () { return A.lastProductsHash || '#/products'; }
  };

  A.views['A-03'] = view;
})();
