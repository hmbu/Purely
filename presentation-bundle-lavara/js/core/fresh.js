// New version notice. GitHub Pages lets browsers keep a page for up to 10 minutes, so after a publish an open (or
// reopened) page can still be the previous build. Each deploy stamps its build id on <html data-build> and writes
// version.txt; this checks that file (never cached) and, when a newer build is live, offers a one-tap reload.
// Nothing happens locally (no data-build) or in the single-file version.
export function watchForUpdates({ everyMs = 20000 } = {}) {
  const mine = document.documentElement.dataset.build;
  if (!mine || window.__BXL_CONTENT__ || !/^https?:$/.test(location.protocol)) return;
  let shown = false;
  const check = async () => {
    if (shown || document.hidden) return;
    try {
      const v = (await (await fetch('version.txt?t=' + Date.now(), { cache: 'no-store' })).text()).trim();
      if (v && v !== mine) show();
    } catch {}
  };
  function show() {
    shown = true;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'يوجد تحديث جديد — اضغط هنا لعرضه';
    b.style.cssText = 'position:fixed;z-index:99999;left:50%;bottom:2.4vh;translate:-50% 0;font:500 14px/1 "thmanyah-sans",system-ui,sans-serif;padding:12px 20px;border:0;border-radius:999px;background:#1E1B17;color:#F7F3EC;box-shadow:0 10px 30px -10px rgba(0,0,0,.5);cursor:pointer';
    b.onclick = () => { const u = new URL(location.href); u.searchParams.set('v', Date.now().toString(36)); location.replace(u); };
    document.body.appendChild(b);
  }
  setInterval(check, everyMs);
  addEventListener('visibilitychange', check);
  check();
}
