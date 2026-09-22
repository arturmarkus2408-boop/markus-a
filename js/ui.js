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
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  starf: '<path fill="currentColor" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13"/>',
  edit: '<path d="M4 20h4L19.5 8.5a2.8 2.8 0 0 0-4-4L4 16z"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  clip: '<path d="m20 11.5-8.4 8.4a5 5 0 0 1-7.1-7.1L13 4.3a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
  left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
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
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  file: '<path d="M14 3H6.5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V9z"/><path d="M14 3v6h6"/>'
};
function ic(n, s = 20) { return `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`; }
function logo(s = 28) { return `<img src="icons/icon-192.png" width="${s}" height="${s}" alt="" style="border-radius:${Math.round(s * .26)}px">`; }

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
  return w.querySelector('.sheet');
}
function closeSheet() {
  const s = Sheets.pop(); if (!s) return;
  s.w.classList.remove('open'); setTimeout(() => s.w.remove(), 220);
  if (s.onClose) s.onClose();
}
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
    html = `<div class="inp-mic" style="margin-bottom:4px"><input class="inp" id="dlg_custom" type="${custom.type}" ${custom.value ? `value="${esc(custom.value)}"` : ''}></div>`;
    btns.push({ l: custom.label || 'Выбрать', v: sh => { const x = $('#dlg_custom', sh).value; if (!x) { toast('Укажите значение'); return false; } return x; } });
  }
  btns.push({ l: 'Отмена', v: null });
  return dialog({ title, text, html, buttons: btns });
}
async function askDateTime(d, dur) {
  dur = dur || S.set.defaultDur;
  return dialog({
    title: 'Выберите время',
    html: `<div class="g2"><div><label class="lbl">Дата</label><input class="inp" type="date" id="dt_d" value="${d.date || D.today()}"></div><div><label class="lbl">Начало</label><input class="inp" type="time" id="dt_s" value="${d.start || ''}"></div></div>
      <label class="lbl">Длительность</label><select class="inp" id="dt_u">${[15, 30, 45, 60, 90, 120, 180, 240].map(m => `<option value="${m}" ${m === dur ? 'selected' : ''}>${durLabel(m)}</option>`).join('')}</select>`,
    buttons: [{ l: 'Готово', p: 1, v: sh => { const date = $('#dt_d', sh).value, start = $('#dt_s', sh).value; if (!date || !start) { toast('Укажите дату и время'); return false; } return { date, start, end: D.addMin(start, +$('#dt_u', sh).value) }; } }, { l: 'Отмена', v: null }]
  });
}
async function confirmDel(text) { return (await dialog({ title: text, buttons: [{ l: 'Удалить', v: true, d: 1 }, { l: 'Отмена', v: false }] })) === true; }

/* ================= common pieces ================= */
function sec(title, cnt = '', right = '') { return `<div class="sec"><h3>${esc(title)}</h3>${cnt !== '' ? `<span class="cnt">${esc(cnt)}</span>` : ''}<span class="sp"></span>${right}</div>`; }
function emptyBox(emoji, text) { return `<div class="empty"><b>${emoji}</b>${text}</div>`; }
function fab(onclick, extra = '') { return `<div class="fab-wrap">${extra}<button class="fab" onclick="${onclick}" aria-label="Добавить">${ic('plus', 26)}</button></div>`; }
function row(it, o = {}) {
  const c = catOf(it), od = isOverdue(it), done = it.status === 'done';
  const time = it.start ? timeLabel(it) : '';
  const tcol = o.showDate ? `<div class="row-time"><span>${esc(D.human(it.date))}</span>${time || '—'}</div>` : `<div class="row-time">${time || '<span>без времени</span>'}</div>`;
  const sub = [
    od ? '<span class="tag red">Просрочено</span>' : '',
    it.priority !== 'normal' ? `<span class="tag" style="--t:${PRIO[it.priority].c}">${PRIO[it.priority].l}</span>` : '',
    it.status === 'progress' ? '<span class="tag blue">В работе</span>' : '',
    it.kind === 'meeting' && it.recording ? `<span class="mini">${ic('rec', 12)}</span>` : '',
    (it.files || []).length ? `<span class="mini">${ic('clip', 12)}${it.files.length}</span>` : '',
    it.repeat && it.repeat.type !== 'none' ? `<span class="mini">${ic('repeat', 12)}</span>` : '',
    (it.subtasks || []).length ? `<span class="mini">${ic('check', 12)}${it.subtasks.filter(s => s.done).length}/${it.subtasks.length}</span>` : ''
  ].join('');
  return `<div class="row ${done ? 'done' : ''} ${it.status === 'cancelled' ? 'cancel' : ''}" data-open="${it.id}">
    <button class="chk ${done ? 'on' : ''}" style="--c:${c.color}" data-toggle="${it.id}" aria-label="Отметить выполненной">${done ? ic('checkmark', 13) : ''}</button>
    ${tcol}
    <div class="row-main"><div class="row-title">${it.kind === 'meeting' ? ic('users', 14) + ' ' : ''}${esc(it.title)}</div><div class="row-sub">${sub}</div></div>
    ${o.resched ? `<button class="rs-btn" data-resched="${it.id}">Перенести</button>` : `<span class="cat" style="--t:${c.color}">${esc(c.name)}</span>`}
  </div>`;
}
function listOf(items, o) { return `<div class="list">${items.map(i => row(i, o)).join('')}</div>`; }
function fileKind(f) {
  const n = (f.name || '').toLowerCase(), t = (f.type || '').toLowerCase();
  if (t === 'application/pdf' || n.endsWith('.pdf')) return ['PDF', '#ef4444', 'pdf'];
  if (/\.docx?$/.test(n)) return ['DOC', '#2563eb', 'docx'];
  if (/\.(xlsx?|csv)$/.test(n)) return ['XLS', '#16a34a', 'xlsx'];
  if (/\.pptx?$/.test(n)) return ['PPT', '#f97316', 'other'];
  if (t.startsWith('image/')) return ['IMG', '#8b5cf6', 'img'];
  if (t.startsWith('audio/')) return ['AUD', '#f59e0b', 'audio'];
  if (t.startsWith('video/')) return ['VID', '#ec4899', 'other'];
  if (t.startsWith('text/') || n.endsWith('.txt')) return ['TXT', '#64748b', 'other'];
  return [((n.split('.').pop() || 'FILE').slice(0, 4)).toUpperCase(), '#64748b', 'other'];
}
function ficon(f) { const [l, c] = fileKind(f); return `<span class="ficon" style="background:${c}">${esc(l)}</span>`; }
function attList(files, holderId, editable) {
  return `<div class="att">${files.map(f => `<div class="att-i" onclick="openFile('${holderId}','${f.id}')">${ficon(f)}<span>${esc(f.name)}</span>${editable ? `<button class="xbtn" style="width:26px;height:26px" onclick="event.stopPropagation();edRemoveFile('${f.id}')">${ic('x', 14)}</button>` : ''}</div>`).join('')}</div>`;
}

/* ================= navigation & render ================= */
const NAV = [['home', 'Главная', 'home'], ['calendar', 'Календарь', 'calendar'], ['tasks', 'Задачи', 'check'], ['notes', 'Заметки', 'note'], ['more', 'Ещё', 'grid']];
function renderNav() {
  const r = ['meetings', 'meeting', 'docs', 'fav', 'search', 'settings'].includes(S.route) ? 'more' : S.route;
  $('#nav').innerHTML = `<div class="nav-logo">${logo(30)}<span>MARKUS-A</span></div>` + NAV.map(([k, l, i]) => `<button class="nav-btn ${r === k ? 'on' : ''}" onclick="go('${k}')">${ic(i, 22)}<span>${l}</span></button>`).join('');
}
function go(route, arg) {
  if (route === 'meeting') S.meetingId = arg;
  if (route === 'calendar') S.scrollCal = true;
  S.prevRoute = S.route;
  S.route = route;
  render();
  window.scrollTo(0, 0);
}
function render() {
  renderNav();
  const fn = SCREENS[S.route] || SCREENS.home;
  const r = fn();
  $('#top').innerHTML = r.top || '';
  $('#screen').innerHTML = r.body || '';
  $('#dock').innerHTML = r.dock || '';
  if (r.after) r.after();
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-toggle],[data-resched],[data-open]');
  if (!t) return;
  if (t.dataset.toggle) { e.stopPropagation(); toggleDone(t.dataset.toggle); return; }
  if (t.dataset.resched) { e.stopPropagation(); smartReschedule(t.dataset.resched); return; }
  if (t.dataset.open) openItem(t.dataset.open);
});
function openItem(id) {
  const it = getItem(id); if (!it) return;
  if (it.kind === 'meeting') go('meeting', id);
  else if (it.kind === 'note') openNoteEditor(it);
  else openTaskDetail(it);
}

/* ================= task / meeting editor ================= */
let E = null; // current draft in editor
function openEditor(kind = 'task', preset = {}) {
  const existing = preset && preset.id ? getItem(preset.id) : null;
  const isNew = !existing || !!existing.deleted;
  E = clone(existing && !existing.deleted ? existing : Object.assign(newItem(kind), preset || {}));
  if (!E.kind) E.kind = kind;
  const isMeet = E.kind === 'meeting';
  const cats = S.set.categories.map(c => `<option value="${c.id}" ${E.category === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  return new Promise(res => {
    let saved = false;
    const sh = openSheet(`
      <div class="sh-h"><b>${isNew ? (isMeet ? 'Новая встреча' : 'Новая задача') : (isMeet ? 'Встреча' : 'Задача')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
      <div class="inp-mic"><input class="inp inp-big" id="e_title" placeholder="${isMeet ? 'С кем и о чём встреча?' : 'Что нужно сделать?'}" value="${esc(E.title)}"><button class="mic-sm" id="e_title_mic" onclick="dictateInto('e_title',this)" aria-label="Надиктовать">${ic('mic')}</button></div>
      <div class="g2"><div><label class="lbl">Дата</label><input class="inp" type="date" id="e_date" value="${E.date || ''}"></div><div><label class="lbl">Категория</label><select class="inp" id="e_cat">${cats}</select></div></div>
      <div class="g2"><div><label class="lbl">Начало</label><input class="inp" type="time" id="e_start" value="${E.start || ''}"></div><div><label class="lbl">Конец</label><input class="inp" type="time" id="e_end" value="${E.end || ''}"></div></div>
      <div class="chips wrapchips" style="margin-top:8px">${[15, 30, 60, 90, 120, 180].map(m => `<button class="chip" onclick="edDur(${m})">${durLabel(m)}</button>`).join('')}<button class="chip" onclick="edFindSlots()">${ic('clock', 14)} Свободное время</button></div>
      <div id="e_slots"></div>
      <label class="lbl">Приоритет</label>
      <div class="seg" id="e_prio">${Object.keys(PRIO).map(k => `<button data-v="${k}" class="${E.priority === k ? 'on' : ''}" onclick="edSeg('e_prio','priority','${k}')">${PRIO[k].l}</button>`).join('')}</div>
      ${isNew ? '' : `<label class="lbl">Статус</label><div class="seg" id="e_status">${Object.keys(STATUS).map(k => `<button data-v="${k}" class="${E.status === k ? 'on' : ''}" onclick="edSeg('e_status','status','${k}')">${STATUS[k]}</button>`).join('')}</div>`}
      <label class="lbl">Напомнить</label>
      <div class="chips wrapchips" id="e_rem">${REMIND_OPTS.map(([m, l]) => `<button class="chip ${E.reminders.includes(m) ? 'on' : ''}" data-m="${m}" onclick="edRem(${m},this)">${l}</button>`).join('')}</div>
      <label class="lbl">Повтор</label>
      <select class="inp" id="e_rep" onchange="edRepeatUI()">${Object.keys(REPEAT).map(k => `<option value="${k}" ${E.repeat && E.repeat.type === k ? 'selected' : ''}>${REPEAT[k]}</option>`).join('')}</select>
      <div id="e_repx"></div>
      <label class="lbl">${isMeet ? 'Участники' : 'Связанные люди / компании'} <span class="muted">(через запятую)</span></label>
      <input class="inp" id="e_part" value="${esc((E.participants || []).join(', '))}" placeholder="Алишер, ООО Сфера">
      ${isMeet ? `<label class="lbl">Место</label><input class="inp" id="e_place" value="${esc(E.place || '')}" placeholder="Офис, ресторан, ссылка на Zoom">
      <div class="sw-row" style="margin-top:8px"><div><b>Автозапись встречи</b><span>В начале встречи MARKUS-A начнёт запись, если приложение открыто; иначе пришлёт уведомление с кнопкой</span></div><button class="sw ${E.autoRecord ? 'on' : ''}" id="e_auto" onclick="this.classList.toggle('on')"></button></div>` : ''}
      <label class="lbl">Описание</label>
      <textarea class="inp" id="e_desc" placeholder="Детали, адрес, ссылки">${esc(E.desc || '')}</textarea>
      <label class="lbl">Подзадачи</label>
      <div id="e_subs"></div>
      <div class="inp-mic" style="margin-top:6px"><input class="inp" id="e_subnew" placeholder="Добавить шаг и нажать +" onkeydown="if(event.key==='Enter'){event.preventDefault();edAddSub()}"><button class="mic-sm" onclick="edAddSub()">${ic('plus')}</button></div>
      <label class="lbl">Документы</label>
      <div id="e_files"></div>
      <label class="att-add" style="margin-top:8px">${ic('clip', 16)} Прикрепить файл<input type="file" multiple hidden onchange="edAddFiles(this)"></label>
      <div class="sh-foot">${isNew ? '' : `<button class="btn danger" onclick="edDelete()">${ic('trash', 18)}</button>`}<button class="btn pri" style="flex:1" id="e_save">${isNew ? 'Создать' : 'Сохранить'}</button></div>
    `, { cls: 'tall', onClose: () => { stopDictation(); if (!saved) res(null); } });
    edRepeatUI(); edRenderSubs(); edRenderFiles();
    if (isNew && !E.title) setTimeout(() => $('#e_title', sh) && $('#e_title', sh).focus(), 250);
    $('#e_save', sh).onclick = async () => {
      const r = await edCollect(); if (!r) return;
      const ok = await resolveConflicts(E); if (!ok) return;
      await saveItem(E);
      saved = true; closeSheet(); toast(isNew ? 'Создано ✓' : 'Сохранено ✓');
      res(E);
    };
  });
}
function edSeg(id, field, v) { E[field] = v; $$('#' + id + ' button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); }
function edRem(m, el) { const i = E.reminders.indexOf(m); if (i >= 0) E.reminders.splice(i, 1); else E.reminders.push(m); el.classList.toggle('on', i < 0); }
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
  $('#e_slots').innerHTML = slots.length ? `<div class="hint">Свободно (${durLabel(dur)}):</div><div class="chips wrapchips">${slots.map(x => `<button class="chip" onclick="edPickSlot('${x.date}','${x.start}','${x.end}')">${slotLabel(x, other)}</button>`).join('')}</div>` : '<div class="hint">Свободных окон не нашлось</div>';
}
function edPickSlot(d, s, e) { $('#e_date').value = d; $('#e_start').value = s; $('#e_end').value = e; $('#e_slots').innerHTML = ''; }
function edRepeatUI() {
  const t = $('#e_rep').value; const box = $('#e_repx');
  E.repeat = Object.assign({}, E.repeat || {}, { type: t });
  if (t === 'days') {
    const days = E.repeat.days || [];
    box.innerHTML = `<div class="chips wrapchips" style="margin-top:8px">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button class="chip ${days.includes(d) ? 'on' : ''}" onclick="edDay(${d},this)">${D.DOW[d]}</button>`).join('')}</div>`;
  } else if (t === 'interval') {
    box.innerHTML = `<div class="inp-mic" style="margin-top:8px;align-items:center"><span class="muted">Каждые</span><input class="inp" type="number" min="1" max="365" style="width:90px;flex:0" value="${E.repeat.interval || 2}" onchange="E.repeat.interval=+this.value"><span class="muted">дн.</span></div>`;
    if (!E.repeat.interval) E.repeat.interval = 2;
  } else box.innerHTML = '';
}
function edDay(d, el) { E.repeat.days = E.repeat.days || []; const i = E.repeat.days.indexOf(d); if (i >= 0) E.repeat.days.splice(i, 1); else E.repeat.days.push(d); el.classList.toggle('on', i < 0); }
function edRenderSubs() {
  $('#e_subs').innerHTML = (E.subtasks || []).map((s, i) => `<div class="sub ${s.done ? 'done' : ''}"><button class="chk ${s.done ? 'on' : ''}" onclick="E.subtasks[${i}].done=!E.subtasks[${i}].done;edRenderSubs()">${s.done ? ic('checkmark', 12) : ''}</button><span>${esc(s.text)}</span><button class="xbtn" style="width:28px;height:28px" onclick="E.subtasks.splice(${i},1);edRenderSubs()">${ic('x', 14)}</button></div>`).join('');
}
function edAddSub() { const inp = $('#e_subnew'); const v = inp.value.trim(); if (!v) return; E.subtasks.push({ id: uid(), text: v, done: false }); inp.value = ''; edRenderSubs(); inp.focus(); }
function edRenderFiles() { $('#e_files').innerHTML = (E.files || []).length ? attList(E.files, E.id, true) : ''; }
async function edAddFiles(inp) { for (const f of inp.files) E.files.push(await storeFile(f)); inp.value = ''; edRenderFiles(); }
function edRemoveFile(fid) { E.files = E.files.filter(f => f.id !== fid); edRenderFiles(); }
async function edCollect() {
  const title = $('#e_title').value.trim();
  if (!title) { toast('Введите название'); $('#e_title').focus(); return false; }
  E.title = title;
  E.date = $('#e_date').value || null;
  E.start = $('#e_start').value || null;
  E.end = $('#e_end').value || null;
  if (!E.date) { E.start = null; E.end = null; }
  if (E.start && !E.end) E.end = D.addMin(E.start, S.set.defaultDur);
  if (!E.start) E.end = null;
  if (E.start && E.end && D.toMin(E.end) <= D.toMin(E.start)) { toast('Конец должен быть позже начала'); return false; }
  E.category = $('#e_cat').value;
  E.participants = $('#e_part').value.split(',').map(s => s.trim()).filter(Boolean);
  E.desc = $('#e_desc').value.trim();
  if (E.kind === 'meeting') { E.place = $('#e_place').value.trim(); E.autoRecord = $('#e_auto').classList.contains('on'); if (E.autoRecord && !E.reminders.includes(0)) E.reminders.push(0); }
  const pending = $('#e_subnew').value.trim(); if (pending) { E.subtasks.push({ id: uid(), text: pending, done: false }); }
  if (E.repeat.type === 'days' && !(E.repeat.days || []).length && E.date) E.repeat.days = [D.parse(E.date).getDay()];
  return true;
}
async function edDelete() {
  if (!(await confirmDel('Удалить «' + E.title + '»?'))) return;
  const it = getItem(E.id); if (it) await deleteItem(it);
  closeAllSheets(); toast('Удалено'); if (S.route === 'meeting') go('meetings');
}
function closeAllSheets() { while (Sheets.length) closeSheet(); }

/* ================= task detail ================= */
function openTaskDetail(it) {
  const sh = openSheet('<div id="td"></div>', { cls: 'tall' });
  renderTaskDetail(it.id, sh);
}
function renderTaskDetail(id, sh) {
  const it = getItem(id); const box = $('#td', sh); if (!it || !box) return;
  const c = catOf(it), od = isOverdue(it);
  box.innerHTML = `
    <div class="sh-h"><span class="cat" style="--t:${c.color}">${esc(c.name)}</span><span style="flex:1"></span>
      <button class="xbtn" onclick="favToggle('${id}')">${ic(it.fav ? 'starf' : 'star', 18)}</button>
      <button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div style="font-size:21px;font-weight:800;line-height:1.25;margin-bottom:8px">${esc(it.title)}</div>
    <div class="pills">
      <span class="pill">${ic('calendar', 14)}${esc(whenLabel(it))}</span>
      ${it.priority !== 'normal' ? `<span class="pill" style="color:${PRIO[it.priority].c}">${ic('flag', 14)}${PRIO[it.priority].l}</span>` : ''}
      ${it.repeat && it.repeat.type !== 'none' ? `<span class="pill">${ic('repeat', 14)}${REPEAT[it.repeat.type]}</span>` : ''}
      ${(it.reminders || []).length ? `<span class="pill">${ic('bell', 14)}${it.reminders.map(m => (REMIND_OPTS.find(o => o[0] === m) || [0, m + ' мин'])[1]).join(', ')}</span>` : ''}
    </div>
    ${od ? `<div class="banner" style="color:var(--red)" onclick="smartReschedule('${id}')">${ic('clock')}<div><b>Задача просрочена</b><span>Нажмите — найду ближайшее свободное окно</span></div>${ic('right')}</div>` : ''}
    <div class="seg">${Object.keys(STATUS).map(k => `<button class="${it.status === k ? 'on' : ''}" onclick="tdStatus('${id}','${k}')">${STATUS[k]}</button>`).join('')}</div>
    ${(it.subtasks || []).length ? `<div class="h4">Подзадачи · ${it.subtasks.filter(s => s.done).length}/${it.subtasks.length}</div>${it.subtasks.map((s, i) => `<div class="sub ${s.done ? 'done' : ''}"><button class="chk ${s.done ? 'on' : ''}" onclick="tdSub('${id}',${i})">${s.done ? ic('checkmark', 12) : ''}</button><span>${esc(s.text)}</span></div>`).join('')}` : ''}
    ${it.desc ? `<div class="h4">Описание</div><div class="pre">${esc(it.desc)}</div>` : ''}
    ${(it.participants || []).length ? `<div class="h4">Люди и компании</div><div class="pills">${it.participants.map(p => `<span class="pill">${ic('users', 14)}${esc(p)}</span>`).join('')}</div>` : ''}
    ${(it.files || []).length ? `<div class="h4">Документы</div>${attList(it.files, id, false)}` : ''}
    <div class="sh-foot"><button class="btn ghost" onclick="openShare('${id}')">${ic('share', 18)}</button><button class="btn ghost" style="flex:1" onclick="closeSheet();openEditor('${it.kind}',{id:'${id}'})">${ic('edit', 18)} Изменить</button><button class="btn danger" onclick="tdDelete('${id}')">${ic('trash', 18)}</button></div>`;
}
function refreshDetail(id) { const s = topSheet(); if (s && $('#td', s.w)) renderTaskDetail(id, s.w); }
async function tdStatus(id, st) { const it = getItem(id); await setStatus(it, st); refreshDetail(id); }
async function tdSub(id, i) { const it = getItem(id); it.subtasks[i].done = !it.subtasks[i].done; await saveItem(it); refreshDetail(id); }
async function tdDelete(id) { const it = getItem(id); if (!(await confirmDel('Удалить «' + it.title + '»?'))) return; await deleteItem(it); closeAllSheets(); toast('Удалено'); }
async function favToggle(id) { const it = getItem(id); it.fav = !it.fav; await saveItem(it); refreshDetail(id); toast(it.fav ? 'В избранном ★' : 'Убрано из избранного'); }

/* ================= note editor ================= */
function openNoteEditor(note, preset) {
  const existing = note && note.id ? getItem(note.id) : null;
  const N = clone(existing || Object.assign(newItem('note'), preset || {}));
  const isNew = !existing;
  E = N;
  let removed = false;
  const sh = openSheet(`
    <div class="sh-h"><b>${isNew ? 'Новая заметка' : 'Заметка'}</b>
      <button class="xbtn" id="n_fav">${ic(N.fav ? 'starf' : 'star', 18)}</button>
      ${isNew ? '' : `<button class="xbtn" onclick="openShare('${N.id}')">${ic('share', 18)}</button>`}
      <button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <input class="inp inp-big" id="n_title" placeholder="Заголовок" value="${esc(N.title)}">
    <div class="chips wrapchips" style="margin-top:10px" id="n_cats">${S.set.noteCats.map(c => `<button class="chip ${N.noteCat === c ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div style="position:relative;margin-top:4px"><textarea class="inp" id="n_text" style="min-height:220px;padding-right:56px" placeholder="Текст заметки. Нажмите микрофон, чтобы надиктовать.">${esc(N.desc || '')}</textarea>
      <button class="mic-sm" style="position:absolute;right:6px;top:6px" onclick="dictateInto('n_text',this,true)" aria-label="Надиктовать">${ic('mic')}</button></div>
    <div class="btns" style="margin-top:10px"><button class="btn ghost" id="n_fix">${ic('ai', 16)} Улучшить текст</button><button class="btn ghost" id="n_task">${ic('check', 16)} Сделать задачей</button></div>
    <label class="lbl">Файлы</label><div id="e_files"></div>
    <label class="att-add" style="margin-top:8px">${ic('clip', 16)} Прикрепить файл или фото<input type="file" multiple hidden onchange="edAddFiles(this)"></label>
    <div class="hint">Заметка сохраняется автоматически при закрытии.</div>
    <div class="sh-foot">${isNew ? '' : `<button class="btn danger" id="n_del">${ic('trash', 18)}</button>`}<button class="btn pri" style="flex:1" onclick="closeSheet()">Готово</button></div>
  `, { cls: 'tall', onClose: async () => {
    stopDictation();
    if (removed) return;
    N.title = $('#n_title', sh).value.trim(); N.desc = $('#n_text', sh).value.trim();
    if (!N.title && !N.desc && !N.files.length) return;
    if (!N.title) N.title = N.desc.split('\n')[0].slice(0, 60) || 'Заметка';
    const before = existing ? JSON.stringify(existing) : '';
    const changed = !existing || before !== JSON.stringify(Object.assign({}, existing, { title: N.title, desc: N.desc, noteCat: N.noteCat, fav: N.fav, files: N.files }));
    if (changed) { await saveItem(N); toast('Заметка сохранена'); }
  } });
  edRenderFiles();
  $$('#n_cats .chip', sh).forEach(b => b.onclick = () => { N.noteCat = b.dataset.c; $$('#n_cats .chip', sh).forEach(x => x.classList.toggle('on', x === b)); });
  $('#n_fav', sh).onclick = () => { N.fav = !N.fav; $('#n_fav', sh).innerHTML = ic(N.fav ? 'starf' : 'star', 18); };
  $('#n_fix', sh).onclick = async () => {
    const ta = $('#n_text', sh); if (!ta.value.trim()) return toast('Сначала напишите или надиктуйте текст');
    try { toast('AI улучшает текст…', 8000); ta.value = await AI.improveText(ta.value); toast('Готово ✓'); } catch (e) { toast(e.message, 4000); }
  };
  $('#n_task', sh).onclick = async () => {
    const t = ($('#n_title', sh).value + '. ' + $('#n_text', sh).value).trim();
    if (t.length < 3) return toast('Заметка пустая');
    closeSheet();
    await handleCommand(t, { forceCreate: true });
  };
  if ($('#n_del', sh)) $('#n_del', sh).onclick = async () => { if (!(await confirmDel('Удалить заметку?'))) return; removed = true; const it = getItem(N.id); if (it) await deleteItem(it); closeSheet(); toast('Удалено'); };
  if (isNew && !N.desc) setTimeout(() => $('#n_text', sh) && $('#n_text', sh).focus(), 250);
}

/* ================= files ================= */
function findFile(holderId, fileId) {
  const it = getItem(holderId) || (E && E.id === holderId ? E : null);
  if (!it) return {};
  if (fileId === 'rec' && it.recording) return { it, f: { id: it.recording.fileId, name: 'Запись — ' + it.title + '.' + ((it.recording.mime || '').includes('mp4') ? 'm4a' : (it.recording.mime || '').includes('ogg') ? 'ogg' : 'webm'), type: (it.recording.mime || 'audio/webm').split(';')[0], size: it.recording.size, cloud: it.recording.cloud, fav: it.recording.fav, isRec: true } };
  return { it, f: (it.files || []).find(x => x.id === fileId) };
}
async function openFile(holderId, fileId) {
  const { it, f } = findFile(holderId, fileId); if (!f) return;
  const kind = fileKind(f)[2];
  const sh = openSheet(`
    <div class="sh-h">${ficon(f)}<b style="font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="hint">${mb(f.size)} · ${esc(it.title)}</div>
    <div id="fv"></div>
    <div class="btns" style="margin-top:12px"><button class="btn pri" id="f_open">Открыть</button><button class="btn ghost" id="f_dl">${ic('download', 18)}</button>${f.isRec ? '' : `<button class="btn ghost" id="f_fav">${ic(f.fav ? 'starf' : 'star', 18)}</button>`}</div>
    <div class="btns" style="margin-top:8px"><button class="btn ghost" id="f_sum">${ic('ai', 16)} Кратко (AI)</button><button class="btn ghost" id="f_ask">${ic('ai', 16)} Спросить</button></div>
    <div id="f_ai"></div>
    ${it.kind !== 'note' || it.noteCat !== 'Документы' ? `<button class="btn ghost full" style="margin-top:8px" onclick="closeAllSheets();openItem('${it.id}')">Перейти: ${esc(it.title.slice(0, 40))}</button>` : ''}
  `);
  const blob = await getFileBlob(f);
  if (!blob) { $('#fv', sh).innerHTML = '<div class="hint warn">Файл есть только на другом устройстве. Войдите в облако и синхронизируйте.</div>'; }
  else if (kind === 'img') { $('#fv', sh).innerHTML = `<img src="${URL.createObjectURL(blob)}" style="width:100%;border-radius:12px;max-height:50vh;object-fit:contain;background:var(--card2)">`; }
  else if (kind === 'audio') { $('#fv', sh).innerHTML = `<audio controls style="width:100%" src="${URL.createObjectURL(blob)}"></audio>`; }
  $('#f_open', sh).onclick = () => { if (!blob) return; const u = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: f.type })); window.open(u, '_blank'); };
  $('#f_dl', sh).onclick = () => blob && downloadBlob(blob, f.name);
  if ($('#f_fav', sh)) $('#f_fav', sh).onclick = async () => { f.fav = !f.fav; await saveItem(it); $('#f_fav', sh).innerHTML = ic(f.fav ? 'starf' : 'star', 18); toast(f.fav ? 'В избранном ★' : 'Убрано из избранного'); };
  const out = $('#f_ai', sh);
  $('#f_sum', sh).onclick = async () => {
    out.innerHTML = '<div class="ai-box">AI читает документ…</div>';
    try { const t = f.summaryText || await AI.docSummary(f); if (!f.isRec) { f.summaryText = t; saveItem(it, { render: false }); } out.innerHTML = `<div class="ai-box">${esc(t)}</div>`; }
    catch (e) { out.innerHTML = `<div class="ai-box">${esc(e.message)}</div>`; }
  };
  $('#f_ask', sh).onclick = async () => {
    const q = await askChoice('Вопрос по документу', 'Например: «Какие обязательства сторон?»', [], { type: 'text', label: 'Спросить' });
    if (!q) return;
    out.innerHTML = '<div class="ai-box">AI ищет ответ…</div>';
    try { out.innerHTML = `<div class="ai-box"><b>${esc(q)}</b>\n\n${esc(await AI.docAsk(f, q))}</div>`; } catch (e) { out.innerHTML = `<div class="ai-box">${esc(e.message)}</div>`; }
  };
}
async function uploadDocs(inp) {
  for (const file of inp.files) {
    const f = await storeFile(file);
    const n = newItem('note', { title: file.name, noteCat: 'Документы', files: [f], desc: '' });
    await saveItem(n);
  }
  inp.value = ''; toast('Документ добавлен');
}

/* ================= sharing ================= */
async function openShare(id) {
  const it = getItem(id); if (!it) return;
  if (!Cloud.user) {
    const v = await dialog({ title: 'Поделиться', text: 'Ссылки работают через облако. Войдите в аккаунт: Настройки → Облако.', buttons: [{ l: 'Открыть настройки', v: 1, p: 1 }, { l: 'Закрыть', v: 0 }] });
    if (v) { closeAllSheets(); go('settings'); }
    return;
  }
  let perm = 'view', days = 7;
  const sh = openSheet(`
    <div class="sh-h"><b>Поделиться</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="hint">Получатель увидит название, дату, время, место, описание и документы «${esc(it.title)}».</div>
    <label class="lbl">Доступ</label><div class="seg" id="sh_p"><button data-v="view" class="on">Только просмотр</button><button data-v="comment">Комментирование</button></div>
    <label class="lbl">Срок действия ссылки</label><div class="seg" id="sh_d"><button data-v="1">1 день</button><button data-v="7" class="on">7 дней</button><button data-v="30">30 дней</button><button data-v="0">Без срока</button></div>
    <label class="lbl">Код доступа <span class="muted">(необязательно)</span></label><input class="inp" id="sh_c" placeholder="Например 4821" maxlength="20">
    <button class="btn pri full" style="margin-top:14px" id="sh_go">${ic('link', 18)} Создать ссылку</button>
    <div id="sh_res"></div>
    <div class="h4">Выданные ссылки</div><div id="sh_list"><div class="hint">Загрузка…</div></div>
    <div class="hint">Совместное редактирование — в следующей версии.</div>`, { cls: 'tall' });
  const segs = (sel, cb) => $$(sel + ' button', sh).forEach(b => b.onclick = () => { $$(sel + ' button', sh).forEach(x => x.classList.toggle('on', x === b)); cb(b.dataset.v); });
  segs('#sh_p', v => perm = v); segs('#sh_d', v => days = +v);
  const loadList = async () => {
    const list = await Cloud.listShares(id);
    $('#sh_list', sh).innerHTML = list.length ? list.map(s => {
      const exp = s.expires_at && new Date(s.expires_at) < new Date();
      const st = s.revoked ? '<span class="tag red">отозвана</span>' : exp ? '<span class="tag red">истекла</span>' : '<span class="tag grn">активна</span>';
      const cm = (s.share_comments || []);
      return `<div class="card" style="padding:10px 12px"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${st}<span class="tag">${s.permission === 'comment' ? 'комментарии' : 'просмотр'}</span>${s.code ? '<span class="tag">с кодом</span>' : ''}<span class="mini">${s.expires_at ? 'до ' + new Date(s.expires_at).toLocaleDateString('ru-RU') : 'без срока'}</span><span style="flex:1"></span>${!s.revoked && !exp ? `<button class="link" data-rev="${s.token}">Отозвать</button>` : ''}</div>
        ${cm.map(c => `<div style="margin-top:8px;font-size:13px"><b>${esc(c.author || 'Гость')}:</b> ${esc(c.body)}</div>`).join('')}</div>`;
    }).join('') : '<div class="hint">Пока нет</div>';
    $$('[data-rev]', sh).forEach(b => b.onclick = async () => { await Cloud.revokeShare(b.dataset.rev); toast('Доступ отозван'); loadList(); });
  };
  loadList();
  $('#sh_go', sh).onclick = async () => {
    $('#sh_go', sh).disabled = true;
    try {
      const url = await Cloud.createShare(it, { permission: perm, days, code: $('#sh_c', sh).value.trim() });
      $('#sh_res', sh).innerHTML = `<div class="ai-box" style="word-break:break-all">${esc(url)}</div><div class="btns" style="margin-top:8px"><button class="btn ghost" id="sh_copy">Копировать</button>${navigator.share ? '<button class="btn ghost" id="sh_send">Отправить…</button>' : ''}</div>`;
      $('#sh_copy', sh).onclick = () => { navigator.clipboard.writeText(url).then(() => toast('Ссылка скопирована')); };
      if ($('#sh_send', sh)) $('#sh_send', sh).onclick = () => navigator.share({ title: it.title, text: it.title + ' — ' + whenLabel(it), url }).catch(() => { });
      loadList();
    } catch (e) { toast(e.message, 4000); }
    $('#sh_go', sh).disabled = false;
  };
}

/* ================= free slot finder ================= */
function openSlotFinder() {
  const sh = openSheet(`
    <div class="sh-h"><b>Найти свободное окно</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="g2"><div><label class="lbl">Длительность</label><select class="inp" id="sf_d">${[30, 60, 90, 120, 180, 240].map(m => `<option value="${m}" ${m === 60 ? 'selected' : ''}>${durLabel(m)}</option>`).join('')}</select></div>
    <div><label class="lbl">До даты</label><input class="inp" type="date" id="sf_u" value="${D.add(D.today(), 7)}"></div></div>
    <button class="btn pri full" style="margin-top:14px" id="sf_go">${ic('search', 18)} Найти</button>
    <div id="sf_r" style="margin-top:12px"></div>
    <div class="hint">Рабочие часы: ${S.set.workStart}–${S.set.workEnd} (меняются в настройках).</div>`);
  const run = () => {
    const dur = +$('#sf_d', sh).value, until = $('#sf_u', sh).value || D.add(D.today(), 7);
    const slots = findAhead(dur, D.today(), until, 10);
    $('#sf_r', sh).innerHTML = slots.length ? `<div class="chips wrapchips">${slots.map(s => `<button class="chip" data-s='${JSON.stringify(s)}'>${slotLabel(s, true)}</button>`).join('')}</div><div class="hint">Нажмите на окно — создам задачу на это время.</div>` : '<div class="hint">До этой даты свободных окон нет.</div>';
    $$('#sf_r [data-s]', sh).forEach(b => b.onclick = () => { const s = JSON.parse(b.dataset.s); closeSheet(); openEditor('task', { date: s.date, start: s.start, end: s.end }); });
  };
  $('#sf_go', sh).onclick = run; run();
}

async function askNotif() {
  if (!('Notification' in window)) return toast('Браузер не поддерживает уведомления');
  const p = await Notification.requestPermission();
  toast(p === 'granted' ? 'Уведомления включены ✓' : 'Уведомления запрещены в браузере');
  render();
}
