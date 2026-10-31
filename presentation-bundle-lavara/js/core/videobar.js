// On-screen controls for the show's films: play / pause, a seek bar with the time, sound, and back to the start.
// The bar appears when the pointer moves over the film or the film is paused, and hides itself after a moment.
// Clicks on it never reach the show (no slide change). A film whose file cannot be found offers to pick it from the
// device instead (the single-file version reads its films from the folder it sits in).
import { pickVideo, videoName } from './media.js';

const fmt = s => { if (!isFinite(s)) return '0:00'; s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M6 12a6 6 0 1 0 2-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 4.5v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

export function attachVideoBar(video, host = video.parentElement) {
  if (!video || !host) return;
  if (video._bar) { // a film reused on a new slide: its controls move with it
    if (video._bar.parentElement !== host) { host.append(video._bar, video._miss); host.addEventListener('pointermove', video._wake); }
    return;
  }
  const bar = document.createElement('div');
  bar.className = 'vb'; bar.dir = 'ltr';
  bar.innerHTML = `<button class="vb-play" title="تشغيل / إيقاف (P)"></button>
    <span class="vb-t latin">0:00</span>
    <div class="vb-track"><i class="vb-buf"></i><i class="vb-fill"></i><b class="vb-knob"></b></div>
    <span class="vb-d latin">0:00</span>
    <button class="vb-restart" title="من البداية">${ICON.restart}</button>
    <button class="vb-sound" title="الصوت"></button>`;
  const missing = document.createElement('div');
  missing.className = 'vb-missing'; missing.hidden = true;
  host.append(bar, missing);
  video._bar = bar; video._miss = missing;
  const $ = s => bar.querySelector(s), track = $('.vb-track');
  const paint = () => {
    const d = video.duration, t = video.currentTime, k = isFinite(d) && d ? t / d : 0;
    $('.vb-fill').style.width = `${k * 100}%`; $('.vb-knob').style.left = `${k * 100}%`;
    $('.vb-t').textContent = fmt(t); $('.vb-d').textContent = fmt(d);
    try { const b = video.buffered; $('.vb-buf').style.width = `${b.length && d ? (b.end(b.length - 1) / d) * 100 : 0}%`; } catch {}
    $('.vb-play').innerHTML = video.paused ? ICON.play : ICON.pause;
    $('.vb-sound').innerHTML = video.muted || !video.volume ? ICON.mute : ICON.sound;
    bar.classList.toggle('is-paused', video.paused);
  };
  ['timeupdate', 'durationchange', 'progress', 'play', 'pause', 'volumechange', 'loadedmetadata', 'seeked'].forEach(e => video.addEventListener(e, paint));
  paint();

  // shown while the pointer moves over the film (or it is paused); hidden a moment after
  let t = 0;
  const wake = () => { bar.classList.add('on'); clearTimeout(t); t = setTimeout(() => { if (!bar.matches(':hover') && !dragging) bar.classList.remove('on'); }, 2200); };
  video._wake = wake; host.addEventListener('pointermove', wake); bar.addEventListener('pointerenter', wake); video.addEventListener('pause', wake);

  const stop = e => { e.stopPropagation(); };
  ['click', 'pointerdown', 'pointerup', 'mousedown', 'touchstart', 'touchend', 'dblclick'].forEach(ev => bar.addEventListener(ev, stop));
  $('.vb-play').addEventListener('click', () => { if (video.paused) video.play().catch(() => { video.muted = true; video.play().catch(() => {}); }); else video.pause(); });
  $('.vb-restart').addEventListener('click', () => { video.currentTime = 0; video.play().catch(() => {}); });
  $('.vb-sound').addEventListener('click', () => { video.muted = !video.muted; if (!video.muted && !video.volume) video.volume = 1; });

  // seeking: click or drag along the track (it reads left to right like any player, even on an Arabic page)
  let dragging = false;
  const seekTo = e => { const r = track.getBoundingClientRect(), k = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); if (isFinite(video.duration)) video.currentTime = k * video.duration; paint(); };
  track.addEventListener('pointerdown', e => { dragging = true; track.setPointerCapture(e.pointerId); seekTo(e); });
  track.addEventListener('pointermove', e => { if (dragging) seekTo(e); });
  track.addEventListener('pointerup', e => { dragging = false; try { track.releasePointerCapture(e.pointerId); } catch {} wake(); });

  // the film's file is not there: say which one, and offer to pick it from the device
  video.addEventListener('error', () => {
    const name = videoName(video.currentSrc || video.getAttribute('src') || '');
    if (!name) return;
    missing.hidden = false; bar.hidden = true;
    missing.innerHTML = `<p>لم يُعثر على الفيلم <b class="latin">${name.replace(/[<&]/g, '')}</b></p>
      <p class="vb-hint">ضعه في نفس مجلد ملف العرض بنفس الاسم، أو اختره من الجهاز</p>
      <button class="vb-pick">اختيار الفيلم…</button>`;
    ['click', 'pointerdown', 'pointerup'].forEach(ev => missing.addEventListener(ev, stop));
    missing.querySelector('.vb-pick').addEventListener('click', async () => {
      const url = await pickVideo(name); if (!url) return;
      missing.hidden = true; bar.hidden = false; video.src = url; video.load(); video.play().catch(() => {});
    });
  });
}
