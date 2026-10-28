// Slide templates. Each template owns only its relevant fields (used by the control panel editor)
// and renders plain HTML. Elements carry data-a="bg|media|eyebrow|title|body|extra" so the
// transition engine can stagger them (Layered Drift: background → media → title → body).
import { esc, escBr, isVideo } from './util.js';

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
const title = (s, cls = '') => (s ? `<h1 class="tx-title ${cls} ${langCls(s)}" data-a="title">${escBr(s)}</h1>` : '');
const body = (s, cls = '') => (s ? `<p class="tx-body ${cls} ${langCls(s)}" data-a="body">${escBr(s)}</p>` : '');
const logoHTML = (src, ctx, cls = '') => (src ? `<span class="logo-mask ${cls}" style="--src:url('${esc(ctx.asset(src))}')"></span>` : '');

/* ---------------------------------------------------------------- field helpers (control panel) */
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
        ${d.showMark && ctx.brand.mark ? `<div class="s-watermark" data-a="bg">${logoHTML(ctx.brand.mark, ctx)}</div>` : ''}
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
            ${pal.map((c, i) => `<div class="swatch" data-a="extra" data-seq="${2 + i}" style="--c:${esc(c.hex)}"><span class="sw-chip"></span><span class="sw-name">${esc(c.name || '')}</span><span class="sw-hex latin">${esc(c.hex)}</span></div>`).join('')}
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
      { key: 'items', type: 'list', label: 'المفاهيم', item: [{ key: 'label', type: 'text', label: 'الرقم/التسمية' }, { key: 'title', type: 'text', label: 'العنوان' }, { key: 'body', type: 'textarea', rows: 2, label: 'الوصف' }, { key: 'image', type: 'image', label: 'الصورة' }], newItem: { label: '', title: 'مفهوم', body: '', image: { src: '' } } }],
    defaults: { eyebrow: 'Concepts', title: 'ثلاثة مفاهيم', items: [1, 2, 3].map(n => ({ label: `0${n}`, title: `المفهوم ${n}`, body: '', image: { src: '' } })) },
    interactive: true,
    render: (d, ctx) => `
      <div class="t t-concepts">
        <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
        <div class="concepts n-${(d.items || []).length}">
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
  render: d => {
    const nodes = d.nodes || [], frames = d.frames || [];
    return `
    <div class="t t-diagram">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
      <div class="dg" style="--cols:${Number(d.cols) || 2};--cgap:${Number(d.gap) || 20}rem;--rgap:${Number(d.rowGap) || 7.5}rem">
        ${frames.map(f => `<div class="dg-frame tone-${esc(f.tone || 'neutral')}" ${stepAttr(f, 'media')} style="${area(f)}"><span class="dg-flabel">${esc(f.label || '')}</span></div>`).join('')}
        ${nodes.map((n, i) => `<div class="dg-node shape-${esc(n.shape || 'box')} tone-${esc(n.tone || 'neutral')}" data-node="${esc(n.id || '')}" ${stepAttr(n, 'extra')} data-seq="${i}" style="${area(n)}">
          <b>${escBr(n.title || '')}</b>${n.sub ? `<span>${escBr(n.sub)}</span>` : ''}</div>`).join('')}
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
            <div class="sc-head"><span class="sc-num latin">${String(i + 1).padStart(2, '0')}</span><span class="sc-roman latin">${ROMAN[i] || i + 1}</span><h3 class="sc-title">${escBr(x.title || '')}</h3></div>
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
    { key: 'points', type: 'list', label: 'النقاط', item: [{ key: 'text', type: 'text', label: 'النقطة' }], newItem: { text: '' } }],
  defaults: { eyebrow: 'Financials', title: 'الإيرادات', charts: [], panelTitle: '', panelSub: '', shots: [], pointsTitle: '', points: [] },
  render: (d, ctx) => {
    const ch = d.charts || [];
    const max = Math.max(1e-9, ...ch.flatMap(c => [...nums(c.a), ...nums(c.b)].map(Number).filter(Number.isFinite)));
    const bar = (v, cls, i) => { const n = Number(v); return `<span class="fn-bar ${cls}" style="--h:${Number.isFinite(n) ? (n / max) * 100 : 0}%;--i:${i}"><em class="latin">${esc(v)}</em></span>`; };
    const shots = (d.shots || []).filter(x => x?.image?.src || typeof x?.image === 'string');
    return `
    <div class="t t-finance">
      <div class="board-head">${eyebrow(d.eyebrow)}${title(d.title)}</div>
      <div class="fn-body">
        <div class="fn-charts">
          ${ch.map((c, k) => { const ys = nums(c.years), a = nums(c.a), b = nums(c.b), m = nums(c.m);
            return `
            <div class="fn-chart" data-a="extra" data-seq="${k}" ${c.color ? `style="--cc:${esc(c.color)}"` : ''}>
              <div class="fn-head"><h3>${esc(c.name || '')}</h3>
                <div class="fn-legend"><span class="is-a">${esc(c.aName || '')}</span><span class="is-b">${esc(c.bName || '')}</span>${c.mName ? `<span class="is-m">${esc(c.mName)}</span>` : ''}<span class="fn-unit">${esc(c.unit || '')}</span></div></div>
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
        ${d.panelTitle || shots.length || (d.points || []).length ? `
        <aside class="fn-panel" data-a="media">
          ${d.panelTitle ? `<div class="fn-ptitle"><i></i><b>${esc(d.panelTitle)}</b>${d.panelSub ? `<span>${esc(d.panelSub)}</span>` : ''}</div>` : ''}
          ${shots.length ? `<div class="fn-shots n-${Math.min(shots.length, 3)}">${shots.slice(0, 3).map(x => `<div class="fn-shot">${mediaHTML(x.image, ctx)}</div>`).join('')}</div>` : ''}
          ${(d.points || []).length ? `<div class="fn-points">${d.pointsTitle ? `<h4>${esc(d.pointsTitle)}</h4>` : ''}<ul>${d.points.map(p => `<li>${escBr(p.text || '')}</li>`).join('')}</ul></div>` : ''}
        </aside>` : ''}
      </div>
    </div>`;
  },
};

export const TEMPLATE_ORDER = ['full-image', 'image-text', 'video', 'title', 'statement', 'brand-board', 'device', 'concepts', 'brand-grid', 'journey', 'diagram', 'product', 'updates', 'sectors', 'finance'];

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
