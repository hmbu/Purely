// Edit text straight on the show (key E). Every visible text that comes from content.json becomes editable;
// leaving a text saves that one change. Slides need no markup: a text element is bound to the slide-data
// string it shows (exact text match, in order, so repeated strings map one to one). Texts outside slides
// (hub titles, taglines) are marked explicitly with edAttr(). Saving goes through patchContent(), which
// reloads the latest content.json, changes only that field and commits it, so nothing newer is overwritten.
import { patchContent, backendMode } from './store.js';
import { esc } from './util.js';

// data keys that hold settings, ids or paths, never visible copy
const SKIP = /^(src|poster|id|from|to|tone|shape|kind|align|size|fit|color|lane|style|mode|imageSide|textPosition|template|transition|bg|projectId|layout|tourRegions)$/;
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
    else if (v.includes('·')) v.split('·').map(x => x.trim()).filter(Boolean).forEach((x, i) => out.push({ path, value: x, part: { i, sep: '·' } })); // · lists (rework loops, options)
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
// an item with a small mark beside its words (a dot, a square: an empty element) keeps the mark: its words get their
// own wrapper so they can be edited without touching the mark
function wrapText(root) {
  root.querySelectorAll('*').forEach(el => {
    if (el.closest('svg, iframe, [contenteditable], .ed-t') || isLeaf(el)) return;
    const kids = [...el.childNodes], texts = kids.filter(n => n.nodeType === 3 && n.data.trim());
    if (!texts.length || kids.some(n => n.nodeType === 1 && n.nodeName !== 'BR' && n.textContent.trim() && getComputedStyle(n).display !== 'none')) return;
    texts.forEach(n => { const w = document.createElement('span'); w.className = 'ed-t'; n.replaceWith(w); w.appendChild(n); });
  });
}
const isLeaf = el => el.childNodes.length && [...el.childNodes].every(n => n.nodeType === 3 || n.nodeName === 'BR');
const textHTML = s => esc(s).replace(/\n/g, '<br>');

function target(c, owner) {
  if (owner.kind === 'decision') return c.decision;
  if (owner.kind === 'review') return c.review;
  if (owner.kind === 'sar') return c.sar;
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
  if (part?.sep) { // one item of a · list
    const items = String(o[key] ?? '').split(part.sep).map(x => x.trim()).filter(Boolean); if (part.i >= items.length) return false;
    items[part.i] = value; o[key] = items.join(` ${part.sep} `); return true;
  }
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

/* ---------------------------------------------------------------- the edit log (never lose an edit)
   Every saved change is also written to this browser's storage at once, as a small list of changes for this file.
   The single-file version replays it when it opens again (its own file cannot be rewritten), until a copy is saved
   or the changes are discarded; the site keeps only the changes not yet published, and sends them again. */
const SINGLE = () => !!window.__BXL_CONTENT__;
const logKey = () => `bxl-edits:${window.__BXL_BUILD__ || 'site'}:${location.pathname}`;
function readLog() { try { return JSON.parse(localStorage.getItem(logKey()) || '{"ops":[]}'); } catch { return { ops: [] }; } }
function writeLog(log) { try { localStorage.setItem(logKey(), JSON.stringify(log)); return true; } catch { return false; } }
export function editLog() { return readLog(); }
export function clearEditLog() { try { localStorage.removeItem(logKey()); } catch {} }
// apply the logged changes to freshly loaded content; returns how many were applied
export function replayEdits(c) {
  const log = readLog(); let n = 0;
  for (const op of log.ops) if (SINGLE() || op.pending) if (setAt(c, op.owner, op.path, op.value, op.line, op.part)) n++;
  return n;
}

export function createEditor({ content, views, onChange, onToggle, actions = {} }) {
  let on = false, bound = [], queue = Promise.resolve();
  const undo = [], redo = [];
  const bar = document.createElement('div');
  bar.className = 'ed-bar'; bar.hidden = true;
  bar.innerHTML = `<b>وضع التحرير</b>
    <span class="ed-grp"><button data-a="undo" title="تراجع (Ctrl+Z)">↶</button><button data-a="redo" title="إعادة (Ctrl+Shift+Z)">↷</button></span>
    <span class="ed-grp"><button data-a="prev" title="السابق (→)">‹</button><button data-a="overview" title="كل الشرائح (G)">▦</button><button data-a="next" title="التالي (←)">›</button></span>
    <span class="ed-grp"><button data-a="copy" class="ed-main" title="حفظ نسخة (Ctrl+S)">${SINGLE() ? 'حفظ نسخة' : 'تنزيل نسخة'}</button>${SINGLE() ? '<button data-a="discard" title="إلغاء كل التعديلات غير المحفوظة في نسخة">إلغاء التعديلات</button>' : ''}<button data-a="done" title="خروج (E)">تم</button></span>
    <span class="ed-hint">اضغط على أي نص لتعديله · Enter للحفظ · Esc للتراجع</span><span class="ed-state"></span>`;
  document.body.appendChild(bar);
  const state = (t, cls = '') => { const s = bar.querySelector('.ed-state'); s.textContent = t; s.className = 'ed-state ' + cls; };
  const paintHistory = () => { bar.querySelector('[data-a="undo"]').disabled = !undo.length; bar.querySelector('[data-a="redo"]').disabled = !redo.length; };
  ['click', 'pointerdown', 'mousedown'].forEach(ev => bar.addEventListener(ev, e => e.stopPropagation()));
  bar.addEventListener('click', e => {
    const a = e.target.closest('button')?.dataset.a; if (!a) return;
    if (a === 'undo') api.undo(); else if (a === 'redo') api.redo(); else if (a === 'done') api.toggle(false);
    else if (a === 'copy') actions.saveCopy?.(); else if (a === 'discard') actions.discard?.(); else actions[a]?.();
  });

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
        wrapText(v.root);
        const pool = strings(v.data), used = [];
        v.root.querySelectorAll('*').forEach(el => {
          if (el.closest('[data-ed-kind], [data-noedit]') || !isLeaf(el)) return;
          const t = norm(readText(el)); if (!t) return;
          let i = pool.findIndex(x => norm(x.value) === t), hit;
          if (i >= 0) { hit = pool[i]; pool.splice(i, 1); used.push(hit); } else hit = used.find(x => norm(x.value) === t);
          if (hit) bound.push({ el, owner: v.owner, path: hit.path, line: hit.line, part: hit.part });
        });
      }
    }
    bound.forEach(b => { b.el._ed = b; b.el.setAttribute('contenteditable', 'plaintext-only'); b.el.classList.add('ed-on'); b.el.spellcheck = false; });
  }

  // one change: into the show's content, into the edit log at once, then out to the site (where there is one)
  function commit(op) {
    if (!setAt(content(), op.owner, op.path, op.value, op.line, op.part)) { state('تعذّر تحديد مكان هذا النص', 'err'); return false; }
    onChange?.(op);
    const log = readLog(), entry = { owner: op.owner, path: op.path, line: op.line, part: op.part, value: op.value, t: Date.now(), pending: !SINGLE() };
    log.ops.push(entry); log.dirty = true;
    const kept = writeLog(log);
    if (SINGLE()) { state(kept ? 'محفوظ في هذا المتصفح ✓ — «حفظ نسخة» يحفظه في ملف' : 'تنبيه: تعذّر الحفظ في المتصفح — احفظ نسخة الآن', kept ? 'ok' : 'err'); return true; }
    state('جارٍ الحفظ…');
    queue = queue.then(async () => {
      try {
        const r = await patchContent(c => setAt(c, op.owner, op.path, op.value, op.line, op.part));
        if (r.ok) { const l = readLog(); const e = l.ops.find(x => x.t === entry.t && x.pending); if (e) e.pending = false; l.ops = l.ops.filter(x => x.pending); writeLog(l); }
        if (r.ok) state(r.mode === 'github' ? 'تم الحفظ ✓ يظهر في الموقع خلال دقيقة' : 'تم الحفظ ✓', 'ok');
        else state('محفوظ في هذا المتصفح فقط: اربط GitHub من لوحة التحكم (تبويب «النشر») لينشر', 'err');
      } catch (e) { state('محفوظ في هذا المتصفح، وتعذّر النشر الآن: ' + e.message, 'err'); }
    });
    return true;
  }
  // put a value back on screen where its text is shown (undo / redo of a text that is still there)
  function show(op, value) { if (op.el?.isConnected) op.el.innerHTML = textHTML(value); }

  function save(b, value) {
    const op = { owner: b.owner, path: b.path, line: b.line, part: b.part, before: b.before ?? '', value, el: b.el };
    if (commit(op)) { undo.push(op); redo.length = 0; paintHistory(); }
  }

  // editing never navigates by a click: clicks on editable text stop here, and keys stay inside the text
  addEventListener('click', e => { if (on && e.target.closest?.('.ed-on')) e.stopPropagation(); }, true);
  // a stretched title (kashida) is edited as its plain words
  addEventListener('focusin', e => { const b = e.target._ed; if (!b) return; if (e.target.dataset.plain != null) e.target.innerHTML = textHTML(e.target.dataset.plain); b.before = readText(e.target); });
  addEventListener('keydown', e => {
    const el = e.target;
    if (el?._ed) {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); el.innerHTML = textHTML(el._ed.before ?? ''); el._ed.cancel = true; el.blur(); }
      return; // inside a text, Ctrl+Z is the text's own undo
    }
    if (!on || el?.closest?.('input, textarea, select')) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && k === 'z') { e.preventDefault(); e.stopPropagation(); e.shiftKey ? api.redo() : api.undo(); }
    else if (mod && k === 'y') { e.preventDefault(); e.stopPropagation(); api.redo(); }
  }, true);
  // Ctrl+S saves a copy whether or not the editor is open
  addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); document.activeElement?.blur?.(); actions.saveCopy?.(); } }, true);
  addEventListener('focusout', e => {
    const el = e.target, b = el?._ed; if (!b) return;
    if (b.cancel) { b.cancel = false; return; }
    const value = readText(el).replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (value === (b.before ?? '').trim()) return;
    if (!value) { el.innerHTML = textHTML(b.before || ''); state('النص لا يكون فارغاً — أُعيد كما كان', 'err'); return; }
    save(b, value);
  });
  // closing the page with changes kept only in this browser: remind to save a copy (they stay in the browser anyway)
  addEventListener('beforeunload', e => { if (SINGLE() && readLog().dirty) { e.preventDefault(); e.returnValue = ''; } });

  const api = {
    get on() { return on; },
    toggle(force) {
      if (!(force ?? !on)) document.activeElement?.blur?.(); // a text being typed is kept before leaving
      on = force ?? !on;
      document.body.classList.toggle('is-editing', on); bar.hidden = !on;
      onToggle?.(on);
      if (on) state(!SINGLE() && backendMode() === 'local' ? 'غير متصل: التعديل يُحفظ في هذا المتصفح فقط — اربط GitHub من لوحة التحكم' : '', !SINGLE() && backendMode() === 'local' ? 'err' : '');
      paintHistory(); bind();
    },
    refresh: () => { if (on) bind(); },
    undo() {
      const op = undo.pop(); if (!op) return;
      if (commit({ ...op, value: op.before })) { show(op, op.before); redo.push(op); state('تراجع ✓', 'ok'); } else undo.push(op);
      paintHistory(); api.refresh();
    },
    redo() {
      const op = redo.pop(); if (!op) return;
      if (commit(op)) { show(op, op.value); undo.push(op); state('إعادة ✓', 'ok'); } else redo.push(op);
      paintHistory(); api.refresh();
    },
    saved() { const l = readLog(); l.dirty = false; writeLog(l); state('حُفظت النسخة ✓', 'ok'); },
    state,
  };
  return api;
}
