// Edit text straight on the show (key E). Every visible text that comes from content.json becomes editable;
// leaving a text saves that one change. Slides need no markup: a text element is bound to the slide-data
// string it shows (exact text match, in order, so repeated strings map one to one). Texts outside slides
// (hub titles, taglines) are marked explicitly with edAttr(). Saving goes through patchContent(), which
// reloads the latest content.json, changes only that field and commits it, so nothing newer is overwritten.
import { patchContent, backendMode } from './store.js';
import { esc } from './util.js';

// data keys that hold settings, ids or paths, never visible copy
const SKIP = /^(src|poster|id|from|to|tone|shape|kind|align|size|fit|color|lane|style|mode|imageSide|textPosition|template|transition|bg|projectId|years|a|b|m)$/;
const norm = s => String(s ?? '').replace(/ـ/g, '').replace(/\s+/g, ' ').trim();

export const edAttr = (kind, id, key) => `data-ed-kind="${esc(kind)}" data-ed-id="${esc(id)}" data-ed-key="${esc(key)}"`;

// Lists typed one item per line (occasions, categories, points…) show each line as its own item: each line is also
// offered on its own (without its ~ or - marker), and saving it rewrites only that line.
const MARK = /^\s*([~\-#]\s*)/;
function strings(v, path = [], out = []) {
  if (typeof v === 'string') {
    if (!norm(v) || /^(assets\/|https?:|data:)/.test(v)) return out;
    out.push({ path, value: v });
    if (v.includes('\n')) v.split('\n').map(x => x.trim()).filter(Boolean).forEach((x, i) => {
      const m = x.match(MARK); out.push({ path, value: m ? x.slice(m[0].length) : x, line: { i, prefix: m ? m[1] : '' } });
    });
    else if (/[,،]/.test(v)) v.split(/[,،]/).map(x => x.trim()).filter(Boolean).forEach((x, i) => out.push({ path, value: x, part: { i } })); // comma lists (tabs, owners)
  }
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, [...path, i], out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!SKIP.test(k)) strings(x, [...path, k], out);
  return out;
}
// text as typed: <br> and block breaks become new lines
function readText(el) {
  let t = '';
  el.childNodes.forEach(n => {
    if (n.nodeType === 3) t += n.data;
    else if (n.nodeName === 'BR') t += '\n';
    else if (n.nodeType === 1) t += (/^(DIV|P)$/.test(n.nodeName) && t ? '\n' : '') + readText(n);
  });
  return t;
}
const isLeaf = el => el.childNodes.length && [...el.childNodes].every(n => n.nodeType === 3 || n.nodeName === 'BR');
const textHTML = s => esc(s).replace(/\n/g, '<br>');

function target(c, owner) {
  if (owner.kind === 'decision') return c.decision;
  if (owner.kind === 'review') return c.review;
  if (owner.kind === 'closing') return c.closing;
  for (const p of c.projects || []) {
    if (owner.kind === 'project' && p.id === owner.id) return p;
    for (const s of p.sections || []) {
      if (owner.kind === 'section' && s.id === owner.id) return s;
      if (owner.kind === 'slide') { const sl = (s.slides || []).find(x => x.id === owner.id); if (sl) return sl.data; }
    }
  }
  return null;
}
function setAt(c, owner, path, value, line, part) {
  let o = target(c, owner); if (!o) return false;
  for (const k of path.slice(0, -1)) { o = o?.[k]; if (o == null) return false; }
  const key = path[path.length - 1];
  if (part) { // one item of a comma list
    const items = String(o[key] ?? '').split(/[,،]/).map(x => x.trim()).filter(Boolean); if (part.i >= items.length) return false;
    items[part.i] = value; o[key] = items.join(String(o[key]).includes('،') ? '، ' : ', '); return true;
  }
  if (line) { // replace only the line that was edited (counting non-empty lines, as they are shown)
    const all = String(o[key] ?? '').split('\n'); let n = -1;
    const at = all.findIndex(x => x.trim() && ++n === line.i); if (at < 0) return false;
    all[at] = line.prefix + value; o[key] = all.join('\n'); return true;
  }
  o[key] = value; return true;
}

export function createEditor({ content, views, onChange }) {
  let on = false, bound = [], queue = Promise.resolve();
  const bar = document.createElement('div');
  bar.className = 'ed-bar'; bar.hidden = true;
  bar.innerHTML = '<b>وضع التحرير</b><span class="ed-hint">اضغط على أي نص لتعديله · Enter للحفظ · Esc للتراجع · E للخروج</span><span class="ed-state"></span>';
  document.body.appendChild(bar);
  const state = (t, cls = '') => { const s = bar.querySelector('.ed-state'); s.textContent = t; s.className = 'ed-state ' + cls; };

  function unbind() {
    bound.forEach(b => { b.el.removeAttribute('contenteditable'); b.el.classList.remove('ed-on'); delete b.el._ed; });
    bound = [];
  }
  function bind() {
    unbind(); if (!on) return;
    for (const v of views()) {
      if (!v?.root) continue;
      v.root.querySelectorAll('[data-ed-kind]').forEach(el => bound.push({ el, owner: { kind: el.dataset.edKind, id: el.dataset.edId }, path: el.dataset.edKey.split('.').map(k => (/^\d+$/.test(k) ? +k : k)) }));
      if (v.owner && v.data) {
        const pool = strings(v.data);
        v.root.querySelectorAll('*').forEach(el => {
          if (el.closest('[data-ed-kind]') || !isLeaf(el)) return;
          const t = norm(readText(el)); if (!t) return;
          const i = pool.findIndex(x => norm(x.value) === t); if (i < 0) return;
          bound.push({ el, owner: v.owner, path: pool[i].path, line: pool[i].line, part: pool[i].part }); pool.splice(i, 1);
        });
      }
    }
    bound.forEach(b => { b.el._ed = b; b.el.setAttribute('contenteditable', 'plaintext-only'); b.el.classList.add('ed-on'); b.el.spellcheck = false; });
  }

  async function save(b, value) {
    if (!setAt(content(), b.owner, b.path, value, b.line, b.part)) { state('تعذّر تحديد مكان هذا النص', 'err'); return; }
    onChange?.(b);
    state('جارٍ الحفظ…');
    queue = queue.then(async () => {
      try {
        const r = await patchContent(c => setAt(c, b.owner, b.path, value, b.line, b.part));
        if (r.ok) state(r.mode === 'github' ? 'تم الحفظ ✓ يظهر في الموقع خلال دقيقة' : 'تم الحفظ ✓', 'ok');
        else state(r.mode === 'single' ? 'نسخة الملف الواحد: التعديل يظهر الآن فقط ولا يُحفظ' : 'غير محفوظ: اربط GitHub من لوحة التحكم (تبويب «النشر») على هذا الجهاز', 'err');
      } catch (e) { state('خطأ في الحفظ: ' + e.message, 'err'); }
    });
  }

  // editing must never navigate: clicks on editable text stop here, and keys stay inside the text
  addEventListener('click', e => { if (on && e.target.closest?.('.ed-on')) e.stopPropagation(); }, true);
  addEventListener('focusin', e => { const b = e.target._ed; if (b) b.before = readText(e.target); });
  addEventListener('keydown', e => {
    const el = e.target; if (!el?._ed) return;
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
    else if (e.key === 'Escape') { e.preventDefault(); el.innerHTML = textHTML(el._ed.before ?? ''); el._ed.cancel = true; el.blur(); }
  }, true);
  addEventListener('focusout', e => {
    const el = e.target, b = el?._ed; if (!b) return;
    if (b.cancel) { b.cancel = false; return; }
    const value = readText(el).replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (value === (b.before ?? '').trim()) return;
    if (!value) { el.innerHTML = textHTML(b.before || ''); state('النص لا يكون فارغاً — أُعيد كما كان', 'err'); return; }
    save(b, value);
  });

  return {
    get on() { return on; },
    toggle(force) {
      on = force ?? !on;
      document.body.classList.toggle('is-editing', on); bar.hidden = !on;
      if (on) state(backendMode() === 'local' ? 'غير متصل: التعديل لن يُحفظ — اربط GitHub من لوحة التحكم' : '', backendMode() === 'local' ? 'err' : '');
      else document.activeElement?.blur?.();
      bind();
    },
    refresh: () => { if (on) bind(); },
  };
}
