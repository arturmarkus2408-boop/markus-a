'use strict';
const PRIO = { normal: { l: 'Обычная', c: '#64748b' }, high: { l: 'Важная', c: '#f97316' }, critical: { l: 'Критическая', c: '#ef4444' } };
const STATUS = { todo: 'К выполнению', progress: 'В работе', done: 'Готово', cancelled: 'Отменена' };
const REPEAT = { none: 'Не повторять', daily: 'Каждый день', weekdays: 'По будням', weekly: 'Каждую неделю', monthly: 'Каждый месяц', yearly: 'Каждый год', days: 'По дням недели', interval: 'Каждые N дней' };
const REMIND_OPTS = () => [['eve', t('Накануне в {t}', { t: S.set.eveTime })], ['morn', t('В день события в {t}', { t: S.set.morningTime })], [0, t('В момент начала')], [15, t('За 15 мин')], [30, t('За 30 мин')], [60, t('За 1 час')], [1440, t('За сутки')]];
const prioRank = i => ({ normal: 0, high: 1, critical: 2 }[i.priority] || 0);

function catOf(it) { const cs = S.set.categories; return cs.find(c => c.id === it.category) || cs[0]; }
function catName(c) { const d = DEFAULT_CATS.find(x => x.id === c.id); return d && d.name === c.name ? t(c.name) : c.name; }
function noteCatName(n) { return DEFAULT_NOTE_CATS.includes(n) ? t(n) : n; }

/* ---------- subtasks ---------- */
function subById(it, id) { return (it.subtasks || []).find(s => s.id === id); }
function isBlocked(it, s) { if (!s.after) return false; const d = subById(it, s.after); return !!(d && !d.done); }
function subDueAt(s) { return s.due ? D.dt(s.due, s.time || '23:59') : null; }
/* projected due date for a blocked subtask (dependency's due/projection + N days) */
function subPlanned(it, s, depth = 0) {
  if (s.due && !isBlocked(it, s)) return s.due;
  if (depth > 10) return s.due || null;
  const d = s.after && subById(it, s.after);
  if (d && !d.done) { const base = subPlanned(it, d, depth + 1); if (base) return D.max(s.due, D.add(base, s.afterDays != null ? +s.afterDays : 1)); }
  return s.due || null;
}
function progress(it) {
  const st = it.subtasks || [];
  if (st.length) return Math.round(st.filter(s => s.done).length / st.length * 100);
  if (it.status === 'done') return 100;
  if (it.status === 'cancelled') return it.cancelPct || 0;
  return null;
}
/* the task "stretches" until its last subtask's (planned) deadline */
function spanEnd(it) {
  let e = it.date;
  (it.subtasks || []).forEach(s => { const p = subPlanned(it, s); if (p) e = D.max(e, p); });
  return e;
}
function effectiveEndAt(it) {
  if (!it.date) return null;
  let e = D.dt(it.date, it.end || it.start || '23:59');
  (it.subtasks || []).forEach(s => { const p = subPlanned(it, s); if (p) { const d = D.dt(p, s.time || '23:59'); if (d > e) e = d; } });
  return e;
}
function overdueSubs(it) {
  const now = Date.now();
  return (it.subtasks || []).filter(s => !s.done && !isBlocked(it, s) && s.due && subDueAt(s).getTime() < now);
}
function nextSub(it) {
  const open = (it.subtasks || []).filter(s => !s.done && !isBlocked(it, s));
  return open.filter(s => s.due).sort((a, b) => (a.due + (a.time || '99')).localeCompare(b.due + (b.time || '99')))[0] || open[0] || null;
}
function validateSub(it, s) {
  const msgs = [];
  let cur = s, guard = 0;
  while (cur && cur.after && guard < 20) { if (cur.after === s.id) { s.after = null; msgs.push(t('Циклическая зависимость убрана')); break; } cur = subById(it, cur.after); guard++; }
  const dep = s.after && subById(it, s.after);
  if (dep && s.due && !dep.done) {
    const min = subPlanned(it, dep);
    if (min && s.due < min) { s.due = D.add(min, s.afterDays != null ? +s.afterDays : 0); msgs.push(t('Срок «{a}» сдвинут на {d}: он не может быть раньше «{b}»', { a: s.text, b: dep.text, d: D.human(s.due) })); }
  }
  if (it.date && s.due && s.due < it.date) { s.due = it.date; msgs.push(t('Срок подзадачи не может быть раньше начала задачи')); }
  return msgs;
}
/* when a subtask is completed: schedule the ones that waited for it */
function onSubDone(it, s) {
  s.done = true; s.doneAt = new Date().toISOString();
  const msgs = [];
  (it.subtasks || []).forEach(x => {
    if (x.after !== s.id || x.done) return;
    if (x.afterDays != null) x.due = D.add(D.today(), +x.afterDays);
    else if (!x.due || x.due < D.today()) x.due = D.today();
    else return;
    msgs.push(t('«{a}» запланирована на {d}', { a: x.text, d: D.human(x.due) }));
  });
  return msgs;
}
function normalizeItem(it) {
  if (!isTaskKind(it)) return;
  it.subtasks = (it.subtasks || []).map(s => Object.assign({ id: uid(), text: '', done: false, due: null, time: null, after: null, afterDays: null }, s));
  if (it.status === 'todo' && it.subtasks.some(s => s.done) && it.subtasks.some(s => !s.done)) it.status = 'progress';
}

/* ---------- task state ---------- */
function isOpen(it) { return isTaskKind(it) && !it.deleted && it.status !== 'done' && it.status !== 'cancelled'; }
function startAt(it) { return it.date ? D.dt(it.date, it.start || '00:00') : null; }
function endAt(it) { return effectiveEndAt(it); }
function isOverdue(it) {
  if (!isOpen(it) || !it.date) return false;
  if (overdueSubs(it).length) return true;
  const now = Date.now();
  const future = (it.subtasks || []).some(s => !s.done && (isBlocked(it, s) || (s.due && subDueAt(s).getTime() >= now)));
  if (future) return false;
  return D.dt(it.date, it.end || it.start || '23:59').getTime() < now;
}
function itemsOn(date) { return S.items.filter(i => !i.deleted && isTaskKind(i) && i.date === date); }
/* everything relevant for a day: tasks starting that day, subtasks due that day, long tasks still running (today) */
function dayAgenda(date) {
  const res = [];
  S.items.forEach(i => {
    if (i.deleted || !isTaskKind(i) || !i.date) return;
    if (i.date === date) { res.push({ it: i }); return; }
    if (i.status === 'cancelled') return;
    const subs = (i.subtasks || []).filter(s => !s.done && subPlanned(i, s) === date);
    if (subs.length) { res.push({ it: i, subs }); return; }
    if (isOpen(i) && i.date < date && spanEnd(i) >= date && date === D.today()) res.push({ it: i, cont: true });
  });
  return res;
}
function sortItems(a) {
  return a.slice().sort((x, y) => (x.start || '99:99').localeCompare(y.start || '99:99') || (prioRank(y) - prioRank(x)) || (x.title || '').localeCompare(y.title || ''));
}
function sortByDate(a, desc) {
  const k = i => (i.date || '9999') + (i.start || '99:99');
  return a.slice().sort((x, y) => desc ? k(y).localeCompare(k(x)) : k(x).localeCompare(k(y)));
}
function timeLabel(it) { return it.start ? it.start + (it.end && it.end !== it.start ? '–' + it.end : '') : ''; }
function whenLabel(it) { return it.date ? D.human(it.date) + (it.start ? ', ' + timeLabel(it) : '') : t('Без даты'); }

/* ---------- reminders ---------- */
function nagTimes(date, from) {
  const out = [], st = S.set, step = Math.max(1, +st.nagHours || 1) * 60, end = D.toMin(st.dayEnd || '22:00');
  let m = Math.max(D.toMin(st.morningTime), from ? D.toMin(from) : 0);
  for (let k = 0; k < 16 && m <= end; k++, m += step) out.push(D.dt(date, D.fromMin(m)));
  for (let dd = 1; dd <= 7; dd++) out.push(D.dt(D.add(date, dd), st.morningTime)); // then every morning for a week
  return out;
}
function computeReminders(it) {
  const out = [], lab = {};
  const add = (d, label) => { if (!d || isNaN(d)) return; const iso = d.toISOString(); out.push(iso); if (label) lab[iso] = label; };
  const open = isTaskKind(it) && it.status !== 'done' && it.status !== 'cancelled' && !it.deleted;
  const st = S.set;
  if (open && it.date) {
    const base = D.dt(it.date, it.start || st.morningTime);
    (it.reminders || []).forEach(r => {
      if (r === 'eve') add(D.dt(D.add(it.date, -1), st.eveTime));
      else if (r === 'morn') add(D.dt(it.date, it.start && D.toMin(it.start) < D.toMin(st.morningTime) ? D.addMin(it.start, -30) : st.morningTime));
      else add(new Date(base.getTime() - (+r) * 60000));
    });
    if (it.nag) nagTimes(it.date, it.start).forEach(d => add(d));
  }
  if (open) (it.subtasks || []).forEach(s => {
    if (s.done || isBlocked(it, s) || !s.due) return;
    const label = '☐ ' + s.text + ' — ' + t('срок') + ' ' + (s.time ? s.time : D.short(s.due));
    add(s.time ? new Date(D.dt(s.due, s.time).getTime() - 60 * 60000) : D.dt(s.due, st.morningTime), label);
    if (it.priority !== 'normal') add(D.dt(D.add(s.due, -1), st.eveTime), label);
    if (it.nag) nagTimes(s.due, s.time).forEach(d => add(d, label));
  });
  if (open && it.customRemind) add(new Date(it.customRemind));
  const min = Date.now() - 86400000;
  it.remindTimes = Array.from(new Set(out)).filter(x => Date.parse(x) > min).sort().slice(0, 150);
  it.remindLabels = {}; it.remindTimes.forEach(x => { if (lab[x]) it.remindLabels[x] = lab[x]; });
}
function nextRemindISO(it) { const now = Date.now(); return (it.remindTimes || []).find(x => Date.parse(x) > now) || null; }
function reminderTitle(it) {
  const s = startAt(it); if (!s) return it.title;
  const m = Math.round((s.getTime() - Date.now()) / 60000);
  let when;
  if (m <= 0 && it.date === D.today()) when = it.start ? t('Сейчас') : t('Сегодня');
  else if (m <= 0) when = t('Не выполнено');
  else if (m < 60) when = t('Через {n} мин', { n: m });
  else if (it.date === D.today()) when = t('Сегодня в {t}', { t: it.start || '' });
  else if (it.date === D.add(D.today(), 1)) when = t('Завтра') + (it.start ? ' ' + t('в {t}', { t: it.start }) : '');
  else when = D.human(it.date) + (it.start ? ' ' + t('в {t}', { t: it.start }) : '');
  const p = it.priority === 'critical' ? '🔴 ' : it.priority === 'high' ? '🟠 ' : '🔔 ';
  return p + when + ': ' + it.title;
}

/* ---------- busy / conflicts / free slots ---------- */
function busy(date, excludeId) {
  return S.items.filter(i => !i.deleted && isTaskKind(i) && i.date === date && i.start && i.end && i.id !== excludeId && i.status !== 'done' && i.status !== 'cancelled')
    .map(i => ({ s: D.toMin(i.start), e: D.toMin(i.end), it: i })).sort((a, b) => a.s - b.s);
}
function conflicts(date, start, end, excludeId) {
  if (!date || !start || !end) return [];
  const s = D.toMin(start), e = D.toMin(end);
  return busy(date, excludeId).filter(b => s < b.e && b.s < e).map(b => b.it);
}
function gapStarts(a, b, dur, max) {
  const r = [a]; let x = Math.ceil((a + 1) / 60) * 60;
  while (x + dur <= b && r.length < max) { if (x !== a) r.push(x); x += 60; }
  return r;
}
function freeSlots(date, dur, opt = {}) {
  const ws = D.toMin(S.set.workStart || '09:00'), we = D.toMin(S.set.workEnd || '19:00');
  let cur = ws;
  if (date === D.today()) cur = Math.max(ws, Math.ceil((D.nowMin() + 5) / 15) * 15);
  if (date < D.today()) return [];
  const out = [], perGap = opt.perGap || 3;
  for (const x of busy(date, opt.exclude)) {
    if (x.e <= cur) continue;
    const gEnd = Math.min(x.s, we);
    if (gEnd - cur >= dur) out.push(...gapStarts(cur, gEnd, dur, perGap));
    cur = Math.max(cur, x.e);
    if (cur >= we) break;
  }
  if (we - cur >= dur) out.push(...gapStarts(cur, we, dur, perGap));
  return out.slice(0, opt.limit || 6).map(s => ({ date, start: D.fromMin(s), end: D.fromMin(s + dur) }));
}
function findAhead(dur, from, to, limit = 6, exclude, perDay = 2) {
  const out = []; let d = from;
  for (let k = 0; k < 90 && d <= to && out.length < limit; k++) { out.push(...freeSlots(d, dur, { exclude, limit: perDay, perGap: 1 })); d = D.add(d, 1); }
  return out.slice(0, limit);
}
function slotLabel(s, withDate) { return (withDate ? D.human(s.date) + ' ' : '') + s.start + '–' + s.end; }

/* ---------- lists ---------- */
function currentItem() {
  const nm = D.nowMin();
  return sortItems(itemsOn(D.today()).filter(i => i.status !== 'cancelled' && i.status !== 'done' && i.start && i.end && D.toMin(i.start) <= nm && nm < D.toMin(i.end)))[0] || null;
}
function nextToday() { const nm = D.nowMin(); return sortItems(itemsOn(D.today()).filter(i => isOpen(i) && i.start && D.toMin(i.start) > nm))[0] || null; }
function upcoming(days = 14, limit = 6) { const td = D.today(), to = D.add(td, days); return sortByDate(S.items.filter(i => isOpen(i) && i.date && i.date > td && i.date <= to)).slice(0, limit); }
function overdueList() { return S.items.filter(isOverdue).sort((a, b) => endAt(b) - endAt(a)); }
function importantList() { const td = D.today(); return sortByDate(S.items.filter(i => isOpen(i) && i.priority !== 'normal' && i.date !== td && !isOverdue(i))).slice(0, 5); }

/* ---------- recurrence ---------- */
function nextOccurrence(it) {
  const r = it.repeat || { type: 'none' };
  if (r.type === 'none' || !it.date) return null;
  const d = D.parse(it.date);
  const step = () => d.setDate(d.getDate() + 1);
  switch (r.type) {
    case 'daily': step(); break;
    case 'weekdays': do step(); while (d.getDay() === 0 || d.getDay() === 6); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    case 'days': { const days = (r.days && r.days.length) ? r.days : [d.getDay()]; let g = 0; do { step(); g++; } while (!days.includes(d.getDay()) && g < 8); break; }
    case 'interval': d.setDate(d.getDate() + Math.max(1, +r.interval || 1)); break;
    default: return null;
  }
  return D.fmt(d);
}
async function setStatus(it, st, opt = {}) {
  const was = it.status;
  it.status = st;
  if (st === 'done') it.doneAt = new Date().toISOString();
  if (st === 'cancelled') { it.cancelledAt = new Date().toISOString(); it.cancelPct = progress(it) || 0; if (opt.reason != null) it.cancelReason = opt.reason; }
  if (st !== 'cancelled' && was === 'cancelled') { it.cancelReason = ''; it.cancelledAt = null; }
  if (st === 'done' && was !== 'done' && it.repeat && it.repeat.type !== 'none' && it.date) {
    const nd = nextOccurrence(it);
    if (nd) {
      const n = clone(it);
      const shift = D.diffDays(it.date, nd);
      Object.assign(n, { id: uid(), date: nd, status: 'todo', doneAt: null, created: new Date().toISOString(), recording: null, transcript: '', summary: null, proposed: [], customRemind: null });
      n.subtasks = (n.subtasks || []).map(s => Object.assign({}, s, { done: false, doneAt: null, due: s.due ? D.add(s.due, shift) : null }));
      delete n._dirty;
      await saveItem(n, { render: false });
      it.repeat = { type: 'none' };
      toast(t('Следующий повтор: {d}', { d: D.human(nd) }));
    }
  }
  await saveItem(it);
}
async function askCancelReason(it) {
  const v = await dialog({
    title: t('Отменить задачу?'),
    text: t('Выполнено на момент отмены: {p}%. Причина сохранится в карточке.', { p: progress(it) || 0 }),
    html: `<textarea class="inp" id="cancel_r" placeholder="${esc(t('Причина отмены (необязательно)'))}" style="min-height:80px">${esc(it.cancelReason || '')}</textarea>`,
    buttons: [{ l: t('Отменить задачу'), d: 1, v: sh => ({ reason: $('#cancel_r', sh).value.trim() }) }, { l: t('Назад'), v: null }]
  });
  if (!v) return false;
  await setStatus(it, 'cancelled', { reason: v.reason });
  toast(t('Задача отменена'));
  return true;
}
async function toggleDone(id) {
  const it = getItem(id); if (!it) return;
  if (it.status === 'done') { await setStatus(it, (it.subtasks || []).some(s => s.done) ? 'progress' : 'todo'); return; }
  const open = (it.subtasks || []).filter(s => !s.done);
  if (open.length) {
    const v = await dialog({ title: t('Отметить задачу выполненной?'), text: t('Не выполнено подзадач: {n} из {m}.', { n: open.length, m: it.subtasks.length }), buttons: [{ l: t('Да, всё выполнено'), v: 'all', p: 1 }, { l: t('Открыть задачу'), v: 'open' }, { l: t('Отмена'), v: null }] });
    if (v === 'open') return openItem(id);
    if (v !== 'all') return;
    open.forEach(s => { s.done = true; s.doneAt = new Date().toISOString(); });
  }
  await setStatus(it, 'done'); toast(t('Готово ✓'));
}

/* ---------- smart rescheduling ---------- */
async function smartReschedule(id) {
  const it = getItem(id); if (!it) return;
  const od = overdueSubs(it);
  if (od.length) {
    const v = await dialog({ title: t('Просроченные подзадачи'), text: od.map(s => '• ' + esc(s.text) + ' — ' + esc(D.human(s.due))).join('<br>'), buttons: [{ l: t('Перенести на завтра'), v: 'tm', p: 1 }, { l: t('Открыть задачу'), v: 'open' }, { l: t('Отмена'), v: null }] });
    if (v === 'tm') { od.forEach(s => { s.due = D.add(D.today(), 1); }); await saveItem(it); toast(t('Перенесено на завтра')); }
    else if (v === 'open') openItem(id);
    return;
  }
  const dur = (it.start && it.end) ? Math.max(15, D.toMin(it.end) - D.toMin(it.start)) : S.set.defaultDur;
  const s = findAhead(dur, D.today(), D.add(D.today(), 14), 1, it.id, 1)[0];
  if (!s) { toast(t('Свободных окон на 2 недели вперёд нет')); return; }
  const v = await dialog({
    title: t('Перенести задачу?'),
    text: t('«{x}» просрочена. Ближайшее свободное окно — {s}.', { x: esc(it.title), s: '<b>' + slotLabel(s, true) + '</b>' }),
    buttons: [{ l: t('Перенести на {s}', { s: slotLabel(s, true) }), v: 'ok', p: 1 }, { l: t('Выбрать другое время'), v: 'pick' }, { l: t('Отмена'), v: null }]
  });
  if (v === 'ok') { Object.assign(it, { date: s.date, start: s.start, end: s.end }); await saveItem(it); toast(t('Перенесено: {s}', { s: slotLabel(s, true) })); }
  else if (v === 'pick') openEditor(it.kind, it);
}

/* ---------- conflict resolution (editor, voice, AI) ---------- */
async function resolveConflicts(d) {
  for (let guard = 0; guard < 6; guard++) {
    if (!d.date || !d.start || !d.end) return d;
    const cs = conflicts(d.date, d.start, d.end, d.id);
    if (!cs.length) return d;
    const dur = D.toMin(d.end) - D.toMin(d.start);
    let other = false;
    let slots = freeSlots(d.date, dur, { exclude: d.id, limit: 3 });
    if (!slots.length) { slots = findAhead(dur, D.add(d.date, 1), D.add(d.date, 10), 3, d.id, 1); other = true; }
    const busyTxt = cs.map(c => `<b>${esc(c.title)}</b> (${c.start}–${c.end})`).join(', ');
    const freeTxt = slots.length ? ' ' + t('Свободно: {s}.', { s: slots.map(s => slotLabel(s, other)).join(', ') }) : ' ' + t('Свободных окон рядом не нашлось.');
    const v = await dialog({
      title: t('Это время занято'),
      text: t('{d} с {a} до {b} у вас уже {x}.', { d: D.human(d.date), a: d.start, b: d.end, x: busyTxt }) + freeTxt,
      buttons: [...slots.map(s => ({ l: t('Поставить на {s}', { s: slotLabel(s, other) }), v: { slot: s }, p: 1 })), { l: t('Выбрать другое время'), v: 'pick' }, { l: t('Всё равно поставить'), v: 'force' }, { l: t('Отмена'), v: null }]
    });
    if (!v) return null;
    if (v === 'force') return d;
    if (v === 'pick') { const x = await askDateTime(d, dur); if (!x) return null; Object.assign(d, x); continue; }
    Object.assign(d, { date: v.slot.date, start: v.slot.start, end: v.slot.end });
    return d;
  }
  return d;
}
