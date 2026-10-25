// Loading and saving content.json.
// Served by the launcher: GET/PUT /api/content (server keeps automatic backups).
// Fallbacks: static content.json, then the last copy kept in localStorage.

const LS_KEY = 'bxl-content-cache';
export const hasServer = () => /^https?:$/.test(location.protocol);

export async function loadContent() {
  const tries = hasServer() ? ['/api/content', 'content.json'] : ['content.json'];
  for (const url of tries) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (r.ok) { const c = await r.json(); cacheLocal(c); return c; }
    } catch {}
  }
  const cached = localStorage.getItem(LS_KEY);
  if (cached) return JSON.parse(cached);
  throw new Error('Could not load content.json — start the show with the launcher (start.command / start.bat).');
}

export function cacheLocal(c) { try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch {} }

export async function saveContent(c, { backup = false, reason = 'auto' } = {}) {
  cacheLocal(c);
  if (!hasServer()) return { ok: false, local: true };
  const r = await fetch(`/api/content?backup=${backup ? 1 : 0}&reason=${encodeURIComponent(reason)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c, null, 2),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
}

export async function listBackups() { const r = await fetch('/api/backups'); return r.ok ? r.json() : []; }
export async function getBackup(name) { const r = await fetch('/api/backups/' + encodeURIComponent(name)); return r.json(); }
export async function makeBackup(reason = 'manual') { const r = await fetch('/api/backups?reason=' + reason, { method: 'POST' }); return r.json(); }

export async function uploadFile(file, dir) {
  const r = await fetch(`/api/upload?dir=${encodeURIComponent(dir)}&name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file });
  if (!r.ok) throw new Error('Upload failed');
  return (await r.json()).url;
}
export async function listFiles(dir = 'assets') { const r = await fetch('/api/files?dir=' + encodeURIComponent(dir)); return r.ok ? r.json() : []; }
export async function serverInfo() { const r = await fetch('/api/info'); return r.ok ? r.json() : null; }

export async function logDecision(entry) {
  if (!hasServer()) return;
  await fetch('/api/decisions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }).catch(() => {});
}
export async function getDecisionLog() { const r = await fetch('/api/decisions'); return r.ok ? r.json() : []; }
