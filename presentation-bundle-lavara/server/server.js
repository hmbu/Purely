#!/usr/bin/env node
/*
 * Bundle × Lavara — local show launcher.
 * Zero dependencies (Node 18+). Serves the show, control panel and remote,
 * relays live-sync messages over WebSocket, saves content.json with backups,
 * logs decisions, accepts media uploads, and prints the remote link + QR.
 *
 *   node server/server.js [--port 8080] [--open] [--open-chrome]
 */
'use strict';
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const qrcode = require('./qrcode.js');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const BACKUPS = path.join(DATA, 'backups');
const CONTENT = path.join(ROOT, 'content.json');
const DECISIONS = path.join(DATA, 'decisions-log.json');
const MAX_BACKUPS = 200;
const BACKUP_MIN_INTERVAL_MS = 60 * 1000;

const args = process.argv.slice(2);
const argVal = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const PORT = Number(process.env.PORT || argVal('--port', 8080));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.m4v': 'video/mp4',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.otf': 'font/otf', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};

fs.mkdirSync(BACKUPS, { recursive: true });

/* ---------------------------------------------------------------- helpers */
function localIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list || []) if (ni.family === 'IPv4' && !ni.internal) out.push(ni.address);
  }
  return out;
}
function primaryIP() {
  const ips = localIPs();
  return ips.find(ip => /^192\.168\./.test(ip)) || ips.find(ip => /^10\./.test(ip)) || ips[0] || 'localhost';
}
function urls() {
  const host = primaryIP();
  return {
    presentation: `http://localhost:${PORT}/presentation.html`,
    control: `http://localhost:${PORT}/control.html`,
    remote: `http://${host}:${PORT}/remote`,
    remoteLocal: `http://localhost:${PORT}/remote`,
  };
}
function qrSvg(text) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}
function qrTerminal(text) {
  const q = qrcode(0, 'L'); q.addData(text); q.make();
  const n = q.getModuleCount(), m = 2, lines = [];
  const dark = (r, c) => r >= 0 && c >= 0 && r < n && c < n && q.isDark(r, c);
  for (let r = -m; r < n + m; r += 2) {
    let line = '';
    for (let c = -m; c < n + m; c++) {
      const top = dark(r, c), bot = dark(r + 1, c);
      line += top && bot ? ' ' : top ? '▄' : bot ? '▀' : '█';
    }
    lines.push(line);
  }
  return lines.join('\n');
}
function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readBody(req, limit = 50 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('Body too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function safeJoin(base, rel) {
  const p = path.resolve(base, '.' + path.sep + rel);
  if (p !== base && !p.startsWith(base + path.sep)) return null;
  return p;
}
function stamp(d = new Date()) {
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
}

/* ---------------------------------------------------------------- content + backups */
let lastBackupAt = 0;
async function backupContent(reason = 'auto') {
  if (!fs.existsSync(CONTENT)) return null;
  const name = `content-${stamp()}-${reason}.json`;
  await fsp.copyFile(CONTENT, path.join(BACKUPS, name));
  lastBackupAt = Date.now();
  const files = (await fsp.readdir(BACKUPS)).filter(f => f.endsWith('.json')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - MAX_BACKUPS))) await fsp.unlink(path.join(BACKUPS, f)).catch(() => {});
  return name;
}
async function saveContent(buf, { forceBackup = false, reason = 'auto' } = {}) {
  JSON.parse(buf.toString('utf8')); // validate
  let backup = null;
  if (forceBackup || Date.now() - lastBackupAt > BACKUP_MIN_INTERVAL_MS) backup = await backupContent(reason);
  const tmp = CONTENT + '.tmp';
  await fsp.writeFile(tmp, buf);
  await fsp.rename(tmp, CONTENT);
  return { ok: true, savedAt: new Date().toISOString(), backup };
}

/* ---------------------------------------------------------------- static files (with Range for video) */
async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/presentation.html';
  if (rel === '/remote' || rel === '/remote/') rel = '/remote.html';
  if (rel === '/control' || rel === '/control/') rel = '/control.html';
  const file = safeJoin(ROOT, rel);
  if (!file || /(^|[\\/])(\.git|node_modules)([\\/]|$)/.test(file)) return send(res, 403, { error: 'forbidden' });
  let st;
  try { st = await fsp.stat(file); } catch { return send(res, 404, { error: 'not found', path: rel }); }
  if (st.isDirectory()) return send(res, 404, { error: 'not found' });
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Last-Modified': st.mtime.toUTCString() };
  headers['Cache-Control'] = /\.(html|js|css|json)$/i.test(file) ? 'no-cache' : 'public, max-age=3600';
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
    if (m && !m[1] && m[2]) { start = Math.max(0, st.size - parseInt(m[2], 10)); end = st.size - 1; }
    if (start >= st.size || end >= st.size || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end();
    }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, 'Content-Length': st.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

async function listFiles(dir, base = ROOT) {
  const out = [];
  async function walk(d) {
    let entries; try { entries = await fsp.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else {
        const st = await fsp.stat(full);
        out.push({ path: path.relative(base, full).split(path.sep).join('/'), size: st.size, mtime: st.mtimeMs });
      }
    }
  }
  await walk(dir);
  return out;
}

/* ---------------------------------------------------------------- API */
async function api(req, res, url) {
  const p = url.pathname;
  if (p === '/api/info') {
    const u = urls();
    return send(res, 200, { port: PORT, ips: localIPs(), urls: u, qr: qrSvg(u.remote), clients: clients.size });
  }
  if (p === '/api/content' && req.method === 'GET') {
    try { return send(res, 200, await fsp.readFile(CONTENT)); } catch { return send(res, 404, { error: 'content.json missing' }); }
  }
  if (p === '/api/content' && (req.method === 'PUT' || req.method === 'POST')) {
    try {
      const body = await readBody(req);
      const r = await saveContent(body, { forceBackup: url.searchParams.get('backup') === '1', reason: url.searchParams.get('reason') || 'auto' });
      return send(res, 200, r);
    } catch (e) { return send(res, 400, { error: String(e.message || e) }); }
  }
  if (p === '/api/backups' && req.method === 'GET') {
    const files = (await fsp.readdir(BACKUPS)).filter(f => f.endsWith('.json')).sort().reverse();
    const list = await Promise.all(files.map(async f => { const st = await fsp.stat(path.join(BACKUPS, f)); return { name: f, size: st.size, mtime: st.mtimeMs }; }));
    return send(res, 200, list);
  }
  if (p === '/api/backups' && req.method === 'POST') {
    const name = await backupContent(url.searchParams.get('reason') || 'manual');
    return send(res, 200, { ok: true, name });
  }
  if (p.startsWith('/api/backups/')) {
    const name = path.basename(decodeURIComponent(p.slice('/api/backups/'.length)));
    try { return send(res, 200, await fsp.readFile(path.join(BACKUPS, name))); } catch { return send(res, 404, { error: 'not found' }); }
  }
  if (p === '/api/decisions' && req.method === 'GET') {
    try { return send(res, 200, await fsp.readFile(DECISIONS)); } catch { return send(res, 200, []); }
  }
  if (p === '/api/decisions' && req.method === 'POST') {
    try {
      const entry = JSON.parse((await readBody(req, 1e6)).toString('utf8'));
      let log = [];
      try { log = JSON.parse(await fsp.readFile(DECISIONS, 'utf8')); } catch {}
      log.push({ ...entry, savedAt: new Date().toISOString() });
      await fsp.writeFile(DECISIONS, JSON.stringify(log, null, 2));
      return send(res, 200, { ok: true, count: log.length });
    } catch (e) { return send(res, 400, { error: String(e.message || e) }); }
  }
  if (p === '/api/upload' && req.method === 'POST') {
    const dir = url.searchParams.get('dir') || 'assets/uploads';
    const name = (url.searchParams.get('name') || 'file').replace(/[^\w.\-\u0600-\u06FF ]+/g, '_');
    const targetDir = safeJoin(ROOT, dir);
    if (!targetDir || !targetDir.startsWith(path.join(ROOT, 'assets'))) return send(res, 403, { error: 'uploads must go under assets/' });
    await fsp.mkdir(targetDir, { recursive: true });
    let target = path.join(targetDir, name);
    if (fs.existsSync(target) && url.searchParams.get('overwrite') !== '1') {
      const ext = path.extname(name); target = path.join(targetDir, `${path.basename(name, ext)}-${Date.now().toString(36)}${ext}`);
    }
    const ws = fs.createWriteStream(target);
    req.pipe(ws);
    ws.on('finish', () => send(res, 200, { ok: true, url: path.relative(ROOT, target).split(path.sep).join('/') }));
    ws.on('error', e => send(res, 500, { error: String(e) }));
    return;
  }
  if (p === '/api/files') {
    const dir = safeJoin(ROOT, url.searchParams.get('dir') || 'assets');
    if (!dir) return send(res, 403, { error: 'forbidden' });
    return send(res, 200, await listFiles(dir));
  }
  return send(res, 404, { error: 'unknown api' });
}

/* ---------------------------------------------------------------- WebSocket relay (RFC 6455, text frames) */
const clients = new Set();
function wsSend(sock, str) {
  const payload = Buffer.from(str, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) { header = Buffer.alloc(2); header[1] = len; }
  else if (len < 65536) { header = Buffer.alloc(4); header[1] = 126; header.writeUInt16BE(len, 2); }
  else { header = Buffer.alloc(10); header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2); }
  header[0] = 0x81;
  try { sock.write(Buffer.concat([header, payload])); } catch {}
}
function wsControl(sock, opcode, payload = Buffer.alloc(0)) {
  const h = Buffer.from([0x80 | opcode, payload.length]);
  try { sock.write(Buffer.concat([h, payload])); } catch {}
}
function broadcast(from, str) {
  for (const c of clients) if (c !== from && !c.destroyed) wsSend(c, str);
}
function handleUpgrade(req, sock) {
  const key = req.headers['sec-websocket-key'];
  if (!key || (req.url || '').split('?')[0] !== '/ws') { sock.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' + `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);
  sock.setNoDelay(true);
  clients.add(sock);
  let buf = Buffer.alloc(0);
  let fragments = [];
  sock.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const fin = (buf[0] & 0x80) !== 0, opcode = buf[0] & 0x0f, masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const maskOff = off; if (masked) off += 4;
      if (buf.length < off + len) return;
      let payload = buf.subarray(off, off + len);
      if (masked) { const mask = buf.subarray(maskOff, maskOff + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3]; }
      buf = buf.subarray(off + len);
      if (opcode === 0x8) { wsControl(sock, 0x8); sock.end(); return; }
      if (opcode === 0x9) { wsControl(sock, 0xA, payload); continue; }
      if (opcode === 0xA) continue;
      if (opcode === 0x1 || opcode === 0x0) {
        fragments.push(payload);
        if (fin) { const text = Buffer.concat(fragments).toString('utf8'); fragments = []; broadcast(sock, text); }
      }
    }
  });
  const drop = () => clients.delete(sock);
  sock.on('close', drop); sock.on('end', drop); sock.on('error', drop);
}
setInterval(() => { for (const c of clients) wsControl(c, 0x9); }, 20000).unref();

/* ---------------------------------------------------------------- server */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method not allowed' });
    return await serveStatic(req, res, url.pathname);
  } catch (e) {
    console.error(e); if (!res.headersSent) send(res, 500, { error: String(e) });
  }
});
server.on('upgrade', handleUpgrade);

function findChrome() {
  const c = {
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    win32: [
      path.join(process.env['PROGRAMFILES'] || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env['LOCALAPPDATA'] || '', 'Google\\Chrome\\Application\\chrome.exe'),
    ],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  }[process.platform] || [];
  return c.find(p => p && fs.existsSync(p));
}
function openChrome(target, extra = []) {
  const chrome = findChrome();
  if (!chrome) { console.log('  (Chrome not found — open the links above manually)'); return; }
  const profile = path.join(DATA, 'chrome-profile');
  spawn(chrome, [
    `--user-data-dir=${profile}`, '--autoplay-policy=no-user-gesture-required', '--no-first-run',
    '--disable-features=Translate', '--new-window', ...extra, target,
  ], { detached: true, stdio: 'ignore' }).unref();
}

server.listen(PORT, '0.0.0.0', () => {
  const u = urls();
  const line = '─'.repeat(64);
  console.log(`\n${line}\n  Bundle × Lavara — Show launcher\n${line}`);
  console.log(`  Presentation : ${u.presentation}`);
  console.log(`  Control panel: ${u.control}`);
  console.log(`  Remote (phone, same Wi-Fi): ${u.remote}`);
  console.log(`  Remote (this machine)     : ${u.remoteLocal}\n`);
  console.log(qrTerminal(u.remote));
  console.log(`\n  Scan the QR with the presenter's phone. Press Ctrl+C to stop.\n${line}\n`);
  if (args.includes('--open-chrome')) {
    openChrome(u.control);
    setTimeout(() => openChrome(u.presentation, ['--start-fullscreen']), 800);
  } else if (args.includes('--open')) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const a = process.platform === 'win32' ? ['/c', 'start', '', u.control] : [u.control];
    spawn(opener, a, { detached: true, stdio: 'ignore' }).unref();
  }
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.error(`\nPort ${PORT} is busy. Start with another port: node server/server.js --port 8090\n`);
  else console.error(e);
  process.exit(1);
});
