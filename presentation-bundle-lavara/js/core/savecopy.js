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

export async function saveCopy(content) {
  const single = !!window.__BXL_CONTENT__;
  if (!single) {
    const blob = new Blob([JSON.stringify(clean(content), null, 2)], { type: 'application/json' });
    return deliver(blob, `content ${stamp()}.json`, { desc: 'JSON', ext: '.json' });
  }
  const frame = window.__BXL_PRISTINE__, app = document.getElementById('bxl-app')?.textContent;
  if (!frame || app == null) throw new Error('هذه النسخة لا تحمل إطارها — افتح الملف الأصلي');
  const build = `${Date.now().toString(36)}`;
  const json = s => JSON.stringify(s).replace(/</g, '\\u003c');
  const data = `window.__BXL_BUILD__=${json(build)};window.__BXL_ASSETS__=${json(window.__BXL_ASSETS__ || {})};window.__BXL_CONTENT__=${json(clean(content))};`;
  const html = `<!doctype html>\n${frame}<script id="bxl-cap">${window.__BXL_CAPTURE__}</script>\n<script id="bxl-data">${data}</script>\n<script id="bxl-app">${app}</script>\n</body>\n</html>\n`;
  const base = (decodeURIComponent(location.pathname.split('/').pop() || 'Bundle-x-Lavara.html')).replace(/\.html?$/i, '').replace(/\s*\(\d{4}-\d\d-\d\d [\d.]+\)$/, '');
  return deliver(new Blob([html], { type: 'text/html' }), `${base} (${stamp()}).html`, { desc: 'HTML', ext: '.html' });
}
