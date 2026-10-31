// Slide templates. Each template owns only its relevant fields (used by the control panel editor)
// and renders plain HTML. Elements carry data-a="bg|media|eyebrow|title|body|extra" so the
// transition engine can stagger them (Layered Drift: background → media → title → body).
import { esc, escBr, isVideo, kTitle, liveTimeout } from './util.js';

const AR = /[؀-ۿ]/;
const langCls = s => (AR.test(s || '') ? 'ar' : 'latin');

export const TRANSITIONS = [
  { id: 'drift', name: 'انجراف متدرج — Layered Drift' },
  { id: 'fade', name: 'تلاشي — Fade' },
  { id: 'veil', name: 'ستار الهوية — Brand Veil' },
  { id: 'mask', name: 'كشف بالقناع — Mask Reveal' },
  { id: 'cut', name: 'قطع مباشر — Cut' },
  { id: 'brand', name: 'انتقال الهوية (مثل الأقسام) — Brand section' },
];

export const BG_OPTIONS = [
  { id: 'auto', name: 'تلقائي حسب القالب' },
  { id: 'background', name: 'خلفية الهوية' },
  { id: 'surface', name: 'سطح فاتح' },
  { id: 'primary', name: 'اللون الأساسي' },
  { id: 'secondary', name: 'اللون الثانوي' },
  { id: 'dark', name: 'داكن' },
];

/* ---------------------------------------------------------------- shared pieces */
export function mediaHTML(m, ctx, { cls = '', label = 'صورة', eager = false } = {}) {
  const src = typeof m === 'string' ? m : m?.src;
  if (!src) return `<div class="ph ${cls}" data-ph><span class="ph-label">${esc(label)}</span></div>`;
  const fx = m?.focal?.x ?? 50, fy = m?.focal?.y ?? 50, fit = m?.fit || 'cover';
  const style = `object-fit:${fit};object-position:${fx}% ${fy}%`;
  if (isVideo(src)) {
    const auto = m?.autoplay !== false, muted = m?.muted !== false, loop = m?.loop !== false;
    return `<video class="m ${cls}" src="${esc(ctx.asset(src))}" ${m?.poster ? `poster="${esc(ctx.asset(m.poster))}"` : ''} playsinline preload="auto" ${muted ? 'muted' : ''} ${loop ? 'loop' : ''} data-autoplay="${auto}" data-muted="${muted}" style="${style}"></video>`;
  }
  return `<img class="m ${cls}" src="${esc(ctx.asset(src))}" alt="" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="eager"'} style="${style}">`;
}
const eyebrow = s => (s ? `<div class="tx-eyebrow ${langCls(s)}" data-a="eyebrow">${escBr(s)}</div>` : '');
const title = (s, cls = '') => { if (!s) return ''; const k = kTitle(s); return `<h1 class="tx-title ${cls} ${langCls(s)}" data-a="title"${k.attr}>${k.html}</h1>`; };
// The line under a title. A line that only names one of the show's projects is shown as that project's
// logo (names in text are Arabic; in graphics the logo stands for the project).
function leadLine(d, ctx) {
  const t = String(d.lead || '').trim(); if (!t) return '';
  const k = t.toLowerCase(), p = ctx?.projects?.find(x => x.kind !== 'shared' && x.brand?.logo && [x.name, x.nameAr, x.id].some(n => n && String(n).trim().toLowerCase() === k));
  if (p && ctx.asset) return `<p class="cv-lead is-logo"><span class="logo-mask cv-lead-logo is-${esc(p.id)}" role="img" aria-label="${esc(p.name)}" style="--src:url('${esc(ctx.asset(p.brand.logo))}');color:${esc(p.brand.colors?.primary || 'currentColor')}"></span></p>`;
  return `<p class="cv-lead">${escBr(d.lead)}</p>`;
}
const body = (s, cls = '') => (s ? `<p class="tx-body ${cls} ${langCls(s)}" data-a="body">${escBr(s)}</p>` : '');
const logoHTML = (src, ctx, cls = '') => (src ? `<span class="logo-mask ${cls}" style="--src:url('${esc(ctx.asset(src))}')"></span>` : '');

/* ---------------------------------------------------------------- field helpers (control panel) */
const vidSrc = v => (typeof v === 'string' ? v : v?.src || '');
const F = {
  eyebrow: { key: 'eyebrow', type: 'text', label: 'عنوان صغير (Eyebrow)' },
  title: { key: 'title', type: 'textarea', rows: 2, label: 'العنوان' },
  body: { key: 'body', type: 'textarea', rows: 4, label: 'النص' },
  image: (key = 'image', label = 'الصورة') => ({ key, type: 'image', label }),
  video: (key = 'video', label = 'الفيديو') => ({ key, type: 'video', label }),
};

/* ---------------------------------------------------------------- templates */
export const TEMPLATES = {
  'full-image': {
    name: 'صورة كاملة', en: 'Full image', group: 'core', defaultBg: 'dark',
    fields: [F.image(), F.eyebrow, F.title, F.body,
      { key: 'textPosition', type: 'select', label: 'موضع النص', options: [['bottom-start', 'أسفل اليمين'], ['center', 'الوسط'], ['bottom-end', 'أسفل اليسار'], ['none', 'بدون نص']] },
      { key: 'shade', type: 'toggle', label: 'تظليل خفيف خلف النص' }],
    defaults: { image: { src: '', fit: 'cover', focal: { x: 50, y: 50 } }, eyebrow: '', title: 'عنوان الشريحة', body: '', textPosition: 'bottom-start', shade: true },
    render: (d, ctx) => `
      <div class="t t-full">
        <div class="s-media" data-a="media">${mediaHTML(d.image, ctx, { eager: true })}</div>
        ${d.shade && d.textPosition !== 'none' ? '<div class="s-shade" data-a="bg"></div>' : ''}
        ${d.textPosition !== 'none' ? `<div class="s-copy pos-${esc(d.textPosition || 'bottom-start')}">${eyebrow(d.eyebrow)}${title(d.title)}${body(d.body)}</div>` : ''}
      </div>`,
  },

  'image-text': {
    name: 'صورة + نص', en: 'Image + text', group: 'core', defaultBg: 'background',
    fields: [F.image(), F.eyebrow, F.title, F.body,
      { key: 'imageSide', type: 'select', label: 'جهة الصورة', options: [['left', 'يسار (النص يمين)'], ['right', 'يمين (النص يسار)']] },
      { key: 'imageWidth', type: 'range', label: 'عرض الصورة %', min: 35, max: 65, step: 1 },
      { key: 'framed', type: 'toggle', label: 'صورة بإطار داخلي (غير ممتدة للحافة)' }],
    defaults: { image: { src: '', fit: 'cover', focal: { x: 50, y: 50 } }, eyebrow: '', title: 'عنوان', body: 'وصف مختصر.', imageSide: 'left', imageWidth: 50, framed: false },
    render: (d, ctx) => `
      <div class="t t-split side-${esc(d.imageSide || 'left')} ${d.framed ? 'is-framed' : ''}" style="--iw:${Number(d.imageWidth) || 50}%">
        <div class="s-media" data-a="media">${mediaHTML(d.image, ctx, { eager: true })}</div>
        <div class="s-copy">${eyebrow(d.eyebrow)}${title(d.title)}${body(d.body)}</div>
      </div>`,
  },

  video: {
    name: 'فيديو', en: 'Video', group: 'core', defaultBg: 'dark',
    fields: [F.video(), { key: 'mode', type: 'select', label: 'العرض', options: [['full', 'ممتد بكامل الشاشة'], ['framed', 'داخل إطار']] }, F.eyebrow, F.title],
    defaults: { video: { src: '', poster: '', autoplay: true, muted: false, loop: true }, mode: 'full', eyebrow: '', title: '' },
    render: (d, ctx) => `
      <div class="t t-video mode-${esc(d.mode || 'full')}">
        <div class="s-media" data-a="media">${mediaHTML(d.video, ctx, { label: 'فيديو', eager: true })}</div>
        ${d.title || d.eyebrow ? `<div class="s-copy">${eyebrow(d.eyebrow)}${title(d.title, 'is-caption')}</div>` : ''}
      </div>`,
  },

  title: {
    name: 'عنوان فقط', en: 'Title only', group: 'core', defaultBg: 'background',
    fields: [F.eyebrow, F.title, { key: 'subtitle', type: 'textarea', rows: 2, label: 'سطر فرعي' },
      { key: 'align', type: 'select', label: 'المحاذاة', options: [['center', 'وسط'], ['start', 'يمين']] },
      { key: 'showLogo', type: 'toggle', label: 'شعار المشروع بدل العنوان' },
      { key: 'showMark', type: 'toggle', label: 'إظهار رمز العلامة بخفة' }],
    defaults: { eyebrow: '', title: 'عنوان', subtitle: '', align: 'center', showLogo: false, showMark: true },
    render: (d, ctx) => `
      <div class="t t-title align-${esc(d.align || 'center')}">
        <div class="t-mosaic" aria-hidden="true" data-a="bg"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        ${d.showMark && ctx.brand.mark && ctx.idShown !== false ? `<div class="s-watermark" data-a="bg">${logoHTML(ctx.brand.mark, ctx)}</div>` : ''}
        <div class="s-copy">${eyebrow(d.eyebrow)}${d.showLogo && ctx.brand.logo ? `<h1 class="t-logo" data-a="title" aria-label="${esc(d.title || '')}">${logoHTML(ctx.brand.logo, ctx)}</h1>` : title(d.title, 'is-xl')}${body(d.subtitle, 'is-lead')}</div>
      </div>`,
  },

  'brand-board': {
    name: 'لوحة الهوية', en: 'Brand board', group: 'extra', defaultBg: 'background', suggested: 'الهوية',
    fields: [F.eyebrow, F.title,
      { key: 'logo', type: 'image', label: 'الشعار (فارغ = شعار الهوية)', simple: true },
      { key: 'mark', type: 'image', label: 'الرمز (فارغ = رمز الهوية)', simple: true },
      { key: 'palette', type: 'list', label: 'الألوان (فارغ = ألوان الهوية)', item: [{ key: 'hex', type: 'color', label: 'اللون' }, { key: 'name', type: 'text', label: 'الاسم' }], newItem: { hex: '#888888', name: '' } },
      { key: 'typeTitle', type: 'text', label: 'نموذج خط العناوين' },
      { key: 'typeBody', type: 'textarea', rows: 2, label: 'نموذج خط النص' }],
    defaults: { eyebrow: 'Brand', title: 'الهوية', logo: '', mark: '', palette: [], typeTitle: 'أبجد هوز حطي', typeBody: 'خط ثمانية للعناوين والنصوص بجميع أوزانه.' },
    render: (d, ctx) => {
      const pal = d.palette?.length ? d.palette : (ctx.brand.palette || []);
      return `
      <div class="t t-board">
        <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
        <div class="board-grid">
          <div class="board-cell board-logo" data-a="extra" data-seq="0">${logoHTML(d.logo || ctx.brand.logo, ctx, 'is-logo')}</div>
          <div class="board-cell board-mark" data-a="extra" data-seq="1">${logoHTML(d.mark || ctx.brand.mark, ctx, 'is-mark')}</div>
          <div class="board-cell board-palette">
            ${pal.map((c, i) => `<div class="swatch" data-a="extra" data-seq="${2 + i}" style="--c:${esc(c.hex)}"><span class="sw-chip"></span><span class="sw-name"${!d.palette?.length && ctx.project ? ` data-ed-kind="project" data-ed-id="${esc(ctx.project.id)}" data-ed-key="brand.palette.${i}.name"` : ''}>${esc(c.name || '')}</span><span class="sw-hex latin">${esc(c.hex)}</span></div>`).join('')}
          </div>
          <div class="board-cell board-type" data-a="extra" data-seq="${2 + pal.length}">
            <div class="type-title">${esc(d.typeTitle || '')}</div>
            <div class="type-body">${esc(d.typeBody || '')}</div>
          </div>
        </div>
      </div>`;
    },
  },

  device: {
    name: 'إطار جهاز', en: 'Device frame', group: 'extra', defaultBg: 'background', suggested: 'المنتج الرقمي',
    fields: [{ key: 'device', type: 'select', label: 'الجهاز', options: [['phone', 'جوال'], ['laptop', 'لابتوب'], ['both', 'لابتوب + جوال']] },
      { key: 'screens', type: 'list', label: 'شاشات الجوال (صور أو فيديو) — تتبدل تلقائياً', item: [{ key: 'src', type: 'media', label: 'ملف' }], newItem: { src: '' } },
      { key: 'laptop', type: 'media', label: 'شاشة اللابتوب (صورة أو فيديو)' },
      { key: 'interval', type: 'range', label: 'مدة كل شاشة (ث)', min: 2, max: 10, step: 0.5 },
      F.eyebrow, F.title, F.body],
    defaults: { device: 'phone', screens: [{ src: '' }], laptop: '', interval: 3.5, eyebrow: 'Digital Product', title: 'المنتج الرقمي', body: '' },
    render: (d, ctx) => {
      const screens = (d.screens || []).filter(Boolean);
      const phone = `<div class="dev dev-phone"><div class="dev-screen" data-cycle="${Number(d.interval) || 3.5}">${(screens.length ? screens : [{ src: '' }]).map((s, i) => `<div class="cyc ${i === 0 ? 'on' : ''}">${mediaHTML(s.src ? { src: s.src, autoplay: true } : '', ctx, { label: 'شاشة' })}</div>`).join('')}</div><span class="dev-notch"></span></div>`;
      const laptop = `<div class="dev dev-laptop"><div class="dev-screen">${mediaHTML(d.laptop ? { src: d.laptop } : '', ctx, { label: 'شاشة' })}</div><div class="dev-base"></div></div>`;
      return `
      <div class="t t-device dev-${esc(d.device || 'phone')}">
        <div class="s-copy">${eyebrow(d.eyebrow)}${title(d.title)}${body(d.body)}</div>
        <div class="s-media" data-a="media">${d.device === 'laptop' ? laptop : d.device === 'both' ? laptop + phone : phone}</div>
      </div>`;
    },
  },

  concepts: {
    name: 'ثلاثة مفاهيم', en: 'Three concepts', group: 'extra', defaultBg: 'background', suggested: 'المفاهيم',
    fields: [F.eyebrow, F.title,
      { key: 'items', type: 'list', label: 'المفاهيم', item: [{ key: 'label', type: 'text', label: 'الرقم/التسمية' }, { key: 'title', type: 'text', label: 'العنوان' }, { key: 'body', type: 'textarea', rows: 2, label: 'الوصف' }, { key: 'image', type: 'image', label: 'الصورة' }], newItem: { label: '', title: 'مفهوم', body: '', image: { src: '' } } },
      { key: 'stepFocus', type: 'toggle', label: 'التنقل بالسهم بينها (يكبر واحد في كل مرة)' }],
    defaults: { eyebrow: 'Concepts', title: 'ثلاثة مفاهيم', items: [1, 2, 3].map(n => ({ label: `0${n}`, title: `المفهوم ${n}`, body: '', image: { src: '' } })) },
    interactive: true,
    // stepFocus: a slide inside the slide — the arrow moves the focus from one item to the next (the first starts focused)
    // after the last item one more press shows them all again, equal and in full colour
    steps: d => (d.stepFocus ? (d.items || []).length : 0),
    applyStep: (el, step) => {
      const box = el.querySelector('.concepts.is-stepped'); if (!box) return;
      const items = box.querySelectorAll('.concept'), all = step >= items.length;
      box.classList.toggle('has-focus', !all);
      items.forEach((x, k) => x.classList.toggle('is-focus', !all && k === step));
    },
    render: (d, ctx) => `
      <div class="t t-concepts">
        <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
        <div class="concepts n-${(d.items || []).length}${d.stepFocus ? ' is-stepped has-focus' : ''}">
          ${(d.items || []).map((it, i) => `
            <button class="concept" data-a="extra" data-seq="${i}" data-focus="${i}">
              <div class="c-media">${mediaHTML(it.image, ctx, { label: it.title || 'مفهوم' })}</div>
              <div class="c-copy"><span class="c-label latin">${esc(it.label || '')}</span><span class="c-title">${escBr(it.title || '')}</span><span class="c-body">${escBr(it.body || '')}</span></div>
            </button>`).join('')}
        </div>
      </div>`,
  },

  'brand-grid': {
    name: 'شبكة العلامات', en: 'Brand grid', group: 'extra', defaultBg: 'background', suggested: 'اختيار العلامات',
    fields: [F.eyebrow, F.title, { key: 'columns', type: 'range', label: 'عدد الأعمدة', min: 2, max: 6, step: 1 },
      { key: 'items', type: 'list', label: 'العلامات', item: [{ key: 'logo', type: 'image', label: 'الشعار (SVG أو PNG)', simple: true }, { key: 'name', type: 'text', label: 'الاسم' }, { key: 'note', type: 'text', label: 'ملاحظة' }], newItem: { logo: '', name: 'علامة', note: '' } }],
    defaults: { eyebrow: 'Brands Selection', title: 'اختيار العلامات', columns: 4, items: [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ logo: '', name: `علامة ${n}`, note: '' })) },
    render: (d, ctx) => `
      <div class="t t-grid">
        <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
        <div class="bgrid" style="--cols:${Number(d.columns) || 4}">
          ${(d.items || []).map((it, i) => `
            <div class="bcell" data-a="extra" data-seq="${i}">
              <div class="b-logo">${it.logo ? `<img src="${esc(ctx.asset(typeof it.logo === 'string' ? it.logo : it.logo.src))}" alt="">` : `<span class="b-name-ph">${esc(it.name || '')}</span>`}</div>
              <div class="b-meta"><span class="b-name">${esc(it.name || '')}</span>${it.note ? `<span class="b-note">${esc(it.note)}</span>` : ''}</div>
            </div>`).join('')}
        </div>
      </div>`,
  },

  journey: {
    name: 'رحلة / قصة مراحل', en: 'Journey', group: 'extra', defaultBg: 'background', suggested: 'قصة التجربة الكاملة',
    fields: [F.eyebrow, F.title,
      { key: 'stages', type: 'list', label: 'المراحل (كل ضغطة "التالي" تكشف مرحلة)', item: [{ key: 'label', type: 'text', label: 'التسمية القصيرة' }, { key: 'title', type: 'text', label: 'العنوان' }, { key: 'body', type: 'textarea', rows: 2, label: 'الوصف' }, { key: 'image', type: 'image', label: 'الصورة' }], newItem: { label: 'مرحلة', title: '', body: '', image: { src: '' } } },
      { key: 'stepped', type: 'toggle', label: 'كشف المراحل خطوة بخطوة' }],
    defaults: { eyebrow: 'Experience Story', title: 'قصة التجربة', stepped: true, stages: ['الوصول', 'الغرفة', 'التجربة', 'الذكرى'].map(l => ({ label: l, title: l, body: '', image: { src: '' } })) },
    steps: d => (d.stepped === false ? 0 : Math.max(0, (d.stages || []).length - 1)),
    render: (d, ctx) => {
      const st = d.stages || [];
      return `
      <div class="t t-journey" style="--n:${st.length}">
        <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
        <div class="j-track" data-a="extra" data-seq="0"><div class="j-line"><span class="j-fill"></span></div>
          ${st.map((s, i) => `<div class="j-node" data-stage="${i}"><span class="j-dot"></span><span class="j-label">${esc(s.label || '')}</span></div>`).join('')}
        </div>
        <div class="j-stages" data-a="body">
          ${st.map((s, i) => `
            <div class="j-stage" data-stage="${i}">
              <div class="j-media">${mediaHTML(s.image, ctx, { label: s.label || 'مرحلة' })}</div>
              <div class="j-copy"><span class="j-num latin">${String(i + 1).padStart(2, '0')}</span><h2 class="j-title">${escBr(s.title || '')}</h2><p class="j-body">${escBr(s.body || '')}</p></div>
            </div>`).join('')}
        </div>
      </div>`;
    },
  },

  statement: {
    name: 'جملة كبيرة', en: 'Statement', group: 'core', defaultBg: 'primary',
    fields: [F.eyebrow, { key: 'statement', type: 'textarea', rows: 3, label: 'الجملة' }, { key: 'attribution', type: 'text', label: 'المصدر / التوقيع' },
      { key: 'size', type: 'select', label: 'الحجم', options: [['xl', 'كبير جداً'], ['l', 'كبير']] }],
    defaults: { eyebrow: '', statement: 'جملة واحدة كبيرة تحمل الفكرة.', attribution: '', size: 'xl' },
    render: (d, ctx) => `
      <div class="t t-statement size-${esc(d.size || 'xl')}">
        <div class="s-copy">${eyebrow(d.eyebrow)}<blockquote class="tx-statement ${langCls(d.statement)}" data-a="title">${escBr(d.statement)}</blockquote>${body(d.attribution, 'is-attr')}</div>
      </div>`,
  },
};


/* ---------------------------------------------------------------- diagram (boxes + arrows) */
// Boxes sit on a grid (column 1 = the right edge, RTL). Arrows are drawn after layout (layoutDiagram):
// boxes that share rows get a horizontal arrow, boxes that share columns a vertical one; lane −1/+1 puts
// two arrows between the same pair one above the other. Items with step N appear on the Nth "Next".
const TONES = [['gold', 'ذهبي — الماجد للعود'], ['indigo', 'نيلي — رمثان'], ['teal', 'أخضر مزرق — الكيان'], ['neutral', 'محايد'], ['accent', 'لون الهوية']];
const stepOf = x => Math.max(0, Number(x?.step) || 0);
const area = n => `grid-column:${Number(n.col) || 1} / span ${Number(n.colSpan) || 1};grid-row:${Number(n.row) || 1} / span ${Number(n.rowSpan) || 1}`;
const stepAttr = (x, a) => (stepOf(x) ? `data-step="${stepOf(x)}"` : `data-a="${a}"`);

// The two companies always carry their own logo on their cards (in their party colour); matched by the card's name.
const PARTIES = [[/الماجد/, 'assets/logos/almajed-oud.png', 3.43, 5, 'majed'], [/^رمثان$|^Rimthan$/i, 'assets/logos/rimthan.png', 5.71, 3.2, 'rimthan']];
// a box named after one of the show's projects (بندل / لافارا) is that brand: its logo and its colours
const projOf = (n, ctx) => ((n.shape || 'box') === 'box' && ctx?.projects ? ctx.projects.find(p => p.kind !== 'shared' && p.brand?.logo && [p.name, p.nameAr].some(x => x && String(x).trim() === String(n.title || '').trim())) : null);
const partyOf = (n, ctx) => { if ((n.shape || 'box') !== 'box') return ''; const pp = projOf(n, ctx); if (pp) return pp.id;
  return PARTIES.find(([re]) => re.test(String(n.title || '').trim()))?.[4] || ''; };
function partyLogo(n, ctx) {
  if ((n.shape || 'box') !== 'box' || !ctx?.asset) return '';
  const pp = projOf(n, ctx);
  if (pp) return `<span class="logo-mask dg-logo is-named dg-proj is-${esc(pp.id)}" style="--src:url('${esc(ctx.asset(pp.brand.logo))}')"></span>`;
  // the new entity carries the two brands it holds: their logos sit above its name
  if (/الكيان|الكيانات/.test(String(n.title || '')) && ctx.projects) {
    const ps = ctx.projects.filter(p => p.kind !== 'shared' && p.brand?.logo);
    return ps.length ? `<span class="dg-ents">${ps.map(p => `<span class="logo-mask dg-ent is-${esc(p.id)}" style="--src:url('${esc(ctx.asset(p.brand.logo))}')" title="${esc(p.name)}"></span>`).join('')}</span>` : '';
  }
  const hit = PARTIES.find(([re]) => re.test(String(n.title || '').trim())); if (!hit) return '';
  // the logo is the company's name: the card shows the logo instead of repeating the name in text
  return `<span class="logo-mask dg-logo is-named" style="--src:url('${esc(ctx.asset(hit[1]))}');aspect-ratio:${hit[2]};height:${hit[3]}rem"></span>`;
}
/* ---------------------------------------------------------------- legal (the contract change and the proposed structure) */
// Two fixed compositions in the shared frame, drawn on a 160 × 90 rem slide so boxes and arrows always line up:
//   contract  — today (Al Majed ⇄ Rimthan) first; one press moves Al Majed up as the owner and the two new
//               entities take its place as Rimthan's client (one box, no logos: the logos belong to the structure)
//   structure — Al Majed above, the two entities (Bundle, Lavara: their logos) side by side, Rimthan below
const LG_C = { own: '#B08A4E', svc: '#4A5687', fee: '#1E1B17' };
function lgArrow(x1, y1, x2, y2, c, { dashed = false, from = 0, only = null, head = 1.1 } = {}) {
  const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1), h = head, w = head * 0.6;
  const tip = dx ? `M${x2 - dx * h} ${y2 - w} L${x2} ${y2} L${x2 - dx * h} ${y2 + w}` : `M${x2 - w} ${y2 - dy * h} L${x2} ${y2} L${x2 + w} ${y2 - dy * h}`;
  const at = only != null ? `data-only="${only}"` : `data-from="${from}"`;
  return `<g class="lg-ar${dashed ? ' is-dashed' : ''}" ${at} style="--c:${c}"><path class="ln" ${dashed ? '' : 'pathLength="1"'} d="M${x1} ${y1} L${x2} ${y2}"/><path class="hd" d="${tip}"/></g>`;
}
const lgLabel = (x, y, t, c, at) => (t ? `<span class="lg-lb" ${at} style="right:${160 - x}rem;top:${y}rem;--c:${c}">${esc(t)}</span>` : '');
const LG_LOGO = { majed: ['assets/logos/almajed-oud.png', 3.43], rimthan: ['assets/logos/rimthan.png', 5.71] };
const lgLogo = (k, ctx, h) => `<span class="logo-mask lg-logo" style="--src:url('${esc(ctx.asset(LG_LOGO[k][0]))}');height:${h}rem;aspect-ratio:${LG_LOGO[k][1]}"></span>`;
TEMPLATES.legal = {
  name: 'القانوني (العقد والهيكل)', en: 'Legal', group: 'extra', defaultBg: 'background', suggested: 'القانوني',
  fields: [F.title,
    { key: 'layout', type: 'select', label: 'الشكل', options: [['contract', 'ما يتغير في العقد (الحالي ثم المقترح)'], ['structure', 'الهيكل المقترح']] },
    { key: 'nowLabel', type: 'text', label: 'العقد: اسم الوضع الحالي' }, { key: 'nextLabel', type: 'text', label: 'العقد: اسم الوضع المقترح' },
    { key: 'majedNow', type: 'text', label: 'العقد: الماجد اليوم' }, { key: 'majedNext', type: 'text', label: 'العقد: الماجد في المقترح' },
    { key: 'entTitle', type: 'text', label: 'العقد: صندوق الكيانين' }, { key: 'entSub', type: 'text', label: 'العقد: دور الكيانين' },
    { key: 'majedSub', type: 'text', label: 'الهيكل: دور الماجد' },
    { key: 'rimSub', type: 'text', label: 'دور رمثان' },
    { key: 'services', type: 'text', label: 'سهم الخدمات' }, { key: 'fees', type: 'text', label: 'العقد: سهم الأتعاب' },
    { key: 'own', type: 'text', label: 'سهم الملكية' }, { key: 'guarantee', type: 'text', label: 'سهم الضمان (العقد: من الماجد للكيانين · الهيكل: من الماجد لرمثان)' },
    { key: 'proposed', type: 'toggle', label: 'العقد: نقرة تُظهر الوضع المقترح (وإلا يأتي الهيكل المقترح بعده مباشرة)' }],
  defaults: { title: 'ما الذي يتغير في العقد', layout: 'contract', nowLabel: 'الوضع الحالي', nextLabel: 'الوضع المقترح', majedNow: 'العميل والملتزم بالسداد',
    majedNext: 'تملك الكيانين وتموّلهما، وتضمن سداد مستحقات رمثان', entTitle: 'كيانان منفصلان', entSub: 'العميل والملتزم بالسداد', majedSub: 'تملك الكيانين وتموّلهما',
    rimSub: 'البناء والتشغيل', services: 'الخدمات', fees: 'الأتعاب', own: 'ملكية 100%', guarantee: 'ضمان السداد' },
  // the structure plays by itself, no presses: Al Majed and Rimthan move smoothly from where the contract slide left
  // them (today's arrangement, side by side) into their places (neither card fades in with the slide: both stay put
  // through the change), then the two projects' cards and the arrows follow, the guarantee last
  steps: d => (d.layout !== 'structure' && d.proposed ? 1 : 0),
  applyStep: (el, step) => {
    const root = el.querySelector('.t-legal'); if (!root) return;
    if (root.classList.contains('is-structure')) {
      step = 2;
      if (!root.dataset.played) { root.dataset.played = '1'; liveTimeout(() => root.classList.add('is-play'), 450); } // once per showing; later calls leave it be
    }
    root.classList.toggle('is-s1', step >= 1);
    root.querySelectorAll('[data-from]').forEach(x => x.classList.toggle('is-on', step >= +x.dataset.from));
    root.querySelectorAll('[data-only]').forEach(x => x.classList.toggle('is-on', step === +x.dataset.only));
  },
  render: (d, ctx) => {
    const head = `<div class="board-head">${title(d.title)}</div>`;
    if (d.layout === 'structure') {
      const ps = (ctx.projects || []).filter(p => p.kind !== 'shared' && p.brand?.logo);
      // each entity in its own identity: its colour as the card, its logo in its light ink
      const ent = (p, side) => p ? `<div class="lg-card lg-ent2 is-brand ${side}" data-from="1" style="--bg:${esc(p.brand.colors?.primary || LG_C.fee)};--rule:${esc(p.brand.colors?.secondary || p.brand.colors?.primary || LG_C.fee)}"><span class="logo-mask lg-plogo" role="img" aria-label="${esc(p.name)}" style="--src:url('${esc(ctx.asset(p.brand.logo))}');color:${esc(p.brand.colors?.textLight || '#fff')}"></span></div>` : '';
      return `
      <div class="t t-legal is-structure">${head}
        <div class="lg-card lg-top is-majed" style="--rule:${LG_C.own}">${lgLogo('majed', ctx, 5)}<span class="lg-sub">${esc(d.majedSub || '')}</span></div>
        ${ent(ps[0], 'is-r')}${ent(ps[1], 'is-l')}
        <div class="lg-card lg-bottom is-rim" style="--rule:${LG_C.svc}">${lgLogo('rimthan', ctx, 3.4)}<span class="lg-sub">${esc(d.rimSub || '')}</span></div>
        <svg class="lg-svg" viewBox="0 0 160 90" preserveAspectRatio="none" aria-hidden="true">
          ${lgArrow(105, 35.2, 105, 45.4, LG_C.own, { from: 1 })}${lgArrow(55, 35.2, 55, 45.4, LG_C.own, { from: 1 })}
          ${lgArrow(105, 69.8, 105, 60.2, LG_C.svc, { from: 2, dashed: true })}${lgArrow(55, 69.8, 55, 60.2, LG_C.svc, { from: 2, dashed: true })}
          ${d.guarantee ? lgArrow(80, 35.2, 80, 69.8, LG_C.own, { from: 2, dashed: true }) : ''}
        </svg>
        ${lgLabel(106.5, 40.3, d.own, LG_C.own, 'data-from="1" data-side="r"')}${lgLabel(53.5, 40.3, d.own, LG_C.own, 'data-from="1" data-side="l"')}
        ${lgLabel(106.5, 65, d.services, LG_C.svc, 'data-from="2" data-side="r"')}${lgLabel(53.5, 65, d.services, LG_C.svc, 'data-from="2" data-side="l"')}
        ${lgLabel(80, 40.3, d.guarantee, LG_C.own, 'data-from="2"')}
      </div>`;
    }
    return `
    <div class="t t-legal is-contract">${head}
      <div class="lg-state"><span class="lg-st" data-only="0">${esc(d.nowLabel || '')}</span><span class="lg-st" data-from="1">${esc(d.nextLabel || '')}</span></div>
      <div class="lg-card lg-majed is-majed" data-a="extra" data-seq="0" style="--rule:${LG_C.own}">${lgLogo('majed', ctx, 5)}<span class="lg-swap"><span class="lg-sub" data-only="0">${esc(d.majedNow || '')}</span><span class="lg-sub" data-from="1">${esc(d.majedNext || '')}</span></span></div>
      <div class="lg-card lg-rim is-rim" data-a="extra" data-seq="1" style="--rule:${LG_C.svc}">${lgLogo('rimthan', ctx, 3.4)}<span class="lg-sub">${esc(d.rimSub || '')}</span></div>
      <div class="lg-card lg-ent" data-from="1" style="--rule:${LG_C.fee};${(ctx.projects || []).filter(p => p.kind !== 'shared' && p.brand?.colors?.primary).slice(0, 2).map((p, i) => `--h${i + 1}:${esc(p.brand.colors.primary)}`).join(';')}"><span class="lg-pair" aria-hidden="true"><i></i><i></i></span><b class="lg-name">${esc(d.entTitle || '')}</b><span class="lg-sub">${esc(d.entSub || '')}</span></div>
      <svg class="lg-svg" viewBox="0 0 160 90" preserveAspectRatio="none" aria-hidden="true">
        ${lgArrow(66.5, 40.5, 93.5, 40.5, LG_C.svc, { only: 0 })}${lgArrow(93.5, 47.5, 66.5, 47.5, LG_C.fee, { only: 0 })}
        ${lgArrow(119.25, 37.6, 119.25, 55.6, LG_C.own, { from: 1 })}${lgArrow(40.75, 37.6, 40.75, 55.6, LG_C.own, { from: 1, dashed: true })}
        ${lgArrow(66.5, 62.5, 93.5, 62.5, LG_C.svc, { from: 1 })}${lgArrow(93.5, 69.5, 66.5, 69.5, LG_C.fee, { from: 1 })}
      </svg>
      ${lgLabel(80, 38, d.services, LG_C.svc, 'data-only="0"')}${lgLabel(80, 50, d.fees, LG_C.fee, 'data-only="0"')}
      ${lgLabel(118, 46.6, d.own, LG_C.own, 'data-from="1" data-side="l"')}${lgLabel(39.5, 46.6, d.guarantee, LG_C.own, 'data-from="1" data-side="l"')}
      ${lgLabel(80, 60, d.services, LG_C.svc, 'data-from="1"')}${lgLabel(80, 72, d.fees, LG_C.fee, 'data-from="1"')}
    </div>`;
  },
};

TEMPLATES.diagram = {
  name: 'مخطط (صناديق وأسهم)', en: 'Diagram', group: 'extra', defaultBg: 'background', suggested: 'الهيكل',
  fields: [F.eyebrow, F.title, { key: 'body', type: 'textarea', rows: 3, label: 'سطر توضيحي أسفل المخطط' },
    { key: 'cols', type: 'range', label: 'عدد الأعمدة', min: 1, max: 6, step: 1 },
    { key: 'gap', type: 'range', label: 'المسافة بين الأعمدة (لمساحة الأسهم)', min: 4, max: 30, step: 1 },
    { key: 'rowGap', type: 'range', label: 'المسافة بين الصفوف', min: 1, max: 16, step: 0.5 },
    { key: 'nodes', type: 'list', label: 'الصناديق (العمود 1 = اليمين)', item: [
      { key: 'id', type: 'text', label: 'المعرّف (يُستخدم في الأسهم)' }, { key: 'title', type: 'text', label: 'العنوان' }, { key: 'sub', type: 'text', label: 'السطر الثاني' },
      { key: 'tone', type: 'select', label: 'اللون', options: TONES }, { key: 'shape', type: 'select', label: 'الشكل', options: [['box', 'صندوق'], ['note', 'ملاحظة مضغوطة']] },
      { key: 'col', type: 'number', label: 'العمود' }, { key: 'colSpan', type: 'number', label: 'عرض (أعمدة)' }, { key: 'row', type: 'number', label: 'الصف' }, { key: 'rowSpan', type: 'number', label: 'ارتفاع (صفوف)' },
      { key: 'step', type: 'number', label: 'يظهر عند الضغطة رقم (0 = مباشرة)' }],
      newItem: () => ({ id: 'n' + Math.random().toString(36).slice(2, 6), title: 'صندوق', sub: '', tone: 'neutral', shape: 'box', col: 1, colSpan: 1, row: 1, rowSpan: 1, step: 0 }) },
    { key: 'edges', type: 'list', label: 'الأسهم', item: [
      { key: 'from', type: 'text', label: 'من (معرّف)' }, { key: 'to', type: 'text', label: 'إلى (معرّف)' }, { key: 'label', type: 'text', label: 'التسمية' },
      { key: 'tone', type: 'select', label: 'اللون', options: TONES }, { key: 'style', type: 'select', label: 'النمط', options: [['solid', 'متصل'], ['dashed', 'متقطع']] },
      { key: 'lane', type: 'select', label: 'المسار', options: [['0', 'الوسط'], ['-1', 'أعلى / يمين'], ['1', 'أسفل / يسار']] },
      { key: 'step', type: 'number', label: 'يظهر عند الضغطة رقم' }],
      newItem: { from: '', to: '', label: '', tone: 'neutral', style: 'solid', lane: '0', step: 0 } },
    { key: 'frames', type: 'list', label: 'إطارات المجموعات (اختياري)', item: [
      { key: 'label', type: 'text', label: 'عنوان الإطار' }, { key: 'tone', type: 'select', label: 'اللون', options: TONES },
      { key: 'col', type: 'number', label: 'العمود' }, { key: 'colSpan', type: 'number', label: 'عرض' }, { key: 'row', type: 'number', label: 'الصف' }, { key: 'rowSpan', type: 'number', label: 'ارتفاع' },
      { key: 'step', type: 'number', label: 'يظهر عند الضغطة رقم' }],
      newItem: { label: 'مجموعة', tone: 'neutral', col: 1, colSpan: 2, row: 1, rowSpan: 1, step: 0 } }],
  defaults: { eyebrow: '', title: 'المخطط', body: '', cols: 2, gap: 20,
    nodes: [{ id: 'a', title: 'الطرف الأول', sub: '', tone: 'gold', shape: 'box', col: 1, colSpan: 1, row: 1, rowSpan: 1, step: 0 }, { id: 'b', title: 'الطرف الثاني', sub: '', tone: 'indigo', shape: 'box', col: 2, colSpan: 1, row: 1, rowSpan: 1, step: 0 }],
    edges: [{ from: 'a', to: 'b', label: 'العلاقة', tone: 'gold', style: 'solid', lane: '0', step: 0 }], frames: [] },
  steps: d => Math.max(0, ...[...(d.nodes || []), ...(d.edges || []), ...(d.frames || [])].map(stepOf)),
  render: (d, ctx) => {
    const nodes = d.nodes || [], frames = d.frames || [];
    return `
    <div class="t t-diagram">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
      <div class="dg" style="--cols:${Number(d.cols) || 2};--cgap:${Number(d.gap) || 20}rem;--rgap:${Number(d.rowGap) || 7.5}rem">
        ${frames.map(f => `<div class="dg-frame tone-${esc(f.tone || 'neutral')}" ${stepAttr(f, 'media')} style="${area(f)}"><span class="dg-flabel">${esc(f.label || '')}</span></div>`).join('')}
        ${nodes.map((n, i) => `<div class="dg-node shape-${esc(n.shape || 'box')} tone-${esc(n.tone || 'neutral')}${partyOf(n, ctx) ? ' party-' + partyOf(n, ctx) : ''}" data-node="${esc(n.id || '')}" ${stepAttr(n, 'extra')} data-seq="${i}" style="${area(n)}">
          ${partyLogo(n, ctx)}<b>${escBr(n.title || '')}</b>${n.sub ? `<span>${escBr(n.sub)}</span>` : ''}</div>`).join('')}
        <svg class="dg-wires" data-a="body"></svg>
      </div>
      ${d.body ? `<p class="dg-caption" data-a="body">${escBr(d.body)}</p>` : ''}
    </div>`;
  },
  // Arrows need real box positions: measured in layout pixels (immune to camera scaling).
  layout(el, d) {
    const grid = el.querySelector('.dg'), svg = el.querySelector('.dg-wires'); if (!grid || !svg) return;
    el.querySelectorAll('.dg-label').forEach(x => x.remove());
    const W = grid.offsetWidth, H = grid.offsetHeight; if (!W) return;
    // A tall diagram (all its steps shown) never runs off the slide: it is scaled down to fit above the caption.
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, cap = el.querySelector('.dg-caption');
    const room = el.offsetHeight - grid.offsetTop - (cap ? cap.offsetHeight + rem * 9 : rem * 7);
    grid.style.transformOrigin = '50% 0'; grid.style.transform = H > room && room > 0 ? `scale(${(room / H).toFixed(4)})` : '';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    const box = id => { const n = grid.querySelector(`[data-node="${CSS.escape(id || '')}"]`); return n && { x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight }; };
    const px = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, pad = px * 0.9, ah = px * 0.75;
    const groups = {};
    (d.edges || []).forEach((e, i) => {
      const a = box(e.from), b = box(e.to); if (!a || !b) return;
      const lane = Number(e.lane) || 0; let x1, y1, x2, y2, horiz;
      const oy0 = Math.max(a.y, b.y), oy1 = Math.min(a.y + a.h, b.y + b.h), ox0 = Math.max(a.x, b.x), ox1 = Math.min(a.x + a.w, b.x + b.w);
      if (oy1 - oy0 > px) { // side by side → horizontal
        horiz = true; const y = (oy0 + oy1) / 2 + lane * (oy1 - oy0) * 0.22;
        const ab = a.x < b.x; x1 = ab ? a.x + a.w + pad : a.x - pad; x2 = ab ? b.x - pad : b.x + b.w + pad; y1 = y2 = y;
      } else { // stacked → vertical, under the narrower box
        horiz = false; const nar = a.w <= b.w ? a : b; const x = (ox1 - ox0 > px ? (Math.max(ox0, nar.x) + Math.min(ox1, nar.x + nar.w)) / 2 : nar.x + nar.w / 2) + lane * nar.w * 0.2;
        const ab = a.y < b.y; y1 = ab ? a.y + a.h + pad * 0.6 : a.y - pad * 0.6; y2 = ab ? b.y - pad * 0.6 : b.y + b.h + pad * 0.6; x1 = x2 = x;
      }
      const st = stepOf(e), g = (groups[st] ||= []);
      const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
      // open chevron head; solid lines get pathLength=1 so they can draw themselves in
      const tip = horiz ? `M${x2 - dx * ah} ${y2 - ah * 0.55} L${x2} ${y2} L${x2 - dx * ah} ${y2 + ah * 0.55}` : `M${x2 - ah * 0.55} ${y2 - dy * ah} L${x2} ${y2} L${x2 + ah * 0.55} ${y2 - dy * ah}`;
      const dashed = e.style === 'dashed';
      g.push(`<g class="tone-${esc(e.tone || 'neutral')}"><path class="dg-line ${dashed ? 'is-dashed' : ''}" ${dashed ? '' : 'pathLength="1"'} d="M${x1} ${y1} L${x2} ${y2}"/><path class="dg-tip" d="${tip}"/></g>`);
      if (e.label) {
        const lb = document.createElement('div');
        lb.className = `dg-label tone-${e.tone || 'neutral'} ${e.style === 'dashed' ? 'is-dashed' : ''}`;
        lb.textContent = e.label; lb.style.left = (x1 + x2) / 2 + 'px'; lb.style.top = (y1 + y2) / 2 + 'px';
        if (st) lb.dataset.step = st; else lb.dataset.a = 'body';
        grid.appendChild(lb);
      }
    });
    svg.innerHTML = Object.entries(groups).map(([st, g]) => `<g ${+st ? `data-step="${st}"` : ''}>${g.join('')}</g>`).join('');
    el.classList.remove('dg-drawn');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('dg-drawn'))); // lines draw in once on screen
  },
  applyStep(el, step, instant) {
    el.classList.toggle('dg-instant', !!instant);
    el.querySelectorAll('[data-step]').forEach(x => x.classList.toggle('is-shown', +x.dataset.step <= step));
  },
};

/* ---------------------------------------------------------------- product sheet (a package / gift) */
// Copy on the right (title, description, attributes as chips), the photos on the left: one main image and
// a column of detail shots. Attribute "alt" lists the other options, shown muted next to the chosen one.
TEMPLATES.product = {
  name: 'بطاقة منتج / باقة', en: 'Product sheet', group: 'extra', defaultBg: 'background', suggested: 'المفاهيم',
  fields: [F.eyebrow, F.title, F.body, F.image('image', 'الصورة الرئيسية'),
    { key: 'gallery', type: 'list', label: 'صور التفاصيل (عمود بجانب الرئيسية)', item: [{ key: 'image', type: 'image', label: 'الصورة' }], newItem: { image: { src: '' } } },
    { key: 'attrs', type: 'list', label: 'الخصائص', item: [{ key: 'label', type: 'text', label: 'الخاصية' }, { key: 'value', type: 'text', label: 'القيمة' },
      { key: 'chip', type: 'toggle', label: 'تظهر كشارة' }, { key: 'alt', type: 'text', label: 'خيارات أخرى تظهر باهتة (مفصولة بفاصلة)' }],
      newItem: { label: 'خاصية', value: '', chip: false, alt: '' } },
    { key: 'codes', type: 'text', label: 'أرقام المنتجات' }],
  defaults: { eyebrow: 'Package', title: 'اسم الباقة', body: 'وصف مختصر للباقة.', image: { src: '', fit: 'cover', focal: { x: 50, y: 50 } }, gallery: [], attrs: [{ label: 'نوع الهدية', value: 'باكج', chip: true, alt: 'منتج فردي' }], codes: '' },
  render: (d, ctx) => {
    const g = (d.gallery || []).filter(x => x?.image?.src || typeof x?.image === 'string');
    const chips = a => `<span class="pr-chip is-on">${esc(a.value || '')}</span>${String(a.alt || '').split(/[,،]/).map(x => x.trim()).filter(Boolean).map(x => `<span class="pr-chip">${esc(x)}</span>`).join('')}`;
    return `
    <div class="t t-product ${g.length ? 'has-gallery' : ''}">
      <div class="pr-copy">${eyebrow(d.eyebrow)}${title(d.title)}${body(d.body)}
        <div class="pr-attrs" data-a="extra" data-seq="0">
          ${(d.attrs || []).map(a => `<div class="pr-row"><span class="pr-k">${esc(a.label || '')}</span><span class="pr-v">${a.chip ? chips(a) : escBr(a.value || '')}</span></div>`).join('')}
          ${d.codes ? `<div class="pr-row"><span class="pr-k">أرقام المنتجات</span><span class="pr-v latin pr-codes">${esc(d.codes)}</span></div>` : ''}
        </div>
      </div>
      <div class="pr-media" data-a="media">
        ${g.length ? `<div class="pr-thumbs">${g.map(x => `<div class="pr-thumb">${mediaHTML(x.image, ctx)}</div>`).join('')}</div>` : ''}
        <div class="pr-main">${mediaHTML(d.image, ctx, { label: d.title || 'صورة', eager: true })}</div>
      </div>
    </div>`;
  },
};


/* ---------------------------------------------------------------- status updates (work in progress + an ask) */
// Cards in two columns: what started, where it stands (badge) and the names involved (tags).
// A "decision" item spans the full width at the end, marked as the ask for the room.
const KINDS = [['progress', 'قيد العمل'], ['done', 'منجز'], ['decision', 'قرار مطلوب']];
TEMPLATES.updates = {
  name: 'مستجدات وحالات', en: 'Status updates', group: 'extra', defaultBg: 'background', suggested: 'القانوني',
  fields: [F.eyebrow, F.title,
    { key: 'items', type: 'list', label: 'البنود', item: [{ key: 'title', type: 'text', label: 'العنوان' }, { key: 'body', type: 'textarea', rows: 2, label: 'الوصف' },
      { key: 'badge', type: 'text', label: 'الحالة / المدة (شارة)' }, { key: 'kind', type: 'select', label: 'النوع', options: KINDS }, { key: 'tags', type: 'text', label: 'أسماء أو وسوم (اختياري)' }],
      newItem: { title: 'بند', body: '', badge: '', kind: 'progress', tags: '' } }],
  defaults: { eyebrow: 'Next Steps', title: 'المستجدات', items: [{ title: 'بند', body: '', badge: 'قيد التنفيذ', kind: 'progress', tags: '' }] },
  render: d => {
    const it = d.items || [];
    return `
    <div class="t t-updates">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
      <div class="up-grid">
        ${it.map((x, i) => `
          <div class="up-card kind-${esc(x.kind || 'progress')}" data-a="extra" data-seq="${i}">
            <div class="up-top"><span class="up-num latin">${String(i + 1).padStart(2, '0')}</span>${x.badge ? `<span class="up-badge ${langCls(x.badge)}">${esc(x.badge)}</span>` : ''}</div>
            <h3 class="up-title">${escBr(x.title || '')}</h3>
            ${x.body ? `<p class="up-body">${escBr(x.body)}</p>` : ''}
            ${x.tags ? `<span class="up-tags ${langCls(x.tags)}">${esc(x.tags)}</span>` : ''}
          </div>`).join('')}
      </div>
    </div>`;
  },
};

/* ---------------------------------------------------------------- sectors (columns with client logos) */
// Each identity dresses it its own way (CSS): Lavara frames the columns, numbers them in Roman numerals and
// tints every logo in its own ink (the first column is the lead, set dark); others show the logos as they are.
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
TEMPLATES.sectors = {
  name: 'قطاعات وعملاء', en: 'Sectors & clients', group: 'extra', defaultBg: 'background', suggested: 'الأعمال',
  fields: [F.eyebrow, F.title,
    { key: 'items', type: 'list', label: 'القطاعات (الأول = اليمين)', item: [{ key: 'title', type: 'text', label: 'القطاع' }, { key: 'body', type: 'textarea', rows: 3, label: 'الوصف' },
      { key: 'logos', type: 'list', label: 'الشعارات', item: [{ key: 'logo', type: 'image', label: 'الشعار', simple: true }, { key: 'name', type: 'text', label: 'الاسم' }], newItem: { logo: '', name: '' } }],
      newItem: { title: 'قطاع', body: '', logos: [] } },
    { key: 'note', type: 'text', label: 'سطر صغير أسفل الشريحة' }],
  defaults: { eyebrow: 'Business', title: 'القطاعات', items: [1, 2, 3, 4].map(n => ({ title: `قطاع ${n}`, body: '', logos: [] })), note: '' },
  render: (d, ctx) => {
    const it = d.items || [];
    return `
    <div class="t t-sectors" style="--n:${it.length || 1}">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
      <div class="sc-cols">
        ${it.map((x, i) => `
          <div class="sc-col" data-a="extra" data-seq="${i}">
            <div class="sc-head"><span class="sc-num latin">${String(i + 1).padStart(2, '0')}</span><span class="sc-roman latin" data-n="(${String(i + 1).padStart(3, '0')})">${ROMAN[i] || i + 1}</span><h3 class="sc-title">${escBr(x.title || '')}</h3></div>
            ${x.body ? `<p class="sc-body">${escBr(x.body)}</p>` : ''}
            <div class="sc-logos">${(x.logos || []).map(l => { const src = typeof l.logo === 'string' ? l.logo : l.logo?.src;
              return `<div class="sc-logo" title="${esc(l.name || '')}">${src ? `<img src="${esc(ctx.asset(src))}" alt="${esc(l.name || '')}"><i class="sc-mark" style="--src:url('${esc(ctx.asset(src))}')"></i>` : `<span>${esc(l.name || '')}</span>`}</div>`; }).join('')}</div>
          </div>`).join('')}
      </div>
      ${d.note ? `<p class="sc-note" data-a="body">${escBr(d.note)}</p>` : ''}
    </div>`;
  },
};

/* ---------------------------------------------------------------- financials (bar charts + a side panel) */
// One chart per model: two bars a year (net revenue, gross profit) with the value on top and the margin above.
// All charts share one scale so the models compare honestly. Values are comma-separated, one per year.
const nums = s => String(s || '').split(/[,،]/).map(x => x.trim()).filter(x => x !== '');
TEMPLATES.finance = {
  name: 'نموذج مالي (أعمدة)', en: 'Financial bars', group: 'extra', defaultBg: 'background', suggested: 'النموذج المالي',
  fields: [F.eyebrow, F.title,
    { key: 'charts', type: 'list', label: 'الرسوم (الأول في الأعلى)', item: [{ key: 'name', type: 'text', label: 'الاسم' }, { key: 'unit', type: 'text', label: 'الوحدة' },
      { key: 'years', type: 'text', label: 'السنوات (مفصولة بفاصلة)' },
      { key: 'aName', type: 'text', label: 'السلسلة الأولى' }, { key: 'a', type: 'text', label: 'قيمها (مفصولة بفاصلة)' },
      { key: 'bName', type: 'text', label: 'السلسلة الثانية' }, { key: 'b', type: 'text', label: 'قيمها' },
      { key: 'mName', type: 'text', label: 'اسم الهامش' }, { key: 'm', type: 'text', label: 'الهامش لكل سنة' },
      { key: 'color', type: 'color', label: 'لون الأعمدة (فارغ = لون الهوية)' }],
      newItem: { name: 'نموذج', unit: 'مليون ريال', years: '2027, 2028, 2029', aName: 'صافي الإيرادات', a: '1, 2, 3', bName: 'إجمالي الربح', b: '0.3, 0.7, 1.1', mName: 'هامش الربح %', m: '30%, 33%, 36%' } },
    { key: 'panelTitle', type: 'text', label: 'عنوان اللوحة الجانبية' }, { key: 'panelSub', type: 'text', label: 'سطر تحته' },
    { key: 'shots', type: 'list', label: 'صور من النموذج', item: [{ key: 'image', type: 'image', label: 'الصورة' }], newItem: { image: { src: '' } } },
    { key: 'pointsTitle', type: 'text', label: 'عنوان النقاط' },
    { key: 'points', type: 'list', label: 'النقاط', item: [{ key: 'text', type: 'text', label: 'النقطة' }], newItem: { text: '' } },
    { key: 'modelsOnly', type: 'toggle', label: 'الصورتان فقط (بلا الرسوم): كبيرتان مع عنوان اللوحة' },
    { key: 'panelImagesOnly', type: 'toggle', label: 'اللوحة الجانبية: الصورتان فقط، فوق بعضهما' },
    { key: 'panelShowcase', type: 'toggle', label: 'اللوحة الجانبية للعرض: العنوان، والصورتان متراكبتان، وسطر تحتهما؛ والأرقام تتحرك بالنقر بعدها' }],
  defaults: { eyebrow: 'Financials', title: 'الإيرادات', charts: [], panelTitle: '', panelSub: '', shots: [], pointsTitle: '', points: [] },
  // one project at a time: its bars rise slowly year by year and its two headline numbers count up; the next press, the next project
  steps: d => (d.modelsOnly ? 0 : d.panelShowcase ? (d.charts || []).length : Math.max(0, (d.charts || []).length - 1)),
  applyStep: (el, step, instant) => {
    const after = el.querySelector('.t-finance.is-showcase') ? 1 : 0; // with the showcase panel, the first press starts the first chart
    el.querySelectorAll('.fn-chart').forEach((c, k) => {
      const on = k + after <= step, was = c.classList.contains('is-grown');
      c.classList.toggle('is-grown', on); c.classList.toggle('is-instant', !!instant);
      c.querySelectorAll('.fn-kpi b[data-to]').forEach(b => {
        const to = parseFloat(b.dataset.to), dec = +(b.dataset.dec || 0), suf = b.dataset.suf || '', fmt = v => v.toFixed(dec) + suf;
        if (!on) { b.textContent = fmt(0); return; }
        if (was || instant || !Number.isFinite(to)) { b.textContent = fmt(to); return; }
        const t0 = performance.now(), dur = 2600, tick = t => { const k2 = Math.min(1, (t - t0) / dur); b.textContent = fmt(to * (1 - Math.pow(1 - k2, 3))); if (k2 < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
    });
  },
  render: (d, ctx) => {
    const ch = d.charts || [];
    const kpi = (v, label, suf = '') => { const n = parseFloat(String(v ?? '').replace('%', '')); if (!Number.isFinite(n)) return '';
      const dec = (String(v).split('.')[1] || '').replace('%', '').length;
      return `<div class="fn-kpi" data-noedit><b class="latin" data-to="${n}" data-dec="${dec}" data-suf="${suf}">${esc(String(v))}</b><span>${esc(label)}</span></div>`; };
    const max = Math.max(1e-9, ...ch.flatMap(c => [...nums(c.a), ...nums(c.b)].map(Number).filter(Number.isFinite)));
    const bar = (v, cls, i) => { const n = Number(v); return `<span class="fn-bar ${cls}" style="--h:${Number.isFinite(n) ? (n / max) * 100 : 0}%;--i:${i}"><em class="latin">${esc(v)}</em></span>`; };
    const shots = (d.shots || []).filter(x => x?.image?.src || typeof x?.image === 'string');
    // the sent models alone: their pictures large, side by side, under the panel's title (a press on one opens it full screen)
    if (d.modelsOnly) return `
    <div class="t t-finance is-models">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
      <div class="fn-models">
        ${d.panelTitle ? `<div class="fn-ptitle" data-a="body"><i></i><b>${esc(d.panelTitle)}</b></div>` : ''}
        <div class="fn-mshots n-${Math.min(shots.length, 3)}">${shots.slice(0, 3).map((x, i) => { const src = typeof x.image === 'string' ? x.image : x.image.src;
          return `<div class="fn-mshot" data-a="extra" data-seq="${i}" data-zoom="${esc(ctx.asset(src))}">${mediaHTML({ ...(typeof x.image === 'string' ? { src } : x.image), fit: 'contain' }, ctx)}</div>`; }).join('')}</div>
      </div>
    </div>`;
    return `
    <div class="t t-finance${d.panelShowcase ? ' is-showcase' : ''}">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
      <div class="fn-body">
        <div class="fn-charts">
          ${ch.map((c, k) => { const ys = nums(c.years), a = nums(c.a), b = nums(c.b), m = nums(c.m);
            return `
            <div class="fn-chart" data-a="extra" data-seq="${k}" style="--k:${k}${c.color ? `;--cc:${esc(c.color)}` : ''}">
              <div class="fn-head"><h3>${esc(c.name || '')}</h3>
                <div class="fn-kpis">${kpi(a[a.length - 1], `${c.unit || ''} · ${c.aName || ''} ${ys[ys.length - 1] || ''}`)}${kpi(m[m.length - 1], `${c.mName ? c.mName.replace(/\s*%\s*$/, '') : ''} ${ys[ys.length - 1] || ''}`, String(m[m.length - 1] || '').includes('%') ? '%' : '')}</div></div>
              <div class="fn-legend"><span class="is-a">${esc(c.aName || '')}</span><span class="is-b">${esc(c.bName || '')}</span>${c.mName ? `<span class="is-m">${esc(c.mName)}</span>` : ''}<span class="fn-unit">${esc(c.unit || '')}</span></div>
              <div class="fn-plot" style="--n:${ys.length || a.length || 1}">
                ${(ys.length ? ys : a).map((y, i) => `
                  <div class="fn-year">
                    ${m[i] ? `<span class="fn-margin latin">${esc(m[i])}</span>` : ''}
                    <div class="fn-bars">${a[i] != null ? bar(a[i], 'is-a', i) : ''}${b[i] != null ? bar(b[i], 'is-b', i) : ''}</div>
                    <span class="fn-y ${langCls(y)}">${esc(ys.length ? y : '')}</span>
                  </div>`).join('')}
              </div>
            </div>`; }).join('')}
        </div>
        ${d.panelShowcase ? `
        <aside class="fn-panel is-showcase" data-a="extra" data-seq="0">
          ${d.panelTitle ? `<div class="fn-ptitle"><i></i><b>${esc(d.panelTitle)}</b></div>` : ''}
          <div class="fn-pile">${shots.slice(0, 2).map((x, i) => `<figure class="fn-pshot ${i ? 'is-front' : 'is-back'}">${mediaHTML(x.image, ctx)}</figure>`).join('')}</div>
          ${d.panelSub ? `<p class="fn-pnote">${esc(d.panelSub)}</p>` : ''}
        </aside>`
        : d.panelImagesOnly && shots.length ? `
        <aside class="fn-panel is-images" data-a="extra" data-seq="9">${shots.slice(0, 2).map(x => { const src = typeof x.image === 'string' ? x.image : x.image.src;
          return `<div class="fn-ishot" data-zoom="${esc(ctx.asset(src))}">${mediaHTML({ ...(typeof x.image === 'string' ? { src } : x.image), fit: 'contain' }, ctx)}</div>`; }).join('')}</aside>`
        : d.panelTitle || shots.length || (d.points || []).length ? `
        <aside class="fn-panel" data-a="extra" data-seq="9">
          ${d.panelTitle ? `<div class="fn-ptitle"><i></i><b>${esc(d.panelTitle)}</b>${d.panelSub ? `<span>${esc(d.panelSub)}</span>` : ''}</div>` : ''}
          ${shots.length ? `<div class="fn-shots n-${Math.min(shots.length, 3)}">${shots.slice(0, 3).map(x => `<div class="fn-shot">${mediaHTML(x.image, ctx)}</div>`).join('')}</div>` : ''}
          ${(d.points || []).length ? `<div class="fn-points">${d.pointsTitle ? `<h4>${esc(d.pointsTitle)}</h4>` : ''}<ul>${d.points.map(p => `<li>${escBr(p.text || '')}</li>`).join('')}</ul></div>` : ''}
        </aside>` : ''}
      </div>
    </div>`;
  },
};


/* ---------------------------------------------------------------- business model canvas (the nine blocks) */
// Standard canvas layout (RTL: partners on the right, customers on the left, costs and revenue below).
// The value proposition is the one highlighted block. The canvas reads in three parts, each with its own colour:
// feasibility (partners, activities, resources), desirability (value with relationships, channels, segments),
// viability (costs and revenue).
const BMC = [
  { area: '1 / 1 / 3 / 3', g: 'infra', t: 'الشركاء الرئيسيون' }, { area: '1 / 3 / 2 / 5', g: 'infra', t: 'الأنشطة الرئيسية' },
  { area: '2 / 3 / 3 / 5', g: 'infra', t: 'الموارد الرئيسية' }, { area: '1 / 5 / 3 / 7', g: 'value', t: 'القيمة المقترحة' },
  { area: '1 / 7 / 2 / 9', g: 'cust', t: 'العلاقة مع العملاء' }, { area: '2 / 7 / 3 / 9', g: 'cust', t: 'القنوات' },
  { area: '1 / 9 / 3 / 11', g: 'cust', t: 'شرائح العملاء' }, { area: '3 / 1 / 4 / 6', g: 'fin', t: 'هيكل التكاليف' },
  { area: '3 / 6 / 4 / 11', g: 'fin', t: 'مصادر الإيراد' }];
// Blocks are numbered (and appear) in the order the model is read, as in the steering-committee brief:
// 1 segments, 2 value, 3 resources, 4 revenue, 5 partners, 6 activities, 7 channels, 8 relationships, 9 costs.
const BMC_NUM = [5, 6, 3, 2, 8, 7, 1, 9, 4];
// one line icon per block, drawn in the block's ink: partners, activities, resources, value, relationships,
// channels, segments, costs, revenue
const BMC_ICON = [
  '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
  '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M3 12l9 4.5 9-4.5"/><path d="M3 16.5l9 4.5 9-4.5"/>',
  '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 11l10-5M7 13l10 5"/>',
  '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'];
TEMPLATES.canvas = {
  name: 'لوحة نموذج العمل', en: 'Business model canvas', group: 'extra', defaultBg: 'background', suggested: 'نموذج العمل',
  fields: [F.eyebrow, F.title, { key: 'lead', type: 'text', label: 'سطر قصير تحت العنوان' },
    { key: 'legendInfra', type: 'text', label: 'اسم الجزء الأيمن (الشركاء، الأنشطة، الموارد)' },
    { key: 'legendCust', type: 'text', label: 'اسم الجزء الأيسر مع القيمة (العلاقة، القنوات، الشرائح)' },
    { key: 'legendFin', type: 'text', label: 'اسم الجزء السفلي (التكاليف، الإيراد)' },
    { key: 'valueBranches', type: 'textarea', rows: 3, label: 'تفرّع القيمة المضافة بعد اللوحة (سطر لكل فرع، 3 أسطر)' },
    { key: 'blocks', type: 'list', label: 'الخانات التسع بالترتيب: الشركاء، الأنشطة، الموارد، القيمة، العلاقة، القنوات، الشرائح، التكاليف، الإيراد',
      item: [{ key: 'title', type: 'text', label: 'اسم الخانة' }, { key: 'text', type: 'textarea', rows: 2, label: 'السطر الرئيسي' }, { key: 'badge', type: 'text', label: 'حالة صغيرة (اختياري)' }],
      newItem: { title: '', text: '', badge: '' } }],
  defaults: { eyebrow: 'Business Model', title: 'نموذج العمل', lead: '', legendInfra: 'قابلية التنفيذ', legendCust: 'رغبة العميل', legendFin: 'الجدوى المالية', blocks: BMC.map(b => ({ title: b.t, text: '', badge: '' })) },
  // after the nine blocks, one press: the value proposition gathers into a small card and branches into its parts
  steps: d => (String(d.valueBranches || '').trim() ? 1 : 0),
  // The value block itself travels: a copy laid exactly over it keeps its colours and words, then shrinks into the
  // small card at the top while its sentence fades, and the branches grow out of it.
  applyStep(el, step, instant) {
    const t = el.querySelector('.t-canvas'); if (!t) return;
    const hub = t.querySelector('.cvb-hub'), v = t.querySelector('.cv-grid .g-value'), box = t.querySelector('.cv-branch');
    if (hub && v && box) {
      const R = box.getBoundingClientRect(), V = v.getBoundingClientRect(), k = box.offsetWidth / (R.width || 1);
      hub.style.setProperty('--fl', `${(V.left - R.left) * k}px`); hub.style.setProperty('--ft', `${(V.top - R.top) * k}px`);
      hub.style.setProperty('--fw', `${V.width * k}px`); hub.style.setProperty('--fh', `${V.height * k}px`);
    }
    t.classList.toggle('cvb-instant', !!instant);
    t.classList.toggle('is-branched', step >= 1);
  },
  render: (d, ctx) => {
    const bl = (d.blocks || []).slice(0, 9);
    const br = String(d.valueBranches || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 4);
    const vt = (bl[3] && bl[3].title) || BMC[3].t;

    // Bundle: the branches are tall cards like its product sources (a grainy shape rising from the foot, the middle
    // one in the brand green); a line may start with a label and a colon (label: text) for a pill on top
    const tall = ctx?.brand?.texture === 'bubbles', yEnd = tall ? 390 : 560;
    const span = tall ? (br.length > 3 ? 880 : 740) : br.length === 2 ? 500 : 700; // two cards stand closer to the middle
    const xs = br.map((_, i) => 500 - span / 2 + ((i + 0.5) / br.length) * span); // over the cards' centres
    const inner = (b, i) => `<div class="cv-top"><svg class="cv-ic" viewBox="0 0 24 24" aria-hidden="true">${BMC_ICON[i]}</svg><span class="cv-n latin">${BMC_NUM[i]}</span><h3 class="cv-t">${esc(b.title || BMC[i].t)}</h3></div>
            ${b.text ? `<p class="cv-x">${escBr(b.text)}</p>` : ''}${b.badge ? `<span class="cv-badge">${esc(b.badge)}</span>` : ''}`;
    return `
    <div class="t t-canvas ${br.length ? 'has-branches' : ''}" style="${ctx?.brand?.mark && ctx.idShown !== false ? `--lv-mark:url('${esc(ctx.asset(ctx.brand.mark))}')` : ''}">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}${leadLine(d, ctx)}</div>
      <div class="cv-legend" data-a="body"><span class="g-infra"><i></i>${esc(d.legendInfra || 'قابلية التنفيذ')}</span><span class="g-cust"><i></i>${esc(d.legendCust || 'رغبة العميل')}</span><span class="g-fin"><i></i>${esc(d.legendFin || 'الجدوى المالية')}</span></div>
      <div class="cv-grid">
        ${bl.map((b, i) => `
          <div class="cv-b g-${BMC[i].g}" style="grid-area:${BMC[i].area}" data-a="extra" data-seq="${i}">${inner(b, i)}</div>`).join('')}
      </div>
      ${br.length ? `<div class="cv-branch" aria-hidden="true" style="--bn:${br.length}">
        <div class="cv-b g-value cvb-hub">${inner(bl[3] || { title: vt }, 3)}</div>
        <svg class="cvb-lines" viewBox="0 0 1000 1000" preserveAspectRatio="none">${xs.map((x, i) => `<path pathLength="1" style="--i:${i}" d="M500 290 V${(290 + yEnd) / 2} H${1000 - x} V${yEnd}"/>`).join('')}</svg>
        <div class="cvb-items n-${br.length}">${br.map((x, i) => { const [pill, text] = x.includes(':') ? [x.slice(0, x.indexOf(':')).trim(), x.slice(x.indexOf(':') + 1).trim()] : ['', x];
          return `<div class="cvb-item tn-t${i + 1} ${tall && i === (br.length - 1) / 2 ? 'feat' : ''}" style="--i:${i}"><span class="cvb-n latin">(${String(i + 1).padStart(3, '0')})</span>${pill ? `<span class="so-pill">${esc(pill)}</span>` : ''}<p>${esc(text)}</p>${tall ? `<i class="so-shape ${SHAPES[i % SHAPES.length]}"></i>` : ''}</div>`; }).join('')}</div>
      </div>` : ''}
    </div>`;
  },
};


/* ---------------------------------------------------------------- operating flow (phases, gates, rework loops) */
// A process read right to left in phases. Each phase: its steps (one per line; a line starting with # is a
// small sub-heading, e.g. a parallel track), the teams that own it, and an optional decision gate.
// The rework loops sit in one strip below. The full original flowchart opens on demand (zoom and pan).
TEMPLATES.flow = {
  name: 'نموذج تشغيل (مراحل)', en: 'Operating flow', group: 'extra', defaultBg: 'background', suggested: 'النموذج التشغيلي',
  fields: [F.eyebrow, F.title, { key: 'lead', type: 'text', label: 'سطر قصير تحت العنوان' },
    { key: 'phases', type: 'list', label: 'المراحل (الأولى = اليمين)', item: [{ key: 'title', type: 'text', label: 'المرحلة' },
      { key: 'steps', type: 'textarea', rows: 4, label: 'الخطوات (سطر لكل خطوة، # لعنوان فرعي)' }, { key: 'owners', type: 'text', label: 'الفرق المسؤولة (مفصولة بفاصلة)' },
      { key: 'gate', type: 'text', label: 'بوابة قرار (اختياري)' },
      { key: 'brief', type: 'textarea', rows: 2, label: 'المختصر (للشكل «مسار»: سطران قصيران)' }],
      newItem: { title: 'مرحلة', steps: '', owners: '', gate: '', brief: '' } },
    { key: 'loops', type: 'textarea', rows: 2, label: 'حلقات إعادة العمل (مفصولة بـ ·)' },
    { key: 'loopsLabel', type: 'text', label: 'عنوان حلقات إعادة العمل' },
    { key: 'color', type: 'color', label: 'لون المشروع (فارغ = لون الهوية)' },
    { key: 'full', type: 'image', simple: true, label: 'المخطط الكامل (يُفتح بالتكبير)' },
    { key: 'stepped', type: 'toggle', label: 'بالنقر: تبدأ بالمراحل وحدها، وكل نقرة تفتح مرحلة' },
    { key: 'layout', type: 'select', label: 'الشكل', options: [['columns', 'أعمدة بالتفاصيل'], ['process', 'مسار مختصر (محطات على خط)']] }],
  defaults: { eyebrow: 'Operating Model', title: 'النموذج التشغيلي', lead: '', phases: [], loops: '', color: '', full: '', stepped: true, layout: 'columns', loopsLabel: 'إعادة العمل' },
  // columns, click by click: first the stages alone, then each press opens one stage (large) and the rest stay narrow.
  // process: the stages as stations on one line, each with two short lines; the first is lit, each press lights the
  // next and the line runs on to it (the stations ahead wait, faint, so the whole road is seen from the start)
  steps: d => (d.layout === 'process' ? Math.max(0, (d.phases || []).length - 1) : d.stepped !== false ? (d.phases || []).length : 0),
  applyStep: (el, step) => {
    const pr = el.querySelector('.t-flow.is-process');
    if (pr) {
      const st = pr.querySelectorAll('.pr-st'), n = st.length;
      st.forEach((x, i) => { x.classList.toggle('is-on', i <= step); x.classList.toggle('is-now', i === step); });
      pr.style.setProperty('--pf', n > 1 ? Math.min(1, step / (n - 1)) : 1);
      return;
    }
    const row = el.querySelector('.t-flow.is-stepped .fl-row'); if (!row) return;
    row.classList.toggle('is-overview', step === 0);
    row.querySelectorAll('.fl-ph').forEach((x, i) => { x.classList.toggle('is-open', i === step - 1); x.classList.toggle('is-done', step > 0 && i < step - 1); x.classList.toggle('is-later', step > 0 && i > step - 1); });
  },
  render: (d, ctx) => {
    const ph = d.phases || [];
    const full = typeof d.full === 'string' ? d.full : d.full?.src;
    const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
    const loops = d.loops ? `<div class="fl-foot" data-a="body"><div class="fl-loops"><b>${esc(d.loopsLabel || 'إعادة العمل')}</b>${String(d.loops).split('·').map(x => x.trim()).filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}</div></div>` : '';
    if (d.layout === 'process') return `
    <div class="t t-flow is-process" style="--n:${ph.length || 1};${d.color ? `--cc:${esc(d.color)}` : ''}">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}${leadLine(d, ctx)}</div>
      <div class="pr-row" data-a="extra" data-seq="0">
        <div class="pr-line"><i></i></div>
        ${ph.map((p, i) => `
          <div class="pr-st">
            <span class="pr-dot latin">${String(i + 1).padStart(2, '0')}</span>
            <div class="pr-card">
              <h3 class="pr-t">${esc(p.title || '')}</h3>
              <ul class="pr-brief">${lines(p.brief || p.steps).slice(0, 2).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
              ${p.owners ? `<div class="pr-own">${String(p.owners).split(/[,،]/).map(x => x.trim()).filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
      ${loops}
    </div>`;
    return `
    <div class="t t-flow${d.stepped !== false ? ' is-stepped' : ''}" ${d.color ? `style="--cc:${esc(d.color)}"` : ''}>
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}${leadLine(d, ctx)}</div>
      <div class="fl-row" style="--n:${ph.length || 1}">
        ${ph.map((p, i) => `
          <div class="fl-ph" data-a="extra" data-seq="${i}">
            <div class="fl-top"><span class="fl-n latin">${String(i + 1).padStart(2, '0')}</span><span class="fl-roman latin" data-n="(${String(i + 1).padStart(3, '0')})">${ROMAN[i] || i + 1}</span></div>
            <h3 class="fl-t">${esc(p.title || '')}</h3>
            <ul class="fl-steps">${lines(p.steps).map(x => (x[0] === '#' ? `<li class="fl-sub">${esc(x.slice(1).trim())}</li>` : `<li>${esc(x)}</li>`)).join('')}</ul>
            ${p.gate ? `<div class="fl-gate"><i></i><span>${esc(p.gate)}</span></div>` : ''}
            ${p.owners ? `<div class="fl-own">${String(p.owners).split(/[,،]/).map(x => x.trim()).filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
          </div>`).join('')}
      </div>
      ${d.loops || full ? `<div class="fl-foot" data-a="body">
        ${d.loops ? `<div class="fl-loops"><b>${esc(d.loopsLabel || 'إعادة العمل')}</b>${String(d.loops).split('·').map(x => x.trim()).filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
        ${full ? `<button class="fl-full" data-zoom="${esc(ctx.asset(full))}">المخطط الكامل</button>` : ''}
      </div>` : ''}
    </div>`;
  },
};


/* ---------------------------------------------------------------- gift catalogue set (occasions, showcase, sources, categories, partners) */
// Colour comes from "tones" (t1–t5), which each identity defines from its own palette in CSS: for Bundle the
// grainy gradients of bundle-brand.pdf (green, sky-blue, lilac-pink, sunset, lime). Shapes are only those in
// that file (circle, half circle, a column with a rounded end), cycled.
const TONES5 = [['t1', 'النغمة 1'], ['t2', 'النغمة 2'], ['t3', 'النغمة 3'], ['t4', 'النغمة 4'], ['t5', 'النغمة 5']];
const SHAPES = ['sh-column', 'sh-circle', 'sh-half', 'sh-slim']; // only the shapes in bundle-brand.pdf
const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
const imgSrc = v => (typeof v === 'string' ? v : v?.src);

TEMPLATES.occasions = {
  name: 'مناسبات (أعمدة تركيز)', en: 'Occasions', group: 'extra', defaultBg: 'background', suggested: 'المنتجات',
  fields: [F.eyebrow, F.title, { key: 'legendNow', type: 'text', label: 'وصف المميّز' }, { key: 'legendLater', type: 'text', label: 'وصف الباهت' },
    { key: 'groups', type: 'list', label: 'الأعمدة', item: [{ key: 'title', type: 'text', label: 'العنوان' }, { key: 'tone', type: 'select', label: 'اللون', options: TONES5 },
      { key: 'items', type: 'textarea', rows: 6, label: 'البنود (سطر لكل بند، ~ في البداية = لاحقاً)' }], newItem: { title: 'مجموعة', tone: 't1', items: '' } }],
  defaults: { eyebrow: '', title: 'المناسبات', legendNow: 'نركّز عليها الآن', legendLater: 'لاحقاً', groups: [] },
  // the first occasion comes in with the page; each press brings the next one
  steps: d => Math.max(0, (d.groups || []).length - 1),
  applyStep(el, step, instant) {
    el.querySelectorAll('.oc-col').forEach((c, i) => { c.classList.toggle('oc-instant', !!instant); c.classList.toggle('is-wait', i > step); });
  },
  render: d => `
    <div class="t t-occasions">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
      <div class="oc-legend" data-a="body"><span><i></i>${esc(d.legendNow || '')}</span><span class="lt"><i></i>${esc(d.legendLater || '')}</span></div>
      <div class="oc-cols">
        ${(d.groups || []).map((g, i) => `
          <div class="oc-col tn-${esc(g.tone || 't1')}" data-a="extra" data-seq="${i}">
            <div class="oc-head"><h3>${esc(g.title || '')}</h3></div>
            <ul>${lines(g.items).map(x => (x[0] === '~' ? `<li class="later"><i></i>${esc(x.slice(1).trim())}</li>` : `<li><i></i>${esc(x)}</li>`)).join('')}</ul>
          </div>`).join('')}
      </div>
    </div>`,
};

TEMPLATES.showcase = {
  name: 'منتجات مناسبة (تبويبات + ثلاثة منتجات)', en: 'Showcase', group: 'extra', defaultBg: 'background', suggested: 'المنتجات',
  fields: [F.title, { key: 'tabs', type: 'text', label: 'التبويبات (مفصولة بفاصلة)' }, { key: 'active', type: 'number', label: 'التبويب النشط (1 = الأول)' },
    { key: 'tone', type: 'select', label: 'لون التبويب النشط', options: TONES5 },
    { key: 'items', type: 'list', label: 'المنتجات', item: [{ key: 'tag', type: 'text', label: 'المناسبة' }, { key: 'image', type: 'image', label: 'الصورة' }, { key: 'title', type: 'text', label: 'الاسم' }, { key: 'body', type: 'textarea', rows: 2, label: 'الوصف' }],
      newItem: { tag: '', image: { src: '' }, title: 'منتج', body: '' } }],
  defaults: { title: 'منتجات', tabs: '', active: 1, tone: 't1', items: [] },
  render: (d, ctx) => {
    const tabs = String(d.tabs || '').split(/[,،]/).map(x => x.trim()).filter(Boolean), act = (Number(d.active) || 1) - 1;
    return `
    <div class="t t-showcase tn-${esc(d.tone || 't1')}">
      ${tabs.length ? `<div class="sc-tabs" data-a="title">${tabs.map((t, i) => `<div class="sc-tab ${i === act ? 'on' : ''}"><h3>${esc(t)}</h3></div>`).join('')}</div>` : `<div class="board-head">${title(d.title)}</div>`}
      <div class="sc-items">
        ${(d.items || []).slice(0, 3).map((it, i) => `
          <div class="sc-item" data-a="extra" data-seq="${i}">
            <div class="sc-img"><div class="sc-frame">${mediaHTML(it.image, ctx, { label: it.title || 'صورة' })}${it.tag ? `<span class="sc-pill">${esc(it.tag)}</span>` : ''}</div></div>
            <h3>${esc(it.title || '')}</h3>
            ${it.body ? `<p>${escBr(it.body)}</p>` : ''}
          </div>`).join('')}
      </div>
    </div>`;
  },
};

// how light a video's current frame is (a small sample); false when it cannot be read
function frameIsDark(v) {
  try {
    const c = document.createElement('canvas'); c.width = 32; c.height = 18;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(v, 0, 0, 32, 18);
    const px = g.getImageData(0, 0, 32, 18).data; let sum = 0;
    for (let i = 0; i < px.length; i += 4) sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    return sum / (px.length / 4) < 120;
  } catch { return false; }
}
TEMPLATES.sources = {
  name: 'مصادر / أنواع (بطاقات بأشكال)', en: 'Sources', group: 'extra', defaultBg: 'background', suggested: 'المنتجات',
  fields: [F.eyebrow, F.title, { key: 'items', type: 'list', label: 'البطاقات', item: [{ key: 'pill', type: 'text', label: 'الوسم' }, { key: 'title', type: 'textarea', rows: 2, label: 'الوصف' },
    { key: 'tone', type: 'select', label: 'اللون', options: TONES5 }, { key: 'featured', type: 'toggle', label: 'بطاقة بارزة' },
    F.video('video', 'فيديو يخرج من البطاقة (بالنقر)')], newItem: { pill: '', title: '', tone: 't1', featured: false } }],
  defaults: { eyebrow: '', title: 'المصادر', items: [] },
  // a card may carry a film: the next press grows that card from its place until it fills the screen and the film plays;
  // it ends held on its last frame, blurred, with the brand's logo coming up; the press after folds it back into its card
  steps: d => ((d.items || []).some(x => vidSrc(x.video)) ? 2 : 0),
  applyStep(el, step, instant) {
    const t = el.querySelector('.t-sources'), film = t?.querySelector('.so-film'); if (!film) return;
    const card = t.querySelector('.so-card.has-film'), v = film.querySelector('video'), stage = document.getElementById('stage');
    const boxOf = () => { const tr = t.getBoundingClientRect(), cr = card.getBoundingClientRect(), k = t.offsetWidth / (tr.width || 1);
      return `inset(${(cr.top - tr.top) * k}px ${(tr.right - cr.right) * k}px ${(tr.bottom - cr.bottom) * k}px ${(cr.left - tr.left) * k}px round ${getComputedStyle(card).borderTopLeftRadius})`; };
    const full = 'inset(0px 0px 0px 0px round 0px)', ease = 'cubic-bezier(.76, 0, .24, 1)';
    // grow from the card to the screen (its name stays on the film), or fold back into the card
    const move = open => {
      film.classList.toggle('on', open); stage?.classList.toggle('video-only', open); if (open) film.classList.add('vis');
      const box = boxOf();
      if (instant) { film.getAnimations().forEach(a => a.cancel()); v.getAnimations().forEach(a => a.cancel()); film.style.clipPath = open ? full : box; v.style.opacity = open ? 1 : 0; if (!open) film.classList.remove('vis'); return; }
      film.animate([{ clipPath: open ? box : full }, { clipPath: open ? full : box }], { duration: 1400, easing: ease, fill: 'forwards' })
        .finished.then(() => { if (!film.classList.contains('on')) film.classList.remove('vis'); }).catch(() => {});
      v.animate([{ opacity: open ? 0 : 1, transform: open ? 'scale(1.12)' : 'scale(1)' }, { opacity: open ? 1 : 0, transform: open ? 'scale(1)' : 'scale(1.12)' }],
        { duration: open ? 1900 : 900, delay: open ? 450 : 0, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'forwards' });
    };
    const open = step === 1;
    if (open === film.classList.contains('on')) return;
    if (open) {
      film.classList.remove('is-end'); move(true); v.currentTime = 0;
      // the closing stays until the next press; it reads how light the film's last frame is (the film may be replaced),
      // so a dark ending gets a dark veil and the logo in white
      v.onended = () => { film.classList.toggle('is-dark-end', frameIsDark(v)); film.classList.add('is-end'); };
      if (!instant) liveTimeout(() => v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }), 650);
    } else {
      v.pause(); v.onended = null; move(false); // folds back still blurred, then the film is reset for another showing
      setTimeout(() => { if (!film.classList.contains('on')) film.classList.remove('is-end'); }, instant ? 0 : 1400);
    }
  },
  render: (d, ctx) => {
    const fi = (d.items || []).findIndex(x => vidSrc(x.video)), fv = fi >= 0 ? vidSrc(d.items[fi].video) : '';
    return `
    <div class="t t-sources">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
      <div class="so-cards" style="--n:${(d.items || []).length || 1}">
        ${(d.items || []).map((it, i) => `
          <div class="so-card tn-${esc(it.tone || 't1')} ${it.featured ? 'feat' : ''} ${i === fi ? 'has-film' : ''}" data-a="extra" data-seq="${i}" data-n="(${String(i + 1).padStart(3, '0')})">
            ${it.pill ? `<span class="so-pill">${esc(it.pill)}</span>` : ''}
            <h3>${escBr(it.title || '')}</h3>
            <i class="so-shape ${SHAPES[i % SHAPES.length]}" data-grow></i>
            ${ctx?.brand?.mark && ctx.idShown !== false ? `<span class="so-mark">${logoHTML(ctx.brand.mark, ctx)}</span>` : ''}
          </div>`).join('')}
      </div>
      ${fv ? `<div class="so-film" aria-hidden="true"><video src="${esc(ctx.asset(fv))}" playsinline preload="auto"></video>
        <div class="so-film-cap">${d.items[fi].pill ? `<span class="so-pill">${esc(d.items[fi].pill)}</span>` : ''}<h3>${escBr(d.items[fi].title || '')}</h3></div>
        ${ctx?.brand?.logo ? `<div class="so-film-end"><span class="logo-mask so-end-logo" role="img" aria-label="${esc(ctx.project?.name || '')}" style="--src:url('${esc(ctx.asset(ctx.brand.logo))}');color:${esc(ctx.brand.colors?.title || ctx.brand.colors?.primary || '#fff')}"></span></div>` : ''}</div>` : ''}
    </div>`;
  },
};

TEMPLATES.categories = {
  name: 'فئات + صور', en: 'Categories', group: 'extra', defaultBg: 'background', suggested: 'المنتجات',
  fields: [F.eyebrow, F.title, { key: 'items', type: 'textarea', rows: 8, label: 'الفئات (سطر لكل فئة)' },
    { key: 'images', type: 'list', label: 'الصور (حتى 9، ترتيب المجمّع)', item: [{ key: 'image', type: 'image', label: 'الصورة' }], newItem: { image: { src: '' } } }],
  defaults: { eyebrow: '', title: 'الفئات', items: '', images: [] },
  render: (d, ctx) => {
    const im = (d.images || []).filter(x => imgSrc(x?.image)).slice(0, 9);
    return `
    <div class="t t-categories">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
      <ul class="ca-list" data-a="body">${lines(d.items).map((x, i) => `<li><i class="tn-t${(i % 5) + 1}"></i>${esc(x)}</li>`).join('')}</ul>
      <div class="ca-collage n-${im.length}">${im.map((x, i) => `<div class="ca-tile c${i + 1}" data-a="extra" data-seq="${i}">${mediaHTML(x.image, ctx)}</div>`).join('')}</div>
    </div>`;
  },
};

TEMPLATES.partners = {
  name: 'شركاء وموردون (شرائط شعارات)', en: 'Partners', group: 'extra', defaultBg: 'background', suggested: 'المنتجات',
  fields: [F.eyebrow, F.title, { key: 'bands', type: 'list', label: 'الشرائط', item: [{ key: 'title', type: 'text', label: 'العنوان' }, { key: 'featured', type: 'toggle', label: 'شريط بارز (الحالي)' },
    { key: 'logos', type: 'list', label: 'الشعارات', item: [{ key: 'logo', type: 'image', simple: true, label: 'الشعار' }, { key: 'name', type: 'text', label: 'الاسم' }], newItem: { logo: '', name: '' } },
    { key: 'more', type: 'text', label: 'عدد إضافي (مثل +8)' }, { key: 'moreLabel', type: 'text', label: 'تحت العدد' }], newItem: { title: 'شريط', featured: false, logos: [], more: '', moreLabel: '' } }],
  defaults: { eyebrow: '', title: 'الشركاء', bands: [] },
  render: (d, ctx) => `
    <div class="t t-partners">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
      <div class="pa-bands">
        ${(d.bands || []).map((b, i) => `
          <div class="pa-band ${b.featured ? 'feat' : ''}" data-a="extra" data-seq="${i}">
            <h3>${esc(b.title || '')}</h3>
            <div class="pa-row">
              ${(b.logos || []).map(l => `<div class="pa-logo" title="${esc(l.name || '')}">${imgSrc(l.logo) ? `<img src="${esc(ctx.asset(imgSrc(l.logo)))}" alt="${esc(l.name || '')}">` : `<span>${esc(l.name || '')}</span>`}</div>`).join('')}
              ${b.more ? `<div class="pa-more"><b class="latin">${esc(b.more)}</b><span>${esc(b.moreLabel || '')}</span></div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>`,
};


/* ---------------------------------------------------------------- figure (a detailed chart or flowchart, full width) */
// For material that must be seen whole: the image fills the slide under the title, contained, on the slide's own
// background (use transparent artwork so it takes each identity's paper). Clicking it opens the zoom viewer.
TEMPLATES.figure = {
  name: 'مخطط أو صورة تفصيلية', en: 'Figure', group: 'extra', defaultBg: 'background', suggested: 'النموذج التشغيلي',
  fields: [F.eyebrow, F.title, { key: 'lead', type: 'text', label: 'سطر قصير تحت العنوان' }, { key: 'image', type: 'image', simple: true, label: 'الصورة (يفضّل خلفية شفافة)' },
    { key: 'zoom', type: 'toggle', label: 'التكبير عند الضغط' },
    { key: 'tour', type: 'toggle', label: 'جولة تلقائية: تقرّب ثلاثة أجزاء من المخطط تباعاً بلا توقف ثم تعرضه كاملاً' },
    { key: 'tourRegions', type: 'text', label: 'أجزاء الجولة (اختياري): x,y,عرض,ارتفاع كنسب من المخطط، مفصولة بـ ;' }],
  defaults: { eyebrow: '', title: 'المخطط', lead: '', image: '', zoom: true, tour: false, tourRegions: '' },
  // the tour: a wide chart too fine to read whole. It opens whole, then by itself the camera flies onto its three parts
  // in turn (right, middle, left: the chart reads right to left), resting on each, and draws back out to the whole
  steps: () => 0,
  applyStep: (el, step, instant) => {
    const t = el.querySelector('.t-figure.is-tour'), art = t?.querySelector('.fg-art'), img = art?.querySelector('img'); if (!img) return;
    const regs = figRegions(t.dataset.regions);
    const go = r => {
      const iw = img.naturalWidth, ih = img.naturalHeight, W = art.clientWidth, H = art.clientHeight; if (!iw || !W) return;
      const rem = W / 160;
      // home: the whole chart in the area under the title; a part: that region filling the slide
      const box = r ? { x: 2 * rem, y: 2 * rem, w: W - 4 * rem, h: H - 4 * rem } : { x: 6 * rem, y: 19 * rem, w: W - 12 * rem, h: H - 25.6 * rem };
      const reg = r || [0, 0, 1, 1], k = Math.min(box.w / (reg[2] * iw), box.h / (reg[3] * ih));
      const cx = (reg[0] + reg[2] / 2) * iw, cy = (reg[1] + reg[3] / 2) * ih;
      img.style.width = iw + 'px'; img.style.height = ih + 'px';
      img.style.transform = `translate(${(box.x + box.w / 2 - cx * k).toFixed(1)}px, ${(box.y + box.h / 2 - cy * k).toFixed(1)}px) scale(${k.toFixed(5)})`;
      t.classList.toggle('is-close', !!r);
    };
    const start = () => {
      if (t.dataset.played) return; // once per showing; later calls (a resize) leave the camera where the tour has it
      t.dataset.played = '1';
      img.style.transition = 'none'; go(null); void img.offsetWidth; img.style.transition = ''; // home at once, not flown in from full size
      const MOVE = 2200, HOLD = 3200, seq = [...regs, null]; let i = 0;
      const next = () => { if (!t.isConnected) return; go(seq[i++]); if (i < seq.length) liveTimeout(next, MOVE + HOLD); };
      liveTimeout(next, 1400);
    };
    if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start, { once: true });
  },
  render: (d, ctx) => {
    const src = imgSrc(d.image);
    return `
    <div class="t t-figure${d.tour ? ' is-tour' : ''}"${d.tour && d.tourRegions ? ` data-regions="${esc(d.tourRegions)}"` : ''}>
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}${leadLine(d, ctx)}</div>
      <div class="fg-art" data-a="media">${src ? `<img src="${esc(ctx.asset(src))}" alt="${esc(d.title || '')}" ${d.zoom !== false && !d.tour ? `data-zoom="${esc(ctx.asset(src))}"` : ''}>` : ''}</div>
    </div>`;
  },
};
// the tour's regions as fractions of the chart [x, y, width, height], in order: the right third, the middle, the left
// (overlapping a little); a slide may give its own (tourRegions) where a chart's parts sit elsewhere
const FIG_TOUR = [[0.64, 0.03, 0.36, 0.93], [0.32, 0.03, 0.36, 0.93], [0, 0.03, 0.36, 0.93]];
function figRegions(txt) {
  const r = String(txt || '').split(';').map(x => x.split(',').map(Number)).filter(x => x.length === 4 && x.every(Number.isFinite));
  return r.length ? r : FIG_TOUR;
}


/* ---------------------------------------------------------------- lineup (products standing side by side) */
// For cut-out product shots (transparent bottles, boxes): they stand on one fine shelf line, each with its
// name and a line below, and rise one after another.
TEMPLATES.lineup = {
  name: 'تشكيلة منتجات (صف)', en: 'Product lineup', group: 'extra', defaultBg: 'background', suggested: 'المنتجات',
  fields: [F.eyebrow, F.title, { key: 'lead', type: 'text', label: 'سطر قصير تحت العنوان' },
    { key: 'items', type: 'list', label: 'المنتجات (الأول = اليمين)', item: [{ key: 'image', type: 'image', simple: true, label: 'صورة مفرّغة' }, { key: 'title', type: 'text', label: 'الاسم' }, { key: 'body', type: 'textarea', rows: 2, label: 'سطر وصف' }],
      newItem: { image: '', title: 'منتج', body: '' } },
    { key: 'spotlight', type: 'toggle', label: 'يُضاء كل منتج بدوره' }],
  defaults: { eyebrow: '', title: 'التشكيلة', lead: '', items: [], spotlight: false },
  render: (d, ctx) => `
    <div class="t t-lineup ${d.spotlight ? 'is-spot' : ''}" style="--n:${(d.items || []).length || 1}">
      ${d.spotlight ? '<div class="ln-stage" data-a="bg"><i class="ln-back"></i><i class="ln-floor"></i></div>' : ''}
      ${d.spotlight ? '<button type="button" class="ln-mode" data-ln-mode title="خلفية فاتحة / داكنة" aria-label="تبديل الخلفية بين الفاتحة والداكنة"></button>' : ''}
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}${leadLine(d, ctx)}</div>
      <svg class="ln-defs" width="0" height="0" aria-hidden="true"><filter id="ln-matte" color-interpolation-filters="sRGB">
        <feColorMatrix type="saturate" values=".8"/>
        <feComponentTransfer><feFuncR type="table" tableValues="0 .1 .21 .33 .45 .56 .66 .75 .84"/><feFuncG type="table" tableValues="0 .1 .2 .32 .43 .53 .62 .71 .79"/><feFuncB type="table" tableValues="0 .09 .19 .29 .39 .48 .56 .63 .7"/></feComponentTransfer>
      </filter></svg>
      <div class="ln-row">
        ${(d.items || []).map((it, i) => `
          <div class="ln-item" data-a="extra" data-seq="${i}">
            <div class="ln-art">${d.spotlight ? '<i class="ln-beam"></i><i class="ln-pool"></i>' : ''}${imgSrc(it.image) ? `<span class="ln-bottle" style="--src:url(&quot;${esc(ctx.asset(imgSrc(it.image)))}&quot;)"><img src="${esc(ctx.asset(imgSrc(it.image)))}" alt="${esc(it.title || '')}"><i class="ln-shade"></i></span>` : ''}</div>
            <div class="ln-text"><span class="ln-roman latin" data-n="(${String(i + 1).padStart(3, '0')})">${ROMAN[i] || i + 1}</span>
            <h3>${esc(it.title || '')}</h3>
            ${it.body ? `<p>${escBr(it.body)}</p>` : ''}</div>
          </div>`).join('')}
      </div>
    </div>`,
};

/* ---------------------------------------------------------------- compare (two options, advantages and challenges) */
// Points starting with "-" are challenges, all others advantages; each gets a quiet mark, never red/green alarms.
TEMPLATES.compare = {
  name: 'مقارنة خيارين', en: 'Compare', group: 'extra', defaultBg: 'background', suggested: 'العطور',
  fields: [F.eyebrow, F.title, { key: 'lead', type: 'text', label: 'سطر قصير تحت العنوان' },
    { key: 'options', type: 'list', label: 'الخيارات', item: [{ key: 'title', type: 'text', label: 'الخيار' }, { key: 'sub', type: 'text', label: 'سطر تحته (اختياري)' },
      { key: 'points', type: 'textarea', rows: 5, label: 'النقاط (سطر لكل نقطة، - في البداية = تحدٍّ)' }, { key: 'featured', type: 'toggle', label: 'بارز' }],
      newItem: { title: 'خيار', sub: '', points: '', featured: false } },
    { key: 'layout', type: 'select', label: 'طريقة العرض', options: [['compare', 'مقارنة: مزايا وتحديات'], ['offer', '1 · بطاقتا عرض بنقاط مرقّمة'], ['sheet', '2 · ورقة مواصفات لكل خيار'], ['tags', '3 · سمات كل خيار'], ['stage', '4 · خيار ثم الآخر بالنقر']] },
    { key: 'proLabel', type: 'text', label: 'اسم المزايا' }, { key: 'conLabel', type: 'text', label: 'اسم التحديات' },
    { key: 'discuss', type: 'text', label: 'نقطة للنقاش أسفل الشريحة (اختياري)' }, { key: 'discussOptions', type: 'text', label: 'خيارات النقاش (مفصولة بـ ·)' }],
  defaults: { eyebrow: '', title: 'المقارنة', lead: '', options: [], layout: 'compare', proLabel: 'ميزة', conLabel: 'تحدٍّ', discuss: '', discussOptions: '' },
  // 'compare' marks each point as an advantage or a challenge; the other layouts present each option on its own, its
  // points plain (a leading "-" is simply dropped), so the slide shows two kinds rather than a contest
  // offer: first only the two name panels; the next press lifts them and their points come in beneath, one by one
  steps: d => (d.layout === 'stage' ? Math.max(0, (d.options || []).length - 1) : d.layout === 'offer' ? 1 : 0),
  applyStep(el, step, instant) {
    const t = el.querySelector('.t-compare');
    if (t?.classList.contains('ly-offer')) {
      const hds = [...t.querySelectorAll('.cp-hd')], before = hds.map(h => h.getBoundingClientRect().top);
      t.classList.toggle('cp-instant', !!instant); t.classList.toggle('is-open', step >= 1);
      if (!instant) hds.forEach((h, i) => { const r = h.getBoundingClientRect(), k = h.offsetHeight / (r.height || 1), d = (before[i] - r.top) * k;
        if (Math.abs(d) > 1) h.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: 1150, easing: 'cubic-bezier(.65, 0, .35, 1)' }); });
      return;
    }
    if (!t?.classList.contains('ly-stage')) return;
    el.querySelectorAll('.cp-col').forEach((c, i) => { c.classList.toggle('cp-instant', !!instant); c.classList.toggle('is-wait', i > step); });
  },
  render: (d, ctx) => {
    const ly = ['offer', 'sheet', 'tags', 'stage'].includes(d.layout) ? d.layout : 'compare', plain = ly !== 'compare';
    const pt = x => (x[0] === '-' ? x.slice(1).trim() : x);
    const list = o => plain
      ? `<ul class="cp-pts">${lines(o.points).map((x, k) => `<li style="--k:${k}"><span class="cp-k latin">${String(k + 1).padStart(2, '0')}</span><span>${esc(pt(x))}</span></li>`).join('')}</ul>`
      : `<ul>${lines(o.points).map(x => (x[0] === '-' ? `<li class="con"><i></i>${esc(x.slice(1).trim())}</li>` : `<li class="pro"><i></i>${esc(x)}</li>`)).join('')}</ul>`;
    return `
    <div class="t t-compare ly-${ly}" style="${ctx?.brand?.mark && ctx.idShown !== false ? `--lv-mark:url('${esc(ctx.asset(ctx.brand.mark))}')` : ''}">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}${leadLine(d, ctx)}</div>
      ${plain ? '' : `<div class="cp-legend" data-a="body"><span class="pro"><i></i>${esc(d.proLabel || '')}</span><span class="con"><i></i>${esc(d.conLabel || '')}</span></div>`}
      <div class="cp-cols" style="--n:${(d.options || []).length || 1}">
        ${(d.options || []).map((o, i) => `
          <div class="cp-col ${o.featured ? 'feat' : ''}" data-a="extra" data-seq="${i}">
            <div class="cp-hd"><span class="cp-roman latin" data-n="(${String(i + 1).padStart(3, '0')})">${ROMAN[i] || i + 1}</span>
            <h3>${esc(o.title || '')}</h3>${o.sub ? `<p class="cp-sub">${esc(o.sub)}</p>` : ''}</div>
            ${list(o)}
          </div>`).join('')}
      </div>
      ${d.discuss ? `<div class="cp-discuss" data-a="extra" data-seq="9"><span class="cp-dtag">${esc(d.discuss)}</span>
        <span class="cp-dopts">${String(d.discussOptions || '').split('·').map(x => x.trim()).filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}</span></div>` : ''}
    </div>`;
  },
};

/* ---------------------------------------------------------------- stats (a few big numbers) */
TEMPLATES.stats = {
  name: 'أرقام', en: 'Stats', group: 'extra', defaultBg: 'background', suggested: 'التشغيل',
  fields: [F.eyebrow, F.title, { key: 'lead', type: 'text', label: 'سطر قصير تحت العنوان' },
    { key: 'items', type: 'list', label: 'الأرقام', item: [{ key: 'value', type: 'text', label: 'الرقم' }, { key: 'label', type: 'text', label: 'الوصف' }, { key: 'note', type: 'text', label: 'ملاحظة صغيرة (اختياري)' }],
      newItem: { value: '0', label: '', note: '' } }],
  defaults: { eyebrow: '', title: 'بالأرقام', lead: '', items: [] },
  render: (d, ctx) => `
    <div class="t t-stats">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}${leadLine(d, ctx)}</div>
      <div class="st-row" style="--n:${(d.items || []).length || 1}">
        ${(d.items || []).map((it, i) => `
          <div class="st-cell" data-a="extra" data-seq="${i}" data-n="(${String(i + 1).padStart(3, '0')})">
            <b class="st-v latin">${esc(it.value || '')}</b>
            <span class="st-l">${esc(it.label || '')}</span>
            ${it.note ? `<span class="st-n">${esc(it.note)}</span>` : ''}
          </div>`).join('')}
      </div>
    </div>`,
};

/* ---------------------------------------------------------------- screens (two screenshots, offset, beside a title and points) */
// The two screens overlap like sheets on a desk (the back one higher and to the edge, the front one lower and inward);
// the words sit beside them. Points are numbered in the project's own way.
TEMPLATES.screens = {
  name: 'شاشتان + نقاط', en: 'Screens', group: 'extra', defaultBg: 'background', suggested: 'المنتج الرقمي',
  fields: [F.eyebrow, F.title, { key: 'points', type: 'textarea', rows: 5, label: 'النقاط (سطر لكل نقطة)' },
    { key: 'back', type: 'image', label: 'الشاشة الخلفية' }, { key: 'front', type: 'image', label: 'الشاشة الأمامية' }],
  defaults: { eyebrow: '', title: 'لوحة التحكم', points: '', back: { src: '' }, front: { src: '' } },
  render: (d, ctx) => `
    <div class="t t-screens">
      <div class="scr-copy">${eyebrow(d.eyebrow)}${title(d.title)}
        <ol class="scr-points">${lines(d.points).map((x, i) => `<li data-a="extra" data-seq="${i + 2}"><span class="scr-n latin">(${String(i + 1).padStart(3, '0')})</span>${esc(x)}</li>`).join('')}</ol>
      </div>
      <div class="scr-stack">
        <figure class="scr scr-back" data-a="extra" data-seq="0">${mediaHTML(d.back, ctx, { label: 'الشاشة الخلفية' })}</figure>
        <figure class="scr scr-front" data-a="extra" data-seq="1">${mediaHTML(d.front, ctx, { label: 'الشاشة الأمامية' })}</figure>
      </div>
    </div>`,
};

export const TEMPLATE_ORDER = ['full-image', 'image-text', 'video', 'title', 'statement', 'brand-board', 'device', 'concepts', 'brand-grid', 'journey', 'diagram', 'legal', 'product', 'updates', 'sectors', 'finance', 'canvas', 'flow', 'occasions', 'showcase', 'sources', 'categories', 'partners', 'figure', 'lineup', 'compare', 'stats', 'screens'];

export function newSlide(templateId, uidFn) {
  const t = TEMPLATES[templateId];
  return { id: uidFn('sl'), template: templateId, transition: 'drift', bg: 'auto', notes: '', hidden: false, data: JSON.parse(JSON.stringify(t.defaults)) };
}
export const slideLabel = s => {
  const d = s?.data || {};
  return (d.title || d.statement || d.eyebrow || TEMPLATES[s?.template]?.name || 'شريحة').split('\n')[0].slice(0, 60);
};
// Every media path a slide uses (for preloading).
export function slideMedia(s) {
  const out = []; const walk = v => {
    if (!v) return;
    if (typeof v === 'string') { if (/\.(jpe?g|png|webp|avif|gif|svg|mp4|webm|mov|m4v)(\?|$)/i.test(v)) out.push(v); return; }
    if (Array.isArray(v)) return v.forEach(walk);
    if (typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(s?.data); return out;
}
