// Live sync between presentation, control panel and remote.
// Primary transport: WebSocket relay of the local launcher (works across devices).
// Fallback: BroadcastChannel (same machine, same browser) — always on, de-duplicated.
import { uid } from './util.js';
import { serverAvailable } from './store.js';

export function createSync(role, onMessage) {
  const id = uid(role);
  const seen = new Map();
  const listeners = new Set();
  let ws = null, wsOpen = false, retry = 0;
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('bxl-show') : null;

  function handle(msg) {
    if (!msg || msg.from === id || seen.has(msg.mid)) return;
    seen.set(msg.mid, Date.now());
    if (seen.size > 500) { const cut = [...seen.keys()].slice(0, 250); cut.forEach(k => seen.delete(k)); }
    if (msg.to && msg.to !== role && msg.to !== id) return;
    onMessage && onMessage(msg);
  }
  if (bc) bc.onmessage = e => handle(e.data);

  function connect() {
    if (!/^https?:$/.test(location.protocol)) return;
    try { ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`); } catch { return; }
    ws.onopen = () => { wsOpen = true; retry = 0; notify(); send('hello', {}); };
    ws.onmessage = e => { try { handle(JSON.parse(e.data)); } catch {} };
    ws.onclose = () => { wsOpen = false; notify(); setTimeout(connect, Math.min(5000, 600 + retry++ * 400)); };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }
  function notify() { listeners.forEach(f => f(status())); }
  function status() { return { ws: wsOpen, bc: !!bc, id, role }; }

  function send(type, payload = {}, to) {
    const msg = { mid: uid('m'), from: id, role, type, to, t: Date.now(), ...payload };
    seen.set(msg.mid, Date.now());
    if (bc) { try { bc.postMessage(msg); } catch {} }
    if (ws && wsOpen) { try { ws.send(JSON.stringify(msg)); } catch {} }
  }

  serverAvailable().then(ok => { if (ok) connect(); }); // WebSocket only with the local launcher
  if (bc) setTimeout(() => send('hello', {}), 50);
  return { id, send, status, onStatus: f => { listeners.add(f); f(status()); } };
}
