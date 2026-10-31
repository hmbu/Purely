// Presenting extras: a small dock of buttons that shows itself when the pointer moves and hides again (edit, all
// slides, presenter window), the slide overview to jump anywhere, the presenter window (current slide, its notes,
// what comes next, the time), and a short notice line. Everything here is driven by the show through callbacks.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stopAll = el => ['click', 'pointerdown', 'pointerup', 'mousedown', 'touchstart', 'touchend', 'wheel'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation()));

/* ---------------------------------------------------------------- notice */
let toastEl = null, toastT = 0;
export function toast(text, ms = 3200) {
  toastEl ||= Object.assign(document.createElement('div'), { className: 'x-toast' });
  if (!toastEl.isConnected) document.body.append(toastEl);
  toastEl.textContent = text; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms);
}

/* ---------------------------------------------------------------- the dock */
export function createDock({ onEdit, onOverview, onPresenter, isEditing }) {
  const dock = document.createElement('div');
  dock.className = 'x-dock';
  dock.innerHTML = `<button data-a="edit" title="تحرير النصوص (E)"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.5 6.5l4 4" stroke="currentColor" stroke-width="1.8"/></svg></button>
    <button data-a="overview" title="كل الشرائح (G)"><svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
    <button data-a="presenter" title="نافذة المقدّم (W)"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 20h8M12 16v4" stroke="currentColor" stroke-width="1.8"/></svg></button>`;
  document.body.append(dock); stopAll(dock);
  dock.addEventListener('click', e => { const a = e.target.closest('button')?.dataset.a; if (a === 'edit') onEdit(); else if (a === 'overview') onOverview(); else if (a === 'presenter') onPresenter(); });
  // shown while the pointer moves (or rests on it), and always while editing; hidden after a moment of stillness
  let t = 0;
  const wake = () => { dock.classList.add('on'); clearTimeout(t); t = setTimeout(() => { if (!dock.matches(':hover') && !isEditing()) dock.classList.remove('on'); }, 2600); };
  addEventListener('pointermove', wake, { passive: true }); addEventListener('touchstart', wake, { passive: true });
  return { refresh: () => { dock.classList.toggle('is-editing', isEditing()); if (isEditing()) dock.classList.add('on'); else wake(); } };
}

/* ---------------------------------------------------------------- slide overview */
// groups: [{ title, items: [{ label, sub, image, current, go }] }]
export function createOverview({ model, asset }) {
  let el = null;
  const close = () => { if (!el) return; el.classList.remove('on'); const e = el; el = null; setTimeout(() => e.remove(), 300); removeEventListener('keydown', onKey, true); };
  const onKey = e => {
    if (e.key === 'Escape' || e.code === 'KeyG') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.target.closest?.('input')) return;
    e.stopPropagation(); // the show does not move under the overview
  };
  function open() {
    if (el) return close();
    const groups = model();
    el = document.createElement('div'); el.className = 'x-ov';
    el.innerHTML = `<div class="x-ov-head"><b>كل الشرائح</b><input type="search" placeholder="بحث…" aria-label="بحث"><button class="x-ov-x" title="إغلاق (Esc)">×</button></div>
      <div class="x-ov-body">${groups.map((g, gi) => `<section><h3>${esc(g.title)}</h3><div class="x-ov-grid">${g.items.map((it, ii) => `
        <button class="x-ov-card${it.current ? ' is-current' : ''}" data-g="${gi}" data-i="${ii}" data-q="${esc(`${g.title} ${it.label} ${it.sub || ''}`.toLowerCase())}">
          <span class="x-ov-img">${it.image ? `<img src="${esc(asset(it.image))}" alt="" loading="lazy">` : `<i>${esc(it.icon || '')}</i>`}</span>
          <span class="x-ov-n latin">${esc(it.n || '')}</span><span class="x-ov-l">${esc(it.label)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}
        </button>`).join('')}</div></section>`).join('')}</div>`;
    document.body.append(el); stopAll(el);
    requestAnimationFrame(() => { el?.classList.add('on'); el?.querySelector('.is-current')?.scrollIntoView({ block: 'center' }); });
    el.addEventListener('click', e => {
      if (e.target.closest('.x-ov-x') || e.target === el) return close();
      const c = e.target.closest('.x-ov-card'); if (!c) return;
      const it = groups[+c.dataset.g].items[+c.dataset.i]; close(); it.go();
    });
    const q = el.querySelector('input');
    q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); el.querySelectorAll('.x-ov-card').forEach(c => { c.hidden = !!v && !c.dataset.q.includes(v); }); el.querySelectorAll('section').forEach(s => { s.hidden = ![...s.querySelectorAll('.x-ov-card')].some(c => !c.hidden); }); });
    addEventListener('keydown', onKey, true);
  }
  return { open, close, get on() { return !!el; } };
}

/* ---------------------------------------------------------------- presenter window */
// A second window (move it to the laptop screen): the live slide as it is now, the presenter's notes, what comes next,
// the time since the start and the clock, and the controls. Its keys drive the show as the show's own keys do.
export function createPresenter({ snapshot, info, command, key }) {
  let win = null, timer = 0, snapT = 0;
  const alive = () => win && !win.closed;
  function open() {
    if (alive()) { win.focus(); return; }
    win = window.open('', 'bxl-presenter', 'popup,width=1240,height=760');
    if (!win) return toast('المتصفح منع فتح نافذة المقدّم — اسمح بالنوافذ المنبثقة لهذا الملف');
    const d = win.document;
    d.open(); d.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>نافذة المقدّم · Bundle × Lavara</title>
      <style>${PRESENTER_CSS}</style></head><body>
      <header><div class="where"></div><div class="times"><b class="elapsed latin">00:00</b><button class="reset" title="تصفير">↺</button><span class="clock latin"></span></div></header>
      <main>
        <section class="now"><h2>الآن</h2><div class="frame"><div class="mirror"></div></div><div class="title"></div></section>
        <aside><section class="notes"><h2>ملاحظات</h2><div class="txt"></div></section>
          <section class="next"><h2>التالي</h2><div class="nimg"></div><div class="nlabel"></div></section></aside>
      </main>
      <footer><button data-c="prev">‹ السابق</button><button data-c="overview">كل الشرائح</button><button data-c="black">شاشة سوداء</button><button data-c="next" class="main">التالي ›</button></footer>
      </body></html>`);
    d.close();
    // the show's own look, for the live picture of the slide
    document.querySelectorAll('head style, head link[rel="stylesheet"]').forEach(n => {
      const c = n.cloneNode(true); if (c.href) c.href = n.href; d.head.append(c);
    });
    d.head.append(Object.assign(d.createElement('style'), { textContent: PRESENTER_CSS })); // after the show's styles
    d.addEventListener('click', e => { const c = e.target.closest('[data-c]')?.dataset.c; if (c) command(c); if (e.target.closest('.reset')) command('resetTimer'); });
    d.addEventListener('keydown', e => key(e));
    win.addEventListener('resize', () => fitMirror());
    clearInterval(timer); timer = setInterval(tick, 500);
    update();
  }
  function fitMirror() {
    if (!alive()) return; const d = win.document, f = d.querySelector('.frame'); if (!f) return;
    d.documentElement.style.fontSize = `${f.clientWidth / 160}px`; // the slide is drawn on 160 × 90 rem
  }
  function tick() {
    if (!alive()) { clearInterval(timer); return; }
    const i = info(), d = win.document, ms = Date.now() - (i.startedAt || Date.now()), s = Math.floor(ms / 1000);
    d.querySelector('.elapsed').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    d.querySelector('.clock').textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  function update() {
    if (!alive()) return;
    const i = info(), d = win.document;
    d.querySelector('.where').innerHTML = `${i.project ? `<b>${esc(i.project)}</b>` : ''}${i.section ? `<span>${esc(i.section)}</span>` : ''}${i.pos ? `<span class="latin">${esc(i.pos)}</span>` : ''}`;
    d.querySelector('.title').textContent = i.title || '';
    d.querySelector('.notes .txt').textContent = i.notes || 'لا ملاحظات لهذه الشريحة';
    d.querySelector('.notes').classList.toggle('empty', !i.notes);
    d.querySelector('.nlabel').innerHTML = `${esc(i.next?.label || '—')}${i.next?.section ? `<small>${esc(i.next.section)}</small>` : ''}`;
    d.querySelector('.nimg').innerHTML = i.next?.image ? `<img src="${esc(i.next.image)}" alt="">` : '';
    d.querySelector('[data-c="black"]').classList.toggle('on', !!i.black);
    tick();
    // the live picture is taken once the slide has settled
    clearTimeout(snapT); snapT = setTimeout(() => { if (!alive()) return; const m = d.querySelector('.mirror'); m.replaceChildren(); const s = snapshot(); if (s) m.append(d.importNode(s, true)); fitMirror(); }, 1300);
  }
  return { open, update, get on() { return alive(); } };
}

const PRESENTER_CSS = `
html, body { margin: 0; height: 100%; }
body { background: #15130F; color: #EEE8DD; font: 15px/1.5 system-ui, "Segoe UI", Tahoma, sans-serif; display: grid; grid-template-rows: auto 1fr auto; place-items: stretch; overflow: hidden; }
.latin { font-variant-numeric: tabular-nums; }
header, footer { display: flex; align-items: center; gap: 16px; padding: 12px 18px; background: #1E1B16; }
header .where { display: flex; gap: 14px; align-items: baseline; flex: 1; min-width: 0; font-size: 15px; opacity: .9; }
header .where span { opacity: .65; }
header .times { display: flex; align-items: center; gap: 12px; }
header .elapsed { font-size: 26px; font-weight: 600; letter-spacing: .02em; }
header .clock { opacity: .6; }
header .reset { all: unset; cursor: pointer; opacity: .6; padding: 0 6px; font-size: 18px; }
main { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); align-items: start; gap: 16px; padding: 16px 18px; min-height: 0; }
h2 { margin: 0 0 8px; font-size: 12px; font-weight: 600; letter-spacing: .04em; opacity: .55; }
.now { display: flex; flex-direction: column; min-width: 0; }
.frame { position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: #000; border-radius: 6px; box-shadow: 0 0 0 1px #3A352D; }
.mirror { position: absolute; inset: 0; width: 160rem; height: 90rem; pointer-events: none; }
.mirror > * { position: absolute !important; inset: 0 !important; width: 160rem !important; height: 90rem !important; transform: none !important; opacity: 1 !important; visibility: visible !important; }
.mirror [data-a] { opacity: 1 !important; }
.now .title { margin-top: 10px; font-size: 18px; font-weight: 600; }
aside { display: grid; grid-template-rows: 1fr auto; gap: 16px; min-height: 0; }
.notes { background: #1E1B16; border-radius: 6px; padding: 14px 16px; overflow: auto; }
.notes .txt { font-size: 19px; line-height: 1.7; white-space: pre-wrap; }
.notes.empty .txt { opacity: .4; font-size: 15px; }
.next { background: #1E1B16; border-radius: 6px; padding: 14px 16px; }
.next .nimg img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 4px; display: block; margin-bottom: 8px; }
.next .nlabel { font-size: 17px; font-weight: 600; }
.next .nlabel small { display: block; font-weight: 400; opacity: .6; font-size: 13px; }
footer { justify-content: center; }
footer button { all: unset; cursor: pointer; padding: 10px 20px; border-radius: 6px; background: #2B2720; font-size: 15px; }
footer button.main { background: #B08A4E; color: #15130F; font-weight: 600; padding-inline: 34px; }
footer button.on { background: #EEE8DD; color: #15130F; }
footer button:hover { filter: brightness(1.15); }
`;
