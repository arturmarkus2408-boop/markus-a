'use strict';
/* ============================================================================
   v4.3: «Радар долгов» — how many tasks are overdue and since when.
   One glance: a big number with a mood, a bar «эта неделя · этот месяц · раньше»
   and a ring «сдано вовремя за 30 дней». A tap opens Задачи → Просрочено.
   The same number is shown as a red badge on the «Задачи» tab.
   ========================================================================== */
function debtStats() {
  const td = D.today(), ws = D.weekStart(td), ms = td.slice(0, 8) + '01';
  const od = overdueList();
  const dueDay = i => D.fmt(endAt(i));
  const g = { today: 0, week: 0, month: 0, older: 0 };
  let oldest = null;
  od.forEach(i => {
    const d = dueDay(i);
    if (d >= td) g.today++; else if (d >= ws) g.week++; else if (d >= ms) g.month++; else g.older++;
    if (!oldest || d < oldest) oldest = d;
  });
  // on time over the last 30 days: done before (or on) the deadline
  const from = Date.now() - 30 * 86400000;
  let onTime = 0, late = 0;
  S.items.forEach(i => {
    if (i.deleted || !isTaskKind(i) || i.status !== 'done' || !i.date || !i.doneAt || i.reminder) return;
    const done = Date.parse(i.doneAt); if (!(done >= from)) return;
    if (done <= endAt(i).getTime() + 60000) onTime++; else late++;
  });
  const total = onTime + late;
  return { n: od.length, g, oldest, onTime, late, rate: total ? Math.round(onTime / total * 100) : null };
}
function debtMood(n) {
  if (!n) return ['🎉', t('Долгов нет'), t('Всё сделано в срок — так держать!')];
  if (n <= 2) return ['🙂', t('Почти чисто'), t('Пара хвостов — закройте сегодня')];
  if (n <= 6) return ['😬', t('Пора разгрести'), t('Начните с самых старых')];
  return ['🔥', t('Завал'), t('Перенесите лишнее, остальное — по одной')];
}
function debtRing(rate) {
  const r = 22, c = 2 * Math.PI * r, v = rate == null ? 0 : rate / 100;
  const col = rate == null ? 'var(--txt3)' : rate >= 80 ? 'var(--grn)' : rate >= 50 ? 'var(--ylw)' : 'var(--red)';
  return `<svg class="dr-ring" viewBox="0 0 56 56" width="56" height="56" aria-hidden="true"><circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--brd)" stroke-width="6"/><circle cx="28" cy="28" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(c * v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 28 28)"/><text x="28" y="32" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor">${rate == null ? '—' : rate + '%'}</text></svg>`;
}
function debtCardHTML() {
  const s = debtStats(), [emo, head, sub] = debtMood(s.n);
  const parts = [['today', 'сегодня', 'var(--red)'], ['week', 'эта неделя', 'var(--ora)'], ['month', 'этот месяц', 'var(--ylw)'], ['older', 'раньше', '#94a3b8']].filter(([k]) => s.g[k]);
  const bar = s.n ? `<div class="dr-bar">${parts.map(([k, , c]) => `<i style="flex:${s.g[k]};background:${c}"></i>`).join('')}</div>
    <div class="dr-leg">${parts.map(([k, l, c]) => `<span><i style="background:${c}"></i>${t(l)} <b>${s.g[k]}</b></span>`).join('')}</div>` : '';
  const old = s.oldest ? `<div class="dr-old">${t('Самый старый долг — с {d}', { d: esc(D.human(s.oldest)) })}</div>` : '';
  return `<button class="debt ${s.n ? 'has' : 'zero'}" onclick="S.taskFilter='overdue';go('tasks')" aria-label="${esc(t('Просрочено: {n}', { n: s.n }))}">
    <div class="dr-top"><div class="dr-num"><b>${s.n}</b><span>${t('просрочено')}</span></div>
      <div class="dr-mood"><b>${emo} ${esc(head)}</b><span>${esc(sub)}</span></div>
      <div class="dr-rate">${debtRing(s.rate)}<span>${t('вовремя')}<br>${t('за 30 дн.')}</span></div></div>
    ${bar}${old}</button>`;
}
function overdueCount() { try { return overdueList().length; } catch (e) { return 0; } }
