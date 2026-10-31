// Saving a copy of the single-file version: the same file with the edited content written into it. The file keeps
// its own frame as it was when it opened (window.__BXL_PRISTINE__, taken before the show ran) and its program
// (#bxl-app), so the copy is whole and opens like the original. On the site, a copy is the content file itself.
const stamp = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}.${z(d.getMinutes())}`; };

// the content as it is to be written: films and pictures back to their own addresses (not this session's)
function clean(c) {
  const back = window.__BXL_BLOBSRC__ || {};
  return JSON.parse(JSON.stringify(c, (k, v) => (k === '__blobbed' ? undefined : typeof v === 'string' && back[v] ? back[v] : v)));
}

async function deliver(blob, name, type) {
  if (window.showSaveFilePicker) {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: type.desc, accept: { [blob.type]: [type.ext] } }] });
      const w = await h.createWritable(); await w.write(blob); await w.close(); return h.name;
    } catch (e) { if (e?.name === 'AbortError') return null; } // not allowed here: fall back to a download
  }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  return name;
}

// On the site: the single-file version published with it (dist/presentation-standalone.html) is fetched and the
// current words are written into it. Its pictures stay as it carries them; anything new or moved since it was built
// points at the site, so it still shows when the copy is opened online.
function mergeWords(own, live) {
  const isAsset = v => typeof v === 'string' && /^assets\//.test(v);
  const abs = v => (isAsset(v) ? new URL(v, location.href).href : v);
  const walk = (o, l) => {
    if (Array.isArray(l)) return l.map((x, i) => (Array.isArray(o) && i < o.length ? walk(o[i], x) : deep(x)));
    if (l && typeof l === 'object') { const out = {}; for (const k of Object.keys(l)) out[k] = o && typeof o === 'object' && k in o ? walk(o[k], l[k]) : deep(l[k]); return out; }
    if (isAsset(l)) return typeof o === 'string' && !isAsset(o) ? o : abs(l); // the copy's own embedded picture
    return l;
  };
  const deep = v => (Array.isArray(v) ? v.map(deep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : abs(v));
  return walk(own, live);
}
async function siteCopy(content) {
  const r = await fetch(new URL('dist/presentation-standalone.html', location.href), { cache: 'no-store' });
  if (!r.ok) throw new Error('نسخة الملف الواحد غير منشورة بعد');
  const html = await r.text();
  const open = '<script id="bxl-data">', at = html.indexOf(open), end = html.indexOf('</script>', at);
  if (at < 0 || end < 0) throw new Error('نسخة الملف الواحد المنشورة قديمة — انشر مرة أخرى');
  const data = html.slice(at + open.length, end);
  // laid out as build;assets;content; (the content goes last and runs to the end)
  const A = ';window.__BXL_ASSETS__=', C = ';window.__BXL_CONTENT__=', ia = data.indexOf(A), ic = data.indexOf(C);
  if (ia < 0 || ic < 0) throw new Error('تعذّرت قراءة نسخة الملف الواحد');
  const assets = JSON.parse(data.slice(ia + A.length, ic)), own = JSON.parse(data.slice(ic + C.length).replace(/;\s*$/, ''));
  const json = s => JSON.stringify(s).replace(/</g, '\\u003c');
  const next = `window.__BXL_BUILD__=${json(Date.now().toString(36))};window.__BXL_ASSETS__=${json(assets)};window.__BXL_CONTENT__=${json(mergeWords(own, clean(content)))};`;
  const out = html.slice(0, at + open.length) + next + html.slice(end);
  return deliver(new Blob([out], { type: 'text/html' }), `Bundle-x-Lavara (${stamp()}).html`, { desc: 'HTML', ext: '.html' });
}

export async function saveCopy(content) {
  const single = !!window.__BXL_CONTENT__;
  if (!single) return siteCopy(content);
  const frame = window.__BXL_PRISTINE__, app = document.getElementById('bxl-app')?.textContent;
  if (!frame || app == null) throw new Error('هذه النسخة لا تحمل إطارها — افتح الملف الأصلي');
  const build = `${Date.now().toString(36)}`;
  const json = s => JSON.stringify(s).replace(/</g, '\\u003c');
  const data = `window.__BXL_BUILD__=${json(build)};window.__BXL_ASSETS__=${json(window.__BXL_ASSETS__ || {})};window.__BXL_CONTENT__=${json(clean(content))};`;
  const html = `<!doctype html>\n${frame}<script id="bxl-cap">${window.__BXL_CAPTURE__}</script>\n<script id="bxl-data">${data}</script>\n<script id="bxl-app">${app}</script>\n</body>\n</html>\n`;
  const base = (decodeURIComponent(location.pathname.split('/').pop() || 'Bundle-x-Lavara.html')).replace(/\.html?$/i, '').replace(/\s*\(\d{4}-\d\d-\d\d [\d.]+\)$/, '');
  return deliver(new Blob([html], { type: 'text/html' }), `${base} (${stamp()}).html`, { desc: 'HTML', ext: '.html' });
}
