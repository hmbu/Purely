// Films chosen from the device when the single-file version cannot find them next to itself. They are read in place
// (in-memory addresses, nothing uploaded, the show never leaves the page); once chosen, every slide using that file
// name plays it, until the page is closed.
export const videoName = src => {
  if (!src || /^(blob|data):/.test(src)) return '';
  try { return decodeURIComponent(new URL(src, location.href).pathname.split('/').pop() || ''); } catch { return src.split('/').pop(); }
};
const picked = (window.__BXL_PICKED__ ||= {}); // file name → in-memory address

function choose(multiple) {
  return new Promise(res => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'video/*,.mp4,.mov,.m4v,.webm', multiple });
    inp.style.display = 'none'; document.body.append(inp);
    inp.addEventListener('change', () => { res([...inp.files]); inp.remove(); }, { once: true });
    inp.addEventListener('cancel', () => { res([]); inp.remove(); }, { once: true });
    inp.click();
  });
}
// pick the file for one film (any name); more than one may be picked at once and each is kept by its own name too
export async function pickVideo(wanted) {
  const files = await choose(true); if (!files.length) return '';
  files.forEach(f => { picked[f.name] = URL.createObjectURL(f); });
  const exact = files.find(f => f.name === wanted);
  const url = exact ? picked[exact.name] : picked[files[0].name];
  picked[wanted] = url;
  // other films waiting for a file just chosen start too
  document.querySelectorAll('video').forEach(v => {
    const n = videoName(v.currentSrc || v.getAttribute('src') || '');
    if (n && picked[n] && v.error) { v.src = picked[n]; v.load(); }
  });
  return url;
}
