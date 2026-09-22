'use strict';
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

/* ================= dictation into a field ================= */
let dict = null;
function stopDictation() { if (dict) { try { dict.rec.stop(); } catch (e) { } if (dict.btn) dict.btn.classList.remove('on'); dict = null; } }
function dictateInto(id, btn, multiline) {
  if (dict) { const same = dict.btn === btn; stopDictation(); if (same) return; }
  if (!SR) return toast('Голосовой ввод работает в Chrome / Edge / Safari');
  const el = document.getElementById(id); if (!el) return;
  const rec = new SR(); rec.lang = 'ru-RU'; rec.continuous = true; rec.interimResults = false;
  dict = { rec, btn }; btn.classList.add('on');
  rec.onresult = e => {
    for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) {
      const t = e.results[i][0].transcript.trim(); if (!t) continue;
      const v = el.value;
      el.value = v + (v && !/\s$/.test(v) ? (multiline ? ' ' : ' ') : '') + (v ? t : t[0].toUpperCase() + t.slice(1));
    }
  };
  rec.onerror = e => { if (e.error === 'not-allowed') toast('Разрешите доступ к микрофону'); stopDictation(); };
  rec.onend = () => { if (dict && dict.rec === rec) { try { rec.start(); } catch (e) { stopDictation(); } } };
  try { rec.start(); } catch (e) { stopDictation(); }
}

/* ================= voice command overlay ================= */
let V = null;
function openVoice(mode = 'command') {
  stopDictation();
  const ov = $('#voiceOv');
  ov.innerHTML = `<div class="ov-top"><button onclick="closeVoice()" aria-label="Закрыть">${ic('x', 22)}</button><b></b></div>
    <div class="ov-in">
      <div class="vo-h" id="vo_h">${SR ? 'Говорите…' : 'Напишите команду'}</div>
      <button class="vo-mic ${SR ? 'on' : ''}" id="vo_mic" onclick="voiceMicToggle()"><i>${ic('mic', 44)}</i></button>
      <div class="vo-heard" id="vo_heard"></div>
      <div class="vo-box" id="vo_ex"><b>Например:</b>${mode === 'note' ? '«Проверить договор до пятницы и позвонить бухгалтеру»' : '«Завтра в 14:00 встреча с Алишером на час»<br>«Напомни через два часа позвонить бухгалтеру»<br>«Что у меня сегодня после обеда?»<br>«Найди свободное окно на полтора часа до пятницы»'}</div>
      <div class="vo-box" id="vo_steps" hidden></div>
      <div class="vo-inp"><input id="vo_text" placeholder="…или напишите здесь" onkeydown="if(event.key==='Enter')voiceSubmit()"><button onclick="voiceSubmit()" aria-label="Отправить">${ic('send', 18)}</button></div>
      <button class="btn dk-ghost" onclick="closeVoice()">Отменить</button>
    </div>`;
  ov.hidden = false;
  V = { mode, rec: null, final: '', busy: false };
  if (SR) voiceListen(); else setTimeout(() => $('#vo_text').focus(), 100);
}
function closeVoice() { if (V && V.rec) { V.cancel = true; try { V.rec.abort(); } catch (e) { } } V = null; $('#voiceOv').hidden = true; }
function voiceListen() {
  if (!V) return;
  const rec = new SR(); rec.lang = 'ru-RU'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
  V.rec = rec; V.final = '';
  $('#vo_mic').classList.add('on'); $('#vo_h').textContent = 'Говорите…';
  rec.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) V.final += t; else interim += t; }
    $('#vo_heard').textContent = (V.final + ' ' + interim).trim();
  };
  rec.onerror = e => { if (e.error === 'not-allowed') { toast('Разрешите доступ к микрофону'); } if (V) { $('#vo_h').textContent = 'Не расслышал — повторите или напишите'; } };
  rec.onend = () => {
    if (!V || V.cancel) return;
    $('#vo_mic').classList.remove('on');
    const t = (V.final || '').trim();
    if (t) processVoiceText(t); else if (!V.busy) $('#vo_h').textContent = 'Нажмите на микрофон и говорите';
  };
  try { rec.start(); } catch (e) { }
}
function voiceMicToggle() {
  if (!V || V.busy) return;
  if (!SR) { $('#vo_text').focus(); return; }
  if ($('#vo_mic').classList.contains('on')) { try { V.rec.stop(); } catch (e) { } } else voiceListen();
}
function voiceSubmit() { const t = $('#vo_text').value.trim(); if (!t || !V) return; if (V.rec) { V.cancel = true; try { V.rec.abort(); } catch (e) { } V.cancel = false; } $('#vo_heard').textContent = t; processVoiceText(t); }
async function processVoiceText(t) {
  if (!V || V.busy) return;
  V.busy = true;
  if (V.mode === 'note') {
    closeVoice();
    let txt = t;
    if (AI.ready()) { try { txt = await AI.improveText(t); } catch (e) { } }
    const n = newItem('note', { title: txt.split(/[.\n!?]/)[0].slice(0, 60), desc: txt, noteCat: S.noteCat === 'all' ? 'Идеи' : S.noteCat });
    await saveItem(n); toast('Заметка сохранена ✓'); openNoteEditor(n);
    return;
  }
  $('#vo_h').textContent = 'Распознаю…'; $('#vo_ex').hidden = true;
  const steps = $('#vo_steps'); steps.hidden = false;
  steps.innerHTML = `<b>Распознаю…</b>${['Дата и время', 'Задача', 'Приоритет', 'Контакт'].map(s => `<div class="vo-step">${s}<i class="spin"></i></div>`).join('')}`;
  await handleCommand(t, { fromVoice: true });
}

/* ================= command handling ================= */
async function handleCommand(text, o = {}) {
  if (!AI.ready()) {
    closeVoice();
    toast('Для умного разбора добавьте ключ AI в настройках', 4000);
    return openEditor('task', { title: text[0].toUpperCase() + text.slice(1) });
  }
  let p;
  try { p = await AI.parseCommand(text); }
  catch (e) { closeVoice(); toast(e.message, 5000); return openEditor('task', { title: text }); }
  if (V) { $$('#vo_steps i').forEach(i => i.className = 'ok'); await sleep(350); }
  closeVoice();
  if (o.forceCreate && !['create_task', 'create_meeting'].includes(p.intent)) p.intent = 'create_task';
  switch (p.intent) {
    case 'create_task': case 'create_meeting': return createFlow(p, text);
    case 'create_note': {
      const n = newItem('note', { title: p.title || (p.noteText || text).slice(0, 60), desc: p.noteText || text });
      await saveItem(n); toast('Заметка сохранена ✓'); speak('Записал'); return openNoteEditor(n);
    }
    case 'query': return queryFlow(p);
    case 'find_slot': return slotFlow(p);
    default: {
      const v = await dialog({ title: 'Не совсем понял', text: esc(p.reply || 'Попробуйте сказать иначе, например: «Завтра в 10 подготовить договор».'), buttons: [{ l: 'Создать задачу с этим текстом', v: 'task', p: 1 }, { l: 'Сохранить как заметку', v: 'note' }, { l: 'Повторить', v: 'again' }, { l: 'Закрыть', v: null }] });
      if (v === 'task') openEditor('task', { title: text });
      else if (v === 'note') { const n = newItem('note', { title: text.slice(0, 60), desc: text }); await saveItem(n); toast('Сохранено'); }
      else if (v === 'again') openVoice();
    }
  }
}
function matchCat(name, kind) {
  if (name) { const c = S.set.categories.find(c => c.name.toLowerCase() === String(name).toLowerCase()); if (c) return c.id; }
  return kind === 'meeting' ? 'meet' : 'work';
}
const HINT_TIMES = { morning: ['09:00', '10:00', '11:00'], afternoon: ['13:00', '14:00', '15:00'], evening: ['18:00', '19:00', '20:00'] };
async function createFlow(p, text) {
  const kind = p.intent === 'create_meeting' ? 'meeting' : 'task';
  const d = newItem(kind, {
    title: (p.title || text).replace(/^./, c => c.toUpperCase()),
    priority: ['normal', 'high', 'critical'].includes(p.priority) ? p.priority : 'normal',
    participants: Array.isArray(p.participants) ? p.participants : [],
    place: p.place || '', category: matchCat(p.category, kind),
    date: p.date || null, start: p.start || null, end: p.end || null
  });
  if (Array.isArray(p.remindMinutesBefore) && p.remindMinutesBefore.length) d.reminders = p.remindMinutesBefore.map(Number).filter(n => n >= 0);
  if (p.remindAt) { const r = new Date(p.remindAt); if (!isNaN(r)) d.customRemind = r.toISOString(); }
  const opts = Array.isArray(p.dateOptions) ? p.dateOptions.filter(Boolean) : [];
  if (opts.length > 1 && (!d.date || opts.includes(d.date))) {
    const v = await askChoice('Уточните дату', 'Вы имеете в виду ' + opts.map(x => D.human(x)).join(' или ') + '?', opts.map(x => ({ l: D.human(x) + ', ' + D.DOWF[D.parse(x).getDay()], v: x, p: 1 })), { type: 'date', label: 'Другая дата' });
    if (!v) return; d.date = v;
  }
  if (!d.date && !p.timeless) {
    const t = D.today();
    const v = await askChoice('На какой день?', esc(d.title), [{ l: 'Сегодня', v: t, p: 1 }, { l: 'Завтра', v: D.add(t, 1), p: 1 }, { l: 'Послезавтра', v: D.add(t, 2) }, { l: 'Без даты', v: 'none' }], { type: 'date', label: 'Выбрать дату' });
    if (!v) return; d.date = v === 'none' ? null : v;
  }
  if (d.date && !d.start && !p.timeless) {
    const dur = +p.durationMin || S.set.defaultDur;
    let times = p.timeHint && HINT_TIMES[p.timeHint] ? HINT_TIMES[p.timeHint] : freeSlots(d.date, dur, { limit: 3 }).map(s => s.start);
    if (!times.length) times = ['10:00', '14:00', '17:00'];
    const v = await askChoice('На какое время поставить?', `${esc(d.title)} · ${D.human(d.date)}`, [...times.map(x => ({ l: x, v: x, p: 1 })), { l: 'Без времени', v: 'none' }], { type: 'time', label: 'Другое время' });
    if (!v) return;
    if (v !== 'none') d.start = v;
  }
  if (d.start && !d.end) {
    if (+p.durationMin) d.end = D.addMin(d.start, +p.durationMin);
    else {
      const v = await askChoice('На сколько времени запланировать?', `${esc(d.title)} · ${D.human(d.date)}, ${d.start}`, [15, 30, 60, 90, 120].map(m => ({ l: durLabel(m), v: m, p: m === 60 })), { type: 'number', label: 'Минут' });
      if (!v) return; d.end = D.addMin(d.start, Math.max(5, +v));
    }
  }
  if (d.start && d.end && D.toMin(d.end) <= D.toMin(d.start)) d.end = D.addMin(d.start, S.set.defaultDur);
  const r = await resolveConflicts(d); if (!r) return;
  const info = `<b>${esc(d.title)}</b><br>${esc(whenLabel(d))}${d.priority !== 'normal' ? ' · ' + PRIO[d.priority].l : ''}${d.participants.length ? '<br>Участники: ' + esc(d.participants.join(', ')) : ''}${d.customRemind ? '<br>Напомню: ' + new Date(d.customRemind).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : ''}`;
  const v = await dialog({ title: kind === 'meeting' ? 'Создать встречу?' : 'Создать задачу?', text: info, buttons: [{ l: 'Создать', v: 'ok', p: 1 }, { l: 'Изменить детали', v: 'edit' }, { l: 'Отмена', v: null }] });
  if (v === 'ok') { await saveItem(d); toast('Создано ✓'); speak(`${kind === 'meeting' ? 'Встреча' : 'Задача'} создана: ${D.human(d.date)}${d.start ? ' в ' + d.start : ''}`); }
  else if (v === 'edit') openEditor(kind, d);
}
async function queryFlow(p) {
  const q = p.query || {}, t = D.today();
  const from = q.from || t, to = q.to || from;
  let its = S.items.filter(i => !i.deleted && i.kind !== 'note' && i.date && i.date >= from && i.date <= to && i.status !== 'cancelled');
  if (q.fromTime) its = its.filter(i => !i.start || i.start >= q.fromTime);
  if (q.toTime) its = its.filter(i => !i.start || i.start <= q.toTime);
  its = sortByDate(its);
  const range = from === to ? D.human(from).toLowerCase() : `с ${D.short(from)} по ${D.short(to)}`;
  const open = its.filter(isOpen);
  const say = open.length ? `${range[0].toUpperCase() + range.slice(1)}${q.fromTime ? ' после ' + q.fromTime : ''} у вас ${open.length} ${plural(open.length, 'дело', 'дела', 'дел')}: ` + open.slice(0, 5).map(i => (i.start ? 'в ' + i.start + ' ' : '') + i.title).join('; ') : `${range[0].toUpperCase() + range.slice(1)} свободно`;
  speak(say);
  await dialog({ title: `Расписание: ${range}${q.fromTime ? ' после ' + q.fromTime : ''}`, html: its.length ? `<div style="margin:0 -4px">${listOf(its, { showDate: from !== to })}</div>` : '<div class="dlg-x">Ничего не запланировано 🎉</div>', buttons: [{ l: 'Понятно', v: 1, p: 1 }] });
}
async function slotFlow(p) {
  const s = p.slot || {}, dur = +s.durationMin || 60, until = s.untilDate || D.add(D.today(), 7);
  const slots = findAhead(dur, D.today(), until, 6);
  if (!slots.length) { speak('Свободных окон не нашлось'); return dialog({ title: 'Свободных окон нет', text: `До ${esc(D.human(until))} нет окна на ${durLabel(dur)} в рабочие часы.`, buttons: [{ l: 'Понятно', v: 1, p: 1 }] }); }
  speak('Ближайшее свободное окно: ' + slotLabel(slots[0], true));
  const v = await dialog({ title: `Свободно (${durLabel(dur)})`, text: 'Выберите окно — создам задачу на это время.', buttons: [...slots.map(x => ({ l: slotLabel(x, true), v: x, p: 1 })), { l: 'Закрыть', v: null }] });
  if (v) openEditor('task', { title: p.title || '', date: v.date, start: v.start, end: v.end });
}

/* ================= meeting recorder ================= */
const Rec = {
  active: null,
  pickMime() {
    const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    return c.find(m => MediaRecorder.isTypeSupported(m)) || '';
  },
  elapsed() { const a = Rec.active; if (!a) return 0; const now = a.pauseAt || Date.now(); return (now - a.started - a.pausedTotal) / 1000; },
  async start(meetingId, auto) {
    if (Rec.active) { showRec(); return true; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast('Запись не поддерживается этим браузером'); return false; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (e) { if (!auto) toast('Нет доступа к микрофону. Разрешите его в настройках браузера.', 4000); return false; }
    const mime = Rec.pickMime();
    const opts = { audioBitsPerSecond: 24000 }; if (mime) opts.mimeType = mime;
    let mr; try { mr = new MediaRecorder(stream, opts); } catch (e) { mr = new MediaRecorder(stream); }
    const a = { meetingId, mr, stream, chunks: [], started: Date.now(), pausedTotal: 0, pauseAt: null, mime: mr.mimeType || mime || 'audio/webm', size: 0, endAsked: false };
    mr.ondataavailable = e => { if (e.data && e.data.size) { a.chunks.push(e.data); a.size += e.data.size; } };
    mr.start(5000);
    Rec.active = a;
    a.persist = setInterval(() => {
      DB.put('files', new Blob(a.chunks, { type: a.mime }), 'recbuf').catch(() => { });
      localStorage.setItem('markus_recbuf', JSON.stringify({ meetingId, mime: a.mime, dur: Rec.elapsed() }));
    }, 15000);
    try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const src = ctx.createMediaStreamSource(stream); const an = ctx.createAnalyser(); an.fftSize = 256; src.connect(an); a.ctx = ctx; a.an = an; } catch (e) { }
    try { if (navigator.wakeLock) a.wake = await navigator.wakeLock.request('screen'); } catch (e) { }
    a.tick = setInterval(recTick, 500);
    showRec();
    if (S.route === 'meeting') render();
    return true;
  },
  pause() { const a = Rec.active; if (!a) return; if (a.pauseAt) { a.pausedTotal += Date.now() - a.pauseAt; a.pauseAt = null; a.mr.resume(); } else { a.pauseAt = Date.now(); a.mr.pause(); } showRec(); },
  async stop() {
    const a = Rec.active; if (!a) return;
    if (a.pauseAt) { a.pausedTotal += Date.now() - a.pauseAt; a.pauseAt = null; }
    const dur = Rec.elapsed();
    await new Promise(r => { a.mr.onstop = r; try { a.mr.stop(); } catch (e) { r(); } });
    a.stream.getTracks().forEach(t => t.stop());
    clearInterval(a.tick); clearInterval(a.persist); cancelAnimationFrame(a.raf);
    try { a.ctx && a.ctx.close(); } catch (e) { }
    try { a.wake && a.wake.release(); } catch (e) { }
    Rec.active = null; hideRec();
    const blob = new Blob(a.chunks, { type: a.mime });
    localStorage.removeItem('markus_recbuf'); DB.del('files', 'recbuf').catch(() => { });
    await afterRecording(a.meetingId, blob, a.mime, dur);
  }
};
function showRec() {
  const a = Rec.active; if (!a) return;
  const m = getItem(a.meetingId) || { title: 'Запись', participants: [] };
  const ov = $('#recOv'); ov.hidden = false; $('#recPill').hidden = true;
  ov.innerHTML = `<div class="ov-top"><button onclick="hideRec(true)" aria-label="Свернуть">${ic('left', 22)}</button><b>Запись встречи</b></div>
    <div class="ov-in"><div style="font-size:14px;color:#b9bde6;text-align:center">${esc(m.title)}</div>
      <div class="rec-time" id="r_time">${fmtDur(Rec.elapsed())}</div>
      <canvas class="rec-wave" id="r_wave" width="600" height="120"></canvas>
      <div class="rec-st"><i style="${a.pauseAt ? 'animation:none;background:#9ea3d6' : ''}"></i>${a.pauseAt ? 'Пауза' : 'Идёт запись…'}</div>
      <div class="rec-meta" id="r_meta">Участники: ${(m.participants || []).length + 1} · ${mb(a.size)}</div>
      <button class="btn rec-stop" onclick="Rec.stop()">${ic('rec', 18)} Остановить</button>
      <button class="btn dk-ghost" onclick="Rec.pause()">${a.pauseAt ? ic('play', 18) + ' Продолжить' : ic('pause', 18) + ' Пауза'}</button>
      <div class="vo-box" style="margin-top:14px">Не закрывайте приложение — запись идёт, пока оно открыто (можно свернуть кнопкой «назад» и работать в MARKUS-A). После окончания предложу сохранить запись, сделать стенограмму и AI-анализ.</div>
    </div>`;
  drawWave();
}
function hideRec(minimize) {
  $('#recOv').hidden = true;
  const a = Rec.active;
  if (a && minimize) { $('#recPill').hidden = false; recTick(); }
  else $('#recPill').hidden = true;
  if (a) cancelAnimationFrame(a.raf);
}
function recTick() {
  const a = Rec.active; if (!a) return;
  const t = $('#r_time'); if (t) t.textContent = fmtDur(Rec.elapsed());
  const mm = $('#r_meta'); if (mm) mm.textContent = mm.textContent.replace(/·.*$/, '· ' + mb(a.size));
  const pill = $('#recPill'); if (!pill.hidden) pill.innerHTML = `<i></i> Запись ${fmtDur(Rec.elapsed())}`;
  const m = getItem(a.meetingId);
  if (m && m.date && m.end && !a.endAsked && Date.now() >= endAt(m).getTime()) {
    a.endAsked = true;
    notify('Время встречи вышло', 'Остановить запись «' + m.title + '»?', { tag: 'rec-end', id: m.id });
    dialog({ title: 'Время встречи вышло', text: 'Остановить запись и сохранить?', buttons: [{ l: 'Остановить', v: 1, p: 1 }, { l: 'Продолжить запись', v: 0 }] }).then(v => { if (v) Rec.stop(); });
  }
}
function drawWave() {
  const a = Rec.active, cv = $('#r_wave'); if (!a || !cv || !a.an) return;
  const g = cv.getContext('2d'), arr = new Uint8Array(a.an.frequencyBinCount);
  const loop = () => {
    if (!Rec.active || $('#recOv').hidden) return;
    a.an.getByteFrequencyData(arr);
    g.clearRect(0, 0, cv.width, cv.height);
    const n = 60, w = cv.width / n;
    for (let i = 0; i < n; i++) {
      const v = a.pauseAt ? 4 : Math.max(4, (arr[Math.floor(i / n * arr.length * .7)] / 255) * cv.height * .9);
      const grd = g.createLinearGradient(0, 0, cv.width, 0); grd.addColorStop(0, '#4f6bff'); grd.addColorStop(1, '#b06cff');
      g.fillStyle = grd; g.fillRect(i * w + w * .2, (cv.height - v) / 2, w * .6, v);
    }
    a.raf = requestAnimationFrame(loop);
  };
  loop();
}
async function quickRecord() {
  const now = D.nowTime();
  const m = newItem('meeting', { title: 'Запись ' + D.short(D.today()) + ' ' + now, date: D.today(), start: now, end: D.addMin(now, 60), reminders: [] });
  await saveItem(m, { render: false });
  go('meeting', m.id);
  const ok = await Rec.start(m.id);
  if (!ok) toast('Не удалось начать запись');
}
async function afterRecording(meetingId, blob, mime, dur) {
  let m = getItem(meetingId);
  if (!m) { m = newItem('meeting', { title: 'Запись ' + D.short(D.today()), date: D.today() }); }
  if (!blob.size) { toast('Запись пустая'); return; }
  const fid = uid(); await DB.put('files', blob, fid);
  const rec = { fileId: fid, mime, duration: dur, size: blob.size, created: new Date().toISOString(), fav: false, cloud: false };
  const v = await dialog({
    title: 'Встреча закончилась. Сохранить запись?', text: `Длительность ${fmtDur(dur)}, ${mb(blob.size)}.`,
    buttons: [{ l: 'Сохранить и обработать AI', v: 'ai', p: 1 }, { l: 'Сохранить', v: 'save' }, { l: 'Сохранить в избранное', v: 'fav' }, { l: 'Скачать файл', v: 'dl' }, { l: 'Удалить запись', v: 'del', d: 1 }]
  });
  if (v === 'del' && await confirmDel('Удалить запись без возможности восстановления?')) { await DB.del('files', fid); toast('Запись удалена'); return; }
  if (m.recording && m.recording.fileId) { /* keep previous file but replace link */ }
  m.recording = rec; if (v === 'fav') rec.fav = true;
  if (m.status === 'todo' && m.date && m.date <= D.today()) m.status = 'done';
  await saveItem(m);
  if (v === 'dl') downloadBlob(blob, 'Запись — ' + m.title + (mime.includes('mp4') ? '.m4a' : mime.includes('ogg') ? '.ogg' : '.webm'));
  if (S.route !== 'meeting' || S.meetingId !== m.id) go('meeting', m.id); else render();
  if (v === 'ai') processMeeting(m.id);
  else toast('Запись сохранена ✓');
}
async function recoverRecording() {
  const info = JSON.parse(localStorage.getItem('markus_recbuf') || 'null'); if (!info) return;
  const blob = await DB.get('files', 'recbuf').catch(() => null);
  localStorage.removeItem('markus_recbuf');
  if (!blob || !blob.size) return;
  const v = await dialog({ title: 'Найдена незавершённая запись', text: `Приложение закрылось во время записи. Сохранено ${fmtDur(info.dur || 0)} (${mb(blob.size)}). Восстановить?`, buttons: [{ l: 'Восстановить', v: 1, p: 1 }, { l: 'Удалить', v: 0, d: 1 }] });
  await DB.del('files', 'recbuf').catch(() => { });
  if (v) await afterRecording(info.meetingId, blob, info.mime, info.dur || 0);
}

/* ================= AI processing of meetings ================= */
async function processMeeting(id) {
  const m = getItem(id); if (!m || !m.recording) return;
  if (!AI.ready()) return toast('Добавьте ключ Gemini в Настройках → AI', 4000);
  const sh = openSheet(`<div class="dlg-t">AI обрабатывает встречу</div><div class="dlg-x" id="pm_s">Расшифровываю запись… Это может занять 1–3 минуты. Не закрывайте приложение.</div><div class="vo-step" style="color:var(--txt2)">Стенограмма<i class="spin" id="pm_1"></i></div><div class="vo-step" style="color:var(--txt2)">Анализ и задачи<i id="pm_2"></i></div>`, { cls: 'center' });
  const entry = topSheet(); entry.locked = true;
  try {
    const blob = await getFileBlob({ id: m.recording.fileId, cloud: m.recording.cloud });
    if (!blob) throw new Error('Аудиофайл не найден на этом устройстве');
    m.transcript = await AI.transcribe(blob, m.recording.mime, m);
    await saveItem(m, { render: false });
    $('#pm_1', sh).className = 'ok'; $('#pm_2', sh).className = 'spin'; $('#pm_s', sh).textContent = 'Анализирую: решения, обязательства, сроки, задачи…';
    const a = await AI.analyzeMeeting(m);
    m.summary = a.summary || {};
    m.proposed = (a.tasks || []).filter(t => t && t.title).map(t => Object.assign({}, t, { state: 'new' }));
    await saveItem(m);
    entry.locked = false; closeSheet();
    S.meetTab = 'short'; if (S.route === 'meeting') render();
    toast('Готово ✓ Итоги встречи ниже');
    if (m.proposed.length) {
      if (S.set.autoTasks === 'auto') await reviewProposed(id, true, true);
      else {
        const v = await dialog({ title: `Я нашёл ${m.proposed.length} ${plural(m.proposed.length, 'новую задачу', 'новые задачи', 'новых задач')}. Создать?`, text: m.proposed.map(t => '• ' + esc(t.title) + (t.date ? ' — ' + D.human(t.date) + (t.start || t.dueTime ? ', ' + (t.start || 'до ' + t.dueTime) : '') : '')).join('<br>'), buttons: [{ l: 'Создать все', v: 'all', p: 1 }, { l: 'Проверить по одной', v: 'one' }, { l: 'Позже', v: null }] });
        if (v === 'all') await reviewProposed(id, true);
        else if (v === 'one') await reviewProposed(id, false);
      }
    }
  } catch (e) {
    entry.locked = false; closeSheet();
    dialog({ title: 'Не получилось', text: esc(e.message), buttons: [{ l: 'Понятно', v: 1, p: 1 }] });
  }
}
function proposedToItem(t, m) {
  const it = newItem('task', { title: t.title, date: t.date || null, start: t.start || null, end: t.end || null, priority: ['normal', 'high', 'critical'].includes(t.priority) ? t.priority : 'normal', desc: `Из встречи «${m.title}»${m.date ? ' (' + D.human(m.date) + ')' : ''}${t.who ? '\nИсполнитель: ' + t.who : ''}${t.dueTime ? '\nСрок: до ' + t.dueTime : ''}`, participants: m.participants || [], linked: [m.id] });
  if (it.start && !it.end) it.end = D.addMin(it.start, 30);
  if (!it.date) { it.start = null; it.end = null; }
  if (it.date && !it.start && t.dueTime) { const r = D.dt(it.date, t.dueTime); r.setMinutes(r.getMinutes() - 60); it.customRemind = r.toISOString(); }
  return it;
}
async function createProposed(mid, i, silent) {
  const m = getItem(mid), t = m.proposed[i]; if (!t || t.state === 'created') return;
  const it = proposedToItem(t, m);
  if (!silent) { const r = await resolveConflicts(it); if (!r) return; }
  await saveItem(it, { render: false });
  t.state = 'created'; t.itemId = it.id;
  await saveItem(m);
  if (!silent) toast('Задача создана ✓');
}
async function reviewProposed(mid, all, auto) {
  const m = getItem(mid); let n = 0, warn = 0;
  for (let i = 0; i < m.proposed.length; i++) {
    const t = m.proposed[i]; if (t.state !== 'new') continue;
    if (all) {
      const it = proposedToItem(t, m);
      if (conflicts(it.date, it.start, it.end, it.id).length) warn++;
      await saveItem(it, { render: false }); t.state = 'created'; t.itemId = it.id; n++;
      continue;
    }
    const it = proposedToItem(t, m);
    const cs = conflicts(it.date, it.start, it.end, it.id);
    const v = await dialog({ title: `Задача ${i + 1} из ${m.proposed.length}`, text: `<b>${esc(it.title)}</b><br>${esc(whenLabel(it))}${t.who ? '<br>Исполнитель: ' + esc(t.who) : ''}${cs.length ? '<br><span class="warn">Пересекается с: ' + esc(cs.map(c => c.title).join(', ')) + '</span>' : ''}`, buttons: [{ l: 'Создать', v: 'ok', p: 1 }, { l: 'Изменить', v: 'edit' }, { l: 'Пропустить', v: 'skip' }, { l: 'Остановить', v: null }] });
    if (!v) break;
    if (v === 'skip') { t.state = 'skipped'; continue; }
    if (v === 'edit') { const saved = await openEditor('task', it); if (saved) { t.state = 'created'; t.itemId = saved.id; n++; } continue; }
    const r = await resolveConflicts(it); if (!r) { t.state = 'skipped'; continue; }
    await saveItem(it, { render: false }); t.state = 'created'; t.itemId = it.id; n++;
  }
  await saveItem(m);
  if (n) toast(`Создано задач: ${n}${warn ? ` (с пересечениями: ${warn} — проверьте календарь)` : ''}`, 4000);
}
