'use strict';
/* ================= icons ================= */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  check: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
  checkmark: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  note: '<path d="M14 3H6.5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  mic: '<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21.5M8.5 21.5h7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-3.8-5.9"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  starf: '<path fill="currentColor" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13"/>',
  edit: '<path d="M4 20h4L19.5 8.5a2.8 2.8 0 0 0-4-4L4 16z"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  clip: '<path d="m20 11.5-8.4 8.4a5 5 0 0 1-7.1-7.1L13 4.3a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
  left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  down: '<path d="m6 9 6 6 6-6"/>', up: '<path d="m18 15-6-6-6 6"/>',
  ai: '<path d="M12 3l1.9 4.9L19 9.8l-5.1 1.9L12 16.6l-1.9-4.9L5 9.8l5.1-1.9z"/><path d="M19 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 21h16"/>',
  pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="M7 4.5v15L19 12z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  folder: '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H9l2 2.5h7.5A2.5 2.5 0 0 1 21 9v9.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5z"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8.5a4.5 4.5 0 0 1-.5 10z"/>',
  link: '<path d="M10 13.5a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7L11.8 5.7"/><path d="M14 10.5a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  rec: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/>',
  flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  file: '<path d="M14 3H6.5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V9z"/><path d="M14 3v6h6"/>',
  pdf: '<path d="M14 3H6.5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V9z"/><path d="M14 3v6h6M8 14h8M8 17.5h5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
  tg: '<path d="M21.5 4.5 2.8 11.7c-.9.4-.9 1.6.1 1.9l4.6 1.4 1.7 5.3c.3.8 1.3 1 1.9.4l2.6-2.4 4.6 3.4c.7.5 1.7.1 1.9-.7l3.2-15c.2-1-.8-1.8-1.9-1.5zM9 15l9-8"/>',
  wa: '<path d="M3.5 20.5 5 16.3A8.5 8.5 0 1 1 8 19.2z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a4.5 4.5 0 0 1-2.3-2.3l.8-1-1-2z"/>'
};
function ic(n, s = 20) { return `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`; }
function logo(s = 28) { return `<img src="icons/icon-192.png" width="${s}" height="${s}" alt="" style="border-radius:${Math.round(s * .26)}px">`; }

/* ================= back navigation (top-bar arrow + Android back button) ================= */
const NavStack = [];
let backGuard = false;
function ensureGuard() {
  const need = Sheets.length > 0 || NavStack.length > 0 || S.route !== 'home' || !$('#voiceOv').hidden || !$('#recOv').hidden;
  if (need && !backGuard) { try { history.pushState({ g: 1 }, ''); backGuard = true; } catch (e) { } }
}
window.addEventListener('popstate', () => {
  backGuard = false;
  if (!$('#voiceOv').hidden) closeVoice();
  else if (!$('#recOv').hidden) hideRec(true);
  else if (Sheets.length) closeSheet();
  else goBack();
  ensureGuard();
});
function goBack() {
  if (NavStack.length) { const p = NavStack.pop(); S.route = p.route; if (p.meetingId) S.meetingId = p.meetingId; render(); window.scrollTo(0, 0); }
  else if (S.route !== 'home') { S.route = 'home'; render(); window.scrollTo(0, 0); }
}

/* ================= sheets & dialogs ================= */
const Sheets = [];
function openSheet(html, { cls = '', onClose } = {}) {
  const w = document.createElement('div');
  w.className = 'sheet-wrap';
  w.innerHTML = `<div class="sheet-bg"></div><div class="sheet ${cls}">${html}</div>`;
  document.body.appendChild(w);
  requestAnimationFrame(() => w.classList.add('open'));
  const entry = { w, onClose };
  w.querySelector('.sheet-bg').onclick = () => { if (Sheets[Sheets.length - 1] === entry && !entry.locked) closeSheet(); };
  Sheets.push(entry);
  ensureGuard();
  return w.querySelector('.sheet');
}
function closeSheet() {
  const s = Sheets.pop(); if (!s) return;
  s.w.classList.remove('open'); setTimeout(() => s.w.remove(), 220);
  if (s.onClose) s.onClose();
}
function closeAllSheets() { while (Sheets.length) closeSheet(); }
function topSheet() { return Sheets[Sheets.length - 1]; }
function dialog({ title, text = '', html = '', buttons = [{ l: 'OK', v: true, p: 1 }], onMount }) {
  return new Promise(res => {
    const sh = openSheet(`<div class="dlg-t">${esc(title)}</div>${text ? `<div class="dlg-x">${text}</div>` : ''}${html}<div class="dlg-b">${buttons.map((b, i) => `<button class="btn ${b.p ? 'pri' : b.d ? 'danger' : 'ghost'}" data-i="${i}">${esc(b.l)}</button>`).join('')}</div>`, { cls: 'center', onClose: () => res(undefined) });
    const entry = topSheet();
    $$('.dlg-b button', sh).forEach(b => b.onclick = () => {
      let v = buttons[+b.dataset.i].v;
      if (typeof v === 'function') { v = v(sh); if (v === false) return; }
      entry.onClose = null; closeSheet(); res(v);
    });
    if (onMount) onMount(sh);
  });
}
async function askChoice(title, text, options, custom) {
  const btns = options.map(o => ({ l: o.l, v: o.v, p: o.p }));
  let html = '';
  if (custom) {
    html = `<input class="inp" id="dlg_custom" type="${custom.type}" ${custom.value ? `value="${esc(custom.value)}"` : ''} ${custom.ph ? `placeholder="${esc(custom.ph)}"` : ''} style="margin-bottom:4px">`;
    btns.push({ l: custom.label || t('Выбрать'), v: sh => { const x = $('#dlg_custom', sh).value; if (!x) { toast(t('Укажите значение')); return false; } return x; } });
  }
  btns.push({ l: t('Отмена'), v: null });
  return dialog({ title, text, html, buttons: btns });
}
async function askDateTime(d, dur) {
  dur = dur || S.set.defaultDur;
  return dialog({
    title: t('Выберите время'),
    html: `<div class="g2"><div><label class="lbl">${t('Дата')}</label><input class="inp" type="date" id="dt_d" value="${d.date || D.today()}"></div><div><label class="lbl">${t('Начало')}</label><input class="inp" type="time" id="dt_s" value="${d.start || ''}"></div></div>
      <label class="lbl">${t('Длительность')}</label><select class="inp" id="dt_u">${[15, 30, 45, 60, 90, 120, 180, 240].map(m => `<option value="${m}" ${m === dur ? 'selected' : ''}>${durLabel(m)}</option>`).join('')}</select>`,
    buttons: [{ l: t('Готово'), p: 1, v: sh => { const date = $('#dt_d', sh).value, start = $('#dt_s', sh).value; if (!date || !start) { toast(t('Укажите дату и время')); return false; } return { date, start, end: D.addMin(start, +$('#dt_u', sh).value) }; } }, { l: t('Отмена'), v: null }]
  });
}
async function confirmDel(text) { return (await dialog({ title: text, buttons: [{ l: t('Удалить'), v: true, d: 1 }, { l: t('Отмена'), v: false }] })) === true; }

/* ================= common pieces ================= */
function sec(title, cnt = '', right = '') { return `<div class="sec"><h3>${esc(title)}</h3>${cnt !== '' ? `<span class="cnt">${esc(cnt)}</span>` : ''}<span class="sp"></span>${right}</div>`; }
function emptyBox(emoji, text) { return `<div class="empty"><b>${emoji}</b>${text}</div>`; }
function fab(onclick, extra = '') { return `<div class="fab-wrap">${extra}<button class="fab" onclick="${onclick}" aria-label="${esc(t('Добавить'))}">${ic('plus', 26)}</button></div>`; }
function pbar(p, cancelled) { if (p == null) return ''; return `<span class="pb ${cancelled ? 'cx' : ''}"><i style="width:${p}%"></i></span><span class="pct">${p}%</span>`; }
function statusTag(it) {
  if (it.status === 'cancelled') return `<span class="tag">${t('Отменена')}</span>`;
  if (isOverdue(it)) return `<span class="tag red">${t('Просрочено')}</span>`;
  if (it.status === 'progress') return `<span class="tag blue">${t('В работе')}</span>`;
  return '';
}
function row(it, o = {}) {
  const c = catOf(it), done = it.status === 'done', p = progress(it);
  const time = it.start ? timeLabel(it) : '';
  let tcol = o.showDate ? `<div class="row-time"><span>${esc(D.human(it.date))}</span>${time || '—'}</div>` : `<div class="row-time">${time || `<span>${t('без времени')}</span>`}</div>`;
  if (o.cont) tcol = `<div class="row-time"><span>${t('до')}</span>${esc(D.short(spanEnd(it)))}</div>`;
  const ns = !done && it.status !== 'cancelled' && (it.subtasks || []).length ? nextSub(it) : null;
  const sub = [
    statusTag(it),
    it.priority !== 'normal' ? `<span class="tag" style="--t:${PRIO[it.priority].c}">${t(PRIO[it.priority].l)}</span>` : '',
    (it.subtasks || []).length || it.status === 'cancelled' ? pbar(p, it.status === 'cancelled') : '',
    it.kind === 'meeting' && it.recording ? `<span class="mini">${ic('rec', 12)}</span>` : '',
    (it.files || []).length ? `<span class="mini">${ic('clip', 12)}${it.files.length}</span>` : '',
    it.repeat && it.repeat.type !== 'none' ? `<span class="mini">${ic('repeat', 12)}</span>` : '',
    it.nag ? `<span class="mini">${ic('bell', 12)}</span>` : ''
  ].join('');
  const next = ns ? `<div class="row-next">${t('Далее')}: ${esc(ns.text)}${ns.due ? ' · ' + esc(D.human(ns.due)) : ''}</div>` : '';
  const why = it.status === 'cancelled' && it.cancelReason ? `<div class="row-next">${t('Причина')}: ${esc(it.cancelReason)}</div>` : '';
  return `<div class="row ${done ? 'done' : ''} ${it.status === 'cancelled' ? 'cancel' : ''}" data-open="${it.id}">
    <button class="chk ${done ? 'on' : ''}" style="--c:${c.color}" data-toggle="${it.id}" aria-label="${esc(t('Отметить выполненной'))}">${done ? ic('checkmark', 13) : ''}</button>
    ${tcol}
    <div class="row-main"><div class="row-title">${it.kind === 'meeting' ? ic('users', 14) + ' ' : ''}${esc(it.title)}</div><div class="row-sub">${sub}</div>${next}${why}</div>
    ${o.resched ? `<button class="rs-btn" data-resched="${it.id}">${t('Перенести')}</button>` : `<span class="cat" style="--t:${c.color}">${esc(catName(c))}</span>`}
  </div>`;
}
function subRow(it, s) {
  const c = catOf(it), p = progress(it);
  const od = s.due && subDueAt(s) < Date.now();
  return `<div class="row" data-open="${it.id}">
    <button class="chk sq" style="--c:${c.color}" data-subdone="${it.id}|${s.id}" aria-label="${esc(t('Отметить выполненной'))}"></button>
    <div class="row-time">${s.time || `<span>${t('подзадача')}</span>`}</div>
    <div class="row-main"><div class="row-title">↳ ${esc(s.text)}</div><div class="row-sub">${od ? `<span class="tag red">${t('Просрочено')}</span>` : ''}<span class="mini">${t('из задачи')} «${esc(it.title)}»</span>${pbar(p)}</div></div>
    <span class="cat" style="--t:${c.color}">${esc(catName(c))}</span></div>`;
}
function agendaRows(entries, o = {}) {
  return entries.map(e => e.subs ? e.subs.map(s => subRow(e.it, s)).join('') : row(e.it, Object.assign({}, o, { cont: e.cont }))).join('');
}
function listOf(items, o) { return `<div class="list">${items.map(i => row(i, o)).join('')}</div>`; }
function fileKind(f) {
  const n = (f.name || '').toLowerCase(), ty = (f.type || '').toLowerCase();
  if (ty === 'application/pdf' || n.endsWith('.pdf')) return ['PDF', '#ef4444', 'pdf'];
  if (/\.docx?$/.test(n)) return ['DOC', '#2563eb', 'docx'];
  if (/\.(xlsx?|csv)$/.test(n)) return ['XLS', '#16a34a', 'xlsx'];
  if (/\.pptx?$/.test(n)) return ['PPT', '#f97316', 'other'];
  if (ty.startsWith('image/')) return ['IMG', '#8b5cf6', 'img'];
  if (ty.startsWith('audio/')) return ['AUD', '#f59e0b', 'audio'];
  if (ty.startsWith('video/')) return ['VID', '#ec4899', 'other'];
  if (ty.startsWith('text/') || n.endsWith('.txt')) return ['TXT', '#64748b', 'other'];
  return [((n.split('.').pop() || 'FILE').slice(0, 4)).toUpperCase(), '#64748b', 'other'];
}
function ficon(f) { const [l, c] = fileKind(f); return `<span class="ficon" style="background:${c}">${esc(l)}</span>`; }
function attList(files, holderId, editable) {
  return `<div class="att">${files.map(f => `<div class="att-i" onclick="openFile('${holderId}','${f.id}')">${ficon(f)}<span>${esc(f.name)}</span>${editable ? `<button class="xbtn" style="width:26px;height:26px" onclick="event.stopPropagation();edRemoveFile('${f.id}')">${ic('x', 14)}</button>` : ''}</div>`).join('')}</div>`;
}

/* ================= navigation & render ================= */
const NAV = [['home', 'Главная', 'home'], ['calendar', 'Календарь', 'calendar'], ['tasks', 'Задачи', 'check'], ['notes', 'Заметки', 'note'], ['more', 'Ещё', 'grid']];
function renderNav() {
  const r = NAV.some(n => n[0] === S.route) ? S.route : 'more';
  $('#nav').innerHTML = `<div class="nav-logo">${logo(30)}<span>MARKUS-A</span></div>` + NAV.map(([k, l, i]) => `<button class="nav-btn ${r === k ? 'on' : ''}" onclick="${k === 'home' ? 'goHome()' : `go('${k}')`}">${ic(i, 22)}<span>${t(l)}</span></button>`).join('');
}
function go(route, arg) {
  if (route === 'meeting') S.meetingId = arg;
  if (route === 'calendar') S.scrollCal = true;
  if (route !== S.route || route === 'meeting') { NavStack.push({ route: S.route, meetingId: S.meetingId }); if (NavStack.length > 40) NavStack.shift(); }
  S.route = route;
  render(); window.scrollTo(0, 0); ensureGuard();
}
function goHome() { NavStack.length = 0; S.route = 'home'; render(); window.scrollTo(0, 0); }
function render() {
  document.documentElement.lang = langCode();
  renderNav();
  const fn = SCREENS[S.route] || SCREENS.home;
  const r = fn();
  $('#top').innerHTML = r.top || '';
  $('#screen').innerHTML = r.body || '';
  $('#dock').innerHTML = r.dock || '';
  if (S.route !== 'drive' && typeof driveWake !== 'undefined' && driveWake) driveWakeOff();
  if (typeof recDot === 'function') recDot();
  if (r.after) r.after();
}
document.addEventListener('click', e => {
  const x = e.target.closest('[data-toggle],[data-resched],[data-subdone],[data-open]');
  if (!x) return;
  if (x.dataset.toggle) { e.stopPropagation(); toggleDone(x.dataset.toggle); return; }
  if (x.dataset.resched) { e.stopPropagation(); smartReschedule(x.dataset.resched); return; }
  if (x.dataset.subdone) { e.stopPropagation(); const [a, b] = x.dataset.subdone.split('|'); subToggle(a, b); return; }
  if (x.dataset.open) openItem(x.dataset.open);
});
function openItem(id) {
  const it = getItem(id); if (!it) return;
  if (it.kind === 'meeting') go('meeting', id);
  else if (it.kind === 'note') openNoteEditor(it);
  else if (it.kind === 'contact') openContact(id);
  else openTaskDetail(it);
}
async function subToggle(itemId, subId) {
  const it = getItem(itemId); if (!it) return;
  const s = subById(it, subId); if (!s) return;
  if (s.done) { s.done = false; s.doneAt = null; await saveItem(it); refreshDetail(itemId); return; }
  if (isBlocked(it, s)) { toast(t('Сначала выполните «{x}»', { x: subById(it, s.after).text }), 3500); return; }
  const msgs = onSubDone(it, s);
  await saveItem(it);
  toast([t('Подзадача выполнена ✓')].concat(msgs).join(' · '), 4000);
  refreshDetail(itemId);
  if (it.subtasks.every(x => x.done) && it.status !== 'done') {
    const v = await dialog({ title: t('Все подзадачи выполнены'), text: t('Отметить задачу «{x}» выполненной?', { x: esc(it.title) }), buttons: [{ l: t('Да, задача выполнена'), v: 1, p: 1 }, { l: t('Пока нет'), v: 0 }] });
    if (v) { await setStatus(it, 'done'); toast(t('Задача выполнена ✓')); refreshDetail(itemId); }
  }
}

/* ================= task / meeting editor ================= */
let E = null; // current draft in editor
function openEditor(kind = 'task', preset = {}) {
  const existing = preset && preset.id ? getItem(preset.id) : null;
  const isNew = !existing || !!existing.deleted;
  E = clone(existing && !existing.deleted ? existing : Object.assign(newItem(kind), preset || {}));
  if (!E.kind) E.kind = kind;
  normalizeItem(E);
  let remTouched = !isNew;
  const isMeet = E.kind === 'meeting';
  const cats = S.set.categories.map(c => `<option value="${c.id}" ${E.category === c.id ? 'selected' : ''}>${esc(catName(c))}</option>`).join('');
  return new Promise(res => {
    let saved = false;
    const sh = openSheet(`
      <div class="sh-h"><b>${isNew ? (isMeet ? t('Новая встреча') : t('Новая задача')) : (isMeet ? t('Встреча') : t('Задача'))}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
      <div class="inp-mic"><input class="inp inp-big" id="e_title" placeholder="${esc(isMeet ? t('С кем и о чём встреча?') : t('Что нужно сделать?'))}" value="${esc(E.title)}"><button class="mic-sm" onclick="dictateInto('e_title',this)" aria-label="${esc(t('Надиктовать'))}">${ic('mic')}</button></div>
      <div class="g2"><div><label class="lbl">${t('Дата')}</label><input class="inp" type="date" id="e_date" value="${E.date || ''}"></div><div><label class="lbl">${t('Категория')}</label><select class="inp" id="e_cat">${cats}</select></div></div>
      <div class="g2"><div><label class="lbl">${t('Начало')}</label><input class="inp" type="time" id="e_start" value="${E.start || ''}"></div><div><label class="lbl">${t('Конец')}</label><input class="inp" type="time" id="e_end" value="${E.end || ''}"></div></div>
      <div class="chips wrapchips" style="margin-top:8px">${[15, 30, 60, 90, 120, 180].map(m => `<button class="chip" onclick="edDur(${m})">${durLabel(m)}</button>`).join('')}<button class="chip" onclick="edFindSlots()">${ic('clock', 14)} ${t('Свободное время')}</button></div>
      <div id="e_slots"></div>
      <label class="lbl">${t('Важность')}</label>
      <div class="seg" id="e_prio">${Object.keys(PRIO).map(k => `<button data-v="${k}" class="${E.priority === k ? 'on' : ''}">${t(PRIO[k].l)}</button>`).join('')}</div>
      <label class="lbl">${t('Напомнить')}</label>
      <div class="chips wrapchips" id="e_rem"></div>
      <div class="sw-row"><div><b>${t('Напоминать до отметки «Готово»')}</b><span>${t('Каждые {h} ч с {m} до {e}, затем каждое утро', { h: S.set.nagHours, m: S.set.morningTime, e: S.set.dayEnd })}</span></div><button class="sw ${E.nag ? 'on' : ''}" id="e_nag"></button></div>
      <label class="lbl">${t('Повтор')}</label>
      <select class="inp" id="e_rep">${Object.keys(REPEAT).map(k => `<option value="${k}" ${E.repeat && E.repeat.type === k ? 'selected' : ''}>${t(REPEAT[k])}</option>`).join('')}</select>
      <div id="e_repx"></div>
      <label class="lbl">${isMeet ? t('Участники') : t('Связанные люди и компании')}</label>
      <div id="e_people"></div>
      ${isMeet ? `<label class="lbl">${t('Место')}</label><input class="inp" id="e_place" value="${esc(E.place || '')}" placeholder="${esc(t('Офис, ресторан, адрес'))}">
      <div class="sw-row" style="margin-top:8px"><div><b>${t('Автозапись встречи')}</b><span>${t('Запись начнётся сама за {a} мин до начала и остановится через {b} мин после конца. Работает, если MARKUS-A открыт на экране; иначе придёт уведомление и сообщение в Telegram с кнопкой «Начать запись».', { a: S.set.recPre, b: S.set.recPost })}</span></div><button class="sw ${E.autoRecord ? 'on' : ''}" id="e_auto"></button></div>` : ''}
      <label class="lbl">${isMeet ? t('Локации и фото ориентиров') : t('Места')}</label>
      <div id="e_places"></div>
      <label class="lbl">${t('Описание')}</label>
      <textarea class="inp" id="e_desc" placeholder="${esc(t('Детали, адрес, ссылки'))}">${esc(E.desc || '')}</textarea>
      <label class="lbl">${t('Подзадачи')} <span class="muted">— ${t('у каждой может быть свой срок и зависимость')}</span></label>
      <div id="e_subs"></div>
      <div class="inp-mic" style="margin-top:6px"><input class="inp" id="e_subnew" placeholder="${esc(t('Добавить шаг и нажать +'))}" onkeydown="if(event.key==='Enter'){event.preventDefault();edAddSub()}"><button class="mic-sm" onclick="edAddSub()">${ic('plus')}</button></div>
      <label class="lbl">${isMeet ? t('Материалы к встрече') : t('Документы')} <span class="muted">— ${t('документы, фото, рисунки, аудио, видео')}</span></label>
      <div id="e_files"></div>
      <label class="att-add" style="margin-top:8px">${ic('clip', 16)} ${t('Прикрепить файлы')}<input type="file" multiple hidden onchange="edAddFiles(this)"></label>
      <label class="lbl">${t('Ссылки')}</label>
      <div id="e_links"></div>
      <div class="sh-foot">${isNew ? '' : `<button class="btn danger" onclick="edDelete()">${ic('trash', 18)}</button>`}<button class="btn pri" style="flex:1" id="e_save">${isNew ? t('Создать') : t('Сохранить')}</button></div>
    `, { cls: 'tall', onClose: () => { stopDictation(); if (!saved) res(null); } });
    const renderRem = () => {
      $('#e_rem', sh).innerHTML = REMIND_OPTS().map(([m, l]) => `<button class="chip ${E.reminders.includes(m) ? 'on' : ''}" data-m="${m}">${esc(l)}</button>`).join('');
      $$('#e_rem .chip', sh).forEach(b => b.onclick = () => { remTouched = true; const m = isNaN(+b.dataset.m) ? b.dataset.m : +b.dataset.m; const i = E.reminders.indexOf(m); if (i >= 0) E.reminders.splice(i, 1); else E.reminders.push(m); b.classList.toggle('on', i < 0); });
    };
    renderRem();
    $$('#e_prio button', sh).forEach(b => b.onclick = () => {
      E.priority = b.dataset.v; $$('#e_prio button', sh).forEach(x => x.classList.toggle('on', x === b));
      if (!remTouched) { E.reminders = defaultReminders(E.priority, !!$('#e_start', sh).value); E.nag = E.priority === 'critical'; $('#e_nag', sh).classList.toggle('on', E.nag); renderRem(); }
    });
    $('#e_nag', sh).onclick = () => { E.nag = !E.nag; $('#e_nag', sh).classList.toggle('on', E.nag); };
    if ($('#e_auto', sh)) $('#e_auto', sh).onclick = () => $('#e_auto', sh).classList.toggle('on');
    $('#e_rep', sh).onchange = edRepeatUI;
    edRepeatUI(); edRenderSubs(); edRenderFiles(); edRenderPeople(); edRenderPlaces(); edRenderLinks();
    if (isNew && !E.title) setTimeout(() => $('#e_title', sh) && $('#e_title', sh).focus(), 250);
    $('#e_save', sh).onclick = async () => {
      const r = await edCollect(); if (!r) return;
      const ok = await resolveConflicts(E); if (!ok) return;
      await saveItem(E);
      saved = true; closeSheet(); toast(isNew ? t('Создано ✓') : t('Сохранено ✓'));
      res(E);
    };
  });
}
function edDur(m) {
  let s = $('#e_start').value, d = $('#e_date').value;
  if (!d) { d = D.today(); $('#e_date').value = d; }
  if (!s) { const f = freeSlots(d, m, { exclude: E.id, limit: 1 })[0]; s = f ? f.start : S.set.workStart; $('#e_start').value = s; }
  $('#e_end').value = D.addMin(s, m);
}
function edFindSlots() {
  const d = $('#e_date').value || D.today(); $('#e_date').value = d;
  const s = $('#e_start').value, e = $('#e_end').value;
  const dur = s && e && D.toMin(e) > D.toMin(s) ? D.toMin(e) - D.toMin(s) : S.set.defaultDur;
  let slots = freeSlots(d, dur, { exclude: E.id, limit: 6 }), other = false;
  if (!slots.length) { slots = findAhead(dur, D.add(d, 1), D.add(d, 10), 6, E.id); other = true; }
  $('#e_slots').innerHTML = slots.length ? `<div class="hint">${t('Свободно ({d}):', { d: durLabel(dur) })}</div><div class="chips wrapchips">${slots.map(x => `<button class="chip" onclick="edPickSlot('${x.date}','${x.start}','${x.end}')">${slotLabel(x, other)}</button>`).join('')}</div>` : `<div class="hint">${t('Свободных окон не нашлось')}</div>`;
}
function edPickSlot(d, s, e) { $('#e_date').value = d; $('#e_start').value = s; $('#e_end').value = e; $('#e_slots').innerHTML = ''; }
function edRepeatUI() {
  const ty = $('#e_rep').value; const box = $('#e_repx');
  E.repeat = Object.assign({}, E.repeat || {}, { type: ty });
  if (ty === 'days') {
    const days = E.repeat.days || [];
    box.innerHTML = `<div class="chips wrapchips" style="margin-top:8px">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button class="chip ${days.includes(d) ? 'on' : ''}" onclick="edDay(${d},this)">${D.dow(d)}</button>`).join('')}</div>`;
  } else if (ty === 'interval') {
    if (!E.repeat.interval) E.repeat.interval = 2;
    box.innerHTML = `<div class="inp-mic" style="margin-top:8px;align-items:center"><span class="muted">${t('Каждые')}</span><input class="inp" type="number" min="1" max="365" style="width:90px;flex:0" value="${E.repeat.interval}" onchange="E.repeat.interval=+this.value"><span class="muted">${t('дн.')}</span></div>`;
  } else box.innerHTML = '';
}
function edDay(d, el) { E.repeat.days = E.repeat.days || []; const i = E.repeat.days.indexOf(d); if (i >= 0) E.repeat.days.splice(i, 1); else E.repeat.days.push(d); el.classList.toggle('on', i < 0); }
function subMeta(it, s) {
  if (s.done) return `<span class="ok">✓ ${s.doneAt ? esc(D.human(s.doneAt.slice(0, 10))) : ''}</span>`;
  const parts = [];
  const dep = s.after && subById(it, s.after);
  if (dep && !dep.done) parts.push(`${ic('lock', 12)} ${t('после «{x}»', { x: esc(dep.text.slice(0, 40)) })}${s.afterDays != null ? ' +' + s.afterDays + ' ' + t('дн.') : ''}`);
  const pl = subPlanned(it, s);
  if (pl) { const od = !isBlocked(it, s) && s.due && subDueAt(s) < Date.now(); parts.push(`<span class="${od ? 'warn2' : ''}">${ic('calendar', 12)} ${isBlocked(it, s) ? '≈ ' : ''}${esc(D.human(pl))}${s.time ? ' ' + s.time : ''}</span>`); }
  else if (!dep) parts.push(`<span class="muted">${t('без срока')}</span>`);
  return parts.join(' · ');
}
function edRenderSubs() {
  $('#e_subs').innerHTML = (E.subtasks || []).map((s, i) => `<div class="sub ${s.done ? 'done' : ''}"><button class="chk sq ${s.done ? 'on' : ''}" onclick="E.subtasks[${i}].done=!E.subtasks[${i}].done;E.subtasks[${i}].doneAt=E.subtasks[${i}].done?new Date().toISOString():null;edRenderSubs()">${s.done ? ic('checkmark', 12) : ''}</button>
    <span class="sub-b" onclick="edEditSub('${s.id}')"><span class="sub-t">${esc(s.text)}</span><span class="sub-m">${subMeta(E, s)}</span></span>
    <button class="xbtn" style="width:30px;height:30px" onclick="edEditSub('${s.id}')">${ic('edit', 14)}</button>
    <button class="xbtn" style="width:30px;height:30px" onclick="edDelSub('${s.id}')">${ic('x', 14)}</button></div>`).join('');
}
function edAddSub() { const inp = $('#e_subnew'); const v = inp.value.trim(); if (!v) return; E.subtasks.push({ id: uid(), text: v, done: false, due: null, time: null, after: null, afterDays: null }); inp.value = ''; edRenderSubs(); inp.focus(); }
function edDelSub(id) { E.subtasks = E.subtasks.filter(s => s.id !== id); E.subtasks.forEach(s => { if (s.after === id) s.after = null; }); edRenderSubs(); }
async function edEditSub(id) { E.date = $('#e_date').value || E.date; const ok = await openSubEditor(E, id); if (ok) edRenderSubs(); }
/* edit one subtask: text, deadline, "do after …" dependency */
function openSubEditor(it, subId) {
  const isNew = !subId;
  const s = isNew ? { id: uid(), text: '', done: false, due: null, time: null, after: null, afterDays: null } : clone(subById(it, subId));
  const others = (it.subtasks || []).filter(x => x.id !== s.id);
  return new Promise(res => {
    let done = false;
    const sh = openSheet(`
      <div class="sh-h"><b>${isNew ? t('Новая подзадача') : t('Подзадача')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
      <textarea class="inp" id="s_text" style="min-height:64px" placeholder="${esc(t('Что нужно сделать?'))}">${esc(s.text)}</textarea>
      <div class="g2"><div><label class="lbl">${t('Срок')}</label><input class="inp" type="date" id="s_due" value="${s.due || ''}"></div><div><label class="lbl">${t('Время (необязательно)')}</label><input class="inp" type="time" id="s_time" value="${s.time || ''}"></div></div>
      <label class="lbl">${t('Выполнять после')}</label>
      <select class="inp" id="s_after"><option value="">${t('— не зависит от других —')}</option>${others.map(o => `<option value="${o.id}" ${s.after === o.id ? 'selected' : ''}>${esc(o.text.slice(0, 70))}</option>`).join('')}</select>
      <div id="s_afterx" ${s.after ? '' : 'hidden'}><label class="lbl">${t('Срок — через сколько дней после её выполнения')}</label>
        <div class="inp-mic" style="align-items:center"><input class="inp" type="number" min="0" max="365" id="s_days" value="${s.afterDays != null ? s.afterDays : ''}" placeholder="—" style="width:110px;flex:0"><span class="muted">${t('дн. (пусто — срок как указан выше)')}</span></div>
        <div class="hint">${t('Пока предыдущая подзадача не выполнена, эта «ждёт» и не считается просроченной. Когда отметите предыдущую — срок этой встанет автоматически.')}</div></div>
      <div class="sh-foot">${isNew ? '' : `<button class="btn danger" id="s_del">${ic('trash', 18)}</button>`}<button class="btn pri" style="flex:1" id="s_save">${t('Сохранить')}</button></div>`, { cls: 'tall', onClose: () => { if (!done) res(false); } });
    $('#s_after', sh).onchange = () => { $('#s_afterx', sh).hidden = !$('#s_after', sh).value; };
    if ($('#s_del', sh)) $('#s_del', sh).onclick = () => { it.subtasks = it.subtasks.filter(x => x.id !== s.id); it.subtasks.forEach(x => { if (x.after === s.id) x.after = null; }); done = true; closeSheet(); res(true); };
    $('#s_save', sh).onclick = () => {
      s.text = $('#s_text', sh).value.trim(); if (!s.text) return toast(t('Введите текст подзадачи'));
      s.due = $('#s_due', sh).value || null; s.time = $('#s_time', sh).value || null;
      s.after = $('#s_after', sh).value || null;
      const dv = $('#s_days', sh).value; s.afterDays = s.after && dv !== '' ? Math.max(0, +dv) : null;
      if (isNew) it.subtasks.push(s); else { const i = it.subtasks.findIndex(x => x.id === s.id); it.subtasks[i] = s; }
      const msgs = validateSub(it, s);
      if (msgs.length) toast(msgs.join(' · '), 5000);
      done = true; closeSheet(); res(true);
    };
    if (isNew) setTimeout(() => $('#s_text', sh).focus(), 250);
  });
}
function edRenderFiles() { $('#e_files').innerHTML = (E.files || []).length ? attList(E.files, E.id, true) : ''; }
async function edAddFiles(inp) {
  for (const f of inp.files) {
    if (f.size > 45 * 1048576) toast(t('«{x}» больше 45 МБ — в облако бесплатно не поместится, останется только на этом телефоне. Для больших видео лучше добавить ссылку.', { x: f.name }), 6000);
    E.files.push(await storeFile(/^image\//.test(f.type) ? await shrinkImage(f, 2200) : f, f.name));
  }
  inp.value = ''; edRenderFiles();
}
function edRemoveFile(fid) { E.files = E.files.filter(f => f.id !== fid); edRenderFiles(); }
function edRenderPeople() {
  const box = $('#e_people'); if (!box) return;
  const cs = (E.contactIds || []).map(getItem).filter(c => c && !c.deleted);
  const names = (E.participants || []).filter(n => !cs.some(c => c.title === n));
  box.innerHTML = `<div class="chips wrapchips">${cs.map(c => `<span class="chip on" onclick="edRemovePerson('${c.id}')">${ic('user', 13)} ${esc(c.title)} ✕</span>`).join('')}${names.map(n => `<span class="chip" onclick="edRemoveName('${esc(n).replace(/'/g, '&#39;')}')">${esc(n)} ✕</span>`).join('')}<button class="chip" onclick="edAddPerson()">${ic('plus', 13)} ${t('Добавить')}</button></div>`;
}
async function edAddPerson() { const id = await pickContact(E.contactIds || []); if (!id) return; E.contactIds = Array.from(new Set((E.contactIds || []).concat(id))); edRenderPeople(); }
function edRemovePerson(id) { E.contactIds = (E.contactIds || []).filter(x => x !== id); edRenderPeople(); }
function edRemoveName(n) { E.participants = (E.participants || []).filter(x => x !== n); edRenderPeople(); }
async function edPasteLoc() { try { const x = await navigator.clipboard.readText(); if (x) $('#e_loc').value = x.trim(); else toast(t('Буфер обмена пуст')); } catch (e) { toast(t('Вставьте ссылку вручную (долгое нажатие → Вставить)')); } }
function edMyLoc() {
  if (!navigator.geolocation) return toast(t('Геопозиция недоступна'));
  toast(t('Определяю местоположение…'));
  navigator.geolocation.getCurrentPosition(p => { $('#e_loc').value = `https://maps.google.com/?q=${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}`; toast(t('Локация добавлена ✓')); }, () => toast(t('Нет доступа к геопозиции')), { enableHighAccuracy: true, timeout: 15000 });
}
async function edCollect() {
  const title = $('#e_title').value.trim();
  if (!title) { toast(t('Введите название')); $('#e_title').focus(); return false; }
  E.title = title;
  E.date = $('#e_date').value || null;
  E.start = $('#e_start').value || null;
  E.end = $('#e_end').value || null;
  if (!E.date) { E.start = null; E.end = null; }
  if (E.start && !E.end) E.end = D.addMin(E.start, S.set.defaultDur);
  if (!E.start) E.end = null;
  if (E.start && E.end && D.toMin(E.end) <= D.toMin(E.start)) { toast(t('Конец должен быть позже начала')); return false; }
  E.category = $('#e_cat').value;
  const cs = (E.contactIds || []).map(getItem).filter(Boolean);
  E.participants = Array.from(new Set(cs.map(c => c.title).concat(E.participants || [])));
  E.desc = $('#e_desc').value.trim();
  if (E.kind === 'meeting') { E.place = $('#e_place').value.trim(); E.autoRecord = $('#e_auto').classList.contains('on'); }
  if (E.start) E.needsTime = false;
  const pending = $('#e_subnew').value.trim(); if (pending) E.subtasks.push({ id: uid(), text: pending, done: false, due: null, time: null, after: null, afterDays: null });
  if (E.repeat.type === 'days' && !(E.repeat.days || []).length && E.date) E.repeat.days = [D.parse(E.date).getDay()];
  const msgs = []; (E.subtasks || []).forEach(s => msgs.push(...validateSub(E, s)));
  if (msgs.length) toast(msgs.join(' · '), 5000);
  return true;
}
async function edDelete() {
  if (!(await confirmDel(t('Удалить «{x}»?', { x: E.title })))) return;
  const it = getItem(E.id); if (it) await deleteItem(it);
  closeAllSheets(); toast(t('Удалено')); if (S.route === 'meeting') goBack();
}

/* ================= task detail ================= */
function openTaskDetail(it) {
  S.subFilter = 'all';
  const sh = openSheet('<div id="td"></div>', { cls: 'tall' });
  renderTaskDetail(it.id, sh);
}
function renderTaskDetail(id, sh) {
  const it = getItem(id); const box = $('#td', sh); if (!it || !box) return;
  const c = catOf(it), od = isOverdue(it), p = progress(it), subs = it.subtasks || [];
  const cnt = { all: subs.length, open: subs.filter(s => !s.done && !isBlocked(it, s)).length, done: subs.filter(s => s.done).length, wait: subs.filter(s => !s.done && isBlocked(it, s)).length };
  const f = S.subFilter;
  const shown = subs.filter(s => f === 'all' || (f === 'done' && s.done) || (f === 'open' && !s.done && !isBlocked(it, s)) || (f === 'wait' && !s.done && isBlocked(it, s)));
  const se = spanEnd(it);
  box.innerHTML = `
    <div class="sh-h"><span class="cat" style="--t:${c.color}">${esc(catName(c))}</span><span style="flex:1"></span>
      <button class="xbtn" onclick="favToggle('${id}')">${ic(it.fav ? 'starf' : 'star', 18)}</button>
      <button class="xbtn" onclick="closeSheet()" aria-label="${esc(t('Закрыть'))}">${ic('x', 18)}</button></div>
    <div style="font-size:21px;font-weight:800;line-height:1.25;margin-bottom:8px">${esc(it.title)}</div>
    <div class="pills">
      <span class="pill">${ic('calendar', 14)}${esc(whenLabel(it))}${se && se !== it.date ? ' → ' + esc(D.short(se)) : ''}</span>
      ${it.priority !== 'normal' ? `<span class="pill" style="color:${PRIO[it.priority].c}">${ic('flag', 14)}${t(PRIO[it.priority].l)}</span>` : ''}
      ${it.repeat && it.repeat.type !== 'none' ? `<span class="pill">${ic('repeat', 14)}${t(REPEAT[it.repeat.type])}</span>` : ''}
      ${(it.reminders || []).length || it.nag ? `<span class="pill">${ic('bell', 14)}${(it.reminders || []).map(m => ((REMIND_OPTS().find(o => o[0] === m) || [0, m + ' ' + t('мин')])[1])).join(', ')}${it.nag ? ' · ' + t('до «Готово»') : ''}</span>` : ''}
    </div>
    ${p != null ? `<div class="big-pb"><div class="pb big ${it.status === 'cancelled' ? 'cx' : ''}"><i style="width:${p}%"></i></div><b>${p}%</b></div>` : ''}
    ${it.status === 'cancelled' ? `<div class="banner" style="color:var(--txt2)" onclick="tdStatus('${id}','progress')">${ic('x')}<div><b>${t('Задача отменена')} ${it.cancelledAt ? esc(D.human(it.cancelledAt.slice(0, 10))) : ''} · ${t('выполнено {p}%', { p: it.cancelPct || 0 })}</b><span>${it.cancelReason ? t('Причина') + ': ' + esc(it.cancelReason) : t('Причина не указана')} · ${t('нажмите, чтобы вернуть в работу')}</span></div></div>` : ''}
    ${it.status === 'done' ? `<div class="banner" style="color:var(--grn)">${ic('checkmark')}<div><b>${t('Задача выполнена')} ${it.doneAt ? esc(D.human(it.doneAt.slice(0, 10))) : ''}</b><span>${t('Найти её можно в «Задачи → Выполнено»')}</span></div></div>` : ''}
    ${od ? `<div class="banner" style="color:var(--red)" onclick="smartReschedule('${id}')">${ic('clock')}<div><b>${overdueSubs(it).length ? t('Просрочены подзадачи: {n}', { n: overdueSubs(it).length }) : t('Задача просрочена')}</b><span>${t('Нажмите — помогу перенести')}</span></div>${ic('right')}</div>` : ''}
    <div class="h4">${t('Статус задачи')}</div>
    <div class="stbtns">${Object.keys(STATUS).map(k => `<button class="stb st-${k} ${it.status === k ? 'on' : ''}" onclick="tdStatus('${id}','${k}')">${it.status === k ? ic('checkmark', 14) + ' ' : ''}${t(STATUS[k])}</button>`).join('')}</div>
    <div class="h4" style="display:flex;align-items:center">${t('Подзадачи')} · ${cnt.done}/${cnt.all}<span style="flex:1"></span><button class="link" onclick="tdAddSub('${id}')">+ ${t('Добавить')}</button></div>
    ${subs.length ? `<div class="chips">${[['all', 'Все'], ['open', 'Осталось'], ['wait', 'Ждут'], ['done', 'Выполнено']].filter(([k]) => k === 'all' || cnt[k]).map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" onclick="S.subFilter='${k}';refreshDetail('${id}')">${t(l)} <small>${cnt[k]}</small></button>`).join('')}</div>` : `<div class="hint">${t('Разбейте задачу на шаги — у каждого может быть свой срок, а часть шагов может ждать выполнения других.')}</div>`}
    ${shown.map(s => { const bl = isBlocked(it, s); return `<div class="sub ${s.done ? 'done' : ''} ${bl ? 'sub-wait' : ''}"><button class="chk sq ${s.done ? 'on' : ''}" style="--c:${c.color}" onclick="subToggle('${id}','${s.id}')">${s.done ? ic('checkmark', 12) : bl ? ic('lock', 11) : ''}</button><span class="sub-b" onclick="tdEditSub('${id}','${s.id}')"><span class="sub-t">${esc(s.text)}</span><span class="sub-m">${subMeta(it, s)}</span></span><button class="xbtn" style="width:30px;height:30px" onclick="tdEditSub('${id}','${s.id}')">${ic('edit', 14)}</button></div>`; }).join('')}
    ${it.desc ? `<div class="h4">${t('Описание')}</div><div class="pre">${linkify(it.desc)}</div>` : ''}
    ${(it.participants || []).length ? `<div class="h4">${t('Люди и компании')}</div><div class="pills">${peoplePills(it)}</div>` : ''}
    ${(it.locations || []).length ? `<div class="h4">${t('Места')}</div>${placesBlock(it)}` : ''}
    ${(it.files || []).length ? `<div class="h4">${t('Документы')}</div>${attList(it.files, id, false)}` : ''}
    ${(it.links || []).length ? `<div class="h4">${t('Ссылки')}</div>${linksBlock(it)}` : ''}
    ${resultBlock(it)}
    <div class="sh-foot"><button class="btn ghost" onclick="openShare('${id}')" aria-label="${esc(t('Поделиться'))}">${ic('share', 18)}</button><button class="btn ghost" style="flex:1" onclick="closeSheet();openEditor('${it.kind}',{id:'${id}'})">${ic('edit', 18)} ${t('Изменить')}</button><button class="btn danger" onclick="tdDelete('${id}')">${ic('trash', 18)}</button></div>`;
  loadThumbs(box);
}
function linkify(s) { return esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }
function peoplePills(it) {
  const cs = (it.contactIds || []).map(getItem).filter(c => c && !c.deleted);
  const names = (it.participants || []).filter(n => !cs.some(c => c.title === n));
  return cs.map(c => `<span class="pill" style="cursor:pointer" onclick="openContact('${c.id}')">${ic('user', 14)}${esc(c.title)}</span>`).join('') + names.map(n => `<span class="pill">${ic('users', 14)}${esc(n)}</span>`).join('');
}
function refreshDetail(id) { const s = topSheet(); if (s && $('#td', s.w)) renderTaskDetail(id, s.w); else if (S.route === 'meeting') render(); }
async function tdStatus(id, st) {
  const it = getItem(id);
  if (st === it.status && st !== 'progress') return;
  if (st === 'done') {
    await toggleDone(id);
    if (it.kind === 'task' && getItem(id).status === 'done' && !(it.result && (it.result.note || (it.result.files || []).length))) {
      const v = await dialog({ title: t('Задача выполнена ✓'), text: t('Прикрепить итоговый документ или скриншот, что работу приняли?'), buttons: [{ l: t('Прикрепить результат'), v: 1, p: 1 }, { l: t('Не сейчас'), v: 0 }] });
      if (v) await openResultEditor(id);
    }
  }
  else if (st === 'cancelled') await askCancelReason(it);
  else { await setStatus(it, st); toast(t('Статус: {s}', { s: t(STATUS[st]) })); }
  refreshDetail(id);
}
async function tdAddSub(id) { const it = getItem(id); if (await openSubEditor(it, null)) { await saveItem(it); refreshDetail(id); } }
async function tdEditSub(id, sid) { const it = getItem(id); if (await openSubEditor(it, sid)) { await saveItem(it); refreshDetail(id); } }
async function tdDelete(id) { const it = getItem(id); if (!(await confirmDel(t('Удалить «{x}»?', { x: it.title })))) return; await deleteItem(it); closeAllSheets(); toast(t('Удалено')); }
async function favToggle(id) { const it = getItem(id); it.fav = !it.fav; await saveItem(it); refreshDetail(id); toast(it.fav ? t('В избранном ★') : t('Убрано из избранного')); }

/* ================= note editor ================= */
function openNoteEditor(note, preset) {
  const existing = note && note.id ? getItem(note.id) : null;
  const N = clone(existing || Object.assign(newItem('note'), preset || {}));
  const isNew = !existing;
  E = N;
  let removed = false;
  const sh = openSheet(`
    <div class="sh-h"><b>${isNew ? t('Новая заметка') : t('Заметка')}</b>
      <button class="xbtn" id="n_fav">${ic(N.fav ? 'starf' : 'star', 18)}</button>
      ${isNew ? '' : `<button class="xbtn" onclick="openShare('${N.id}')">${ic('share', 18)}</button>`}
      <button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <input class="inp inp-big" id="n_title" placeholder="${esc(t('Заголовок'))}" value="${esc(N.title)}">
    <div class="chips wrapchips" style="margin-top:10px" id="n_cats">${S.set.noteCats.map(c => `<button class="chip ${N.noteCat === c ? 'on' : ''}" data-c="${esc(c)}">${esc(noteCatName(c))}</button>`).join('')}</div>
    <div style="position:relative;margin-top:4px"><textarea class="inp" id="n_text" style="min-height:220px;padding-right:56px" placeholder="${esc(t('Текст заметки. Нажмите микрофон, чтобы надиктовать.'))}">${esc(N.desc || '')}</textarea>
      <button class="mic-sm" style="position:absolute;right:6px;top:6px" onclick="dictateInto('n_text',this,true)" aria-label="${esc(t('Надиктовать'))}">${ic('mic')}</button></div>
    <div class="btns" style="margin-top:10px"><button class="btn ghost" id="n_fix">${ic('ai', 16)} ${t('Улучшить текст')}</button><button class="btn ghost" id="n_task">${ic('check', 16)} ${t('Сделать задачей')}</button></div>
    <label class="lbl">${t('Файлы')}</label><div id="e_files"></div>
    <label class="att-add" style="margin-top:8px">${ic('clip', 16)} ${t('Прикрепить файл или фото')}<input type="file" multiple hidden onchange="edAddFiles(this)"></label>
    <div class="hint">${t('Заметка сохраняется автоматически при закрытии.')}</div>
    <div class="sh-foot">${isNew ? '' : `<button class="btn danger" id="n_del">${ic('trash', 18)}</button>`}<button class="btn pri" style="flex:1" onclick="closeSheet()">${t('Готово')}</button></div>
  `, { cls: 'tall', onClose: async () => {
    stopDictation();
    if (removed) return;
    N.title = $('#n_title', sh).value.trim(); N.desc = $('#n_text', sh).value.trim();
    if (!N.title && !N.desc && !N.files.length) return;
    if (!N.title) N.title = N.desc.split('\n')[0].slice(0, 60) || t('Заметка');
    const changed = !existing || JSON.stringify(existing) !== JSON.stringify(Object.assign({}, existing, { title: N.title, desc: N.desc, noteCat: N.noteCat, fav: N.fav, files: N.files }));
    if (changed) { await saveItem(N); toast(t('Заметка сохранена')); }
  } });
  edRenderFiles();
  $$('#n_cats .chip', sh).forEach(b => b.onclick = () => { N.noteCat = b.dataset.c; $$('#n_cats .chip', sh).forEach(x => x.classList.toggle('on', x === b)); });
  $('#n_fav', sh).onclick = () => { N.fav = !N.fav; $('#n_fav', sh).innerHTML = ic(N.fav ? 'starf' : 'star', 18); };
  $('#n_fix', sh).onclick = async () => {
    const ta = $('#n_text', sh); if (!ta.value.trim()) return toast(t('Сначала напишите или надиктуйте текст'));
    try { toast(t('AI улучшает текст…'), 8000); ta.value = await AI.improveText(ta.value); toast(t('Готово ✓')); } catch (e) { toast(e.message, 4000); }
  };
  $('#n_task', sh).onclick = async () => {
    const x = ($('#n_title', sh).value + '. ' + $('#n_text', sh).value).trim();
    if (x.length < 3) return toast(t('Заметка пустая'));
    closeSheet();
    await handleCommand(x, { forceCreate: true });
  };
  if ($('#n_del', sh)) $('#n_del', sh).onclick = async () => { if (!(await confirmDel(t('Удалить заметку?')))) return; removed = true; const it = getItem(N.id); if (it) await deleteItem(it); closeSheet(); toast(t('Удалено')); };
  if (isNew && !N.desc) setTimeout(() => $('#n_text', sh) && $('#n_text', sh).focus(), 250);
}

/* ================= files ================= */
function recExt(mime) { mime = mime || ''; return mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'weba'; }
function findFile(holderId, fileId) {
  const it = getItem(holderId) || (E && E.id === holderId ? E : null);
  if (!it) return {};
  if (fileId === 'rec' && it.recording) return { it, f: { id: it.recording.fileId, name: t('Запись') + ' — ' + it.title + ' ' + (it.date || '') + '.' + recExt(it.recording.mime), type: (it.recording.mime || 'audio/webm').split(';')[0], size: it.recording.size, cloud: it.recording.cloud, fav: it.recording.fav, isRec: true } };
  return { it, f: allFileMetas(it).find(x => x.id === fileId) };
}
async function openFile(holderId, fileId) {
  const { it, f } = findFile(holderId, fileId); if (!f) return;
  const kind = fileKind(f)[2];
  const sh = openSheet(`
    <div class="sh-h">${ficon(f)}<b style="font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="hint">${mb(f.size)} · ${esc(it.title)}</div>
    <div id="fv"></div>
    <div class="btns" style="margin-top:12px"><button class="btn pri" id="f_open">${t('Открыть')}</button><button class="btn ghost" id="f_share">${ic('share', 18)} ${t('Поделиться')}</button></div>
    <div class="btns" style="margin-top:8px"><button class="btn ghost" id="f_dl">${ic('download', 18)} ${t('Сохранить в телефон')}</button>${f.isRec ? '' : `<button class="btn ghost" id="f_fav">${ic(f.fav ? 'starf' : 'star', 18)}</button>`}</div>
    <div class="btns" style="margin-top:8px"><button class="btn ghost" id="f_sum">${ic('ai', 16)} ${t('Кратко (AI)')}</button><button class="btn ghost" id="f_ask">${ic('ai', 16)} ${t('Спросить')}</button></div>
    <div id="f_ai"></div>
    ${it.kind !== 'note' || it.noteCat !== 'Документы' ? `<button class="btn ghost full" style="margin-top:8px" onclick="closeAllSheets();openItem('${it.id}')">${t('Перейти')}: ${esc(it.title.slice(0, 40))}</button>` : ''}
  `);
  const blob = await getFileBlob(f);
  if (!blob) { $('#fv', sh).innerHTML = `<div class="hint warn">${t('Файл есть только на другом устройстве. Войдите в облако и синхронизируйте.')}</div>`; }
  else if (kind === 'img') { $('#fv', sh).innerHTML = `<img src="${URL.createObjectURL(blob)}" style="width:100%;border-radius:12px;max-height:50vh;object-fit:contain;background:var(--card2)">`; }
  else if (kind === 'audio') { $('#fv', sh).innerHTML = `<audio controls style="width:100%" src="${URL.createObjectURL(blob)}"></audio>`; }
  const typed = () => blob.type ? blob : new Blob([blob], { type: f.type });
  $('#f_open', sh).onclick = () => { if (!blob) return; window.open(URL.createObjectURL(typed()), '_blank'); };
  $('#f_dl', sh).onclick = () => blob && downloadBlob(blob, f.name);
  $('#f_share', sh).onclick = () => blob && shareFile(typed(), f.name, it.title);
  if ($('#f_fav', sh)) $('#f_fav', sh).onclick = async () => { f.fav = !f.fav; await saveItem(it); $('#f_fav', sh).innerHTML = ic(f.fav ? 'starf' : 'star', 18); toast(f.fav ? t('В избранном ★') : t('Убрано из избранного')); };
  const out = $('#f_ai', sh);
  $('#f_sum', sh).onclick = async () => {
    out.innerHTML = `<div class="ai-box">${t('AI читает документ…')}</div>`;
    try { const x = f.summaryText || await AI.docSummary(f); if (!f.isRec) { f.summaryText = x; saveItem(it, { render: false }); } out.innerHTML = `<div class="ai-box">${esc(x)}</div>`; }
    catch (e) { out.innerHTML = `<div class="ai-box">${esc(e.message)}</div>`; }
  };
  $('#f_ask', sh).onclick = async () => {
    const q = await askChoice(t('Вопрос по документу'), t('Например: «Какие обязательства сторон?»'), [], { type: 'text', label: t('Спросить') });
    if (!q) return;
    out.innerHTML = `<div class="ai-box">${t('AI ищет ответ…')}</div>`;
    try { out.innerHTML = `<div class="ai-box"><b>${esc(q)}</b>\n\n${esc(await AI.docAsk(f, q))}</div>`; } catch (e) { out.innerHTML = `<div class="ai-box">${esc(e.message)}</div>`; }
  };
}
async function uploadDocs(inp) {
  for (const file of inp.files) {
    const f = await storeFile(file);
    await saveItem(newItem('note', { title: file.name, noteCat: 'Документы', files: [f], desc: '' }));
  }
  inp.value = ''; toast(t('Документ добавлен'));
}

/* ================= sharing links ================= */
async function openShare(id) {
  const it = getItem(id); if (!it) return;
  if (!Cloud.user) {
    const v = await dialog({ title: t('Поделиться'), text: t('Ссылки работают через облако. Войдите в аккаунт: Настройки → Облако.'), buttons: [{ l: t('Открыть настройки'), v: 1, p: 1 }, { l: t('Закрыть'), v: 0 }] });
    if (v) { closeAllSheets(); go('settings'); }
    return;
  }
  let perm = 'view', days = 7;
  const sh = openSheet(`
    <div class="sh-h"><b>${t('Поделиться')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="hint">${t('Получатель увидит название, дату, время, место, описание и документы «{x}».', { x: esc(it.title) })}</div>
    <label class="lbl">${t('Доступ')}</label><div class="seg" id="sh_p"><button data-v="view" class="on">${t('Только просмотр')}</button><button data-v="comment">${t('Комментирование')}</button></div>
    <label class="lbl">${t('Срок действия ссылки')}</label><div class="seg" id="sh_d"><button data-v="1">${t('1 день')}</button><button data-v="7" class="on">${t('7 дней')}</button><button data-v="30">${t('30 дней')}</button><button data-v="0">${t('Без срока')}</button></div>
    <label class="lbl">${t('Код доступа')} <span class="muted">(${t('необязательно')})</span></label><input class="inp" id="sh_c" placeholder="4821" maxlength="20">
    <button class="btn pri full" style="margin-top:14px" id="sh_go">${ic('link', 18)} ${t('Создать ссылку')}</button>
    <div id="sh_res"></div>
    <div class="h4">${t('Выданные ссылки')}</div><div id="sh_list"><div class="hint">${t('Загрузка…')}</div></div>`, { cls: 'tall' });
  const segs = (sel, cb) => $$(sel + ' button', sh).forEach(b => b.onclick = () => { $$(sel + ' button', sh).forEach(x => x.classList.toggle('on', x === b)); cb(b.dataset.v); });
  segs('#sh_p', v => perm = v); segs('#sh_d', v => days = +v);
  const loadList = async () => {
    const list = await Cloud.listShares(id);
    $('#sh_list', sh).innerHTML = list.length ? list.map(s => {
      const exp = s.expires_at && new Date(s.expires_at) < new Date();
      const st = s.revoked ? `<span class="tag red">${t('отозвана')}</span>` : exp ? `<span class="tag red">${t('истекла')}</span>` : `<span class="tag grn">${t('активна')}</span>`;
      const cm = (s.share_comments || []);
      return `<div class="card" style="padding:10px 12px"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${st}<span class="tag">${s.permission === 'comment' ? t('комментарии') : t('просмотр')}</span>${s.code ? `<span class="tag">${t('с кодом')}</span>` : ''}<span class="mini">${s.expires_at ? t('до') + ' ' + D.num(new Date(s.expires_at)) : t('без срока')}</span><span style="flex:1"></span>${!s.revoked && !exp ? `<button class="link" data-rev="${s.token}">${t('Отозвать')}</button>` : ''}</div>
        ${cm.map(c => `<div style="margin-top:8px;font-size:13px"><b>${esc(c.author || t('Гость'))}:</b> ${esc(c.body)}</div>`).join('')}</div>`;
    }).join('') : `<div class="hint">${t('Пока нет')}</div>`;
    $$('[data-rev]', sh).forEach(b => b.onclick = async () => { await Cloud.revokeShare(b.dataset.rev); toast(t('Доступ отозван')); loadList(); });
  };
  loadList();
  $('#sh_go', sh).onclick = async () => {
    $('#sh_go', sh).disabled = true;
    try {
      const url = await Cloud.createShare(it, { permission: perm, days, code: $('#sh_c', sh).value.trim() });
      $('#sh_res', sh).innerHTML = `<div class="ai-box" style="word-break:break-all">${esc(url)}</div><div class="btns" style="margin-top:8px"><button class="btn ghost" id="sh_copy">${t('Копировать')}</button><button class="btn ghost" id="sh_send">${t('Отправить…')}</button></div>`;
      $('#sh_copy', sh).onclick = () => { navigator.clipboard.writeText(url).then(() => toast(t('Ссылка скопирована'))); };
      $('#sh_send', sh).onclick = () => shareText(it.title + ' — ' + whenLabel(it), url);
      loadList();
    } catch (e) { toast(e.message, 4000); }
    $('#sh_go', sh).disabled = false;
  };
}

/* ================= free slot finder ================= */
function openSlotFinder() {
  const sh = openSheet(`
    <div class="sh-h"><b>${t('Найти свободное окно')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="g2"><div><label class="lbl">${t('Длительность')}</label><select class="inp" id="sf_d">${[30, 60, 90, 120, 180, 240].map(m => `<option value="${m}" ${m === 60 ? 'selected' : ''}>${durLabel(m)}</option>`).join('')}</select></div>
    <div><label class="lbl">${t('До даты')}</label><input class="inp" type="date" id="sf_u" value="${D.add(D.today(), 7)}"></div></div>
    <button class="btn pri full" style="margin-top:14px" id="sf_go">${ic('search', 18)} ${t('Найти')}</button>
    <div id="sf_r" style="margin-top:12px"></div>
    <div class="hint">${t('Рабочие часы: {a}–{b} (меняются в настройках).', { a: S.set.workStart, b: S.set.workEnd })}</div>`);
  const run = () => {
    const dur = +$('#sf_d', sh).value, until = $('#sf_u', sh).value || D.add(D.today(), 7);
    const slots = findAhead(dur, D.today(), until, 10);
    $('#sf_r', sh).innerHTML = slots.length ? `<div class="chips wrapchips">${slots.map(s => `<button class="chip" data-s='${JSON.stringify(s)}'>${slotLabel(s, true)}</button>`).join('')}</div><div class="hint">${t('Нажмите на окно — создам задачу на это время.')}</div>` : `<div class="hint">${t('До этой даты свободных окон нет.')}</div>`;
    $$('#sf_r [data-s]', sh).forEach(b => b.onclick = () => { const s = JSON.parse(b.dataset.s); closeSheet(); openEditor('task', { date: s.date, start: s.start, end: s.end }); });
  };
  $('#sf_go', sh).onclick = run; run();
}
async function askNotif() {
  if (!('Notification' in window)) return toast(t('Браузер не поддерживает уведомления'));
  const p = await Notification.requestPermission();
  toast(p === 'granted' ? t('Уведомления включены ✓') : t('Уведомления запрещены в браузере'));
  render();
}
