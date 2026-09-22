/* A-02 — نظرة عامة / Overview. spec/admin/screens/A-02.md
   Read-only. Three bands, in this order: what is broken, what the store
   earned, what sold. Fetched once on entry, again only on "Refresh" or a
   period change; it never polls (§5.2 "Freshness"). */
(function () {
  'use strict';
  var A = window.Admin;

  I18N.register({
    'a02.c01': { ar: 'ما يحتاج انتباهك', en: 'Needs your attention' },
    'a02.b01': { ar: 'لا توجد منتجات معروضة للبيع الآن', en: 'Nothing is on sale right now' },
    'a02.b02.1':    { ar: 'طلب جديد واحد لم يُقبل منذ أكثر من 10 دقائق', en: '1 new order not accepted for more than 10 minutes' },
    'a02.b02.2':    { ar: 'طلبان جديدان لم يُقبلا منذ أكثر من 10 دقائق', en: '2 new orders not accepted for more than 10 minutes' },
    'a02.b02.few':  { ar: '{N} طلبات جديدة لم تُقبل منذ أكثر من 10 دقائق', en: '{N} new orders not accepted for more than 10 minutes' },
    'a02.b02.many': { ar: '{N} طلبًا جديدًا لم يُقبل منذ أكثر من 10 دقائق', en: '{N} new orders not accepted for more than 10 minutes' },
    'a02.b03.1':    { ar: 'منتج واحد غير متوفر', en: '1 product out of stock' },
    'a02.b03.2':    { ar: 'منتجان غير متوفرين', en: '2 products out of stock' },
    'a02.b03.few':  { ar: '{N} منتجات غير متوفرة', en: '{N} products out of stock' },
    'a02.b03.many': { ar: '{N} منتجًا غير متوفر', en: '{N} products out of stock' },
    'a02.c02': { ar: 'كل شيء يعمل: هناك منتجات معروضة، ولا طلبات متأخرة عن القبول',
                 en: 'Everything is running: products are on sale and no order is waiting to be accepted' },
    'a02.b04.today': { ar: 'اليوم', en: 'Today' },
    'a02.b04.7d':    { ar: 'آخر 7 أيام', en: 'Last 7 days' },
    'a02.b04.30d':   { ar: 'آخر 30 يومًا', en: 'Last 30 days' },
    'a02.c03': { ar: 'من {from} إلى {to}', en: '{from} to {to}' },
    'a02.c04': { ar: 'الطلبات المسلَّمة', en: 'Delivered orders' },
    'a02.c05': { ar: 'الإيراد', en: 'Revenue' },
    'a02.c06': { ar: 'متوسط قيمة الطلب', en: 'Average order value' },
    'a02.c07': { ar: 'الطلبات الملغاة', en: 'Cancelled orders' },
    'a02.c09': { ar: 'الأكثر مبيعًا في هذه الفترة', en: 'Best sellers in this period' },
    'a02.c10': { ar: 'لم تُسلَّم أي طلبات في هذه الفترة', en: 'No orders were delivered in this period' },
    'a02.c11': { ar: 'تعذّر تحميل هذا القسم', en: 'This section could not be loaded' },
    'a02.removed': { ar: '(مُزال)', en: '(removed)' }
  });

  var S = { period: '7d', fetchedAt: 0, attention: null, figures: null, top: null };

  /* Band 1 — §5.2 */
  function fetchAttention() {
    try {
      var c = HotelDB.catalog();
      var active = (c.products || []).filter(function (p) { return !p.removed; });
      var onSale = active.filter(function (p) { return p.inStock; }).length;
      var out = active.length - onSale;
      var cutoff = Date.now() - 10 * 60 * 1000;
      var late = A.orders().filter(function (o) { return o.status === 'New' && o.createdAt < cutoff; }).length;
      return { nothing: onSale === 0, late: late, out: out };
    } catch (e) { return null; }
  }

  /* Bands 2 and 3 — admin-map §5.6, computed over the selected period by
     submission time. */
  function fetchPeriod() {
    try {
      var rng = A.period(S.period);
      var list = A.ordersIn(rng);
      var delivered = list.filter(function (o) { return o.status === 'Delivered'; });
      var revenue = 0;
      delivered.forEach(function (o) { revenue += Number(o.total) || 0; });
      var cancelled = list.filter(function (o) { return o.status === 'Cancelled'; }).length;
      var figures = {
        rng: rng, all: list.length, delivered: delivered.length, revenue: revenue,
        avg: delivered.length ? revenue / delivered.length : null,
        cancelled: cancelled,
        pct: list.length ? Math.floor(cancelled * 100 / list.length + 0.5) : null
      };
      var cat = HotelDB.catalog();
      var byId = {};
      (cat.products || []).forEach(function (p) { byId[p.id] = p; });
      var agg = {};
      delivered.forEach(function (o) {
        (o.lines || []).forEach(function (l) {
          var k = l.productId;
          if (!agg[k]) agg[k] = { id: k, units: 0, revenue: 0, line: l };
          agg[k].units += Number(l.qty) || 0;
          agg[k].revenue += (Number(l.qty) || 0) * (Number(l.price) || 0);
        });
      });
      var rows = [];
      for (var k in agg) if (Object.prototype.hasOwnProperty.call(agg, k) && agg[k].units > 0) {
        var r = agg[k], p = byId[k];
        r.product = p || null;
        r.nameAr = p ? p.nameAr : (r.line.nameAr || '');
        rows.push(r);
      }
      rows.sort(function (a, b) {
        return (b.units - a.units) || (b.revenue - a.revenue) || String(a.nameAr).localeCompare(String(b.nameAr), 'ar');
      });
      return { figures: figures, top: rows.slice(0, 5) };
    } catch (e) { return null; }
  }

  function fetchAll() {
    S.attention = fetchAttention();
    var p = fetchPeriod();
    S.figures = p ? p.figures : null;
    S.top = p ? p.top : null;
    S.periodFailed = !p;
    S.fetchedAt = Date.now();
  }

  function attentionHtml() {
    var h = '';
    if (!S.attention) {
      return '<p class="adm-err"' + A.el('A-02-C11') + '>' + esc(t('a02.c11')) + '</p>' +
             '<button type="button" class="btn btn--ghost adm-btn36" data-retry="attention"' + A.el('A-02-B06') + '>' + esc(t('ad.retry')) + '</button>';
    }
    var a = S.attention, any = false;
    if (a.nothing) { any = true; h += row('A-02-B01', t('a02.b01'), '#/products'); }
    if (a.late > 0) { any = true; h += row('A-02-B02', t('a02.b02.' + A.bucket(a.late), { N: A.count(a.late) }), '#/orders?status=New'); }
    if (a.out > 0) { any = true; h += row('A-02-B03', t('a02.b03.' + A.bucket(a.out), { N: A.count(a.out) }), '#/products?stock=out'); }
    if (!any) h += '<p class="adm-allclear"' + A.el('A-02-C02') + '>' + esc(t('a02.c02')) + '</p>';
    return h;
  }
  function row(el, text, href) {
    return '<button type="button" class="adm-attn"' + A.el(el) + ' data-href="' + esc(href) + '">' +
           '<span>' + esc(text) + '</span><span class="chev" aria-hidden="true">‹</span></button>';
  }

  function figuresHtml() {
    if (!S.figures) {
      return '<p class="adm-err"' + A.el('A-02-C11') + '>' + esc(t('a02.c11')) + '</p>' +
             '<button type="button" class="btn btn--ghost adm-btn36" data-retry="period"' + A.el('A-02-B06') + '>' + esc(t('ad.retry')) + '</button>';
    }
    var f = S.figures;
    var h = '<div class="adm-figs adm-figs--4">';
    h += fig('A-02-C04', t('a02.c04'), A.count(f.delivered));
    h += fig('A-02-C05', t('a02.c05'), A.money(f.revenue));
    h += fig('A-02-C06', t('a02.c06'), f.avg == null ? '—' : A.money(f.avg));
    h += fig('A-02-C07', t('a02.c07'), A.count(f.cancelled) + ' (' + (f.pct == null ? '—' : f.pct + '%') + ')');
    h += '</div>';
    h += '<p class="adm-foot"' + A.el('A-02-C08') + '>' + esc(t('ad.revenueNote')) + '</p>';
    return h;
  }
  function fig(el, label, value) {
    return '<div class="adm-fig"' + A.el(el) + '><div class="adm-fig__label">' + esc(label) + '</div>' +
           '<div class="adm-fig__value">' + esc(value) + '</div></div>';
  }

  function topHtml() {
    if (!S.top) {
      return '<p class="adm-err"' + A.el('A-02-C11') + '>' + esc(t('a02.c11')) + '</p>' +
             '<button type="button" class="btn btn--ghost adm-btn36" data-retry="period"' + A.el('A-02-B06') + '>' + esc(t('ad.retry')) + '</button>';
    }
    if (!S.top.length) return '<p class="adm-empty-line"' + A.el('A-02-C10') + '>' + esc(t('a02.c10')) + '</p>';
    var h = '<ol class="adm-top5">';
    S.top.forEach(function (r, i) {
      var name = r.product ? A.productName(r.product) : A.lineName(r.line);
      var removed = r.product && r.product.removed;
      h += '<li><button type="button" class="adm-top5__row"' + A.el('A-02-B05') + ' data-href="#/products/' + esc(encodeURIComponent(r.id)) + '">' +
           '<span class="adm-top5__rank num">' + (i + 1) + '</span>' +
           '<span class="adm-top5__name">' + esc(name) + (removed ? ' <span class="muted">' + esc(t('a02.removed')) + '</span>' : '') + '</span>' +
           '<span class="adm-top5__units num">' + esc(A.count(r.units)) + '</span>' +
           '<span class="adm-top5__rev">' + esc(A.money(r.revenue)) + '</span>' +
           '</button></li>';
    });
    return h + '</ol>';
  }

  var view = {
    enter: function () { S.period = '7d'; fetchAll(); },   // §7.1: always 7 days on entry
    render: function () {
      var h = '<div class="adm-page">';
      h += '<section class="adm-band"' + A.el('A-02-S01') + '>';
      h += '<div class="adm-band__head"><h2 class="adm-band__title"' + A.el('A-02-C01') + '>' + esc(t('a02.c01')) + '</h2>' +
           '<span class="adm-fresh"><span' + A.el('A-02-C13') + '>' + esc(t('ad.updated', { time: A.fmtTime(S.fetchedAt) })) + '</span>' +
           '<button type="button" class="btn btn--ghost adm-btn36" data-act="refresh"' + A.el('A-02-B07') + '>' + esc(t('ad.refresh')) + '</button></span></div>';
      h += '<div class="adm-attn-list">' + attentionHtml() + '</div>';
      h += '</section>';

      h += '<section class="adm-band adm-band--plain"' + A.el('A-02-S02') + '>';
      h += '<div class="adm-seg" role="group"' + A.el('A-02-B04') + '>';
      ['today', '7d', '30d'].forEach(function (k) {
        h += '<button type="button" class="adm-seg__btn' + (S.period === k ? ' is-active' : '') + '" data-period="' + k + '" aria-pressed="' + (S.period === k) + '">' + esc(t('a02.b04.' + k)) + '</button>';
      });
      h += '</div>';
      var rng = A.period(S.period);
      h += '<p class="adm-caption"' + A.el('A-02-C03') + '>' + esc(t('a02.c03', { from: A.fmtYMD(rng.fromYMD), to: A.fmtYMD(rng.toYMD) })) + '</p>';
      h += figuresHtml();
      h += '</section>';

      h += '<section class="adm-band"' + A.el('A-02-S03') + '>';
      h += '<h2 class="adm-band__title"' + A.el('A-02-C09') + '>' + esc(t('a02.c09')) + '</h2>';
      h += topHtml();
      h += '</section></div>';
      return h;
    },
    mount: function (root) {
      root.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b || !root.contains(b)) return;
        if (b.hasAttribute('data-href')) { A.navigate(b.getAttribute('data-href')); return; }
        if (b.getAttribute('data-act') === 'refresh') { fetchAll(); A.renderView(); return; }
        var p = b.getAttribute('data-period');
        if (p) {                                   // §6.1: the attention band is not re-fetched
          S.period = p;
          var r = fetchPeriod();
          S.figures = r ? r.figures : null; S.top = r ? r.top : null;
          A.renderView();
          return;
        }
        var retry = b.getAttribute('data-retry');
        if (retry === 'attention') { S.attention = fetchAttention(); A.renderView(); }
        else if (retry === 'period') { var rr = fetchPeriod(); S.figures = rr ? rr.figures : null; S.top = rr ? rr.top : null; A.renderView(); }
      });
    }
  };

  A.views['A-02'] = view;
})();
