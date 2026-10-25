// Content model helpers: everything is driven by content.json — nothing hard-coded.
import { isDark } from './util.js';

export const visible = arr => (arr || []).filter(x => x && !x.hidden);
export const projectsOf = c => visible(c?.projects);
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
  for (const p of projectsOf(c)) for (const s of sectionsOf(p)) slidesOf(s).forEach((sl, i) => out.push({ p, s, sl, i }));
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
  startAt: 'universe',
  typography: {
    title: { font: 'thmanyah-serif-display', weight: 500, scale: 1, lineHeight: 1.25 },
    body: { font: 'thmanyah-sans', weight: 400, scale: 1, lineHeight: 1.7 },
  },
  headerLogos: { show: true, corner: 'top-left', size: 1, gap: 2, autoContrast: true, color: '#F3EFE6', items: [] },
  sound: { master: 0.35, muted: false },
  video: { autoplay: true, pauseOnLeave: true },
  flow: { afterAllProjects: 'decision', sectionTransition: 'hub' },
};
function fillMissing(target, defaults) {
  for (const [k, v] of Object.entries(defaults)) {
    if (target[k] === undefined) target[k] = JSON.parse(JSON.stringify(v));
    else if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object') fillMissing(target[k], v);
  }
  return target;
}
export function withDefaults(c) {
  if (!c || typeof c !== 'object') return c;
  c.settings = fillMissing(c.settings || {}, SETTING_DEFAULTS);
  c.projects ||= []; c.fonts ||= [];
  c.decision ||= { eyebrow: 'Decision Point', question: '', groups: [] };
  c.closing ||= { layout: 'logos', line: 'شكراً', showDecisions: true, decisionsTitle: '' };
  return c;
}
