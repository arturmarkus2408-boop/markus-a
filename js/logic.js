'use strict';
const PRIO = { normal: { l: 'Обычная', c: '#64748b' }, high: { l: 'Важная', c: '#f97316' }, critical: { l: 'Критическая', c: '#ef4444' } };
const STATUS = { todo: 'К выполнению', progress: 'В работе', done: 'Готово', cancelled: 'Отменена' };
const REPEAT = { none: 'Не повторять', daily: 'Каждый день', weekdays: 'По будням', weekly: 'Каждую неделю', monthly: 'Каждый месяц', days: 'По дням недели', interval: 'Каждые N дней' };
const REMIND_OPTS = [[0, 'В момент'], [5, 'За 5 мин'], [10, 'За 10 мин'], [30, 'За 30 мин'], [60, 'За 1 час'], [1440, 'За 1 день']];
const prioRank = i => ({ normal: 0, high: 1, critical: 2 }[i.priority] || 0);

function catOf(it) { const cs = S.set.categories; return cs.find(c => c.id === it.category) || cs[0]; }
function isOpen(it) { return !it.deleted && it.kind !== 'note' && it.status !== 'done' && it.status !== 'cancelled'; }
function startAt(it) { return it.date ? D.dt(it.date, it.start || '00:00') : null; }
function endAt(it) { return it.date ? D.dt(it.date, it.end || it.start || '23:59') : null; }
function isOverdue(it) { return isOpen(it) && !!it.date && endAt(it).getTime() < Date.now(); }
function itemsOn(date) { return S.items.filter(i => !i.deleted && i.kind !== 'note' && i.date === date); }
function sortItems(a) {
  return a.slice().sort((x, y) => (x.start || '99:99').localeCompare(y.start || '99:99') || (prioRank(y) - prioRank(x)) || (x.title || '').localeCompare(y.title || ''));
}
function sortByDate(a, desc) {
  const k = i => (i.date || '9999') + (i.start || '99:99');
  return a.slice().sort((x, y) => desc ? k(y).localeCompare(k(x)) : k(x).localeCompare(k(y)));
}
function timeLabel(it) { return it.start ? it.start + (it.end && it.end !== it.start ? '–' + it.end : '') : ''; }
function whenLabel(it) { return it.date ? D.human(it.date) + (it.start ? ', ' + timeLabel(it) : '') : 'Без даты'; }

/* ---------- reminders ---------- */
function computeReminders(it) {
  const times = [];
  if (it.kind !== 'note' && it.date && it.status !== 'done' && it.status !== 'cancelled' && !it.deleted) {
    const base = D.dt(it.date, it.start || '09:00');
    (it.reminders || []).forEach(m => times.push(new Date(base.getTime() - m * 60000).toISOString()));
  }
  if (it.customRemind && it.status !== 'done' && it.status !== 'cancelled') times.push(new Date(it.customRemind).toISOString());
  it.remindTimes = Array.from(new Set(times)).sort();
}
function nextRemindISO(it) { const now = Date.now(); return (it.remindTimes || []).find(t => Date.parse(t) > now) || null; }
function reminderTitle(it) {
  const s = startAt(it); if (!s) return it.title;
  const m = Math.round((s.getTime() - Date.now()) / 60000);
  let when;
  if (m <= 0) when = 'Сейчас';
  else if (m < 60) when = 'Через ' + m + ' мин';
  else if (m < 24 * 60 && it.date === D.today()) when = 'Сегодня в ' + (it.start || '');
  else if (it.date === D.add(D.today(), 1)) when = 'Завтра' + (it.start ? ' в ' + it.start : '');
  else when = D.human(it.date) + (it.start ? ' в ' + it.start : '');
  const p = it.priority === 'critical' ? '🔴 ' : it.priority === 'high' ? '🟠 ' : '🔔 ';
  return p + when + ': ' + it.title;
}

/* ---------- busy / conflicts / free slots ---------- */
function busy(date, excludeId) {
  return S.items.filter(i => !i.deleted && i.kind !== 'note' && i.date === date && i.start && i.end && i.id !== excludeId && i.status !== 'done' && i.status !== 'cancelled')
    .map(i => ({ s: D.toMin(i.start), e: D.toMin(i.end), it: i })).sort((a, b) => a.s - b.s);
}
function conflicts(date, start, end, excludeId) {
  if (!date || !start || !end) return [];
  const s = D.toMin(start), e = D.toMin(end);
  return busy(date, excludeId).filter(b => s < b.e && b.s < e).map(b => b.it);
}
function gapStarts(a, b, dur, max) {
  const r = [a];
  let t = Math.ceil((a + 1) / 60) * 60;
  while (t + dur <= b && r.length < max) { if (t !== a) r.push(t); t += 60; }
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
  for (let k = 0; k < 90 && d <= to && out.length < limit; k++) {
    out.push(...freeSlots(d, dur, { exclude, limit: perDay, perGap: 1 }));
    d = D.add(d, 1);
  }
  return out.slice(0, limit);
}
function slotLabel(s, withDate) { return (withDate ? D.human(s.date) + ' ' : '') + s.start + '–' + s.end; }

/* ---------- lists ---------- */
function currentItem() {
  const nm = D.nowMin();
  return sortItems(itemsOn(D.today()).filter(i => i.status !== 'cancelled' && i.status !== 'done' && i.start && i.end && D.toMin(i.start) <= nm && nm < D.toMin(i.end)))[0] || null;
}
function nextToday() { const nm = D.nowMin(); return sortItems(itemsOn(D.today()).filter(i => isOpen(i) && i.start && D.toMin(i.start) > nm))[0] || null; }
function upcoming(days = 14, limit = 6) { const t = D.today(), to = D.add(t, days); return sortByDate(S.items.filter(i => isOpen(i) && i.date && i.date > t && i.date <= to)).slice(0, limit); }
function overdueList() { return S.items.filter(isOverdue).sort((a, b) => endAt(b) - endAt(a)); }
function importantList() { const t = D.today(); return sortByDate(S.items.filter(i => isOpen(i) && i.priority !== 'normal' && i.date !== t && !isOverdue(i))).slice(0, 5); }

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
    case 'days': { const days = (r.days && r.days.length) ? r.days : [d.getDay()]; let g = 0; do { step(); g++; } while (!days.includes(d.getDay()) && g < 8); break; }
    case 'interval': d.setDate(d.getDate() + Math.max(1, +r.interval || 1)); break;
    default: return null;
  }
  return D.fmt(d);
}
async function setStatus(it, st) {
  const was = it.status;
  it.status = st;
  if (st === 'done' && was !== 'done' && it.repeat && it.repeat.type !== 'none' && it.date) {
    const nd = nextOccurrence(it);
    if (nd) {
      const n = clone(it);
      Object.assign(n, { id: uid(), date: nd, status: 'todo', created: new Date().toISOString(), recording: null, transcript: '', summary: null, proposed: [], customRemind: null });
      n.subtasks = (n.subtasks || []).map(s => Object.assign({}, s, { done: false }));
      delete n._dirty;
      await saveItem(n, { render: false });
      it.repeat = { type: 'none' };
      toast('Следующий повтор: ' + D.human(nd));
    }
  }
  await saveItem(it);
}
async function toggleDone(id) {
  const it = getItem(id); if (!it) return;
  if (it.status === 'done') await setStatus(it, 'todo');
  else { await setStatus(it, 'done'); toast('Готово ✓'); }
}

/* ---------- smart rescheduling ---------- */
async function smartReschedule(id) {
  const it = getItem(id); if (!it) return;
  const dur = (it.start && it.end) ? Math.max(15, D.toMin(it.end) - D.toMin(it.start)) : S.set.defaultDur;
  const s = findAhead(dur, D.today(), D.add(D.today(), 14), 1, it.id, 1)[0];
  if (!s) { toast('Свободных окон на 2 недели вперёд нет'); return; }
  const v = await dialog({
    title: 'Перенести задачу?',
    text: `«${esc(it.title)}» ${isOverdue(it) ? 'просрочена' : ''}. Ближайшее свободное окно — <b>${slotLabel(s, true)}</b>.`,
    buttons: [{ l: 'Перенести на ' + slotLabel(s, true), v: 'ok', p: 1 }, { l: 'Выбрать другое время', v: 'pick' }, { l: 'Отмена', v: null }]
  });
  if (v === 'ok') { Object.assign(it, { date: s.date, start: s.start, end: s.end }); await saveItem(it); toast('Перенесено: ' + slotLabel(s, true)); }
  else if (v === 'pick') openEditor(it.kind, it);
}

/* ---------- conflict resolution (used by editor, voice, AI) ---------- */
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
    const freeTxt = slots.length ? ` Свободно: ${slots.map(s => slotLabel(s, other)).join(', ')}.` : ' Свободных окон рядом не нашлось.';
    const v = await dialog({
      title: 'Это время занято',
      text: `${D.human(d.date)} с ${d.start} до ${d.end} у вас уже ${busyTxt}.${freeTxt}`,
      buttons: [...slots.map(s => ({ l: 'Поставить на ' + slotLabel(s, other), v: { slot: s }, p: 1 })), { l: 'Выбрать другое время', v: 'pick' }, { l: 'Всё равно поставить', v: 'force' }, { l: 'Отмена', v: null }]
    });
    if (!v) return null;
    if (v === 'force') return d;
    if (v === 'pick') { const t = await askDateTime(d, dur); if (!t) return null; Object.assign(d, t); continue; }
    Object.assign(d, { date: v.slot.date, start: v.slot.start, end: v.slot.end });
    return d;
  }
  return d;
}
