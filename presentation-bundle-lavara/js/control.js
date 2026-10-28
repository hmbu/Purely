// Control panel: structure tree, schema-driven slide editor, brands, global settings, Decision Point + Closing,
// live show remote, backups. Every edit is pushed live to the show and auto-saved to content.json.
import { $, $$, esc, uid, clone, debounce, fmtClock } from './core/util.js';
import { watchForUpdates } from './core/fresh.js';
const BUNDLE_SKY = ['meadow', 'sunrise', 'bloom', 'rhythm', 'skybubbles']; // Bundle styles that replace the green ground
import { projectsOf, allProjectsOf, sectionsOf, slidesOf, locate } from './core/model.js';
import { loadContent, saveContent, hasServer, hasGithub, backendMode, githubConfig, setGithubConfig, testGithub, listBackups, getBackup, makeBackup, uploadFile, listFiles, serverInfo, getDecisionLog } from './core/store.js';
import { createSync } from './core/sync.js';
import { TEMPLATES, TEMPLATE_ORDER, TRANSITIONS, BG_OPTIONS, newSlide, slideLabel } from './core/templates.js';

let C = null;                       // the content being edited
let sel = null;                     // { kind: 'project'|'section'|'slide', id }
let tab = 'content';
let brandPid = null;
let previewOverride = null;
let liveState = null;
const collapsed = new Set();
const hist = { stack: [], idx: -1, lastKey: null, lastT: 0 };
let fsaHandle = null;

/* ======================================================================= tiny DOM helper */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.setAttribute('style', v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function setPath(o, p, v) { const ks = p.split('.'); let a = o; ks.slice(0, -1).forEach(k => { if (a[k] == null || typeof a[k] !== 'object') a[k] = /^\d+$/.test(k) ? [] : {}; a = a[k]; }); a[ks.at(-1)] = v; }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2200); }

/* ======================================================================= sync, save, history, preview */
const sync = createSync('control', msg => {
  if (msg.type === 'state' && msg.role === 'show') {
    liveState = msg.state; renderLive();
    postPreview({ type: 'decisions', selections: liveState.decision?.selections || {} });
  }
});
sync.onStatus(st => {
  const c = $('#conn'); c.className = 'conn ' + (st.ws ? 'ok' : st.bc ? 'local' : '');
  $('b', c).textContent = st.ws ? 'متصل' : st.bc ? 'نفس الجهاز' : 'غير متصل';
});

const pushLive = debounce(() => sync.send('content', { content: C }), 250);
const scheduleSave = debounce(() => doSave(false, 'auto', true), 1200);
function setSaveState(text, cls = '') { const s = $('#saveState'); s.textContent = text; s.className = 'save-state ' + cls; }
// auto = background save after an edit; in GitHub mode that only caches locally, "Publish" commits.
async function doSave(backup, reason = 'manual', auto = false) {
  const mode = backendMode();
  if (mode === 'github' && auto) { await saveContent(C, { publish: false }); setSaveState('تغييرات غير منشورة — اضغط «نشر»', 'dirty'); return; }
  setSaveState(mode === 'github' ? 'جارٍ النشر على GitHub…' : 'جارٍ الحفظ…');
  try {
    if (mode === 'server' || mode === 'github') await saveContent(C, { backup, reason });
    else if (fsaHandle) { const w = await fsaHandle.createWritable(); await w.write(JSON.stringify(C, null, 2)); await w.close(); }
    else { await saveContent(C); setSaveState('محفوظ في هذا المتصفح فقط — اربط GitHub من تبويب «النشر»', 'dirty'); return; }
    const t = new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    setSaveState(mode === 'github' ? `نُشر ✓ ${t} — يظهر في الموقع خلال دقيقة` : 'محفوظ ✓ ' + t);
  } catch (e) {
    if (e.conflict) {
      setSaveState('لم يُنشر: المحتوى تغيّر على GitHub بعد فتح اللوحة', 'err');
      if (confirm('المحتوى المنشور تغيّر بعد فتحك لهذه اللوحة (من جهاز آخر أو تحديث جديد).\n\nإلغاء (موصى به): لا شيء يُستبدل. حدّث الصفحة لجلب آخر نسخة ثم أعد تعديلك.\nموافق: انشر نسختك واستبدل التغييرات الأحدث.')) {
        try { await saveContent(C, { backup, reason, force: true }); setSaveState('نُشر ✓ (استُبدلت النسخة الأحدث)'); } catch (e2) { setSaveState('خطأ في الحفظ: ' + e2.message, 'err'); }
      }
      return;
    }
    setSaveState('خطأ في الحفظ: ' + e.message, 'err');
  }
}
function pushHistory(key) {
  const snap = JSON.stringify(C), now = Date.now();
  if (key && key === hist.lastKey && now - hist.lastT < 1200 && hist.idx >= 0) hist.stack[hist.idx] = snap;
  else { hist.stack = hist.stack.slice(0, hist.idx + 1); hist.stack.push(snap); if (hist.stack.length > 100) hist.stack.shift(); hist.idx = hist.stack.length - 1; }
  hist.lastKey = key; hist.lastT = now; updateUndo();
}
function updateUndo() { $('#undoBtn').disabled = hist.idx <= 0; $('#redoBtn').disabled = hist.idx >= hist.stack.length - 1; }
function undoRedo(d) {
  const i = hist.idx + d; if (i < 0 || i >= hist.stack.length) return;
  hist.idx = i; hist.lastKey = null; C = JSON.parse(hist.stack[i]);
  if (sel && !locate(C, sel.id)) sel = null;
  renderAll(); pushLive(); pushPreview(); scheduleSave(); setSaveState('تغييرات غير محفوظة', 'dirty'); updateUndo();
}
// Call after every edit. key: coalesces typing into one undo step.
function commit({ key = null, tree = false, editor = false } = {}) {
  C.meta = { ...(C.meta || {}), updatedAt: new Date().toISOString() };
  pushHistory(key);
  if (tree) renderTree();
  if (editor) renderTabs();
  pushLive(); pushPreview(); scheduleSave();
  setSaveState('تغييرات غير محفوظة', 'dirty');
}

let previewReady = false;
const iframe = $('#preview');
addEventListener('message', e => { if (e.data?.type === 'preview-ready') { previewReady = true; pushPreview(); } });
function postPreview(m) { if (previewReady) iframe.contentWindow.postMessage(m, '*'); }
function previewTarget() {
  if (previewOverride) return previewOverride;
  if (tab === 'global') return { level: 'universe' };
  if (tab === 'decision') return { level: 'decision' };
  if (tab === 'brands') { const p = C.projects.find(x => x.id === brandPid); const s = p && sectionsOf(p)[0]; return p ? (s ? { projectId: p.id, sectionId: s.id, slideId: (s.slides || [])[0]?.id } : { projectId: p.id }) : { level: 'universe' }; }
  if (!sel) return { level: 'universe' };
  const loc = locate(C, sel.id); if (!loc) return { level: 'universe' };
  if (loc.kind === 'slide') return { projectId: loc.project.id, sectionId: loc.section.id, slideId: loc.slide.id };
  if (loc.kind === 'section') return { projectId: loc.project.id, sectionId: loc.section.id, slideId: (loc.section.slides || [])[0]?.id };
  return { projectId: loc.project.id };
}
const pushPreview = debounce((animate = false) => {
  const t = previewTarget();
  postPreview({ type: 'content', content: C, target: t, animate });
  const loc = t.slideId ? locate(C, t.slideId) : null;
  $('#previewInfo').textContent = loc ? `${loc.project.name} › ${loc.section.title} › ${slideLabel(loc.slide)}` : t.level ? ({ universe: 'البداية (Universe)', decision: 'نقطة القرار', closing: 'الختام' }[t.level]) : t.projectId ? 'صفحة المشروع' : '';
}, 140);

/* ======================================================================= ids + structure helpers */
function ensureIds(c) {
  for (const p of c.projects || []) { p.id ||= uid('p'); p.sections ||= []; for (const s of p.sections) { s.id ||= uid('sec'); s.slides ||= []; for (const sl of s.slides) sl.id ||= uid('sl'); } }
  for (const g of c.decision?.groups || []) { g.id ||= uid('dg'); for (const o of g.options || []) o.id ||= uid('do'); }
  for (const l of c.settings?.headerLogos?.items || []) l.id ||= uid('logo');
}
function containerOf(kind, id) {
  if (kind === 'project') { const i = C.projects.findIndex(p => p.id === id); return { arr: C.projects, i }; }
  for (const p of C.projects) {
    if (kind === 'section') { const i = p.sections.findIndex(s => s.id === id); if (i >= 0) return { arr: p.sections, i, parent: p }; }
    else for (const s of p.sections) { const i = s.slides.findIndex(x => x.id === id); if (i >= 0) return { arr: s.slides, i, parent: s }; }
  }
  return null;
}
function reId(node, kind) {
  const n = clone(node);
  if (kind === 'project') { n.id = uid('p'); n.sections.forEach(s => { s.id = uid('sec'); s.slides.forEach(x => x.id = uid('sl')); }); }
  if (kind === 'section') { n.id = uid('sec'); n.slides.forEach(x => x.id = uid('sl')); }
  if (kind === 'slide') n.id = uid('sl');
  return n;
}
function duplicateNode(kind, id) {
  const c = containerOf(kind, id); if (!c) return;
  const copy = reId(c.arr[c.i], kind);
  if (kind === 'project') { copy.name += ' (نسخة)'; if (copy.nameAr) copy.nameAr += ' (نسخة)'; }
  if (kind === 'section') copy.title += ' (نسخة)';
  c.arr.splice(c.i + 1, 0, copy); sel = { kind, id: copy.id }; commit({ tree: true, editor: true });
}
function deleteNode(kind, id) {
  const c = containerOf(kind, id); if (!c) return;
  const name = kind === 'slide' ? slideLabel(c.arr[c.i]) : (c.arr[c.i].title || c.arr[c.i].name);
  if (!confirm(`حذف «${name}»؟ يمكنك التراجع بـ Ctrl+Z.`)) return;
  if (kind === 'project' && c.arr[c.i].kind === 'shared') C.sharedRemoved = true; // otherwise the default shared area returns on load
  c.arr.splice(c.i, 1);
  const nb = c.arr[Math.min(c.i, c.arr.length - 1)];
  sel = nb ? { kind, id: nb.id } : c.parent ? { kind: kind === 'slide' ? 'section' : 'project', id: c.parent.id } : null;
  commit({ tree: true, editor: true });
}
function toggleHidden(kind, id) { const c = containerOf(kind, id); if (!c) return; c.arr[c.i].hidden = !c.arr[c.i].hidden; commit({ tree: true, editor: true }); }
function addSection(p) {
  const s = { id: uid('sec'), title: 'قسم جديد', titleEn: '', hidden: false, slides: [newSlide('title', uid)] };
  p.sections.push(s); collapsed.delete(p.id); sel = { kind: 'section', id: s.id }; commit({ tree: true, editor: true });
}
function addSlide(sec, template = 'title', afterId = null) {
  const sl = newSlide(template, uid);
  const i = afterId ? sec.slides.findIndex(x => x.id === afterId) : -1;
  if (i >= 0) sec.slides.splice(i + 1, 0, sl); else sec.slides.push(sl);
  collapsed.delete(sec.id); sel = { kind: 'slide', id: sl.id }; commit({ tree: true, editor: true });
}
function addProject() {
  const base = C.projects[0]?.brand ? clone(C.projects[0].brand) : { colors: {}, palette: [], texture: 'bubbles', textureColors: ['#333333', '#777777', '#aaaaaa', '#dddddd'] };
  base.logo = ''; base.mark = '';
  const p = { id: uid('p'), name: 'New Project', nameAr: 'مشروع جديد', tagline: '', hidden: false, brand: base, sections: [] };
  C.projects.push(p); sel = { kind: 'project', id: p.id }; addSection(p);
}
function moveNode(kind, id, targetKind, targetId, pos) {
  const src = containerOf(kind, id); if (!src) return;
  if (kind === targetKind && id === targetId) return;
  const [node] = src.arr.splice(src.i, 1);
  if (pos === 'into') {
    const t = locate(C, targetId);
    const arr = kind === 'slide' ? t.section.slides : t.project.sections;
    arr.push(node); collapsed.delete(targetId);
  } else {
    const dst = containerOf(targetKind, targetId);
    if (!dst) { src.arr.splice(src.i, 0, node); return; }
    dst.arr.splice(dst.i + (pos === 'after' ? 1 : 0), 0, node);
  }
  commit({ tree: true, editor: true });
}

/* ======================================================================= tree */
let drag = null;
function treeNode(kind, obj, label, extra = {}) {
  const isSel = sel?.id === obj.id;
  const ops = h('span', { class: 'ops' });
  if (kind === 'project') ops.append(h('button', { title: 'إضافة قسم', onclick: e => { e.stopPropagation(); addSection(obj); } }, '+'));
  if (kind === 'section') ops.append(h('button', { title: 'إضافة شريحة', onclick: e => { e.stopPropagation(); addSlide(obj); } }, '+'));
  ops.append(
    h('button', { title: obj.hidden ? 'إظهار' : 'إخفاء', onclick: e => { e.stopPropagation(); toggleHidden(kind, obj.id); } }, obj.hidden ? '◌' : '◉'),
    h('button', { title: 'تكرار', onclick: e => { e.stopPropagation(); duplicateNode(kind, obj.id); } }, '⧉'),
    h('button', { title: 'حذف', onclick: e => { e.stopPropagation(); deleteNode(kind, obj.id); } }, '✕'),
  );
  const hasKids = kind !== 'slide';
  const el = h('div', { class: `node n-${kind} ${isSel ? 'sel' : ''} ${obj.hidden ? 'is-hidden' : ''} ${collapsed.has(obj.id) ? 'collapsed' : ''}`, draggable: 'true', 'data-kind': kind, 'data-id': obj.id,
    onclick: () => { sel = { kind, id: obj.id }; previewOverride = null; renderTree(); renderEditor(); pushPreview(true); },
    ondblclick: () => rename(kind, obj) },
    hasKids ? h('span', { class: 'tw', onclick: e => { e.stopPropagation(); collapsed.has(obj.id) ? collapsed.delete(obj.id) : collapsed.add(obj.id); renderTree(); } }, collapsed.has(obj.id) ? '◂' : '▾') : h('span', { class: 'num' }, extra.num),
    h('span', { class: 'lbl' }, label), extra.tag ? h('span', { class: 'tag' }, extra.tag) : null, ops);
  el.addEventListener('dragstart', e => { drag = { kind, id: obj.id }; e.dataTransfer.effectAllowed = 'move'; e.stopPropagation(); });
  el.addEventListener('dragend', () => { drag = null; $$('.node').forEach(n => n.classList.remove('drop-before', 'drop-after', 'drop-into')); });
  el.addEventListener('dragover', e => {
    if (!drag) return;
    const pos = dropPos(e, el, kind);
    if (!pos) return;
    e.preventDefault(); e.stopPropagation();
    $$('.node').forEach(n => n.classList.remove('drop-before', 'drop-after', 'drop-into'));
    el.classList.add('drop-' + pos);
  });
  el.addEventListener('dragleave', () => el.classList.remove('drop-before', 'drop-after', 'drop-into'));
  el.addEventListener('drop', e => { if (!drag) return; const pos = dropPos(e, el, kind); if (!pos) return; e.preventDefault(); e.stopPropagation(); const d = drag; drag = null; moveNode(d.kind, d.id, kind, obj.id, pos); });
  return el;
}
function dropPos(e, el, kind) {
  if (drag.kind === kind) { const r = el.getBoundingClientRect(); return e.clientY < r.top + r.height / 2 ? 'before' : 'after'; }
  if ((drag.kind === 'slide' && kind === 'section') || (drag.kind === 'section' && kind === 'project')) return 'into';
  return null;
}
function rename(kind, obj) {
  const key = kind === 'project' ? 'nameAr' : kind === 'section' ? 'title' : null;
  if (!key) return;
  const v = prompt('الاسم الجديد', obj[key] || ''); if (v == null) return;
  obj[key] = v; commit({ tree: true, editor: true });
}
function renderTree() {
  const t = $('#tree'); t.innerHTML = '';
  for (const p of C.projects) {
    t.append(treeNode('project', p, p.nameAr || p.name, { tag: p.name }));
    const pk = h('div', { class: 'kids' });
    p.sections.forEach((s, si) => {
      pk.append(treeNode('section', s, `${si + 1}. ${s.title}`, { tag: String(s.slides.length) }));
      const sk = h('div', { class: 'kids' });
      s.slides.forEach((sl, i) => sk.append(treeNode('slide', sl, slideLabel(sl), { num: i + 1, tag: TEMPLATES[sl.template]?.name })));
      pk.append(sk);
    });
    t.append(pk);
  }
}

/* ======================================================================= field widgets */
function fieldRow(label, control, note) {
  return h('div', { class: 'field' }, h('label', {}, label), h('div', {}, control, note ? h('div', { class: 'muted small' }, note) : null));
}
// Renders one schema field bound to obj[f.key] (dot paths allowed).
function renderField(f, obj, ctx) {
  const key = f.key, get = () => getPath(obj, key), set = (v, opts = {}) => { setPath(obj, key, v); ctx.onChange?.(); commit({ key: ctx.path + '.' + key, ...opts }); };
  const v = get();
  switch (f.type) {
    case 'text': return fieldRow(f.label, h('input', { type: 'text', value: v ?? '', dir: 'auto', oninput: e => set(e.target.value) }), f.note);
    case 'textarea': return fieldRow(f.label, h('textarea', { rows: f.rows || 3, dir: 'auto', oninput: e => set(e.target.value) }, v ?? ''), f.note);
    case 'number': return fieldRow(f.label, h('input', { type: 'number', value: v ?? '', step: f.step || 1, oninput: e => set(e.target.value === '' ? null : +e.target.value) }), f.note);
    case 'select': {
      const opts = typeof f.options === 'function' ? f.options() : f.options;
      const s = h('select', { onchange: e => set(e.target.value, { editor: !!f.rerender, tree: !!f.rerender }) }, ...opts.map(([val, lab]) => h('option', { value: val, selected: String(v ?? '') === String(val) }, lab)));
      return fieldRow(f.label, s, f.note);
    }
    case 'toggle': return fieldRow(f.label, h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: !!v, onchange: e => set(e.target.checked, { tree: !!f.rerender, editor: !!f.rerender }) }), h('span', {}, f.on || 'مفعّل')), f.note);
    case 'range': {
      const out = h('output', {}, v ?? '');
      return fieldRow(f.label, h('div', { class: 'range-row' }, h('input', { type: 'range', min: f.min, max: f.max, step: f.step || 1, value: v ?? f.min, oninput: e => { out.textContent = e.target.value; set(+e.target.value); } }), out), f.note);
    }
    case 'color': {
      const txt = h('input', { type: 'text', value: v || '', oninput: e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) { pick.value = e.target.value; set(e.target.value.toUpperCase()); } } });
      const pick = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(v || '') ? v : '#000000', oninput: e => { txt.value = e.target.value.toUpperCase(); set(e.target.value.toUpperCase()); } });
      return fieldRow(f.label, h('div', { class: 'color-row' }, pick, txt), f.note);
    }
    case 'image': return fieldRow(f.label, mediaWidget(obj, key, { kind: 'image', simple: f.simple, focal: !f.simple }, ctx), f.note);
    case 'media': return fieldRow(f.label, mediaWidget(obj, key, { kind: 'any', simple: true }, ctx), f.note);
    case 'video': {
      if (!v || typeof v !== 'object') setPath(obj, key, { src: typeof v === 'string' ? v : '', poster: '', autoplay: true, muted: false, loop: true });
      const vo = get();
      const box = h('div', {},
        mediaWidget(vo, 'src', { kind: 'video', simple: true }, ctx),
        h('div', { style: 'margin-top:8px' }, h('div', { class: 'muted small' }, 'صورة الغلاف (Poster)'), mediaWidget(vo, 'poster', { kind: 'image', simple: true }, ctx)),
        h('div', { class: 'inline', style: 'margin-top:8px' },
          ...[['autoplay', 'تشغيل تلقائي عند الوصول'], ['muted', 'كتم صوت هذا الفيديو'], ['loop', 'تكرار']].map(([k, l]) => h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: k === 'muted' ? vo[k] === true : vo[k] !== false, onchange: e => { vo[k] = e.target.checked; commit({}); } }), l))));
      return fieldRow(f.label, box, 'MP4 (4K مفضّل، 1080p مقبول). يتوقف عند المغادرة حسب الإعداد العام.');
    }
    case 'list': return listWidget(f, obj, ctx);
    default: return fieldRow(f.label, h('span', { class: 'muted' }, `(${f.type})`));
  }
}
function renderFields(fields, obj, ctx) { return fields.map(f => renderField(f, obj, ctx)); }

function listWidget(f, obj, ctx) {
  if (!Array.isArray(getPath(obj, f.key))) setPath(obj, f.key, []);
  const arr = getPath(obj, f.key);
  const box = h('div', { class: 'list' });
  arr.forEach((item, i) => {
    const isObj = item && typeof item === 'object';
    const head = h('div', { class: 'list-item-head' }, h('b', {}, `${i + 1}`), h('span', {},
      h('button', { class: 'sm', title: 'أعلى', disabled: i === 0, onclick: () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); commit({ editor: true }); } }, '↑'),
      h('button', { class: 'sm', title: 'أسفل', disabled: i === arr.length - 1, onclick: () => { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); commit({ editor: true }); } }, '↓'),
      h('button', { class: 'sm', title: 'تكرار', onclick: () => { const c = clone(item); if (c && c.id) c.id = uid('i'); arr.splice(i + 1, 0, c); commit({ editor: true }); } }, '⧉'),
      h('button', { class: 'sm danger', title: 'حذف', onclick: () => { arr.splice(i, 1); commit({ editor: true }); } }, '✕')));
    const body = isObj ? renderFields(f.item, item, { ...ctx, path: `${ctx.path}.${f.key}.${i}` }) : [];
    box.append(h('div', { class: 'list-item' }, head, ...body));
  });
  box.append(h('div', {}, h('button', { onclick: () => { arr.push(typeof f.newItem === 'function' ? f.newItem() : clone(f.newItem || {})); commit({ editor: true }); } }, '+ إضافة')));
  return fieldRow(f.label, box, f.note);
}

const IMG_RE = /\.(jpe?g|png|webp|avif|gif|svg)$/i, VID_RE = /\.(mp4|webm|mov|m4v)$/i;
function mediaWidget(obj, key, { kind = 'image', simple = false, focal = false } = {}, ctx = {}) {
  const raw = getPath(obj, key);
  const isObjVal = !simple;
  if (isObjVal && (raw == null || typeof raw !== 'object')) setPath(obj, key, { src: typeof raw === 'string' ? raw : '', fit: 'cover', focal: { x: 50, y: 50 } });
  const val = () => getPath(obj, key);
  const src = () => (isObjVal ? val()?.src : (typeof val() === 'object' ? val()?.src : val())) || '';
  const setSrc = s => { if (isObjVal) val().src = s; else setPath(obj, key, s); commit({}); paint(); input.value = s; };
  const thumb = h('div', { class: 'media-thumb' + (simple ? ' simple' : '') });
  const paint = () => {
    const s = src(); thumb.innerHTML = '';
    if (!s) { thumb.textContent = 'لا يوجد ملف'; return; }
    const url = new URL(s, location.href).href;
    thumb.append(VID_RE.test(s) ? h('video', { src: url, muted: true, autoplay: true, loop: true, playsinline: true }) : h('img', { src: url, alt: '' }));
    if (focal && val()?.focal) { const fp = val().focal; thumb.append(h('span', { class: 'focal', style: `left:${fp.x}%;top:${fp.y}%` })); }
    if (isObjVal && !simple) thumb.querySelector('img')?.setAttribute('style', `object-fit:${val().fit || 'cover'};object-position:${val().focal?.x ?? 50}% ${val().focal?.y ?? 50}%`);
  };
  if (focal) thumb.addEventListener('click', e => {
    const r = thumb.getBoundingClientRect();
    val().focal = { x: Math.round(((e.clientX - r.left) / r.width) * 100), y: Math.round(((e.clientY - r.top) / r.height) * 100) };
    commit({ key: ctx.path + key + '.focal' }); paint();
  });
  const input = h('input', { type: 'text', value: src(), dir: 'ltr', placeholder: 'assets/…', onchange: e => setSrc(e.target.value.trim()) });
  const file = h('input', { type: 'file', hidden: true, accept: kind === 'video' ? 'video/*' : kind === 'image' ? 'image/*' : 'image/*,video/*', onchange: async e => {
    const f = e.target.files[0]; if (!f) return;
    if (backendMode() === 'local') return toast('الرفع يتطلب المشغّل المحلي أو ربط GitHub (تبويب النشر)');
    toast('جارٍ الرفع…');
    if (f.size > 20 * 1024 * 1024) toast(`جارٍ رفع ${(f.size / 1048576).toFixed(0)}MB… قد يأخذ دقيقة أو أكثر، لا تغلق الصفحة`);
    try { setSrc(await uploadFile(f, ctx.uploadDir || 'assets/uploads', { onProgress: (i, n) => toast(i < n ? `جارٍ الرفع… الجزء ${i + 1} من ${n}` : 'اكتمل رفع الأجزاء') })); toast(f.size > 12 * 1048576 ? 'تم الرفع ✓ احفظ لينشر — يظهر الفيديو في العرض المنشور بعد دقيقتين تقريباً' : 'تم الرفع ✓ احفظ لينشر'); } catch (err) { toast('فشل الرفع: ' + (err.message || err)); console.error(err); }
  } });
  const ctl = h('div', { class: 'media-ctl' }, input,
    h('div', { class: 'inline' },
      h('button', { class: 'sm', onclick: () => pickAsset(kind, setSrc) }, 'اختيار من الملفات'),
      h('button', { class: 'sm', onclick: () => file.click() }, 'رفع ملف'),
      h('button', { class: 'sm danger', onclick: () => setSrc('') }, 'إزالة'), file),
    isObjVal ? h('div', { class: 'inline' }, h('span', { class: 'muted small' }, 'الملاءمة'),
      h('select', { onchange: e => { val().fit = e.target.value; commit({}); paint(); } }, h('option', { value: 'cover', selected: val().fit !== 'contain' }, 'تغطية (Cover)'), h('option', { value: 'contain', selected: val().fit === 'contain' }, 'احتواء (Contain)')),
      focal ? h('span', { class: 'muted small' }, 'اضغط على الصورة لتحديد نقطة التركيز') : null) : null,
    kind !== 'video' ? h('div', { class: 'muted small' }, 'صور ممتدة ≥ 3840px عرضاً، صور جانبية ≥ 2000px، الشعارات SVG') : null);
  paint();
  return h('div', { class: 'media' }, thumb, ctl);
}
async function pickAsset(kind, cb) {
  openModal('اختيار ملف', h('div', { class: 'muted' }, 'جارٍ التحميل…'));
  let files = [];
  try { files = await listFiles('assets'); } catch {}
  files = files.filter(f => (kind === 'video' ? VID_RE : kind === 'image' ? IMG_RE : /\.(jpe?g|png|webp|avif|gif|svg|mp4|webm|mov|m4v)$/i).test(f.path) && !f.path.includes('/fonts/'));
  const filter = h('input', { type: 'text', placeholder: 'بحث…', style: 'width:100%;margin-bottom:12px;padding:8px', oninput: e => draw(e.target.value) });
  const grid = h('div', { class: 'asset-grid' });
  const draw = q => {
    grid.innerHTML = '';
    for (const f of files.filter(f => !q || f.path.toLowerCase().includes(q.toLowerCase()))) {
      const url = new URL(f.path, location.href).href;
      grid.append(h('button', { class: 'asset', onclick: () => { closeModal(); cb(f.path); } },
        h('div', { class: 'th', style: IMG_RE.test(f.path) ? `background-image:url("${url}")` : '' }, VID_RE.test(f.path) ? '▶ فيديو' : ''),
        h('span', { dir: 'ltr' }, f.path.replace(/^assets\//, ''))));
    }
    if (!grid.children.length) grid.append(h('div', { class: 'muted' }, backendMode() !== 'local' ? 'لا توجد ملفات مطابقة.' : 'قائمة الملفات تتطلب المشغّل المحلي أو ربط GitHub.'));
  };
  draw('');
  openModal('اختيار ملف', h('div', {}, filter, grid));
}
function openModal(title, body) { $('#modalTitle').textContent = title; const b = $('#modalBody'); b.innerHTML = ''; b.append(body); $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; }
$('#modalClose').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

/* ======================================================================= editors */
function group(title, ...kids) { return h('div', { class: 'group' }, title ? h('h3', {}, title) : null, ...kids); }
function renderEditor() {
  const ed = $('#editor'); ed.innerHTML = '';
  const loc = sel ? locate(C, sel.id) : null;
  if (!loc) { ed.append(h('h2', {}, 'اختر عنصراً من الهيكل'), h('p', { class: 'muted' }, 'المشاريع ← الأقسام ← الشرائح. كل شيء قابل للإضافة والحذف والتكرار والإخفاء وإعادة الترتيب.')); return; }
  const upload = `assets/${loc.project.id}/uploads`;
  if (loc.kind === 'project') {
    const p = loc.project;
    ed.append(h('h2', {}, p.nameAr || p.name), h('div', { class: 'sub' }, 'مشروع'));
    ed.append(group('البيانات', ...renderFields([
      { key: 'name', type: 'text', label: 'الاسم (لاتيني)', note: 'يظهر في مسار التنقل' },
      { key: 'nameAr', type: 'text', label: 'الاسم بالعربية' },
      { key: 'tagline', type: 'text', label: 'السطر التعريفي' },
      { key: 'hidden', type: 'toggle', label: 'إخفاء من العرض', rerender: true },
    ], p, { path: p.id, uploadDir: upload, onChange: renderTreeSoon })));
    ed.append(group('الأقسام', h('div', { class: 'list' }, ...p.sections.map((s, i) => h('button', { onclick: () => { sel = { kind: 'section', id: s.id }; renderTree(); renderEditor(); pushPreview(true); } }, `${i + 1}. ${s.title} — ${s.slides.length} شرائح`))),
      h('div', { class: 'inline', style: 'margin-top:10px' }, h('button', { onclick: () => addSection(p) }, '+ قسم'), h('button', { onclick: () => { brandPid = p.id; switchTab('brands'); } }, 'تحرير هوية المشروع ←'))));
    return;
  }
  if (loc.kind === 'section') {
    const s = loc.section;
    ed.append(h('h2', {}, s.title), h('div', { class: 'sub' }, `قسم في ${loc.project.nameAr || loc.project.name}`));
    ed.append(group('البيانات', ...renderFields([
      { key: 'title', type: 'text', label: 'اسم القسم' },
      { key: 'titleEn', type: 'text', label: 'الاسم الإنجليزي (Eyebrow)' },
      { key: 'desc', type: 'text', label: 'وصف قصير تحت العنوان (صفحة المشروع)' },
      { key: 'hidden', type: 'toggle', label: 'إخفاء من العرض', rerender: true },
    ], s, { path: s.id, uploadDir: upload, onChange: renderTreeSoon })));
    ed.append(group('إضافة شريحة بقالب', templatePicker(null, t => addSlide(s, t))));
    return;
  }
  const sl = loc.slide, tpl = TEMPLATES[sl.template] || TEMPLATES.title;
  const list = loc.section.slides, i = list.indexOf(sl);
  ed.append(h('div', { class: 'inline', style: 'justify-content:space-between' },
    h('div', {}, h('h2', {}, slideLabel(sl)), h('div', { class: 'sub' }, `${loc.project.nameAr || loc.project.name} › ${loc.section.title} › شريحة ${i + 1} من ${list.length} · ${tpl.name}`)),
    h('div', { class: 'inline' },
      h('button', { disabled: i === 0, onclick: () => { sel = { kind: 'slide', id: list[i - 1].id }; renderTree(); renderEditor(); pushPreview(true); } }, '→ السابقة'),
      h('button', { disabled: i === list.length - 1, onclick: () => { sel = { kind: 'slide', id: list[i + 1].id }; renderTree(); renderEditor(); pushPreview(true); } }, 'التالية ←'),
      h('button', { onclick: () => addSlide(loc.section, sl.template, sl.id) }, '+ بعدها'),
      h('button', { onclick: () => duplicateNode('slide', sl.id) }, 'تكرار'),
      h('button', { class: 'danger', onclick: () => deleteNode('slide', sl.id) }, 'حذف'))));
  ed.append(group('القالب', templatePicker(sl.template, t => changeTemplate(sl, t))));
  ed.append(group('المحتوى', ...renderFields(tpl.fields, sl.data, { path: sl.id, uploadDir: upload, onChange: renderTreeSoon })));
  ed.append(group('العرض', ...renderFields([
    { key: 'transition', type: 'select', label: 'انتقال الدخول', options: TRANSITIONS.map(t => [t.id, t.name]) },
    { key: 'bg', type: 'select', label: 'الخلفية', options: () => [...BG_OPTIONS.map(b => [b.id, b.name]), ...(sl.bg?.startsWith('#') ? [[sl.bg, 'لون مخصص ' + sl.bg]] : []), ['#custom', 'لون مخصص…']], rerender: true },
    ...(sl.bg?.startsWith('#') && sl.bg !== '#custom' ? [{ key: 'bg', type: 'color', label: 'لون الخلفية' }] : []),
    { key: 'hidden', type: 'toggle', label: 'إخفاء الشريحة', rerender: true },
    { key: 'notes', type: 'textarea', rows: 4, label: 'ملاحظات المقدّم', note: 'تظهر في الريموت فقط' },
  ], sl, { path: sl.id + '.meta', onChange: () => { if (sl.bg === '#custom') sl.bg = '#EEEEEE'; renderTreeSoon(); } })));
}
const renderTreeSoon = debounce(() => renderTree(), 300);
function templatePicker(current, onPick) {
  return h('div', { class: 'tpl-grid' }, ...TEMPLATE_ORDER.map(id => {
    const t = TEMPLATES[id];
    return h('button', { class: 'tpl-card' + (id === current ? ' is-on' : ''), onclick: () => onPick(id) }, h('b', {}, t.name), h('small', { class: 'latin' }, t.en), t.suggested ? h('small', {}, 'مقترح لـ: ' + t.suggested) : null);
  }));
}
function changeTemplate(sl, id) {
  if (sl.template === id) return;
  const keep = {}; for (const k of ['eyebrow', 'title', 'body', 'image']) if (sl.data?.[k] != null && TEMPLATES[id].defaults[k] !== undefined) keep[k] = sl.data[k];
  sl.template = id; sl.data = { ...clone(TEMPLATES[id].defaults), ...keep };
  commit({ tree: true, editor: true });
}

/* ---------- brands */
const COLOR_FIELDS = [['primary', 'الأساسي'], ['secondary', 'الثانوي'], ['accent', 'لون مميز'], ['background', 'الخلفية'], ['surface', 'السطح الفاتح'], ['dark', 'الداكن'], ['text', 'النص'], ['title', 'العناوين'], ['textLight', 'النص على الداكن']];
const fontOptions = (inherit) => [...(inherit ? [['', '— مثل الإعداد العام —']] : []), ...(C.fonts || []).map(f => [f.id, f.name || f.id])];
const WEIGHTS = [['300', 'Light 300'], ['400', 'Regular 400'], ['500', 'Medium 500'], ['700', 'Bold 700'], ['900', 'Black 900']];
function renderBrands() {
  const sp = $('#brandProject');
  if (!brandPid || !C.projects.find(p => p.id === brandPid)) brandPid = C.projects[0]?.id;
  sp.innerHTML = ''; C.projects.forEach(p => sp.append(h('option', { value: p.id, selected: p.id === brandPid }, `${p.nameAr || ''} · ${p.name}`)));
  sp.onchange = () => { brandPid = sp.value; renderBrands(); pushPreview(true); };
  const f = $('#brandForm'); f.innerHTML = '';
  const p = C.projects.find(x => x.id === brandPid); if (!p) return;
  p.brand ||= {}; const b = p.brand; b.colors ||= {}; b.textureColors ||= ['#333333', '#666666', '#999999', '#CCCCCC'];
  const ctx = { path: 'brand-' + p.id, uploadDir: `assets/${p.id}` };
  f.append(group('المشروع', ...renderFields([{ key: 'name', type: 'text', label: 'الاسم (لاتيني)' }, { key: 'nameAr', type: 'text', label: 'الاسم بالعربية' }, { key: 'tagline', type: 'text', label: 'السطر التعريفي' }], p, { ...ctx, onChange: renderTreeSoon })));
  if (b.texture !== 'mist') { // one tap: the whole of Bundle in green (its original look) or in sky blue, transitions included
    const pick = v => { b.textureStyle = v; commit({ key: ctx.path + '.textureStyle' }); renderBrands(); };
    const cur = b.textureStyle === 'skybubbles' ? 'sky' : (BUNDLE_SKY.includes(b.textureStyle) ? '' : 'green');
    f.append(group('لون بندل بالكامل (الخلفيات والانتقالات)', h('div', { class: 'row', style: 'gap:10px;flex-wrap:wrap' },
      h('button', { class: 'btn' + (cur === 'green' ? ' primary' : ''), onclick: () => pick('orbs') }, 'أخضر — الهوية الأصلية'),
      h('button', { class: 'btn' + (cur === 'sky' ? ' primary' : ''), onclick: () => pick('skybubbles') }, 'سماوي — فقاعات ملوّنة'))));
  }
  if (b.texture !== 'mist') f.append(group('خلفية بندل المتحركة', renderField({ key: 'textureStyle', type: 'select', label: 'اختر شكل الخلفية', options: [['bubbles', 'فقاعات تندمج (السابق)'],
    ['orbs', '١ · كرات منفصلة تطفو ولا تندمج'], ['strips', '٢ · شرائط بأشكال الهوية'], ['stacks', '٣ · أعمدة دوائر متحركة'], ['meadow', '٤ · أرضية كريمية · أشكال تطفو وتدور'], ['sunrise', '٥ · أرضية سماوية · أنصاف دوائر تشرق وتغيب'], ['bloom', '٦ · أرضية وردية · حقل دوائر يتنفس'], ['rhythm', '٧ · أرضية ليموني · أعمدة ترتفع وتنخفض'], ['orbit', '٨ · أرضية خضراء · كرات في مدارات'], ['skybubbles', '٩ · أرضية سماوية · فقاعات ملوّنة تصعد']] }, b, ctx)));
  if (b.texture === 'mist') f.append(group('خلفية لافارا المتحركة', renderField({ key: 'textureStyle', type: 'select', label: 'اختر شكل الخلفية', options: [['mist', 'الضباب (السابق)'],
    ['silk', '١ · سائل صابون — طيّات حريرية'], ['lather', '٢ · سائل صابون مع رغوة خفيفة'], ['pour', '٣ · سائل صابون ينساب للأسفل'],
    ['drop', '٤ · قطرات على سائل كثيف'], ['swirl', '٥ · دوامة سائل وكريم'], ['soap', '٦ · صابون طبيعي — رخام'],
    ['amber', '٧ · ضوء العطر — زجاج كهرماني']] }, b, ctx)));
  f.append(group('الشعارات (SVG أحادي اللون يُلوَّن تلقائياً)', ...renderFields([
    { key: 'logo', type: 'image', simple: true, label: 'الشعار الرئيسي' },
    { key: 'mark', type: 'image', simple: true, label: 'الرمز (Isotype)' },
    { key: 'endorsed', type: 'image', simple: true, label: 'شعار مع التوقيع (اختياري)' },
  ], b, ctx)));
  f.append(group('الألوان', ...renderFields(COLOR_FIELDS.map(([k, l]) => ({ key: 'colors.' + k, type: 'color', label: l })), b, ctx)));
  f.append(group('لوحة الألوان (لوحة الهوية)', renderField({ key: 'palette', type: 'list', label: 'الألوان', item: [{ key: 'hex', type: 'color', label: 'اللون' }, { key: 'name', type: 'text', label: 'الاسم' }], newItem: { hex: '#888888', name: '' } }, b, ctx)));
  f.append(group('ملمس الانتقال والحركة', ...renderFields([
    { key: 'texture', type: 'select', label: 'نوع الملمس', options: [['bubbles', 'فقاعات تندمج — Bundle'], ['mist', 'ضباب ونسيم — Lavara']] },
    ...[0, 1, 2, 3].map(i => ({ key: 'textureColors.' + i, type: 'color', label: i === 0 ? 'لون الملمس ١ (لون الغطاء)' : `لون الملمس ${i + 1}` })),
    { key: 'textureIntensity', type: 'range', label: 'الشدة', min: 0, max: 1.5, step: 0.05 },
  ], b, ctx)));
  f.append(group('صورة الغلاف في الشاشة الرئيسية', ...renderFields([
    { key: 'cover', type: 'image', simple: true, label: 'الصورة' },
    { key: 'coverTint', type: 'range', label: 'صبغة بلون الهوية', min: 0, max: 1, step: 0.02 },
    { key: 'coverFocal.x', type: 'range', label: 'نقطة التركيز أفقياً %', min: 0, max: 100, step: 1 },
    { key: 'coverFocal.y', type: 'range', label: 'نقطة التركيز عمودياً %', min: 0, max: 100, step: 1 },
  ], b, ctx)));
  f.append(group('الملمس الحي (للتصميمين السابقين)', ...renderFields([
    { key: 'universe.visual', type: 'select', label: 'الشكل', options: [['texture', 'ملمس الهوية الحي'], ['color', 'لون فقط'], ['image', 'صورة']] },
    { key: 'universe.background', type: 'color', label: 'لون الخلفية' },
    { key: 'universe.image', type: 'image', simple: true, label: 'الصورة (عند اختيار صورة)' },
  ], b, ctx)));

  f.append(group('الخطوط (تجاوز خاص — اتركه فارغاً لاستخدام نفس خطوط المشروعين)', ...renderFields([
    { key: 'typography.title.font', type: 'select', label: 'خط العناوين', options: () => fontOptions(true) },
    { key: 'typography.title.weight', type: 'select', label: 'وزن العناوين', options: [['', '— عام —'], ...WEIGHTS] },
    { key: 'typography.body.font', type: 'select', label: 'خط النص', options: () => fontOptions(true) },
    { key: 'typography.body.weight', type: 'select', label: 'وزن النص', options: [['', '— عام —'], ...WEIGHTS] },
  ], b, ctx)));
}

/* ---------- global */
function slideOptions() {
  const o = [['universe', 'البداية (Universe)']];
  for (const p of C.projects) for (const s of p.sections) s.slides.forEach((sl, i) => o.push([sl.id, `${p.name} › ${s.title} › ${i + 1}. ${slideLabel(sl)}`]));
  return o;
}
function renderGlobal() {
  const f = $('#globalForm'); f.innerHTML = '';
  const st = C.settings ||= {};
  const ctx = { path: 'settings', uploadDir: 'assets/logos' };
  f.append(group('واجهة البداية (Universe)', ...renderFields([
    { key: 'universe.layout', type: 'select', label: 'تصميم الشاشة الرئيسية', options: [['fusion', 'الأفق الحي — دمج ٨ و١٠ (المعتمد)'], ['cinema', '١ — سينمائي (صورتان كاملتان)'], ['portals', '٢ — بوابتان (نوافذ مقوّسة)'], ['monolith', '٣ — متحفي (طباعي هادئ)'], ['index', '٤ — فهرس تحريري'], ['title', '٥ — بطاقة افتتاحية'], ['monogram', '٦ — رمزان بلون الهوية'], ['cards', '٧ — بطاقتا دعوة'], ['horizon', '٨ — خط الأفق'], ['typestack', '٩ — طباعة ضخمة'], ['halves', 'نصفان بملمس حي (السابق)'], ['circles', 'دائرتان بملمس حي (السابق)']] },
    { key: 'universe.chooser', type: 'toggle', label: 'إظهار مبدّل الخيارات على الشاشة', note: 'للمراجعة فقط — أطفئه قبل العرض الفعلي' },
    { key: 'universe.eyebrow', type: 'text', label: 'عنوان صغير (فهرس تحريري)' },
    { key: 'universe.background', type: 'color', label: 'الخلفية' },
    { key: 'universe.text', type: 'color', label: 'لون النص والشعارات' },
    { key: 'universe.hint', type: 'text', label: 'تلميح سفلي' },
    { key: 'universe.showLogos', type: 'toggle', label: 'إظهار الشعارات أعلى الشاشة' },
    { key: 'universe.logosSize', type: 'range', label: 'حجم الشعارات في البداية', min: 0.5, max: 2, step: 0.05 },
  ], st, ctx)));
  f.append(group('الطابع العام', ...renderFields([
    { key: 'tone', type: 'select', label: 'الطابع', options: [['quiet', 'هادئ تنفيذي (موصى به)'], ['expressive', 'حيوي بملمس الهوية']], note: 'الهادئ: أغطية أقسام بلون الهوية وضوء ناعم، بدون فقاعات/ضباب بين الشرائح، وصفحة مشروع بأعمدة مرقمة.' },
  ], st, ctx)));
  f.append(group('الحركة', ...renderFields([
    { key: 'motion.speed', type: 'range', label: 'سرعة الحركة العامة', min: 0.5, max: 1.6, step: 0.05, note: '1 = الافتراضي. أقل = أبطأ وأهدأ.' },
    { key: 'motion.reduced', type: 'select', label: 'تقليل الحركة', options: [['auto', 'حسب إعداد الجهاز'], ['on', 'مفعّل دائماً'], ['off', 'معطّل']] },
    { key: 'motion.textureScale', type: 'range', label: 'دقة الملمس الداخلية', min: 0.25, max: 1, step: 0.05, note: 'يُطبق بعد إعادة تحميل العرض. 0.5 مناسب لـ 4K.' },
    { key: 'startAt', type: 'select', label: 'نقطة البداية', options: slideOptions },
  ], st, ctx)));
  f.append(group('واجهة العرض المصغرة', ...renderFields([
    { key: 'hud.breadcrumb', type: 'toggle', label: 'سطر أسفل الشرائح (الشعار · القسم · رقم الصفحة)' },
    { key: 'eyebrows', type: 'toggle', label: 'العناوين الصغيرة فوق عناوين الشرائح' },
    { key: 'hud.progress', type: 'toggle', label: 'شريط التقدم' },
    { key: 'hud.timer', type: 'toggle', label: 'مؤقت على الشاشة' },
  ], st, ctx)));
  f.append(group('الخطوط (لكل المشاريع)', ...renderFields([
    { key: 'typography.title.font', type: 'select', label: 'خط العناوين', options: () => fontOptions(false) },
    { key: 'typography.title.weight', type: 'select', label: 'وزن العناوين', options: WEIGHTS },
    { key: 'typography.title.scale', type: 'range', label: 'حجم العناوين', min: 0.6, max: 1.6, step: 0.02 },
    { key: 'typography.title.lineHeight', type: 'range', label: 'تباعد أسطر العناوين', min: 1, max: 1.8, step: 0.05 },
    { key: 'typography.body.font', type: 'select', label: 'خط النص', options: () => fontOptions(false) },
    { key: 'typography.body.weight', type: 'select', label: 'وزن النص', options: WEIGHTS },
    { key: 'typography.body.scale', type: 'range', label: 'حجم النص', min: 0.6, max: 1.6, step: 0.02 },
    { key: 'typography.body.lineHeight', type: 'range', label: 'تباعد أسطر النص', min: 1.2, max: 2.2, step: 0.05 },
  ], st, ctx), h('p', { class: 'muted small' }, 'لا يُضاف تباعد بين الحروف العربية أبداً.'), fontUploader()));
  f.append(group('شعارات الترويسة', ...renderFields([
    { key: 'headerLogos.show', type: 'toggle', label: 'إظهار' },
    { key: 'headerLogos.corner', type: 'select', label: 'الزاوية داخل المشاريع', options: [['top-left', 'أعلى اليسار'], ['top-right', 'أعلى اليمين'], ['bottom-left', 'أسفل اليسار'], ['bottom-right', 'أسفل اليمين']] },
    { key: 'headerLogos.size', type: 'range', label: 'الحجم', min: 0.5, max: 2, step: 0.05 },
    { key: 'headerLogos.gap', type: 'range', label: 'المسافة بين الشعارات', min: 0.5, max: 6, step: 0.1 },
    { key: 'headerLogos.autoContrast', type: 'toggle', label: 'تبديل فاتح/داكن تلقائياً حسب خلفية الشريحة' },
    { key: 'headerLogos.color', type: 'color', label: 'اللون الثابت (عند إيقاف التبديل)' },
    { key: 'headerLogos.items', type: 'list', label: 'الشعارات', item: [
      { key: 'label', type: 'text', label: 'الاسم' },
      { key: 'src', type: 'image', simple: true, label: 'الشعار (فاتح)' },
      { key: 'srcDark', type: 'image', simple: true, label: 'نسخة للخلفيات الداكنة' },
      { key: 'tint', type: 'toggle', label: 'تلوين تلقائي (SVG أحادي)' },
      { key: 'show', type: 'toggle', label: 'إظهار' },
      { key: 'scale', type: 'range', label: 'تكبير', min: 0.5, max: 2, step: 0.05 }],
      newItem: () => ({ id: uid('logo'), label: 'شعار', src: '', srcDark: '', tint: true, show: true, scale: 1 }) },
  ], st, ctx)));

  { // one tap: how a section opens (and closes)
    st.flow ||= {}; const cur = st.flow.sectionStyle || 'merged';
    const pick = v => { st.flow.sectionStyle = v; st.flow.titleCards = true; commit({ key: 'settings.flow.sectionStyle' }); renderGlobal(); };
    f.append(group('حركة الدخول إلى الأقسام والخروج منها', h('div', { class: 'row', style: 'gap:10px;flex-wrap:wrap' },
      ...[['merged', 'المدمجة — الغطاء + العنوان يطير من المحطة'], ['cover', 'السابقة — غطاء الهوية والرمز'], ['door', 'المحطة هي الباب — بدون غطاء']]
        .map(([v, l]) => h('button', { class: 'btn' + (cur === v ? ' primary' : ''), onclick: () => pick(v) }, l)))));
  }
  f.append(group('الفيديو والتسلسل', ...renderFields([
    { key: 'video.autoplay', type: 'toggle', label: 'تشغيل الفيديو تلقائياً عند الوصول' },
    { key: 'video.pauseOnLeave', type: 'toggle', label: 'إيقاف الفيديو عند المغادرة' },
    { key: 'flow.afterAllProjects', type: 'select', label: 'بعد إنهاء كل المشاريع', options: [['decision', 'الانتقال إلى نقطة القرار'], ['none', 'البقاء في البداية']] },
    { key: 'flow.sectionTransition', type: 'select', label: 'الانتقال بين الأقسام', options: [['hub', 'زوم أوت إلى صفحة المشروع ثم القسم التالي'], ['cover', 'بطاقة الهوية مباشرة']] },
    { key: 'flow.titleCards', type: 'toggle', label: 'افتتاح كل قسم بعنوانه (رمز المشروع يكشف العنوان)' },
    { key: 'flow.afterSection', type: 'select', label: 'بعد الرجوع لصفحة المشروع', options: [['wait', 'انتظر ضغطة المقدّم (التالي)'], ['auto', 'ادخل القسم التالي تلقائياً']] },
  ], st, ctx)));
}
function fontUploader() {
  const fam = h('input', { type: 'text', placeholder: 'اسم العائلة (مثال: Alyamama)', dir: 'auto' });
  const w = h('select', {}, ...WEIGHTS.map(([v, l]) => h('option', { value: v, selected: v === '400' }, l)));
  const file = h('input', { type: 'file', accept: '.woff2,.woff,.otf,.ttf' });
  const btn = h('button', { onclick: async () => {
    const f = file.files[0]; const name = fam.value.trim();
    if (!f || !name) return toast('اختر ملف خط واكتب اسم العائلة');
    if (backendMode() === 'local') return toast('الرفع يتطلب المشغّل المحلي أو ربط GitHub');
    const url = await uploadFile(f, 'assets/fonts/uploads');
    const id = name.toLowerCase().replace(/[^\w؀-ۿ]+/g, '-');
    let ent = C.fonts.find(x => x.id === id); if (!ent) { ent = { id, name, files: {} }; C.fonts.push(ent); }
    ent.files[w.value] = url; commit({ editor: true }); toast('أضيف الخط ✓');
  } }, 'رفع خط');
  return h('div', { class: 'group', style: 'margin-top:10px' }, h('h3', {}, 'إضافة خط جديد'), h('div', { class: 'inline' }, fam, w, file, btn),
    h('div', { class: 'muted small', style: 'margin-top:6px' }, 'الخطوط المتاحة: ' + (C.fonts || []).map(f => `${f.name} (${Object.keys(f.files || {}).join('، ')})`).join(' · ')));
}

/* ---------- decision + closing */
function renderDecisionTab() {
  const f = $('#decisionForm'); f.innerHTML = '';
  C.decision ||= { question: '', groups: [] }; C.closing ||= { layout: 'logos', line: 'شكراً' };
  const projOpts = () => [['', '— بدون (بند مخصص) —'], ...C.projects.map(p => [p.id, p.name])];
  f.append(group('نقطة القرار', ...renderFields([
    { key: 'title', type: 'text', label: 'اسم المحطة في الإطار المشترك' },
    { key: 'titleEn', type: 'text', label: 'اسم المحطة بالإنجليزية' },
    { key: 'desc', type: 'text', label: 'وصف قصير تحت اسم المحطة' },
    { key: 'eyebrow', type: 'text', label: 'عنوان صغير' },
    { key: 'question', type: 'textarea', rows: 2, label: 'السؤال' },
    { key: 'groups', type: 'list', label: 'بنود القرار', item: [
      { key: 'title', type: 'text', label: 'اسم البند' },
      { key: 'projectId', type: 'select', label: 'مرتبط بمشروع (يظهر شعاره)', options: projOpts },
      { key: 'options', type: 'list', label: 'الخيارات', item: [{ key: 'label', type: 'text', label: 'الخيار' }], newItem: () => ({ id: uid('do'), label: 'خيار' }) }],
      newItem: () => ({ id: uid('dg'), title: 'بند جديد', projectId: '', options: [{ id: uid('do'), label: 'اعتماد' }, { id: uid('do'), label: 'تعديل' }, { id: uid('do'), label: 'تأجيل' }] }) },
  ], C.decision, { path: 'decision', onChange: () => { previewOverride = { level: 'decision' }; } })));
  C.review ||= { eyebrow: 'Timeline', title: '', items: [] };
  f.append(group('صفحة المراجعة (فوق الشاشة الرئيسية)', ...renderFields([
    { key: 'hidden', type: 'toggle', label: 'إخفاء الصفحة' },
    { key: 'eyebrow', type: 'text', label: 'عنوان صغير' },
    { key: 'title', type: 'textarea', rows: 2, label: 'العنوان' },
    { key: 'subtitle', type: 'text', label: 'سطر تحت العنوان' },
    { key: 'items', type: 'list', label: 'ما تم إنجازه (بالترتيب على الخط الزمني)', item: [
      { key: 'title', type: 'text', label: 'العنوان' }, { key: 'body', type: 'text', label: 'وصف قصير' }, { key: 'status', type: 'text', label: 'الحالة (مثل: مكتمل)' }, { key: 'hidden', type: 'toggle', label: 'إخفاء' }],
      newItem: () => ({ title: 'إنجاز', body: '', status: 'مكتمل' }) },
  ], C.review, { path: 'review', onChange: () => { previewOverride = { level: 'review' }; } })));
  f.append(group('الختام', ...renderFields([
    { key: 'layout', type: 'select', label: 'التخطيط', options: [['logos', '(أ) الشعاران + سطر ختامي'], ['marks', '(ب) رمزا المشروعين + سطر + تواصل'], ['discussion', '(ج) شاشة نقاش هادئة']] },
    { key: 'line', type: 'textarea', rows: 2, label: 'السطر الختامي' },
    { key: 'subline', type: 'text', label: 'سطر فرعي' },
    { key: 'contact', type: 'textarea', rows: 2, label: 'معلومات التواصل' },
    { key: 'showDecisions', type: 'toggle', label: 'إظهار ملخص ما تم اعتماده' },
    { key: 'decisionsTitle', type: 'text', label: 'عنوان الملخص' },
  ], C.closing, { path: 'closing', onChange: () => { previewOverride = { level: 'closing' }; } })));
  const logBox = h('div', { class: 'muted small' }, 'جارٍ التحميل…');
  f.append(group('سجل القرارات', h('div', { class: 'inline' },
    h('button', { onclick: () => exportDecisions('json') }, 'تصدير JSON'), h('button', { onclick: () => exportDecisions('csv') }, 'تصدير CSV'),
    h('button', { class: 'danger', onclick: () => { if (confirm('مسح الاختيارات الحالية من الشاشة؟ (يبقى السجل محفوظاً)')) sync.send('cmd', { cmd: 'decisionClear', args: {} }); } }, 'مسح الاختيارات الحالية')), logBox));
  getDecisionLog().then(log => { logBox.innerHTML = log.length ? log.slice(-15).reverse().map(e => `<div>${esc(new Date(e.at || e.savedAt).toLocaleString('ar'))} — ${esc(e.groupTitle || '')}: <b>${esc(e.optionLabel || (e.action === 'clear-all' ? 'مسح الكل' : 'إلغاء'))}</b></div>`).join('') : 'لا توجد قرارات مسجلة بعد.'; }).catch(() => { logBox.textContent = 'السجل يتطلب المشغّل المحلي.'; });
}
async function exportDecisions(fmt) {
  const log = await getDecisionLog().catch(() => []);
  const current = Object.entries(liveState?.decision?.selections || {}).map(([g, o]) => {
    const grp = C.decision.groups.find(x => x.id === g); return { group: grp?.title, option: grp?.options.find(x => x.id === o)?.label };
  });
  if (fmt === 'json') return download('decisions.json', JSON.stringify({ exportedAt: new Date().toISOString(), current, log }, null, 2), 'application/json');
  const rows = [['time', 'group', 'option', 'action'], ...log.map(e => [e.at || e.savedAt, e.groupTitle || '', e.optionLabel || '', e.action || ''])];
  download('decisions.csv', '﻿' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
}
function download(name, text, type) { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.append(a); a.click(); a.remove(); }

/* ---------- live */
function renderLive() {
  const s = liveState; if (!s) return;
  const lv = { universe: 'البداية', hub: 'صفحة المشروع', section: 'قسم', decision: 'نقطة القرار', closing: 'الختام' }[s.level] || s.level;
  $('#liveWhere').textContent = s.level === 'section' ? `${s.projectName} › ${s.sectionTitle} › ${s.slideIndex + 1}/${s.slideCount} — ${s.title}` : `${lv}${s.projectName ? ' — ' + s.projectName : ''}`;
  $('#liveNotes').textContent = s.notes || '—';
  $('#liveNext').textContent = s.next?.label || '—';
  $('#liveBlack').classList.toggle('is-on', !!s.black);
  $('#liveMute').classList.toggle('is-on', !!s.muted);
  $('#liveTimer').classList.toggle('is-on', !!s.decision?.timerOn);
  $$('#liveTree button.cur').forEach(b => b.classList.remove('cur'));
  if (s.slideId) $(`#liveTree [data-slide="${CSS.escape(s.slideId)}"]`)?.classList.add('cur');
}
setInterval(() => { if (liveState?.startedAt) $('#liveClock').textContent = fmtClock(Date.now() - liveState.startedAt); }, 500);
function renderLiveTree() {
  const t = $('#liveTree'); t.innerHTML = '';
  for (const p of allProjectsOf(C)) {
    t.append(h('div', { class: 'lp' }, h('button', { onclick: () => cmd('enterProject', { projectId: p.id }) }, p.nameAr || p.name)));
    sectionsOf(p).forEach((s, si) => {
      t.append(h('div', { class: 'ls' }, h('button', { onclick: () => cmd('goto', { projectId: p.id, sectionId: s.id, slideIndex: 0 }) }, `${si + 1}. ${s.title}`)));
      t.append(h('div', {}, ...slidesOf(s).map((sl, i) => h('button', { 'data-slide': sl.id, onclick: () => cmd('goto', { projectId: p.id, sectionId: s.id, slideIndex: i }) }, `${i + 1}. ${slideLabel(sl)}`))));
    });
  }
  renderLive();
}
function cmd(name, args = {}) { sync.send('cmd', { cmd: name, args }); }
$$('[data-cmd]').forEach(b => b.addEventListener('click', () => cmd(b.dataset.cmd)));
$('#liveBlack').onclick = () => cmd('black', { on: !liveState?.black });
$('#liveMute').onclick = () => cmd('mute', { on: !liveState?.muted });
$('#liveTimer').onclick = () => cmd('discussionTimer', { on: !liveState?.decision?.timerOn });
async function renderQR() {
  const info = hasServer() ? await serverInfo().catch(() => null) : null;
  if (!info) { $('#qr').innerHTML = '<p class="muted small">يتطلب المشغّل المحلي.</p>'; $('#remoteLinks').innerHTML = `<a href="remote.html" target="_blank">remote.html (نفس الجهاز)</a>`; return; }
  $('#qr').innerHTML = info.qr;
  $('#remoteLinks').innerHTML = `<a href="${info.urls.remote}" target="_blank">${info.urls.remote}</a><a href="${info.urls.remoteLocal}" target="_blank">${info.urls.remoteLocal}</a>`;
}

/* ---------- backups */
async function renderBackups() {
  $('#fsaBox').hidden = backendMode() !== 'local';
  const box = $('#backups'); box.innerHTML = '';
  if (backendMode() === 'local') { box.append(h('div', { class: 'muted' }, 'سجل النسخ يتطلب المشغّل المحلي أو ربط GitHub.')); return; }
  const list = await listBackups().catch(() => []);
  if (!list.length) box.append(h('div', { class: 'muted' }, 'لا توجد نسخ بعد.'));
  for (const b of list) box.append(h('div', { class: 'backup-row' },
    h('span', {}, new Date(b.mtime).toLocaleString('ar'), ' ', h('small', { class: 'muted latin' }, b.label || b.name)),
    h('span', { class: 'inline' }, h('button', { class: 'sm', onclick: async () => download(b.name, JSON.stringify(await getBackup(b.name), null, 2), 'application/json') }, 'تنزيل'),
      h('button', { class: 'sm', onclick: () => restore(b.name) }, 'استعادة'))));
}
async function restore(name) {
  if (!confirm('استعادة هذه النسخة؟ ستُحفظ النسخة الحالية احتياطياً أولاً.')) return;
  await makeBackup('before-restore'); replaceContent(await getBackup(name)); await doSave(true, 'restored'); toast('تمت الاستعادة ✓'); renderBackups();
}
function replaceContent(c) {
  if (!c || !Array.isArray(c.projects)) return toast('ملف غير صالح');
  C = c; ensureIds(C); sel = null; commit({ tree: true, editor: true });
}
$('#backupNow').onclick = async () => { await doSave(true, 'manual'); toast('تم إنشاء نسخة احتياطية ✓'); renderBackups(); };
$('#refreshBackups').onclick = renderBackups;
$('#exportJson').onclick = () => download(`content-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`, JSON.stringify(C, null, 2), 'application/json');
$('#importJson').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { const c = JSON.parse(await f.text()); if (!confirm('استبدال كل المحتوى بالملف المستورد؟')) return; await makeBackup('before-import'); replaceContent(c); await doSave(true, 'imported'); toast('تم الاستيراد ✓'); }
  catch { toast('تعذّر قراءة الملف'); }
  e.target.value = '';
};
$('#fsaLink').onclick = async () => {
  try {
    [fsaHandle] = await window.showOpenFilePicker({ types: [{ description: 'content.json', accept: { 'application/json': ['.json'] } }] });
    if ((await fsaHandle.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('denied');
    $('#fsaState').textContent = 'مربوط: ' + fsaHandle.name; doSave(false);
  } catch { $('#fsaState').textContent = 'لم يتم الربط'; }
};

/* ---------- publish (GitHub) */
function renderPublish() {
  const box = $('#publishBox'); box.innerHTML = '';
  const g = githubConfig() || { owner: 'hmbu', repo: 'Purely', branch: 'ccr-87aacda0-76dx1f', prefix: 'presentation-bundle-lavara', token: '' };
  const inp = (k, ph, type = 'text') => h('input', { type, value: g[k] || '', placeholder: ph, dir: 'ltr', oninput: e => { g[k] = e.target.value.trim(); } });
  const status = h('div', { class: 'muted' }, { server: 'الوضع الحالي: المشغّل المحلي (حفظ مباشر في content.json).', github: 'الوضع الحالي: متصل بـ GitHub — زر «نشر» يرسل التعديلات للموقع.', local: 'الوضع الحالي: غير متصل.' }[backendMode()]);
  box.append(
    h('div', { class: 'card' }, h('h3', {}, 'ربط GitHub'), status,
      fieldRow('اسم الحساب (owner)', inp('owner', 'hmbu')),
      fieldRow('اسم المستودع (repo)', inp('repo', 'bundle-lavara-presentation')),
      fieldRow('الفرع (branch)', inp('branch', 'main')),
      fieldRow('مجلد العرض داخل المستودع', inp('prefix', 'فارغ إذا كان العرض في جذر المستودع'), 'مثال: presentation-bundle-lavara'),
      fieldRow('رمز الوصول (Token)', inp('token', 'github_pat_…', 'password'), 'يُحفظ في هذا المتصفح فقط ولا يُرفع إلى أي مكان.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'primary', onclick: async () => {
          setGithubConfig({ ...g, branch: g.branch || 'main' });
          try { const r = await testGithub(); toast('تم الاتصال ✓'); renderPublish(); $('#ghResult').innerHTML = `<b>${esc(r.repo)}</b> — ${r.canPush ? 'صلاحية الكتابة متاحة' : '⚠️ لا توجد صلاحية كتابة'} — الموقع: <a href="${esc(r.pagesUrl)}" target="_blank">${esc(r.pagesUrl)}</a>`; }
          catch (e) { $('#ghResult').textContent = 'تعذّر الاتصال: ' + e.message; }
        } }, 'حفظ واختبار الاتصال'),
        h('button', { onclick: () => { if (confirm('إلغاء الربط ومسح الرمز من هذا المتصفح؟')) { setGithubConfig(null); renderPublish(); } } }, 'إلغاء الربط'),
        h('button', { onclick: () => location.reload() }, 'إعادة التحميل من GitHub')),
      h('div', { id: 'ghResult', class: 'small' })),
    h('div', { class: 'card' }, h('h3', {}, 'الخطوات (مرة واحدة)'),
      h('ol', { class: 'steps' },
        h('li', {}, 'افتح GitHub ← Settings ← Developer settings ← Personal access tokens ← Fine-grained tokens ← Generate new token.'),
        h('li', {}, 'اختر المستودع فقط، وفي Permissions اختر Contents: Read and write. انسخ الرمز والصقه هنا.'),
        h('li', {}, 'في المستودع: Settings ← Pages ← Source: GitHub Actions (مرة واحدة). كل نشر بعدها يحدّث الموقع تلقائياً خلال دقيقة تقريباً.'),
        h('li', {}, 'ثم Settings ← Environments ← github-pages ← Deployment branches: أضف الفرع ccr-87aacda0-76dx1f (أو ادمجه في الفرع الرئيسي).'),
        h('li', {}, 'افتح لوحة التحكم من رابط الموقع (…/control.html) على أي جهاز، وعدّل ثم اضغط «نشر».')),
      h('p', { class: 'muted small' }, 'الموقع بدون أي علامة مائية. الريموت عبر الجوال والمزامنة الحية بين الأجهزة تعمل مع المشغّل المحلي أثناء العرض الفعلي؛ على الموقع يعمل التحكم من نفس المتصفح.')));
}

/* ======================================================================= tabs + global UI */
function switchTab(t) {
  tab = t; previewOverride = null;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'pane-' + t));
  document.body.classList.toggle('no-preview', t === 'live' || t === 'backup' || t === 'publish');
  renderTabs(); pushPreview(true);
}
function renderTabs() {
  if (tab === 'content') { renderTree(); renderEditor(); }
  if (tab === 'brands') renderBrands();
  if (tab === 'global') renderGlobal();
  if (tab === 'decision') renderDecisionTab();
  if (tab === 'live') { renderLiveTree(); renderQR(); }
  if (tab === 'backup') renderBackups();
  if (tab === 'publish') renderPublish();
}
function renderAll() { renderTree(); renderTabs(); }
$$('#tabs button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
$('#undoBtn').onclick = () => undoRedo(-1);
$('#redoBtn').onclick = () => undoRedo(1);
$('#saveBtn').onclick = () => doSave(true, 'manual');
$('#playPreview').onclick = () => pushPreview(true);
$('#pvUniverse').onclick = () => { previewOverride = { level: 'universe' }; pushPreview(true); };
$('#pvDecision').onclick = () => { previewOverride = { level: 'decision' }; pushPreview(true); };
$('#pvClosing').onclick = () => { previewOverride = { level: 'closing' }; pushPreview(true); };
$('#showOnScreen').onclick = () => {
  const t = previewTarget();
  if (t.level) cmd(t.level === 'universe' ? 'universe' : t.level);
  else if (t.slideId) cmd('goto', { slideId: t.slideId });
  else if (t.projectId) cmd('enterProject', { projectId: t.projectId });
  toast('أُرسل إلى شاشة العرض');
};
$('#addProject').onclick = addProject;
addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { if (e.target.matches('input, textarea')) return; e.preventDefault(); undoRedo(e.shiftKey ? 1 : -1); }
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(true, 'manual'); }
});
addEventListener('beforeunload', e => { if ($('#saveState').classList.contains('dirty')) { e.preventDefault(); e.returnValue = ''; } });

/* ======================================================================= boot */
(async () => {
  try { C = await loadContent({ fresh: true }); } catch (e) { $('#editor').innerHTML = `<h2>تعذّر تحميل المحتوى</h2><p>${esc(e.message)}</p>`; return; }
  ensureIds(C);
  pushHistory(null);
  const first = projectsOf(C)[0], s = first && sectionsOf(first)[0];
  sel = s?.slides?.[0] ? { kind: 'slide', id: s.slides[0].id } : first ? { kind: 'project', id: first.id } : null;
  renderAll();
  setSaveState({ server: 'محفوظ ✓', github: 'متصل بـ GitHub ✓', local: 'غير متصل — اربط GitHub من تبويب «النشر»' }[backendMode()], backendMode() === 'local' ? 'dirty' : '');
  $('#saveBtn').textContent = backendMode() === 'github' ? 'نشر' : 'حفظ';
  pushPreview(true);
  sync.send('hello', {});
})();
watchForUpdates();
