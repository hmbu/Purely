// Small shared helpers. No dependencies.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
export const clone = o => (o === undefined ? o : JSON.parse(JSON.stringify(o)));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Multi-line text → <br>, keeps it safe.
export const escBr = s => esc(s).replace(/\n/g, '<br>');

export function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export function throttle(fn, ms) {
  let last = 0, t; return (...a) => {
    const now = Date.now(), wait = ms - (now - last);
    clearTimeout(t);
    if (wait <= 0) { last = now; fn(...a); } else t = setTimeout(() => { last = Date.now(); fn(...a); }, wait);
  };
}

/* ---------- color */
export function hexToRgb(hex) {
  let h = String(hex || '#000').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const isDark = hex => luminance(hex) < 0.35;
export function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => lerp(v, B[i], t)));
}
export const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };

/* ---------- misc */
export function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const z = n => String(n).padStart(2, '0');
  return h ? `${h}:${z(m)}:${z(x)}` : `${z(m)}:${z(x)}`;
}
export const arabicDigits = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

/* ---------- Arabic display titles: a short stretch (kashida) before the last letter of each word,
   as in «الهدايـا المؤسسيـة». Only where the letters join; small words and lam-alef are left alone. */
export const TYPO = { kashida: true };
const AR_LETTER = /[ؠ-ؿف-يٮ-ۓ]/, AR_MARK = /[ً-ٰٟ]/;
const NO_LEFT_JOIN = new Set([...'ءآأؤإاةدذرزوىٱ']); // never join the letter after them
const KASHIDA_SKIP = new Set(['على', 'إلى', 'التي', 'الذي', 'هذا', 'هذه', 'بين', 'عند', 'حتى', 'قبل', 'بعد', 'خلال', 'نحو']);
export function kashida(s) {
  if (!TYPO.kashida || !s) return s ?? '';
  return String(s).replace(/[؀-ۿ]+/g, w => {
    if (w.includes('ـ') || KASHIDA_SKIP.has(w)) return w;
    const ch = [...w]; if (ch.filter(c => AR_LETTER.test(c)).length < 3) return w;
    let i = ch.length - 1; while (i > 0 && AR_MARK.test(ch[i])) i--; // the last letter (its marks stay after it)
    let j = i - 1; while (j >= 0 && AR_MARK.test(ch[j])) j--; // the letter before it
    if (j < 0 || !AR_LETTER.test(ch[i]) || !AR_LETTER.test(ch[j]) || NO_LEFT_JOIN.has(ch[j]) || ch[i] === 'ء') return w;
    if (ch[j] === 'ل' && 'اأإآ'.includes(ch[i])) return w; // keep the lam-alef ligature whole
    ch.splice(i, 0, 'ـ'); return ch.join('');
  });
}
// a stretched title, carrying its plain words for the in-place editor
export const kTitle = s => { const k = kashida(s); return { html: escBr(k), attr: k !== (s ?? '') ? ` data-plain="${esc(s)}"` : '' }; };
export const isVideo = src => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src || '') || /^data:video\//.test(src || '');

export function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Runtime-generated film-grain tile (used by Bundle surfaces and placeholders).
let grainURL = null;
export function grainTexture() {
  if (grainURL) return grainURL;
  const c = document.createElement('canvas'); c.width = c.height = 160;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainURL = c.toDataURL('image/png');
  document.documentElement.style.setProperty('--grain', `url(${grainURL})`);
  return grainURL;
}

// Intrinsic aspect ratio of a logo file (SVG viewBox or bitmap size) — used for tinted mask logos.
const arCache = new Map();
export function aspectOf(url) {
  if (!arCache.has(url)) arCache.set(url, (async () => {
    try {
      if (/\.svg(\?|$)/i.test(url)) {
        const t = await (await fetch(url)).text();
        const m = t.match(/viewBox\s*=\s*"([^"]+)"/i);
        if (m) { const v = m[1].trim().split(/[\s,]+/).map(Number); if (v[2] > 0 && v[3] > 0) return v[2] / v[3]; }
      }
      const i = new Image(); i.src = url; await i.decode(); return i.naturalWidth / i.naturalHeight || 4;
    } catch { return 4; }
  })());
  return arCache.get(url);
}
export async function fixAspects(root) {
  await Promise.all([...root.querySelectorAll('[data-ar-src]')].map(async el => el.style.setProperty('--ar', await aspectOf(el.dataset.arSrc))));
}
