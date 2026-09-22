/* A-04 — تفاصيل المنتج / Product details. spec/admin/screens/A-04.md
   One screen, two modes (create / edit), identical fields and rules. A save
   writes the whole catalog through HotelDB.saveCatalog(), which the guest's
   Server.getCatalog() reads on its next fetch. */
(function () {
  'use strict';
  var A = window.Admin;

  I18N.register({
    'a04.c01.create': { ar: 'منتج جديد', en: 'New product' },
    'a04.c01.edit':   { ar: 'تعديل المنتج', en: 'Edit product' },
    'a04.f01': { ar: 'اسم المنتج (عربي) *', en: 'Product name (Arabic) *' },
    'a04.f02': { ar: 'اسم المنتج (إنجليزي) *', en: 'Product name (English) *' },
    'a04.f03': { ar: 'الوصف (عربي)', en: 'Description (Arabic)' },
    'a04.f04': { ar: 'الوصف (إنجليزي)', en: 'Description (English)' },
    'a04.f05': { ar: 'الفئة *', en: 'Category *' },
    'a04.f05.first': { ar: 'اختر فئة', en: 'Choose a category' },
    'a04.f06': { ar: 'السعر *', en: 'Price *' },
    'a04.f07.on':  { ar: 'معروض للبيع', en: 'On sale' },
    'a04.f07.off': { ar: 'غير متوفر', en: 'Out of stock' },
    'a04.f07.label': { ar: 'التوفر', en: 'Stock' },
    'a04.img.label': { ar: 'الصورة', en: 'Image' },
    'a04.b05': { ar: 'اختر صورة', en: 'Choose image' },
    'a04.b04': { ar: 'إزالة الصورة', en: 'Remove image' },
    'a04.c06': { ar: 'JPG أو PNG أو WebP، 5 ميجابايت كحد أقصى، 500 × 500 بكسل على الأقل. تُقصّ الصورة مربعة كما تظهر هنا.',
                 en: 'JPG, PNG or WebP, 5 MB maximum, at least 500 × 500 px. The image is cropped to the square shown here.' },
    'a04.c04.l1': { ar: 'كما يراها النزيل:', en: 'As the guest sees it:' },
    'a04.c04.l2': { ar: 'بالعربية {ar} — بالإنجليزية {en}', en: 'In Arabic {ar} — in English {en}' },
    'a04.c11': { ar: 'هذا المنتج مُزال من المتجر ولا يراه النزلاء.', en: 'This product is removed from the store and no guest can see it.' },
    'a04.b03.remove':  { ar: 'إزالة من المتجر', en: 'Remove from the store' },
    'a04.b03.restore': { ar: 'استعادة', en: 'Restore' },
    'a04.c13': { ar: 'أنشئ فئة واحدة على الأقل قبل إضافة منتج — افتح "الفئات".', en: 'Create at least one category before adding a product — open "Categories".' },
    'a04.uploading': { ar: 'جارٍ الرفع…', en: 'Uploading…' },
    'a04.loadErr': { ar: 'تعذّر تحميل المنتج', en: 'The product could not be loaded' },
    /* §7.6 */
    'a04.img.fmt':   { ar: 'اختر ملف JPG أو PNG أو WebP', en: 'Choose a JPG, PNG or WebP file' },
    'a04.img.size':  { ar: 'حجم الصورة أكبر من 5 ميجابايت', en: 'The image is larger than 5 MB' },
    'a04.img.small': { ar: 'الصورة صغيرة جدًا — 500 × 500 بكسل على الأقل', en: 'The image is too small — at least 500 × 500 px' },
    'a04.img.fail':  { ar: 'تعذّر رفع الصورة — حاول مرة أخرى', en: 'The image could not be uploaded — try again' },
    /* §7.7 */
    'a04.err.f01.empty': { ar: 'أدخل اسم المنتج بالعربية', en: 'Enter the product name in Arabic' },
    'a04.err.f01.long':  { ar: 'اسم المنتج بالعربية 60 حرفًا كحد أقصى', en: 'The Arabic product name is 60 characters at most' },
    'a04.err.f02.empty': { ar: 'أدخل اسم المنتج بالإنجليزية', en: 'Enter the product name in English' },
    'a04.err.f02.long':  { ar: 'اسم المنتج بالإنجليزية 60 حرفًا كحد أقصى', en: 'The English product name is 60 characters at most' },
    'a04.err.f03.long':  { ar: 'الوصف بالعربية 500 حرف كحد أقصى', en: 'The Arabic description is 500 characters at most' },
    'a04.err.f04.long':  { ar: 'الوصف بالإنجليزية 500 حرف كحد أقصى', en: 'The English description is 500 characters at most' },
    'a04.err.f05':       { ar: 'اختر فئة للمنتج', en: 'Choose a category for the product' },
    'a04.err.f06.empty': { ar: 'أدخل سعر المنتج', en: 'Enter the product price' },
    'a04.err.f06.chars': { ar: 'استخدم الأرقام فقط، مثل 12.50', en: 'Use digits only, for example 12.50' },
    'a04.err.f06.dec':   { ar: 'السعر بخانتين عشريتين كحد أقصى، مثل 12.50', en: 'The price has at most two decimals, for example 12.50' },
    'a04.err.f06.min':   { ar: 'يجب أن يكون السعر 0.01 على الأقل', en: 'The price must be at least 0.01' },
    'a04.err.f06.max':   { ar: 'الحد الأقصى للسعر 9999.99', en: 'The highest price is 9999.99' }
  });

  var NAME_MAX = 60, DESC_MAX = 500;
  var F = null;

  function blank() {
    return { nameAr: '', nameEn: '', descAr: '', descEn: '', category: '', price: '', inStock: true, image: null };
  }
  function fromProduct(p) {
    return { nameAr: p.nameAr || '', nameEn: p.nameEn || '', descAr: p.descAr || '', descEn: p.descEn || '',
             category: p.category || '', price: p.price == null ? '' : A.amount(p.price),
             inStock: !!p.inStock, image: p.image || null };
  }
  function copy(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function len(s) { return A.trim(s).length; }

  /* ---- Price (§5.3, §7.3) ------------------------------------------ */
  function priceText(raw) {
    return A.trim(A.toWestern(raw)).replace(/٫/g, '.').replace(/,/g, '.');
  }
  function priceError(raw) {
    var v = priceText(raw);
    if (!v) return 'a04.err.f06.empty';
    if (/^-\d*\.?\d*$/.test(v) && /\d/.test(v)) return 'a04.err.f06.min';
    if (!/^\d*\.?\d*$/.test(v) || !/\d/.test(v)) return 'a04.err.f06.chars';
    var dot = v.indexOf('.');
    if (dot >= 0 && v.length - dot - 1 > 2) return 'a04.err.f06.dec';
    var n = parseFloat(v);
    if (!(n >= 0.01)) return 'a04.err.f06.min';
    if (n > 9999.99) return 'a04.err.f06.max';
    return null;
  }
  /* On blur, visibly: Western digits, "," → ".", two decimals, "." → "0.". */
  function normalisePrice(raw) {
    var v = priceText(raw);
    if (!/^\d*\.?\d*$/.test(v) || !/\d/.test(v)) return v || A.trim(raw);
    var dot = v.indexOf('.');
    var ip = dot < 0 ? v : v.slice(0, dot);
    var dp = dot < 0 ? '' : v.slice(dot + 1);
    if (dp.length > 2) return v;
    ip = ip ? String(parseInt(ip, 10)) : '0';
    while (dp.length < 2) dp += '0';
    return ip + '.' + dp;
  }

  /* ---- Validation (§7.7), in reading order ------------------------- */
  function validate() {
    var v = F.v, e = {}, order = [];
    function put(f, k) { e[f] = k; order.push(f); }
    if (!len(v.nameAr)) put('F01', 'a04.err.f01.empty'); else if (len(v.nameAr) > NAME_MAX) put('F01', 'a04.err.f01.long');
    if (!len(v.nameEn)) put('F02', 'a04.err.f02.empty'); else if (len(v.nameEn) > NAME_MAX) put('F02', 'a04.err.f02.long');
    if (len(v.descAr) > DESC_MAX) put('F03', 'a04.err.f03.long');
    if (len(v.descEn) > DESC_MAX) put('F04', 'a04.err.f04.long');
    var c = A.Cat.load();
    var cats = c ? A.Cat.catIds(c) : {};
    if (!v.category || !cats[v.category]) put('F05', 'a04.err.f05');
    var pe = priceError(v.price);
    if (pe) put('F06', pe);
    return { errors: e, order: order };
  }
  function fieldError(f) {
    var all = validate().errors;
    return all[f] || null;
  }

  function isDirty() {
    if (!F || F.loadFailed || !F.init) return false;
    var a = F.v, b = F.init;
    return A.trim(a.nameAr) !== A.trim(b.nameAr) || A.trim(a.nameEn) !== A.trim(b.nameEn) ||
           A.trim(a.descAr) !== A.trim(b.descAr) || A.trim(a.descEn) !== A.trim(b.descEn) ||
           a.category !== b.category || normalisePrice(a.price) !== normalisePrice(b.price) ||
           !!a.inStock !== !!b.inStock || (a.image || null) !== (b.image || null);
  }

  function noCategories() { var c = A.Cat.load(); return !c || !(c.categories || []).length; }

  /* The one save — also what AM-01 "Save and continue" runs (AM-01 §5.2).
     Returns 'ok' | 'invalid' | 'failed'. */
  function commit() {
    if (!F || F.busy || F.uploading) return 'failed';
    var r = validate();
    F.triedSave = true;
    F.errors = r.errors;
    F.saveFailed = false;
    if (r.order.length) { F.focusField = r.order[0]; return 'invalid'; }
    F.busy = true;
    var v = F.v;
    var c = A.Cat.load();
    var ok = false, product = null;
    if (c) {
      var data = {
        nameAr: A.trim(A.oneLine(v.nameAr)), nameEn: A.trim(A.oneLine(v.nameEn)),
        descAr: A.trim(v.descAr), descEn: A.trim(v.descEn),
        price: parseFloat(normalisePrice(v.price)), category: v.category, inStock: !!v.inStock,
        image: v.image || null
      };
      if (F.mode === 'create') {
        product = { id: 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                    nameAr: data.nameAr, nameEn: data.nameEn, descAr: data.descAr, descEn: data.descEn,
                    price: data.price, category: data.category, inStock: data.inStock, removed: false };
        if (data.image) product.image = data.image;
        c.products.push(product);                        // last in its category (A-03 §7.3)
        ok = A.Cat.save(c);
      } else {
        var i = -1;
        for (var j = 0; j < c.products.length; j++) if (c.products[j].id === F.id) { i = j; break; }
        if (i >= 0) {
          product = c.products[i];
          var moved = product.category !== data.category;
          product.nameAr = data.nameAr; product.nameEn = data.nameEn;
          product.descAr = data.descAr; product.descEn = data.descEn;
          product.price = data.price; product.category = data.category;
          if (!product.removed) product.inStock = data.inStock;
          if (data.image) product.image = data.image; else delete product.image;
          if (moved) { c.products.splice(i, 1); c.products.push(product); }   // end of the new category
          ok = A.Cat.save(c);
        }
      }
    }
    F.busy = false;
    if (!ok) { F.saveFailed = true; return 'failed'; }
    A.a03.saved(product, F.mode);
    F.init = copy(F.v);
    return 'ok';
  }

  /* ---- Image (§5.4, §7.6) — validated in the browser, centre-cropped to
     a square and kept as that crop, so the preview is exactly what is
     stored and what the guest's card shows. ---------------------------- */
  function chooseImage(file) {
    F.imgErr = null;
    if (!file) return;
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) < 0) { F.imgErr = 'a04.img.fmt'; redraw(); return; }
    if (file.size > 5 * 1024 * 1024) { F.imgErr = 'a04.img.size'; redraw(); return; }
    F.uploading = true; redraw();
    var done = false;
    var timer = setTimeout(function () { finish(null, 'a04.img.fail'); }, 30000);
    function finish(dataUrl, err) {
      if (done) return;
      done = true; clearTimeout(timer);
      if (!F) return;
      F.uploading = false;
      if (dataUrl) F.v.image = dataUrl;
      F.imgErr = err || null;
      redraw();
      if (A.Modal.current() && A.Modal.current().id === 'AM-01') A.Modal.redraw();
    }
    var rd = new FileReader();
    rd.onerror = function () { finish(null, 'a04.img.fail'); };
    rd.onload = function () {
      var img = new Image();
      img.onerror = function () { finish(null, 'a04.img.fmt'); };
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        if (w < 500 || h < 500) { finish(null, 'a04.img.small'); return; }
        try {
          var side = Math.min(w, h), out = 400;
          var cv = document.createElement('canvas');
          cv.width = out; cv.height = out;
          cv.getContext('2d').drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, out, out);
          finish(cv.toDataURL('image/jpeg', 0.85), null);
        } catch (e) { finish(null, 'a04.img.fail'); }
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  }

  function redraw() {
    if (A.cur.id !== 'A-04') return;
    A.renderView();
  }

  /* ---- Rendering ---------------------------------------------------- */
  function counter(el, used, max) {
    return '<div class="field__counter adm-counter' + (used > max ? ' is-over' : '') + '"' + A.el('A-04-C05') + ' data-counter="' + el + '">' + used + '/' + max + '</div>';
  }
  function errLine(f) {
    var k = F.errors[f];
    return '<p class="error adm-ferr" data-err="' + f + '"' + (k ? '' : ' hidden') + '>' + (k ? esc(t(k)) : '') + '</p>';
  }
  function textField(f, key, name, max, multi) {
    var dis = F.busy ? ' disabled' : '';
    var val = F.v[name];
    var id = 'a04-' + f.toLowerCase();
    var h = '<div class="adm-field' + (F.errors[f] ? ' field--error' : '') + '" data-field="' + f + '">';
    h += '<label class="adm-label" for="' + id + '">' + esc(t(key)) + '</label>';
    var dirAttr = (name === 'nameAr' || name === 'descAr') ? ' lang="ar" dir="rtl"' : ' lang="en" dir="ltr"';
    if (multi) h += '<textarea id="' + id + '" class="field__area adm-input" rows="5" data-name="' + name + '"' + dirAttr + A.el('A-04-' + f) + dis + '>' + esc(val) + '</textarea>';
    else h += '<input id="' + id + '" type="text" class="field__input adm-input" data-name="' + name + '"' + dirAttr + A.el('A-04-' + f) + dis + ' value="' + esc(val) + '">';
    h += counter(f, len(val), max);
    h += errLine(f);
    return h + '</div>';
  }
  function previewHtml() {
    var s = A.settings();
    var ok = !priceError(F.v.price);
    var amt = ok ? parseFloat(normalisePrice(F.v.price)) : 0;
    return '<div class="adm-note adm-preview"' + A.el('A-04-C04') + (ok ? '' : ' hidden') + '>' +
           '<div>' + esc(t('a04.c04.l1')) + '</div>' +
           '<div>' + esc(t('a04.c04.l2', { ar: A.moneyIn('ar', amt, s), en: A.moneyIn('en', amt, s) })) + '</div></div>';
  }

  var view = {
    enter: function (params, query) {
      F = { mode: params.mode, id: params.id || null, errors: {}, triedSave: false, busy: false, uploading: false,
            imgErr: null, saveFailed: false, loadFailed: false, removed: false, restoreFailed: false };
      if (params.mode === 'create') {
        F.v = blank();
        var c = A.Cat.load();
        if (query && query.cat && c && A.Cat.catIds(c)[query.cat]) F.v.category = query.cat;
        F.init = copy(F.v);
      } else {
        var p = A.Cat.product(params.id);
        if (!p) { F.loadFailed = true; F.v = blank(); F.init = null; }
        else { F.v = fromProduct(p); F.init = copy(F.v); F.removed = !!p.removed; }
      }
    },
    leave: function () { F = null; },
    afterEnter: function () {
      if (F && F.mode === 'create') { var e = document.getElementById('a04-f01'); if (e) e.focus(); }
    },
    isDirty: isDirty,
    commit: commit,
    /* AM-01 §5.3: why "Save and continue" cannot run now, or null. */
    saveBlocked: function () {
      if (F && F.uploading) return 'upload';
      if (noCategories()) return 'nocat';
      return null;
    },
    showCommitResult: function () { redraw(); focusFirst(); },

    render: function () {
      var h = '<div class="adm-page adm-page--form">';
      h += '<div class="adm-head"' + A.el('A-04-S01') + '><h1 class="adm-title"' + A.el('A-04-C01') + '>' +
           esc(t(F.mode === 'create' ? 'a04.c01.create' : 'a04.c01.edit')) + '</h1></div>';
      if (F.loadFailed) {
        return h + '<div class="adm-state"><p>' + esc(t('a04.loadErr')) + '</p>' +
               '<button type="button" class="adm-textbtn" data-act="reload">' + esc(t('ad.retry')) + '</button></div></div>';
      }
      var dis = F.busy ? ' disabled' : '';
      var noCat = noCategories();
      h += '<form class="adm-form" novalidate' + A.el('A-04-S02') + '>';
      if (F.removed) h += '<div class="adm-banner"' + A.el('A-04-C11') + '>' + esc(t('a04.c11')) + '</div>';
      h += '<div class="adm-pair">' + textField('F01', 'a04.f01', 'nameAr', NAME_MAX) + textField('F02', 'a04.f02', 'nameEn', NAME_MAX) + '</div>';
      h += '<div class="adm-pair">' + textField('F03', 'a04.f03', 'descAr', DESC_MAX, true) + textField('F04', 'a04.f04', 'descEn', DESC_MAX, true) + '</div>';

      /* Category */
      h += '<div class="adm-field' + (F.errors.F05 ? ' field--error' : '') + '" data-field="F05">';
      h += '<label class="adm-label" for="a04-f05">' + esc(t('a04.f05')) + '</label>';
      if (noCat) {
        h += '<p class="adm-banner"' + A.el('A-04-C13') + '>' + esc(t('a04.c13')) + '</p>';
      } else {
        var c = A.Cat.load();
        h += '<select id="a04-f05" class="adm-input adm-w360"' + A.el('A-04-F05') + dis + '><option value="">' + esc(t('a04.f05.first')) + '</option>';
        c.categories.forEach(function (k) {
          h += '<option value="' + esc(k.id) + '"' + (F.v.category === k.id ? ' selected' : '') + '>' + esc(A.catName(k)) + '</option>';
        });
        h += '</select>';
      }
      h += errLine('F05') + '</div>';

      /* Price — the label is static, in the guest's position (§5.3) */
      var s = A.settings();
      var affix = '<span class="adm-affix">' + esc(I18N.lang === 'en' ? (s.currencyEn || 'SAR') : (s.currencyAr || 'ر.س')) + '</span>';
      var input = '<input id="a04-f06" type="text" inputmode="decimal" autocomplete="off" class="adm-input adm-w200 num"' + A.el('A-04-F06') + dis + ' value="' + esc(F.v.price) + '">';
      h += '<div class="adm-field' + (F.errors.F06 ? ' field--error' : '') + '" data-field="F06">';
      h += '<label class="adm-label" for="a04-f06">' + esc(t('a04.f06')) + '</label>';
      h += '<div class="adm-price">' + (I18N.lang === 'en' ? affix + input : input + affix) + '</div>';
      h += errLine('F06');
      h += previewHtml();
      h += '<p class="adm-note"' + A.el('A-04-C03') + '>' + esc(t('ad.noFees')) + '</p>';
      h += '</div>';

      /* Image */
      h += '<div class="adm-field"><span class="adm-label">' + esc(t('a04.img.label')) + '</span>';
      h += '<div class="adm-imgrow"><div class="adm-imgbox"' + A.el('A-04-C07') + '>';
      if (F.uploading) h += '<span class="adm-imgbox__text">' + esc(t('a04.uploading')) + '</span>';
      else if (F.v.image) h += '<img src="' + esc(F.v.image) + '" alt="">';
      else h += '<span class="adm-imgbox__icon" aria-hidden="true">▢</span>';
      h += '</div><div class="adm-imgrow__side">';
      h += '<button type="button" class="btn btn--ghost adm-btn40" data-act="pick"' + A.el('A-04-B05') + (F.uploading || F.busy ? ' disabled' : '') + '>' + esc(t('a04.b05')) + '</button>';
      h += '<input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" tabindex="-1" id="a04-file">';
      if (F.v.image && !F.uploading) h += '<button type="button" class="adm-textbtn" data-act="noimg"' + A.el('A-04-B04') + '>' + esc(t('a04.b04')) + '</button>';
      h += '<p class="adm-note"' + A.el('A-04-C06') + '>' + esc(t('a04.c06')) + '</p>';
      if (F.imgErr) h += '<p class="error">' + esc(t(F.imgErr)) + '</p>';
      h += '</div></div></div>';

      /* Stock — a form field here, saved with Save (§5.5) */
      var on = !!F.v.inStock;
      h += '<div class="adm-field"><span class="adm-label">' + esc(t('a04.f07.label')) + '</span>';
      h += '<button type="button" role="switch" aria-checked="' + on + '" class="adm-switch' + (on ? ' is-on' : '') + '" data-act="stock"' +
           A.el('A-04-F07') + (F.busy || F.removed ? ' disabled' : '') + '><span class="adm-switch__track" aria-hidden="true"><span class="adm-switch__knob"></span></span>' +
           '<span class="adm-switch__word">' + esc(t(on ? 'a04.f07.on' : 'a04.f07.off')) + '</span></button></div>';

      h += '<p class="adm-note"' + A.el('A-04-C09') + '>' + esc(t('ad.propagate')) + '</p>';
      if (F.saveFailed || F.restoreFailed) h += '<p class="error"' + A.el('A-04-C12') + '>' + esc(t('ad.formSaveFail')) + '</p>';
      else if (F.triedSave && Object.keys(F.errors).length) h += '<p class="error"' + A.el('A-04-C08') + '>' + esc(t('ad.checkFields')) + '</p>';

      h += '<div class="adm-actions">';
      h += '<button type="submit" class="btn btn--primary adm-btn44 adm-w160"' + A.el('A-04-B01') + (F.busy || F.uploading || noCat ? ' disabled' : '') + '>' +
           (F.busy ? '<span' + A.el('A-04-C14') + '>' + esc(t('ad.saving')) + '</span>' : esc(t('ad.save'))) + '</button>';
      h += '<button type="button" class="btn btn--ghost adm-btn44 adm-w120" data-act="cancel"' + A.el('A-04-B02') + dis + '>' + esc(t('ad.cancel')) + '</button>';
      if (F.mode === 'edit') {
        h += '<span class="adm-actions__end"><button type="button" class="adm-textbtn" data-act="' + (F.removed ? 'restore' : 'remove') + '"' + A.el('A-04-B03') + dis + '>' +
             esc(t(F.removed ? 'a04.b03.restore' : 'a04.b03.remove')) + '</button></span>';
      }
      h += '</div></form></div>';
      return h;
    },

    mount: function (root) {
      var form = root.querySelector('form');
      root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b || !root.contains(b) || b.disabled) return;
        var act = b.getAttribute('data-act');
        if (act === 'reload') { view.enter(A.cur.params, A.cur.query); redraw(); }
        else if (act === 'cancel') { A.navigate(A.a03.back()); }
        else if (act === 'pick') { var fi = document.getElementById('a04-file'); if (fi) fi.click(); }
        else if (act === 'noimg') { F.v.image = null; F.imgErr = null; redraw(); }
        else if (act === 'stock') { F.v.inStock = !F.v.inStock; redraw(); var sw = document.querySelector('[data-el="A-04-F07"]'); if (sw) sw.focus(); }
        else if (act === 'remove') {
          var p = A.Cat.product(F.id);
          if (p) A.Modal.open('AM-02', { variant: 'P', from: 'A-04', product: p, dirty: isDirty() });
        } else if (act === 'restore') {
          var r = A.Cat.restore(F.id);
          if (r) { F.removed = false; F.restoreFailed = false; F.v.inStock = false; if (F.init) F.init.inStock = false; }
          else F.restoreFailed = true;
          redraw();
        }
      });
      if (!form) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var res = commit();
        if (res === 'ok') { A.navigate(A.a03.back(), { force: true }); return; }
        redraw();
        focusFirst();
      });
      var fi = root.querySelector('#a04-file');
      if (fi) fi.addEventListener('change', function () { var f = fi.files && fi.files[0]; fi.value = ''; chooseImage(f); });

      var fields = root.querySelectorAll('[data-name]');
      for (var i = 0; i < fields.length; i++) bindText(fields[i]);
      var cat = root.querySelector('#a04-f05');
      if (cat) cat.addEventListener('change', function () {
        F.v.category = cat.value;
        if (F.triedSave) setErr('F05', fieldError('F05'));
      });
      var price = root.querySelector('#a04-f06');
      if (price) {
        price.addEventListener('input', function () { F.v.price = price.value; updatePreview(); });
        price.addEventListener('blur', function () {
          var n = normalisePrice(price.value);
          if (n !== price.value) { price.value = n; F.v.price = n; }
          updatePreview();
          if (F.triedSave) setErr('F06', fieldError('F06'));
        });
      }
    }
  };

  function bindText(el) {
    var name = el.getAttribute('data-name');
    var f = el.closest('[data-field]').getAttribute('data-field');
    var multi = el.tagName === 'TEXTAREA';
    var max = (name === 'nameAr' || name === 'nameEn') ? NAME_MAX : DESC_MAX;
    el.addEventListener('input', function () {
      if (!multi && /[\r\n]/.test(el.value)) el.value = A.oneLine(el.value);   // a pasted line break → a space
      F.v[name] = el.value;
      var c = document.querySelector('[data-counter="' + f + '"]');
      if (c) { var u = len(el.value); c.textContent = u + '/' + max; c.classList.toggle('is-over', u > max); }
    });
    el.addEventListener('blur', function () { if (F && F.triedSave) setErr(f, fieldError(f)); });
  }

  function setErr(f, key) {
    F.errors[f] = key || undefined;
    if (!key) delete F.errors[f];
    var box = document.querySelector('[data-field="' + f + '"]');
    if (!box) return;
    box.classList.toggle('field--error', !!key);
    var p = box.querySelector('[data-err="' + f + '"]');
    if (p) { p.textContent = key ? t(key) : ''; if (key) p.removeAttribute('hidden'); else p.setAttribute('hidden', ''); }
  }

  function updatePreview() {
    var old = document.querySelector('[data-el="A-04-C04"]');
    if (!old) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = previewHtml();
    old.parentNode.replaceChild(wrap.firstChild, old);
  }

  function focusFirst() {
    if (!F || !F.focusField) return;
    var map = { F01: 'a04-f01', F02: 'a04-f02', F03: 'a04-f03', F04: 'a04-f04', F05: 'a04-f05', F06: 'a04-f06' };
    var el = document.getElementById(map[F.focusField]);
    F.focusField = null;
    if (el) el.focus();
  }

  A.views['A-04'] = view;
})();
