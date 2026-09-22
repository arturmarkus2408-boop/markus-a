'use strict';
function brandTop() {
  return `<div class="brand">${logo(28)}<span>MARKUS-A</span></div>
    <button class="tbtn" onclick="go('search')" aria-label="Поиск">${ic('search')}</button>
    <button class="avatar" onclick="go('settings')" aria-label="Настройки">${esc((S.set.name || 'M').trim()[0].toUpperCase())}</button>`;
}
function titleTop(t, o = {}) { return `${o.back ? `<button class="tbtn" onclick="${o.back}" aria-label="Назад">${ic('left')}</button>` : ''}<h1>${esc(t)}</h1>${o.extra || ''}`; }

const SCREENS = {};

/* ================= HOME ================= */
SCREENS.home = () => {
  const t = D.today(), h = new Date().getHours();
  const greet = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  const name = S.set.name ? ', ' + esc(S.set.name.trim().split(' ')[0]) : '';
  const cur = currentItem(), nx = nextToday();
  const today = sortItems(itemsOn(t).filter(i => i.status !== 'cancelled'));
  const od = overdueList(), up = upcoming(14, 5), imp = importantList();
  let b = `<div class="hello"><h2>${greet}${name}!</h2><p>${esc(D.long(t))}</p></div>`;
  if ('Notification' in window && Notification.permission === 'default') b += `<div class="banner" onclick="askNotif()">${ic('bell')}<div><b>Включите уведомления</b><span>Чтобы MARKUS-A напоминал о делах</span></div>${ic('right')}</div>`;
  if (!AI.ready()) b += `<div class="banner" onclick="go('settings')">${ic('ai')}<div><b>Подключите AI (бесплатно)</b><span>Для голосовых команд и анализа встреч</span></div>${ic('right')}</div>`;
  const nowCard = (label, it) => `<div class="now" data-open="${it.id}"><div class="now-b"><div class="now-l">${label}</div><div class="now-time">${esc(timeLabel(it))}</div><div class="now-t">${esc(it.title)}</div><div class="now-s">${esc(catOf(it).name)}${it.place ? ' · ' + esc(it.place) : ''}</div></div>${ic('right')}</div>`;
  if (cur) b += nowCard('Сейчас', cur);
  else if (nx) b += nowCard('Далее сегодня', nx);
  else b += `<div class="now" onclick="openVoice()"><div class="now-b"><div class="now-l">Сейчас</div><div class="now-t">Свободное время</div><div class="now-s">${today.filter(isOpen).length ? 'Остались задачи без времени' : 'Скажите MARKUS-A, что запланировать'}</div></div>${ic('mic')}</div>`;
  if (od.length) b += sec('Просрочено', od.length) + listOf(od.slice(0, 5), { showDate: true, resched: true });
  b += sec('Сегодня', today.length + ' ' + plural(today.length, 'задача', 'задачи', 'задач'), `<button class="link" onclick="S.calView='day';S.selDate=D.today();go('calendar')">Календарь</button>`);
  b += today.length ? listOf(today) : emptyBox('☀️', 'На сегодня ничего не запланировано');
  if (up.length) b += sec('Далее') + listOf(up, { showDate: true });
  if (imp.length) b += sec('Важное') + listOf(imp, { showDate: true });
  const dock = `<div class="dock">
    <button class="dk" onclick="openEditor('task')">${ic('check', 22)}<span>Задача</span></button>
    <button class="dk" onclick="openEditor('meeting')">${ic('users', 22)}<span>Встреча</span></button>
    <button class="dk-mic" onclick="openVoice()"><i>${ic('mic', 28)}</i>Сказать MARKUS-A</button>
    <button class="dk" onclick="openNoteEditor()">${ic('note', 22)}<span>Заметка</span></button>
    <button class="dk" onclick="quickRecord()">${ic('rec', 22)}<span>Запись</span></button></div>`;
  return { top: brandTop(), body: b, dock };
};

/* ================= CALENDAR ================= */
function calShift(n) {
  const v = S.calView;
  if (v === 'month') { const d = D.parse(S.selDate); d.setDate(1); d.setMonth(d.getMonth() + n); S.selDate = D.fmt(d); }
  else S.selDate = D.add(S.selDate, n * (v === 'day' ? 1 : v === '3day' ? 3 : 7));
  S.scrollCal = true; render();
}
function calTitle() {
  const v = S.calView, s = S.selDate;
  if (v === 'day') return D.long(s);
  if (v === 'month') { const d = D.parse(s); return D.M[d.getMonth()] + ' ' + d.getFullYear(); }
  const a = v === 'week' ? D.weekStart(s) : s, e = D.add(a, v === 'week' ? 6 : 2);
  const da = D.parse(a), de = D.parse(e);
  return da.getMonth() === de.getMonth() ? `${da.getDate()}–${de.getDate()} ${D.MG[de.getMonth()]}` : `${D.short(a)} – ${D.short(e)}`;
}
function weekStrip() {
  const ws = D.weekStart(S.selDate), t = D.today();
  return `<div class="wstrip">${[0, 1, 2, 3, 4, 5, 6].map(k => {
    const d = D.add(ws, k), has = itemsOn(d).some(isOpen);
    return `<button class="wd ${d === t ? 'today' : ''} ${d === S.selDate ? 'sel' : ''}" onclick="S.selDate='${d}';render()">${D.DOW[D.parse(d).getDay()]}<b>${D.parse(d).getDate()}</b><i class="${has ? '' : 'no'}"></i></button>`;
  }).join('')}</div>`;
}
function layoutDay(items) {
  const timed = items.filter(i => i.start).map(i => ({ i, s: D.toMin(i.start), e: Math.max(D.toMin(i.end || i.start), D.toMin(i.start) + 20) })).sort((a, b) => a.s - b.s || b.e - a.e);
  let cluster = [], cEnd = -1; const out = [];
  const flush = () => { const lanes = []; cluster.forEach(x => { let l = lanes.findIndex(e => e <= x.s); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = x.e; x.lane = l; }); cluster.forEach(x => { x.n = lanes.length; out.push(x); }); cluster = []; };
  timed.forEach(x => { if (x.s >= cEnd && cluster.length) { flush(); cEnd = -1; } cluster.push(x); cEnd = Math.max(cEnd, x.e); });
  if (cluster.length) flush();
  return out;
}
function timeGrid(dates) {
  const HH = 52, t = D.today();
  const per = dates.map(d => itemsOn(d).filter(i => i.status !== 'cancelled'));
  let h0 = 7, h1 = 22;
  per.flat().forEach(i => { if (i.start) { h0 = Math.min(h0, Math.floor(D.toMin(i.start) / 60)); h1 = Math.max(h1, Math.ceil(D.toMin(i.end || i.start) / 60) + (i.end ? 0 : 1)); } });
  h1 = Math.min(24, h1);
  const hours = []; for (let h = h0; h < h1; h++) hours.push(h);
  const multi = dates.length > 1;
  const head = multi ? `<div class="tg-head">${dates.map(d => `<button class="${d === t ? 'today' : ''}" onclick="S.selDate='${d}';S.calView='day';render()">${D.DOW[D.parse(d).getDay()]} ${D.parse(d).getDate()}</button>`).join('')}</div>` : '';
  const allday = per.map(a => a.filter(i => !i.start));
  const ad = allday.some(a => a.length) ? `<div class="tg-allday">${allday.map(a => `<div>${a.map(i => `<div class="adb" style="--c:${catOf(i).color}" data-open="${i.id}">${i.status === 'done' ? '✓ ' : ''}${esc(i.title)}</div>`).join('')}</div>`).join('')}</div>` : '';
  const cols = dates.map((d, k) => {
    const blocks = layoutDay(per[k]).map(x => {
      const top = (x.s - h0 * 60) / 60 * HH, hgt = Math.max(22, (x.e - x.s) / 60 * HH - 2), w = 100 / x.n;
      return `<div class="blk ${x.i.status === 'done' ? 'done' : ''}" style="--c:${catOf(x.i).color};top:${top}px;height:${hgt}px;left:calc(${x.lane * w}% + 2px);width:calc(${w}% - 4px)" data-open="${x.i.id}"><b>${x.i.kind === 'meeting' ? '👥 ' : ''}${esc(x.i.title)}</b>${hgt > 34 ? `<span>${esc(timeLabel(x.i))}</span>` : ''}</div>`;
    }).join('');
    const nm = D.nowMin();
    const line = d === t && nm >= h0 * 60 && nm < h1 * 60 ? `<div class="now-line" style="top:${(nm - h0 * 60) / 60 * HH}px"></div>` : '';
    return `<div class="tg-col" style="height:${hours.length * HH}px" onclick="gridClick(event,'${d}',${h0})">${blocks}${line}</div>`;
  }).join('');
  return `<div class="tg">${head}${ad}<div class="tg-body"><div class="tg-hours">${hours.map(h => `<div>${pad(h)}:00</div>`).join('')}</div>${cols}</div></div>
    <div class="hint" style="text-align:center">Нажмите на пустое место в сетке — создам задачу на это время</div>`;
}
function gridClick(e, date, h0) {
  if (e.target.closest('.blk')) return;
  const r = e.currentTarget.getBoundingClientRect();
  const m = Math.floor(((e.clientY - r.top) / 52 * 60 + h0 * 60) / 30) * 30;
  const start = D.fromMin(m);
  openEditor('task', { date, start, end: D.addMin(start, S.set.defaultDur) });
}
function monthGrid() {
  const sel = D.parse(S.selDate), t = D.today();
  const first = D.fmt(new Date(sel.getFullYear(), sel.getMonth(), 1));
  const start = D.weekStart(first);
  let cells = '';
  for (let k = 0; k < 42; k++) {
    const d = D.add(start, k), dd = D.parse(d), its = sortItems(itemsOn(d).filter(i => i.status !== 'cancelled'));
    if (k === 35 && dd.getMonth() !== sel.getMonth()) break;
    cells += `<div class="m-cell ${dd.getMonth() !== sel.getMonth() ? 'out' : ''} ${d === t ? 'today' : ''}" onclick="S.selDate='${d}';S.calView='day';S.scrollCal=true;render()">
      <div class="m-num">${dd.getDate()}</div>${its.slice(0, 3).map(i => `<div class="m-ev" style="--c:${catOf(i).color}">${esc(i.title)}</div>`).join('')}${its.length > 3 ? `<div class="m-more">+${its.length - 3}</div>` : ''}</div>`;
  }
  return `<div class="month"><div class="m-dow">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(x => `<span>${x}</span>`).join('')}</div><div class="m-grid">${cells}</div></div>`;
}
function listView() {
  const t = D.today(), past = S.showPast;
  const its = S.items.filter(i => !i.deleted && i.kind !== 'note' && i.date && (past ? i.date < t : i.date >= t));
  const sorted = sortByDate(its, past).slice(0, 300);
  const groups = {};
  sorted.forEach(i => { (groups[i.date] = groups[i.date] || []).push(i); });
  let b = `<div class="seg"><button class="${!past ? 'on' : ''}" onclick="S.showPast=false;render()">Будущее</button><button class="${past ? 'on' : ''}" onclick="S.showPast=true;render()">Прошлое</button></div>`;
  const keys = Object.keys(groups);
  if (!keys.length) b += emptyBox(past ? '🗂' : '🗓', past ? 'Прошедших дел нет' : 'Будущих дел нет');
  keys.forEach(d => { b += sec(D.human(d), D.DOWF[D.parse(d).getDay()]) + listOf(sortItems(groups[d])); });
  if (!past) { const nd = S.items.filter(i => isOpen(i) && !i.date); if (nd.length) b += sec('Без даты', nd.length) + listOf(nd); }
  return b;
}
SCREENS.calendar = () => {
  if (!S.selDate) S.selDate = D.today();
  const v = S.calView;
  const views = [['day', 'День'], ['3day', '3 дня'], ['week', 'Неделя'], ['month', 'Месяц'], ['list', 'Список']];
  let b = `<div class="seg">${views.map(([k, l]) => `<button class="${v === k ? 'on' : ''}" onclick="S.calView='${k}';S.scrollCal=true;render()">${l}</button>`).join('')}</div>`;
  if (v !== 'list') b += `<div class="cal-nav"><button class="tbtn" onclick="calShift(-1)" aria-label="Назад">${ic('left')}</button><b>${esc(calTitle())}</b><button class="tbtn" onclick="calShift(1)" aria-label="Вперёд">${ic('right')}</button></div>`;
  if (v === 'day') b += weekStrip() + timeGrid([S.selDate]);
  else if (v === '3day') b += timeGrid([S.selDate, D.add(S.selDate, 1), D.add(S.selDate, 2)]);
  else if (v === 'week') { const ws = D.weekStart(S.selDate); b += timeGrid([0, 1, 2, 3, 4, 5, 6].map(k => D.add(ws, k))); }
  else if (v === 'month') b += monthGrid();
  else b += listView();
  return {
    top: titleTop('Календарь', { extra: `<button class="chip-btn" onclick="S.selDate=D.today();S.scrollCal=true;render()">Сегодня</button><button class="tbtn" onclick="openSlotFinder()" aria-label="Найти свободное окно">${ic('clock')}</button>` }),
    body: b,
    dock: fab(`openEditor('task',{date:S.selDate})`, `<button class="fab sec2" onclick="openVoice()" aria-label="Голос">${ic('mic', 24)}</button>`),
    after: () => {
      if (!S.scrollCal) return; S.scrollCal = false;
      if (!['day', '3day', 'week'].includes(v)) return;
      const nl = $('.now-line'), fb = $('.blk');
      const target = nl || fb;
      if (target) { const y = target.getBoundingClientRect().top + window.scrollY - 180; window.scrollTo({ top: Math.max(0, y) }); }
    }
  };
};

/* ================= TASKS ================= */
const TFILTERS = [['today', 'Сегодня'], ['tomorrow', 'Завтра'], ['week', '7 дней'], ['overdue', 'Просрочено'], ['nodate', 'Без даты'], ['active', 'Все активные'], ['done', 'Выполнено']];
function taskFilter(k) {
  const t = D.today(), tm = D.add(t, 1), w = D.add(t, 7);
  return S.items.filter(i => !i.deleted && i.kind !== 'note').filter(i => {
    switch (k) {
      case 'today': return i.date === t && i.status !== 'cancelled';
      case 'tomorrow': return i.date === tm && i.status !== 'cancelled';
      case 'week': return isOpen(i) && i.date && i.date >= t && i.date <= w;
      case 'overdue': return isOverdue(i);
      case 'nodate': return isOpen(i) && !i.date;
      case 'active': return isOpen(i);
      case 'done': return i.status === 'done';
    }
    return false;
  });
}
SCREENS.tasks = () => {
  const k = S.taskFilter;
  let b = `<div class="chips">${TFILTERS.map(([f, l]) => { const n = taskFilter(f).length; return `<button class="chip ${k === f ? 'on' : ''}" onclick="S.taskFilter='${f}';render()">${l}${n && f !== 'done' ? `<small>${n}</small>` : ''}</button>`; }).join('')}</div>`;
  const items = taskFilter(k);
  if (!items.length) b += emptyBox(k === 'overdue' ? '🎉' : '✅', k === 'overdue' ? 'Просроченных задач нет' : 'Здесь пусто');
  else if (['today', 'tomorrow', 'nodate'].includes(k)) b += listOf(sortItems(items), { resched: k === 'today' && false });
  else {
    const groups = {}; sortByDate(items, k === 'done').slice(0, 300).forEach(i => { const g = i.date || 'none'; (groups[g] = groups[g] || []).push(i); });
    Object.keys(groups).forEach(g => { b += sec(g === 'none' ? 'Без даты' : D.human(g), g === 'none' ? '' : D.DOWF[D.parse(g).getDay()]) + listOf(groups[g], { resched: k === 'overdue' }); });
  }
  return { top: titleTop('Задачи', { extra: `<button class="tbtn" onclick="openSlotFinder()" aria-label="Найти окно">${ic('clock')}</button>` }), body: b, dock: fab(`openEditor('task')`, `<button class="fab sec2" onclick="openVoice()" aria-label="Голос">${ic('mic', 24)}</button>`) };
};

/* ================= NOTES ================= */
const NOTE_COLORS = { 'Идеи': '#f59e0b', 'Работа': '#3b82f6', 'Личные': '#ef4444', 'Документы': '#8b5cf6' };
function notesFiltered() {
  const q = (S.noteQ || '').toLowerCase();
  return live().filter(i => i.kind === 'note' && (S.noteCat === 'all' || i.noteCat === S.noteCat) && (!q || (i.title + ' ' + i.desc + ' ' + (i.files || []).map(f => f.name).join(' ')).toLowerCase().includes(q)))
    .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
}
function notesListHTML() {
  const ns = notesFiltered();
  if (!ns.length) return emptyBox('📝', S.noteQ ? 'Ничего не найдено' : 'Заметок пока нет. Нажмите + или микрофон');
  return `<div class="list">${ns.map(n => { const c = NOTE_COLORS[n.noteCat] || '#64748b'; return `<div class="ncard" data-open="${n.id}"><div class="nicon" style="--t:${c}">${ic(n.noteCat === 'Документы' ? 'file' : 'note')}</div><div class="nmain"><b>${esc(n.title || 'Без названия')}</b><span>${esc(D.human((n.updated || '').slice(0, 10) || D.today()))} · ${esc(n.noteCat || '')}${(n.files || []).length ? ' · 📎 ' + n.files.length : ''}</span>${n.desc ? `<p>${esc(n.desc.slice(0, 200))}</p>` : ''}</div>${n.fav ? `<span style="color:var(--ylw)">${ic('starf', 16)}</span>` : ''}</div>`; }).join('')}</div>`;
}
SCREENS.notes = () => {
  let b = `<div class="search">${ic('search', 18)}<input placeholder="Поиск заметок…" value="${esc(S.noteQ)}" oninput="S.noteQ=this.value;$('#nl').innerHTML=notesListHTML()"></div>`;
  b += `<div class="chips"><button class="chip ${S.noteCat === 'all' ? 'on' : ''}" onclick="S.noteCat='all';render()">Все</button>${S.set.noteCats.map(c => `<button class="chip ${S.noteCat === c ? 'on' : ''}" onclick="S.noteCat='${esc(c)}';render()">${esc(c)}</button>`).join('')}</div>`;
  b += `<div id="nl">${notesListHTML()}</div>`;
  return { top: titleTop('Заметки'), body: b, dock: fab(`openNoteEditor(null,{noteCat:S.noteCat==='all'?'Идеи':S.noteCat})`, `<button class="fab sec2" onclick="openVoice('note')" aria-label="Надиктовать заметку">${ic('mic', 24)}</button>`) };
};

/* ================= MORE ================= */
SCREENS.more = () => {
  const tiles = [['meetings', 'Встречи', 'users'], ['docs', 'Документы', 'folder'], ['fav', 'Избранное', 'star'], ['search', 'Поиск и AI', 'search'], ['slot', 'Свободное окно', 'clock'], ['rec', 'Запись', 'rec'], ['voice', 'Голос', 'mic'], ['settings', 'Настройки', 'settings']];
  const act = { slot: 'openSlotFinder()', rec: 'quickRecord()', voice: 'openVoice()' };
  const b = `<div class="tiles">${tiles.map(([k, l, i]) => `<button class="tile" onclick="${act[k] || `go('${k}')`}"><span class="ti">${ic(i, 22)}</span>${l}</button>`).join('')}</div>
    <div style="text-align:center;margin-top:30px">${logo(56)}<div style="font-weight:800;font-size:20px;margin-top:10px">MARKUS-A</div><div class="muted" style="font-size:13px">Больше, чем просто календарь.<br>Думай. Говори. Действуй.</div></div>`;
  return { top: titleTop('Ещё'), body: b };
};

/* ================= MEETINGS ================= */
SCREENS.meetings = () => {
  const t = D.today(), up = S.meetList === 'up';
  const ms = S.items.filter(i => !i.deleted && i.kind === 'meeting' && (up ? (!i.date || i.date >= t) : (i.date && i.date < t)));
  let b = `<div class="seg"><button class="${up ? 'on' : ''}" onclick="S.meetList='up';render()">Предстоящие</button><button class="${!up ? 'on' : ''}" onclick="S.meetList='past';render()">Прошедшие</button></div>`;
  b += ms.length ? listOf(sortByDate(ms, !up), { showDate: true }) : emptyBox('👥', up ? 'Предстоящих встреч нет' : 'Прошедших встреч нет');
  return { top: titleTop('Встречи', { back: "go('more')" }), body: b, dock: fab(`openEditor('meeting')`) };
};

SCREENS.meeting = () => {
  const m = getItem(S.meetingId);
  if (!m || m.deleted) return { top: titleTop('Встреча', { back: "go('meetings')" }), body: emptyBox('🤷', 'Встреча не найдена') };
  const c = catOf(m), recOn = Rec.active && Rec.active.meetingId === m.id;
  let b = `<div style="font-size:22px;font-weight:800;line-height:1.25;margin:4px 0 8px">${esc(m.title)}</div>
    <div class="kv">${ic('calendar', 16)}${esc(m.date ? D.long(m.date) : 'Без даты')}${m.start ? ' · ' + esc(timeLabel(m)) : ''}</div>
    ${m.place ? `<div class="kv">${ic('pin', 16)}${esc(m.place)}</div>` : ''}
    <div class="pills"><span class="cat" style="--t:${c.color}">${esc(c.name)}</span>${m.priority !== 'normal' ? `<span class="tag" style="--t:${PRIO[m.priority].c}">${PRIO[m.priority].l}</span>` : ''}${m.autoRecord ? `<span class="tag red">● Автозапись</span>` : ''}${m.status === 'done' ? '<span class="tag grn">Завершена</span>' : ''}</div>`;
  b += `<div class="card"><div class="h4" style="margin-top:0">Участники (${(m.participants || []).length + 1})</div>
    ${(m.participants || []).map(p => `<div class="person"><span class="pav">${esc(p.trim()[0] || '?').toUpperCase()}</span><div><b style="font-size:14px">${esc(p)}</b></div></div>`).join('')}
    <div class="person"><span class="pav" style="background:#94a3b8">${esc((S.set.name || 'Я')[0].toUpperCase())}</span><div><b style="font-size:14px">Вы</b><div class="muted" style="font-size:12px">Организатор</div></div></div></div>`;
  b += `<div class="card"><div class="h4" style="margin-top:0">Документы (${(m.files || []).length})</div>${(m.files || []).length ? attList(m.files, m.id, false) : '<div class="hint">Прикрепите договор, презентацию, реквизиты — всё будет под рукой на встрече</div>'}
    <label class="att-add" style="margin-top:8px">${ic('clip', 16)} Добавить файлы<input type="file" multiple hidden onchange="meetAddFiles('${m.id}',this)"></label></div>`;
  if (m.desc) b += `<div class="card"><div class="h4" style="margin-top:0">Заметки</div><div class="pre">${esc(m.desc)}</div></div>`;
  if (recOn) b += `<button class="btn pri full" onclick="showRec()">${ic('rec', 18)} Идёт запись — открыть</button>`;
  else if (!m.recording) b += `<button class="btn pri full" onclick="Rec.start('${m.id}')">${ic('mic', 18)} Начать запись встречи</button>`;
  if (m.recording) {
    b += `<div class="card" style="margin-top:10px"><div class="h4" style="margin-top:0">Запись · ${fmtDur(m.recording.duration || 0)} · ${mb(m.recording.size)}</div><div id="m_audio"><div class="hint">Загрузка…</div></div>
      <div class="btns" style="margin-top:8px"><button class="btn ghost" onclick="openFile('${m.id}','rec')">${ic('download', 16)} Файл</button><button class="btn ${m.transcript ? 'ghost' : 'pri'}" onclick="processMeeting('${m.id}')">${ic('ai', 16)} ${m.transcript ? 'Обработать заново' : 'Обработать AI'}</button></div>
      <button class="link" style="margin-top:10px" onclick="meetDelRec('${m.id}')">Удалить запись</button></div>`;
  }
  if (m.summary || m.transcript) {
    const tabs = [['short', 'Кратко'], ['dec', 'Решения'], ['tasks', 'Задачи' + ((m.proposed || []).length ? ' (' + m.proposed.length + ')' : '')], ['tr', 'Стенограмма']];
    b += sec('AI-итоги встречи') + `<div class="seg">${tabs.map(([k, l]) => `<button class="${S.meetTab === k ? 'on' : ''}" onclick="S.meetTab='${k}';render()">${l}</button>`).join('')}</div><div class="card">${meetTab(m)}</div>`;
    if (m.summary) b += `<button class="btn ghost full" onclick="meetToTelegram('${m.id}')">${ic('send', 16)} Отправить итоги в Telegram</button>`;
  }
  const menu = `<button class="tbtn" onclick="meetFav('${m.id}')">${ic(m.fav ? 'starf' : 'star')}</button><button class="tbtn" onclick="openShare('${m.id}')">${ic('share')}</button><button class="tbtn" onclick="openEditor('meeting',{id:'${m.id}'})">${ic('edit')}</button>`;
  return {
    top: titleTop('Встреча', { back: "go(S.prevRoute&&S.prevRoute!=='meeting'?S.prevRoute:'meetings')", extra: menu }), body: b,
    after: async () => {
      const box = $('#m_audio'); if (!box || !m.recording) return;
      const blob = await getFileBlob({ id: m.recording.fileId, cloud: m.recording.cloud });
      box.innerHTML = blob ? `<audio controls style="width:100%" src="${URL.createObjectURL(blob)}"></audio>` : '<div class="hint warn">Аудио есть только на другом устройстве</div>';
    }
  };
};
function bl(arr) { return (arr && arr.length) ? `<ul class="bul">${arr.map(x => `<li>${esc(typeof x === 'string' ? x : JSON.stringify(x))}</li>`).join('')}</ul>` : '<div class="hint">—</div>'; }
function meetTab(m) {
  const s = m.summary || {};
  if (S.meetTab === 'short') return `<div class="h4" style="margin-top:0">Кратко</div>${bl(s.short)}<div class="h4">Важная информация</div>${bl(s.important)}`;
  if (S.meetTab === 'dec') return `<div class="h4" style="margin-top:0">Решения</div>${bl(s.decisions)}<div class="h4">Обязательства</div>${bl((s.commitments || []).map(c => `${c.who ? c.who + ': ' : ''}${c.what}${c.due ? ' (срок: ' + c.due + ')' : ''}`))}<div class="h4">Сроки</div>${bl(s.deadlines)}<div class="h4">Риски и нерешённое</div>${bl(s.risks)}<div class="h4">Следующие шаги</div>${bl(s.next)}`;
  if (S.meetTab === 'tasks') {
    const p = m.proposed || [];
    if (!p.length) return '<div class="hint">AI не нашёл поручений в этой встрече</div>';
    return p.map((t, i) => `<div class="sub" style="align-items:flex-start"><span style="flex:1"><b style="font-size:14px">${esc(t.title)}</b><br><span class="muted" style="font-size:12px">${esc(t.date ? D.human(t.date) : 'без даты')}${t.start ? ', ' + t.start : ''}${t.dueTime ? ', до ' + t.dueTime : ''}${t.who ? ' · ' + esc(t.who) : ''}</span></span>
      ${t.state === 'created' ? '<span class="tag grn">создана</span>' : t.state === 'skipped' ? '<span class="tag">пропущена</span>' : `<button class="rs-btn" onclick="createProposed('${m.id}',${i})">Создать</button>`}</div>`).join('')
      + (p.some(t => t.state === 'new') ? `<button class="btn pri full" style="margin-top:10px" onclick="reviewProposed('${m.id}',true)">Создать все</button>` : '');
  }
  return m.transcript ? `<div class="pre">${esc(m.transcript)}</div>` : '<div class="hint">Стенограммы пока нет</div>';
}
async function meetAddFiles(id, inp) { const m = getItem(id); for (const f of inp.files) m.files.push(await storeFile(f)); inp.value = ''; await saveItem(m); toast('Файлы добавлены'); }
async function meetFav(id) { const m = getItem(id); m.fav = !m.fav; await saveItem(m); toast(m.fav ? 'В избранном ★' : 'Убрано из избранного'); }
async function meetDelRec(id) {
  const m = getItem(id); if (!(await confirmDel('Удалить запись встречи?'))) return;
  await DB.del('files', m.recording.fileId); m.recording = null; await saveItem(m); toast('Запись удалена');
}
async function meetToTelegram(id) {
  const m = getItem(id), s = m.summary || {};
  const L = (t, a) => a && a.length ? `\n<b>${t}</b>\n` + a.map(x => '• ' + (typeof x === 'string' ? x : `${x.who ? x.who + ': ' : ''}${x.what}${x.due ? ' (' + x.due + ')' : ''}`)).join('\n') : '';
  const tx = `📋 <b>Итоги встречи: ${m.title}</b>\n${m.date ? D.human(m.date) : ''} ${timeLabel(m)}` + L('Кратко', s.short) + L('Решения', s.decisions) + L('Обязательства', s.commitments) + L('Следующие шаги', s.next);
  try { await Cloud.sendTelegram(tx.replace(/&(?!lt;|gt;|amp;)/g, '&amp;')); toast('Отправлено в Telegram ✓'); } catch (e) { toast(e.message, 4000); }
}

/* ================= DOCS ================= */
function allFiles() {
  const out = [];
  live().forEach(it => {
    (it.files || []).forEach(f => out.push({ f, it }));
    if (it.recording) { const r = findFile(it.id, 'rec').f; out.push({ f: Object.assign({ added: it.recording.created }, r), it }); }
  });
  return out.sort((a, b) => (b.f.added || '').localeCompare(a.f.added || ''));
}
function docsListHTML() {
  const q = (S.docQ || '').toLowerCase(), fl = S.docFilter;
  const xs = allFiles().filter(({ f, it }) => (fl === 'all' || fileKind(f)[2] === fl) && (!q || (f.name + ' ' + it.title).toLowerCase().includes(q)));
  if (!xs.length) return emptyBox('📁', 'Документов нет. Прикрепляйте их к задачам и встречам или загрузите здесь');
  return `<div class="list" style="padding:0 12px">${xs.map(({ f, it }) => `<div class="frow" onclick="openFile('${it.id}','${f.isRec ? 'rec' : f.id}')">${ficon(f)}<div class="fm"><b>${esc(f.name)}</b><span>${mb(f.size)} · ${esc(D.human((f.added || it.updated || '').slice(0, 10) || D.today()))} · ${esc(it.title.slice(0, 40))}</span></div>${f.fav ? `<span style="color:var(--ylw)">${ic('starf', 16)}</span>` : ''}</div>`).join('')}</div>`;
}
SCREENS.docs = () => {
  const fl = [['all', 'Все'], ['pdf', 'PDF'], ['docx', 'DOCX'], ['xlsx', 'XLSX'], ['img', 'Изображения'], ['audio', 'Аудио'], ['other', 'Другое']];
  const b = `<div class="search">${ic('search', 18)}<input placeholder="Поиск документов…" value="${esc(S.docQ)}" oninput="S.docQ=this.value;$('#dl').innerHTML=docsListHTML()"></div>
    <div class="chips">${fl.map(([k, l]) => `<button class="chip ${S.docFilter === k ? 'on' : ''}" onclick="S.docFilter='${k}';render()">${l}</button>`).join('')}</div><div id="dl">${docsListHTML()}</div>`;
  return { top: titleTop('Документы', { back: "go('more')" }), body: b, dock: `<div class="fab-wrap"><label class="fab" aria-label="Загрузить">${ic('plus', 26)}<input type="file" multiple hidden onchange="uploadDocs(this)"></label></div>` };
};

/* ================= FAVORITES ================= */
SCREENS.fav = () => {
  const its = live().filter(i => i.fav);
  const fs = allFiles().filter(x => x.f.fav);
  let b = '';
  const tasks = its.filter(i => i.kind !== 'note'), notes = its.filter(i => i.kind === 'note');
  if (tasks.length) b += sec('Задачи и встречи') + listOf(sortByDate(tasks), { showDate: true });
  if (notes.length) b += sec('Заметки') + `<div class="list">${notes.map(n => `<div class="ncard" data-open="${n.id}"><div class="nicon" style="--t:#f59e0b">${ic('note')}</div><div class="nmain"><b>${esc(n.title)}</b><p>${esc((n.desc || '').slice(0, 150))}</p></div></div>`).join('')}</div>`;
  if (fs.length) b += sec('Документы и записи') + `<div class="list" style="padding:0 12px">${fs.map(({ f, it }) => `<div class="frow" onclick="openFile('${it.id}','${f.isRec ? 'rec' : f.id}')">${ficon(f)}<div class="fm"><b>${esc(f.name)}</b><span>${esc(it.title)}</span></div></div>`).join('')}</div>`;
  if (!b) b = emptyBox('⭐', 'Отмечайте звёздочкой важные задачи, встречи, заметки, документы и записи');
  return { top: titleTop('Избранное', { back: "go('more')" }), body: b };
};

/* ================= SEARCH ================= */
function searchHTML(q) {
  q = (q || '').trim().toLowerCase();
  if (q.length < 2) return '<div class="hint">Ищет по задачам, встречам, заметкам, документам, участникам и стенограммам. Для вопросов своими словами нажмите «Спросить MARKUS-A».</div>';
  const words = q.split(/\s+/).filter(Boolean).map(w => w.length > 5 ? w.slice(0, w.length - 2) : w);
  const hay = i => [i.title, i.desc, (i.participants || []).join(' '), i.place, i.transcript, i.summary ? JSON.stringify(i.summary) : '', (i.files || []).map(f => f.name).join(' ')].join(' ').toLowerCase();
  const its = live().filter(i => { const h = hay(i); return words.every(w => h.includes(w)); });
  const fs = allFiles().filter(({ f }) => words.every(w => f.name.toLowerCase().includes(w)));
  let b = '';
  const g = (t, a) => { if (a.length) b += sec(t, a.length) + listOf(sortByDate(a, true).slice(0, 30), { showDate: true }); };
  g('Встречи', its.filter(i => i.kind === 'meeting'));
  g('Задачи', its.filter(i => i.kind === 'task'));
  const ns = its.filter(i => i.kind === 'note');
  if (ns.length) b += sec('Заметки', ns.length) + `<div class="list">${ns.slice(0, 30).map(n => `<div class="ncard" data-open="${n.id}"><div class="nicon" style="--t:#f59e0b">${ic('note')}</div><div class="nmain"><b>${esc(n.title)}</b><p>${esc((n.desc || '').slice(0, 150))}</p></div></div>`).join('')}</div>`;
  if (fs.length) b += sec('Документы', fs.length) + `<div class="list" style="padding:0 12px">${fs.slice(0, 30).map(({ f, it }) => `<div class="frow" onclick="openFile('${it.id}','${f.isRec ? 'rec' : f.id}')">${ficon(f)}<div class="fm"><b>${esc(f.name)}</b><span>${esc(it.title)}</span></div></div>`).join('')}</div>`;
  return b || '<div class="hint">Точных совпадений нет — попробуйте «Спросить MARKUS-A».</div>';
}
SCREENS.search = () => {
  const b = `<div class="search">${ic('search', 18)}<input id="sq" placeholder="Например: Алишер, договор, аренда…" value="${esc(S.search || '')}" oninput="S.search=this.value;$('#sr').innerHTML=searchHTML(this.value)"></div>
    <button class="btn pri full" onclick="askMarkus()">${ic('ai', 18)} Спросить MARKUS-A</button>
    <div id="sa"></div><div id="sr">${searchHTML(S.search)}</div>`;
  return { top: titleTop('Поиск', { back: "go('more')" }), body: b, after: () => { const i = $('#sq'); if (i && !S.search) i.focus(); } };
};
async function askMarkus() {
  let q = ($('#sq') && $('#sq').value.trim()) || '';
  if (q.length < 3) q = await askChoice('Спросить MARKUS-A', 'Например: «Что мы решили с Алишером на прошлой встрече?», «Какие документы нужны на сегодняшнюю встречу?»', [], { type: 'text', label: 'Спросить' });
  if (!q) return;
  const box = $('#sa'); if (!box) return;
  box.innerHTML = `<div class="ai-box">MARKUS-A думает…</div>`;
  try { const a = await AI.askData(q); box.innerHTML = `<div class="ai-box"><b>${esc(q)}</b>\n\n${esc(a)}</div>`; speak(a.slice(0, 300)); }
  catch (e) { box.innerHTML = `<div class="ai-box">${esc(e.message)}</div>`; }
}

/* ================= SETTINGS ================= */
function setVal(k, v) { S.set[k] = v; saveSettings(); }
SCREENS.settings = () => {
  const st = S.set, cloudOk = Cloud.configured(), u = Cloud.user, p = Cloud.profile;
  let b = `<div class="set-card"><label class="lbl">Как к вам обращаться</label><input class="inp" value="${esc(st.name)}" placeholder="Имя" onchange="setVal('name',this.value.trim());Cloud.user&&Cloud.saveProfile({name:this.value.trim()})">
    <label class="lbl">Тема</label><div class="seg"><button class="${st.theme === 'light' ? 'on' : ''}" onclick="setVal('theme','light');applyTheme();render()">Светлая</button><button class="${st.theme === 'dark' ? 'on' : ''}" onclick="setVal('theme','dark');applyTheme();render()">Тёмная</button></div></div>`;
  b += sec('Расписание') + `<div class="set-card"><div class="g2"><div><label class="lbl">Рабочий день с</label><input class="inp" type="time" value="${st.workStart}" onchange="setVal('workStart',this.value)"></div><div><label class="lbl">до</label><input class="inp" type="time" value="${st.workEnd}" onchange="setVal('workEnd',this.value)"></div></div>
    <div class="hint">В этих часах MARKUS-A ищет свободные окна.</div>
    <label class="lbl">Длительность задачи по умолчанию</label><select class="inp" onchange="setVal('defaultDur',+this.value)">${[15, 30, 45, 60, 90, 120].map(m => `<option value="${m}" ${st.defaultDur === m ? 'selected' : ''}>${durLabel(m)}</option>`).join('')}</select>
    <label class="lbl">Напоминания по умолчанию</label><div class="chips wrapchips">${REMIND_OPTS.map(([m, l]) => `<button class="chip ${st.defaultRemind.includes(m) ? 'on' : ''}" onclick="toggleDefRem(${m})">${l}</button>`).join('')}</div>
    <div class="sw-row"><div><b>Уведомления на этом устройстве</b><span>${'Notification' in window ? (Notification.permission === 'granted' ? 'Разрешены' : Notification.permission === 'denied' ? 'Запрещены — включите в настройках браузера' : 'Не включены') : 'Не поддерживаются'}</span></div>${'Notification' in window && Notification.permission === 'default' ? '<button class="chip-btn" onclick="askNotif()">Включить</button>' : ''}</div></div>`;
  b += sec('AI-помощник') + `<div class="set-card"><label class="lbl">Ключ Google Gemini (бесплатный)</label><input class="inp" type="password" value="${esc(st.aiKey)}" placeholder="AIza…" onchange="setVal('aiKey',this.value.trim());Cloud.user&&Cloud.saveProfile({ai_key:this.value.trim()||null});render()">
    <div class="hint">Получить: aistudio.google.com → Get API key. ${st.aiKey ? '<span class="ok">Ключ сохранён</span>' : ''}</div>
    <label class="lbl">Модель</label><input class="inp" value="${esc(st.aiModel)}" onchange="setVal('aiModel',this.value.trim()||'gemini-2.5-flash')">
    <div class="btns"><button class="btn ghost" onclick="testAI()">Проверить AI</button></div>
    <label class="lbl">Задачи из встреч</label><div class="seg"><button class="${st.autoTasks === 'confirm' ? 'on' : ''}" onclick="setVal('autoTasks','confirm');render()">С подтверждением</button><button class="${st.autoTasks === 'auto' ? 'on' : ''}" onclick="setVal('autoTasks','auto');render()">Автоматически</button></div>
    <div class="sw-row"><div><b>Отвечать голосом</b><span>MARKUS-A озвучивает ответы на голосовые команды</span></div><button class="sw ${st.voiceReply ? 'on' : ''}" onclick="setVal('voiceReply',!S.set.voiceReply);render()"></button></div></div>`;
  b += sec('Облако и синхронизация') + '<div class="set-card">';
  if (!cloudOk) b += `<div class="hint" style="margin-top:12px">Облако не настроено. Впишите адрес и ключ Supabase в файл <b>config.js</b> на GitHub (см. ИНСТРУКЦИЯ, шаг 3) — или сюда:</div>
    <label class="lbl">Supabase URL</label><input class="inp" id="s_url" placeholder="https://xxxx.supabase.co" value="${esc(st.sbUrl)}">
    <label class="lbl">Supabase key</label><input class="inp" id="s_key" placeholder="sb_publishable_…" value="${esc(st.sbKey)}">
    <div class="btns"><button class="btn pri" onclick="setVal('sbUrl',$('#s_url').value.trim());setVal('sbKey',$('#s_key').value.trim());Cloud.init().then(render)">Подключить</button></div>`;
  else if (!u) b += `<div class="hint" style="margin-top:12px">Войдите, чтобы данные синхронизировались между телефоном и компьютером, работали Telegram-бот и ссылки «Поделиться».</div>
    <label class="lbl">Email</label><input class="inp" id="s_em" type="email" autocomplete="email">
    <label class="lbl">Пароль</label><input class="inp" id="s_pw" type="password" autocomplete="current-password">
    <div class="btns"><button class="btn pri" onclick="doAuth('in')">Войти</button><button class="btn ghost" onclick="doAuth('up')">Регистрация</button></div>`;
  else b += `<div class="sw-row"><div><b>${esc(u.email)}</b><span>${Cloud.lastError ? '<span class="warn">Ошибка: ' + esc(Cloud.lastError) + '</span>' : Cloud.lastSync ? 'Синхронизировано ' + Cloud.lastSync.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'Подключено'}</span></div></div>
    <div class="btns"><button class="btn ghost" onclick="Cloud.sync(true).then(render)">${ic('cloud', 16)} Синхронизировать</button><button class="btn ghost" onclick="Cloud.signOut().then(render)">Выйти</button></div>`;
  b += '</div>';
  b += sec('Telegram') + '<div class="set-card">';
  if (!u) b += '<div class="hint" style="margin-top:12px">Сначала войдите в облако. Бот присылает напоминания, даже когда приложение закрыто, и принимает команды текстом и голосом.</div>';
  else if (p && p.tg_chat_id) b += `<div class="sw-row"><div><b><span class="ok">Подключён</span></b><span>Напоминания и итоги приходят в Telegram</span></div></div><div class="btns"><button class="btn ghost" onclick="Cloud.sendTelegram('✅ Проверка связи MARKUS-A').then(()=>toast('Отправлено')).catch(e=>toast(e.message,4000))">Тест</button><button class="btn ghost" onclick="Cloud.unlinkTelegram().then(render)">Отключить</button></div>`;
  else b += `<div class="hint" style="margin-top:12px">Бот будет присылать напоминания и итоги встреч, а вы сможете писать ему: «Завтра в 10 встреча с Алишером на час».</div><div class="btns"><button class="btn pri" onclick="doLinkTg()">Подключить Telegram</button><button class="btn ghost" onclick="Cloud.loadProfile().then(render)">Проверить</button></div>`;
  b += '</div>';
  b += sec('Данные') + `<div class="set-card"><div class="hint" style="margin-top:12px">Резервная копия задач, встреч и заметок (без файлов).</div><div class="btns"><button class="btn ghost" onclick="exportBackup()">${ic('download', 16)} Скачать копию</button><label class="btn ghost">Загрузить копию<input type="file" accept=".json,application/json" hidden onchange="importBackup(this.files[0])"></label></div>
    ${window._installPrompt ? `<div class="btns"><button class="btn pri" onclick="installApp()">Установить приложение</button></div>` : ''}</div>`;
  b += `<div class="hint" style="text-align:center;margin:20px 0">MARKUS-A · версия 1.0</div>`;
  return { top: titleTop('Настройки', { back: "go('more')" }), body: b };
};
function toggleDefRem(m) { const a = S.set.defaultRemind; const i = a.indexOf(m); if (i >= 0) a.splice(i, 1); else a.push(m); saveSettings(); render(); }
async function testAI() { try { toast('Проверяю…'); const r = await AI.call([{ text: 'Ответь одним словом по-русски: работает' }]); toast('AI отвечает: ' + r.slice(0, 40) + ' ✓', 3000); } catch (e) { toast(e.message, 5000); } }
async function doAuth(mode) {
  const em = $('#s_em').value.trim(), pw = $('#s_pw').value;
  if (!em || pw.length < 6) return toast('Введите email и пароль (от 6 символов)');
  try {
    if (mode === 'in') { await Cloud.signIn(em, pw); toast('Вход выполнен ✓'); }
    else { const r = await Cloud.signUp(em, pw); toast(r === 'confirm' ? 'Проверьте почту и подтвердите email, затем войдите' : 'Аккаунт создан ✓', 5000); }
  } catch (e) { toast(e.message, 4000); }
  render();
}
async function doLinkTg() {
  if (!cfg.bot) return toast('Впишите имя бота в config.js (TELEGRAM_BOT)', 4000);
  try {
    const code = await Cloud.linkTelegram();
    const url = `https://t.me/${cfg.bot}?start=${code}`;
    window.open(url, '_blank');
    await dialog({ title: 'Подключение Telegram', text: `Откроется бот <b>@${esc(cfg.bot)}</b> — нажмите «Запустить» (Start). Если не открылся, отправьте боту:<br><b>/start ${code}</b><br><br>Затем вернитесь и нажмите «Проверить».`, buttons: [{ l: 'Проверить', v: 1, p: 1 }] });
    await Cloud.loadProfile(); render();
    toast(Cloud.profile && Cloud.profile.tg_chat_id ? 'Telegram подключён ✓' : 'Пока не подключён — отправьте боту /start ' + code, 5000);
  } catch (e) { toast(e.message, 4000); }
}
function exportBackup() {
  const data = { app: 'MARKUS-A', v: 1, exported: new Date().toISOString(), items: S.items.map(i => { const c = Object.assign({}, i); delete c._dirty; return c; }) };
  downloadBlob(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), 'markus-a-backup-' + D.today() + '.json');
}
async function importBackup(file) {
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!Array.isArray(d.items)) throw new Error();
    let n = 0;
    for (const it of d.items) { const loc = getItem(it.id); if (!loc || (it.updated || '') > (loc.updated || '')) { await saveItem(it, { render: false }); n++; } }
    toast('Загружено: ' + n); render();
  } catch (e) { toast('Файл не подходит'); }
}
async function installApp() { const p = window._installPrompt; if (!p) return; p.prompt(); await p.userChoice; window._installPrompt = null; render(); }
