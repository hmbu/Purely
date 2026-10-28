// Full-screen image viewer for detailed material (e.g. an operating flowchart): any element with
// data-zoom="url" opens it. Wheel or +/- zooms around the pointer, drag pans, double-click fits, Esc closes.
// While open it owns the keyboard, so presentation keys never move the slides behind it.
export function initZoom() {
  const box = document.createElement('div');
  box.className = 'zoom-view'; box.hidden = true;
  box.innerHTML = '<img alt=""><button class="zv-close" aria-label="إغلاق">×</button><span class="zv-hint">اسحب للتنقل · عجلة الفأرة أو + / − للتكبير · Esc للإغلاق</span>';
  document.body.appendChild(box);
  const img = box.querySelector('img');
  let z = 1, x = 0, y = 0, drag = null;
  const apply = () => { img.style.transform = `translate(${x}px, ${y}px) scale(${z})`; };
  const fit = () => {
    const r = box.getBoundingClientRect(), w = img.naturalWidth || 1, h = img.naturalHeight || 1;
    z = Math.min(r.width / w, r.height / h) * 0.96; x = (r.width - w * z) / 2; y = (r.height - h * z) / 2; apply();
  };
  const zoomAt = (f, cx, cy) => { const nz = Math.min(4, Math.max(0.05, z * f)); x = cx - (cx - x) * (nz / z); y = cy - (cy - y) * (nz / z); z = nz; apply(); };
  const open = src => { box.hidden = false; document.body.classList.add('zoom-open'); if (img.getAttribute('src') !== src) { img.onload = fit; img.src = src; } else fit(); };
  const close = () => { box.hidden = true; document.body.classList.remove('zoom-open'); };

  addEventListener('click', e => { const t = e.target.closest?.('[data-zoom]'); if (t && !document.body.classList.contains('is-editing')) { e.stopPropagation(); e.preventDefault(); open(t.dataset.zoom); } }, true);
  box.querySelector('.zv-close').onclick = close;
  box.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });
  box.addEventListener('pointerdown', e => { if (e.target.closest('.zv-close')) return; drag = { px: e.clientX, py: e.clientY, x, y }; box.setPointerCapture(e.pointerId); box.classList.add('is-drag'); });
  box.addEventListener('pointermove', e => { if (!drag) return; x = drag.x + e.clientX - drag.px; y = drag.y + e.clientY - drag.py; apply(); });
  box.addEventListener('pointerup', () => { drag = null; box.classList.remove('is-drag'); });
  box.addEventListener('dblclick', fit);
  addEventListener('keydown', e => {
    if (box.hidden) return;
    e.stopPropagation(); e.preventDefault();
    const r = box.getBoundingClientRect();
    if (e.key === 'Escape') close();
    else if (e.key === '+' || e.key === '=') zoomAt(1.25, r.width / 2, r.height / 2);
    else if (e.key === '-' || e.key === '_') zoomAt(0.8, r.width / 2, r.height / 2);
    else if (e.key === '0') fit();
  }, true);
  addEventListener('resize', () => { if (!box.hidden) fit(); });
}
