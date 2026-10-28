// Bundle × Lavara — the show.
// One giant canvas navigated by a camera: Universe (L0) → Project hub (L1) → Section (L2, slides advance horizontally).
// Everything is driven by content.json; nothing about projects/sections/slides is hard-coded.
import { $, $$, esc, escBr, clamp, fmtClock, prefersReducedMotion, grainTexture, rgba, fixAspects, isDark } from './core/util.js';
import { projectsOf, sectionsOf, slidesOf, findProject, findSection, slideTheme, locate, isShared, sharedOf } from './core/model.js';
import { loadContent, logDecision } from './core/store.js';
import { createEditor, edAttr } from './core/editor.js';
import { initZoom } from './core/zoom.js';
import { createSync } from './core/sync.js';
import { registerFonts, applyTypography, fontsReady } from './core/fonts.js';
import { BrandTexture } from './core/texture.js';
import { TEMPLATES, slideLabel, slideMedia, mediaHTML } from './core/templates.js';

const gsap = window.gsap;
gsap.config({ nullTargetWarn: false });
const QS = new URLSearchParams(location.search);
const PREVIEW = QS.has('preview');

const stage = $('#stage');
const L = { universe: $('#L-universe'), hub: $('#L-hub'), section: $('#L-section'), special: $('#L-special') };
const slidesHost = $('#L-section .slides');
const coverEl = $('#cover'), logosEl = $('#logos'), blackEl = $('#black');
// Universe ↔ project morph: a brand-colour plate that grows from the chosen world to the full screen.
// Moved by transforms only (composited), so it stays smooth at 4K.
const morphEl = Object.assign(document.createElement('div'), { id: 'morph' }); L.hub.before(morphEl);
const hud = { root: $('#hud'), crumb: $('#hud .crumb'), bar: $('#hud .bar i'), clock: $('#hud .clock') };

// Transition sounds are removed (user decision): only video audio remains. This stub keeps the call sites inert.
const sound = { cfg: { muted: false }, ready: false, play() {}, configure() {},
  unlock() { if (!this.cfg.muted) $$('video.m').forEach(v => { if (v.dataset.muted === 'false' && v.muted) { v.muted = false; if (v.paused && v.dataset.autoplay !== 'false') v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }); } }); }, setMuted(m) { this.cfg.muted = m; $$('video').forEach(v => { v.muted = m || v.dataset.muted === 'true'; }); } };
let veil = null;
let editor = { toggle() {}, refresh() {} }; // text editing on the show (key E), created after load
const worldTex = [];

const S = {
  content: null,
  level: 'boot', pid: null, sid: null, li: 0, step: 0,
  slideEl: null, slideTpl: null, slide: null,
  visitedProjects: new Set(), lastSection: {}, seenSections: {},
  hubTarget: 0, hubPending: null, // the station the light rests on, and the section waiting for the presenter's press
  busy: false, queue: [],
  black: false, startedAt: Date.now(),
  decision: { selections: {}, timerOn: false, timerStart: 0 },
  focus: -1,
};
try { const d = JSON.parse(localStorage.getItem('bxl-decisions') || 'null'); if (d) S.decision.selections = d; } catch {}

const project = () => findProject(S.content, S.pid);
const section = () => findSection(project(), S.sid);
const settings = () => S.content.settings || {};
const reduced = () => { const r = settings().motion?.reduced; return r === 'on' || (r !== 'off' && prefersReducedMotion()); };
const asset = p => (p ? new URL(p, location.href).href : ''); // absolute: url() inside CSS variables resolves against the stylesheet otherwise
const ctxFor = p => ({ brand: p?.brand || {}, project: p, asset });
const pxs = n => (stage.clientWidth / 3840) * n; // design px at 4K → current px

/* ======================================================================= layout */
function fit() {
  const vw = innerWidth, vh = innerHeight;
  let w = vw, h = vw * 9 / 16; if (h > vh) { h = vh; w = vh * 16 / 9; }
  stage.style.width = w + 'px'; stage.style.height = h + 'px';
  document.documentElement.style.fontSize = (w / 160) + 'px';
}
addEventListener('resize', () => { fit(); placeLogos(S.level === 'universe' ? 'hero' : 'corner', false); if (S.slideEl && S.slideTpl?.layout) { S.slideTpl.layout(S.slideEl, S.slide?.data || {}); S.slideTpl.applyStep?.(S.slideEl, S.step || 0, true); } });

/* ======================================================================= brand / theme */
function universeColors() {
  const u = settings().universe || {};
  return { bg: u.background || '#15120F', fg: u.text || '#F3EFE6' };
}
function applyBrand(p, animate = true) {
  const st = stage.style;
  if (!p) {
    const u = universeColors();
    stage.dataset.brand = 'universe'; stage.dataset.style = 'neutral';
    st.setProperty('--b-fg', u.fg); st.setProperty('--b-on', u.bg);
    applyTypography(stage, S.content, null);
    gsap.to(stage, { backgroundColor: u.bg, duration: animate ? 1.2 : 0, ease: 'power2.inOut' });
    return;
  }
  const c = p.brand.colors || {};
  stage.dataset.brand = p.id; stage.dataset.style = p.brand.texture === 'mist' ? 'mist' : 'bubbles';
  const vars = { primary: c.primary, secondary: c.secondary, accent: c.accent, bg: c.background, surface: c.surface, dark: c.dark, text: c.text, title: c.title || c.text, light: c.textLight };
  for (const [k, v] of Object.entries(vars)) if (v) st.setProperty(`--b-${k}`, v);
  const tc = p.brand.textureColors || [];
  tc.forEach((v, i) => st.setProperty(`--b-t${i}`, v));
  st.setProperty('--b-fg', isDarkHex(c.primary || '#222') ? (c.textLight || '#fff') : (c.text || '#111')); st.setProperty('--b-on', c.primary || '#111');
  applyTypography(stage, S.content, p);
  gsap.to(stage, { backgroundColor: c.primary || c.background, duration: animate ? 0.6 : 0, ease: 'power2.inOut' });
}

/* ======================================================================= header logos */
function renderLogos() {
  const h = settings().headerLogos || {};
  const items = (h.items || []).filter(i => i.show !== false && i.src);
  logosEl.innerHTML = items.map(i => {
    const sc = i.scale || 1;
    if (i.tint !== false) return `<span class="hl hl-tint" data-ar-src="${esc(asset(i.src))}" style="--src:url('${esc(asset(i.src))}');--sc:${sc}" title="${esc(i.label || '')}"></span>`;
    return `<span class="hl hl-img" style="--sc:${sc}"><img class="on-light" src="${esc(asset(i.src))}" alt=""><img class="on-dark" src="${esc(asset(i.srcDark || i.src))}" alt=""></span>`;
  }).join('<span class="hl-sep"></span>');
  logosEl.style.setProperty('--hl-size', h.size || 1);
  logosEl.style.setProperty('--hl-gap', (h.gap ?? 2) + 'rem');
  logosEl.style.setProperty('--hl-hero', settings().universe?.logosSize || 1);
  logosEl.dataset.corner = h.corner || 'top-left';
  logosEl.hidden = h.show === false || !items.length;
  // Equal slots on both sides of the separator so the divider sits exactly on the centre line.
  fixAspects(logosEl).then(() => {
    const ars = $$('.hl', logosEl).map(el => (parseFloat(el.style.getPropertyValue('--ar')) || 4) * (parseFloat(el.style.getPropertyValue('--sc')) || 1));
    if (ars.length) logosEl.style.setProperty('--slot-ar', Math.max(...ars));
  });
}
function placeLogos(mode, animate = true) {
  if (logosEl.dataset.mode === mode && !animate) return;
  const first = logosEl.getBoundingClientRect();
  logosEl.dataset.mode = mode;
  if (!animate || first.width === 0) return;
  const last = logosEl.getBoundingClientRect();
  if (!last.width) return;
  gsap.fromTo(logosEl, {
    x: first.left - last.left, y: first.top - last.top, scale: first.width / last.width, transformOrigin: '0 0',
  }, { x: 0, y: 0, scale: 1, duration: 1.4, ease: 'power3.inOut', clearProps: 'transform' });
}
const hubFg = p => { const c = p?.brand?.colors || {}; return isDarkHex(c.primary || '#222') ? (c.textLight || '#fff') : (c.text || '#111'); };
const hubDark = p => isDarkHex(p?.brand?.colors?.primary || '#222');
function logosColor(fg, dark) {
  const h = settings().headerLogos || {};
  logosEl.style.color = h.autoContrast === false ? (h.color || fg) : fg;
  logosEl.classList.toggle('is-dark', !!dark);
}

/* ======================================================================= HUD */
function updateHUD() {
  const h = settings().hud || {};
  const p = project(), s = section();
  const inProject = ['hub', 'section'].includes(S.level) && p;
  hud.root.classList.toggle('show-crumb', !!h.breadcrumb && S.level === 'section' && !!p);
  stage.classList.toggle('no-eyebrow', settings().eyebrows === false);
  hud.root.classList.toggle('show-bar', !!h.progress && !!inProject);
  hud.root.classList.toggle('show-clock', !!h.timer);
  if (inProject) {
    const secs = sectionsOf(p);
    if (S.level === 'section' && s) {
      const n = slidesOf(s).length;
      // only the project's logo, the section and the page number
      const mark = p.brand.logo ? `<span class="logo-mask cr-logo" style="--src:url('${esc(asset(p.brand.logo))}')"></span>` : `<b>${esc(p.nameAr || p.name)}</b>`;
      hud.crumb.innerHTML = `${mark}<i></i><span>${esc(s.title)}</span><i></i><span class="latin">${S.li + 1}/${n}</span>`;
    } else hud.crumb.innerHTML = '';
    // progress across this project's slides
    let total = 0, done = 0;
    secs.forEach(sec => { const n = slidesOf(sec).length; if (sec.id === S.sid && S.level === 'section') done = total + S.li + 1; total += n; });
    hud.bar.style.transform = `scaleX(${total ? done / total : 0})`;
  }
  if (S.slideEl) hud.root.classList.toggle('is-dark', S.slideEl.classList.contains('is-dark'));
  else hud.root.classList.toggle('is-dark', true);
}
setInterval(() => {
  hud.clock.textContent = fmtClock(Date.now() - S.startedAt);
  const dt = $('.d-timer', L.special);
  if (dt && S.decision.timerOn) dt.textContent = fmtClock(Date.now() - S.decision.timerStart);
}, 500);

/* ======================================================================= media preload */
const imgCache = new Map(), vidPool = new Map();
function preloadMedia(list) {
  for (const src of list) {
    const url = asset(src);
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) {
      if (vidPool.has(url)) continue;
      const v = document.createElement('video'); v.preload = 'auto'; v.muted = true; v.playsInline = true; v.src = url; v.load();
      vidPool.set(url, v);
      if (vidPool.size > 8) { for (const [k, el] of vidPool) { if (!el.isConnected) { vidPool.delete(k); el.removeAttribute('src'); el.load(); break; } } }
    } else if (!imgCache.has(url)) {
      const i = new Image(); i.decoding = 'async'; i.src = url; i.decode?.().catch(() => {}); imgCache.set(url, i);
      if (imgCache.size > 60) imgCache.delete(imgCache.keys().next().value);
    }
  }
}
function preloadAround() {
  const p = project(); if (!p) return;
  const secs = sectionsOf(p); const si = secs.findIndex(s => s.id === S.sid);
  const list = [];
  const s = secs[si]; if (s) slidesOf(s).slice(S.li + 1, S.li + 3).forEach(sl => list.push(...slideMedia(sl)));
  const nx = secs[si + 1]; if (nx) slidesOf(nx).slice(0, 1).forEach(sl => list.push(...slideMedia(sl)));
  preloadMedia(list);
}
function adoptVideos(el) {
  $$('video.m', el).forEach(v => {
    const pooled = vidPool.get(v.getAttribute('src'));
    if (pooled && !pooled.isConnected) {
      pooled.className = v.className; pooled.setAttribute('style', v.getAttribute('style') || '');
      pooled.loop = v.hasAttribute('loop'); pooled.muted = v.hasAttribute('muted');
      for (const k of ['autoplay', 'muted']) pooled.dataset[k] = v.dataset[k];
      if (v.poster) pooled.poster = v.poster;
      pooled.currentTime = 0; v.replaceWith(pooled);
    }
  });
}

/* ======================================================================= slides */
function buildSlide(p, slide) {
  const tpl = TEMPLATES[slide.template] || TEMPLATES.title;
  const theme = slideTheme(p, slide, tpl);
  const c = p.brand.colors || {};
  const el = document.createElement('div');
  el.className = `slide tpl-${slide.template} ${theme.dark ? 'is-dark' : 'is-light'} bg-${theme.key}`;
  el.dataset.slideId = slide.id;
  el.style.setProperty('--sbg', theme.bg);
  el.style.setProperty('--sfg', theme.fg);
  el.style.setProperty('--stitle', theme.dark ? (c.textLight || '#fff') : (c.title || c.text));
  el.style.setProperty('--saccent', theme.dark ? (c.secondary || c.textLight) : (c.primary || c.text));
  el.style.setProperty('--ssec', c.secondary || c.primary || c.text); // the brand's second colour, for charts and status marks
  el.style.setProperty('--ssurf', c.surface || theme.bg);
  el.style.setProperty('--sline', rgba(theme.fg, 0.28));
  let inner = '';
  try { inner = tpl.render(slide.data || {}, ctxFor(p)); } catch (e) { inner = `<div class="t"><p class="tx-body">Template error: ${esc(e.message)}</p></div>`; }
  el.innerHTML = `<div class="slide-bg" data-a="bg"></div>${inner}`;
  return { el, tpl, theme };
}
function mountSlide(el, tpl, slide) {
  el._cleanup = [];
  adoptVideos(el);
  const vs = settings().video || {};
  $$('video.m', el).forEach(v => {
    if (vs.autoplay !== false && v.dataset.autoplay !== 'false') {
      const tryPlay = () => v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
      v.readyState >= 2 ? tryPlay() : v.addEventListener('canplay', tryPlay, { once: true });
    }
  });
  $$('[data-cycle]', el).forEach(box => {
    const items = $$('.cyc', box); if (items.length < 2) return;
    let i = 0; const ms = (parseFloat(box.dataset.cycle) || 3.5) * 1000;
    const t = setInterval(() => {
      const a = items[i]; i = (i + 1) % items.length; const b = items[i];
      gsap.to(a, { opacity: 0, duration: 0.8, ease: 'power2.inOut', onComplete: () => a.classList.remove('on') });
      b.classList.add('on'); gsap.fromTo(b, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power2.inOut' });
    }, ms);
    el._cleanup.push(() => clearInterval(t));
  });
  $$('.concept', el).forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); focusConcept(+btn.dataset.focus); }));
  if (tpl.steps) applyStep(el, S.step, true);
  S.focus = -1;
}
function unmountSlide(el) {
  if (!el) return;
  (el._cleanup || []).forEach(f => f());
  if (settings().video?.pauseOnLeave !== false) $$('video', el).forEach(v => v.pause());
}
function focusConcept(i) {
  const box = S.slideEl && $('.concepts', S.slideEl); if (!box) return false;
  const items = $$('.concept', box);
  if (i < 0 || i >= items.length || S.focus === i) { S.focus = -1; box.classList.remove('has-focus'); items.forEach(x => x.classList.remove('is-focus')); }
  else { S.focus = i; box.classList.add('has-focus'); items.forEach((x, k) => x.classList.toggle('is-focus', k === i)); }
  sound.play('ui', S.pid);
  broadcastState();
  return true;
}
function stepsOf(tpl, slide) { return tpl?.steps ? tpl.steps(slide?.data || {}) : 0; }
function applyStep(el, step, instant = false) {
  if (S.slideTpl?.applyStep) return S.slideTpl.applyStep(el, step, instant);
  const nodes = $$('.j-node', el), stages = $$('.j-stage', el);
  nodes.forEach((n, i) => { n.classList.toggle('done', i < step); n.classList.toggle('on', i === step); });
  const fill = $('.j-fill', el);
  if (fill) gsap.to(fill, { scaleX: nodes.length > 1 ? step / (nodes.length - 1) : 1, duration: instant ? 0 : 1.1, ease: 'expo.out' });
  stages.forEach((s, i) => {
    const on = i === step;
    s.classList.toggle('on', on);
    if (instant) gsap.set(s, { opacity: on ? 1 : 0, x: 0 });
    else if (on) gsap.fromTo(s, { opacity: 0, x: -pxs(60) }, { opacity: 1, x: 0, duration: 1.1, ease: 'expo.out', delay: 0.15 });
    else gsap.to(s, { opacity: 0, x: pxs(40), duration: 0.45, ease: 'power2.in' });
  });
}

// Wait (briefly) until the slide's images are decoded so the first frames of a transition don't stutter.
function decodeIn(el, ms = 700) {
  const imgs = $$('img', el).map(i => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()));
  return Promise.race([Promise.all(imgs), new Promise(r => setTimeout(r, ms))]);
}

/* ---------- Layered Drift building blocks */
// Bundle's own motion (its gift catalogue): things rise into place on a soft cubic-bezier(.2,.7,.2,1), one after another
const bez = (x1, y1, x2, y2) => t => { // CSS cubic-bezier as a GSAP ease
  let u = t; for (let i = 0; i < 8; i++) { const x = 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3 - t; const dx = 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u; if (Math.abs(dx) < 1e-6) break; u = Math.min(1, Math.max(0, u - x / dx)); }
  return 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
};
const RISE = bez(0.2, 0.7, 0.2, 1);
const risesIn = () => stage.dataset.brand === 'bundle';
function introTL(el, dir = 1, kind = 'drift') {
  const tl = gsap.timeline();
  const q = s => $$(s, el);
  if (risesIn() && kind !== 'fade') return riseTL(el, tl, q);
  const X = -dir * pxs(56); // next enters from the LEFT (RTL)
  const sx = kind === 'drift' ? X : 0;
  const bg = q('.slide-bg'), bgx = q('[data-a="bg"]:not(.slide-bg)'), media = q('[data-a="media"]');
  const extra = q('[data-a="extra"]').sort((a, b) => (+a.dataset.seq || 0) - (+b.dataset.seq || 0));
  tl.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0);
  tl.fromTo(bgx, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' }, 0.05);
  tl.fromTo(media, { opacity: 0, x: sx }, { opacity: 1, x: 0, duration: 1.3, ease: 'expo.out' }, 0.1);
  tl.fromTo(q('[data-a="media"] .m, [data-a="media"] .ph'), { scale: 1.04 }, { scale: 1, duration: 2.2, ease: 'power2.out' }, 0.1);
  tl.fromTo(q('[data-a="eyebrow"]'), { opacity: 0, x: sx }, { opacity: 1, x: 0, duration: 1.1, ease: 'expo.out' }, 0.2);
  tl.fromTo(q('[data-a="title"]'), { opacity: 0, x: sx }, { opacity: 1, x: 0, duration: 1.1, ease: 'expo.out' }, 0.3);
  tl.fromTo(q('[data-a="body"]'), { opacity: 0, x: sx }, { opacity: 1, x: 0, duration: 1.1, ease: 'expo.out' }, 0.4);
  if (extra.length) tl.fromTo(extra, { opacity: 0, x: sx * 0.6, y: pxs(14) }, { opacity: 1, x: 0, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09 }, 0.45);
  return tl;
}
function riseTL(el, tl, q) {
  const extra = q('[data-a="extra"]').sort((a, b) => (+a.dataset.seq || 0) - (+b.dataset.seq || 0));
  const Y = pxs(60);
  tl.fromTo(q('.slide-bg'), { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0);
  tl.fromTo(q('[data-a="bg"]:not(.slide-bg)'), { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' }, 0.05);
  tl.fromTo(q('[data-a="media"]'), { opacity: 0, y: Y }, { opacity: 1, y: 0, duration: 0.95, ease: RISE }, 0.1);
  tl.fromTo(q('[data-a="eyebrow"], [data-a="title"], [data-a="body"]'), { opacity: 0, y: Y }, { opacity: 1, y: 0, duration: 0.85, ease: RISE, stagger: 0.09 }, 0.12);
  if (extra.length) tl.fromTo(extra, { opacity: 0, y: Y * 1.4 }, { opacity: 1, y: 0, duration: 0.85, ease: RISE, stagger: 0.09 }, 0.3);
  tl.fromTo(q('[data-a] .m, [data-a] .ph'), { scale: 1.06 }, { scale: 1, duration: 1.6, ease: RISE }, 0.3);
  const grow = q('[data-grow]');
  if (grow.length) tl.fromTo(grow, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 1.1, ease: RISE, stagger: 0.09 }, 0.45);
  return tl;
}
// two product pages in a row: the group pills stay where they are and the highlight slides to the next group
function tabsSwap(old, el) {
  const a = $('.sc-tabs', old), b = $('.sc-tabs', el); if (!a || !b) return null;
  const from = $('.sc-tab.on', a), to = $('.sc-tab.on', b); if (!from || !to) return null;
  const tl = gsap.timeline();
  b.removeAttribute('data-a'); gsap.set(b, { opacity: 1 }); gsap.set(a, { opacity: 0 }); // same place: the new pills simply take over
  to.classList.remove('on');
  const slider = document.createElement('i'); slider.className = 'sc-slider';
  b.append(slider); // above the pills, under their words
  gsap.set(slider, { left: from.offsetLeft, width: from.offsetWidth });
  tl.to($$('.sc-item', old), { opacity: 0, y: -pxs(30), duration: 0.4, ease: 'power2.in', stagger: 0.05 }, 0);
  tl.to(slider, { left: to.offsetLeft, width: to.offsetWidth, duration: 0.75, ease: RISE }, 0.1);
  tl.add(() => { to.classList.add('on'); slider.remove(); }, 0.85);
  return tl;
}
// occasions → first product page: the group pills rise into the tabs, then the examples come up
function headsRise(old, el) {
  const heads = $$('.oc-head', old), b = $('.sc-tabs', el); if (!heads.length || !b) return null;
  const tabs = $$('.sc-tab', b); if (tabs.length !== heads.length) return null;
  const br = b.getBoundingClientRect(), k = br.width / (b.offsetWidth || 1);
  const tl = gsap.timeline();
  b.removeAttribute('data-a'); gsap.set(b, { opacity: 1 }); gsap.set(tabs, { opacity: 0 });
  const clones = heads.map((h, i) => {
    const r = h.getBoundingClientRect(), c = tabs[i].cloneNode(true);
    c.classList.add('on', ...[...h.closest('.oc-col').classList].filter(x => x.startsWith('tn-')));
    Object.assign(c.style, { position: 'absolute', margin: 0, zIndex: 2 });
    gsap.set(c, { left: (r.left - br.left) / k, top: (r.top - br.top) / k, width: r.width / k, height: r.height / k, opacity: 1 });
    b.append(c); return c;
  });
  gsap.set(heads, { opacity: 0 });
  tl.to($$('.oc-col ul, .board-head, .oc-legend', old), { opacity: 0, y: pxs(30), duration: 0.45, ease: 'power2.in', stagger: 0.04 }, 0);
  clones.forEach((c, i) => tl.to(c, { left: tabs[i].offsetLeft, top: tabs[i].offsetTop, width: tabs[i].offsetWidth, height: tabs[i].offsetHeight, duration: 0.95, ease: RISE }, 0.15 + i * 0.06));
  tl.to(tabs, { opacity: 1, duration: 0.3 }, 1.05);
  tl.to(clones, { opacity: 0, duration: 0.35, onComplete: () => clones.forEach(c => c.remove()) }, 1.1);
  return tl;
}
function outroTL(el, dir = 1) {
  if (risesIn()) return gsap.to($$('.t, .slide-bg ~ *', el), { y: -pxs(16), opacity: 0, duration: 0.4, ease: 'power2.in' });
  const t = $$('.t, .slide-bg ~ *', el);
  return gsap.to(t, { x: dir * pxs(50), opacity: 0, duration: 0.5, ease: 'power2.in', force3D: true });
}
function lightVeil(p, dir) {
  if (!veil?.ok || reduced() || quiet()) return;
  veil.set({ mode: p.brand.texture, variant: p.brand.textureStyle, colors: p.brand.textureColors, sweep: dir, progress: 0, alpha: 0.14 * (p.brand.textureIntensity ?? 1), seed: Math.random() * 99 });
  veil.start();
  gsap.timeline({ onComplete: () => veil.stop() }).to(veil, { progress: 0.32, duration: 0.5, ease: 'sine.out' }).to(veil, { progress: 0, duration: 0.6, ease: 'sine.in' });
}

/* ---------- swap the slide inside the current section */
async function showSlide(li, { dir = 1, kind, instant = false } = {}) {
  const p = project(), s = section(); if (!p || !s) return;
  const list = slidesOf(s); li = clamp(li, 0, list.length - 1);
  const slide = list[li]; if (!slide) return;
  const old = S.slideEl;
  const { el, tpl, theme } = buildSlide(p, slide);
  S.li = li; S.slide = slide; S.slideTpl = tpl; S.slideEl = el;
  if (S.step == null || S.step < 0) S.step = 0;
  kind = reduced() ? 'fade' : (kind || slide.transition || 'drift');
  slidesHost.appendChild(el);
  tpl.layout?.(el, slide.data || {}); // templates that measure themselves (diagram arrows)
  if (tpl.applyStep) tpl.applyStep(el, S.step || 0, true);
  if (!instant && old) await decodeIn(el);
  logosColor(theme.fg, theme.dark);
  updateHUD(); preloadAround(); broadcastState();
  if (instant || !old) {
    mountSlide(el, tpl, slide);
    if (old) { unmountSlide(old); old.remove(); }
    if (!instant) await introTL(el, dir, kind);
    return;
  }
  sound.play('slide', p.id);
  switch (kind) {
    case 'cut':
      unmountSlide(old); old.remove(); mountSlide(el, tpl, slide); break;
    case 'fade': {
      gsap.set(el, { opacity: 0 }); mountSlide(el, tpl, slide);
      await gsap.timeline().to(el, { opacity: 1, duration: 0.8, ease: 'power2.inOut' }).to(old, { opacity: 0, duration: 0.5 }, 0.2);
      unmountSlide(old); old.remove(); break;
    }
    case 'mask': {
      const from = dir > 0 ? 'inset(0% 100% 0% 0%)' : 'inset(0% 0% 0% 100%)';
      mountSlide(el, tpl, slide);
      const tl = gsap.timeline();
      tl.fromTo(el, { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut', clearProps: 'clipPath' }, 0);
      tl.to($$('.t', old), { x: dir * pxs(120), duration: 1.2, ease: 'expo.inOut' }, 0);
      tl.add(introTL(el, dir, 'fade'), 0.45);
      await tl; unmountSlide(old); old.remove(); break;
    }
    case 'veil':
    case 'brand': {
      gsap.set(el, { opacity: 0 });
      await coverTransition({ p, dir, card: kind === 'brand' ? null : false, light: kind === 'veil', swap: () => {
        unmountSlide(old); old.remove(); gsap.set(el, { opacity: 1 }); mountSlide(el, tpl, slide);
        $$('[data-a]', el).forEach(n => gsap.set(n, { opacity: 0 }));
      }, after: () => introTL(el, dir, 'drift') });
      break;
    }
    default: { // Layered Drift
      gsap.set($$('[data-a]', el), { opacity: 0 });
      mountSlide(el, tpl, slide);
      lightVeil(p, dir);
      const tl = gsap.timeline();
      const rise = risesIn() && dir > 0 && headsRise(old, el);
      const swap = !rise && risesIn() && tabsSwap(old, el);
      if (rise) { tl.add(rise, 0); tl.add(introTL(el, dir, 'drift'), 0.95); }
      else if (swap) { tl.add(swap, 0); tl.add(introTL(el, dir, 'drift'), 0.3); }
      else { tl.add(outroTL(old, dir), 0); tl.add(introTL(el, dir, 'drift'), 0.3); }
      await tl; unmountSlide(old); old.remove();
    }
  }
}

/* ======================================================================= section cover (brand transition) */
function coverCard(p, number, title, titleEn) {
  // the project's symbol (Bundle's B, Lavara's framed A) opens the title, then stays behind it as a large faint shadow
  const mark = p.brand.mark ? `<span class="logo-mask cv-mark" style="--src:url('${esc(asset(p.brand.mark))}')"></span>` : '';
  return `${mark}<div class="cover-card">
    <span class="cv-num latin">${String(number).padStart(2, '0')}</span>
    <span class="cv-rule"></span>
    <h2 class="cv-title">${escBr(title || '')}</h2>
    ${titleEn ? `<span class="cv-en latin">${esc(titleEn)}</span>` : ''}
  </div>`;
}
async function coverTransition({ p, dir = 1, card = null, light = false, swap, after }) {
  const tex = p.brand.texture === 'mist' ? 'mist' : 'bubbles';
  const panel = quiet() || !veil?.ok || reduced();
  const useVeil = !panel;
  coverEl.dataset.style = tex;
  coverEl.classList.toggle('is-panel', panel);
  const cvBg = panel ? p.brand.colors.primary : (p.brand.textureColors || [])[0] || p.brand.colors.primary;
  // light grounds (the shared frame's paper) take the dark ink, never white on white
  coverEl.style.setProperty('--cv-fg', isDark(cvBg) ? p.brand.colors?.textLight || '#fff' : p.brand.colors?.title || p.brand.colors?.dark || '#1E1B17');
  coverEl.style.setProperty('--cv-bg', cvBg);
  coverEl.innerHTML = card ? coverCard(p, card.number, card.title, card.titleEn) : '';
  sound.play(light ? 'slide' : 'section', p.id);
  const inT = light ? 0.65 : 1.1, hold = card ? (p.brand.mark ? 1.25 : 0.75) : 0.1, outT = light ? 0.7 : 1.05; // the symbol's opening needs a beat longer
  const tl = gsap.timeline();
  if (useVeil) {
    veil.set({ mode: tex, variant: p.brand.textureStyle, colors: p.brand.textureColors, sweep: dir, progress: 0, alpha: p.brand.textureIntensity ?? 1, seed: Math.random() * 99 });
    veil.start();
    tl.to(veil, { progress: 1, duration: inT, ease: 'power2.inOut' }, 0);
  } else {
    coverEl.style.setProperty('--cv-bg', p.brand.colors.primary);
    tl.fromTo(coverEl, { clipPath: dir > 0 ? 'inset(0% 100% 0% 0%)' : 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: inT, ease: 'expo.inOut' }, 0);
    tl.fromTo(coverEl, { '--lx': dir > 0 ? '20%' : '80%' }, { '--lx': dir > 0 ? '70%' : '30%', duration: inT + 1.8, ease: 'sine.inOut' }, 0);
  }
  coverEl.classList.add('on');
  const cardEls = card ? $$('.cover-card > *', coverEl) : [];
  const markEl = card ? $('.cv-mark', coverEl) : null;
  if (card && markEl) {
    // the symbol appears small and solid, then opens: it grows into a faint shadow while the title is unveiled from its centre
    const t0 = inT * 0.6;
    tl.fromTo(markEl, { opacity: 0, scale: 0.32 }, { opacity: 0.95, scale: 0.42, duration: 0.45, ease: 'power3.out' }, t0);
    // …then slides to the bottom-right corner and settles there large and half cut by the edge, a shadow beside the title
    const W = coverEl.offsetWidth, H = coverEl.offsetHeight, M = markEl.offsetWidth * 1.55;
    tl.to(markEl, { opacity: 0.1, scale: 1.55, x: W / 2 - M * 0.22, y: H / 2 - M * 0.12, duration: 1.35, ease: 'expo.inOut' }, t0 + 0.4);
    tl.fromTo($('.cover-card', coverEl), { clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, ease: 'expo.inOut' }, t0 + 0.48);
    tl.fromTo(cardEls, { opacity: 0, y: pxs(14) }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06 }, t0 + 0.55);
    tl.fromTo($('.cv-rule', coverEl), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.inOut' }, t0 + 0.6);
  } else if (card) {
    tl.fromTo(cardEls, { opacity: 0, y: pxs(24) }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.09 }, inT * 0.7);
    tl.fromTo($('.cv-rule', coverEl), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.inOut' }, inT * 0.72);
  }
  tl.call(() => swap && swap(), null, inT + 0.02);
  const outAt = inT + hold + (card ? 0.4 : 0);
  if (card) tl.to(cardEls, { opacity: 0, y: -pxs(16), duration: 0.5, ease: 'power2.in', stagger: 0.04 }, outAt - 0.25);
  if (markEl) tl.to(markEl, { opacity: 0, duration: 0.6, ease: 'power2.in' }, outAt - 0.25);
  if (useVeil) tl.to(veil, { progress: 0, duration: outT, ease: 'power2.inOut' }, outAt);
  else tl.to(coverEl, { clipPath: dir > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)', duration: outT, ease: 'expo.inOut' }, outAt);
  if (after) tl.add(() => { after(); }, outAt + outT * 0.25);
  await tl;
  coverEl.classList.remove('on', 'is-panel'); coverEl.innerHTML = ''; gsap.set(coverEl, { clearProps: 'backgroundColor,clipPath' });
  if (useVeil) veil.stop(), veil.set({ progress: 0 });
}

/* ======================================================================= universe (opening screen) */
// Layouts: cinema · portals · monolith · index (executive set) + halves · circles (original, with live textures).
const UNIVERSE_LAYOUTS = [['cinema', 'سينمائي'], ['portals', 'بوابتان'], ['monolith', 'متحفي'], ['index', 'فهرس تحريري'], ['title', 'بطاقة افتتاحية'], ['monogram', 'رمزان بلون الهوية'], ['cards', 'بطاقتا دعوة'], ['horizon', 'خط الأفق'], ['typestack', 'طباعة ضخمة'], ['halves', 'نصفان بملمس حي'], ['circles', 'دائرتان بملمس حي'], ['fusion', 'الأفق الحي (٨ + ١٠)']];
const coverOf = p => p.brand.cover || p.brand.universe?.image || '';
function coverImg(p, cls = 'w-img') {
  const src = coverOf(p), c = p.brand.colors || {};
  const fp = p.brand.coverFocal || { x: 50, y: 50 };
  return `${src ? `<img class="${cls}" src="${esc(asset(src))}" alt="" style="object-position:${fp.x}% ${fp.y}%">` : `<span class="${cls} w-img-ph" style="background:${c.primary}"></span>`}<span class="w-tint" style="--tc:${c.primary};--tint:${p.brand.coverTint ?? 0.4}"></span>`;
}
function logoTint(p, cls) {
  const src = p.brand.logo; if (!src) return `<span class="${cls} w-fallback">${esc(p.name)}</span>`;
  const u = esc(asset(src));
  return `<span class="logo-mask ${cls}" data-ar-src="${u}" style="--src:url('${u}')"></span>`;
}
function markTint(p, cls) {
  const src = p.brand.mark || p.brand.logo; if (!src) return '';
  const u = esc(asset(src));
  return `<span class="logo-mask ${cls}" data-ar-src="${u}" style="--src:url('${u}')"></span>`;
}
const num = i => `<span class="w-num latin">${String(i + 1).padStart(2, '0')}</span>`;
const tag = p => (p.tagline ? `<span class="w-tag">${esc(p.tagline)}</span>` : '');
const nameAr = p => `<span class="w-name">${esc(p.nameAr || p.name)}</span>`;

const UNIVERSE_HTML = {
  cinema: ps => `<div class="uc-row">${ps.map((p, i) => `
      <button class="world uc-world" data-project="${esc(p.id)}">
        <div class="uc-media">${coverImg(p)}</div><div class="uc-shade"></div>
        <div class="uc-content">${num(i)}${logoTint(p, 'uc-logo')}<span class="w-rule"></span>${tag(p)}</div>
      </button>`).join('')}</div>`,
  portals: ps => `<div class="up-floor"></div><div class="up-row">${ps.map((p, i) => `
      <button class="world up-world" data-project="${esc(p.id)}">
        <div class="up-arch"><div class="up-media">${coverImg(p)}</div><span class="up-frame"></span></div>
        <div class="up-meta">${num(i)}${logoTint(p, 'up-logo')}${tag(p)}</div>
      </button>`).join('')}</div>`,
  monolith: ps => `<div class="um-glow"></div><div class="um-row">${ps.map((p, i) => `
      <button class="world um-world" data-project="${esc(p.id)}" style="--glow:${p.brand.colors?.secondary || '#888'}">
        ${num(i)}${logoTint(p, 'um-logo')}<span class="w-rule"></span>${nameAr(p)}${tag(p)}
      </button>`).join('<span class="um-sep"></span>')}</div>`,
  index: (ps, u) => `
      <div class="ui-media">${ps.map((p, i) => `<div class="ui-img ${i === 0 ? 'on' : ''}">${coverImg(p)}</div>`).join('')}<span class="ui-frame"></span></div>
      <div class="ui-list"><div class="ui-eyebrow latin">${esc(u.eyebrow || 'Projects')}</div>
        ${ps.map((p, i) => `
        <button class="world ui-row" data-project="${esc(p.id)}">
          ${num(i)}${nameAr(p)}${logoTint(p, 'ui-logo')}${tag(p)}<span class="ui-arrow">←</span>
        </button>`).join('')}
      </div>`,
  title: ps => `<div class="ut-light"></div><div class="ut-rule"></div><div class="ut-row">${ps.map((p, i) => `
      <button class="world ut-world" data-project="${esc(p.id)}">${num(i)}${logoTint(p, 'ut-logo')}${tag(p)}</button>`).join('<span class="ut-dot"></span>')}</div>`,
  monogram: ps => `<div class="uo-row">${ps.map((p, i) => `
      <button class="world uo-world" data-project="${esc(p.id)}" style="--wbg:${p.brand.colors?.primary || '#222'}">
        ${markTint(p, 'uo-mark')}
        <div class="uo-content">${num(i)}${logoTint(p, 'uo-logo')}<span class="w-rule"></span>${tag(p)}</div>
      </button>`).join('')}</div><div class="uo-top"></div>`,
  cards: ps => `<div class="ud-spot"></div><div class="ud-row">${ps.map((p, i) => {
      const c = p.brand.colors || {};
      return `<button class="world ud-world" data-project="${esc(p.id)}" style="--paper:${c.background || '#eee'};--ink:${c.primary || '#222'};--r:${i % 2 ? 3 : -3}deg">
        <div class="ud-card"><span class="ud-num latin">${String(i + 1).padStart(2, '0')}</span>
          <span class="ud-emb">${markTint(p, 'ud-mark')}</span>
          <span class="ud-emb">${logoTint(p, 'ud-logo')}</span>
          ${tag(p)}<span class="ud-edge"></span></div>
      </button>`;
    }).join('')}</div>`,
  horizon: ps => `<div class="uh-glow"></div><div class="uh-line"><i></i></div><div class="uh-row">${ps.map((p, i) => `
      <button class="world uh-world" data-project="${esc(p.id)}" style="--glow:${p.brand.colors?.secondary || '#fff'}">${num(i)}${logoTint(p, 'uh-logo')}${tag(p)}</button>`).join('')}</div>`,
  typestack: ps => `<div class="us-list">${ps.map((p, i) => `
      <button class="world us-world" data-project="${esc(p.id)}" style="--glow:${p.brand.colors?.secondary || '#fff'}">
        <span class="us-meta">${num(i)}${nameAr(p)}${tag(p)}</span>${logoTint(p, 'us-logo')}
      </button>`).join('')}</div>`,
  fusion: ps => `<div class="uf-row">${ps.map((p, i) => {
      const c = p.brand.colors || {};
      return `<button class="world uf-world style-${p.brand.texture === 'mist' ? 'mist' : 'bubbles'}" data-project="${esc(p.id)}" style="--wbg:${c.primary || '#222'};--glow:${c.secondary || '#fff'}">
        <div class="w-bg"><canvas class="w-tex"></canvas></div><div class="uf-shade"></div>
        <div class="uf-content">${num(i)}${logoTint(p, 'uf-logo')}${tag(p)}</div>
      </button>`;
    }).join('')}</div>
    <div class="uf-line"><i class="uf-pulse"></i><i class="uf-hover"></i></div>`,
  legacy: ps => `<div class="u-head"></div><div class="u-worlds">${ps.map((p, i) => {
      const b = p.brand, c = b.colors || {}, ub = b.universe || {};
      const bg = ub.background || c.background, dark = ub.visual === 'image' || isDarkHex(bg);
      return `<button class="world ${dark ? 'is-dark' : 'is-light'} style-${b.texture === 'mist' ? 'mist' : 'bubbles'}" data-project="${esc(p.id)}" style="--wbg:${bg};--wfg:${dark ? c.textLight : (c.title || c.text)}">
        <div class="w-bg">${ub.visual === 'image' && ub.image ? `<img src="${esc(asset(ub.image))}" alt="">` : ''}<canvas class="w-tex"></canvas></div>
        <div class="w-content">${num(i)}${b.mark ? `<span class="logo-mask w-mark" style="--src:url('${esc(asset(b.mark))}')"></span>` : ''}${nameAr(p)}${tag(p)}</div>
      </button>`;
    }).join('')}</div>`,
};
const layoutOf = () => { const l = settings().universe?.layout || 'cinema'; return UNIVERSE_HTML[l] || l === 'halves' || l === 'circles' ? l : 'cinema'; };
function chooserHTML(u, layout) {
  if (!u.chooser || PREVIEW) return '';
  const tone = settings().tone || 'quiet';
  return `<div class="u-chooser" title="خيارات الشاشة الرئيسية">
    ${UNIVERSE_LAYOUTS.map(([k, n], i) => `<button data-layout="${k}" class="${k === layout ? 'on' : ''}" title="${esc(n)}">${i + 1}</button>`).join('')}
    <i></i><button data-tone="quiet" class="${tone === 'quiet' ? 'on' : ''}">هادئ</button><button data-tone="expressive" class="${tone !== 'quiet' ? 'on' : ''}">حيوي</button>
  </div>`;
}
function renderUniverse() {
  const u = settings().universe || {};
  const layout = layoutOf();
  const ps = projectsOf(S.content);
  const legacy = layout === 'halves' || layout === 'circles';
  L.universe.innerHTML = `<div class="u-wrap layout-${layout} ${legacy ? 'is-legacy' : 'is-exec'}" style="--n:${ps.length}">
      ${(legacy ? UNIVERSE_HTML.legacy : UNIVERSE_HTML[layout])(ps, u)}
      ${u.hint ? `<div class="u-hint">${esc(u.hint)}</div>` : ''}${chooserHTML(u, layout)}
      ${sharedOf(S.content) ? `<button class="u-down" aria-label="${esc(sharedOf(S.content).nameAr || 'Shared')}"><svg viewBox="0 0 24 24"><path d="M5 9l7 7 7-7"/></svg></button>` : ''}
    </div>`;
  fixAspects(L.universe);
  stage.dataset.ulayout = layout;
  $$('.ud-world', L.universe).forEach(w => w.addEventListener('mousemove', e => {
    const r = w.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    w.style.setProperty('--tx', (x * 10).toFixed(2) + 'deg'); w.style.setProperty('--ty', (-y * 8).toFixed(2) + 'deg');
  }));
  worldTex.forEach(t => t.stop()); worldTex.length = 0;
  $$('.world', L.universe).forEach((w, i) => {
    const p = ps[i];
    w.addEventListener('click', () => command('enterProject', { projectId: p.id }));
    w.addEventListener('mouseenter', () => hoverWorld(i, true));
    w.addEventListener('mouseleave', () => hoverWorld(i, false));
    w.addEventListener('focus', () => hoverWorld(i, true));
    w.addEventListener('blur', () => hoverWorld(i, false));
    const cv = $('.w-tex', w);
    const fusion = layout === 'fusion';
    if ((!legacy && !fusion) || !cv || (legacy && (p.brand.universe?.visual === 'color' || p.brand.universe?.visual === 'image')) || reduced()) { worldTex.push({ stop() {}, start() {}, set() {} }); return; }
    const { tex, fresh } = pooledTexture(`world-${layout === 'fusion' ? 'f' : 'l'}-${p.id}${p.brand.textureStyle || ''}`, cv, p.brand.texture === 'mist' && !crisp(p) ? 0.3 : 0.5);
    const mist = p.brand.texture === 'mist';
    tex._base = fusion ? { progress: mist ? 0.36 : 0.05, speed: 0.4 } : { progress: mist ? 0.36 : 0.3, speed: 0.6 };
    const tc = p.brand.textureColors || [];
    const colors = fusion ? (mist ? [tc[1], tc[2], tc[3], tc[1]] : [tc[1], tc[3], tc[2], tc[1]]) : ambientColors(p);
    tex.set({ mode: p.brand.texture, variant: p.brand.textureStyle, colors, progress: tex._base.progress, alpha: fusion ? (mist ? 0.42 : 0.26) : 0.9, speed: tex._base.speed, sweep: 0, ...(fresh ? { seed: i * 7 + 3 } : {}) });
    worldTex.push(tex);
  });
  $('.u-down', L.universe)?.addEventListener('click', e => { e.stopPropagation(); command('shared'); });
  $$('.u-chooser button', L.universe).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    if (b.dataset.layout) S.content.settings.universe.layout = b.dataset.layout;
    if (b.dataset.tone) { S.content.settings.tone = b.dataset.tone; applyTone(); }
    renderUniverse(); startWorlds(true); universeEntrance(true);
  }));
}
const isDarkHex = h => { const n = parseInt(String(h).replace('#', ''), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.45; };
function ambientColors(p) {
  const t = p.brand.textureColors || [];
  return p.brand.texture === 'mist' ? [t[0], t[1], t[2], t[3]] : [t[1], t[2], t[3], t[0]];
}
function hoverWorld(i, on) {
  const ws = $$('.world', L.universe);
  ws.forEach((w, k) => w.classList.toggle('is-dim', on && k !== i));
  ws[i]?.classList.toggle('is-hover', on);
  const wrap = $('.u-wrap', L.universe); wrap?.classList.toggle('has-hover', on);
  const glow = $('.um-glow', L.universe);
  if (glow && ws[i]) { const r = ws[i].getBoundingClientRect(), s = L.universe.getBoundingClientRect(); glow.style.setProperty('--gx', ((r.left + r.width / 2 - s.left) / s.width) * 100 + '%'); glow.style.setProperty('--gc', ws[i].style.getPropertyValue('--glow')); glow.classList.toggle('on', on); }
  if (on) $$('.ui-img', L.universe).forEach((im, k) => im.classList.toggle('on', k === i));
  const hz = $('.uh-line', L.universe);
  if (hz && ws[i]) { const r = ws[i].getBoundingClientRect(), s0 = hz.getBoundingClientRect(); hz.style.setProperty('--lx', on ? ((r.left + r.width / 2 - s0.left) / s0.width) * 100 + 'cqw' : '50cqw'); hz.style.setProperty('--lc', on ? ws[i].style.getPropertyValue('--glow') : '#F5F1E8'); hz.classList.toggle('on', on); }
  if (!on) $$('.ud-world', L.universe).forEach(w => { w.style.setProperty('--tx', '0deg'); w.style.setProperty('--ty', '0deg'); });
  const fl = $('.uf-line', L.universe);
  if (fl && ws[i]) { const r = ws[i].getBoundingClientRect(), s0 = fl.getBoundingClientRect(); fl.style.setProperty('--lx', ((r.left + r.width / 2 - s0.left) / s0.width) * 100 + 'cqw'); fl.style.setProperty('--lc', ws[i].style.getPropertyValue('--glow')); fl.classList.toggle('on', on); }
  const t = worldTex[i]; if (!t?.set || !t._base) return;
  gsap.to(t, { progress: t._base.progress + (on ? 0.07 : 0), speed: on ? t._base.speed * 3 : t._base.speed, duration: 1.6, ease: 'power2.out' });
}
function universeEntrance(quick = false) {
  const tl = gsap.timeline();
  const q = s => $$(s, L.universe);
  const d = quick ? 0 : 0.2;
  if (!quick) tl.fromTo(logosEl, { opacity: 0, y: pxs(24) }, { opacity: 1, y: 0, duration: 1.8, ease: 'expo.out', clearProps: 'transform' }, d);
  const layout = layoutOf();
  if (layout === 'cinema') {
    tl.fromTo(q('.uc-world'), { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 2, ease: 'expo.inOut', stagger: 0.16, clearProps: 'clipPath' }, d + 0.1);
    tl.fromTo(q('.uc-media .w-img'), { scale: 1.18 }, { scale: 1.04, duration: 3.2, ease: 'expo.out', clearProps: 'transform' }, d + 0.1);
    tl.fromTo(q('.uc-content > *'), { opacity: 0, y: pxs(26) }, { opacity: 1, y: 0, duration: 1.6, ease: 'expo.out', stagger: 0.07 }, d + 1.0);
  } else if (layout === 'portals') {
    tl.fromTo(q('.up-media'), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 2.2, ease: 'expo.inOut', stagger: 0.18, clearProps: 'clipPath' }, d + 0.15);
    tl.fromTo(q('.up-frame'), { opacity: 0, scale: 0.96 }, { opacity: 0.45, scale: 1, duration: 2, ease: 'expo.out', stagger: 0.18, clearProps: 'transform,opacity' }, d + 1.0);
    tl.fromTo(q('.up-media .w-img'), { scale: 1.2 }, { scale: 1, duration: 3, ease: 'expo.out' }, d + 0.15);
    tl.fromTo(q('.up-meta > *'), { opacity: 0, y: pxs(20) }, { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', stagger: 0.06 }, d + 1.1);
  } else if (layout === 'monolith') {
    tl.fromTo(q('.um-sep'), { scaleY: 0 }, { scaleY: 1, duration: 1.8, ease: 'expo.inOut' }, d + 0.2);
    tl.fromTo(q('.um-world > *'), { opacity: 0, y: pxs(18), filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.8, ease: 'expo.out', stagger: 0.07, clearProps: 'filter' }, d + 0.6);
  } else if (layout === 'index') {
    tl.fromTo(q('.ui-media'), { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 2, ease: 'expo.inOut', clearProps: 'clipPath' }, d + 0.1);
    tl.fromTo(q('.ui-eyebrow, .ui-row'), { opacity: 0, x: -pxs(40) }, { opacity: 1, x: 0, duration: 1.5, ease: 'expo.out', stagger: 0.12 }, d + 0.5);
  } else if (layout === 'fusion') {
    tl.fromTo(q('.uf-world'), { opacity: 0 }, { opacity: 1, duration: 2.4, ease: 'sine.inOut', stagger: 0.2 }, d);
    tl.fromTo(q('.uf-line'), { scaleX: 0 }, { scaleX: 1, duration: 2.6, ease: 'expo.inOut' }, d + 0.5);
    tl.fromTo(q('.uf-content > *'), { opacity: 0, y: pxs(18) }, { opacity: 1, y: 0, duration: 1.8, ease: 'power3.out', stagger: 0.07 }, d + 1.4);
  } else if (layout === 'title') {
    tl.fromTo(q('.ut-light'), { opacity: 0 }, { opacity: 1, duration: 3, ease: 'sine.inOut' }, d);
    tl.fromTo(q('.ut-rule'), { scaleX: 0 }, { scaleX: 1, duration: 1.8, ease: 'expo.inOut' }, d + 0.9);
    tl.fromTo(q('.ut-world, .ut-dot'), { opacity: 0, y: pxs(16), filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.8, ease: 'expo.out', stagger: 0.12, clearProps: 'filter' }, d + 1.3);
  } else if (layout === 'monogram') {
    tl.fromTo(q('.uo-world'), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.9, ease: 'expo.inOut', stagger: 0.14, clearProps: 'clipPath' }, d);
    tl.fromTo(q('.uo-mark'), { scale: 1.25, opacity: 0 }, { scale: 1, opacity: 1, duration: 3, ease: 'expo.out', stagger: 0.14 }, d + 0.4);
    tl.fromTo(q('.uo-content > *'), { opacity: 0, y: pxs(20) }, { opacity: 1, y: 0, duration: 1.5, ease: 'expo.out', stagger: 0.06 }, d + 1.1);
  } else if (layout === 'cards') {
    tl.fromTo(q('.ud-spot'), { opacity: 0 }, { opacity: 1, duration: 2.4, ease: 'sine.inOut' }, d);
    tl.fromTo(q('.ud-card'), { y: pxs(120), opacity: 0, rotate: 0 }, { y: 0, opacity: 1, duration: 2.2, ease: 'expo.out', stagger: 0.2, clearProps: 'transform' }, d + 0.3);
  } else if (layout === 'horizon') {
    tl.fromTo(q('.uh-line'), { scaleX: 0 }, { scaleX: 1, duration: 2.4, ease: 'expo.inOut' }, d + 0.2);
    tl.fromTo(q('.uh-glow'), { opacity: 0 }, { opacity: 1, duration: 3, ease: 'sine.inOut' }, d + 0.6);
    tl.fromTo(q('.uh-world > *'), { opacity: 0, y: pxs(18) }, { opacity: 1, y: 0, duration: 1.6, ease: 'expo.out', stagger: 0.06 }, d + 1.3);
  } else if (layout === 'typestack') {
    tl.fromTo(q('.us-world'), { opacity: 0, x: pxs(80) }, { opacity: 1, x: 0, duration: 2, ease: 'expo.out', stagger: 0.18 }, d + 0.3);
  } else {
    tl.fromTo(q('.world'), { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 1.8, ease: 'expo.out', stagger: 0.18 }, d + 0.25);
    tl.fromTo(q('.w-content > *'), { opacity: 0, y: pxs(20) }, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06 }, d + 0.7);
  }
  tl.fromTo(q('.u-hint'), { opacity: 0 }, { opacity: 0.55, duration: 1.4 }, d + 1.6);
  return tl;
}
function startWorlds(on) { worldTex.forEach(t => (on ? t.start() : t.stop())); }
function applyTone() { stage.classList.toggle('tone-quiet', (settings().tone || 'quiet') === 'quiet'); }
const quiet = () => (settings().tone || 'quiet') === 'quiet';

/* ======================================================================= hub (project page) */
// Lavara's material styles (liquid soap, soap bar, amber light) have defined edges and highlights: they need more pixels than the fog.
const crisp = p => ['silk', 'lather', 'pour', 'drop', 'swirl', 'soap', 'amber', 'orbs', 'strips', 'stacks'].includes(p.brand.textureStyle);
// The project page continues the opening screen: brand colour + calm live texture, and the sections as
// stations on a line of light. The light rests on the next section; hovering slides it to another station.
let hubTex = null;
const texPool = new Map(); // key → { cv, tex } — canvases & WebGL contexts are created once and reused
function pooledTexture(key, slot, resScale = 0.4) { // mist (soft fog) renders lighter: 0.3
  let e = texPool.get(key);
  if (!e) { const cv = document.createElement('canvas'); e = { cv, tex: new BrandTexture(cv, { resScale }), fresh: true }; texPool.set(key, e); }
  e.cv.className = slot.className; slot.replaceWith(e.cv);
  const fresh = e.fresh; e.fresh = false;
  return { tex: e.tex, fresh };
}
const hasDecisionStation = p => isShared(p) && !!(S.content.decision?.groups || []).length;
function stopHubTex() { if (hubTex) { hubTex.stop(); hubTex = null; } }
function renderHub(p) {
  const secs = sectionsOf(p);
  const seen = S.seenSections[p.id] ?? -1;
  const decI = hasDecisionStation(p) ? secs.length : -1; // the shared area ends with the decisions
  const pend = S.hubPending ? (S.hubPending.special ? decI : secs.findIndex(x => x.id === S.hubPending.sid)) : -1;
  const nextI = pend >= 0 ? pend : clamp((S.lastSection[p.id] ?? -1) + 1, 0, secs.length - (decI >= 0 ? 0 : 1));
  S.hubTarget = nextI;
  const c = p.brand.colors || {};
  L.hub.innerHTML = `
    <div class="hub2 style-${p.brand.texture === 'mist' ? 'mist' : 'bubbles'} ${hubDark(p) ? '' : 'is-light'}" style="--n:${secs.length + (decI >= 0 ? 1 : 0)};--hbg:${c.primary || '#222'};--hfg:${hubFg(p)};--glow:${c.secondary || '#fff'}">
      <div class="h2-bg"><canvas class="h2-tex"></canvas></div><div class="h2-shade"></div>
      <div class="h2-head">
        ${p.brand.logo ? `<span class="logo-mask h2-logo" data-ar-src="${esc(asset(p.brand.logo))}" style="--src:url('${esc(asset(p.brand.logo))}')"></span>` : `<h1 class="h2-name">${esc(isShared(p) ? (p.nameAr || p.name) : p.name)}</h1>`}
        ${p.tagline ? `<p class="h2-tag" ${edAttr('project', p.id, 'tagline')}>${esc(p.tagline)}</p>` : ''}
      </div>
      <div class="h2-line"><i class="h2-light"></i></div>
      <div class="h2-stations">
        ${secs.map((s, i) => `
          <button class="h2-station ${i <= seen ? 'is-visited' : ''} ${i === nextI ? 'is-next' : ''}" data-section="${esc(s.id)}" data-i="${i}">
            <span class="h2-num latin">${String(i + 1).padStart(2, '0')}</span>
            <span class="h2-dot"><i></i></span>
            <span class="h2-title" ${edAttr('section', s.id, 'title')}>${escBr(s.title)}</span>
            ${s.desc ? `<span class="h2-desc" ${edAttr('section', s.id, 'desc')}>${esc(s.desc)}</span>` : s.titleEn ? `<span class="h2-en latin">${esc(s.titleEn)}</span>` : ''}
          </button>`).join('')}
        ${decI >= 0 ? `<button class="h2-station is-final ${decI === nextI ? 'is-next' : ''}" data-special="decision" data-i="${decI}">
            <span class="h2-num latin">${String(decI + 1).padStart(2, '0')}</span><span class="h2-dot"><i></i></span>
            <span class="h2-title" ${edAttr('decision', '', 'title')}>${esc(S.content.decision?.title || 'القرارات')}</span>${S.content.decision?.desc ? `<span class="h2-desc" ${edAttr('decision', '', 'desc')}>${esc(S.content.decision.desc)}</span>` : `<span class="h2-en latin">${esc(S.content.decision?.titleEn || 'Decisions')}</span>`}</button>` : ''}
      </div>
    </div>`;
  fixAspects(L.hub);
  const st = $$('.h2-station', L.hub);
  st.forEach(b => {
    b.addEventListener('click', () => (b.dataset.special ? command('decision') : command('enterSection', { sectionId: b.dataset.section })));
    // hover only moves the light while the page is at rest; leaving always returns it to the current target
    b.addEventListener('mouseenter', () => { if (!S.busy) hubLight(+b.dataset.i, true); });
    b.addEventListener('mouseleave', () => { if (!S.busy) hubLight(S.hubTarget, false); });
  });
  hubLight(nextI, false, true);
  stopHubTex();
  const cv = $('.h2-tex', L.hub);
  if (cv && !reduced()) {
    const tc = p.brand.textureColors || []; const mist = p.brand.texture === 'mist';
    const { tex, fresh } = pooledTexture('hub-' + p.id + (p.brand.textureStyle || ''), cv, mist && !crisp(p) ? 0.3 : 0.5);
    hubTex = tex;
    hubTex.set({ mode: p.brand.texture, variant: p.brand.textureStyle, colors: mist ? [tc[1], tc[2], tc[3], tc[1]] : [tc[1], tc[3], tc[2], tc[1]], progress: mist ? 0.34 : 0.05, alpha: mist ? 0.4 : 0.24, speed: 0.4, sweep: 0, ...(fresh ? { seed: 11 } : {}) });
    hubTex.start();
  }
}
// Measured in layout pixels (offsetLeft), never getBoundingClientRect(): the line is scaled during its intro
// and the whole page is scaled during camera moves, which used to throw the light off its station.
function layoutLeft(el) { let x = 0; while (el && el !== L.hub) { x += el.offsetLeft; el = el.offsetParent; } return x; }
function hubLight(i, hover, instant) {
  const line = $('.h2-line', L.hub), st = $$('.h2-station', L.hub)[i]; if (!line || !st || !line.offsetWidth) return;
  const dot = $('.h2-dot', st);
  const x = layoutLeft(dot) + dot.offsetWidth / 2 - layoutLeft(line);
  line.style.setProperty('--lx', clamp(x / line.offsetWidth, 0, 1) * 100 + 'cqw');
  line.classList.toggle('is-hover', !!hover);
  if (instant) { line.classList.add('instant'); void line.offsetWidth; requestAnimationFrame(() => line.classList.remove('instant')); }
  $$('.h2-station', L.hub).forEach((x, k) => x.classList.toggle('is-lit', k === i));
}
function stageRect(el) {
  const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = stage.clientWidth / (s.width || 1);
  return { x: (r.left - s.left) * k, y: (r.top - s.top) * k, w: r.width * k, h: r.height * k };
}
function morphTo(r) { const W = stage.clientWidth, H = stage.clientHeight; return { x: r.x, y: r.y, scaleX: r.w / W, scaleY: r.h / H }; }
const worldContent = w => [...w.children].filter(c => !c.classList.contains('w-bg'));

/* ======================================================================= level changes (camera) */
function show(layer, on) { layer.classList.toggle('on', on); }
function originOf(el, layer) {
  const r = el.getBoundingClientRect(), s = layer.getBoundingClientRect();
  return `${((r.left + r.width / 2 - s.left) / s.width) * 100}% ${((r.top + r.height / 2 - s.top) / s.height) * 100}%`;
}
const ZOOM = () => (reduced() ? 0.6 : 1.5);

async function enterProject(pid, { sectionId = null, slideIndex = 0, fromLevel = S.level } = {}) {
  const p = findProject(S.content, pid); if (!p) return;
  const prevP = project();
  if (fromLevel === 'section' || fromLevel === 'hub' || fromLevel === 'decision' || fromLevel === 'closing') {
    if (prevP?.id === pid && fromLevel === 'hub' && sectionId) return enterSection(sectionId, slideIndex);
    // identity morph straight into the target (brand cover in the target identity)
    const secs = sectionsOf(p); const sec = sectionId ? findSection(p, sectionId) : null;
    await coverTransition({ p, dir: 1, card: sec ? { number: secs.indexOf(sec) + 1, title: sec.title, titleEn: sec.titleEn } : { number: projectsOf(S.content).indexOf(p) + 1, title: p.nameAr || p.name, titleEn: p.name }, swap: () => {
      leaveSpecial(true);
      S.pid = pid; applyBrand(p, false); placeLogos('corner', false);
      if (sec) { S.sid = sec.id; S.li = Math.max(0, slideIndex); S.step = 0; enterSectionInstant(); S.lastSection[pid] = secs.indexOf(sec); S.seenSections[pid] = Math.max(S.seenSections[pid] ?? -1, secs.indexOf(sec)); }
      else { renderHub(p); show(L.hub, true); gsap.set(L.hub, { opacity: 1, scale: 1, filter: 'none' }); show(L.section, false); unmountSlide(S.slideEl); slidesHost.innerHTML = ''; S.slideEl = null; S.level = 'hub'; logosColor(hubFg(p), hubDark(p)); }
    }, after: () => { if (sec && S.slideEl) introTL(S.slideEl, 1); else hubIntro(); } });
    updateHUD(); broadcastState(); return;
  }
  if (isShared(p)) return slideToShared(p, { sectionId, slideIndex });
  // Universe → Project: the chosen world grows into the project page (brand plate morph), then the page settles in.
  const world = $(`.world[data-project="${CSS.escape(pid)}"]`, L.universe);
  S.pid = pid; S.sid = null; S.level = 'hub'; S.hubPending = null;
  applyBrand(p);
  renderHub(p);
  logosColor(hubFg(p), hubDark(p));
  startWorlds(false);
  gsap.set(L.hub, { opacity: 0 }); show(L.hub, true);
  const k = reduced() ? 0.5 : 1;
  const tl = gsap.timeline();
  if (world) {
    world.classList.add('is-chosen');
    morphEl.style.setProperty('--m-bg', p.brand.colors.primary || '#222');
    gsap.set(morphEl, { ...morphTo(stageRect(world)), opacity: 0, transformOrigin: '0 0' });
    morphEl.classList.add('on');
    tl.to(worldContent(world), { opacity: 0, duration: 0.45 * k, ease: 'power2.in' }, 0);
    tl.to($$('.world', L.universe).filter(w => w !== world), { opacity: 0.35, duration: 0.7 * k, ease: 'power2.inOut' }, 0);
    tl.to(morphEl, { opacity: 1, duration: 0.4 * k, ease: 'power1.inOut' }, 0.05 * k);
    tl.to(morphEl, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 1.5 * k, ease: 'power3.inOut' }, 0.15 * k);
  } else tl.to(L.universe, { opacity: 0, duration: 0.8 * k, ease: 'power2.inOut' }, 0);
  tl.add(() => placeLogos('corner'), 0.2 * k);
  tl.to(L.hub, { opacity: 1, duration: 0.8 * k, ease: 'power1.inOut' }, 1.15 * k);
  tl.add(hubIntro(), 1.25 * k);
  await tl;
  show(L.universe, false); gsap.set(L.universe, { clearProps: 'all' });
  morphEl.classList.remove('on'); gsap.set(morphEl, { clearProps: 'all' });
  gsap.set(L.hub, { clearProps: 'all' });
  updateHUD(); broadcastState();
  if (sectionId) await enterSection(sectionId, slideIndex);
}
async function slideToShared(p, { sectionId = null, slideIndex = 0 } = {}) {
  S.pid = p.id; S.sid = null; S.level = 'hub'; S.hubPending = null;
  applyBrand(p); renderHub(p);
  logosColor(hubFg(p), hubDark(p));
  show(L.hub, true);
  const k = reduced() ? 0.5 : 1;
  const tl = gsap.timeline();
  tl.to(L.universe, { yPercent: -100, duration: 1.5 * k, ease: 'power3.inOut' }, 0);
  tl.fromTo(L.hub, { yPercent: 100 }, { yPercent: 0, duration: 1.5 * k, ease: 'power3.inOut' }, 0);
  tl.add(() => placeLogos('corner'), 0.25 * k);
  tl.add(hubIntro(), 0.95 * k);
  await tl;
  startWorlds(false); show(L.universe, false); gsap.set(L.universe, { clearProps: 'all' }); gsap.set(L.hub, { clearProps: 'all' });
  updateHUD(); broadcastState();
  if (sectionId) await enterSection(sectionId, slideIndex);
}
function hubIntro() {
  const tl = gsap.timeline();
  tl.fromTo($$('.h2-head > *', L.hub), { opacity: 0, y: pxs(24) }, { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', stagger: 0.1 }, 0);
  tl.fromTo($$('.h2-line', L.hub), { scaleX: 0 }, { scaleX: 1, duration: 1.8, ease: 'expo.inOut' }, 0.05);
  tl.fromTo($$('.h2-station', L.hub), { opacity: 0, y: pxs(30) }, { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.08 }, 0.3);
  return tl;
}
function enterSectionInstant() {
  show(L.hub, false); show(L.section, true); gsap.set(L.section, { opacity: 1, scale: 1, filter: 'none' });
  unmountSlide(S.slideEl); slidesHost.innerHTML = ''; S.slideEl = null; S.level = 'section';
  showSlide(S.li || 0, { instant: true });
  $$('[data-a]', S.slideEl).forEach(n => gsap.set(n, { opacity: 0 }));
}

async function enterSection(sid, slideIndex = 0) {
  const p = project(); if (!p) return;
  const sec = findSection(p, sid); if (!sec || !slidesOf(sec).length) return;
  const secs = sectionsOf(p);
  if (S.level === 'section') { // section → section inside the project
    const dir = secs.indexOf(sec) >= secs.findIndex(s => s.id === S.sid) ? 1 : -1;
    return flowSection(sec, slideIndex, dir);
  }
  if (settings().flow?.titleCards !== false && !reduced()) { // the section opens with its title: the project's symbol unveils it
    const i = secs.indexOf(sec);
    S.hubPending = null; S.lastSection[p.id] = i; S.seenSections[p.id] = Math.max(S.seenSections[p.id] ?? -1, i);
    await coverTransition({ p, dir: 1, card: { number: i + 1, title: sec.title, titleEn: sec.titleEn }, swap: () => {
      S.sid = sid; S.li = slideIndex < 0 ? slidesOf(sec).length - 1 : slideIndex; S.step = 0; enterSectionInstant();
      if (slideIndex < 0) { S.step = stepsOf(S.slideTpl, S.slide); if (S.slideTpl.steps) applyStep(S.slideEl, S.step, true); }
    }, after: () => { if (S.slideEl) introTL(S.slideEl, 1); } });
    updateHUD(); broadcastState(); return;
  }
  const station = $(`.h2-station[data-section="${CSS.escape(sid)}"] .h2-dot`, L.hub);
  const origin = station ? originOf(station, L.hub) : '50% 50%';
  S.sid = sid; S.li = slideIndex; S.step = 0; S.level = 'section'; S.hubPending = null;
  S.lastSection[p.id] = secs.indexOf(sec); S.seenSections[p.id] = Math.max(S.seenSections[p.id] ?? -1, secs.indexOf(sec));
  unmountSlide(S.slideEl); slidesHost.innerHTML = ''; S.slideEl = null;
  show(L.section, true);
  const list = slidesOf(sec); const li = slideIndex < 0 ? list.length - 1 : slideIndex;
  await showSlide(li, { instant: true });
  if (slideIndex < 0) { S.step = stepsOf(S.slideTpl, S.slide); if (S.slideTpl.steps) applyStep(S.slideEl, S.step, true); }
  gsap.set($$('[data-a]', S.slideEl), { opacity: 0 });
  await decodeIn(S.slideEl);
  sound.play('zoom', p.id);
  const D = ZOOM();
  const tl = gsap.timeline();
  
  tl.to(L.hub, { scale: 1.18, opacity: 0, transformOrigin: origin, duration: D * 0.75, ease: 'power2.in' }, 0);
  tl.fromTo(L.section, { scale: 0.35, opacity: 0, transformOrigin: origin }, { scale: 1, opacity: 1, duration: D * 1.0, ease: 'power3.out' }, D * 0.25);
  tl.add(introTL(S.slideEl, 1), D * 0.55);
  await tl;
  show(L.hub, false); gsap.set(L.hub, { clearProps: 'all' }); stopHubTex();
  updateHUD(); broadcastState();
}

// Moving between sections: either a strong camera pull-back to the project page and into the next
// section (default), or the brand cover card. Setting: flow.sectionTransition = 'hub' | 'cover'.
async function flowSection(sec, slideIndex = 0, dir = 1, jump = false) { // jump: chosen explicitly (remote, number, section keys) → never waits
  if ((settings().flow?.sectionTransition || 'hub') !== 'hub' || reduced()) return sectionCover(sec, slideIndex, dir);
  await zoomOut({ strong: true });
  const i = sectionsOf(project()).indexOf(sec);
  S.hubTarget = i; hubLight(i, false);
  $$('.h2-station', L.hub).forEach((x, k) => x.classList.toggle('is-next', k === i));
  if (!jump && (settings().flow?.afterSection || 'wait') !== 'auto') { S.hubPending = { sid: sec.id, slideIndex }; broadcastState(); return; } // the presenter presses Next
  await new Promise(r => setTimeout(r, (jump ? 600 : 1100) / (gsap.globalTimeline.timeScale() || 1)));
  return enterSection(sec.id, slideIndex);
}

async function flowToDecision() {
  await zoomOut({ strong: true });
  const i = sectionsOf(project()).length;
  S.hubTarget = i; hubLight(i, false);
  $$('.h2-station', L.hub).forEach((x, k) => x.classList.toggle('is-next', k === i));
  S.hubPending = { special: 'decision' }; broadcastState();
}
async function sectionCover(sec, slideIndex = 0, dir = 1) {
  const p = project(); const secs = sectionsOf(p);
  const list = slidesOf(sec); const li = slideIndex < 0 ? list.length - 1 : slideIndex;
  await coverTransition({ p, dir, card: { number: secs.indexOf(sec) + 1, title: sec.title, titleEn: sec.titleEn }, swap: () => {
    unmountSlide(S.slideEl); slidesHost.innerHTML = ''; S.slideEl = null;
    S.sid = sec.id; S.lastSection[p.id] = secs.indexOf(sec); S.seenSections[p.id] = Math.max(S.seenSections[p.id] ?? -1, secs.indexOf(sec)); S.step = 0;
    showSlide(li, { instant: true });
    if (slideIndex < 0) { S.step = stepsOf(S.slideTpl, S.slide); if (S.slideTpl.steps) applyStep(S.slideEl, S.step, true); }
    gsap.set($$('[data-a]', S.slideEl), { opacity: 0 });
  }, after: () => introTL(S.slideEl, dir) });
  updateHUD(); broadcastState();
}

async function zoomOut({ strong = false } = {}) {
  if (S.level === 'section') {
    if (S.focus >= 0 && !strong) { focusConcept(-1); return; }
    const p = project(); S.lastSection[p.id] = sectionsOf(p).findIndex(x => x.id === S.sid);
    renderHub(p); show(L.hub, true);
    const station = $(`.h2-station[data-section="${CSS.escape(S.sid)}"] .h2-dot`, L.hub);
    const origin = station ? originOf(station, L.hub) : '50% 50%';
    sound.play('zoom', p.id);
    const D = ZOOM() * (strong ? 1.3 : 1); const tl = gsap.timeline();
    tl.to(L.section, { scale: strong ? 0.2 : 0.4, opacity: 0, transformOrigin: origin, duration: D * 0.9, ease: 'power3.inOut' }, 0);
    tl.fromTo(L.hub, { scale: 1.12, opacity: 0, transformOrigin: origin }, { scale: 1, opacity: 1, duration: D * 0.9, ease: 'power2.out' }, D * 0.3);
    tl.add(hubIntro(), D * 0.5);
    S.level = 'hub'; logosColor(hubFg(p), hubDark(p)); updateHUD();
    await tl;
    unmountSlide(S.slideEl); slidesHost.innerHTML = ''; S.slideEl = null;
    show(L.section, false); gsap.set(L.section, { clearProps: 'all' }); gsap.set(L.hub, { clearProps: 'filter' });
    broadcastState(); return;
  }
  if (S.level === 'hub') return toUniverse();
  if (S.level === 'decision' || S.level === 'closing') return toUniverse();
}

async function toUniverse() {
  const fromP = project();
  const fromLayer = S.level === 'section' ? L.section : S.level === 'hub' ? L.hub : L.special;
  if (fromP) S.visitedProjects.add(fromP.id);
  S.hubPending = null;
  renderUniverse(); show(L.universe, true);
  const world = fromP ? $(`.world[data-project="${CSS.escape(fromP.id)}"]`, L.universe) : null;
  applyBrand(null);
  const k = reduced() ? 0.5 : 1;
  const tl = gsap.timeline();
  if (fromP && isShared(fromP)) {
    tl.to(fromLayer, { yPercent: 100, duration: 1.5 * k, ease: 'power3.inOut' }, 0);
    tl.fromTo(L.universe, { yPercent: -100 }, { yPercent: 0, duration: 1.5 * k, ease: 'power3.inOut' }, 0);
  } else if (world) {
    // reverse morph: the page dissolves into its brand plate, which shrinks back into its world
    const content = worldContent(world);
    gsap.set(content, { opacity: 0 });
    morphEl.style.setProperty('--m-bg', fromP.brand.colors.primary || '#222');
    gsap.set(morphEl, { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, transformOrigin: '0 0' });
    morphEl.classList.add('on');
    tl.to(fromLayer, { opacity: 0, duration: 0.6 * k, ease: 'power1.inOut' }, 0);
    tl.to(morphEl, { ...morphTo(stageRect(world)), duration: 1.5 * k, ease: 'power3.inOut' }, 0.4 * k);
    tl.to(morphEl, { opacity: 0, duration: 0.5 * k, ease: 'power1.inOut' }, 1.5 * k);
    tl.to(content, { opacity: 1, duration: 0.8 * k, ease: 'power2.out' }, 1.45 * k);
  } else {
    tl.to(fromLayer, { opacity: 0, duration: 0.8 * k, ease: 'power2.inOut' }, 0);
    tl.fromTo(L.universe, { opacity: 0 }, { opacity: 1, duration: 0.9 * k, ease: 'power2.out' }, 0.4 * k);
  }
  tl.add(() => { logosEl.hidden = settings().headerLogos?.show === false || settings().universe?.showLogos === false; placeLogos('hero'); }, 0.5 * k);
  S.level = 'universe'; S.focus = -1;
  logosColor(universeColors().fg, true);
  startWorlds(true); updateHUD();
  await tl;
  unmountSlide(S.slideEl); slidesHost.innerHTML = ''; S.slideEl = null;
  [L.section, L.hub, L.special].forEach(l => { show(l, false); gsap.set(l, { clearProps: 'all' }); });
  morphEl.classList.remove('on'); gsap.set(morphEl, { clearProps: 'all' });
  gsap.set(L.universe, { clearProps: 'all' });
  S.pid = null; S.sid = null; stopHubTex();
  updateHUD(); broadcastState();
}

/* ======================================================================= Decision Point + Closing */
function renderDecision() {
  const d = S.content.decision || {};
  const sel = S.decision.selections;
  L.special.innerHTML = `
    <div class="special decision">
      <div class="d-breath"></div>
      <div class="d-head">${d.eyebrow ? `<div class="tx-eyebrow latin">${esc(d.eyebrow)}</div>` : ''}<h1 class="d-q">${escBr(d.question || '')}</h1></div>
      <div class="d-groups" style="--g:${(d.groups || []).length}">
        ${(d.groups || []).map(g => {
          const p = g.projectId ? findProject(S.content, g.projectId) : null;
          return `<div class="d-group" data-group="${esc(g.id)}">
            <div class="d-gtitle">${p?.brand?.logo ? `<span class="logo-mask d-glogo" style="--src:url('${esc(asset(p.brand.logo))}')" title="${esc(g.title)}"></span>` : `<span>${esc(g.title)}</span>`}</div>
            <div class="d-options">${(g.options || []).map(o => `<button class="d-opt ${sel[g.id] === o.id ? 'is-on' : ''}" data-group="${esc(g.id)}" data-option="${esc(o.id)}"><span class="d-ring"></span><span class="d-label">${escBr(o.label)}</span></button>`).join('')}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="d-timer latin ${S.decision.timerOn ? 'on' : ''}"></div>
    </div>`;
  $$('.d-opt', L.special).forEach(b => b.addEventListener('click', () => selectDecision(b.dataset.group, b.dataset.option)));
}
function selectDecision(gid, oid) {
  const d = S.content.decision || {}; const g = (d.groups || []).find(x => x.id === gid); if (!g) return;
  const same = S.decision.selections[gid] === oid;
  if (same) delete S.decision.selections[gid]; else S.decision.selections[gid] = oid;
  try { localStorage.setItem('bxl-decisions', JSON.stringify(S.decision.selections)); } catch {}
  const o = (g.options || []).find(x => x.id === oid);
  if (!PREVIEW) logDecision({ groupId: gid, groupTitle: g.title, optionId: same ? null : oid, optionLabel: same ? null : o?.label, action: same ? 'clear' : 'select', at: new Date().toISOString() });
  $$(`.d-opt[data-group="${CSS.escape(gid)}"]`, L.special).forEach(b => {
    const on = b.dataset.option === S.decision.selections[gid];
    b.classList.toggle('is-on', on);
    if (on) gsap.fromTo($('.d-ring', b), { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'expo.out' });
  });
  sound.play('ui', null, 'neutral');
  broadcastState();
}
function decisionSummary() {
  const d = S.content.decision || {}; const sel = S.decision.selections;
  return (d.groups || []).map(g => { const o = (g.options || []).find(x => x.id === sel[g.id]); return o ? { group: g.title, option: o.label, projectId: g.projectId } : null; }).filter(Boolean);
}
function renderClosing() {
  const c = S.content.closing || {};
  const ps = projectsOf(S.content);
  const sum = c.showDecisions !== false ? decisionSummary() : [];
  const sumHTML = sum.length ? `<div class="c-sum"><div class="c-sum-title">${esc(c.decisionsTitle || '')}</div><div class="c-sum-list">${sum.map(s => `<div class="c-sum-item"><span class="c-g">${esc(s.group)}</span><span class="c-o">${esc(s.option)}</span></div>`).join('')}</div></div>` : '';
  const hl = (settings().headerLogos?.items || []).filter(x => x.show !== false && x.src);
  const logoList = hl.length ? hl.map(x => ({ src: x.src, sc: x.scale || 1 })) : ps.filter(p => p.brand.logo).map(p => ({ src: p.brand.logo, sc: 1 }));
  const logos = logoList.map(l => `<span class="logo-mask c-logo" data-ar-src="${esc(asset(l.src))}" style="--src:url('${esc(asset(l.src))}');--sc:${l.sc}"></span>`).join('<span class="c-x"></span>');
  const marks = ps.map(p => `<div class="c-markbox"><span class="logo-mask c-mark" style="--src:url('${esc(asset(p.brand.mark || p.brand.logo))}')"></span><span class="c-mname latin">${esc(p.name)}</span></div>`).join('');
  const layout = c.layout || 'logos';
  L.special.innerHTML = `
    <div class="special closing layout-${esc(layout)}">
      <div class="d-breath"></div>
      ${layout === 'marks' ? `<div class="c-marks">${marks}</div>` : layout === 'discussion' ? '' : `<div class="c-logos">${logos}</div>`}
      <h1 class="c-line">${escBr(c.line || '')}</h1>
      ${c.subline ? `<p class="c-sub">${escBr(c.subline)}</p>` : ''}
      ${sumHTML}
      ${c.contact ? `<p class="c-contact latin">${escBr(c.contact)}</p>` : ''}
    </div>`;
  fixAspects(L.special);
}
function leaveSpecial(instant) { if (S.level === 'decision' || S.level === 'closing') { show(L.special, false); if (instant) gsap.set(L.special, { clearProps: 'all' }); logosEl.classList.remove('is-hidden'); } }

async function toSpecial(kind) {
  if (S.level === kind) return;
  const from = S.level === 'section' ? L.section : S.level === 'hub' ? L.hub : S.level === 'universe' ? L.universe : L.special;
  const wasSpecial = S.level === 'decision' || S.level === 'closing';
  const p = project(); if (p) S.visitedProjects.add(p.id);
  sound.play('zoom', null, 'neutral');
  const tl = gsap.timeline();
  tl.to(from, { opacity: 0, scale: 0.96, duration: 0.9, ease: 'power2.inOut' }, 0);
  await tl;
  if (!wasSpecial) show(from, false);
  gsap.set(from, { clearProps: 'all' });
  if (S.level === 'universe') startWorlds(false);
  unmountSlide(S.slideEl); slidesHost.innerHTML = ''; S.slideEl = null;
  [L.section, L.hub, L.universe].forEach(l => show(l, false));
  S.level = kind; S.pid = null; S.sid = null; S.focus = -1;
  const dp = sharedOf(S.content); // decisions and closing end the show in the shared area's light identity
  applyBrand(dp);
  kind === 'decision' ? renderDecision() : renderClosing();
  show(L.special, true);
  dp ? logosColor(hubFg(dp), hubDark(dp)) : logosColor(universeColors().fg, true);
  logosEl.classList.toggle('is-hidden', kind === 'closing');
  placeLogos('corner', false);
  updateHUD();
  const t2 = gsap.timeline();
  t2.fromTo(L.special, { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: 1.4, ease: 'power3.out' }, 0);
  t2.fromTo($$('.special > *:not(.d-breath), .d-group, .c-sum-item', L.special), { opacity: 0, y: pxs(24) }, { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.08 }, 0.3);
  await t2;
  broadcastState();
}

/* ======================================================================= flow: next / previous */
async function next() {
  if (S.level === 'universe') {
    const ps = projectsOf(S.content);
    const target = ps.find(p => !S.visitedProjects.has(p.id));
    if (target) return enterProject(target.id);
    const sh = sharedOf(S.content);
    if (sh && !S.visitedProjects.has(sh.id)) return enterProject(sh.id);
    if (S.content.decision && settings().flow?.afterAllProjects !== 'none') return toSpecial('decision');
    return ps[0] && enterProject(ps[0].id);
  }
  if (S.level === 'hub') {
    if (S.hubPending?.special) return toSpecial(S.hubPending.special);
    if (S.hubPending) return enterSection(S.hubPending.sid, S.hubPending.slideIndex);
    const p = project(); const secs = sectionsOf(p);
    const nxt = (S.lastSection[p.id] ?? -1) + 1;
    if (secs[nxt]) return enterSection(secs[nxt].id);
    if (hasDecisionStation(p)) return toSpecial('decision');
    return toUniverse();
  }
  if (S.level === 'section') {
    const steps = stepsOf(S.slideTpl, S.slide);
    if (steps && S.step < steps) { S.step++; applyStep(S.slideEl, S.step); sound.play('ui', S.pid); broadcastState(); return; }
    const list = slidesOf(section());
    if (S.li < list.length - 1) { S.step = 0; return showSlide(S.li + 1, { dir: 1 }); }
    const secs = sectionsOf(project()); const si = secs.findIndex(s => s.id === S.sid);
    if (secs[si + 1]) return flowSection(secs[si + 1], 0, 1);
    if (hasDecisionStation(project())) return flowToDecision();
    S.visitedProjects.add(S.pid); return toUniverse();
  }
  if (S.level === 'decision') return toSpecial('closing');
}
async function prev() {
  if (S.level === 'section') {
    if (S.step > 0) { S.step--; applyStep(S.slideEl, S.step); sound.play('ui', S.pid); broadcastState(); return; }
    if (S.li > 0) {
      const list = slidesOf(section()); const target = list[S.li - 1];
      const tpl = TEMPLATES[target.template]; S.step = stepsOf(tpl, target);
      return showSlide(S.li - 1, { dir: -1 });
    }
    const secs = sectionsOf(project()); const si = secs.findIndex(s => s.id === S.sid);
    if (secs[si - 1]) return flowSection(secs[si - 1], -1, -1);
    return zoomOut();
  }
  if (S.level === 'hub') return S.hubPending?.slideIndex < 0 ? enterSection(S.hubPending.sid, -1) : toUniverse();
  if (S.level === 'closing') return toSpecial('decision');
  if (S.level === 'decision') { const sh = sharedOf(S.content); return sh ? enterProject(sh.id, { fromLevel: 'decision' }) : toUniverse(); }
}
async function jumpSection(delta) {
  if (S.level === 'hub') { const p = project(); const secs = sectionsOf(p); const i = clamp(S.hubTarget + (delta > 0 ? 0 : -1), 0, secs.length - 1); return enterSection(secs[i].id); }
  if (S.level !== 'section') return;
  const secs = sectionsOf(project()); const si = secs.findIndex(s => s.id === S.sid);
  const t = secs[si + delta]; if (t) return flowSection(t, 0, delta, true);
  if (delta > 0) { S.visitedProjects.add(S.pid); return toUniverse(); }
}
async function jumpNumber(n) {
  if (S.level === 'universe') { const p = projectsOf(S.content)[n - 1]; if (p) return enterProject(p.id); return; }
  const p = project(); if (!p) return;
  const sec = sectionsOf(p)[n - 1]; if (!sec) return;
  if (S.level === 'hub') return enterSection(sec.id);
  if (S.level === 'section' && sec.id !== S.sid) return flowSection(sec, 0, n - 1 > sectionsOf(p).findIndex(s => s.id === S.sid) ? 1 : -1, true);
}
async function gotoTarget({ projectId, sectionId, slideIndex = 0, slideId }) {
  if (slideId) { const loc = locate(S.content, slideId); if (loc?.kind === 'slide') { projectId = loc.project.id; sectionId = loc.section.id; slideIndex = slidesOf(loc.section).indexOf(loc.slide); } }
  const p = findProject(S.content, projectId); if (!p) return;
  if (S.level === 'universe') return enterProject(projectId, { sectionId, slideIndex });
  if (S.pid !== projectId) return enterProject(projectId, { sectionId, slideIndex, fromLevel: S.level });
  if (!sectionId) return S.level === 'section' ? zoomOut() : undefined;
  if (S.level === 'hub') return enterSection(sectionId, slideIndex);
  if (S.level === 'section') {
    if (sectionId === S.sid) { if (slideIndex !== S.li) { S.step = 0; return showSlide(slideIndex, { dir: slideIndex > S.li ? 1 : -1 }); } return; }
    const sec = findSection(p, sectionId); const secs = sectionsOf(p);
    return flowSection(sec, slideIndex, secs.indexOf(sec) > secs.findIndex(s => s.id === S.sid) ? 1 : -1, true);
  }
}

/* ======================================================================= command queue */
const ACTIONS = {
  next, prev, zoomOut,
  nextSection: () => jumpSection(1), prevSection: () => jumpSection(-1),
  number: a => jumpNumber(a.n),
  enterProject: a => (S.level === 'universe' ? enterProject(a.projectId) : gotoTarget({ projectId: a.projectId })),
  enterSection: a => enterSection(a.sectionId),
  goto: a => gotoTarget(a),
  universe: () => (S.level === 'universe' ? null : toUniverse()),
  shared: () => { const sh = sharedOf(S.content); if (!sh) return; if (S.level === 'universe') return enterProject(sh.id); if (S.pid !== sh.id) return gotoTarget({ projectId: sh.id }); },
  decision: () => toSpecial('decision'),
  closing: () => toSpecial('closing'),
};
const INSTANT = {
  black: a => setBlack(a.on ?? !S.black),
  mute: a => { const m = a.on ?? !sound.cfg.muted; sound.setMuted(m); broadcastState(); },
  focus: a => focusConcept(a.index),
  decisionSelect: a => selectDecision(a.groupId, a.optionId),
  decisionClear: () => { S.decision.selections = {}; try { localStorage.removeItem('bxl-decisions'); } catch {} if (S.level === 'decision') renderDecision(); if (S.level === 'closing') renderClosing(); logDecision({ action: 'clear-all', at: new Date().toISOString() }); broadcastState(); },
  discussionTimer: a => { S.decision.timerOn = a.on ?? !S.decision.timerOn; if (S.decision.timerOn) S.decision.timerStart = Date.now(); $('.d-timer', L.special)?.classList.toggle('on', S.decision.timerOn); broadcastState(); },
  resetTimer: () => { S.startedAt = Date.now(); broadcastState(); },
  fullscreen: () => toggleFullscreen(),
  reload: () => location.reload(),
};
function command(name, args = {}) {
  sound.unlock();
  if (INSTANT[name]) return INSTANT[name](args);
  const fn = ACTIONS[name]; if (!fn) return;
  if (S.busy) { S.queue = [[name, args, Date.now()]]; return; }
  run(fn, args);
}
async function run(fn, args) {
  S.busy = true; stage.classList.add('is-moving'); BrandTexture.moving = true; // no hover or click reaches the pages while the camera moves
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur?.();
  try { await fn(args); } catch (e) { console.error(e); }
  S.busy = false; stage.classList.remove('is-moving'); BrandTexture.moving = false;
  broadcastState(); editor.refresh();
  const n = S.queue.shift(); S.queue = [];
  if (n && Date.now() - n[2] < 900) command(n[0], n[1]); // stale presses made during a long transition are ignored
}
function setBlack(on) {
  S.black = on; gsap.to(blackEl, { opacity: on ? 1 : 0, duration: 0.6, ease: 'power2.inOut' }); blackEl.classList.toggle('on', on); broadcastState();
}
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {});
}

/* ======================================================================= state → remote / control */
let sync = null;
function nextInfo() {
  const p = project(), s = section();
  const pack = (pp, ss, sl, kind) => {
    if (!sl) return { kind, label: kind };
    const img = slideMedia(sl).find(x => !/\.(mp4|webm|mov|m4v)/i.test(x));
    return { kind, project: pp.name, section: ss.title, label: slideLabel(sl), template: TEMPLATES[sl.template]?.name, image: img || '' };
  };
  if (S.level === 'section' && p && s) {
    const steps = stepsOf(S.slideTpl, S.slide);
    if (steps && S.step < steps) return { kind: 'step', label: `المرحلة ${S.step + 2} من ${steps + 1}`, project: p.name, section: s.title };
    const list = slidesOf(s);
    if (list[S.li + 1]) return pack(p, s, list[S.li + 1], 'slide');
    const secs = sectionsOf(p); const ns = secs[secs.findIndex(x => x.id === s.id) + 1];
    if (ns) return pack(p, ns, slidesOf(ns)[0], 'section');
    return { kind: 'universe', label: 'العودة إلى البداية (Universe)' };
  }
  if (S.level === 'hub' && p) { const secs = sectionsOf(p); const ns = S.hubPending ? findSection(p, S.hubPending.sid) : secs[(S.lastSection[p.id] ?? -1) + 1]; return ns ? pack(p, ns, slidesOf(ns)[0], 'section') : { kind: 'universe', label: 'العودة إلى البداية' }; }
  if (S.level === 'universe') { const t = projectsOf(S.content).find(x => !S.visitedProjects.has(x.id)); return t ? { kind: 'project', label: t.nameAr || t.name, project: t.name } : { kind: 'decision', label: 'نقطة القرار' }; }
  if (S.level === 'decision') return { kind: 'closing', label: 'الختام' };
  return { kind: 'end', label: '—' };
}
function broadcastState() {
  if (!sync || PREVIEW) return;
  const p = project(), s = section();
  sync.send('state', { state: {
    level: S.level, projectId: S.pid, sectionId: S.sid, slideIndex: S.li, slideId: S.slide?.id || null, step: S.step,
    steps: S.level === 'section' ? stepsOf(S.slideTpl, S.slide) : 0,
    slideCount: s ? slidesOf(s).length : 0,
    title: S.level === 'section' ? slideLabel(S.slide) : S.level === 'hub' ? (p?.nameAr || p?.name) : S.level,
    projectName: p?.name || '', sectionTitle: s?.title || '',
    notes: S.level === 'section' ? (S.slide?.notes || '') : '',
    template: S.level === 'section' ? (S.slideTpl ? Object.keys(TEMPLATES).find(k => TEMPLATES[k] === S.slideTpl) : '') : '',
    focus: S.focus, next: nextInfo(), black: S.black, muted: sound.cfg.muted, soundReady: sound.ready,
    startedAt: S.startedAt, busy: S.busy,
    decision: { selections: S.decision.selections, timerOn: S.decision.timerOn, timerStart: S.decision.timerStart },
    visited: [...S.visitedProjects],
  } });
}

/* ======================================================================= live content updates */
function applyContent(c, { keep = true } = {}) {
  S.content = c;
  stage.classList.toggle('no-eyebrow', c.settings?.eyebrows === false);
  registerFonts(c);
  sound.configure(c.settings?.sound, c.projects || []);
  gsap.globalTimeline.timeScale(clamp(c.settings?.motion?.speed || 1, 0.25, 3));
  renderLogos(); applyTone();
  if (!keep) return;
  const p = project();
  if (S.level === 'universe') { renderUniverse(); startWorlds(true); gsap.set($$('.world, .w-content > *, .u-hint', L.universe), { opacity: 1, y: 0, scale: 1 }); applyBrand(null, false); }
  else if (S.level === 'hub' && p) { applyBrand(p, false); renderHub(p); }
  else if (S.level === 'section' && p) {
    applyBrand(p, false);
    const s = section();
    if (!s || !slidesOf(s).length) return toUniverseInstant();
    const list = slidesOf(s); const idx = list.findIndex(x => x.id === S.slide?.id);
    const old = S.slideEl; unmountSlide(old); old?.remove(); S.slideEl = null;
    showSlide(idx >= 0 ? idx : clamp(S.li, 0, list.length - 1), { instant: true });
    if (S.slideTpl?.steps) applyStep(S.slideEl, S.step = clamp(S.step, 0, stepsOf(S.slideTpl, S.slide)), true);
  } else if (S.level === 'decision') renderDecision();
  else if (S.level === 'closing') renderClosing();
  else if (!p && (S.level === 'hub' || S.level === 'section')) toUniverseInstant();
  placeLogos(S.level === 'universe' ? 'hero' : 'corner', false);
  updateHUD();
}
function toUniverseInstant() {
  unmountSlide(S.slideEl); slidesHost.innerHTML = ''; S.slideEl = null;
  [L.section, L.hub, L.special].forEach(l => show(l, false));
  S.level = 'universe'; S.pid = S.sid = null;
  applyBrand(null, false); renderUniverse(); show(L.universe, true); startWorlds(true);
  logosColor(universeColors().fg, true); placeLogos('hero', false); updateHUD();
}

/* ======================================================================= preview mode (control panel iframe) */
function previewShow(target = {}, animate = false) {
  [L.universe, L.hub, L.section, L.special].forEach(l => { show(l, false); gsap.set(l, { clearProps: 'all' }); });
  unmountSlide(S.slideEl); slidesHost.innerHTML = ''; S.slideEl = null; startWorlds(false);
  logosEl.classList.remove('is-hidden');
  if (target.level === 'universe' || (!target.projectId && !target.level)) { toUniverseInstant(); if (animate) universeEntrance(); return; }
  if (target.level === 'decision' || target.level === 'closing') {
    const dp = sharedOf(S.content);
    S.level = target.level; S.pid = null; applyBrand(dp, false); target.level === 'decision' ? renderDecision() : renderClosing();
    show(L.special, true); dp ? logosColor(hubFg(dp), hubDark(dp)) : logosColor(universeColors().fg, true); placeLogos('corner', false); logosEl.classList.toggle('is-hidden', target.level === 'closing'); updateHUD(); return;
  }
  const p = findProject(S.content, target.projectId); if (!p) return toUniverseInstant();
  S.pid = p.id; applyBrand(p, false); placeLogos('corner', false);
  if (!target.sectionId) { S.level = 'hub'; renderHub(p); show(L.hub, true); logosColor(hubFg(p), hubDark(p)); updateHUD(); if (animate) hubIntro(); return; }
  const sec = findSection(p, target.sectionId); if (!sec) return;
  S.sid = sec.id; S.level = 'section'; show(L.section, true);
  const list = slidesOf(sec);
  let li = target.slideId ? list.findIndex(x => x.id === target.slideId) : (target.slideIndex || 0);
  if (li < 0) { // hidden slide: show it anyway for editing
    const hiddenSlide = (sec.slides || []).find(x => x.id === target.slideId);
    if (hiddenSlide) { const { el, tpl } = buildSlide(p, hiddenSlide); slidesHost.appendChild(el); S.slideEl = el; S.slide = hiddenSlide; S.slideTpl = tpl; S.step = 0; mountSlide(el, tpl, hiddenSlide); logosColor(getComputedStyle(el).getPropertyValue('--sfg'), el.classList.contains('is-dark')); if (animate) introTL(el, 1, hiddenSlide.transition); return; }
    li = 0;
  }
  S.step = target.step || 0;
  showSlide(li, { instant: true });
  if (animate) { gsap.set($$('[data-a]', S.slideEl), { opacity: 0 }); introTL(S.slideEl, 1, list[li]?.transition === 'mask' ? 'drift' : list[li]?.transition); }
}

/* ======================================================================= input */
function onKey(e) {
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
  if (e.code === 'KeyE' && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); editor.toggle(); return; } // any keyboard layout
  sound.unlock();
  const k = e.key;
  if (k === 'ArrowLeft' || k === ' ' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); command(e.shiftKey ? 'nextSection' : 'next'); }
  else if (k === 'ArrowRight' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); command(e.shiftKey ? 'prevSection' : 'prev'); }
  else if (k === 'Escape') { e.preventDefault(); if (S.black) setBlack(false); else command('zoomOut'); }
  else if (k === 'ArrowDown' && S.level === 'universe') { e.preventDefault(); command('shared'); }
  else if (k === 'ArrowUp' && S.level === 'hub' && isShared(project())) { e.preventDefault(); command('universe'); }
  else if (/^[1-9]$/.test(k)) command('number', { n: +k });
  else if (k === 'f' || k === 'F') toggleFullscreen();
  else if (k === 'b' || k === 'B' || k === '.') setBlack(!S.black);
  else if (k === 'm' || k === 'M') INSTANT.mute({});
}

/* ======================================================================= touch (phones / tablets) */
// Swipe right = next (RTL: the next slide enters from the left), swipe left = previous, swipe down = zoom out.
// Tap the left third = next, the right third = previous. Taps on worlds, stations and options keep their own action.
function setupTouch() {
  let sx = null, sy = 0, st = 0;
  addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); sound.unlock(); }, { passive: true });
  addEventListener('touchend', e => {
    if (sx == null || e.touches.length) return;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) { command(dx > 0 ? 'next' : 'prev'); return; }
    if (dy > 70 && Math.abs(dy) > Math.abs(dx) * 1.2) { command('zoomOut'); return; }
    if (dy < -70 && Math.abs(dy) > Math.abs(dx) * 1.2 && S.level === 'universe') { command('shared'); return; }
    if (Date.now() - st > 600 || Math.abs(dx) > 12 || Math.abs(dy) > 12) return;
    if (e.target.closest && e.target.closest('button')) return;
    const x = t.clientX / innerWidth;
    if (x < 0.34) command('next'); else if (x > 0.66) command('prev');
  }, { passive: true });
}

/* ======================================================================= boot */
async function boot() {
  fit(); grainTexture();
  let c;
  try { c = await loadContent(); } catch (e) { $('#boot').innerHTML = `<p>${esc(e.message)}</p>`; return; }
  veil = new BrandTexture($('#veil'), { resScale: c.settings?.motion?.textureScale || 0.5 });
  applyContent(c, { keep: false });
  await fontsReady(c);
  $('#boot').classList.add('done');
  sound.unlock(); // works when Chrome is started with --autoplay-policy=no-user-gesture-required (the launcher does this)

  initZoom();
  if (!PREVIEW) editor = createEditor({
    content: () => S.content,
    views: () => [{ root: L.hub }, S.slideEl && S.slide ? { root: S.slideEl, owner: { kind: 'slide', id: S.slide.id }, data: S.slide.data } : null],
  });
  if (PREVIEW) {
    stage.classList.add('is-preview');
    addEventListener('message', ev => {
      const m = ev.data || {};
      if (m.type === 'content') applyContent(m.content, { keep: false });
      if (m.type === 'content' || m.type === 'show') previewShow(m.target || {}, !!m.animate);
      if (m.type === 'decisions') { S.decision.selections = m.selections || {}; if (S.level === 'decision') renderDecision(); if (S.level === 'closing') renderClosing(); }
    });
    parent.postMessage({ type: 'preview-ready' }, '*');
    toUniverseInstant();
    return;
  }

  sync = createSync('show', msg => {
    if (msg.type === 'hello') broadcastState();
    else if (msg.type === 'content' && msg.content) applyContent(msg.content);
    else if (msg.type === 'cmd') command(msg.cmd, msg.args || {});
  });
  addEventListener('keydown', onKey);
  // Scrolling: down from the opening screen opens the shared area, up from its page returns. One gesture = one move.
  let wheelAt = 0;
  addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) < 18 || S.busy || Date.now() - wheelAt < 1400) return;
    if (e.deltaY > 0 && S.level === 'universe') { wheelAt = Date.now(); command('shared'); }
    else if (e.deltaY < 0 && S.level === 'hub' && isShared(project())) { wheelAt = Date.now(); command('universe'); }
  }, { passive: true });
  addEventListener('pointerdown', () => sound.unlock());
  setupTouch();

  // start position
  const start = c.settings?.startAt;
  const loc = start && start !== 'universe' ? locate(c, start) : null;
  toUniverseInstant();
  if (loc?.kind === 'slide' || loc?.kind === 'section' || loc?.kind === 'project') {
    const sid = loc.section?.id, li = loc.slide ? slidesOf(loc.section).indexOf(loc.slide) : 0;
    previewShow({ projectId: loc.project.id, sectionId: sid, slideIndex: Math.max(0, li) }, true);
  } else universeEntrance();
  broadcastState();
}
boot();
