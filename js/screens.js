'use strict';
function brandTop() {
  return `<div class="brand">${logo(28)}<span>MARKUS-A</span></div>
    <button class="tbtn" onclick="go('search')" aria-label="${esc(t('Поиск'))}">${ic('search')}</button>
    <button class="tbtn" onclick="go('settings')" aria-label="${esc(t('Настройки'))}">${ic('settings')}</button>`;
}
function titleTop(title, o = {}) { return `<button class="tbtn" onclick="goBack()" aria-label="${esc(t('Назад'))}">${ic('left')}</button><h1>${esc(title)}</h1>${o.extra || ''}`; }

const SCREENS = {};

/* ================= HOME ================= */
function sortAgenda(entries, mode) {
  const tm = e => e.subs ? (e.subs[0].time || '99:98') : e.cont ? '99:97' : (e.it.start || '99:99');
  const doneRank = e => (e.it.status === 'done' || e.it.status === 'cancelled') ? 1 : 0;
  return entries.slice().sort((a, b) => doneRank(a) - doneRank(b) || (mode === 'prio' ? (prioRank(b.it) - prioRank(a.it)) || (isOverdue(b.it) - isOverdue(a.it)) : 0) || tm(a).localeCompare(tm(b)) || (prioRank(b.it) - prioRank(a.it)));
}
SCREENS.home = () => {
  const td = D.today(), h = new Date().getHours();
  const greet = h < 5 ? t('Доброй ночи') : h < 12 ? t('Доброе утро') : h < 18 ? t('Добрый день') : t('Добрый вечер');
  const name = S.set.name ? ', ' + esc(S.set.name.trim().split(' ')[0]) : '';
  const cur = currentItem(), nx = nextToday();
  const ag = sortAgenda(dayAgenda(td).filter(e => e.it.status !== 'cancelled'), S.set.homeSort);
  const od = overdueList().filter(i => i.date !== td), up = upcoming(14, 5), imp = importantList();
  let b = `<div class="hello"><h2>${greet}${name}!</h2><p>${esc(D.long(td))}</p></div>`;
  if ('Notification' in window && Notification.permission === 'default') b += `<div class="banner" onclick="askNotif()">${ic('bell')}<div><b>${t('Включите уведомления')}</b><span>${t('Чтобы MARKUS-A напоминал о делах')}</span></div>${ic('right')}</div>`;
  if (!AI.ready()) b += `<div class="banner" onclick="go('settings')">${ic('ai')}<div><b>${t('Подключите AI (бесплатно)')}</b><span>${t('Для голосовых команд и анализа встреч')}</span></div>${ic('right')}</div>`;
  // meeting with auto-record within the next hour → keep the app open (a website cannot switch the microphone on by itself otherwise)
  const soon = S.items.filter(i => !i.deleted && i.kind === 'meeting' && i.autoRecord && !i.recording && i.date === td && i.start && isOpen(i))
    .map(i => ({ i, at: D.dt(td, i.start).getTime() - (+S.set.recPre || 0) * 60000 })).filter(x => x.at - Date.now() < 60 * 60000 && x.at > Date.now() - 60000).sort((a, b) => a.at - b.at)[0];
  if (soon && !Rec.active) b += `<div class="banner" style="color:var(--acc)" onclick="keepAwakeForRec()">${ic('mic')}<div><b>${t('Автозапись в {t}: {x}', { t: new Date(soon.at).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }), x: esc(soon.i.title) })}</b><span>${awakeRec ? t('Экран не погаснет — запись начнётся сама.') : t('Оставьте MARKUS-A открытым. Нажмите, чтобы экран не гас до встречи.')}</span></div></div>`;
  S.items.filter(i => !i.deleted && i.kind === 'meeting' && i.needsTime && !i.start && i.date === td && isOpen(i)).forEach(i => { b += `<div class="banner" style="color:var(--ora)" onclick="askMeetingTime('${i.id}')">${ic('clock')}<div><b>${t('Сегодня встреча без времени')}: ${esc(i.title)}</b><span>${t('Нажмите, чтобы указать время и включить автозапись')}</span></div>${ic('right')}</div>`; });
  const nowCard = (label, it) => `<div class="now" data-open="${it.id}"><div class="now-b"><div class="now-l">${label}</div><div class="now-time">${esc(timeLabel(it))}</div><div class="now-t">${esc(it.title)}</div><div class="now-s">${esc(catName(catOf(it)))}${it.place ? ' · ' + esc(it.place) : ''}</div></div>${ic('right')}</div>`;
  if (cur) b += nowCard(t('Сейчас'), cur);
  else if (nx) b += nowCard(t('Далее сегодня'), nx);
  else b += `<div class="now" onclick="openVoice()"><div class="now-b"><div class="now-l">${t('Сейчас')}</div><div class="now-t">${t('Свободное время')}</div><div class="now-s">${ag.some(e => isOpen(e.it)) ? t('Остались задачи без времени') : t('Скажите MARKUS-A, что запланировать')}</div></div>${ic('mic')}</div>`;
  if (od.length) b += sec(t('Просрочено'), od.length) + `<div class="list">${od.slice(0, 5).map(i => row(i, { showDate: true, resched: true })).join('')}</div>`;
  const lim = Math.max(3, +S.set.homeLimit || 6), shown = S.homeAll ? ag : ag.slice(0, lim);
  const openCnt = ag.filter(e => isOpen(e.it)).length;
  b += sec(t('Сегодня'), openCnt + ' ' + tn(openCnt, 'задача|задачи|задач'), `<button class="sortbtn" onclick="S.set.homeSort=S.set.homeSort==='time'?'prio':'time';saveSettings();render()">${ic('sort', 14)} ${S.set.homeSort === 'time' ? t('по времени') : t('по важности')}</button>`);
  b += ag.length ? `<div class="list">${agendaRows(shown)}</div>` + (ag.length > lim ? `<button class="more-btn" onclick="S.homeAll=!S.homeAll;render()">${S.homeAll ? ic('up', 16) + ' ' + t('Свернуть') : ic('down', 16) + ' ' + t('Показать все ({n})', { n: ag.length })}</button>` : '') : emptyBox('☀️', t('На сегодня ничего не запланировано'));
  if (up.length) b += sec(t('Далее'), '', `<button class="link" onclick="S.calView='list';S.showPast=false;go('calendar')">${t('Все')}</button>`) + listOf(up, { showDate: true });
  if (imp.length) b += sec(t('Важное')) + listOf(imp, { showDate: true });
  const dock = `<div class="dock">
    <button class="dk" onclick="openEditor('task')">${ic('check', 22)}<span>${t('Задача')}</span></button>
    <button class="dk" onclick="openEditor('meeting')">${ic('users', 22)}<span>${t('Встреча')}</span></button>
    <button class="dk-mic" onclick="openVoice()"><i>${ic('mic', 28)}</i>${t('Сказать MARKUS-A')}</button>
    <button class="dk" onclick="openNoteEditor()">${ic('note', 22)}<span>${t('Заметка')}</span></button>
    <button class="dk dk-rec" onclick="quickRecord()">${ic('rec', 22)}<span>${t('Запись')}</span></button></div>`;
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
  if (v === 'month') return D.monthYear(s);
  const a = v === 'week' ? D.weekStart(s) : s, e = D.add(a, v === 'week' ? 6 : 2);
  return D.short(a) + ' – ' + D.short(e);
}
function hasOnDay(d) { return dayAgenda(d).some(e => isOpen(e.it)); }
function weekStrip() {
  const ws = D.weekStart(S.selDate), td = D.today();
  return `<div class="wstrip">${[0, 1, 2, 3, 4, 5, 6].map(k => {
    const d = D.add(ws, k);
    return `<button class="wd ${d === td ? 'today' : ''} ${d === S.selDate ? 'sel' : ''}" onclick="S.selDate='${d}';render()">${D.dow(D.parse(d).getDay())}<b>${D.parse(d).getDate()}</b><i class="${hasOnDay(d) ? '' : 'no'}"></i></button>`;
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
  const HH = 52, td = D.today();
  const per = dates.map(d => itemsOn(d).filter(i => i.status !== 'cancelled' && (S.calDone || i.status !== 'done')));
  const subsPer = dates.map(d => dayAgenda(d).filter(e => e.subs));
  let h0 = 7, h1 = 22;
  per.flat().forEach(i => { if (i.start) { h0 = Math.min(h0, Math.floor(D.toMin(i.start) / 60)); h1 = Math.max(h1, Math.ceil(D.toMin(i.end || i.start) / 60) + (i.end ? 0 : 1)); } });
  h1 = Math.min(24, h1);
  const hours = []; for (let x = h0; x < h1; x++) hours.push(x);
  const multi = dates.length > 1;
  const head = multi ? `<div class="tg-head">${dates.map(d => `<button class="${d === td ? 'today' : ''}" onclick="S.selDate='${d}';S.calView='day';render()">${D.dow(D.parse(d).getDay())} ${D.parse(d).getDate()}</button>`).join('')}</div>` : '';
  const ad = dates.map((d, k) => per[k].filter(i => !i.start).map(i => `<div class="adb" style="--c:${catOf(i).color}" data-open="${i.id}">${i.status === 'done' ? '✓ ' : ''}${esc(i.title)}</div>`).join('') + subsPer[k].map(e => e.subs.map(s => `<div class="adb sub" style="--c:${catOf(e.it).color}" data-open="${e.it.id}">↳ ${esc(s.text)}</div>`).join('')).join(''));
  const adRow = ad.some(Boolean) ? `<div class="tg-allday">${ad.map(x => `<div>${x}</div>`).join('')}</div>` : '';
  const cols = dates.map((d, k) => {
    const blocks = layoutDay(per[k]).map(x => {
      const top = (x.s - h0 * 60) / 60 * HH, hgt = Math.max(22, (x.e - x.s) / 60 * HH - 2), w = 100 / x.n, p = progress(x.i);
      return `<div class="blk ${x.i.status === 'done' ? 'done' : ''}" style="--c:${kindColor(x.i)};top:${top}px;height:${hgt}px;left:calc(${x.lane * w}% + 2px);width:calc(${w}% - 4px)" data-open="${x.i.id}"><b>${x.i.kind === 'meeting' ? '👥 ' : ''}${esc(x.i.title)}</b>${hgt > 34 ? `<span>${esc(timeLabel(x.i))}${p > 0 && (x.i.subtasks || []).length ? ' · ' + p + '%' : ''}</span>` : `<span class="blk-t">${esc(x.i.start)}</span>`}</div>`;
    }).join('');
    const nm = D.nowMin();
    const line = d === td && nm >= h0 * 60 && nm < h1 * 60 ? `<div class="now-line" style="top:${(nm - h0 * 60) / 60 * HH}px"></div>` : '';
    return `<div class="tg-col" style="height:${hours.length * HH}px" onclick="gridClick(event,'${d}',${h0})">${blocks}${line}</div>`;
  }).join('');
  return `<div class="tg">${head}${adRow}<div class="tg-body"><div class="tg-hours">${hours.map(x => `<div>${pad(x)}:00</div>`).join('')}</div>${cols}</div></div>
    <div class="hint" style="text-align:center">${t('Нажмите на пустое место в сетке — создам задачу на это время')}</div>`;
}
function gridClick(e, date, h0) {
  if (e.target.closest('.blk')) return;
  const r = e.currentTarget.getBoundingClientRect();
  const m = Math.floor(((e.clientY - r.top) / 52 * 60 + h0 * 60) / 30) * 30;
  const start = D.fromMin(m);
  openEditor('task', { date, start, end: D.addMin(start, S.set.defaultDur) });
}
function monthGrid() {
  const sel = D.parse(S.selDate), td = D.today();
  const first = D.fmt(new Date(sel.getFullYear(), sel.getMonth(), 1));
  const start = D.weekStart(first);
  let cells = '';
  for (let k = 0; k < 42; k++) {
    const d = D.add(start, k), dd = D.parse(d);
    if (k === 35 && dd.getMonth() !== sel.getMonth()) break;
    const ag = sortAgenda(dayAgenda(d).filter(e => e.it.status !== 'cancelled' && !e.cont), 'time');
    cells += `<div class="m-cell ${dd.getMonth() !== sel.getMonth() ? 'out' : ''} ${d === td ? 'today' : ''}" onclick="S.selDate='${d}';S.calView='day';S.scrollCal=true;render()">
      <div class="m-num">${dd.getDate()}</div>${ag.slice(0, 3).map(e => `<div class="m-ev" style="--c:${kindColor(e.it)}">${e.subs ? '↳ ' + esc(e.subs[0].text) : esc(e.it.title)}</div>`).join('')}${ag.length > 3 ? `<div class="m-more">+${ag.length - 3}</div>` : ''}</div>`;
  }
  return `<div class="month"><div class="m-dow">${[1, 2, 3, 4, 5, 6, 0].map(x => `<span>${D.dow(x)}</span>`).join('')}</div><div class="m-grid">${cells}</div></div>`;
}
function listView() {
  const td = D.today(), past = S.showPast;
  let b = `<div class="seg"><button class="${!past ? 'on' : ''}" onclick="S.showPast=false;render()">${t('Будущее')}</button><button class="${past ? 'on' : ''}" onclick="S.showPast=true;render()">${t('Прошлое')}</button></div>`;
  let any = false;
  for (let k = 0; k < 60; k++) {
    const d = past ? D.add(td, -1 - k) : D.add(td, k);
    const ag = sortAgenda(dayAgenda(d).filter(e => !e.cont), 'time');
    if (!ag.length) continue;
    any = true;
    b += sec(D.human(d), D.dowFull(D.parse(d).getDay())) + `<div class="list">${agendaRows(ag)}</div>`;
  }
  if (!any) b += emptyBox(past ? '🗂' : '🗓', past ? t('Прошедших дел нет') : t('Будущих дел нет'));
  if (!past) { const nd = S.items.filter(i => isOpen(i) && !i.date); if (nd.length) b += sec(t('Без даты'), nd.length) + listOf(nd); }
  return b;
}
SCREENS.calendar = () => {
  if (!S.selDate) S.selDate = D.today();
  const v = S.calView;
  const views = [['day', 'День'], ['3day', '3 дня'], ['week', 'Неделя'], ['month', 'Месяц'], ['list', 'Список']];
  let b = `<div class="seg">${views.map(([k, l]) => `<button class="${v === k ? 'on' : ''}" onclick="S.calView='${k}';S.scrollCal=true;render()">${t(l)}</button>`).join('')}</div>`;
  if (v !== 'list') b += `<div class="cal-nav"><button class="tbtn" onclick="calShift(-1)">${ic('left')}</button><b>${esc(calTitle())}</b><button class="tbtn" onclick="calShift(1)">${ic('right')}</button></div>`;
  if (v === 'day') b += weekStrip() + timeGrid([S.selDate]);
  else if (v === '3day') b += timeGrid([S.selDate, D.add(S.selDate, 1), D.add(S.selDate, 2)]);
  else if (v === 'week') { const ws = D.weekStart(S.selDate); b += timeGrid([0, 1, 2, 3, 4, 5, 6].map(k => D.add(ws, k))); }
  else if (v === 'month') b += monthGrid();
  else b += listView();
  return {
    top: titleTop(t('Календарь'), { extra: `<button class="chip-btn" onclick="S.selDate=D.today();S.scrollCal=true;render()">${t('Сегодня')}</button><button class="tbtn" onclick="openPdfExport('week')" aria-label="PDF">${ic('pdf')}</button><button class="tbtn" onclick="openSlotFinder()" aria-label="${esc(t('Найти свободное окно'))}">${ic('clock')}</button>` }),
    body: b,
    dock: fab(`openEditor('task',{date:S.selDate})`, `<button class="fab sec2" onclick="openVoice()" aria-label="${esc(t('Голос'))}">${ic('mic', 24)}</button>`),
    after: () => {
      if (!S.scrollCal) return; S.scrollCal = false;
      if (!['day', '3day', 'week'].includes(v)) return;
      const target = $('.now-line') || $('.blk');
      if (target) window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - 180) });
    }
  };
};

/* ================= TASKS ================= */
const TFILTERS = [['today', 'Сегодня'], ['tomorrow', 'Завтра'], ['week', '7 дней'], ['overdue', 'Просрочено'], ['nodate', 'Без даты'], ['active', 'Все активные'], ['done', 'Выполнено'], ['cancelled', 'Отменённые']];
function taskFilter(k) {
  const td = D.today(), w = D.add(td, 7);
  const all = S.items.filter(i => !i.deleted && isTaskKind(i));
  switch (k) {
    case 'today': return dayAgenda(td).filter(e => e.it.status !== 'cancelled');
    case 'tomorrow': return dayAgenda(D.add(td, 1)).filter(e => e.it.status !== 'cancelled');
    case 'week': return all.filter(i => isOpen(i) && i.date && i.date <= w && spanEnd(i) >= td);
    case 'overdue': return all.filter(isOverdue);
    case 'nodate': return all.filter(i => isOpen(i) && !i.date);
    case 'active': return all.filter(isOpen);
    case 'done': return all.filter(i => i.status === 'done');
    case 'cancelled': return all.filter(i => i.status === 'cancelled');
  }
  return [];
}
SCREENS.tasks = () => {
  const k = S.taskFilter;
  let b = `<div class="chips">${TFILTERS.map(([f, l]) => { const n = taskFilter(f).length; return `<button class="chip ${k === f ? 'on' : ''}" onclick="S.taskFilter='${f}';render()">${t(l)}${n && !['done', 'cancelled'].includes(f) ? `<small>${n}</small>` : ''}</button>`; }).join('')}</div>`;
  const items = taskFilter(k);
  if (!items.length) b += emptyBox(k === 'overdue' ? '🎉' : '✅', k === 'overdue' ? t('Просроченных задач нет') : t('Здесь пусто'));
  else if (k === 'today' || k === 'tomorrow') b += `<div class="list">${agendaRows(sortAgenda(items, S.set.homeSort))}</div>`;
  else if (k === 'nodate') b += listOf(sortItems(items));
  else {
    const groups = {}; sortByDate(items, k === 'done' || k === 'cancelled').slice(0, 300).forEach(i => { const g = i.date || 'none'; (groups[g] = groups[g] || []).push(i); });
    Object.keys(groups).forEach(g => { b += sec(g === 'none' ? t('Без даты') : D.human(g), g === 'none' ? '' : D.dowFull(D.parse(g).getDay())) + listOf(groups[g], { resched: k === 'overdue' }); });
  }
  return { top: titleTop(t('Задачи'), { extra: `<button class="tbtn" onclick="openPdfExport('${k === 'tomorrow' ? 'tomorrow' : k === 'week' ? 'week' : 'today'}')" aria-label="PDF">${ic('pdf')}</button><button class="tbtn" onclick="openSlotFinder()" aria-label="${esc(t('Найти окно'))}">${ic('clock')}</button>` }), body: b, dock: fab(`openEditor('task')`, `<button class="fab sec2" onclick="openVoice()" aria-label="${esc(t('Голос'))}">${ic('mic', 24)}</button>`) };
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
  if (!ns.length) return emptyBox('📝', S.noteQ ? t('Ничего не найдено') : t('Заметок пока нет. Нажмите + или микрофон'));
  return `<div class="list">${ns.map(n => { const c = NOTE_COLORS[n.noteCat] || '#64748b'; return `<div class="ncard" data-open="${n.id}"><div class="nicon" style="--t:${c}">${ic(n.noteCat === 'Документы' ? 'file' : 'note')}</div><div class="nmain"><b>${esc(n.title || t('Без названия'))}</b><span>${esc(D.human((n.updated || '').slice(0, 10) || D.today()))} · ${esc(noteCatName(n.noteCat || ''))}${(n.files || []).length ? ' · 📎 ' + n.files.length : ''}</span>${n.desc ? `<p>${esc(n.desc.slice(0, 200))}</p>` : ''}</div>${n.fav ? `<span style="color:var(--ylw)">${ic('starf', 16)}</span>` : ''}</div>`; }).join('')}</div>`;
}
SCREENS.notes = () => {
  let b = `<div class="search">${ic('search', 18)}<input placeholder="${esc(t('Поиск заметок…'))}" value="${esc(S.noteQ)}" oninput="S.noteQ=this.value;$('#nl').innerHTML=notesListHTML()"></div>`;
  b += `<div class="chips"><button class="chip ${S.noteCat === 'all' ? 'on' : ''}" onclick="S.noteCat='all';render()">${t('Все')}</button>${S.set.noteCats.map(c => `<button class="chip ${S.noteCat === c ? 'on' : ''}" onclick="S.noteCat='${esc(c)}';render()">${esc(noteCatName(c))}</button>`).join('')}</div>`;
  b += `<div id="nl">${notesListHTML()}</div>`;
  return { top: titleTop(t('Заметки')), body: b, dock: fab(`openNoteEditor(null,{noteCat:S.noteCat==='all'?'Идеи':S.noteCat})`, `<button class="fab sec2" onclick="openVoice('note')" aria-label="${esc(t('Надиктовать заметку'))}">${ic('mic', 24)}</button>`) };
};

/* ================= MORE ================= */
SCREENS.more = () => {
  const tiles = [['drive', 'За рулём', 'play'], ['help', 'Инструкция', 'note'], ['meetings', 'Встречи', 'users'], ['recordings', 'Записи', 'rec'], ['contacts', 'Контакты', 'user'], ['docs', 'Документы', 'folder'], ['fav', 'Избранное', 'star'], ['search', 'Поиск и AI', 'search'], ['card', 'Моя визитка', 'qr'], ['pdf', 'PDF-выгрузка', 'pdf'], ['slot', 'Свободное окно', 'clock'], ['voice', 'Голос', 'mic'], ['settings', 'Настройки', 'settings']];
  const act = { slot: 'openSlotFinder()', voice: 'openVoice()', pdf: "openPdfExport('today')" };
  const b = `<div class="tiles">${tiles.map(([k, l, i]) => `<button class="tile" onclick="${act[k] || `go('${k}')`}"><span class="ti">${ic(i, 22)}</span>${t(l)}</button>`).join('')}</div>
    <div style="text-align:center;margin-top:30px">${logo(56)}<div style="font-weight:800;font-size:20px;margin-top:10px">MARKUS-A</div><div class="muted" style="font-size:13px">${t('Больше, чем просто календарь.')}<br>${t('Думай. Говори. Действуй.')}</div></div>`;
  return { top: titleTop(t('Ещё')), body: b };
};

/* ================= MEETINGS ================= */
SCREENS.meetings = () => {
  const td = D.today(), up = S.meetList === 'up';
  const ms = S.items.filter(i => !i.deleted && i.kind === 'meeting' && (up ? (!i.date || i.date >= td) : (i.date && i.date < td)));
  let b = `<div class="seg"><button class="${up ? 'on' : ''}" onclick="S.meetList='up';render()">${t('Предстоящие')}</button><button class="${!up ? 'on' : ''}" onclick="S.meetList='past';render()">${t('Прошедшие')}</button></div>`;
  b += ms.length ? listOf(sortByDate(ms, !up), { showDate: true }) : emptyBox('👥', up ? t('Предстоящих встреч нет') : t('Прошедших встреч нет'));
  return { top: titleTop(t('Встречи')), body: b, dock: fab(`openEditor('meeting')`) };
};
SCREENS.meeting = () => {
  const m = getItem(S.meetingId);
  if (!m || m.deleted) return { top: titleTop(t('Встреча')), body: emptyBox('🤷', t('Встреча не найдена')) };
  const c = catOf(m), recOn = Rec.active && Rec.active.meetingId === m.id;
  const cs = (m.contactIds || []).map(getItem).filter(x => x && !x.deleted);
  const extra = (m.participants || []).filter(n => !cs.some(x => x.title === n));
  let b = `<div style="font-size:22px;font-weight:800;line-height:1.25;margin:4px 0 8px">${esc(m.title)}</div>
    <div class="kv">${ic('calendar', 16)}${esc(m.date ? D.long(m.date) : t('Без даты'))}${m.start ? ' · ' + esc(timeLabel(m)) : ''}</div>
    ${m.place ? `<div class="kv">${ic('pin', 16)}${esc(m.place)}</div>` : ''}
    <div class="pills"><span class="cat" style="--t:${c.color}">${esc(catName(c))}</span>${m.priority !== 'normal' ? `<span class="tag" style="--t:${PRIO[m.priority].c}">${t(PRIO[m.priority].l)}</span>` : ''}${m.autoRecord ? `<span class="tag red">● ${t('Автозапись')}</span>` : ''}${m.status === 'done' ? `<span class="tag grn">${t('Завершена')}</span>` : ''}</div>`;
  if (m.needsTime && !m.start && m.date) b += `<div class="banner" style="color:var(--ora)" onclick="askMeetingTime('${m.id}')">${ic('clock')}<div><b>${t('Время встречи не указано')}</b><span>${t('Нажмите, чтобы указать время и включить автозапись')}</span></div>${ic('right')}</div>`;
  if (recBlocked === m.id && !recOn && !m.recording) b += `<div class="banner" style="color:var(--red)" onclick="recBlocked=null;Rec.start('${m.id}')">${ic('mic')}<div><b>${t('Автозапись не запустилась')}</b><span>${t('Браузер не дал доступ к микрофону. Нажмите здесь, чтобы начать, и выберите «Разрешить всегда».')}</span></div></div>`;
  if ((m.locations || []).length) b += `<div class="card"><div class="h4" style="margin-top:0">${t('Локации')} (${m.locations.length})</div>${placesBlock(m)}</div>`;
  b += `<div class="card"><div class="h4" style="margin-top:0;display:flex">${t('Участники')} (${cs.length + extra.length + 1})<span style="flex:1"></span><button class="link" onclick="meetAddPerson('${m.id}')">+ ${t('Добавить')}</button></div>
    ${cs.map(x => `<div class="person" onclick="openContact('${x.id}')" style="cursor:pointer"><span class="pav">${esc(x.title[0].toUpperCase())}</span><div style="flex:1;min-width:0"><b style="font-size:14px">${esc(x.title)}</b><div class="muted" style="font-size:12px">${esc([x.company, x.phone].filter(Boolean).join(' · '))}</div></div>${contactLinks(x).filter(l => l.i !== 'mail').map(l => `<a class="xbtn" href="${esc(l.u)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" aria-label="${esc(l.l)}">${ic(l.i, 16)}</a>`).join('')}</div>`).join('')}
    ${extra.map(n => `<div class="person"><span class="pav" style="background:#94a3b8">${esc(n.trim()[0] || '?').toUpperCase()}</span><div><b style="font-size:14px">${esc(n)}</b><div class="muted" style="font-size:12px">${t('нет в контактах')}</div></div></div>`).join('')}
    <div class="person"><span class="pav" style="background:#94a3b8">${esc((S.set.name || 'Я')[0].toUpperCase())}</span><div><b style="font-size:14px">${t('Вы')}</b><div class="muted" style="font-size:12px">${t('Организатор')}</div></div></div>
    <div class="btns" style="margin-top:8px"><button class="btn ghost" onclick="sendInvite('${m.id}')">${ic('send', 16)} ${t('Пригласить')}</button><button class="btn ghost" onclick="shareCardImage()">${ic('qr', 16)} ${t('Моя визитка')}</button></div></div>`;
  b += `<div class="card"><div class="h4" style="margin-top:0">${t('Материалы к встрече')} (${(m.files || []).length + (m.links || []).length})</div>${(m.files || []).length ? attList(m.files, m.id, false) : `<div class="hint">${t('Прикрепите договор, презентацию, реквизиты — всё будет под рукой на встрече')}</div>`}
    ${linksBlock(m)}
    <label class="att-add" style="margin-top:8px">${ic('clip', 16)} ${t('Добавить файлы')}<input type="file" multiple hidden onchange="meetAddFiles('${m.id}',this)"></label></div>`;
  if (m.desc) b += `<div class="card"><div class="h4" style="margin-top:0">${t('Заметки')}</div><div class="pre">${linkify(m.desc)}</div></div>`;
  if ((m.subtasks || []).length) b += `<div class="card"><div class="h4" style="margin-top:0">${t('Подзадачи')} · ${progress(m)}%</div>${m.subtasks.map(s => `<div class="sub ${s.done ? 'done' : ''}"><button class="chk sq ${s.done ? 'on' : ''}" onclick="subToggle('${m.id}','${s.id}')">${s.done ? ic('checkmark', 12) : ''}</button><span class="sub-b"><span class="sub-t">${esc(s.text)}</span><span class="sub-m">${subMeta(m, s)}</span></span></div>`).join('')}</div>`;
  if (recOn) {
    const ra = Rec.active;
    b += `<div class="card rec-card ${ra.discreet ? 'quiet' : ''}"><div style="display:flex;align-items:center;gap:10px"><i class="rec-mini ${ra.pauseAt ? 'paused' : ''}"></i><b id="m_rec_t" style="font-variant-numeric:tabular-nums">${fmtDur(Rec.elapsed())}</b><span class="muted" style="font-size:12px;flex:1">${t('до {t}', { t: new Date(ra.stopAt).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }) })}</span></div>${ra.inCall ? `<div class="hint" style="margin-top:6px">📞 ${t('Звонок — запись на паузе и продолжится сама, когда вы положите трубку')}</div>` : ''}
      <div class="btns" style="margin-top:8px"><button class="btn ghost" onclick="Rec.stop()">${ic('rec', 16)} ${t('Остановить')}</button><button class="btn ghost" onclick="Rec.pause()">${ra.pauseAt ? ic('play', 16) : ic('pause', 16)}</button><button class="btn ghost" onclick="Rec.extend(30)">+30 ${t('мин')}</button>${ra.discreet ? '' : `<button class="btn ghost" onclick="showRec()">${ic('mic', 16)}</button>`}</div></div>`;
  }
  else if (!m.recording) b += `<button class="btn pri full" onclick="Rec.start('${m.id}')">${ic('mic', 18)} ${t('Начать запись встречи')}</button>${m.autoRecord && m.start && m.date >= D.today() ? `<div class="hint" style="text-align:center">${t('Автозапись включена: начнётся в {t}', { t: D.addMin(m.start, -(+S.set.recPre || 0)) })}</div>` : ''}`;
  if (m.recording) {
    b += `<div class="card" style="margin-top:10px"><div class="h4" style="margin-top:0">${t('Запись')} · ${fmtDur(m.recording.duration || 0)} · ${mb(m.recording.size)}</div>${recCallsHtml(m.recording)}<div id="m_audio"><div class="hint">${t('Загрузка…')}</div></div>
      <div class="btns" style="margin-top:8px"><button class="btn ghost" onclick="shareRec('${m.id}')">${ic('share', 16)} ${t('Поделиться')}</button><button class="btn ghost" onclick="saveRec('${m.id}')">${ic('download', 16)} ${t('В телефон')}</button></div>
      ${Processing.has(m.id) ? `<div class="ai-box" style="margin-top:8px">${t('AI готовит итоги… Можно пользоваться приложением.')}</div>` : `<button class="btn ${m.transcript ? 'ghost' : 'pri'} full" style="margin-top:8px" onclick="processMeeting('${m.id}')">${ic('ai', 16)} ${m.transcript ? t('Обработать заново') : t('Обработать AI')}</button>`}
      ${m.aiError && !m.summary ? `<div class="hint warn">${esc(m.aiError)}</div>` : ''}
      ${m.summary ? `<button class="btn ghost full" style="margin-top:8px" onclick="speakMeeting('${m.id}')">${ic('play', 16)} ${t('Прослушать итоги')}</button>` : ''}
      <button class="btn ghost full" style="margin-top:8px" onclick="meetAudioToTelegram('${m.id}',false,this)">${ic('send', 16)} ${t('Отправить запись в Telegram')}</button><div id="rtg_${m.id}">${recTgStateHtml(m)}</div>
      <button class="btn danger full" style="margin-top:10px" onclick="deleteFile('${m.id}','rec')">${ic('trash', 16)} ${t('Удалить запись')}</button></div>`;
  }
  if (m.summary || m.transcript) {
    const tabs = [['short', 'Кратко'], ['dec', 'Решения'], ['tasks', 'Задачи'], ['tr', 'Стенограмма']];
    b += sec(t('AI-итоги встречи')) + `<div class="seg">${tabs.map(([k, l]) => `<button class="${S.meetTab === k ? 'on' : ''}" onclick="S.meetTab='${k}';render()">${t(l)}${k === 'tasks' && (m.proposed || []).length ? ' (' + m.proposed.length + ')' : ''}</button>`).join('')}</div><div class="card">${meetTab(m)}</div>`;
    if (m.summary) b += `<button class="btn pri full" onclick="meetToTelegram('${m.id}',false,this)">${ic('send', 16)} ${t('Отправить итоги в Telegram')}</button><div id="tgst_${m.id}">${tgStateHtml(m)}</div>`;
  }
  const menu = `<button class="tbtn" onclick="meetFav('${m.id}')">${ic(m.fav ? 'starf' : 'star')}</button><button class="tbtn" onclick="openShare('${m.id}')" aria-label="${esc(t('Поделиться'))}">${ic('share')}</button><button class="tbtn" onclick="openItemPdf('${m.id}')" aria-label="PDF">${ic('pdf')}</button><button class="tbtn" onclick="openEditor('meeting',{id:'${m.id}'})" aria-label="${esc(t('Изменить'))}">${ic('edit')}</button><button class="tbtn" style="color:var(--red)" onclick="deleteItemFull('${m.id}')" aria-label="${esc(t('Удалить'))}">${ic('trash')}</button>`;
  return {
    top: titleTop(t('Встреча'), { extra: menu }), body: b,
    after: async () => {
      loadThumbs($('#screen'));
      const box = $('#m_audio'); if (!box || !m.recording) return;
      const blob = await getFileBlob({ id: m.recording.fileId, cloud: m.recording.cloud, parts: m.recording.parts, type: m.recording.mime });
      box.innerHTML = blob ? `<audio controls style="width:100%" src="${URL.createObjectURL(blob)}"></audio><button class="btn ghost full" style="margin-top:6px" onclick="audioBoost(this)">🔊 ${t('Усилить тихие звуки')}</button>` : `<div class="hint warn">${t('Аудио есть только на другом устройстве')}</div>`;
    }
  };
};
function bl(arr) { return (arr && arr.length) ? `<ul class="bul">${arr.map(x => `<li>${esc(typeof x === 'string' ? x : JSON.stringify(x))}</li>`).join('')}</ul>` : '<div class="hint">—</div>'; }
function meetTab(m) {
  const s = m.summary || {};
  if (S.meetTab === 'short') return `<div class="h4" style="margin-top:0">${t('Кратко')}</div>${bl(s.short)}<div class="h4">${t('Важная информация')}</div>${bl(s.important)}`;
  if (S.meetTab === 'dec') return `<div class="h4" style="margin-top:0">${t('Решения')}</div>${bl(s.decisions)}<div class="h4">${t('Обязательства')}</div>${bl((s.commitments || []).map(c => `${c.who ? c.who + ': ' : ''}${c.what}${c.due ? ' (' + t('срок') + ': ' + c.due + ')' : ''}`))}<div class="h4">${t('Сроки')}</div>${bl(s.deadlines)}<div class="h4">${t('Риски и нерешённое')}</div>${bl(s.risks)}<div class="h4">${t('Следующие шаги')}</div>${bl(s.next)}`;
  if (S.meetTab === 'tasks') {
    const p = m.proposed || [];
    if (!p.length) return `<div class="hint">${t('AI не нашёл поручений в этой встрече')}</div>`;
    return p.map((x, i) => `<div class="sub" style="align-items:flex-start"><span style="flex:1"><b style="font-size:14px">${x.type === 'meeting' ? '👥 ' : x.type === 'control' ? '👁 ' : ''}${esc(x.title)}</b><br><span class="muted" style="font-size:12px">${esc(x.date ? D.human(x.date) : t('без даты'))}${x.start ? ', ' + x.start : ''}${x.dueTime ? ', ' + t('до') + ' ' + x.dueTime : ''}${x.who ? ' · ' + esc(x.who) : ''}</span></span>
      ${x.state === 'created' ? `<span class="tag grn">${t('создана')}</span>` : x.state === 'skipped' ? `<span class="tag">${t('пропущена')}</span>` : `<button class="rs-btn" onclick="createProposed('${m.id}',${i})">${t('Создать')}</button>`}</div>`).join('')
      + (p.some(x => x.state === 'new') ? `<button class="btn pri full" style="margin-top:10px" onclick="reviewProposed('${m.id}',true)">${t('Создать все')}</button>` : '');
  }
  return m.transcript ? `<div class="pre">${esc(m.transcript)}</div>` : `<div class="hint">${t('Стенограммы пока нет')}</div>`;
}
async function meetAddPerson(id) { const m = getItem(id); const cid = await pickContact(m.contactIds || []); if (!cid) return; const c = getItem(cid); m.contactIds = Array.from(new Set((m.contactIds || []).concat(cid))); m.participants = Array.from(new Set((m.participants || []).concat(c.title))); await saveItem(m); }
async function meetAddFiles(id, inp) { const m = getItem(id); for (const f of inp.files) m.files.push(await storeFile(f)); inp.value = ''; await saveItem(m); toast(t('Файлы добавлены')); }
async function meetFav(id) { const m = getItem(id); m.fav = !m.fav; await saveItem(m); toast(m.fav ? t('В избранном ★') : t('Убрано из избранного')); }
async function meetDelRec(id) { await deleteFile(id, 'rec'); }
/* where the summary went: shown right under the button, so it is never a mystery */
function tgStateHtml(m) {
  const bot = cfg.bot, chat = bot ? `<a href="https://t.me/${esc(bot)}" target="_blank" rel="noopener">${t('Открыть чат с ботом')} @${esc(bot)}</a>` : '';
  const g = m.tg;
  if (!g) return `<div class="tg-state muted">${bot ? t('Итоги придут в Telegram, в чат с ботом @{b} (не в «Избранное»)', { b: bot }) : ''}</div>`;
  const when = new Date(g.at), tm = (D.fmt(when) === D.today() ? '' : D.short(D.fmt(when)) + ' ') + pad(when.getHours()) + ':' + pad(when.getMinutes());
  return g.ok ? `<div class="tg-state okc">✓ ${t('Доставлено в Telegram')} ${tm}${chat ? ' · ' + chat : ''}</div>`
    : `<div class="tg-state bad">⚠ ${t('Не отправлено')} (${tm}): ${esc(g.err || '')}</div>`;
}
async function meetToTelegram(id, silent, btn) {
  const m = getItem(id), s = m.summary || {};
  const h = x => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const L = (ttl, a) => a && a.length ? `\n\n<b>${h(ttl)}</b>\n` + a.map(x => '• ' + h(typeof x === 'string' ? x : `${x.who ? x.who + ': ' : ''}${x.what || ''}${x.due ? ' (' + x.due + ')' : ''}`)).join('\n') : '';
  const made = (m.proposed || []).filter(x => x.state === 'created').map(x => { const it = getItem(x.itemId); return it ? (it.kind === 'meeting' ? '👥 ' : '☐ ') + it.title + ' — ' + whenLabel(it) : null; }).filter(Boolean);
  const tx = `📋 <b>${h(t('Итоги встречи'))}: ${h(m.title)}</b>\n${h(m.date ? D.human(m.date) : '')} ${h(timeLabel(m))}` + L(t('Кратко'), s.short) + L(t('Решения'), s.decisions) + L(t('Обязательства'), s.commitments) + L(t('Сроки'), s.deadlines) + L(t('Следующие шаги'), s.next) + L(t('Добавлено в планы'), made);
  const run = async () => {
    try { await Cloud.sendTelegram(tx.slice(0, 30000)); m.tg = { at: new Date().toISOString(), ok: true }; }
    catch (e) { m.tg = { at: new Date().toISOString(), ok: false, err: e.message || String(e) }; throw e; }
    finally { await saveItem(m, { render: false }); const el = document.getElementById('tgst_' + id); if (el) el.innerHTML = tgStateHtml(m); }
  };
  if (silent) { try { await run(); } catch (e) { notify(t('Итоги не ушли в Telegram'), m.title + ': ' + (e.message || ''), { tag: 'tgerr-' + id, id }); } return; }
  const ok = await withBusy(btn, run, { ok: t('Отправлено') });
  if (ok && cfg.bot) toast(t('Готово ✓ Смотрите в Telegram: чат с ботом @{b}', { b: cfg.bot }), 5000);
}

/* ================= RECORDINGS ================= */
async function recBlob(id) { const m = getItem(id); const b = m && m.recording && await getFileBlob({ id: m.recording.fileId, cloud: m.recording.cloud, parts: m.recording.parts, type: m.recording.mime }); if (!b) toast(t('Аудио есть только на другом устройстве')); return b; }
async function shareRec(id) { const m = getItem(id), b = await recBlob(id); if (!b) return; const f = findFile(id, 'rec').f; shareFile(new Blob([b], { type: f.type }), f.name, m.title); }
async function saveRec(id) { const b = await recBlob(id); if (!b) return; downloadBlob(b, findFile(id, 'rec').f.name); toast(t('Сохранено в «Загрузки» телефона')); }
SCREENS.recordings = () => {
  const rs = sortByDate(live().filter(i => i.kind === 'meeting' && i.recording), true);
  let b = `<div class="hint">${t('Записи хранятся внутри приложения (и в облаке, если вы вошли). Отсюда их можно прослушать, отправить в Telegram/WhatsApp или сохранить в телефон (папка «Загрузки»).')}</div>`;
  b += rs.length ? rs.map(m => `<div class="card"><div style="display:flex;align-items:center;gap:10px"><span class="ficon" style="background:#f59e0b">${ic('rec', 16)}</span><div style="flex:1;min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.title)}</b><span class="muted" style="font-size:12px">${esc(m.date ? D.human(m.date) : '')} · ${fmtDur(m.recording.duration || 0)} · ${mb(m.recording.size)}${m.transcript ? ' · ' + t('есть стенограмма') : ''}</span></div>${m.recording.fav ? `<span style="color:var(--ylw)">${ic('starf', 16)}</span>` : ''}</div>
    <div data-audio="${m.id}" style="margin-top:8px"><button class="link" onclick="loadAudio('${m.id}')">${ic('play', 14)} ${t('Прослушать')}</button></div>
    <div class="btns" style="margin-top:8px"><button class="btn ghost" onclick="shareRec('${m.id}')">${ic('share', 16)} ${t('Поделиться')}</button><button class="btn ghost" onclick="saveRec('${m.id}')">${ic('download', 16)} ${t('В телефон')}</button><button class="btn ghost" onclick="go('meeting','${m.id}')">${ic('ai', 16)} ${t('Итоги')}</button></div>
    <div class="btns" style="margin-top:8px"><button class="btn ghost" onclick="meetAudioToTelegram('${m.id}',false,this)">${ic('send', 16)} Telegram</button><button class="btn danger" onclick="deleteFile('${m.id}','rec')">${ic('trash', 16)} ${t('Удалить')}</button></div><div id="rtg_${m.id}">${recTgStateHtml(m)}</div></div>`).join('') : emptyBox('🎙', t('Записей пока нет. Нажмите «Запись» на главном экране или «Начать запись» во встрече.'));
  return { top: titleTop(t('Записи')), body: b, dock: fab('quickRecord()') };
};
async function loadAudio(id) { const b = await recBlob(id); const box = $(`[data-audio="${id}"]`); if (b && box) box.innerHTML = `<audio controls autoplay style="width:100%" src="${URL.createObjectURL(b)}"></audio>`; }

/* ================= CONTACTS ================= */
function contactsListHTML() {
  const q = (S.contactQ || '').toLowerCase();
  const cs = live().filter(c => c.kind === 'contact' && (!q || (c.title + ' ' + (c.company || '') + ' ' + (c.phone || '') + ' ' + (c.telegram || '')).toLowerCase().includes(q))).sort((a, b) => a.title.localeCompare(b.title));
  if (!cs.length) return emptyBox('👤', q ? t('Ничего не найдено') : t('Контактов пока нет. Добавьте партнёров — их можно выбирать во встречах.'));
  return `<div class="list">${cs.map(c => `<div class="ncard" data-open="${c.id}"><span class="pav">${esc(c.title[0].toUpperCase())}</span><div class="nmain"><b>${esc(c.title)}</b><span>${esc([c.company, c.phone, c.telegram].filter(Boolean).join(' · '))}</span></div>${(c.files || []).length ? `<span class="mini">${ic('clip', 12)}${c.files.length}</span>` : ''}</div>`).join('')}</div>`;
}
SCREENS.contacts = () => {
  const b = `<div class="search">${ic('search', 18)}<input placeholder="${esc(t('Поиск контактов…'))}" value="${esc(S.contactQ)}" oninput="S.contactQ=this.value;$('#cl').innerHTML=contactsListHTML()"></div><div id="cl">${contactsListHTML()}</div>`;
  return { top: titleTop(t('Контакты')), body: b, dock: fab('editContact()') };
};

/* ================= MY CARD ================= */
SCREENS.card = () => {
  const c = S.set.myCard;
  const F = [['brand', 'Бренд (крупно)'], ['subtitle', 'Подзаголовок'], ['fn', 'Имя / название'], ['org', 'Организация'], ['title', 'Деятельность'], ['phone', 'Телефон'], ['phone2', 'Телефон 2'], ['whatsapp', 'WhatsApp'], ['telegram', 'Telegram'], ['email', 'Email'], ['url', 'Сайт'], ['address', 'Адрес'], ['note', 'Примечание'], ['footer', 'Строка внизу']];
  const b = `<div class="card" style="text-align:center"><canvas id="cardCv" style="width:100%;max-width:360px;border-radius:12px;box-shadow:var(--sh)"></canvas>
    <div class="btns" style="margin-top:10px"><button class="btn pri" onclick="shareCardImage()">${ic('share', 16)} ${t('Поделиться QR')}</button><button class="btn ghost" onclick="shareVcf()">${ic('user', 16)} ${t('Контакт (.vcf)')}</button></div>
    <div class="hint">${t('Партнёр наводит камеру на QR — и ваш контакт сохраняется в его телефон.')}</div></div>
    <div class="set-card">${F.map(([k, l]) => `<label class="lbl">${t(l)}</label><input class="inp" value="${esc(c[k] || '')}" onchange="S.set.myCard.${k}=this.value.trim();saveSettings();drawCard($('#cardCv')).catch(()=>{})">`).join('')}<div style="height:12px"></div></div>`;
  return { top: titleTop(t('Моя визитка')), body: b, after: () => drawCard($('#cardCv')).catch(e => toast(e.message, 4000)) };
};

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
  if (!xs.length) return emptyBox('📁', t('Документов нет. Прикрепляйте их к задачам и встречам или загрузите здесь'));
  return `<div class="list" style="padding:0 12px">${xs.map(({ f, it }) => `<div class="frow" onclick="openFile('${it.id}','${f.isRec ? 'rec' : f.id}')">${ficon(f)}<div class="fm"><b>${esc(f.name)}</b><span>${mb(f.size)} · ${esc(D.human((f.added || it.updated || '').slice(0, 10) || D.today()))} · ${esc(it.title.slice(0, 40))}</span></div>${f.fav ? `<span style="color:var(--ylw)">${ic('starf', 16)}</span>` : ''}<button class="row-menu del" onclick="event.stopPropagation();deleteFile('${it.id}','${f.isRec ? 'rec' : f.id}')" aria-label="${esc(t('Удалить'))}">${ic('trash', 17)}</button></div>`).join('')}</div>`;
}
SCREENS.docs = () => {
  const fl = [['all', 'Все'], ['pdf', 'PDF'], ['docx', 'DOCX'], ['xlsx', 'XLSX'], ['img', 'Изображения'], ['audio', 'Аудио'], ['other', 'Другое']];
  const b = `<div class="search">${ic('search', 18)}<input placeholder="${esc(t('Поиск документов…'))}" value="${esc(S.docQ)}" oninput="S.docQ=this.value;$('#dl').innerHTML=docsListHTML()"></div>
    <div class="chips">${fl.map(([k, l]) => `<button class="chip ${S.docFilter === k ? 'on' : ''}" onclick="S.docFilter='${k}';render()">${t(l)}</button>`).join('')}</div><div id="dl">${docsListHTML()}</div>`;
  return { top: titleTop(t('Документы')), body: b, dock: `<div class="fab-wrap"><label class="fab" aria-label="${esc(t('Загрузить'))}">${ic('plus', 26)}<input type="file" multiple hidden onchange="uploadDocs(this)"></label></div>` };
};

/* ================= FAVORITES ================= */
SCREENS.fav = () => {
  const its = live().filter(i => i.fav);
  const fs = allFiles().filter(x => x.f.fav);
  let b = '';
  const tasks = its.filter(isTaskKind), notes = its.filter(i => i.kind === 'note');
  if (tasks.length) b += sec(t('Задачи и встречи')) + listOf(sortByDate(tasks), { showDate: true });
  if (notes.length) b += sec(t('Заметки')) + `<div class="list">${notes.map(n => `<div class="ncard" data-open="${n.id}"><div class="nicon" style="--t:#f59e0b">${ic('note')}</div><div class="nmain"><b>${esc(n.title)}</b><p>${esc((n.desc || '').slice(0, 150))}</p></div></div>`).join('')}</div>`;
  if (fs.length) b += sec(t('Документы и записи')) + `<div class="list" style="padding:0 12px">${fs.map(({ f, it }) => `<div class="frow" onclick="openFile('${it.id}','${f.isRec ? 'rec' : f.id}')">${ficon(f)}<div class="fm"><b>${esc(f.name)}</b><span>${esc(it.title)}</span></div></div>`).join('')}</div>`;
  if (!b) b = emptyBox('⭐', t('Отмечайте звёздочкой важные задачи, встречи, заметки, документы и записи'));
  return { top: titleTop(t('Избранное')), body: b };
};

/* ================= SEARCH ================= */
function searchHTML(q) {
  q = (q || '').trim().toLowerCase();
  if (q.length < 2) return `<div class="hint">${t('Ищет по задачам, встречам, заметкам, контактам, документам и стенограммам. Для вопросов своими словами нажмите «Спросить MARKUS-A».')}</div>`;
  const words = q.split(/\s+/).filter(Boolean).map(w => w.length > 5 ? w.slice(0, w.length - 2) : w);
  const hay = i => [i.title, i.desc, (i.participants || []).join(' '), i.place, i.company, i.phone, i.telegram, i.transcript, i.summary ? JSON.stringify(i.summary) : '', (i.subtasks || []).map(s => s.text).join(' '), (i.files || []).map(f => f.name).join(' ')].join(' ').toLowerCase();
  const its = live().filter(i => { const h = hay(i); return words.every(w => h.includes(w)); });
  const fs = allFiles().filter(({ f }) => words.every(w => f.name.toLowerCase().includes(w)));
  let b = '';
  const g = (ttl, a) => { if (a.length) b += sec(ttl, a.length) + listOf(sortByDate(a, true).slice(0, 30), { showDate: true }); };
  g(t('Встречи'), its.filter(i => i.kind === 'meeting'));
  g(t('Задачи'), its.filter(i => i.kind === 'task'));
  const cs = its.filter(i => i.kind === 'contact');
  if (cs.length) b += sec(t('Контакты'), cs.length) + `<div class="list">${cs.map(c => `<div class="ncard" data-open="${c.id}"><span class="pav">${esc(c.title[0].toUpperCase())}</span><div class="nmain"><b>${esc(c.title)}</b><span>${esc([c.company, c.phone].filter(Boolean).join(' · '))}</span></div></div>`).join('')}</div>`;
  const ns = its.filter(i => i.kind === 'note');
  if (ns.length) b += sec(t('Заметки'), ns.length) + `<div class="list">${ns.slice(0, 30).map(n => `<div class="ncard" data-open="${n.id}"><div class="nicon" style="--t:#f59e0b">${ic('note')}</div><div class="nmain"><b>${esc(n.title)}</b><p>${esc((n.desc || '').slice(0, 150))}</p></div></div>`).join('')}</div>`;
  if (fs.length) b += sec(t('Документы'), fs.length) + `<div class="list" style="padding:0 12px">${fs.slice(0, 30).map(({ f, it }) => `<div class="frow" onclick="openFile('${it.id}','${f.isRec ? 'rec' : f.id}')">${ficon(f)}<div class="fm"><b>${esc(f.name)}</b><span>${esc(it.title)}</span></div></div>`).join('')}</div>`;
  return b || `<div class="hint">${t('Точных совпадений нет — попробуйте «Спросить MARKUS-A».')}</div>`;
}
SCREENS.search = () => {
  const b = `<div class="search">${ic('search', 18)}<input id="sq" placeholder="${esc(t('Например: Алишер, договор, аренда…'))}" value="${esc(S.search || '')}" oninput="S.search=this.value;$('#sr').innerHTML=searchHTML(this.value)"></div>
    <button class="btn pri full" onclick="askMarkus()">${ic('ai', 18)} ${t('Спросить MARKUS-A')}</button>
    <div id="sa"></div><div id="sr">${searchHTML(S.search)}</div>`;
  return { top: titleTop(t('Поиск')), body: b, after: () => { const i = $('#sq'); if (i && !S.search) i.focus(); } };
};
async function askMarkus() {
  let q = ($('#sq') && $('#sq').value.trim()) || '';
  if (q.length < 3) q = await askChoice(t('Спросить MARKUS-A'), t('Например: «Что мы решили с Алишером на прошлой встрече?»'), [], { type: 'text', label: t('Спросить') });
  if (!q) return;
  const box = $('#sa'); if (!box) return;
  box.innerHTML = `<div class="ai-box">${t('MARKUS-A думает…')}</div>`;
  try { const a = await AI.askData(q); box.innerHTML = `<div class="ai-box"><b>${esc(q)}</b>\n\n${esc(a)}</div>`; speak(a.slice(0, 300)); }
  catch (e) { box.innerHTML = `<div class="ai-box">${esc(e.message)}</div>`; }
}

/* ================= SETTINGS ================= */
function setVal(k, v) { S.set[k] = v; saveSettings(); if (['morningTime', 'eveTime', 'dayEnd', 'nagHours'].includes(k)) recomputeAll(); }
async function recomputeAll() { for (const it of S.items.filter(isOpen)) await saveItem(it, { render: false }); }
SCREENS.settings = () => {
  const st = S.set, cloudOk = Cloud.configured(), u = Cloud.user, p = Cloud.profile;
  const tInp = (k) => `<input class="inp" type="time" value="${st[k]}" onchange="setVal('${k}',this.value)">`;
  let b = `<div class="set-card"><label class="lbl">${ic('globe', 14)} ${t('Язык / Language / Til')}</label>
    <select class="inp" onchange="setLang(this.value)">${LANGS.map(l => `<option value="${l.c}" ${st.lang === l.c ? 'selected' : ''}>${l.n}</option>`).join('')}<optgroup label="${esc(t('Другие (перевод через AI)'))}">${EXTRA_LANGS.map(l => `<option value="${l.c}" ${st.lang === l.c ? 'selected' : ''}>${l.n}</option>`).join('')}</optgroup></select>
    <label class="lbl">${t('Как к вам обращаться')}</label><input class="inp" value="${esc(st.name)}" placeholder="${esc(t('Имя'))}" onchange="setVal('name',this.value.trim())">
    <label class="lbl">${t('Тема')}</label><div class="themes">${THEMES.map(([k, l, c1, c2]) => `<button class="theme-b ${st.theme === k ? 'on' : ''}" onclick="setVal('theme','${k}');applyTheme();render()"><i style="background:linear-gradient(135deg,${c1} 50%,${c2} 50%)"></i>${t(l)}</button>`).join('')}</div>
    <div class="btns"><button class="btn ghost" onclick="go('help')">${ic('note', 16)} ${t('Инструкция и помощник')}</button></div></div>`;
  b += sec(t('Главный экран')) + `<div class="set-card"><label class="lbl">${t('Сортировка задач на сегодня')}</label><div class="seg"><button class="${st.homeSort === 'time' ? 'on' : ''}" onclick="setVal('homeSort','time');render()">${t('По времени')}</button><button class="${st.homeSort === 'prio' ? 'on' : ''}" onclick="setVal('homeSort','prio');render()">${t('По важности')}</button></div>
    <label class="lbl">${t('Сколько задач показывать до «Показать все»')}</label><select class="inp" onchange="setVal('homeLimit',+this.value)">${[3, 5, 6, 8, 10, 15].map(n => `<option ${st.homeLimit === n ? 'selected' : ''}>${n}</option>`).join('')}</select><div style="height:12px"></div></div>`;
  b += sec(t('Напоминания')) + `<div class="set-card">
    <div class="g2"><div><label class="lbl">${t('Утреннее напоминание')}</label>${tInp('morningTime')}</div><div><label class="lbl">${t('Напоминание накануне')}</label>${tInp('eveTime')}</div></div>
    <div class="g2"><div><label class="lbl">${t('Повторять каждые')}</label><select class="inp" onchange="setVal('nagHours',+this.value)">${[1, 2, 3, 4].map(n => `<option value="${n}" ${st.nagHours === n ? 'selected' : ''}>${n} ${t('ч')}</option>`).join('')}</select></div><div><label class="lbl">${t('Не беспокоить после')}</label>${tInp('dayEnd')}</div></div>
    <div class="hint">${t('Для задач с отметкой «Напоминать до отметки «Готово»» напоминание повторяется, пока вы не отметите выполнение. Критические задачи включают это автоматически.')}</div>
    <div class="g2"><div><label class="lbl">${t('Рабочий день с')}</label>${tInp('workStart')}</div><div><label class="lbl">${t('до')}</label>${tInp('workEnd')}</div></div>
    <label class="lbl">${t('Длительность задачи по умолчанию')}</label><select class="inp" onchange="setVal('defaultDur',+this.value)">${[15, 30, 45, 60, 90, 120].map(m => `<option value="${m}" ${st.defaultDur === m ? 'selected' : ''}>${durLabel(m)}</option>`).join('')}</select>
    <div class="sw-row"><div><b>${t('Уведомления на этом устройстве')}</b><span>${NATIVE ? t('Через Android — см. раздел «Android-приложение» ниже') : 'Notification' in window ? (Notification.permission === 'granted' ? t('Разрешены') : Notification.permission === 'denied' ? t('Запрещены — включите в настройках браузера') : t('Не включены')) : t('Не поддерживаются')}</span></div>${'Notification' in window && Notification.permission === 'default' ? `<button class="chip-btn" onclick="askNotif()">${t('Включить')}</button>` : ''}</div></div>`;
  b += sec(t('Запись встреч')) + `<div class="set-card">
    <div class="sw-row"><div><b>${t('Автозапись всех новых встреч')}</b><span>${t('Включается в каждой новой встрече (можно выключить в конкретной встрече)')}</span></div><button class="sw ${st.autoRecDefault ? 'on' : ''}" onclick="setVal('autoRecDefault',!S.set.autoRecDefault);render()"></button></div>
    <div class="g2"><div><label class="lbl">${t('Начинать до встречи за')}</label><select class="inp" onchange="setVal('recPre',+this.value);recomputeAll()">${[0, 1, 2, 3, 5, 10].map(n => `<option value="${n}" ${+st.recPre === n ? 'selected' : ''}>${n} ${t('мин')}</option>`).join('')}</select></div>
    <div><label class="lbl">${t('Писать после конца ещё')}</label><select class="inp" onchange="setVal('recPost',+this.value)">${[0, 10, 15, 30, 45, 60, 90].map(n => `<option value="${n}" ${+st.recPost === n ? 'selected' : ''}>${n} ${t('мин')}</option>`).join('')}</select></div></div>
    <label class="lbl">${t('Качество записи')}</label><div class="seg">${Object.keys(REC_Q).map(k => `<button class="${(st.recQuality || 'high') === k ? 'on' : ''}" onclick="setVal('recQuality','${k}');render()">${t({ eco: 'Экономное', high: 'Высокое', max: 'Максимальное' }[k])}</button>`).join('')}</div>
    <div class="hint">${t('≈ {m} МБ за час записи.', { m: REC_Q[st.recQuality || 'high'].mbh })} ${(st.recQuality || 'high') === 'eco' ? t('Речь понятна, но тихие звуки и шорохи хуже.') : (st.recQuality === 'max' ? t('Стерео, лучшее качество. Облако (1 ГБ бесплатно) заполнится примерно за {h} часов записей.', { h: Math.round(1024 / REC_Q.max.mbh) }) : t('Рекомендуется: чётко слышны тихие голоса. Облако (1 ГБ бесплатно) вмещает около {h} часов записей.', { h: Math.round(1024 / REC_Q.high.mbh) }))}</div>
    <label class="lbl">${t('Режим микрофона')}</label>${REC_MODES.map(([k, l, d]) => `<div class="sw-row" style="cursor:pointer" onclick="setVal('recMode','${k}');render()"><div><b>${(st.recMode || 'auto') === k ? '◉' : '○'} ${t(l)}</b><span>${t(d)}</span></div></div>`).join('')}
    <div class="btns"><button class="btn ghost" onclick="micTest()">${ic('mic', 16)} ${t('Тест микрофона: сравнить режимы')}</button></div>
    <div class="hint">${t('Больше всего на качество влияет место телефона: микрофоном (нижний край) к собеседникам, на столе, не в кармане и не в сумке, подальше от кофемашины и колонок. Для записи издалека в шуме лучше всего внешний петличный микрофон с разъёмом USB-C — приложение подхватит его само.')}</div>
    <label class="lbl">${t('Экстренная запись — не дольше')}</label><select class="inp" onchange="setVal('recMaxMin',+this.value)">${[60, 120, 180, 240, 360].map(n => `<option value="${n}" ${+st.recMaxMin === n ? 'selected' : ''}>${durLabel(n)}</option>`).join('')}</select>
    <div class="sw-row"><div><b>${t('Незаметная запись')}</b><span>${t('Во время записи на экране нет большого окна записи — только маленькая точка в углу. Значок микрофона Android в строке состояния скрыть нельзя.')}</span></div><button class="sw ${st.recDiscreet ? 'on' : ''}" onclick="setVal('recDiscreet',!S.set.recDiscreet);render()"></button></div>
    <div class="sw-row"><div><b>${t('AI-итоги сразу после записи')}</b><span>${t('Стенограмма, итоги, задачи и встречи по датам — без вопросов')}</span></div><button class="sw ${st.autoAI ? 'on' : ''}" onclick="setVal('autoAI',!S.set.autoAI);render()"></button></div>
    <div class="sw-row"><div><b>${t('Присылать итоги в Telegram')}</b><span>${t('Если Telegram подключён')}</span></div><button class="sw ${st.sendSummaryTg ? 'on' : ''}" onclick="setVal('sendSummaryTg',!S.set.sendSummaryTg);render()"></button></div>
    <div class="sw-row"><div><b>${t('Присылать аудиозапись в Telegram')}</b><span>${t('Сразу после итогов, в тот же чат с ботом (запись до 50 МБ ≈ 1 ч 40 мин в высоком качестве)')}</span></div><button class="sw ${st.sendAudioTg ? 'on' : ''}" onclick="setVal('sendAudioTg',!S.set.sendAudioTg);render()"></button></div>
    <div class="hint">${NATIVE ? t('Запись ведёт само Android-приложение: она начнётся по расписанию, даже если телефон заблокирован, и остановится сама.') : t('Чтобы автозапись не спрашивала разрешение: в Chrome нажмите значок слева от адреса → «Разрешения» → Микрофон → «Разрешить».') + ' ' + t('Запись на заблокированном телефоне без единого нажатия — только в Android-приложении MARKUS-A.')}</div></div>`;
  if (NATIVE) b += `<div id="nativeSec"></div>` + sec(t('Android-приложение')) + nativeSettingsCard();
  b += sec(t('AI-помощник')) + `<div class="set-card"><label class="lbl">${t('Ключ Google Gemini (бесплатный)')}</label><input class="inp" type="password" value="${esc(st.aiKey)}" placeholder="AIza… / AQ.…" onchange="setVal('aiKey',this.value.trim());Cloud.user&&Cloud.saveProfile({ai_key:this.value.trim()||null});render()">
    <div class="hint">${t('Получить: aistudio.google.com → Get API key.')} ${st.aiKey ? `<span class="ok">${t('Ключ сохранён')}</span>` : ''}</div>
    <label class="lbl">${t('Модель')}</label><input class="inp" value="${esc(st.aiModel)}" onchange="setVal('aiModel',this.value.trim()||'gemini-2.5-flash')">
    <div class="hint">${t('Если Google отключит эту модель или закончится её бесплатный лимит, MARKUS-A сам переключится на другую доступную модель Gemini.')}${AI.lastModel ? ' ' + t('Сейчас работает: {m}', { m: esc(AI.lastModel) }) : ''}</div>
    <div class="btns"><button class="btn ghost" onclick="testAI()">${t('Проверить AI')}</button></div>
    <label class="lbl">${t('Задачи из встреч')}</label><div class="seg"><button class="${st.autoTasks === 'confirm' ? 'on' : ''}" onclick="setVal('autoTasks','confirm');render()">${t('С подтверждением')}</button><button class="${st.autoTasks === 'auto' ? 'on' : ''}" onclick="setVal('autoTasks','auto');render()">${t('Автоматически')}</button></div>
    <div class="sw-row"><div><b>${t('Отвечать голосом')}</b><span>${t('MARKUS-A озвучивает ответы на голосовые команды')}</span></div><button class="sw ${st.voiceReply ? 'on' : ''}" onclick="setVal('voiceReply',!S.set.voiceReply);render()"></button></div></div>`;
  b += sec(t('Облако и синхронизация')) + '<div class="set-card">';
  if (!cloudOk) b += `<div class="hint" style="margin-top:12px">${t('Облако не настроено. Впишите адрес и ключ Supabase в файл config.js на GitHub — или сюда:')}</div>
    <label class="lbl">Supabase URL</label><input class="inp" id="s_url" placeholder="https://xxxx.supabase.co" value="${esc(st.sbUrl)}">
    <label class="lbl">Supabase key</label><input class="inp" id="s_key" placeholder="sb_publishable_…" value="${esc(st.sbKey)}">
    <div class="btns"><button class="btn pri" onclick="setVal('sbUrl',$('#s_url').value.trim());setVal('sbKey',$('#s_key').value.trim());Cloud.init().then(render)">${t('Подключить')}</button></div>`;
  else if (!u) b += `<div class="hint" style="margin-top:12px">${t('Войдите тем же email и паролем на всех своих устройствах — задачи будут одинаковыми везде.')}</div>
    <label class="lbl">Email</label><input class="inp" id="s_em" type="email" autocomplete="email">
    <label class="lbl">${t('Пароль')}</label><input class="inp" id="s_pw" type="password" autocomplete="current-password">
    <div class="btns"><button class="btn pri" onclick="doAuth('in')">${t('Войти')}</button><button class="btn ghost" onclick="doAuth('up')">${t('Регистрация')}</button></div>
    <div class="btns"><button class="btn ghost" onclick="doAuth('link')">${ic('mail', 16)} ${t('Войти по ссылке из письма')}</button><button class="btn ghost" onclick="doAuth('reset')">${t('Забыли пароль?')}</button></div>`;
  else b += `<div class="sw-row"><div><b>${esc(u.email)}</b><span>${Cloud.lastError ? '<span class="warn">' + t('Ошибка') + ': ' + esc(Cloud.lastError) + '</span>' : Cloud.lastSync ? t('Синхронизировано {t}', { t: Cloud.lastSync.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }) }) : t('Подключено')}</span></div></div>
    <div class="btns"><button class="btn ghost" onclick="withBusy(this,async()=>{await Cloud.sync();if(Cloud.lastError)throw new Error(t('Ошибка синхронизации')+': '+Cloud.lastError);},{busy:t('Синхронизирую…'),ok:t('Синхронизировано')}).then(()=>setTimeout(render,2600))">${ic('cloud', 16)} ${t('Синхронизировать')}</button><button class="btn ghost" onclick="changePassword()">${t('Сменить пароль')}</button></div>
    <div class="btns"><button class="btn ghost" onclick="Cloud.signOut().then(render)">${t('Выйти')}</button></div>`;
  b += '</div>';
  b += sec('Telegram') + '<div class="set-card">';
  if (!u) b += `<div class="hint" style="margin-top:12px">${t('Сначала войдите в облако. Бот присылает напоминания, даже когда приложение закрыто, и принимает команды текстом и голосом.')}</div>`;
  else if (p && p.tg_chat_id) b += `<div class="sw-row"><div><b><span class="ok">${t('Подключён')}</span></b><span>${t('Напоминания и итоги приходят в Telegram')}</span></div></div><div class="btns"><button class="btn ghost" onclick="withBusy(this,()=>Cloud.sendTelegram('✅ ${esc(t('Проверка связи MARKUS-A'))}'),{ok:t('Отправлено')}).then(r=>r&&cfg.bot&&toast(t('Готово ✓ Смотрите в Telegram: чат с ботом @{b}',{b:cfg.bot}),5000))">${t('Тест')}</button><button class="btn ghost" onclick="Cloud.unlinkTelegram().then(render)">${t('Отключить')}</button></div>`;
  else b += `<div class="hint" style="margin-top:12px">${t('Бот будет присылать напоминания и итоги встреч, а вы сможете писать ему: «Завтра в 10 встреча с Алишером на час».')}</div><div class="btns"><button class="btn pri" onclick="doLinkTg()">${t('Подключить Telegram')}</button><button class="btn ghost" onclick="withBusy(this,async()=>{await Cloud.loadProfile();if(!(Cloud.profile&&Cloud.profile.tg_chat_id))throw new Error(t('Бот ещё не подключён: откройте ссылку «Подключить Telegram» и нажмите в боте «Запустить»'));},{busy:t('Проверяю…'),ok:t('Подключён')}).then(r=>r&&setTimeout(render,1500))">${t('Проверить')}</button></div>`;
  b += '</div>';
  b += sec(t('Файлы и память телефона')) + `<div class="set-card"><div class="hint" style="margin-top:12px">${t('Файлы, фото и записи хранятся в памяти приложения на телефоне. Если вы вошли в облако — копия уходит в облако Supabase (бесплатно 1 ГБ, файл до 50 МБ) и открывается на любом устройстве.')}</div>
    <div class="hint" id="st_info"></div>
    <div class="sw-row"><div><b>${t('Хранить файлы только в облаке')}</b><span>${t('После отправки в облако файл удаляется с телефона и скачивается снова, когда вы его открываете (нужен интернет)')}</span></div><button class="sw ${st.cloudOnly ? 'on' : ''}" onclick="${u ? "setVal('cloudOnly',!S.set.cloudOnly);render()" : "toast(t('Сначала войдите в облако — иначе файлы потеряются'),4000)"}"></button></div>
    <div class="btns"><button class="btn ghost" onclick="freePhoneMemory()">${t('Освободить память телефона')}</button></div></div>`;
  b += sec(t('Данные')) + `<div class="set-card"><div class="hint" style="margin-top:12px">${t('Резервная копия задач, встреч, контактов и заметок (без файлов).')}</div><div class="btns"><button class="btn ghost" onclick="exportBackup()">${ic('download', 16)} ${t('Скачать копию')}</button><label class="btn ghost">${t('Загрузить копию')}<input type="file" accept=".json,application/json" hidden onchange="importBackup(this.files[0])"></label></div>
    ${window._installPrompt ? `<div class="btns"><button class="btn pri" onclick="installApp()">${t('Установить приложение')}</button></div>` : ''}</div>`;
  b += `<div class="hint" style="text-align:center;margin:20px 0">MARKUS-A · ${t('версия')} 3.4</div>`;
  return { top: titleTop(t('Настройки')), body: b, after: async () => { const i = await storageInfo(); const el = $('#st_info'); if (el) el.textContent = t('Занято на телефоне: {a} · файлов: {n}, из них в облаке: {c}', { a: mb(i.used), n: i.n, c: i.cloud }); } };
};
async function testAI() { try { toast(t('Проверяю…')); const r = await AI.call([{ text: 'Reply with one word in ' + langName() + ': works' }]); toast(t('AI отвечает: {r} ✓', { r: r.slice(0, 40) }), 3000); } catch (e) { toast(e.message, 5000); } }
async function doAuth(mode) {
  const em = ($('#s_em').value || '').trim(), pw = $('#s_pw').value;
  if (!em) return toast(t('Введите email'));
  try {
    if (mode === 'link') { await Cloud.magicLink(em); await dialog({ title: t('Письмо отправлено'), text: t('Откройте письмо на ЭТОМ устройстве и нажмите ссылку — вход произойдёт автоматически. Если письма нет — проверьте «Спам» или подождите: бесплатный сервис отправляет не больше 2–3 писем в час.'), buttons: [{ l: 'OK', v: 1, p: 1 }] }); return; }
    if (mode === 'reset') { await Cloud.resetPassword(em); await dialog({ title: t('Письмо отправлено'), text: t('Откройте письмо на этом устройстве и нажмите ссылку — приложение попросит придумать новый пароль.'), buttons: [{ l: 'OK', v: 1, p: 1 }] }); return; }
    if (pw.length < 6) return toast(t('Пароль — минимум 6 символов'));
    if (mode === 'in') { await Cloud.signIn(em, pw); toast(t('Вход выполнен ✓')); }
    else { const r = await Cloud.signUp(em, pw); toast(r === 'confirm' ? t('Проверьте почту и подтвердите email, затем войдите') : t('Аккаунт создан ✓'), 5000); }
  } catch (e) { toast(e.message, 5000); }
  render();
}
async function changePassword() {
  const v = await dialog({ title: t('Новый пароль'), html: `<input class="inp" type="password" id="np1" placeholder="${esc(t('Новый пароль (от 6 символов)'))}"><input class="inp" type="password" id="np2" style="margin-top:8px" placeholder="${esc(t('Повторите пароль'))}">`, buttons: [{ l: t('Сохранить'), p: 1, v: sh => { const a = $('#np1', sh).value, b2 = $('#np2', sh).value; if (a.length < 6) { toast(t('Пароль — минимум 6 символов')); return false; } if (a !== b2) { toast(t('Пароли не совпадают')); return false; } return a; } }, { l: t('Отмена'), v: null }] });
  if (!v) return;
  try { await Cloud.setPassword(v); toast(t('Пароль изменён ✓'), 4000); } catch (e) { toast(e.message, 5000); }
}
async function doLinkTg() {
  if (!cfg.bot) return toast(t('Впишите имя бота в config.js (TELEGRAM_BOT)'), 4000);
  try {
    const code = await Cloud.linkTelegram();
    window.open(`https://t.me/${cfg.bot}?start=${code}`, '_blank');
    await dialog({ title: t('Подключение Telegram'), text: t('Откроется бот @{b} — нажмите «Запустить» (Start). Если не открылся, отправьте боту: /start {c}. Затем вернитесь и нажмите «Проверить».', { b: esc(cfg.bot), c: code }), buttons: [{ l: t('Проверить'), v: 1, p: 1 }] });
    await Cloud.loadProfile(); render();
    toast(Cloud.profile && Cloud.profile.tg_chat_id ? t('Telegram подключён ✓') : t('Пока не подключён — отправьте боту /start {c}', { c: code }), 5000);
  } catch (e) { toast(e.message, 4000); }
}
function exportBackup() {
  const data = { app: 'MARKUS-A', v: 2, exported: new Date().toISOString(), items: S.items.map(i => { const c = Object.assign({}, i); delete c._dirty; return c; }), settings: Object.assign({}, S.set, { aiKey: '' }) };
  downloadBlob(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), 'markus-a-backup-' + D.today() + '.json');
}
async function importBackup(file) {
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!Array.isArray(d.items)) throw new Error();
    let n = 0;
    for (const it of d.items) { const loc = getItem(it.id); if (!loc || (it.updated || '') > (loc.updated || '')) { await saveItem(it, { render: false }); n++; } }
    toast(t('Загружено: {n}', { n })); render();
  } catch (e) { toast(t('Файл не подходит')); }
}
async function installApp() { const p = window._installPrompt; if (!p) return; p.prompt(); await p.userChoice; window._installPrompt = null; render(); }

/* keep the screen on until a meeting with auto-record starts (so the recording can start by itself) */
let awakeRec = null;
async function keepAwakeForRec() {
  if (awakeRec) { try { awakeRec.release(); } catch (e) { } awakeRec = null; toast(t('Экран снова может гаснуть')); render(); return; }
  try { if (navigator.wakeLock) { awakeRec = await navigator.wakeLock.request('screen'); awakeRec.addEventListener('release', () => { awakeRec = null; }); } } catch (e) { }
  toast(awakeRec ? t('Экран не погаснет — запись начнётся сама.') : t('Этот браузер не умеет держать экран включённым'), 4000);
  render();
}

/* playback: makes quiet, distant speech and rustles audible (only while listening — the file is not changed) */
function audioBoost(btn) {
  const a = btn.parentElement.querySelector('audio'); if (!a) return;
  let g = a._boost;
  try {
    if (!g) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaElementSource(a);
      const lev = ctx.createDynamicsCompressor();   // evens out: loud parts down, quiet parts up
      lev.threshold.value = -42; lev.knee.value = 12; lev.ratio.value = 8; lev.attack.value = 0.005; lev.release.value = 0.3;
      const gain = ctx.createGain(); gain.gain.value = 16;
      const lim = ctx.createDynamicsCompressor();   // protects the ears and the speaker from sudden loud sounds
      lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1;
      lev.connect(gain); gain.connect(lim); lim.connect(ctx.destination);
      g = a._boost = { ctx, src, lev, on: false };
    }
    g.ctx.resume();
    g.src.disconnect();
    g.on = !g.on;
    g.src.connect(g.on ? g.lev : g.ctx.destination);
    btn.classList.toggle('pri', g.on); btn.classList.toggle('ghost', !g.on);
    btn.textContent = g.on ? '🔊 ' + t('Усиление включено — нажмите, чтобы выключить') : '🔊 ' + t('Усилить тихие звуки');
  } catch (e) { toast(t('Этот телефон не умеет усиливать звук при прослушивании'), 4000); }
}

function recCallsHtml(r) {
  const c = (r && r.calls) || []; if (!c.length) return '';
  const hm = ms => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  return `<div class="hint" style="margin:0 0 6px">📞 ${t('Пауза на звонки (запись продолжилась сама)')}: ${c.map(x => hm(x.from) + '–' + hm(x.to)).join(', ')}</div>`;
}
