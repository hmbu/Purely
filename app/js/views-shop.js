/* ============================================================================
   views-shop.js — G-01 Store · G-02 Product details · G-03 Cart · G-08 Store
   unavailable.

   Source of truth: /spec/screens/G-01.md, G-02.md, G-03.md, G-08.md.
   Every visible string below is the copy of an elements table, word for word,
   in both languages. Nothing here paraphrases a spec string, and nothing here
   invents copy the spec does not have.

   There is no backend: `Server` is the in-browser stub in store.js. Nothing in
   this file fetches, and nothing assumes a network.

   Class names are the vocabulary of css/app.css — the design system — and
   nothing here invents one: topbar, catbar/catbar__row, chip, card/card__img,
   card__add, stepper, badge, cartbar/cartbar__btn, actionbar, line, empty,
   skeleton. Where a name carries no style it is a behaviour hook only
   (section-block, img-icon), never a second vocabulary for the same part.

   Interaction is one delegated listener on the document, registered once at
   load: the router re-runs mount() on the same persistent #app node after every
   cart change, so listeners attached inside mount() would stack up and fire a
   tap twice.
   ============================================================================ */
(function () {
  'use strict';

  /* ==========================================================================
     1. Strings — Arabic and English verbatim from the elements tables
     ========================================================================== */

  I18N.register({
    /* --- shared across screens (identical copy, so one key each) ----------- */

    /* G-01-B02 label and G-08-B03 label: "character-for-character the label of
       G-01-B02" (G-08 §5.1). One key guarantees that. */
    'common.myorders':      { ar: 'طلباتي', en: 'My orders' },
    /* G-01-B04 / G-02-B02 */
    'common.add':           { ar: 'أضف', en: 'Add' },
    /* G-01-C08 / G-02-C06 / G-03-C04 */
    'common.max10':         { ar: 'الحد الأقصى 10', en: 'Max 10' },
    /* G-01-C07 / G-02-C07 — the bare form (never occurs on G-03, §5.4) */
    'common.oos':           { ar: 'غير متوفر', en: 'Out of stock' },
    /* G-01-C07 / G-02-C07 / G-03-C06 — the form naming the cart quantity */
    'common.oos.n':         { ar: 'غير متوفر — في سلتك {n}', en: 'Out of stock — {n} in your cart' },
    /* G-01-B07 / G-02-B05 */
    'common.viewcart':      { ar: 'عرض السلة', en: 'View cart' },
    /* Accessible name of the back chevron: G-02-B01, G-03-B01 */
    'common.back':          { ar: 'رجوع', en: 'Back' },
    /* G-01 C03 line 2 and G-02 C13 are the same sentence word for word
       (G-02 cross-screen rule; G-01 §5.2). One key keeps them edited together. */
    'common.newOrderNote':  { ar: 'أي منتج تضيفه الآن سيُرسل كطلب جديد منفصل',
                              en: 'Anything you add now is sent as a new, separate order' },

    /* --- the five canonical status labels (G-01 §5.2) ---------------------- */
    'status.New':           { ar: 'جديد', en: 'New' },
    'status.Accepted':      { ar: 'تم القبول وجارٍ التحضير', en: 'Accepted & preparing' },
    'status.OnTheWay':      { ar: 'في الطريق', en: 'On the way' },
    'status.Delivered':     { ar: 'تم التوصيل', en: 'Delivered' },
    'status.Cancelled':     { ar: 'ملغى', en: 'Cancelled' },

    /* --- item count on the floating cart bar (G-01 §7.3) ------------------- */
    'count.1':              { ar: 'منتج واحد', en: '1 item' },
    'count.2':              { ar: 'منتجان', en: '2 items' },
    'count.few':            { ar: '{n} منتجات', en: '{n} items' },
    'count.many':           { ar: '{n} منتجًا', en: '{n} items' },

    /* --- G-01 -------------------------------------------------------------- */
    'g01.payline':          { ar: 'الدفع عند الاستلام في غرفتك', en: 'Pay on delivery to your room' },
    'g01.banner.l1':        { ar: 'طلبك رقم {no} — {status}', en: 'Your order {no} — {status}' },
    'g01.banner.l3':        { ar: 'متابعة الطلب ›', en: 'Track order ›' },
    'g01.empty.l1':         { ar: 'لا توجد منتجات حاليًا', en: 'No products right now' },
    'g01.empty.l2':         { ar: 'يرجى المحاولة لاحقًا أو التواصل مع الاستقبال',
                              en: 'Please try again later or contact reception' },
    'g01.refresh':          { ar: 'تحديث', en: 'Refresh' },

    /* --- G-02 -------------------------------------------------------------- */
    'g02.title.fallback':   { ar: 'تفاصيل المنتج', en: 'Product details' },
    'g02.desc.title':       { ar: 'الوصف', en: 'Description' },
    'g02.oos.helper':       { ar: 'لإزالته من السلة افتح السلة', en: 'To remove it, open the cart' },
    'g02.error.l1':         { ar: 'المنتج غير متوفر', en: 'Product not available' },
    'g02.error.l2':         { ar: 'ربما تمت إزالته من المتجر', en: 'It may have been removed from the store' },
    'g02.backtostore':      { ar: 'العودة إلى المتجر', en: 'Back to store' },

    /* --- G-03 -------------------------------------------------------------- */
    'g03.title':            { ar: 'السلة', en: 'Cart' },
    'g03.remove':           { ar: 'إزالة', en: 'Remove' },
    'g03.items':            { ar: 'المنتجات', en: 'Items' },
    'g03.total':            { ar: 'الإجمالي', en: 'Total' },
    'g03.checkout':         { ar: 'إتمام الطلب', en: 'Checkout' },
    'g03.helper.checking':  { ar: 'جارٍ التحقق من التوفر…', en: 'Checking availability…' },
    'g03.helper.oos1':      { ar: 'أزل المنتج غير المتوفر للمتابعة', en: 'Remove the out-of-stock item to continue' },
    'g03.helper.oos2':      { ar: 'أزل المنتجات غير المتوفرة للمتابعة', en: 'Remove the out-of-stock items to continue' },
    'g03.helper.failed':    { ar: 'تعذّر التحقق من التوفر — قد يكون أحد المنتجات غير متوفر',
                              en: 'Availability not checked — an item may be unavailable' },
    'g03.empty.l1':         { ar: 'سلتك فارغة', en: 'Your cart is empty' },
    'g03.empty.l2':         { ar: 'أضف منتجات من المتجر لبدء طلبك', en: 'Add products from the store to start your order' },
    'g03.continue':         { ar: 'متابعة التسوق', en: 'Continue shopping' },

    /* Reorder toast, case A — skipped (G-03 §5.7). The Arabic dual here is
       منتجين: the counted noun is the object of the verb (accusative). It
       differs from case B on purpose and must not be "corrected" into it. */
    'g03.toast.skipped.1':    { ar: 'لم تتم إضافة منتج واحد لأنه لم يعد متوفرًا',
                                en: '1 item was not added because it is no longer available' },
    'g03.toast.skipped.2':    { ar: 'لم تتم إضافة منتجين لأنهما لم يعودا متوفرين',
                                en: '2 items were not added because they are no longer available' },
    'g03.toast.skipped.few':  { ar: 'لم تتم إضافة {n} منتجات لأنها لم تعد متوفرة',
                                en: '{n} items were not added because they are no longer available' },
    'g03.toast.skipped.many': { ar: 'لم تتم إضافة {n} منتجًا لأنها لم تعد متوفرة',
                                en: '{n} items were not added because they are no longer available' },
    /* Reorder toast, case B — capped (G-03 §5.7). The Arabic dual here is
       منتجان: the counted noun is the subject (nominative). Deliberately
       different from case A; both are correct in their own sentence. */
    'g03.toast.capped.1':     { ar: 'بلغ منتج واحد الحد الأقصى 10 ولم تُضف الكمية الزائدة',
                                en: '1 item reached the maximum of 10, so the extra units were not added' },
    'g03.toast.capped.2':     { ar: 'بلغ منتجان الحد الأقصى 10 ولم تُضف الكمية الزائدة',
                                en: '2 items reached the maximum of 10, so the extra units were not added' },
    'g03.toast.capped.few':   { ar: 'بلغت {n} منتجات الحد الأقصى 10 ولم تُضف الكمية الزائدة',
                                en: '{n} items reached the maximum of 10, so the extra units were not added' },
    'g03.toast.capped.many':  { ar: 'بلغ {n} منتجًا الحد الأقصى 10 ولم تُضف الكمية الزائدة',
                                en: '{n} items reached the maximum of 10, so the extra units were not added' },

    /* --- G-08 -------------------------------------------------------------- */
    'g08.title.retry':      { ar: 'تعذّر فتح المتجر', en: 'The store could not open' },
    'g08.body.retry':       { ar: 'تحقّق من اتصال الإنترنت ثم أعد المحاولة', en: 'Check your internet connection and try again' },
    'g08.title.invalid':    { ar: 'هذا الرابط لا يفتح متجر الفندق', en: 'This link does not open the hotel store' },
    'g08.body.invalid':     { ar: 'امسح رمز QR الموجود في غرفتك مرة أخرى', en: 'Scan the QR code in your room again' },
    'g08.reception':        { ar: 'إذا استمرت المشكلة، اتصل بالاستقبال من هاتف الغرفة',
                              en: 'If the problem continues, call reception from your room phone' },
    'g08.retry':            { ar: 'إعادة المحاولة', en: 'Retry' },
    'g08.trying':           { ar: 'جارٍ المحاولة…', en: 'Trying…' }
  });

  /* ==========================================================================
     2. Constants and module state
     ========================================================================== */

  var MAX_QTY = 10;              /* G-01 §7.1 */
  var TAP_LOCK_MS = 300;         /* G-01 §7.1 — per-card / per-line re-render lock */
  var CATALOG_LIMIT_MS = 10000;  /* G-01 §6.1 */
  var CHECK_LIMIT_MS = 5000;     /* G-03 §5.6 */
  var TRY_FLOOR_MS = 800;        /* G-08 §5.4 rule 3 */
  var HEADER_H = 56;             /* G-01 §4 S01 */
  var CATBAR_H = 48;             /* G-01 §4 S02 */

  /* The session catalog copy (G-01 §5.7): fetched once and kept until the next
     catalog fetch (reload, Refresh, Retry). The out-of-stock marks written by
     G-03 and M-04 live in Store.sessionCatalog, not here. */
  var catalog = null;                 /* { products: [], categories: [] } */
  var catalogState = 'idle';          /* idle | loading | ready */
  var productIndex = {};

  var tapLock = {};                   /* productId -> timestamp until which taps are ignored */
  var scrollMem = {};                 /* view id -> remembered scroll offset */
  var restoringScroll = false;
  var navSeq = 0;                     /* bumped on every hash navigation */
  var chipSuppressUntil = 0;

  var g08 = { trying: false, receptionShown: false, token: 0 };

  var g03 = {
    opener: null,      /* '/store' | '/product/:id' | '/order/:no' | null */
    phase: 'idle',     /* idle | pending | checking | done | failed */
    seenNav: -1,
    merging: false,
    checkToken: 0
  };

  var pendingReorder = null;          /* lines handed over by G-06 (G-03 §5.7) */

  /* ==========================================================================
     3. Helpers
     ========================================================================== */

  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  /* A malformed identifier in the URL must land on G-02's error state, not
     throw (G-02 §6.3 case 1: "a wrong identifier in the URL"). */
  function safeDecode(s) {
    try { return decodeURIComponent(String(s == null ? '' : s)); }
    catch (e) { return String(s == null ? '' : s); }
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject({ type: 'timeout' });
      }, ms);
      promise.then(function (v) {
        if (done) return;
        done = true; clearTimeout(timer); resolve(v);
      }, function (e) {
        if (done) return;
        done = true; clearTimeout(timer); reject(e);
      });
    });
  }

  /* Plural buckets, identical for the cart-bar count (G-01 §7.3) and for both
     Reorder-toast tables (G-03 §5.7): 1 / 2 / 3–10 / 11 and above. */
  function bucket(n) {
    if (n === 1) return '1';
    if (n === 2) return '2';
    if (n >= 3 && n <= 10) return 'few';
    return 'many';
  }

  function countWord(n) { return t('count.' + bucket(n), { n: n }); }

  function products() { return (catalog && catalog.products) || []; }
  function categories() { return (catalog && catalog.categories) || []; }
  function productById(id) { return has(productIndex, id) ? productIndex[id] : null; }

  function reindex() {
    productIndex = {};
    var list = products();
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id != null) productIndex[list[i].id] = list[i];
    }
  }

  /* Language fallback used everywhere: a missing English value shows the Arabic
     one, never a blank (G-01 §5.4, G-02 §7.7, G-03 §5.3). */
  function pick(ar, en) {
    if (I18N.lang === 'en') return (en != null && en !== '') ? en : (ar || '');
    return (ar != null && ar !== '') ? ar : (en || '');
  }

  function productName(p) { return p ? pick(p.nameAr, p.nameEn) : ''; }
  /* The catalog field is `descAr` / `descEn` (data.js, CONTRACT). The longer
     spelling is kept only as a harmless fallback for a catalog that uses it. */
  function productDesc(p) {
    if (!p) return '';
    var ar = p.descAr != null ? p.descAr : p.descriptionAr;
    var en = p.descEn != null ? p.descEn : p.descriptionEn;
    return pick(ar, en);
  }
  function categoryName(c) { return c ? pick(c.nameAr, c.nameEn) : ''; }
  /* The catalog field is `category`, holding the category's id. */
  function productCategory(p) { return p ? (p.category != null ? p.category : p.categoryId) : null; }
  function productImage(p) { return p ? (p.image || p.imageUrl || '') : ''; }

  function stockMark(id) {
    try { return (Store.sessionCatalog || {})[id] || null; } catch (e) { return null; }
  }

  /* Present in the session catalog copy at all? A line whose product is absent
     is priced from its snapshot and treated as out of stock (G-01 §5.7,
     G-03 §5.2 item 2 and decision 10). */
  function isPresent(id) {
    var mark = stockMark(id);
    if (mark && mark.present === false) return false;
    return !!productById(id);
  }

  /* Out of stock when the loaded catalog says so, when G-03 or M-04 wrote a
     mark during this session, or when the product left the catalog entirely
     (G-01 §5.4 item 4 and §5.7; G-03 §5.4). Marks are never cleared here
     (G-03 decision 5). */
  function isOutOfStock(id) {
    var mark = stockMark(id);
    if (mark && mark.outOfStock) return true;
    if (!isPresent(id)) return true;
    var p = productById(id);
    /* The catalog states stock as `inStock` (data.js, CONTRACT), so the card
       state is that field inverted. `outOfStock` is accepted too, for a
       catalog that states it the other way round, and is harmless when absent. */
    if (!p) return false;
    if (p.inStock === false) return true;
    return p.outOfStock === true;
  }

  /* Writes an out-of-stock mark into the session catalog copy. G-03 and M-04
     are its only writers (G-01 §5.7); this is G-03's half. */
  function markOutOfStock(id, gone) {
    try {
      if (!Store.sessionCatalog) Store.sessionCatalog = {};
      var entry = Store.sessionCatalog[id] || {};
      entry.outOfStock = true;
      if (gone) entry.present = false;
      else if (entry.present == null) entry.present = true;
      Store.sessionCatalog[id] = entry;
    } catch (e) {}
  }

  function cartLines() { try { return Store.cart || []; } catch (e) { return []; } }

  function cartLine(id) {
    var lines = cartLines();
    for (var i = 0; i < lines.length; i++) if (lines[i].productId === id) return lines[i];
    return null;
  }

  function cartQty(id) { var line = cartLine(id); return line ? line.qty : 0; }
  function cartCount() { try { return Store.cartCount(); } catch (e) { return 0; } }
  function cartTotal() { try { return Store.cartTotal(); } catch (e) { return 0; } }

  /* The three statuses that make an order active (G-01 §5.2). */
  function activeOrders() { try { return Store.activeOrders() || []; } catch (e) { return []; } }
  function savedOrders() { try { return Store.orders || []; } catch (e) { return []; } }
  function hasActiveOrder() { return activeOrders().length > 0; }
  function statusLabel(status) { return t('status.' + status); }

  /* The hotel name comes from the store settings that arrive with the catalog
     (G-01 §5.1). Nothing is invented: with no settings on the device the name
     is empty rather than a placeholder word. */
  function hotelName() {
    var sources = [];
    /* The store settings as they really are: hotelNameAr / hotelNameEn on the
       catalog response and on window.Data (CONTRACT, data.js). The other
       shapes below are tolerated fallbacks and are simply absent here. */
    if (catalog) { sources.push(catalog); sources.push(catalog.hotel); sources.push(catalog.settings); }
    if (window.Data) { sources.push(window.Data); sources.push(Data.hotel); sources.push(Data.settings); }
    sources.push(window.Settings);
    for (var i = 0; i < sources.length; i++) {
      var s = sources[i];
      if (!s) continue;
      var ar = s.nameAr != null ? s.nameAr : (s.hotelNameAr != null ? s.hotelNameAr : s.ar);
      var en = s.nameEn != null ? s.nameEn : (s.hotelNameEn != null ? s.hotelNameEn : s.en);
      if (ar || en) return pick(ar, en);
    }
    return '';
  }

  /* Tap lock: after any tap on Add / + / − / Remove that card or line ignores
     further taps for 300 ms, so a rapid double-tap on "Add" produces quantity 1,
     never 2 (G-01 §7.1, G-02 §7.1, G-03 §7.1). Held in module state so it
     survives the re-render the tap causes. */
  function locked(id) { var until = tapLock[id]; return !!until && Date.now() < until; }
  function lock(id) { tapLock[id] = Date.now() + TAP_LOCK_MS; }

  /* ---- scroll memory -------------------------------------------------------
     The router scrolls to the top after every render, including the re-render a
     cart change triggers. G-01 §6.4 and G-02 §6.4 require that nothing scrolls
     on Add / + / −, and G-01 §3.1 requires the remembered position on back from
     G-02 or G-03, so each view restores the offset it had at mount time, after
     the router's own scroll. */
  function rememberScroll() {
    if (restoringScroll) return;
    var v = App.currentView ? App.currentView() : null;
    if (v) scrollMem[v] = window.pageYOffset || 0;
  }

  function keepScroll(viewId, after) {
    var y = scrollMem[viewId] || 0;
    restoringScroll = true;
    var run = function () {
      window.scrollTo(0, y);
      scrollMem[viewId] = y;
      restoringScroll = false;
      if (after) after();
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    else setTimeout(run, 0);
  }

  /* A forward navigation always starts at the top of the target screen. */
  function goFresh(path, viewId) {
    scrollMem[viewId] = 0;
    App.go(path);
  }

  window.addEventListener('hashchange', function () { navSeq++; });

  window.addEventListener('scroll', function () {
    rememberScroll();
    if (!App.storeUnavailable && App.currentView && App.currentView() === 'G-01') {
      updateActiveChip(document.getElementById('app'));
    }
  });

  /* ==========================================================================
     4. Catalog loading (G-01 §6.1) and the hand-over to G-08
     ========================================================================== */

  /* G-08 §7.1: invalid link only when the address is not a store link or the
     server states that no store exists for it. Every other failure, and every
     failure that cannot be classified, is retryable (rule 3). */
  function classifyFailure(err) {
    var type = err && err.type;
    if (type === 'invalidLink' || type === 'notAStore' || type === 'noStore') return 'invalidLink';
    return 'retryable';
  }

  function showUnavailable(variant) {
    /* A fresh visit hides C04; it appears only from the first failed Retry
       onwards (G-08 §5.3, §3.3). */
    if (!App.storeUnavailable) g08.receptionShown = false;
    App.storeUnavailable = { variant: variant };
    g08.trying = false;
  }

  function adoptCatalog(res) {
    catalog = res || { products: [], categories: [] };
    if (!catalog.products) catalog.products = [];
    if (!catalog.categories) catalog.categories = [];
    reindex();
    catalogState = 'ready';
    App.storeUnavailable = null;
    /* G-01 §5.7: a successful fetch writes the session catalog copy, which is
       also the one thing that clears an out-of-stock mark. G-03, M-04 and the
       order screens read their stock answer from there, so the write belongs
       here, at the single place a catalog arrives. */
    try {
      if (typeof Store.setSessionCatalog === 'function') Store.setSessionCatalog(catalog.products);
    } catch (e) {}
  }

  function loadCatalog() {
    if (catalogState === 'loading') return;
    catalogState = 'loading';
    withTimeout(Server.getCatalog(), CATALOG_LIMIT_MS).then(function (res) {
      adoptCatalog(res);
      refreshActiveStatuses();
      App.render();
    }, function (err) {
      catalogState = 'idle';
      showUnavailable(classifyFailure(err));
      App.render();
    });
  }

  /* G-01 §5.2: on load the live status of every order whose last known status
     is active is fetched once; G-01 never polls afterwards, and a failure shows
     the last known status with no error text. Writing the fresh status back
     needs a Store writer; when store.js exposes none the refresh is skipped and
     the saved status stands — which is exactly the specified failure path. */
  function refreshActiveStatuses() {
    /* The writer is Store.updateOrder(orderNo, patch) (CONTRACT / store.js):
       it patches the saved record and persists it, which is exactly what a
       fresh status needs. */
    var writer = null;
    try {
      if (typeof Store.updateOrder === 'function') {
        writer = function (orderNo, status) { Store.updateOrder(orderNo, { status: status }); };
      }
    } catch (e) { return; }
    if (!writer || !window.Server || typeof Server.getStatus !== 'function') return;

    var list = activeOrders();
    for (var i = 0; i < list.length; i++) {
      (function (order) {
        Server.getStatus(order.orderNo).then(function (status) {
          if (!status || status === order.status) return;
          try { writer(order.orderNo, status); } catch (e) {}
          App.render();
        }, function () { /* silent — G-01 §6.3 case 2 */ });
      })(list[i]);
    }
  }

  /* ==========================================================================
     5. Shared fragments
     ========================================================================== */

  /* The generic product icon sits behind the photo; when the photo fails to
     load the <img> is removed and the icon shows (G-01 §5.4 item 1, G-02 §5.2,
     G-03 §5.3). No text such as "No image" is ever shown. */
  function imageBox(cls, elId, src, alt) {
    var html = '<div class="' + cls + '"' + (elId ? ' data-el="' + elId + '"' : '') + '>';
    html += '<span class="img-icon" aria-hidden="true"></span>';
    if (src) html += '<img class="img" src="' + esc(src) + '" alt="' + esc(alt || '') + '">';
    html += '</div>';
    return html;
  }

  function wireImageFallbacks(root) {
    var imgs = root.querySelectorAll('img.img');
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].addEventListener('error', function () {
        if (this.parentNode) this.parentNode.removeChild(this);
      });
    }
  }

  /* The floating cart bar of G-01 (S05/B07) and G-02 (S05/B05): same size,
     wording, count rule and total rule (G-02 §5.5). Hidden when the cart has
     zero lines. Out-of-stock lines and lines whose product left the catalog are
     counted and priced here too (G-01 §5.5, §7.2). */
  function cartBar(sectionId, buttonId) {
    if (cartCount() <= 0) return '';
    return '' +
      '<div class="cartbar" data-el="' + sectionId + '">' +
        '<button type="button" class="cartbar__btn" data-el="' + buttonId + '" data-act="cart">' +
          '<span class="cartbar__count">' + esc(countWord(cartCount())) + '</span>' +
          '<span class="cartbar__label">' + esc(t('common.viewcart')) + '</span>' +
          '<span class="cartbar__total">' + esc(money(cartTotal())) + '</span>' +
        '</button>' +
      '</div>';
  }

  /* Add / + / − are device-side only; no request is sent (G-01 §7.1). */
  function applyStep(kind, id) {
    var qty = cartQty(id);
    if (kind === 'add') { if (qty === 0) Store.addToCart(id); return; }
    if (kind === 'inc') { if (qty < MAX_QTY) Store.setQty(id, qty + 1); return; }
    if (kind === 'dec') {
      if (qty <= 1) Store.removeLine(id);          /* "−" at 1 removes the line */
      else Store.setQty(id, qty - 1);
    }
  }

  function openCartFrom(openerPath) {
    g03.opener = openerPath;
    goFresh('/cart', 'G-03');
  }

  /* ==========================================================================
     6. G-01 — Store
     ========================================================================== */

  function g01Header(loading) {
    var html = '<header class="topbar" data-el="G-01-S01">';
    /* B01 and B02 work during loading too (G-01 §6.1). */
    html += '<div class="topbar__side">' +
              '<button type="button" class="btn btn--link" data-el="G-01-B01" data-act="lang">' +
                esc(I18N.otherLabel()) +
              '</button>' +
            '</div>';
    html += '<div class="topbar__main">';
    if (loading) {
      html += '<div class="skeleton skeleton--line" data-el="G-01-C01"></div>';   /* C02 hidden */
    } else {
      html += '<div class="topbar__title" data-el="G-01-C01">' + esc(hotelName()) + '</div>';
      html += '<div class="topbar__sub" data-el="G-01-C02">' + esc(t('g01.payline')) + '</div>';
    }
    html += '</div>';
    html += '<div class="topbar__side topbar__side--end">' +
              '<button type="button" class="iconbtn" data-el="G-01-B02" data-act="orders">' +
                '<span class="iconbtn__glyph" aria-hidden="true"></span>' +
                '<span class="iconbtn__label">' + esc(t('common.myorders')) + '</span>' +
              '</button>' +
            '</div>';
    html += '</header>';
    return html;
  }

  /* C03 — three lines, always all three. Line 2 is shown whatever the status
     and whether or not the cart has items; the banner offers no cancel, no edit
     and no "add to my existing order" (G-01 §5.2). With several active orders
     it shows the most recently submitted one; Store.orders is newest first. */
  function g01Banner() {
    var active = activeOrders();
    if (!active.length) return '';
    var order = active[0];
    return '' +
      '<button type="button" class="banner" data-el="G-01-C03" data-act="banner" ' +
              'data-no="' + esc(order.orderNo) + '">' +
        '<span class="banner__line1">' + esc(t('g01.banner.l1', { no: order.orderNo, status: statusLabel(order.status) })) + '</span>' +
        '<span class="banner__line2">' + esc(t('common.newOrderNote')) + '</span>' +
        '<span class="banner__line3">' + esc(t('g01.banner.l3')) + '</span>' +
      '</button>';
  }

  function productsOf(cat) {
    var list = products(), out = [];
    for (var i = 0; i < list.length; i++) {
      if (productCategory(list[i]) === cat.id) out.push(list[i]);
    }
    return out;
  }

  /* Only categories holding at least one product get a chip and a section, in
     the catalog's own order. There is no "All" chip (G-01 §5.3). */
  function shownCategories() {
    var out = [], cats = categories();
    for (var i = 0; i < cats.length; i++) {
      var items = productsOf(cats[i]);
      if (items.length) out.push({ cat: cats[i], items: items });
    }
    return out;
  }

  function g01CatBar(groups) {
    /* .catbar is the sticky strip, .catbar__row the horizontal scroller inside
       it: both are needed, the row is what scrolls. */
    var html = '<nav class="catbar" data-el="G-01-S02"><div class="catbar__row">';
    for (var i = 0; i < groups.length; i++) {
      html += '<button type="button" class="chip' + (i === 0 ? ' chip--active' : '') + '" ' +
              'data-el="G-01-B03" data-act="chip" data-cat="' + esc(groups[i].cat.id) + '">' +
              esc(categoryName(groups[i].cat)) + '</button>';
    }
    html += '</div></nav>';
    return html;
  }

  /* The action row is exactly one of: Add, the stepper, or the badge
     (G-01 §5.4 item 4). */
  function g01ActionRow(p) {
    var id = p.id, qty = cartQty(id), oos = isOutOfStock(id);
    var html = '<div class="card__action">';
    if (oos) {
      /* Both forms of the badge: bare, and naming the quantity already in the
         cart. It is text only; removal stays on G-03 (G-01 §4 C07). */
      html += '<div class="badge badge--out badge--block" data-el="G-01-C07">' +
              esc(qty > 0 ? t('common.oos.n', { n: qty }) : t('common.oos')) + '</div>';
    } else if (qty <= 0) {
      html += '<button type="button" class="card__add" data-el="G-01-B04" data-act="add" ' +
              'data-id="' + esc(id) + '">' + esc(t('common.add')) + '</button>';
    } else {
      html += '<div class="stepper">';
      html += '<button type="button" class="stepper__btn" data-el="G-01-B05" data-act="dec" ' +
              'data-id="' + esc(id) + '">−</button>';
      html += '<span class="stepper__qty" data-el="G-01-C06">' + qty + '</span>';
      html += '<button type="button" class="stepper__btn" ' +
              'data-el="G-01-B06" data-act="inc" data-id="' + esc(id) + '"' +
              (qty >= MAX_QTY ? ' disabled aria-disabled="true"' : '') + '>+</button>';
      html += '</div>';
    }
    html += '</div>';
    /* C08 only at exactly 10 (G-01 §4 C08, §7.1). */
    if (!oos && qty === MAX_QTY) {
      html += '<div class="stepper__note" data-el="G-01-C08">' + esc(t('common.max10')) + '</div>';
    }
    return html;
  }

  function g01Card(p) {
    var oos = isOutOfStock(p.id);
    var html = '<article class="card' + (oos ? ' card--out' : '') + '" data-el="G-01-C05" ' +
               'data-act="card" data-id="' + esc(p.id) + '">';
    html += imageBox('card__img', null, productImage(p), productName(p));
    html += '<div class="card__name">' + esc(productName(p)) + '</div>';
    html += '<div class="card__price">' + esc(money(num(p.price))) + '</div>';
    html += g01ActionRow(p);
    html += '</article>';
    return html;
  }

  function g01List(groups) {
    var html = '<div data-el="G-01-S03">';
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      html += '<section class="section-block" data-el="G-01-S04" data-cat="' + esc(g.cat.id) + '">';
      html += '<h2 class="section__title" data-el="G-01-C04">' + esc(categoryName(g.cat)) + '</h2>';
      html += '<div class="grid">';
      for (var j = 0; j < g.items.length; j++) html += g01Card(g.items[j]);
      html += '</div></section>';
    }
    html += '</div>';
    return html;
  }

  /* 4 placeholder chips and 6 placeholder cards, no text anywhere in the list
     area (G-01 §4 C10, §6.1). */
  function g01Skeleton() {
    var html = '<nav class="catbar" data-el="G-01-C10"><div class="catbar__row">';
    for (var i = 0; i < 4; i++) html += '<span class="skeleton skeleton--chip"></span>';
    html += '</div></nav>';
    html += '<div data-el="G-01-C10"><div class="grid">';
    for (var j = 0; j < 6; j++) {
      html += '<div class="card">' +
                '<div class="skeleton skeleton--img"></div>' +
                '<div class="skeleton skeleton--line"></div>' +
                '<div class="skeleton skeleton--line skeleton--short"></div>' +
              '</div>';
    }
    html += '</div></div>';
    return html;
  }

  function g01Empty() {
    /* B08 sits inside the empty block: .empty is the centred column and gives
       the button its 8px of air (.empty .btn). */
    return '' +
      '<div class="empty" data-el="G-01-C09">' +
        '<div class="empty__title">' + esc(t('g01.empty.l1')) + '</div>' +
        '<div class="empty__text">' + esc(t('g01.empty.l2')) + '</div>' +
        '<button type="button" class="btn" data-el="G-01-B08" data-act="refresh">' +
          esc(t('g01.refresh')) + '</button>' +
      '</div>';
  }

  Views['G-01'] = {
    render: function () {
      /* The catalog cannot load → G-08 replaces G-01 entirely (G-01 §6.3
         case 1; G-08 §5.7). */
      if (App.storeUnavailable) return Views['G-08'].render({});

      var loading = (catalogState !== 'ready');
      /* .screen is what reserves room at the bottom for whichever fixed bar is
         on screen, so every state of every screen here is wrapped in one. */
      var html = '<section class="screen">' + g01Header(loading);

      /* Loading: banner and cart bar hidden (G-01 §6.1). */
      if (loading) return html + g01Skeleton() + '</section>';

      html += g01Banner();

      var groups = shownCategories();
      if (!groups.length) {
        /* Empty: category bar and cart bar hidden, banner still allowed
           (G-01 §6.2). */
        return html + g01Empty() + '</section>';
      }

      html += g01CatBar(groups);
      html += g01List(groups);
      html += cartBar('G-01-S05', 'G-01-B07');
      return html + '</section>';
    },

    mount: function (root) {
      if (App.storeUnavailable) return;
      if (catalogState === 'idle') { loadCatalog(); return; }
      if (catalogState === 'loading') return;
      wireImageFallbacks(root);
      keepScroll('G-01', function () { updateActiveChip(root); });
    }
  };

  /* The active chip is the one whose section title is the lowest title at or
     above the bottom edge of the sticky category bar (G-01 §5.3). */
  function updateActiveChip(root) {
    if (!root || Date.now() < chipSuppressUntil) return;
    var bar = root.querySelector('.catbar__row');
    if (!bar) return;
    var sections = root.querySelectorAll('.section-block');
    if (!sections.length) return;
    var edge = HEADER_H + CATBAR_H + 1;
    var activeId = sections[0].getAttribute('data-cat');
    for (var i = 0; i < sections.length; i++) {
      var title = sections[i].querySelector('.section__title');
      if (!title) continue;
      if (title.getBoundingClientRect().top <= edge) activeId = sections[i].getAttribute('data-cat');
    }
    setActiveChip(bar, activeId);
  }

  function setActiveChip(bar, catId) {
    var chips = bar.querySelectorAll('.chip');
    for (var i = 0; i < chips.length; i++) {
      var on = chips[i].getAttribute('data-cat') === catId;
      if (on) {
        if (chips[i].className.indexOf('chip--active') === -1) chips[i].className = 'chip chip--active';
        ensureChipVisible(bar, chips[i]);
      } else if (chips[i].className.indexOf('chip--active') !== -1) {
        chips[i].className = 'chip';
      }
    }
  }

  /* Whenever the active chip changes the row scrolls horizontally so it is
     fully visible with at least 16 px of the next chip peeking (G-01 §5.3). */
  function ensureChipVisible(bar, chip) {
    var peek = 16;
    var left = chip.offsetLeft - bar.scrollLeft;
    var right = left + chip.offsetWidth;
    if (left < peek) bar.scrollLeft = Math.max(0, chip.offsetLeft - peek);
    else if (right > bar.clientWidth - peek) {
      bar.scrollLeft = chip.offsetLeft + chip.offsetWidth - bar.clientWidth + peek;
    }
  }

  /* A chip tap marks itself active immediately and scrolls the list (about
     300 ms) so the section title sits directly under the category bar; the
     scroll-position rule resumes when the animation ends (G-01 §4 B03, §5.3). */
  function chipTap(root, catId) {
    var bar = root.querySelector('.catbar__row');
    if (bar) setActiveChip(bar, catId);
    chipSuppressUntil = Date.now() + 400;
    var section = root.querySelector('.section-block[data-cat="' + catId + '"]');
    if (!section) return;
    var title = section.querySelector('.section__title') || section;
    var top = (window.pageYOffset || 0) + title.getBoundingClientRect().top - (HEADER_H + CATBAR_H);
    if (top < 0) top = 0;
    scrollMem['G-01'] = top;
    if ('scrollBehavior' in document.documentElement.style) {
      window.scrollTo({ top: top, behavior: 'smooth' });
    } else {
      window.scrollTo(0, top);
    }
  }

  /* ==========================================================================
     7. G-02 — Product details
     ========================================================================== */

  /* G-02 §7.4: at most 500 characters rendered, cut at the last space before
     the 500th and "…" appended; single line breaks kept, consecutive blank
     lines collapsed to one; no "Read more". */
  function cutDescription(text) {
    var s = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    if (s.length <= 500) return s;
    var head = s.slice(0, 500);
    var cut = Math.max(head.lastIndexOf(' '), head.lastIndexOf('\n'));
    if (cut <= 0) cut = 500;
    return head.slice(0, cut) + '…';
  }

  function g02Header(title) {
    /* The end edge of the header is deliberately empty: no toggle, no
       "My orders", no cart icon (G-02 §5.1). */
    return '' +
      '<header class="topbar" data-el="G-02-S01">' +
        '<div class="topbar__side">' +
          '<button type="button" class="iconbtn" data-el="G-02-B01" data-act="back" ' +
                  'aria-label="' + esc(t('common.back')) + '">' +
            '<span class="iconbtn__glyph chev" aria-hidden="true">\u203A</span>' +
          '</button>' +
        '</div>' +
        '<div class="topbar__main">' +
          '<div class="topbar__title" data-el="G-02-C01">' + esc(title) + '</div>' +
        '</div>' +
        '<div class="topbar__side topbar__side--end"></div>' +
      '</header>';
  }

  function g02ActionRow(p) {
    var id = p.id, qty = cartQty(id), oos = isOutOfStock(id);
    var html = '<div data-el="G-02-S03">';
    if (oos) {
      html += '<div class="badge badge--out badge--block" data-el="G-02-C07">' +
              esc(qty > 0 ? t('common.oos.n', { n: qty }) : t('common.oos')) + '</div>';
    } else if (qty <= 0) {
      html += '<button type="button" class="btn btn--block" data-el="G-02-B02" data-act="add" ' +
              'data-id="' + esc(id) + '">' + esc(t('common.add')) + '</button>';
    } else {
      html += '<div class="stepper">';
      html += '<button type="button" class="stepper__btn" data-el="G-02-B03" data-act="dec" ' +
              'data-id="' + esc(id) + '">−</button>';
      html += '<span class="stepper__qty" data-el="G-02-C05">' + qty + '</span>';
      html += '<button type="button" class="stepper__btn" ' +
              'data-el="G-02-B04" data-act="inc" data-id="' + esc(id) + '"' +
              (qty >= MAX_QTY ? ' disabled aria-disabled="true"' : '') + '>+</button>';
      html += '</div>';
    }
    html += '</div>';

    /* C06 and C08 exclude each other: C06 needs the stepper, C08 needs the
       badge plus a cart line (G-02 §4 C08). */
    if (!oos && qty === MAX_QTY) {
      html += '<div class="stepper__note" data-el="G-02-C06">' + esc(t('common.max10')) + '</div>';
    } else if (oos && qty > 0) {
      html += '<div class="small muted center" data-el="G-02-C08">' + esc(t('g02.oos.helper')) + '</div>';
    }
    return html;
  }

  Views['G-02'] = {
    render: function (params) {
      if (App.storeUnavailable) return Views['G-08'].render({});

      /* Loading only on a reload or a direct URL; arriving from G-01 or G-03
         renders from the session catalog copy with no skeleton (G-02 §6.1).
         The header title is the fixed fallback in loading and error. */
      if (catalogState !== 'ready') {
        return '<section class="screen">' + g02Header(t('g02.title.fallback')) +
          '<div class="screen__body" data-el="G-02-C11">' +
            '<div class="skeleton skeleton--img"></div>' +
            '<div class="skeleton skeleton--line"></div>' +
            '<div class="skeleton skeleton--line skeleton--short"></div>' +
            '<div class="skeleton skeleton--line"></div>' +
            '<div class="skeleton skeleton--line"></div>' +
            '<div class="skeleton skeleton--line"></div>' +
            '<div class="skeleton skeleton--line skeleton--short"></div>' +
          '</div></section>';
      }

      var p = productById(safeDecode(params.id));
      if (!p) {
        /* Error state: fallback title, no C13, no cart bar, device cart
           untouched (G-02 §6.3 case 1). */
        return '<section class="screen">' + g02Header(t('g02.title.fallback')) +
          '<div class="empty" data-el="G-02-C12">' +
            '<div class="empty__title">' + esc(t('g02.error.l1')) + '</div>' +
            '<div class="empty__text">' + esc(t('g02.error.l2')) + '</div>' +
            '<button type="button" class="btn" data-el="G-02-B06" data-act="backstore">' +
              esc(t('g02.backtostore')) + '</button>' +
          '</div></section>';
      }

      var oos = isOutOfStock(p.id);
      /* Success: the header carries the product name (G-02 §5.1, decision 1). */
      var html = '<section class="screen">' + g02Header(productName(p));
      html += '<div class="screen__body stack" data-el="G-02-S02">';
      /* 4:3, contained, never cropped, never tappable (G-02 §5.2, §7.6). */
      html += imageBox('card__img card__img--wide' + (oos ? ' card__img--dim' : ''),
                       'G-02-C02', productImage(p), productName(p));
      html += '<div class="subhead" data-el="G-02-C03">' + esc(productName(p)) + '</div>';
      html += '<div class="bold" data-el="G-02-C04">' + esc(money(num(p.price))) + '</div>';
      html += g02ActionRow(p);

      /* C13 — the same sentence as G-01's banner line 2, decided from the
         orders already saved on the device. G-02 sends no status request of any
         kind (G-02 §5.7, decision 13). Not tappable, never gates Add. */
      if (hasActiveOrder()) {
        html += '<div class="small start" data-el="G-02-C13">' + esc(t('common.newOrderNote')) + '</div>';
      }

      /* With no description in either language S04 is hidden entirely: no
         title, no placeholder (G-02 §5.4, decision 9). */
      var desc = productDesc(p);
      if (desc) {
        html += '<section data-el="G-02-S04">';
        html += '<div class="subhead" data-el="G-02-C09">' + esc(t('g02.desc.title')) + '</div>';
        html += '<div data-el="G-02-C10">' + esc(cutDescription(desc)) + '</div>';
        html += '</section>';
      }
      html += '</div>';
      html += cartBar('G-02-S05', 'G-02-B05');
      return html + '</section>';
    },

    mount: function (root) {
      if (App.storeUnavailable) return;
      if (catalogState === 'idle') loadCatalog();
      wireImageFallbacks(root);
      keepScroll('G-02');
    }
  };

  /* ==========================================================================
     8. G-03 — Cart
     ========================================================================== */

  /* A line is rendered from the session catalog copy while the product is
     present there, otherwise from the line's own snapshot (G-03 §5.2). */
  function lineView(line) {
    var p = productById(line.productId);
    if (p && isPresent(line.productId)) {
      return { name: productName(p), price: num(p.price), image: productImage(p) };
    }
    var snap = line.snapshot || {};
    return { name: pick(snap.nameAr, snap.nameEn), price: num(snap.price), image: snap.image || '' };
  }

  function outOfStockLines() {
    var lines = cartLines(), n = 0;
    for (var i = 0; i < lines.length; i++) if (isOutOfStock(lines[i].productId)) n++;
    return n;
  }

  function g03Line(line) {
    var v = lineView(line);
    var oos = isOutOfStock(line.productId);
    var id = line.productId;
    var html = '<div class="line' + (oos ? ' line--out' : '') + '" data-el="G-03-C02" ' +
               'data-id="' + esc(id) + '">';
    html += imageBox('line__media', null, v.image, v.name);
    html += '<div>';
    html += '<div class="line__name">' + esc(v.name) + '</div>';
    html += '<div class="line__sub">' + esc(money(v.price)) + '</div>';
    if (oos) {
      /* Every line has N ≥ 1 by definition, so the bare badge form never occurs
         on this screen (G-03 §5.4). */
      html += '<div class="badge badge--out" data-el="G-03-C06">' +
              esc(t('common.oos.n', { n: line.qty })) + '</div>';
    }
    html += '</div>';

    html += '<div class="end">';
    /* The line total is shown on out-of-stock lines too, because the Total
       still includes them until they are removed (G-03 §5.4, §7.2). */
    html += '<div class="line__price" data-el="G-03-C05">' + esc(money(v.price * line.qty)) + '</div>';
    if (oos) {
      html += '<button type="button" class="btn btn--sm" data-el="G-03-B04" data-act="remove" ' +
              'data-id="' + esc(id) + '">' + esc(t('g03.remove')) + '</button>';
    } else {
      html += '<div class="stepper">';
      html += '<button type="button" class="stepper__btn" data-el="G-03-B02" data-act="dec" ' +
              'data-id="' + esc(id) + '">−</button>';
      html += '<span class="stepper__qty" data-el="G-03-C03">' + line.qty + '</span>';
      html += '<button type="button" class="stepper__btn" ' +
              'data-el="G-03-B03" data-act="inc" data-id="' + esc(id) + '"' +
              (line.qty >= MAX_QTY ? ' disabled aria-disabled="true"' : '') + '>+</button>';
      html += '</div>';
      if (line.qty === MAX_QTY) {
        html += '<div class="stepper__note" data-el="G-03-C04">' + esc(t('common.max10')) + '</div>';
      }
    }
    html += '</div></div>';
    return html;
  }

  /* C08 precedence: out-of-stock text first, then "checking", then the failure
     text; blank (the 20 px row still reserved) when the check succeeded and no
     line is out of stock (G-03 §5.5). */
  function g03Helper() {
    var oos = outOfStockLines();
    if (oos === 1) return t('g03.helper.oos1');
    if (oos >= 2) return t('g03.helper.oos2');
    if (g03.phase === 'checking') return t('g03.helper.checking');
    if (g03.phase === 'failed') return t('g03.helper.failed');
    return '';
  }

  /* B05 is disabled while the check runs and while any line is out of stock. A
     FAILED check leaves it enabled, with the honest helper line above it
     (G-03 §5.5 F12 ruling, decision 4; contract rule 6). */
  function checkoutDisabled() {
    return g03.phase === 'checking' || outOfStockLines() > 0;
  }

  function g03BottomBar() {
    var disabled = checkoutDisabled();
    /* --tall: this bar carries the totals and the helper line above the
       button, so .screen reserves more than the 64px of a plain bar. */
    return '' +
      '<div class="actionbar actionbar--tall" data-el="G-03-S03">' +
        '<div class="actionbar__row">' +
        /* Exactly two rows: no delivery fee, service charge, tax, discount or
           promo code (G-03 §5.5, decision 7). */
        '<div data-el="G-03-C07">' +
          '<div class="row row--split small">' +
            '<span>' + esc(t('g03.items')) + '</span>' +
            '<span class="num">' + cartCount() + '</span>' +
          '</div>' +
          '<div class="total">' +
            '<span class="total__label">' + esc(t('g03.total')) + '</span>' +
            '<span class="total__value">' + esc(money(cartTotal())) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="small muted center" data-el="G-03-C08">' + esc(g03Helper()) + '</div>' +
        '<button type="button" class="btn btn--primary btn--block' + (disabled ? ' is-disabled' : '') + '" ' +
                'data-el="G-03-B05" data-act="checkout"' +
                (disabled ? ' disabled aria-disabled="true"' : '') + '>' +
          esc(t('g03.checkout')) + '</button>' +
        '</div>' +
      '</div>';
  }

  function g03Header() {
    /* No language toggle, no "My orders", no active-order banner (G-03 §5.1,
       §5.9). */
    return '' +
      '<header class="topbar" data-el="G-03-S01">' +
        '<div class="topbar__side">' +
          '<button type="button" class="iconbtn" data-el="G-03-B01" data-act="back" ' +
                  'aria-label="' + esc(t('common.back')) + '">' +
            '<span class="iconbtn__glyph chev" aria-hidden="true">\u203A</span>' +
          '</button>' +
        '</div>' +
        '<div class="topbar__main">' +
          '<div class="topbar__title" data-el="G-03-C01">' + esc(t('g03.title')) + '</div>' +
        '</div>' +
        '<div class="topbar__side topbar__side--end"></div>' +
      '</header>';
  }

  Views['G-03'] = {
    render: function () {
      if (App.storeUnavailable) return Views['G-08'].render({});

      var html = '<section class="screen">' + g03Header();

      /* Loading: a reload / direct URL with no session catalog copy yet, or the
         Reorder merge waiting for its one availability check (G-03 §6.1). */
      if (catalogState !== 'ready' || g03.merging) {
        html += '<div class="pad-x" data-el="G-03-C11">';
        for (var i = 0; i < 3; i++) {
          html += '<div class="line"><div class="skeleton line__media"></div>' +
                  '<div><div class="skeleton skeleton--line"></div>' +
                  '<div class="skeleton skeleton--line skeleton--short"></div></div>' +
                  '<div></div></div>';
        }
        html += '</div>';
        return html + '</section>';
      }

      var lines = cartLines();
      if (!lines.length) {
        /* Empty: the whole bottom bar is absent, never a greyed Checkout
           (G-03 decision 1). */
        return html +
          '<div class="empty" data-el="G-03-C09">' +
            '<span class="empty__glyph" aria-hidden="true"></span>' +
            '<div class="empty__title">' + esc(t('g03.empty.l1')) + '</div>' +
            '<div class="empty__text">' + esc(t('g03.empty.l2')) + '</div>' +
            '<button type="button" class="btn" data-el="G-03-B06" data-act="continue">' +
              esc(t('g03.continue')) + '</button>' +
          '</div></section>';
      }

      html += '<div class="pad-x" data-el="G-03-S02">';
      for (var j = 0; j < lines.length; j++) html += g03Line(lines[j]);
      html += '</div>';
      html += g03BottomBar();
      return html + '</section>';
    },

    mount: function (root) {
      if (App.storeUnavailable) return;
      wireImageFallbacks(root);
      keepScroll('G-03');

      /* Exactly one availability check per ENTRY, and never on a re-render
         caused by a stepper, Remove or Checkout tap (G-03 §5.6). navSeq moves
         only on a hash navigation, so G-03 → G-04 → back → G-03 checks again
         while "+" does not. */
      var isEntry = (g03.seenNav !== navSeq);
      if (isEntry) {
        g03.seenNav = navSeq;
        scrollMem['G-03'] = 0;                   /* list at the top on every entry */
        g03.phase = 'idle';
        if (catalogState === 'ready') startEntry();
        else { g03.phase = 'pending'; if (catalogState === 'idle') loadCatalog(); }
      } else if (g03.phase === 'pending' && catalogState === 'ready') {
        startEntry();                            /* the reload's catalog has arrived */
      }
    },

    /* Hand-over used by G-06's "Reorder": the previous order's lines are handed
       to G-03, which owns the merge so that availability is decided by one
       request and one rule (G-03 §5.7). */
    startReorder: function (lines, openerPath) {
      pendingReorder = normalizeReorder(lines);
      if (openerPath) g03.opener = openerPath;
      goFresh('/cart', 'G-03');
    }
  };

  function normalizeReorder(lines) {
    var out = [];
    if (!lines) return out;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i] || {};
      var id = l.productId != null ? l.productId : l.id;
      var qty = l.qty != null ? l.qty : l.quantity;
      if (id != null) out.push({ productId: id, qty: num(qty) });
    }
    return out;
  }

  /* G-06 lives in another module, so the hand-over is also accepted through a
     shared field; it is consumed exactly once. */
  function takeReorder() {
    var req = pendingReorder;
    pendingReorder = null;
    if (!req) {
      try {
        if (Store.pendingReorder) {
          req = normalizeReorder(Store.pendingReorder);
          Store.pendingReorder = null;
        }
      } catch (e) {}
    }
    if (!req && window.PendingReorder) {
      req = normalizeReorder(window.PendingReorder);
      window.PendingReorder = null;
    }
    return (req && req.length) ? req : null;
  }

  function cartIds() {
    var lines = cartLines(), ids = [];
    for (var i = 0; i < lines.length; i++) ids.push(lines[i].productId);
    return ids;
  }

  function startEntry() {
    var reorder = takeReorder();
    if (reorder) { runReorder(reorder); return; }
    if (!cartLines().length) { g03.phase = 'idle'; return; }   /* zero lines → no check */
    runCheck(cartIds(), null);
  }

  /* Writes the marks the response carries. An "available" answer never clears
     an existing mark (G-03 §5.6 result table, decision 5). */
  function applyAvailability(res) {
    if (!res) return;
    for (var id in res) {
      if (!has(res, id)) continue;
      if (res[id] === 'outOfStock') markOutOfStock(id, false);
      else if (res[id] === 'notFound') markOutOfStock(id, true);
    }
  }

  function runCheck(ids, onDone) {
    var token = ++g03.checkToken;
    g03.phase = 'checking';
    if (!onDone) App.render();
    withTimeout(Server.checkAvailability(ids), CHECK_LIMIT_MS).then(function (res) {
      /* A late response still writes its marks for the next screen
         (G-03 §5.6 timeout rule). */
      applyAvailability(res);
      if (token !== g03.checkToken) return;
      g03.phase = 'done';
      if (onDone) onDone(res); else App.render();
    }, function () {
      if (token !== g03.checkToken) return;
      /* No mark is written; Checkout stays enabled unless a line is already out
         of stock; M-04 is the safety net (G-03 §5.6, decision 4). */
      g03.phase = 'failed';
      if (onDone) onDone(null); else App.render();
    });
  }

  /* The Reorder merge (G-03 §5.7): one check covering the current cart and the
     previous order, then the merge, then ONE toast reporting both counters. */
  function runReorder(prevLines) {
    var ids = cartIds();
    for (var i = 0; i < prevLines.length; i++) {
      if (ids.indexOf(prevLines[i].productId) === -1) ids.push(prevLines[i].productId);
    }
    g03.merging = true;
    g03.phase = 'checking';
    App.render();

    runCheck(ids, function (res) {
      if (!g03.merging) return;          /* abandoned by back: the cart is untouched */
      g03.merging = false;

      var skipped = 0, capped = 0;
      for (var k = 0; k < prevLines.length; k++) {
        var id = prevLines[k].productId;
        var want = prevLines[k].qty;
        var answer = (res && has(res, id)) ? res[id] : null;
        /* On a failed check the session catalog copy alone decides: a product
           absent from it, or carrying a mark, is skipped (G-03 §5.7 step 2). */
        var skip = (answer === 'outOfStock' || answer === 'notFound') ||
                   (!isPresent(id) || isOutOfStock(id));
        if (skip) { skipped++; continue; }

        var existing = cartQty(id);
        var target = existing + want;
        /* Capped at 10, the excess dropped; a line already standing at 10
           counts too, because nothing at all could be added for it. */
        if (target > MAX_QTY) { capped++; target = MAX_QTY; }
        if (target !== existing) {
          if (existing === 0) Store.addToCart(id);
          Store.setQty(id, target);
        }
      }

      App.render();
      if (skipped >= 1 || capped >= 1) showReorderToast(skipped, capped);
    });
  }

  /* One toast, the skipped sentence first, no connecting word, no icon;
     5 seconds for one sentence and 7 for both (G-03 §5.7, §7.5). */
  function showReorderToast(skipped, capped) {
    var lines = [];
    if (skipped >= 1) lines.push(t('g03.toast.skipped.' + bucket(skipped), { n: skipped }));
    if (capped >= 1) lines.push(t('g03.toast.capped.' + bucket(capped), { n: capped }));
    if (!lines.length) return;
    App.toast(lines, lines.length === 2 ? 7000 : 5000);
  }

  /* ==========================================================================
     9. G-08 — Store unavailable
     ========================================================================== */

  Views['G-08'] = {
    render: function () {
      var variant = (App.storeUnavailable && App.storeUnavailable.variant) || 'retryable';
      var invalid = (variant === 'invalidLink');

      /* The header holds exactly two controls and nothing else: no hotel name,
         no title, no back arrow (G-08 §5.1). */
      var html = '<section class="screen"><header class="topbar" data-el="G-08-S01">';
      html += '<div class="topbar__side">' +
                '<button type="button" class="btn btn--link" data-el="G-08-B01" data-act="lang">' +
                  esc(I18N.otherLabel()) +
                '</button>' +
              '</div>';
      html += '<div class="topbar__main"></div>';
      html += '<div class="topbar__side topbar__side--end">';
      /* B03 is rendered if and only if the device holds at least one readable
         order record — on both variants, never greyed, never disabled
         (G-08 §5.1, criteria 31–32). Its condition is the existence of a
         record, never its status. */
      if (savedOrders().length >= 1) {
        html += '<button type="button" class="btn btn--link" data-el="G-08-B03" data-act="orders">' +
                  esc(t('common.myorders')) + '</button>';
      }
      html += '</div></header>';

      html += '<div class="empty" data-el="G-08-S02">';
      html += '<span class="empty__glyph" data-el="G-08-C01" aria-hidden="true"></span>';
      html += '<div class="empty__title" data-el="G-08-C02">' +
                esc(invalid ? t('g08.title.invalid') : t('g08.title.retry')) + '</div>';
      html += '<div class="empty__text" data-el="G-08-C03">' +
                esc(invalid ? t('g08.body.invalid') : t('g08.body.retry')) + '</div>';

      /* C04: always on the invalid-link variant; on the retryable variant only
         from the first failed Retry onwards, then for the rest of the visit
         (G-08 §5.3). It is text, never a number and never a tel: link. */
      if (invalid || g08.receptionShown) {
        html += '<div class="empty__text" data-el="G-08-C04">' + esc(t('g08.reception')) + '</div>';
      }

      /* B02 is not rendered at all on the invalid-link variant (G-08 §5.2). */
      if (!invalid) {
        html += '<button type="button" class="btn btn--primary' + (g08.trying ? ' is-disabled' : '') + '" ' +
                'data-el="G-08-B02" data-act="retry"' +
                (g08.trying ? ' disabled aria-disabled="true"' : '') + '>';
        if (g08.trying) {
          /* C05 replaces B02's label inside the same pill (G-08 §5.4 rule 1). */
          html += '<span class="row" data-el="G-08-C05">' +
                    '<span class="spinner" aria-hidden="true"></span>' +
                    esc(t('g08.trying')) +
                  '</span>';
        } else {
          html += esc(t('g08.retry'));
        }
        html += '</button>';
      }
      html += '</div>';
      return html + '</section>';
    },

    mount: function () { /* nothing to wire: taps are handled by the dispatcher */ }
  };

  function g08Retry() {
    if (g08.trying) return;            /* a tap during the trying state does nothing */
    g08.trying = true;
    App.render();                      /* the label becomes C05 on the same tap */

    var token = ++g08.token;
    var started = Date.now();

    /* Floor of 800 ms so an offline device still sees the change; ceiling is
       G-01's 10-second catalog limit (G-08 §5.4 rules 2–3). */
    function settle(fn) {
      var wait = Math.max(0, TRY_FLOOR_MS - (Date.now() - started));
      setTimeout(function () {
        if (token !== g08.token) return;   /* abandoned: a late answer never navigates */
        fn();
      }, wait);
    }

    withTimeout(Server.getCatalog(), CATALOG_LIMIT_MS).then(function (res) {
      settle(function () {
        g08.trying = false;
        adoptCatalog(res);
        refreshActiveStatuses();
        /* Success means leaving: G-01, scrolled to the top, replacing G-08 in
           the history (G-08 §3.3, §6.4). A valid catalog with zero products is
           a success and lands on G-01's empty state. */
        scrollMem['G-01'] = 0;
        App.replace('/store');
      });
    }, function (err) {
      settle(function () {
        g08.trying = false;
        g08.receptionShown = true;         /* C04 from the first failed Retry onwards */
        App.storeUnavailable = { variant: classifyFailure(err) };
        App.render();
      });
    });
  }

  /* ==========================================================================
     10. One delegated tap dispatcher for all four screens
     ========================================================================== */

  function actionTarget(start) {
    var app = document.getElementById('app');
    var node = start;
    while (node && node !== document) {
      if (node === app) return null;                       /* left the screen area */
      if (node.getAttribute && node.getAttribute('data-act')) return node;
      node = node.parentNode;
    }
    return null;
  }

  document.addEventListener('click', function (e) {
    var act = actionTarget(e.target);
    if (!act) return;
    var root = document.getElementById('app');
    var kind = act.getAttribute('data-act');
    var id = act.getAttribute('data-id');

    /* G-08 is rendered in place of whatever screen failed, so it is dispatched
       first (G-08 §3.3). */
    if (App.storeUnavailable) {
      if (kind === 'lang') { I18N.setLang(I18N.other()); return; }   /* never cancels a Retry */
      if (kind === 'orders') {
        g08.token++;                       /* a Retry in flight is abandoned, §5.4 rule 8 */
        g08.trying = false;
        goFresh('/orders', 'G-07');
        return;
      }
      if (kind === 'retry') g08Retry();
      return;
    }

    var view = App.currentView();

    if (kind === 'lang') { I18N.setLang(I18N.other()); return; }
    if (kind === 'orders') { goFresh('/orders', 'G-07'); return; }
    if (kind === 'banner') { goFresh('/order/' + act.getAttribute('data-no'), 'G-06'); return; }
    if (kind === 'refresh') { catalogState = 'idle'; App.render(); return; }
    if (kind === 'chip') { chipTap(root, act.getAttribute('data-cat')); return; }

    if (kind === 'cart') {
      openCartFrom(view === 'G-02' ? location.hash.replace(/^#/, '') : '/store');
      return;
    }

    if (kind === 'card') { goFresh('/product/' + encodeURIComponent(id), 'G-02'); return; }

    if (kind === 'back' || kind === 'backstore') {
      /* The back arrow does exactly what the browser back gesture does
         (G-02 §3.2, G-03 §3.1 back target rule). */
      App.back(view === 'G-03' ? (g03.opener || '/store') : '/store');
      return;
    }

    if (kind === 'continue') {
      /* History reset so G-01 is the only entry (G-03 §3.2, decision 13). */
      scrollMem['G-01'] = 0;
      App.replace('/store');
      return;
    }

    if (kind === 'checkout') {
      if (checkoutDisabled()) return;      /* a tap on the disabled button does nothing */
      goFresh('/checkout', 'G-04');
      return;
    }

    /* Add / + / − / Remove: cart only, never navigation, with the 300 ms
       per-card / per-line lock (G-01 §5.4, §7.1). */
    if (kind === 'add' || kind === 'inc' || kind === 'dec' || kind === 'remove') {
      if (locked(id)) return;
      lock(id);
      if (kind === 'remove') Store.removeLine(id);
      else applyStep(kind, id);
    }
  });
})();
