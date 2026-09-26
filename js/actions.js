'use strict';
/* ============================================================================
   v3.4: actions on every task / meeting (edit · PDF · delete), deleting files
   and recordings (phone + cloud), sending the recording to Telegram,
   and the new, clearer calendar.
   ========================================================================== */

/* ---------- files that belong to an item (documents, place photos, result, recording) ---------- */
function itemFileMetas(it) {
  const out = (typeof allFileMetas === 'function' ? allFileMetas(it) : (it.files || [])).slice();
  if (it.recording && it.recording.fileId) out.push({ id: it.recording.fileId, cloud: it.recording.cloud, parts: it.recording.parts, size: it.recording.size, isRec: true });
  return out;
}
/* removes files from the phone and from the cloud (frees the free 1 GB) */
async function purgeFiles(metas) {
  const paths = [];
  for (const f of metas) {
    if (!f || !f.id) continue;
    await DB.del('files', f.id).catch(() => { });
    if (f.cloud && window.Cloud && Cloud.user) {
      if (f.parts > 1) for (let i = 0; i < f.parts; i++) paths.push(Cloud.user.id + '/' + f.id + '.part' + i);
      else paths.push(Cloud.user.id + '/' + f.id);
    }
  }
  if (paths.length && Cloud.sb) { try { await Cloud.sb.storage.from('files').remove(paths); } catch (e) { } }
}
/* delete a task / meeting / note together with its files, after one clear question */
async function deleteItemFull(id, o = {}) {
  const it = getItem(id); if (!it) return false;
  const metas = itemFileMetas(it);
  const rec = it.recording ? t('запись {d}', { d: fmtDur(it.recording.duration || 0) }) : '';
  const nf = metas.filter(f => !f.isRec).length;
  const what = [rec, nf ? tn(nf, 'файл|файла|файлов') .replace(/^/, nf + ' ') : ''].filter(Boolean).join(', ');
  const kind = it.kind === 'meeting' ? t('встречу') : it.kind === 'note' ? t('заметку') : t('задачу');
  if (!o.noAsk) {
    const v = await dialog({ title: t('Удалить {k} «{x}»?', { k: kind, x: it.title }), text: esc(what ? t('Вместе с ней удалятся: {w}. С телефона и из облака. Отменить будет нельзя.', { w: what }) : t('Отменить будет нельзя.')), buttons: [{ l: t('Удалить'), v: true, d: 1 }, { l: t('Отмена'), v: false }] });
    if (v !== true) return false;
  }
  await deleteItem(it);
  purgeFiles(metas);
  if (typeof closeAllSheets === 'function') closeAllSheets();
  toast(t('Удалено'));
  if (S.route === 'meeting' && S.meetingId === id) { if (typeof goBack === 'function') goBack(); else go('home'); }
  else render();
  return true;
}

/* ---------- one file: delete from the task / meeting / documents ---------- */
async function deleteFile(holderId, fileId) {
  const it = getItem(holderId); if (!it) return;
  const isRec = fileId === 'rec';
  const { f } = findFile(holderId, fileId); if (!f) return;
  const v = await dialog({ title: t('Удалить файл?'), text: esc('«' + f.name + '»\n' + t('Файл удалится с телефона и из облака. Отменить будет нельзя.')), buttons: [{ l: t('Удалить'), v: true, d: 1 }, { l: t('Отмена'), v: false }] });
  if (v !== true) return;
  let meta;
  if (isRec) { meta = { id: it.recording.fileId, cloud: it.recording.cloud, parts: it.recording.parts }; it.recording = null; }
  else {
    const drop = arr => { if (!Array.isArray(arr)) return arr; const k = arr.findIndex(x => x.id === fileId); if (k >= 0) meta = arr.splice(k, 1)[0]; return arr; };
    drop(it.files); (it.locations || []).forEach(p => drop(p.photos)); if (it.result) drop(it.result.files);
  }
  const loneDoc = it.kind === 'note' && it.noteCat === 'Документы' && !(it.files || []).length && !(it.desc || '').trim();
  if (loneDoc) await deleteItem(it); else await saveItem(it, { render: false });
  if (meta) purgeFiles([meta]);
  if (typeof closeSheet === 'function' && Sheets.length) closeSheet();
  toast(t('Файл удалён'));
  render();
}

/* ---------- menu on every task / meeting (⋮ button or long press) ---------- */
async function itemMenu(id) {
  const it = getItem(id); if (!it) return;
  const open = isOpen(it), kind = it.kind;
  const sh = openSheet(`<div class="sh-h"><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${kind === 'meeting' ? ic('users', 16) + ' ' : ''}${esc(it.title)}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="hint" style="margin-top:0">${esc(whenLabel(it) || t('Без даты'))}</div>
    <div class="act3">
      <button class="act" onclick="closeSheet();openEditor('${kind === 'note' ? 'task' : kind}',{id:'${id}'})">${ic('edit', 22)}<span>${t('Изменить')}</span></button>
      <button class="act" onclick="closeSheet();openItemPdf('${id}')">${ic('pdf', 22)}<span>PDF</span></button>
      <button class="act red" onclick="closeSheet();deleteItemFull('${id}')">${ic('trash', 22)}<span>${t('Удалить')}</span></button>
    </div>
    <div class="menu-list">
      <button onclick="closeSheet();openItem('${id}')">${ic('right', 18)} ${t('Открыть')}</button>
      ${kind !== 'note' ? (open ? `<button onclick="closeSheet();toggleDone('${id}')">${ic('checkmark', 18)} ${t('Отметить выполненной')}</button>` : `<button onclick="closeSheet();setStatus(getItem('${id}'),'todo').then(render)">${ic('repeat', 18)} ${t('Вернуть в работу')}</button>`) : ''}
      ${kind !== 'note' && open ? `<button onclick="closeSheet();smartReschedule('${id}')">${ic('calendar', 18)} ${t('Перенести')}</button>` : ''}
      <button onclick="closeSheet();openShare('${id}')">${ic('share', 18)} ${t('Поделиться ссылкой')}</button>
    </div>`);
  return sh;
}
document.addEventListener('contextmenu', e => {
  const x = e.target.closest && e.target.closest('[data-open]');
  if (!x) return;
  e.preventDefault();
  const it = getItem(x.dataset.open);
  if (it && it.kind !== 'contact') itemMenu(it.id);
});

/* ---------- PDF of one task / meeting, with a choice of what to include ---------- */
async function openItemPdf(id) {
  const it = getItem(id); if (!it) return;
  const isM = it.kind === 'meeting', s = it.summary || {};
  const opts = [
    ['desc', isM ? 'Заметки и цели' : 'Описание', !!(it.desc || it.goals)],
    ['subs', 'Подзадачи', (it.subtasks || []).length > 0],
    ['people', 'Участники и места', (it.participants || []).length > 0 || (it.locations || []).length > 0],
    ['files', 'Список материалов и ссылок', (it.files || []).length > 0 || (it.links || []).length > 0],
    ['sum', 'AI-итоги встречи', isM && !!it.summary],
    ['made', 'Задачи и встречи из итогов', isM && (it.proposed || []).length > 0],
    ['tr', 'Стенограмма (полный текст)', isM && !!it.transcript],
    ['res', 'Результат', !!(it.result && (it.result.note || (it.result.files || []).length))]
  ].filter(x => x[2]);
  const sh = openSheet(`
    <div class="sh-h"><b>${t('PDF')}: ${esc(it.title.slice(0, 40))}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="hint">${t('Что включить в документ:')}</div>
    ${opts.map(([k, l]) => `<div class="sw-row"><div><b>${t(l)}</b></div><button class="sw ${k === 'tr' ? '' : 'on'}" data-k="${k}"></button></div>`).join('') || `<div class="hint">${t('В документ войдут название, дата, время и статус.')}</div>`}
    <div class="btns" style="margin-top:14px"><button class="btn pri" id="ip_share">${ic('share', 18)} ${t('Поделиться')}</button><button class="btn ghost" id="ip_dl">${ic('download', 18)} ${t('В телефон')}</button></div>
    <button class="btn ghost full" style="margin-top:8px" id="ip_open">${ic('pdf', 18)} ${t('Открыть / Печать')}</button>`, { cls: 'tall' });
  $$('.sw', sh).forEach(b => b.onclick = () => b.classList.toggle('on'));
  const make = async () => {
    const o = {}; $$('.sw', sh).forEach(b => { o[b.dataset.k] = b.classList.contains('on'); });
    const blob = await buildItemPdf(getItem(id), o);
    return { blob, name: (it.title.replace(/[\\/:*?"<>|]/g, ' ').slice(0, 60) || 'MARKUS-A') + (it.date ? ' ' + it.date : '') + '.pdf' };
  };
  const run = (btn, fn) => withBusy(btn, async () => { const r = await make(); await fn(r); }, { busy: t('Готовлю PDF…'), ok: t('Готово') });
  $('#ip_share', sh).onclick = function () { run(this, r => shareFile(r.blob, r.name, it.title)); };
  $('#ip_dl', sh).onclick = function () { run(this, r => downloadBlob(r.blob, r.name)); };
  $('#ip_open', sh).onclick = function () { run(this, r => window.open(URL.createObjectURL(r.blob), '_blank')); };
}
async function buildItemPdf(it, o) {
  await loadScript(PDFMAKE_URL); await loadScript(PDFFONTS_URL);
  const isM = it.kind === 'meeting', s = it.summary || {}, c = [];
  const H = txt => ({ text: txt, style: 'h2' });
  const bl = a => (a || []).filter(Boolean).length ? { ul: a.filter(Boolean).map(x => typeof x === 'string' ? x : (x.who ? x.who + ': ' : '') + (x.what || JSON.stringify(x)) + (x.due ? ' (' + t('срок') + ': ' + x.due + ')' : '')), margin: [0, 0, 0, 6] } : { text: '—', color: '#999' };
  c.push({ columns: [{ text: 'MARKUS-A', style: 'brand' }, { text: t('Сформировано') + ': ' + D.num(new Date()) + ' ' + D.nowTime(), alignment: 'right', color: '#888', fontSize: 8 }] });
  c.push({ text: (isM ? t('Встреча') : t('Задача')).toUpperCase(), color: '#5b4dff', fontSize: 9, bold: true, margin: [0, 8, 0, 0] });
  c.push({ text: it.title, style: 'h1' });
  const facts = [
    [t('Когда'), (it.date ? cap(D.long(it.date)) : t('Без даты')) + (it.start ? ', ' + timeLabel(it) : '')],
    [t('Статус'), t(STATUS[it.status] || it.status) + (progress(it) != null ? ' · ' + progress(it) + '%' : '') + (it.status === 'cancelled' && it.cancelReason ? ' — ' + it.cancelReason : '')],
    it.priority !== 'normal' ? [t('Важность'), t(PRIO[it.priority].l)] : null,
    it.place ? [t('Место'), it.place] : null,
    isM && it.recording ? [t('Запись'), fmtDur(it.recording.duration || 0)] : null
  ].filter(Boolean);
  c.push({ table: { widths: [90, '*'], body: facts.map(([a, b]) => [{ text: a, color: '#666' }, { text: b }]) }, layout: 'noBorders', margin: [0, 0, 0, 8] });
  if (o.desc && (it.desc || it.goals)) { c.push(H(isM ? t('Заметки и цели') : t('Описание'))); if (it.goals) c.push({ text: String(it.goals), margin: [0, 0, 0, 4] }); if (it.desc) c.push({ text: it.desc }); }
  if (o.people) {
    if ((it.participants || []).length) { c.push(H(t('Участники'))); c.push(bl(it.participants)); }
    if ((it.locations || []).length) { c.push(H(t('Места'))); c.push({ ul: it.locations.map(p => ({ text: [{ text: placeTitle(p), bold: true }, p.address ? '\n' + p.address : '', p.note ? '\n' + p.note : '', placeUrl(p) ? { text: '\n' + placeUrl(p), color: '#1d4ed8', link: placeUrl(p), fontSize: 8 } : ''] })) }); }
  }
  if (o.subs && (it.subtasks || []).length) { c.push(H(t('Подзадачи'))); c.push({ ul: it.subtasks.map(x => ({ text: (x.done ? '✓ ' : '') + x.text + (x.due ? '  (' + t('срок') + ' ' + D.num(x.due) + (x.time ? ' ' + x.time : '') + ')' : ''), color: x.done ? '#888' : '#222', decoration: x.done ? 'lineThrough' : undefined })) }); }
  if (o.sum && it.summary) {
    c.push(H(t('Итоги встречи')));
    [['Кратко', s.short], ['Важная информация', s.important], ['Решения', s.decisions], ['Обязательства', s.commitments], ['Сроки', s.deadlines], ['Риски и нерешённое', s.risks], ['Следующие шаги', s.next]]
      .forEach(([l, a]) => { if ((a || []).length) { c.push({ text: t(l), bold: true, margin: [0, 4, 0, 2] }); c.push(bl(a)); } });
  }
  if (o.made && (it.proposed || []).length) { c.push(H(t('Задачи и встречи из итогов'))); c.push(bl(it.proposed.map(x => (x.type === 'meeting' ? t('Встреча') + ': ' : '') + x.title + (x.date ? ' — ' + D.num(x.date) + (x.start ? ' ' + x.start : '') : '') + (x.state === 'created' ? ' ✓' : '')))); }
  if (o.files) {
    if ((it.files || []).length) { c.push(H(t('Материалы'))); c.push(bl(it.files.map(f => f.name + ' (' + mb(f.size) + ')'))); }
    if ((it.links || []).length) { c.push(H(t('Ссылки'))); c.push({ ul: it.links.map(l => ({ text: (l.title || l.url) + (l.title ? ' — ' + l.url : ''), link: l.url, color: '#1d4ed8' })) }); }
  }
  if (o.res && it.result) { c.push(H(t('Результат'))); if (it.result.note) c.push({ text: it.result.note }); if ((it.result.files || []).length) c.push(bl(it.result.files.map(f => f.name))); }
  if (o.tr && it.transcript) { c.push({ text: t('Стенограмма'), style: 'h2', pageBreak: 'before' }); c.push({ text: it.transcript, fontSize: 9, lineHeight: 1.25 }); }
  const dd = {
    pageSize: 'A4', pageMargins: [40, 40, 40, 44], defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.2 }, content: c,
    info: { title: it.title },
    styles: { brand: { fontSize: 12, bold: true, color: '#5b4dff' }, h1: { fontSize: 18, bold: true, margin: [0, 2, 0, 10] }, h2: { fontSize: 12.5, bold: true, margin: [0, 12, 0, 5], color: '#1f2937' } },
    footer: (cur, total) => ({ text: 'MARKUS-A · ' + cur + ' / ' + total, alignment: 'center', fontSize: 8, color: '#9ca3af', margin: [0, 14, 0, 0] })
  };
  return new Promise((res, rej) => { try { pdfMake.createPdf(dd).getBlob(res); } catch (e) { rej(e); } });
}

/* ---------- the meeting recording → Telegram (the bot's chat) ---------- */
function tgReady() { return !!(window.Cloud && Cloud.user && Cloud.profile && Cloud.profile.tg_chat_id); }
function recTgStateHtml(m) {
  const g = m.recording && m.recording.tg; if (!g) return '';
  const when = new Date(g.at), tm = pad(when.getHours()) + ':' + pad(when.getMinutes());
  if (g.ok && g.tooBig) return `<div class="tg-state bad">⚠ ${t('Запись больше 50 МБ — Telegram-бот не может её отправить. Отправьте кнопкой «Поделиться» → Telegram.')}</div>`;
  return g.ok ? `<div class="tg-state okc">✓ ${t('Запись доставлена в Telegram')} ${tm}</div>` : `<div class="tg-state bad">⚠ ${t('Запись не отправлена')} (${tm}): ${esc(g.err || '')}</div>`;
}
async function meetAudioToTelegram(id, silent, btn) {
  const m = getItem(id); if (!m || !m.recording) return;
  const r = m.recording;
  const run = async () => {
    try {
      if (!Cloud.user) throw new Error(t('Войдите в аккаунт (Настройки → Облако)'));
      if (!tgReady()) throw new Error(t('Telegram не подключён (Настройки → Telegram)'));
      if (!r.cloud) {   // first the file goes to your cloud, the bot takes it from there
        const rf = { id: r.fileId, type: r.mime, cloud: r.cloud, parts: r.parts };
        await Cloud.uploadFile(rf);
        r.cloud = rf.cloud; if (rf.parts) r.parts = rf.parts;
        if (!r.cloud) throw new Error(t('Не удалось загрузить запись в облако') + (rf.cloudErr ? ': ' + rf.cloudErr : ''));
      }
      const when = [m.date ? D.short(m.date) : '', m.start || ''].filter(Boolean).join(' ');
      const esc2 = x => String(x || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const { data, error } = await Cloud.sb.functions.invoke('telegram-bot', { body: {
        action: 'audio', fileId: r.fileId, parts: r.parts || 1, size: r.size || 0, mime: r.mime || 'audio/mp4', duration: r.duration || 0,
        name: (m.title.replace(/[\\/:*?"<>|]/g, ' ').slice(0, 60) || 'MARKUS-A') + (m.date ? ' ' + m.date : '') + '.' + recExt(r.mime),
        title: m.title.slice(0, 60), caption: `🎙 <b>${esc2(m.title)}</b>${when ? '\n' + esc2(when) : ''} · ${fmtDur(r.duration || 0)}`
      } });
      if (error) { let msg = error.message; try { const j = error.context && await error.context.json(); if (j && j.error) msg = j.error; } catch (e) { } throw new Error(t('Не удалось отправить') + ': ' + msg); }
      if (data && data.error) throw new Error(data.error);
      r.tg = { at: new Date().toISOString(), ok: true, tooBig: !!(data && data.tooBig) };
    } catch (e) { r.tg = { at: new Date().toISOString(), ok: false, err: e.message || String(e) }; throw e; }
    finally { await saveItem(m, { render: false }); const el = document.getElementById('rtg_' + id); if (el) el.innerHTML = recTgStateHtml(m); }
  };
  if (silent) { try { await run(); } catch (e) { notify(t('Запись не ушла в Telegram'), m.title + ': ' + (e.message || ''), { tag: 'rtg-' + id, id }); } return; }
  const ok = await withBusy(btn, run, { busy: t('Отправляю запись…'), ok: t('Отправлено') });
  if (ok && cfg.bot) toast(r.tg && r.tg.tooBig ? t('Запись больше 50 МБ — в Telegram ушло сообщение со ссылкой на приложение') : t('Готово ✓ Смотрите в Telegram: чат с ботом @{b}', { b: cfg.bot }), 5000);
}
/* automatic sending after a recording (summary first, then the audio) */
async function autoAudioToTelegram(id) {
  const m = getItem(id);
  if (!m || !m.recording || m.test || !S.set.sendAudioTg || !tgReady()) return;
  if (m.recording.tg && m.recording.tg.ok) return;   // already sent — not twice
  await meetAudioToTelegram(id, true);
}

/* ================= CALENDAR (clear version) =================
   День — the day as a simple list with free time between items;
   Неделя — every day of the week one under another;
   Месяц — month grid; По часам — timeline of one day; Список — upcoming / past. */
const KIND_C = { meeting: '#8b5cf6', task: '#3b82f6', crit: '#ef4444', high: '#f97316' };
function kindColor(it) { return it.priority === 'critical' ? KIND_C.crit : it.priority === 'high' ? KIND_C.high : it.kind === 'meeting' ? KIND_C.meeting : KIND_C.task; }
function calLegend() { return `<div class="cal-legend"><span><i style="background:${KIND_C.meeting}"></i>${t('Встреча')}</span><span><i style="background:${KIND_C.task}"></i>${t('Задача')}</span><span><i style="background:${KIND_C.high}"></i>${t('Важно')}</span><span><i style="background:${KIND_C.crit}"></i>${t('Срочно')}</span></div>`; }
function dayCounts(d) {
  const ag = dayAgenda(d).filter(e => !e.cont && e.it.status !== 'cancelled');
  return { open: ag.filter(e => isOpen(e.it)), meet: ag.filter(e => e.it.kind === 'meeting' && isOpen(e.it)).length, task: ag.filter(e => e.it.kind !== 'meeting' && isOpen(e.it)).length };
}
function weekStrip2() {
  const ws = D.weekStart(S.selDate), td = D.today();
  return `<div class="wstrip">${[0, 1, 2, 3, 4, 5, 6].map(k => {
    const d = D.add(ws, k), c = dayCounts(d);
    const dots = (c.meet ? `<i style="background:${KIND_C.meeting}"></i>` : '') + (c.task ? `<i style="background:${KIND_C.task}"></i>` : '');
    return `<button class="wd ${d === td ? 'today' : ''} ${d === S.selDate ? 'sel' : ''}" onclick="S.selDate='${d}';render()">${D.dow(D.parse(d).getDay())}<b>${D.parse(d).getDate()}</b><span class="wd-dots">${dots || '<i class="no"></i>'}</span></button>`;
  }).join('')}</div>`;
}
function freeGap(d, a, b) {
  if (b - a < 30) return '';
  return `<button class="gap" onclick="openEditor('task',{date:'${d}',start:'${D.fromMin(a)}',end:'${D.fromMin(Math.min(b, a + (+S.set.defaultDur || 60)))}'})"><span>${t('Свободно')} ${D.fromMin(a)}–${D.fromMin(b)}</span><b>+ ${t('задача')}</b></button>`;
}
function dayAgendaHTML(d, o = {}) {
  const all = sortAgenda(dayAgenda(d), 'time');
  const act = all.filter(e => e.subs || isOpen(e.it));
  const fin = all.filter(e => !e.subs && !isOpen(e.it));
  const untimed = act.filter(e => e.subs || e.cont || !e.it.start);
  const timed = act.filter(e => !e.subs && !e.cont && e.it.start);
  let b = '';
  if (untimed.length) b += `<div class="cal-h">${t('Весь день / без времени')}</div><div class="list">${agendaRows(untimed)}</div>`;
  if (timed.length) {
    const ws = D.toMin(S.set.workStart || '09:00'), we = D.toMin(S.set.workEnd || '18:00');
    let cur = Math.max(ws, d === D.today() ? Math.ceil(D.nowMin() / 15) * 15 : ws), rows = '';
    timed.forEach(e => {
      const s = D.toMin(e.it.start), en = D.toMin(e.it.end || e.it.start);
      if (!o.compact && s > cur && cur < we) rows += freeGap(d, cur, Math.min(s, we));
      rows += row(e.it);
      cur = Math.max(cur, en);
    });
    if (!o.compact && cur < we && d >= D.today()) rows += freeGap(d, cur, we);
    b += `<div class="cal-h">${t('По времени')}</div><div class="list">${rows}</div>`;
  } else if (!untimed.length && !o.compact) b += `<div class="empty"><b>🌿</b>${t('Свободный день')}${d >= D.today() ? `<br><button class="btn ghost" style="margin-top:10px" onclick="openEditor('task',{date:'${d}'})">+ ${t('Добавить задачу')}</button>` : ''}</div>`;
  if (fin.length) {
    const openF = S.calDone;
    b += `<button class="more-btn" onclick="S.calDone=!S.calDone;render()">${openF ? ic('up', 16) : ic('down', 16)} ${t('Выполнено и отменено')} (${fin.length})</button>`;
    if (openF) b += `<div class="list">${agendaRows(fin)}</div>`;
  }
  return b;
}
function calDayView() {
  const d = S.selDate, c = dayCounts(d);
  const sum = [c.meet ? tn(c.meet, 'встреча|встречи|встреч').replace(/^/, c.meet + ' ') : '', c.task ? tn(c.task, 'задача|задачи|задач').replace(/^/, c.task + ' ') : ''].filter(Boolean).join(' · ');
  return weekStrip2() + `<div class="cal-day-h"><b>${esc(cap(D.long(d)))}</b><span>${esc(sum || t('Ничего не запланировано'))}</span></div>` + calLegend() + dayAgendaHTML(d);
}
function calWeekView() {
  const ws = D.weekStart(S.selDate), td = D.today();
  let b = '';
  for (let k = 0; k < 7; k++) {
    const d = D.add(ws, k), ag = sortAgenda(dayAgenda(d), 'time');
    const act = ag.filter(e => e.subs || isOpen(e.it)), fin = ag.filter(e => !e.subs && !isOpen(e.it));
    b += `<div class="wk-day ${d === td ? 'today' : ''}"><button class="wk-h" onclick="S.selDate='${d}';S.calView='day';render()"><b>${esc(cap(D.dowFull(D.parse(d).getDay())))}, ${esc(D.short(d))}</b>${d === td ? `<span class="tag blue">${t('Сегодня')}</span>` : ''}<span class="sp"></span>${fin.length ? `<span class="muted" style="font-size:12px">✓ ${fin.length}</span>` : ''}</button>
      ${act.length ? `<div class="list">${agendaRows(act)}</div>` : `<div class="wk-free">${t('Свободно')}</div>`}</div>`;
  }
  return b;
}
function calHoursView() {
  return weekStrip2() + calLegend() + timeGrid([S.selDate]) + (S.calDone ? '' : `<button class="more-btn" onclick="S.calDone=true;render()">${ic('down', 16)} ${t('Показать выполненные')}</button>`);
}
SCREENS.calendar = () => {
  if (!S.selDate) S.selDate = D.today();
  if (!['day', 'week', 'month', 'hours', 'list'].includes(S.calView)) S.calView = 'day';
  const v = S.calView;
  const views = [['day', 'День'], ['week', 'Неделя'], ['month', 'Месяц'], ['hours', 'По часам'], ['list', 'Список']];
  let b = `<div class="seg">${views.map(([k, l]) => `<button class="${v === k ? 'on' : ''}" onclick="S.calView='${k}';S.scrollCal=true;render()">${t(l)}</button>`).join('')}</div>`;
  if (v === 'week' || v === 'month') b += `<div class="cal-nav"><button class="tbtn" onclick="calShift(-1)">${ic('left')}</button><b>${esc(v === 'week' ? D.short(D.weekStart(S.selDate)) + ' – ' + D.short(D.add(D.weekStart(S.selDate), 6)) : D.monthYear(S.selDate))}</b><button class="tbtn" onclick="calShift(1)">${ic('right')}</button></div>`;
  if (v === 'day' || v === 'hours') b += `<div class="cal-nav"><button class="tbtn" onclick="calShift(-7)">${ic('left')}</button><b>${esc(D.short(D.weekStart(S.selDate)) + ' – ' + D.short(D.add(D.weekStart(S.selDate), 6)))}</b><button class="tbtn" onclick="calShift(7)">${ic('right')}</button></div>`;
  if (v === 'day') b += calDayView();
  else if (v === 'week') b += calWeekView();
  else if (v === 'month') b += calLegend() + monthGrid();
  else if (v === 'hours') b += calHoursView();
  else b += listView();
  return {
    top: titleTop(t('Календарь'), { extra: `<button class="chip-btn" onclick="S.selDate=D.today();S.scrollCal=true;render()">${t('Сегодня')}</button><button class="tbtn" onclick="openPdfExport('week')" aria-label="PDF">${ic('pdf')}</button><button class="tbtn" onclick="openSlotFinder()" aria-label="${esc(t('Найти свободное окно'))}">${ic('clock')}</button>` }),
    body: b,
    dock: fab(`openEditor('task',{date:S.selDate})`, `<button class="fab sec2" onclick="openVoice()" aria-label="${esc(t('Голос'))}">${ic('mic', 24)}</button>`),
    after: () => {
      if (!S.scrollCal) return; S.scrollCal = false;
      if (v !== 'hours') return;
      const target = $('.now-line') || $('.blk');
      if (target) window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - 180) });
    }
  };
};
function calShift(n) {
  const v = S.calView;
  if (v === 'month') { const d = D.parse(S.selDate); d.setDate(1); d.setMonth(d.getMonth() + n); S.selDate = D.fmt(d); }
  else S.selDate = D.add(S.selDate, v === 'week' ? n * 7 : n);
  S.scrollCal = true; render();
}
