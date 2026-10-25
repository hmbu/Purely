// Mobile remote: big touch controls, jump tree, presenter notes, next-slide preview, timer, Decision Point.
import { $, $$, esc, fmtClock } from './core/util.js';
import { projectsOf, sectionsOf, slidesOf } from './core/model.js';
import { loadContent } from './core/store.js';
import { createSync } from './core/sync.js';
import { slideLabel } from './core/templates.js';

let content = null, state = null, lastStateAt = 0;

const sync = createSync('remote', msg => {
  if (msg.type === 'state' && msg.role === 'show') { state = msg.state; lastStateAt = Date.now(); render(); }
  if (msg.type === 'content' && msg.content) { content = msg.content; renderTree(); renderDecisions(); }
});
sync.onStatus(updateConn);
setInterval(updateConn, 2000);
function updateConn() {
  const st = sync.status(), alive = Date.now() - lastStateAt < 6000 || !!state;
  const dot = $('#dot');
  dot.className = st.ws ? 'ok' : st.bc ? 'local' : '';
  $('#connText').textContent = st.ws ? (state ? 'متصل بالعرض' : 'متصل — بانتظار شاشة العرض') : st.bc ? 'وضع نفس الجهاز' : 'غير متصل';
  if (!alive) sync.send('hello', {});
}

function cmd(name, args = {}) {
  if (navigator.vibrate) navigator.vibrate(12);
  sync.send('cmd', { cmd: name, args });
}

/* ---------- controls */
$$('[data-cmd]').forEach(b => b.addEventListener('click', () => {
  const c = b.dataset.cmd;
  if (c === 'reloadShow') { if (confirm('إعادة تحميل شاشة العرض؟')) cmd('reload'); return; }
  cmd(c);
}));
$$('[data-toggle]').forEach(b => b.addEventListener('click', () => {
  const t = b.dataset.toggle;
  if (t === 'black') cmd('black', { on: !state?.black });
  if (t === 'mute') cmd('mute', { on: !state?.muted });
  if (t === 'discussionTimer') cmd('discussionTimer', { on: !state?.decision?.timerOn });
}));
$('#resetClock').addEventListener('click', () => { if (confirm('تصفير مؤقت العرض؟')) cmd('resetTimer'); });
$('#clearDecisions').addEventListener('click', () => { if (confirm('مسح كل اختيارات القرار؟')) cmd('decisionClear'); });
$$('.tabs button').forEach(b => b.addEventListener('click', () => {
  $$('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  $$('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab));
}));
// keep the phone awake during the show
document.addEventListener('click', async () => { try { await navigator.wakeLock?.request('screen'); } catch {} }, { once: true });

setInterval(() => { if (state?.startedAt) $('#clock').textContent = fmtClock(Date.now() - state.startedAt); }, 500);

/* ---------- render state */
const LEVEL = { universe: 'البداية (Universe)', hub: 'صفحة المشروع', section: 'قسم', decision: 'نقطة القرار', closing: 'الختام', boot: '…' };
function render() {
  if (!state) return;
  const crumb = [state.projectName, state.sectionTitle].filter(Boolean).join(' › ');
  $('#crumb').textContent = state.level === 'section' ? `${crumb} · ${state.slideIndex + 1}/${state.slideCount}${state.steps ? ` · مرحلة ${state.step + 1}/${state.steps + 1}` : ''}` : LEVEL[state.level] || state.level;
  $('#title').textContent = state.title || '—';
  $('#notes').textContent = state.notes || '—';
  const n = state.next || {};
  $('#nextLabel').textContent = n.label || '—';
  $('#nextMeta').textContent = [n.project, n.section, n.template].filter(Boolean).join(' · ');
  $('#nextThumb').style.backgroundImage = n.image ? `url("${new URL(n.image, location.href).href}")` : '';
  $('#blackBtn').classList.toggle('is-on', !!state.black);
  $('#muteBtn').classList.toggle('is-on', !!state.muted);
  $('#timerBtn').classList.toggle('is-on', !!state.decision?.timerOn);
  // concept focus controls
  const isConcepts = state.template === 'concepts';
  $('#conceptsCtl').hidden = !isConcepts;
  if (isConcepts && content) {
    const sl = findSlide(state.slideId); const items = sl?.data?.items || [];
    $('#conceptBtns').innerHTML = items.map((it, i) => `<button data-focus="${i}" class="${state.focus === i ? 'is-on' : ''}">${esc(it.label || i + 1)}</button>`).join('') + `<button data-focus="-1">الكل</button>`;
    $$('#conceptBtns button').forEach(b => b.onclick = () => cmd('focus', { index: +b.dataset.focus }));
  }
  $$('#tree .is-current').forEach(e => e.classList.remove('is-current'));
  if (state.slideId) $(`#tree [data-slide="${CSS.escape(state.slideId)}"]`)?.classList.add('is-current');
  renderDecisions();
}
function findSlide(id) {
  for (const p of content?.projects || []) for (const s of p.sections || []) for (const sl of s.slides || []) if (sl.id === id) return sl;
  return null;
}

/* ---------- jump tree */
function renderTree() {
  if (!content) return;
  $('#tree').innerHTML = projectsOf(content).map(p => `
    <div class="p-block">
      <div class="p-head"><button data-goto-project="${esc(p.id)}">${esc(p.nameAr || p.name)} <small class="latin">${esc(p.name)}</small></button></div>
      ${sectionsOf(p).map((s, si) => `
        <div class="s-block">
          <button class="s-head" data-goto-section="${esc(s.id)}" data-project="${esc(p.id)}">${si + 1}. ${esc(s.title)}</button>
          <div class="slides">${slidesOf(s).map((sl, i) => `<button data-slide="${esc(sl.id)}" data-project="${esc(p.id)}" data-section="${esc(s.id)}" data-index="${i}">${i + 1}. ${esc(slideLabel(sl))}</button>`).join('')}</div>
        </div>`).join('')}
    </div>`).join('');
  $$('#tree [data-goto-project]').forEach(b => b.onclick = () => cmd('enterProject', { projectId: b.dataset.gotoProject }));
  $$('#tree [data-goto-section]').forEach(b => b.onclick = () => cmd('goto', { projectId: b.dataset.project, sectionId: b.dataset.gotoSection, slideIndex: 0 }));
  $$('#tree [data-slide]').forEach(b => b.onclick = () => cmd('goto', { projectId: b.dataset.project, sectionId: b.dataset.section, slideIndex: +b.dataset.index }));
  render();
}

/* ---------- decisions */
function renderDecisions() {
  const d = content?.decision; if (!d) return;
  const sel = state?.decision?.selections || {};
  $('#decisionGroups').innerHTML = (d.groups || []).map(g => `
    <div class="card d-group"><div class="label">${esc(g.title)}</div>
      <div class="opts">${(g.options || []).map(o => `<button class="${sel[g.id] === o.id ? 'is-on' : ''}" data-g="${esc(g.id)}" data-o="${esc(o.id)}">${esc(o.label)}</button>`).join('')}</div>
    </div>`).join('');
  $$('#decisionGroups [data-o]').forEach(b => b.onclick = () => cmd('decisionSelect', { groupId: b.dataset.g, optionId: b.dataset.o }));
}

loadContent().then(c => { content = c; renderTree(); renderDecisions(); }).catch(() => {});
