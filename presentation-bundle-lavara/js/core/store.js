// Loading and saving content.json. Three back-ends, picked automatically:
//   server — the local launcher (start.command / start.bat): /api/content with automatic backups, uploads, WebSocket sync.
//   github — the published site (GitHub Pages): the control panel commits content.json and uploads straight to the repo
//            through the GitHub API with a personal access token kept only in this browser. History = git commits.
//   local  — no launcher and no GitHub connection: content.json is read-only, edits are kept in this browser.

import { withDefaults } from './model.js';

const LS_KEY = 'bxl-content-cache';
const GH_KEY = 'bxl-github';

/* ---------------------------------------------------------------- back-end detection */
let serverProbe = null;
export function serverAvailable() {
  // the local launcher is always plain http — on https (GitHub Pages) skip the probe (no 404 in the console)
  if (location.protocol !== 'http:') return Promise.resolve(false);
  if (!serverProbe) serverProbe = fetch('/api/info', { cache: 'no-store' }).then(r => r.ok && (r.headers.get('content-type') || '').includes('json')).catch(() => false);
  return serverProbe;
}
let isServer = false;
export const hasServer = () => isServer;

export function githubConfig() { try { return JSON.parse(localStorage.getItem(GH_KEY) || 'null'); } catch { return null; } }
export function setGithubConfig(cfg) { if (cfg) localStorage.setItem(GH_KEY, JSON.stringify(cfg)); else localStorage.removeItem(GH_KEY); }
export const hasGithub = () => { const g = githubConfig(); return !!(g && g.owner && g.repo && g.token); };
export const backendMode = () => (isServer ? 'server' : hasGithub() ? 'github' : 'local');

/* ---------------------------------------------------------------- GitHub API */
const ghPath = p => { const g = githubConfig(); return `${(g.prefix || '').replace(/^\/+|\/+$/g, '')}${g.prefix ? '/' : ''}${p}`.replace(/^\/+/, ''); };
async function gh(method, url, body) {
  const g = githubConfig();
  const r = await fetch(`https://api.github.com/repos/${g.owner}/${g.repo}${url}`, {
    method, headers: { Authorization: `Bearer ${g.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined, cache: 'no-store',
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); const err = new Error(e.message || r.statusText); err.status = r.status; throw err; }
  return r.status === 204 ? null : r.json();
}
const b64utf8 = str => btoa(unescape(encodeURIComponent(str)));
const utf8b64 = b64 => decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
const branchQ = () => `ref=${encodeURIComponent(githubConfig().branch || 'main')}`;
async function ghGetFile(path, ref) {
  return gh('GET', `/contents/${encodeURI(ghPath(path))}?${ref ? 'ref=' + ref : branchQ()}`);
}
async function ghPutFile(path, base64, message, expectSha) {
  let sha;
  try { sha = (await ghGetFile(path)).sha; } catch (e) { if (e.status !== 404) throw e; }
  // Someone (another device, or a session update) committed after this panel loaded: never overwrite silently.
  if (expectSha && sha && sha !== expectSha) { const err = new Error('changed on GitHub since this panel was opened'); err.status = 409; err.conflict = true; throw err; }
  return gh('PUT', `/contents/${encodeURI(ghPath(path))}`, { message, content: base64, branch: githubConfig().branch || 'main', ...(sha ? { sha } : {}) });
}
export async function testGithub() {
  const g = githubConfig();
  const repo = await gh('GET', '');
  let pages = null; try { pages = await gh('GET', '/pages'); } catch {}
  await ghGetFile('content.json');
  return { repo: repo.full_name, private: repo.private, canPush: !!repo.permissions?.push, pagesUrl: pages?.html_url || `https://${g.owner}.github.io/${g.repo}/` };
}

/* ---------------------------------------------------------------- content */
export async function loadContent(opts) { return withDefaults(await loadRaw(opts)); }
async function loadRaw({ fresh = false } = {}) {
  if (window.__BXL_CONTENT__) return JSON.parse(JSON.stringify(window.__BXL_CONTENT__)); // single-file build
  isServer = await serverAvailable();
  if (fresh && !isServer && hasGithub()) { // control panel on the published site: always edit the latest commit
    try { const f = await ghGetFile('content.json'); const c = JSON.parse(utf8b64(f.content)); loadedSha = f.sha; cacheLocal(c); return c; } catch (e) { console.warn('GitHub load failed', e); }
  }
  const tries = isServer ? ['/api/content', 'content.json'] : ['content.json'];
  for (const url of tries) {
    try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok) { const c = await r.json(); cacheLocal(c); return c; } } catch {}
  }
  const cached = localStorage.getItem(LS_KEY);
  if (cached) return JSON.parse(cached);
  throw new Error('Could not load content.json — start the show with the launcher (start.command / start.bat).');
}
export function cacheLocal(c) { try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch {} }

// publish=false in GitHub mode only caches locally (commits happen on "Save / Publish").
let loadedSha = null; // content.json version this panel is editing (GitHub mode)
export async function saveContent(c, { backup = false, reason = 'auto', publish = true, force = false } = {}) {
  cacheLocal(c);
  if (isServer) {
    const r = await fetch(`/api/content?backup=${backup ? 1 : 0}&reason=${encodeURIComponent(reason)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c, null, 2) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
    return { ...(await r.json()), mode: 'server' };
  }
  if (hasGithub()) {
    if (!publish) return { ok: true, mode: 'github', pending: true };
    // a panel that never read the published file (GitHub load failed, it fell back to an older copy) must not
    // overwrite it silently: without a known sha any published file counts as a conflict
    const r = await ghPutFile('content.json', b64utf8(JSON.stringify(c, null, 2)), `Update presentation content (${reason})`, force ? null : (loadedSha || 'not-loaded'));
    loadedSha = r?.content?.sha || null;
    return { ok: true, mode: 'github', savedAt: new Date().toISOString() };
  }
  return { ok: false, mode: 'local' };
}

// One small change made on the show (text edited in place): reload the latest content.json, apply only that
// change and save it. Nothing the control panel or another device saved in between is overwritten; if someone
// commits at the same moment, GitHub rejects the stale write and the change is re-applied on the newer file.
export async function patchContent(mutate) {
  if (window.__BXL_CONTENT__) return { ok: false, mode: 'single' };
  if (isServer) {
    const c = await (await fetch('/api/content', { cache: 'no-store' })).json();
    if (mutate(c) === false) throw new Error('النص غير موجود في آخر نسخة من المحتوى');
    await saveContent(c, { reason: 'edit in show' }); return { ok: true, mode: 'server' };
  }
  if (!hasGithub()) return { ok: false, mode: 'local' };
  for (let i = 0; ; i++) {
    const f = await ghGetFile('content.json');
    const c = JSON.parse(utf8b64(f.content));
    if (mutate(c) === false) throw new Error('النص غير موجود في آخر نسخة من المحتوى');
    try {
      await gh('PUT', `/contents/${encodeURI(ghPath('content.json'))}`, { message: 'Edit text in the show', content: b64utf8(JSON.stringify(c, null, 2)), branch: githubConfig().branch || 'main', sha: f.sha });
      return { ok: true, mode: 'github' };
    } catch (e) { if ((e.status === 409 || e.status === 422) && i < 2) continue; throw e; }
  }
}

/* ---------------------------------------------------------------- history / backups */
export async function listBackups() {
  if (isServer) { const r = await fetch('/api/backups'); return r.ok ? r.json() : []; }
  if (hasGithub()) {
    const list = await gh('GET', `/commits?path=${encodeURIComponent(ghPath('content.json'))}&sha=${encodeURIComponent(githubConfig().branch || 'main')}&per_page=60`);
    return list.map(c => ({ name: c.sha, label: c.commit.message, mtime: new Date(c.commit.author.date).getTime(), size: 0 }));
  }
  return [];
}
export async function getBackup(name) {
  if (isServer) { const r = await fetch('/api/backups/' + encodeURIComponent(name)); return r.json(); }
  const f = await ghGetFile('content.json', name); return JSON.parse(utf8b64(f.content));
}
export async function makeBackup(reason = 'manual') {
  if (isServer) { const r = await fetch('/api/backups?reason=' + reason, { method: 'POST' }); return r.json(); }
  return { ok: true, note: 'git history keeps every published version' };
}

/* ---------------------------------------------------------------- files */
const fileB64 = file => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(file); });
export async function uploadFile(file, dir, { onProgress } = {}) {
  const name = file.name.replace(/[^\w.\-؀-ۿ ]+/g, '_');
  if (isServer) {
    const r = await fetch(`/api/upload?dir=${encodeURIComponent(dir)}&name=${encodeURIComponent(name)}`, { method: 'POST', body: file });
    if (!r.ok) throw new Error('Upload failed');
    return (await r.json()).url;
  }
  if (hasGithub()) {
    if (file.size > 95 * 1024 * 1024) throw new Error('الملف أكبر من 95MB — حد GitHub');
    const path = `${dir.replace(/\/+$/, '')}/${Date.now().toString(36)}-${name}`;
    // Big files (videos) are sent as numbered parts of 8MB each (small requests always go through); the publish
    // workflow joins the parts back into the original file, byte for byte, when it builds the site.
    const PART = 8 * 1024 * 1024;
    if (file.size > PART * 1.5) {
      const n = Math.ceil(file.size / PART);
      for (let i = 0; i < n; i++) {
        onProgress?.(i, n);
        await ghPutFile(`${path}.part-${String(i).padStart(3, '0')}`, await fileB64(file.slice(i * PART, (i + 1) * PART)), `Upload ${name} (${i + 1}/${n})`);
      }
      onProgress?.(n, n);
    } else await ghPutFile(path, await fileB64(file), `Upload ${name}`);
    return path;
  }
  throw new Error('الرفع يتطلب المشغّل المحلي أو ربط GitHub');
}
export async function listFiles(dir = 'assets') {
  if (isServer) { const r = await fetch('/api/files?dir=' + encodeURIComponent(dir)); return r.ok ? r.json() : []; }
  if (hasGithub()) {
    const t = await gh('GET', `/git/trees/${encodeURIComponent(githubConfig().branch || 'main')}?recursive=1`);
    const pre = ghPath('');
    return t.tree.filter(x => x.type === 'blob' && x.path.startsWith(pre + dir)).map(x => ({ path: x.path.slice(pre.length), size: x.size }));
  }
  return [];
}
export async function serverInfo() { if (!isServer) return null; const r = await fetch('/api/info'); return r.ok ? r.json() : null; }

/* ---------------------------------------------------------------- decisions */
export async function logDecision(entry) {
  if (isServer) { await fetch('/api/decisions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }).catch(() => {}); return; }
  try { const l = JSON.parse(localStorage.getItem('bxl-decision-log') || '[]'); l.push({ ...entry, savedAt: new Date().toISOString() }); localStorage.setItem('bxl-decision-log', JSON.stringify(l)); } catch {}
}
export async function getDecisionLog() {
  if (isServer) { const r = await fetch('/api/decisions'); return r.ok ? r.json() : []; }
  try { return JSON.parse(localStorage.getItem('bxl-decision-log') || '[]'); } catch { return []; }
}
