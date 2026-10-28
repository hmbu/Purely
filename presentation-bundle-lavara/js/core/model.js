// Content model helpers: everything is driven by content.json — nothing hard-coded.
import { isDark } from './util.js';

export const visible = arr => (arr || []).filter(x => x && !x.hidden);
// The opening screen's worlds are the brand projects; the shared area (kind: 'shared') sits below them.
export const isShared = p => p?.kind === 'shared';
export const projectsOf = c => visible(c?.projects).filter(p => !isShared(p));
export const sharedOf = c => visible(c?.projects).find(isShared) || null;
export const allProjectsOf = c => visible(c?.projects);
export const sectionsOf = p => visible(p?.sections);
export const slidesOf = s => visible(s?.slides);

export const findProject = (c, id) => (c?.projects || []).find(p => p.id === id);
export const findSection = (p, id) => (p?.sections || []).find(s => s.id === id);

// Locate any node by id (project / section / slide) in the full tree (hidden included).
export function locate(c, id) {
  for (const project of c.projects || []) {
    if (project.id === id) return { kind: 'project', project };
    for (const section of project.sections || []) {
      if (section.id === id) return { kind: 'section', project, section };
      for (const slide of section.slides || []) if (slide.id === id) return { kind: 'slide', project, section, slide };
    }
  }
  return null;
}

// Background / foreground for a slide in its brand.
export function slideTheme(project, slide, tpl) {
  const col = project?.brand?.colors || {};
  const key = slide?.bg && slide.bg !== 'auto' ? slide.bg : (tpl?.defaultBg || 'background');
  const bg = key.startsWith('#') ? key : (col[key] || col.background || '#111111');
  const dark = isDark(bg);
  return { bg, fg: dark ? (col.textLight || '#FFFFFF') : (col.text || '#111111'), dark, key };
}

// Flat "show order" of visible slides for progress bars and previews.
export function flatShow(c) {
  const out = [];
  for (const p of allProjectsOf(c)) for (const s of sectionsOf(p)) slidesOf(s).forEach((sl, i) => out.push({ p, s, sl, i }));
  return out;
}

export function brandOf(c, projectId) { return findProject(c, projectId)?.brand || {}; }

// Defaults for every setting the code understands. Applied on load: only MISSING keys are filled,
// existing values in content.json are never changed. New features add their defaults here instead of
// editing content.json, so content edited in the control panel is never overwritten.
export const SETTING_DEFAULTS = {
  tone: 'quiet',
  universe: { layout: 'fusion', chooser: false, background: '#0E0C0A', text: '#F3EFE6', hint: '', eyebrow: 'Projects', showLogos: true, logosSize: 1 },
  motion: { speed: 1, reduced: 'auto', textureScale: 0.5 },
  hud: { breadcrumb: true, progress: true, timer: false },
  eyebrows: false, // the small labels above slide titles (BUSINESS, STRUCTURE…): off by the user's decision
  startAt: 'universe',
  typography: {
    title: { font: 'thmanyah-serif-display', weight: 500, scale: 1, lineHeight: 1.25 },
    body: { font: 'thmanyah-sans', weight: 400, scale: 1, lineHeight: 1.7 },
  },
  headerLogos: { show: true, corner: 'top-left', size: 1, gap: 2, autoContrast: true, color: '#F3EFE6', items: [] },
  sound: { master: 0.35, muted: false },
  video: { autoplay: true, pauseOnLeave: true },
  flow: { afterAllProjects: 'decision', sectionTransition: 'hub', afterSection: 'wait' },
};
function fillMissing(target, defaults) {
  for (const [k, v] of Object.entries(defaults)) {
    if (target[k] === undefined) target[k] = JSON.parse(JSON.stringify(v));
    else if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object') fillMissing(target[k], v);
  }
  return target;
}
// The shared area (legal, financial … then the decisions). Added once when missing; after that it is
// ordinary content edited in the control panel (deleting it there sets sharedRemoved so it stays gone).
const N = (id, title, sub, tone, col, colSpan, row, rowSpan, step = 0, shape = 'box') => ({ id, title, sub, tone, shape, col, colSpan, row, rowSpan, step });
const E = (from, to, label, tone, style = 'solid', lane = '0', step = 0) => ({ from, to, label, tone, style, lane, step });
const DSL = (id, data) => ({ id, template: 'diagram', transition: 'drift', bg: 'background', notes: '', hidden: false, data });
export const DEFAULT_SHARED = () => ({
  id: 'shared', kind: 'shared', name: 'Shared', nameAr: 'الإطار المشترك', tagline: 'ما يجمع المشروعين، وينتهي بالقرارات', hidden: false,
  brand: {
    logo: '', mark: '',
    colors: { primary: '#EEE8DC', secondary: '#B08A4E', accent: '#7C6A52', background: '#F7F3EC', surface: '#FFFFFF', dark: '#1E1B17', text: '#1E1B17', title: '#1E1B17', textLight: '#F7F3EC' },
    palette: [{ hex: '#F7F3EC', name: 'ورقي' }, { hex: '#EEE8DC', name: 'عاجي دافئ' }, { hex: '#B08A4E', name: 'نحاسي' }, { hex: '#7C6A52', name: 'بني رمادي' }, { hex: '#1E1B17', name: 'فحمي' }],
    texture: 'mist', textureColors: ['#EEE8DC', '#E1D6C1', '#D2C09E', '#FBF8F2'], textureIntensity: 1,
    universe: { visual: 'texture', image: '', background: '#EEE8DC' }, typography: {},
  },
  sections: [
    { id: 'sec-sh-legal', title: 'الإطار القانوني', titleEn: 'Legal', hidden: false, slides: [
      DSL('sl-sh-contract', { eyebrow: 'Contract', title: 'ما الذي يتغير في العقد', body: '', cols: 2, gap: 22, rowGap: 10,
        frames: [{ label: 'الوضع الحالي', tone: 'neutral', col: 1, colSpan: 2, row: 1, rowSpan: 1, step: 0 }, { label: 'الوضع المقترح', tone: 'teal', col: 1, colSpan: 2, row: 2, rowSpan: 2, step: 1 }],
        nodes: [N('c-majed', 'الماجد للعود', 'العميل والملتزم بالسداد', 'gold', 1, 1, 1, 1), N('c-rim', 'رمثان', '', 'indigo', 2, 1, 1, 1),
          N('p-majed', 'الماجد للعود', 'تضمن سداد مستحقات رمثان', 'gold', 1, 2, 2, 1, 1), N('p-ent', 'الكيان الجديد', 'العميل والملتزم بالسداد', 'teal', 1, 1, 3, 1, 1), N('p-rim', 'رمثان', '', 'indigo', 2, 1, 3, 1, 1)],
        edges: [E('c-rim', 'c-majed', 'الخدمات', 'indigo', 'solid', '-1'), E('c-majed', 'c-rim', 'الأتعاب', 'gold', 'solid', '1'),
          E('p-majed', 'p-rim', 'ضمان السداد', 'gold', 'dashed', '0', 1), E('p-rim', 'p-ent', 'الخدمات', 'indigo', 'solid', '-1', 1), E('p-ent', 'p-rim', 'الأتعاب', 'teal', 'solid', '1', 1)] }),
      DSL('sl-sh-structure', { eyebrow: 'Structure', title: 'الهيكل المقترح', cols: 2, gap: 22, rowGap: 11,
        body: 'تملك الماجد للعود الكيان وتموله، وتضمن سداد مستحقات رمثان عليه. ويتعاقد الكيان مع رمثان على خدمات البناء والتشغيل ويسدد فواتيرها، ويتعامل مع الموردين والعملاء باسمه.',
        frames: [],
        nodes: [N('majed', 'الماجد للعود', 'تملك الكيان وتموله', 'gold', 1, 2, 1, 1), N('ent', 'الكيان الجديد', 'يستورد ويبيع ويتعاقد باسمه', 'teal', 1, 1, 2, 1), N('rim', 'رمثان', 'البناء والتشغيل حتى الشهر 17', 'indigo', 2, 1, 2, 1)],
        edges: [E('majed', 'ent', 'ملكية 100% وتمويل', 'gold'), E('majed', 'rim', 'ضمان السداد', 'gold', 'dashed'), E('rim', 'ent', 'خدمات البناء والتشغيل', 'indigo', 'solid', '-1'), E('ent', 'rim', 'سداد الفواتير', 'teal', 'solid', '1')] }),
    ] },
    { id: 'sec-sh-finance', title: 'الإطار المالي', titleEn: 'Financial', hidden: false, slides: [
      DSL('sl-sh-money', { eyebrow: 'Money Flow', title: 'مسار الأموال', cols: 3, gap: 9, rowGap: 2.4,
        body: 'بعد جاهزية الكيان، تدخل الأموال إلى حسابه من مصدرين، ومنه تخرج إلى جميع الاستخدامات.',
        frames: [],
        nodes: [N('majed', 'الماجد للعود', 'رأس المال والتمويل', 'gold', 1, 1, 1, 2), N('cust', 'العملاء', 'متحصلات المبيعات', 'neutral', 1, 1, 3, 2), N('acc', 'حساب الكيان', 'رأس المال العامل', 'teal', 2, 1, 1, 4),
          N('u1', 'الموردون والمخزون', '', 'neutral', 3, 1, 1, 1), N('u2', 'فواتير رمثان', '', 'indigo', 3, 1, 2, 1), N('u3', 'الرواتب والتشغيل', '', 'neutral', 3, 1, 3, 1), N('u4', 'التسويق', '', 'neutral', 3, 1, 4, 1),
          N('note', 'لا تمر أموال نشاط Bundle عبر رمثان، عدا أتعابها.', '', 'indigo', 2, 1, 5, 1, 0, 'note')],
        edges: [E('majed', 'acc', '', 'gold'), E('cust', 'acc', '', 'neutral'), E('acc', 'u1', '', 'teal'), E('acc', 'u2', '', 'teal'), E('acc', 'u3', '', 'teal'), E('acc', 'u4', '', 'teal')] }),
    ] },
  ],
});
export function withDefaults(c) {
  if (!c || typeof c !== 'object') return c;
  c.settings = fillMissing(c.settings || {}, SETTING_DEFAULTS);
  c.projects ||= []; c.fonts ||= [];
  if (!c.sharedRemoved && !c.projects.some(isShared)) c.projects.push(DEFAULT_SHARED());
  c.decision ||= { eyebrow: 'Decision Point', question: '', groups: [] };
  c.closing ||= { layout: 'logos', line: 'شكراً', showDecisions: true, decisionsTitle: '' };
  return c;
}
