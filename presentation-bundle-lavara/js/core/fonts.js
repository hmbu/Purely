// Font registry (from content.json → fonts[]) and typography variables.
// Arabic text never receives letter-spacing (enforced in CSS).

const injected = new Set();

export function registerFonts(content, doc = document) {
  let css = '';
  for (const f of content.fonts || []) {
    for (const [weight, url] of Object.entries(f.files || {})) {
      const key = `${f.id}:${weight}:${url}`;
      if (injected.has(key)) continue;
      injected.add(key);
      const fmt = /\.woff2$|^data:font\/woff2/i.test(url) ? 'woff2' : /\.woff$|^data:font\/woff[;,]/i.test(url) ? 'woff' : /\.otf$|^data:font\/otf/i.test(url) ? 'opentype' : 'truetype';
      css += `@font-face{font-family:"${f.id}";src:url("${url}") format("${fmt}");font-weight:${weight};font-style:normal;font-display:block;}\n`;
    }
  }
  if (css) { const s = doc.createElement('style'); s.dataset.fonts = '1'; s.textContent = css; doc.head.appendChild(s); }
}

export function typographyFor(content, project) {
  const g = content.settings?.typography || {};
  const o = project?.brand?.typography || {};
  const pick = role => ({ ...(g[role] || {}), ...Object.fromEntries(Object.entries(o[role] || {}).filter(([, v]) => v !== '' && v != null)) });
  return { title: pick('title'), body: pick('body') };
}

export function applyTypography(el, content, project) {
  const t = typographyFor(content, project);
  const fam = id => `"${id}", "thmanyah-sans", system-ui, sans-serif`;
  el.style.setProperty('--f-title', fam(t.title.font || 'thmanyah-serif-display'));
  el.style.setProperty('--w-title', t.title.weight || 500);
  el.style.setProperty('--s-title', t.title.scale || 1);
  el.style.setProperty('--lh-title', t.title.lineHeight || 1.2);
  el.style.setProperty('--f-body', fam(t.body.font || 'thmanyah-sans'));
  el.style.setProperty('--w-body', t.body.weight || 400);
  el.style.setProperty('--s-body', t.body.scale || 1);
  el.style.setProperty('--lh-body', t.body.lineHeight || 1.6);
}

// Wait for the fonts used on screen (avoids a flash on the first slide).
export async function fontsReady(content) {
  const loads = [];
  for (const f of content.fonts || []) for (const w of Object.keys(f.files || {})) loads.push(document.fonts.load(`${w} 40px "${f.id}"`, 'أب').catch(() => {}));
  await Promise.race([Promise.all(loads), new Promise(r => setTimeout(r, 2500))]);
}
