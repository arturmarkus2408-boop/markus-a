'use strict';
/* ============================================================================
   v4.3: tasks from a meeting reach the calendar ONLY after your tick.
   After the summary MARKUS-A shows «Задачи и сроки из встречи»: every task with its deadline,
   a tick to approve it and a pencil to correct it. Nothing is ticked by itself —
   what is not ticked stays out of the calendar.
   Also here: the «Выполнено» button for tasks and the status of a meeting.
   ========================================================================== */
const PROP_TYPES = [['task', 'Задача', 'check'], ['meeting', 'Встреча', 'users'], ['control', 'Проконтролировать', 'clock']];
function propIcon(x) { return x.type === 'meeting' ? 'users' : x.type === 'control' ? 'clock' : 'check'; }
function propWhen(x) {
  if (!x.date) return { txt: t('без срока'), cls: 'none' };
  const tm = x.start ? ', ' + x.start : x.dueTime ? ', ' + t('до {t}', { t: x.dueTime }) : '';
  const past = x.date < D.today();
  return { txt: D.human(x.date) + tm, cls: past ? 'past' : x.date === D.today() ? 'soon' : '' };
}
function propCounts(m) {
  const p = m.proposed || [];
  return { all: p.length, fresh: p.filter(x => x.state === 'new').length, pick: p.filter(x => x.state === 'new' && x.pick).length, made: p.filter(x => x.state === 'created').length };
}
/* the block on the meeting screen */
function proposalsHTML(m) {
  const p = m.proposed || [], c = propCounts(m);
  if (!p.length) return `<div class="hint">${t('AI не нашёл поручений в этой встрече')}</div>`;
  const order = p.map((x, i) => ({ x, i })).sort((a, b) => (a.x.state === 'new' ? 0 : a.x.state === 'created' ? 1 : 2) - (b.x.state === 'new' ? 0 : b.x.state === 'created' ? 1 : 2) || String(a.x.date || '9999').localeCompare(String(b.x.date || '9999')));
  const row = ({ x, i }) => {
    const w = propWhen(x), meta = [x.who ? esc(x.who) : '', x.type === 'control' ? t('пообещал собеседник') : x.type === 'meeting' ? t('новая встреча') : ''].filter(Boolean).join(' · ');
    if (x.state === 'created') {
      const it = x.itemId && getItem(x.itemId);
      return `<div class="prop-row made"><span class="pchk on">${ic('checkmark', 14)}</span><div class="prop-b"${it ? ` data-open="${it.id}"` : ''}><b>${esc(x.title)}</b><span class="prop-m"><span class="due">${ic('calendar', 12)} ${esc(it ? whenLabel(it) : w.txt)}</span>${it && it.status === 'done' ? ` · <span class="okc">${t('выполнено')}</span>` : ` · ${t('в календаре')}`}</span></div></div>`;
    }
    if (x.state === 'skipped') return `<div class="prop-row skip"><span class="pchk"></span><div class="prop-b"><b>${esc(x.title)}</b><span class="prop-m">${t('отклонено')}</span></div><button class="link" onclick="propRestore('${m.id}',${i})">${t('Вернуть')}</button></div>`;
    return `<div class="prop-row ${x.pick ? 'on' : ''}">
      <button class="pchk ${x.pick ? 'on' : ''}" role="checkbox" aria-checked="${x.pick ? 'true' : 'false'}" aria-label="${esc(t('Добавить в календарь'))}" onclick="propToggle('${m.id}',${i})">${x.pick ? ic('checkmark', 14) : ''}</button>
      <div class="prop-b" onclick="propToggle('${m.id}',${i})"><b><span class="pti">${ic(propIcon(x), 13)}</span>${esc(x.title)}</b>
        <span class="prop-m"><span class="due ${w.cls}">${ic('calendar', 12)} ${esc(w.txt)}${w.cls === 'past' ? ' · ' + t('дата уже прошла') : ''}</span>${meta ? ' · ' + meta : ''}</span>
        ${x.notes ? `<span class="prop-n">${esc(String(x.notes).slice(0, 160))}</span>` : ''}</div>
      <button class="xbtn prop-ed" onclick="propEdit('${m.id}',${i})" aria-label="${esc(t('Изменить'))}">${ic('edit', 16)}</button></div>`;
  };
  const head = `<div class="prop-h"><div><b>${t('Задачи и сроки из встречи')}</b><span>${c.fresh ? t('Отметьте галочкой то, что добавить в календарь. Без галочки ничего не добавится. Карандаш — поправить название, дату или срок.') : c.made ? t('Одобренные задачи уже в календаре.') : ''}</span></div>${c.fresh > 1 ? `<button class="link" onclick="propPickAll('${m.id}')">${c.pick === c.fresh ? t('Снять все') : t('Выбрать все')}</button>` : ''}</div>`;
  const foot = c.fresh ? `<div class="prop-f"><button class="btn pri" ${c.pick ? '' : 'disabled'} onclick="propCommit('${m.id}',this)">${ic('calendar', 18)} ${c.pick ? t('Добавить в календарь ({n})', { n: c.pick }) : t('Ничего не отмечено')}</button>${c.fresh > c.pick ? `<button class="link prop-skip" onclick="propSkipRest('${m.id}')" aria-label="${esc(t('Отклонить неотмеченные'))}">${c.pick ? t('Отклонить остальные') : t('Отклонить все')}</button>` : ''}</div>` : '';
  return `<div class="prop-card" id="prop_${m.id}">${head}<div class="prop-list">${order.map(row).join('')}</div>${foot}</div>`;
}
function propRedraw(id) {
  const m = getItem(id), box = document.getElementById('prop_' + id);
  if (m && box) box.outerHTML = proposalsHTML(m); else if (S.route === 'meeting') render();
}
async function propToggle(id, i) { const m = getItem(id), x = m && m.proposed[i]; if (!x || x.state !== 'new') return; x.pick = !x.pick; await saveItem(m, { render: false }); propRedraw(id); }
async function propPickAll(id) { const m = getItem(id); const fresh = m.proposed.filter(x => x.state === 'new'); const all = fresh.every(x => x.pick); fresh.forEach(x => { x.pick = !all; }); await saveItem(m, { render: false }); propRedraw(id); }
async function propRestore(id, i) { const m = getItem(id); const x = m.proposed[i]; x.state = 'new'; x.pick = false; await saveItem(m, { render: false }); propRedraw(id); }
async function propSkipRest(id) {
  const m = getItem(id), rest = m.proposed.filter(x => x.state === 'new' && !x.pick);
  if (!rest.length) return;
  const v = await dialog({ title: t('Отклонить неотмеченные ({n})?', { n: rest.length }), text: esc(t('Они не попадут в календарь. Вернуть можно кнопкой «Вернуть».')), buttons: [{ l: t('Отклонить'), v: 1, p: 1 }, { l: t('Отмена'), v: 0 }] });
  if (!v) return;
  rest.forEach(x => { x.state = 'skipped'; });
  await saveItem(m, { render: false }); propRedraw(id);
}
/* only what is ticked goes into the calendar */
async function propCommit(id, btn) {
  const m = getItem(id); if (!m) return;
  const pick = m.proposed.map((x, i) => ({ x, i })).filter(({ x }) => x.state === 'new' && x.pick);
  if (!pick.length) return toast(t('Отметьте галочкой задачи, которые добавить'));
  let n = 0, warn = 0;
  for (const { x } of pick) {
    const it = proposedToItem(x, m);
    if (it.date && it.start && conflicts(it.date, it.start, it.end, it.id).length) warn++;
    await saveItem(it, { render: false });
    x.state = 'created'; x.itemId = it.id; delete x.pick; n++;
  }
  await saveItem(m);
  toast(t('Добавлено в календарь: {n}', { n }) + (warn ? ' · ' + t('пересечений по времени: {w} — проверьте календарь', { w: warn }) : ''), 4500);
  propRedraw(id);
}
/* the pencil: correct a proposed task before it goes into the calendar */
function propEdit(id, i) {
  const m = getItem(id), x0 = m && m.proposed[i]; if (!x0) return;
  const x = clone(x0);
  const sh = openSheet(`
    <div class="sh-h"><b>${t('Задача из встречи')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <label class="lbl">${t('Что сделать')}</label><textarea class="inp" id="pe_title" rows="2">${esc(x.title || '')}</textarea>
    <label class="lbl">${t('Вид')}</label>
    <div class="seg" id="pe_type">${PROP_TYPES.map(([k, l]) => `<button data-v="${k}" class="${(x.type || 'task') === k ? 'on' : ''}">${t(l)}</button>`).join('')}</div>
    <div class="g2"><div><label class="lbl">${t('Дата / срок')}</label><input class="inp" type="date" id="pe_date" value="${esc(x.date || '')}"></div>
      <div><label class="lbl" id="pe_tl">${(x.type || 'task') === 'meeting' ? t('Время начала') : t('Срок до (время)')}</label><input class="inp" type="time" id="pe_time" value="${esc((x.type === 'meeting' ? x.start : (x.dueTime || x.start)) || '')}"></div></div>
    <div class="chips wrapchips" style="margin-top:8px">${[['Сегодня', 0], ['Завтра', 1], ['Через 3 дня', 3], ['Через неделю', 7]].map(([l, d]) => `<button class="chip" data-d="${d}">${t(l)}</button>`).join('')}<button class="chip" data-d="x">${t('Без срока')}</button></div>
    <label class="lbl">${t('Важность')}</label>
    <div class="seg" id="pe_prio">${Object.keys(PRIO).map(k => `<button data-v="${k}" class="${(x.priority || 'normal') === k ? 'on' : ''}">${t(PRIO[k].l)}</button>`).join('')}</div>
    <label class="lbl">${t('Кто исполняет')}</label><input class="inp" id="pe_who" value="${esc(x.who || '')}">
    <label class="lbl">${t('Детали')}</label><textarea class="inp" id="pe_notes" rows="3">${esc(x.notes || x.goals || '')}</textarea>
    <div class="sh-foot"><button class="btn ghost" id="pe_skip">${t('Отклонить')}</button><button class="btn pri" style="flex:1" id="pe_save">${ic('checkmark', 18)} ${t('Сохранить и отметить')}</button></div>`, { cls: 'tall' });
  const segPick = (sel, cb) => $$(sel + ' button', sh).forEach(b => b.onclick = () => { $$(sel + ' button', sh).forEach(y => y.classList.toggle('on', y === b)); cb(b.dataset.v); });
  segPick('#pe_type', v => { x.type = v; $('#pe_tl', sh).textContent = v === 'meeting' ? t('Время начала') : t('Срок до (время)'); });
  segPick('#pe_prio', v => { x.priority = v; });
  $$('.chips .chip', sh).forEach(b => b.onclick = () => { $('#pe_date', sh).value = b.dataset.d === 'x' ? '' : D.add(D.today(), +b.dataset.d); });
  $('#pe_skip', sh).onclick = async () => { x0.state = 'skipped'; delete x0.pick; await saveItem(m, { render: false }); closeSheet(); propRedraw(id); };
  $('#pe_save', sh).onclick = async () => {
    const title = $('#pe_title', sh).value.trim(); if (!title) return toast(t('Напишите, что сделать'));
    const date = $('#pe_date', sh).value || null, tm = $('#pe_time', sh).value || null;
    Object.assign(x0, { title, type: x.type || 'task', date, priority: x.priority || 'normal', who: $('#pe_who', sh).value.trim(), notes: $('#pe_notes', sh).value.trim(), pick: true, edited: true });
    if (x0.type === 'meeting') { x0.start = tm; x0.dueTime = null; if (tm && !x0.end) x0.end = D.addMin(tm, S.set.defaultDur || 60); if (!tm) x0.end = null; x0.goals = x0.notes; }
    else { x0.dueTime = tm; x0.start = null; x0.end = null; }
    await saveItem(m, { render: false }); closeSheet(); propRedraw(id);
    toast(t('Сохранено и отмечено ✓'));
  };
}

/* ---------- a meeting: «состоялась» / back to plans ---------- */
function meetStatusHTML(m) {
  if (m.status === 'cancelled') return `<div class="mstat"><span class="tag">${t('Отменена')}</span><button class="link" onclick="meetStatus('${m.id}','todo')">${t('Вернуть в планы')}</button></div>`;
  if (m.status === 'done') return `<div class="mstat"><span class="tag grn">${ic('checkmark', 12)} ${t('Встреча состоялась')}${m.doneAt ? ' · ' + esc(D.human(m.doneAt.slice(0, 10))) : ''}</span><button class="link" onclick="meetStatus('${m.id}','todo')">${t('Отменить отметку')}</button></div>`;
  // a meeting that has not started yet gets a quiet link, one that has — the big button
  if (m.date && startAt(m) > Date.now()) return `<div class="mstat"><button class="link" onclick="meetStatus('${m.id}','done')">${ic('checkmark', 14)} ${t('Отметить, что встреча состоялась')}</button></div>`;
  return `<div class="mstat"><button class="btn done-big" onclick="meetStatus('${m.id}','done')">${ic('checkmark', 18)} ${t('Встреча состоялась')}</button></div>`;
}
async function meetStatus(id, st) {
  const it = getItem(id); if (!it) return;
  if (await setStatus(it, st)) { toast(st === 'done' ? t('Отмечено: встреча состоялась ✓') : t('Возвращено в планы')); render(); }
}
/* the big «Выполнено» button on top of a task card */
function doneBarHTML(it) {
  if (it.status === 'cancelled') return '';
  if (it.status === 'done') return `<div class="donebar"><button class="btn ghost full" onclick="tdStatus('${it.id}','progress')">${ic('repeat', 16)} ${t('Вернуть в работу')}</button></div>`;
  return `<div class="donebar"><button class="btn done-big full" onclick="tdStatus('${it.id}','done')">${ic('checkmark', 20)} ${t('Выполнено')}</button></div>`;
}
