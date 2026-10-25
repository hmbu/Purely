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
