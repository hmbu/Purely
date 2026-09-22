/* staff/js/board.js — S-01 Orders board (لوحة الطلبات).
   Spec: /spec/staff/screens/S-01.md. Reads only the board response
   (HotelDB.orders() through Staff.Server.board) and three device values:
   language, sound, session. Sends no action of any kind (§5.0). */
(function () {
  'use strict';

  var S = window.Staff;
  var Server = S.Server, Alert = S.Alert, Chime = S.Chime, Session = S.Session;

  I18N.register({
    's01.c01':        { ar: 'الوردية: {name}', en: 'Shift: {name}' },
    's01.c01.ended':  { ar: 'الوردية منتهية', en: 'Shift ended' },
    's01.b02.on':     { ar: 'الصوت: يعمل', en: 'Sound: on' },
    's01.b02.off':    { ar: 'الصوت: متوقف', en: 'Sound: off' },
    's01.b02.blocked':{ ar: 'الصوت: متوقف (انقر للتفعيل)', en: 'Sound: off (tap to enable)' },
    's01.b03':        { ar: 'إنهاء الوردية', en: 'End shift' },
    's01.b04':        { ar: 'نشطة ({n})', en: 'Active ({n})' },
    's01.b05':        { ar: 'منتهية اليوم ({n})', en: 'Done today ({n})' },
    's01.c02':        { ar: 'تعذّر تحديث اللوحة — آخر تحديث {d}', en: 'Could not refresh the board — last updated {d} ago' },
    's01.c03':        { ar: '{label} ({n})', en: '{label} ({n})' },
    's01.c05':        { ar: 'متأخر', en: 'Late' },
    's01.c06.card':   { ar: 'بطاقة', en: 'Card' },
    's01.c06.cash':   { ar: 'نقدًا', en: 'Cash' },
    's01.c06.change': { ar: 'نقدًا — باقي {money}', en: 'Cash — {money} change' },
    's01.c06.exact':  { ar: 'نقدًا — المبلغ مطابق', en: 'Cash — exact amount' },
    's01.c07':        { ar: 'ملاحظات', en: 'Notes' },
    's01.c08':        { ar: 'ألغى الضيف هذا الطلب — لا تُحضّره', en: 'The guest cancelled this order — do not prepare it' },
    's01.c09.l1':     { ar: 'لا توجد طلبات الآن', en: 'No orders right now' },
    's01.c09.l2':     { ar: 'ستصلك نغمة عند وصول طلب جديد', en: 'A chime will sound when a new order arrives' },
    's01.c09.l3':     { ar: 'الصوت متوقف الآن — لن تسمع النغمة', en: 'Sound is off — you will not hear the chime' },
    's01.c10.l1':     { ar: 'لم يكتمل أي طلب اليوم بعد', en: 'No orders have been completed today yet' },
    's01.c10.l2':     { ar: 'تظهر هنا الطلبات التي وُصِّلت أو أُلغيت منذ الساعة 04:00', en: 'Orders delivered or cancelled since 04:00 appear here' },
    's01.c11.l1':     { ar: 'انتهت مدة الجلسة', en: 'The session has expired' },
    's01.c11.l2':     { ar: 'اللوحة لا تزال تُحدَّث، ولا يمكن تنفيذ أي إجراء قبل تسجيل الدخول', en: 'The board keeps refreshing; no action can be taken until you sign in' },
    's01.c13.l1':     { ar: 'تعذّر تحميل اللوحة', en: 'Could not load the board' },
    's01.c13.l2':     { ar: 'تحقّق من الاتصال بالشبكة', en: 'Check the network connection' },
    's01.c13.l3':     { ar: 'إذا تكرّر ذلك، أبلغ المناوب المسؤول', en: 'If this keeps happening, tell the duty manager' },
    's01.b07':        { ar: 'إعادة المحاولة', en: 'Retry' },
    's01.sum':        { ar: '{count} · {total}', en: '{count} · {total}' },
    /* Screen reader only (§7.7). */
    's01.sr.card':    { ar: 'غرفة {room}، طلب رقم {no}، {count}، {total}، {chips}', en: 'Room {room}, order {no}, {count}, {total}, {chips}' },
    's01.sr.new':     { ar: '{n} طلبات جديدة', en: '{n} new orders' }
  });

  var REFRESH_MS = 15000;
  var MARK_MS = 60 * 1000;           /* C08 stays in place for 60 s (§5.7) */
  var DARK_MS = 2 * 60 * 1000;       /* C02 turns dark after 2 min (§5.5 rule 7) */
  var ACTIVE = ['New', 'Accepted', 'OnTheWay'];
  var STATUSES = ['New', 'Accepted', 'OnTheWay', 'Delivered', 'Cancelled'];

  /* Board state. Survives a visit to S-02 (page memory), reset at sign-in. */
  var B = {
    mounted: false, timer: null, inFlight: false, again: false, gen: 0,
    orders: null,      // last successful response (null: none yet)
    everOk: false,     // any success since sign-in / load (§6.3)
    failed: false,     // the most recent attempt failed
    lastOk: 0,
    retrying: false,   // B07 tapped: loading state until the answer
    marks: {},         // orderNo -> { until, group } guest-cancelled cards (C08)
    prevActive: null,  // orderNo -> status at the previous success
    touching: false, dirty: false,
    lastPaint: 0, expiredShown: false, lastNewCount: null, tapAt: 0
  };

  function resetData() {
    B.orders = null; B.everOk = false; B.failed = false; B.lastOk = 0;
    B.marks = {}; B.prevActive = null; B.lastNewCount = null;
    App.state.lastBoard = null;
  }

  /* ------------------------------------------------------------------ *
   * Requests — one on open, then every 15 s from the end of the previous
   * attempt; never two in flight; paused while hidden (§5.5, §7.4).
   * ------------------------------------------------------------------ */
  function request() {
    if (!B.mounted) return;
    if (B.inFlight) { B.again = true; return; }
    clearTimeout(B.timer);
    B.inFlight = true;
    var g = ++B.gen;
    Server.board().then(function (list) {
      if (g !== B.gen) return;
      B.inFlight = false;
      onSuccess(list || []);
      after();
    }, function () {
      if (g !== B.gen) return;
      B.inFlight = false;
      B.failed = true;
      B.retrying = false;
      paint();
      after();
    });
  }

  function after() {
    if (B.again) { B.again = false; request(); return; }
    schedule();
  }

  function schedule() {
    clearTimeout(B.timer);
    B.timer = setTimeout(function () {
      if (!B.mounted) return;
      if (document.hidden) { B.hiddenPending = true; return; }
      request();
    }, REFRESH_MS);
  }

  function newList(orders) {
    var out = [];
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].status === 'New') out.push({ orderNo: orders[i].orderNo, createdAt: orders[i].createdAt });
    }
    return out;
  }

  function onSuccess(list) {
    var now = Date.now(), i, o;
    var valid = [];
    for (i = 0; i < list.length; i++) {
      if (list[i] && STATUSES.indexOf(list[i].status) !== -1) valid.push(list[i]);   /* §7.1: skip a sixth status */
    }

    /* §5.7 — a card the guest cancelled since the previous refresh stays in
       place, marked, for 60 s; an expired mark lets it leave now. */
    for (var no in B.marks) {
      if (B.marks.hasOwnProperty(no) && now >= B.marks[no].until) delete B.marks[no];
    }
    if (B.prevActive) {
      for (i = 0; i < valid.length; i++) {
        o = valid[i];
        if (o.status === 'Cancelled' && o.cancelledByGuest && B.prevActive[o.orderNo] && !B.marks[o.orderNo]) {
          B.marks[o.orderNo] = { until: now + MARK_MS, group: B.prevActive[o.orderNo] };
        }
      }
    }
    var prev = {};
    for (i = 0; i < valid.length; i++) if (S.isActiveStatus(valid[i].status)) prev[valid[i].orderNo] = valid[i].status;
    B.prevActive = prev;

    B.orders = valid;
    App.state.lastBoard = valid;
    B.everOk = true;
    B.failed = false;
    B.retrying = false;
    B.lastOk = now;

    var news = newList(valid);
    Alert.observe(news);                                   /* §5.6 rules 2–3 */
    if (B.lastNewCount !== null && news.length > B.lastNewCount) {
      App.announce(t('s01.sr.new', { n: news.length }));
    }
    B.lastNewCount = news.length;
    paint();
  }

  /* §5.3 / §7.5 — nothing moves under a finger: a repaint that arrives
     during a touch is applied when the touch ends. */
  function paint() {
    if (!B.mounted) return;
    if (B.touching) { B.dirty = true; return; }
    draw();
  }

  /* ------------------------------------------------------------------ *
   * Lists
   * ------------------------------------------------------------------ */
  function byCreatedAsc(a, b) { return (a.createdAt || 0) - (b.createdAt || 0) || Number(a.orderNo) - Number(b.orderNo); }

  function computeLists() {
    var now = Date.now(), dayStart = S.hotelDayStart(now);
    var groups = { New: [], Accepted: [], OnTheWay: [] }, done = [], activeCount = 0;
    var orders = B.orders || [];
    for (var i = 0; i < orders.length; i++) {
      var o = orders[i], mark = B.marks[o.orderNo];
      if (S.isActiveStatus(o.status)) { groups[o.status].push(o); activeCount++; continue; }
      if (mark) { groups[mark.group].push(o); continue; }
      if (S.finalAt(o) >= dayStart) done.push(o);
    }
    for (var g in groups) if (groups.hasOwnProperty(g)) groups[g].sort(byCreatedAsc);
    done.sort(function (a, b) { return S.finalAt(b) - S.finalAt(a); });
    if (done.length > 50) done = done.slice(0, 50);
    return { groups: groups, done: done, activeCount: activeCount };
  }

  /* ------------------------------------------------------------------ *
   * Card (C04 with C05–C08)
   * ------------------------------------------------------------------ */
  function payChip(o) {
    var pc = S.payCase(o);
    if (pc.kind === 'card') return t('s01.c06.card');
    if (pc.kind === 'cashMore') return t('s01.c06.change', { money: money(pc.change) });
    if (pc.kind === 'cashEqual') return t('s01.c06.exact');
    return t('s01.c06.cash');
  }

  function stripTags(s) { return String(s).replace(/<[^>]*>/g, ''); }

  function card(o, doneTab, now) {
    var marked = !doneTab && !!B.marks[o.orderNo];
    var room = esc(o.roomNumber);
    var count = S.countWord(S.itemQty(o));
    var total = money(o.total);
    var chips = [], chipsHtml = '';
    if (!marked) {
      if (!doneTab && Alert.isLate(o, now)) {
        chips.push(t('s01.c05'));
        chipsHtml += '<span class="s-chip s-chip--late" data-el="S-01-C05">' + t('s01.c05') + '</span>';
      }
      var pay = payChip(o);
      chips.push(stripTags(pay));
      chipsHtml += '<span class="s-chip" data-el="S-01-C06">' + pay + '</span>';
      if (S.hasNotes(o)) {
        chips.push(t('s01.c07'));
        chipsHtml += '<span class="s-chip" data-el="S-01-C07">' + t('s01.c07') + '</span>';
      }
    } else {
      chips.push(t('s01.c08'));
    }
    var aria = t('s01.sr.card', {
      room: esc(S.spaced(o.roomNumber)), no: esc(o.orderNo), count: count,
      total: total, chips: chips.join('، ')
    });
    return '<button type="button" class="s-card' + (marked ? ' s-card--gone' : '') + '" data-el="S-01-C04"' +
             ' data-order="' + esc(o.orderNo) + '" aria-label="' + esc(aria) + '">' +
             '<span class="s-card__top">' +
               '<span class="s-card__room"><span class="s-card__roomword">' + t('st.room') + '</span>' +
               '<span class="s-roomno s-card__roomno">' + room + '</span></span>' +
               '<span class="s-card__elapsed">' + S.duration(now - (o.createdAt || now)) + '</span>' +
             '</span>' +
             '<span class="s-card__meta"><span>' + t('st.orderno', { no: '<span class="num">' + esc(o.orderNo) + '</span>' }) + '</span>' +
               (doneTab ? '<span class="s-card__status">' + t('st.status.' + o.status) + '</span>' : '') +
             '</span>' +
             '<span class="s-card__sum">' + t('s01.sum', { count: count, total: total }) + '</span>' +
             (marked
               ? '<span class="s-card__gone" data-el="S-01-C08">' + t('s01.c08') + '</span>'
               : '<span class="s-chips">' + chipsHtml + '</span>') +
           '</button>';
  }

  /* ------------------------------------------------------------------ *
   * Draw
   * ------------------------------------------------------------------ */
  function soundLabel() {
    var st = Chime.state();
    return t(st === 'on' ? 's01.b02.on' : (st === 'off' ? 's01.b02.off' : 's01.b02.blocked'));
  }

  function shiftName(sess) {
    var name = String((sess && sess.name) || '');
    return name.length > 18 ? name.slice(0, 18) + '…' : name;
  }

  function draw() {
    var now = Date.now();
    var sess = Session.current();
    var expired = !sess || Session.expired(sess);
    B.expiredShown = expired;
    B.lastPaint = now;
    B.dirty = false;

    var loading = !B.everOk && (B.orders === null) && (!B.failed || B.retrying);
    var coldError = !B.everOk && B.failed && !B.retrying;
    if (B.retrying && !B.everOk) { loading = true; coldError = false; }
    var lists = B.everOk ? computeLists() : null;
    var tab = App.state.tab === 'done' ? 'done' : 'active';
    var nActive = lists ? String(lists.activeCount) : '—';
    var nDone = lists ? String(lists.done.length) : '—';

    var h = '<div class="s-screen s-board">' +
      '<div class="s-top">' +
        '<header class="s-header" data-el="S-01-S01">' +
          '<span class="s-header__shift" data-el="S-01-C01">' +
            (expired ? t('s01.c01.ended') : t('s01.c01', { name: esc(shiftName(sess)) })) + '</span>' +
          '<button type="button" class="s-hbtn" data-el="S-01-B02">' + soundLabel() + '</button>' +
          '<button type="button" class="s-hbtn" data-el="S-01-B01" lang="' + I18N.other() + '">' + t('st.lang.other') + '</button>' +
          (expired ? '' : '<button type="button" class="s-hbtn s-hbtn--end" data-el="S-01-B03">' + t('s01.b03') + '</button>') +
        '</header>' +
        '<div class="s-tabs" role="tablist" data-el="S-01-S02">' +
          '<button type="button" role="tab" class="s-tab" data-el="S-01-B04" data-tab="active" aria-selected="' + (tab === 'active') + '"' + (coldError ? ' disabled' : '') + '>' +
            t('s01.b04', { n: '<span class="num">' + nActive + '</span>' }) + '</button>' +
          '<button type="button" role="tab" class="s-tab" data-el="S-01-B05" data-tab="done" aria-selected="' + (tab === 'done') + '"' + (coldError ? ' disabled' : '') + '>' +
            t('s01.b05', { n: '<span class="num">' + nDone + '</span>' }) + '</button>' +
        '</div>' +
      '</div>';

    if (expired) {
      h += '<div class="s-expired" data-el="S-01-C11" role="status">' +
             '<div class="s-expired__l1">' + t('s01.c11.l1') + '</div>' +
             '<div>' + t('s01.c11.l2') + '</div>' +
             '<button type="button" class="btn" data-el="S-01-B06">' + t('st.signin.continue') + '</button>' +
           '</div>';
    }

    if (B.everOk && B.failed) {
      var dark = now - B.lastOk >= DARK_MS;
      h += '<div class="s-stale' + (dark ? ' s-stale--dark' : '') + '" data-el="S-01-C02" role="status">' +
             t('s01.c02', { d: S.duration(now - B.lastOk, true) }) + '</div>';
    }

    h += '<main class="s-list" data-el="S-01-S03">';
    if (loading) {
      h += '<div class="s-cards" data-el="S-01-C12" aria-hidden="true">' +
             '<div class="s-skel s-skel--card"></div><div class="s-skel s-skel--card"></div>' +
             '<div class="s-skel s-skel--card"></div><div class="s-skel s-skel--card"></div></div>';
    } else if (coldError) {
      h += '<div class="s-empty">' +
             '<div data-el="S-01-C13">' +
               '<p class="s-empty__l1">' + t('s01.c13.l1') + '</p>' +
               '<p class="s-empty__l2" style="margin-block-start:8px">' + t('s01.c13.l2') + '</p>' +
               '<p class="s-empty__l3" style="margin-block-start:8px">' + t('s01.c13.l3') + '</p>' +
             '</div>' +
             '<button type="button" class="btn btn--ghost" data-el="S-01-B07">' + t('s01.b07') + '</button>' +
           '</div>';
    } else if (tab === 'active') {
      var any = false;
      for (var gi = 0; gi < ACTIVE.length; gi++) {
        var st = ACTIVE[gi], cards = lists.groups[st];
        if (!cards.length) continue;                          /* §5.3: empty group renders nothing */
        any = true;
        h += '<section class="s-group" data-group="' + st + '">' +
               '<h2 class="s-group__title" data-el="S-01-C03">' +
                 t('s01.c03', { label: t('st.status.' + st), n: '<span class="num">' + cards.length + '</span>' }) + '</h2>' +
               '<div class="s-cards">';
        for (var ci = 0; ci < cards.length; ci++) h += card(cards[ci], false, now);
        h += '</div></section>';
      }
      if (!any) {
        h += '<div class="s-empty" data-el="S-01-C09">' +
               '<p class="s-empty__l1">' + t('s01.c09.l1') + '</p>' +
               '<p class="s-empty__l2">' + t('s01.c09.l2') + '</p>' +
               (Chime.soundOn() ? '' : '<p class="s-empty__l3">' + t('s01.c09.l3') + '</p>') +
             '</div>';
      }
    } else {
      if (!lists.done.length) {
        h += '<div class="s-empty" data-el="S-01-C10">' +
               '<p class="s-empty__l1">' + t('s01.c10.l1') + '</p>' +
               '<p class="s-empty__l2">' + t('s01.c10.l2') + '</p>' +
             '</div>';
      } else {
        h += '<div class="s-cards">';
        for (var di = 0; di < lists.done.length; di++) h += card(lists.done[di], true, now);
        h += '</div>';
      }
    }
    h += '</main></div>';

    var root = App.paint(h);
    bind(root);
  }

  function debounced() {
    var now = Date.now();
    if (now - B.tapAt < 300) return false;
    B.tapAt = now;
    return true;
  }

  function bind(root) {
    root.querySelector('[data-el="S-01-B01"]').addEventListener('click', function () {
      if (!debounced()) return;
      S.Lang.toggle();
    });
    root.querySelector('[data-el="S-01-B02"]').addEventListener('click', function () {
      if (!debounced()) return;
      var st = Chime.state();
      if (st === 'on') {
        Chime.setSound(false);
      } else {
        /* Turning it on — or re-enabling a refused one — plays one chime. */
        Chime.setSound(true);
        Chime.refused = false;
        Chime.arm(true);
        Chime.play();
      }
      draw();
    });
    var b03 = root.querySelector('[data-el="S-01-B03"]');
    if (b03) b03.addEventListener('click', function () {
      if (!debounced()) return;
      App.state.returnTarget = null;
      Session.end();                                   /* no confirmation (map §4 decision 3) */
      App.replace('/sign-in', {});
    });
    var b06 = root.querySelector('[data-el="S-01-B06"]');
    if (b06) b06.addEventListener('click', function () {
      if (!debounced()) return;
      App.state.scroll = window.scrollY;
      App.signIn({ view: 'S-01' });
    });
    var b07 = root.querySelector('[data-el="S-01-B07"]');
    if (b07) b07.addEventListener('click', function () {
      if (!debounced()) return;
      B.retrying = true;
      draw();
      if (B.inFlight) { B.gen++; B.inFlight = false; }
      request();
    });
    var tabs = root.querySelectorAll('.s-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function (e) {
        if (!debounced()) return;
        App.state.tab = e.currentTarget.getAttribute('data-tab');
        draw();                                          /* no request (§5.5 rule 4) */
        window.scrollTo(0, 0);
      });
    }
    var cards = root.querySelectorAll('[data-el="S-01-C04"]');
    for (var c = 0; c < cards.length; c++) {
      cards[c].addEventListener('click', function (e) {
        if (!debounced()) return;
        var no = e.currentTarget.getAttribute('data-order');
        App.state.scroll = window.scrollY;
        App.go('/order/' + encodeURIComponent(no), { fromBoard: true, order: findOrder(no) });
      });
    }
  }

  function findOrder(no) {
    var list = B.orders || [];
    for (var i = 0; i < list.length; i++) if (String(list[i].orderNo) === String(no)) return list[i];
    return null;
  }

  /* Touch tracking for the "never under a finger" rule. */
  function touchStart(e) {
    if (!B.mounted) return;
    if (e.target && e.target.closest && e.target.closest('.s-list')) B.touching = true;
  }
  function touchEnd() {
    if (!B.touching) return;
    B.touching = false;
    /* After the click that the touch may produce, so the tapped card is
       still there to receive it. */
    setTimeout(function () { if (B.mounted && B.dirty && !B.touching) draw(); }, 60);
  }
  document.addEventListener('pointerdown', touchStart, true);
  document.addEventListener('pointerup', touchEnd, true);
  document.addEventListener('pointercancel', touchEnd, true);

  /* ------------------------------------------------------------------ *
   * View contract
   * ------------------------------------------------------------------ */
  Views['S-01'] = {
    enter: function (params, ctx) {
      B.mounted = true;
      B.touching = false;
      if (ctx.freshBoard) {
        resetData();
        App.state.tab = 'active';
        App.state.scroll = 0;
      }
      if (ctx.newBaseline) Alert.resetBaseline();
      draw();
      window.scrollTo(0, ctx.freshBoard ? 0 : App.state.scroll);
      request();                                       /* one immediate request */
    },

    leave: function () {
      App.state.scroll = window.scrollY;
      B.mounted = false;
      B.gen++;
      B.inFlight = false;
      B.again = false;
      clearTimeout(B.timer);
    },

    draw: draw,

    onData: function () {
      if (!document.hidden) request();
    },

    onVisibility: function (visible) {
      if (!visible) return;
      Alert.resetBaseline();                           /* §5.6 rule 3 */
      B.hiddenPending = false;
      request();
    },

    tick: function (now) {
      if (!B.mounted) return;
      if (B.everOk && B.orders) Alert.tick(newList(B.orders), now);   /* §5.6 rule 4 */
      var sess = Session.current();
      var expired = !sess || Session.expired(sess);
      if (expired !== B.expiredShown) { paint(); return; }
      if (now - B.lastPaint >= 30000) paint();        /* durations, Late, C02 */
    }
  };
})();
