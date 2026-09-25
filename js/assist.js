'use strict';
/* ============================================================================
   Voice read-outs (driving mode: plan for a day, meeting summaries, questions by voice)
   and the built-in manual with an AI helper.
   ========================================================================== */

/* ---------- speech (text → voice), split into short pieces so long texts are not cut off ---------- */
function speechChunks(text) {
  const parts = String(text || '').replace(/\s+\n/g, '\n').split(/(?<=[.!?…;])\s+|\n+/).map(x => x.trim()).filter(Boolean);
  const chunks = [];
  parts.forEach(p => { while (p.length > 220) { const i = p.lastIndexOf(' ', 220); chunks.push(p.slice(0, i > 60 ? i : 220)); p = p.slice(i > 60 ? i + 1 : 220); } if (p) chunks.push(p); });
  return chunks;
}
const Speech = {
  on: false,
  voice() {
    try {
      const want = srLang().toLowerCase(), short = want.slice(0, 2);
      const vs = speechSynthesis.getVoices();
      return vs.find(v => v.lang.toLowerCase().replace('_', '-') === want) || vs.find(v => v.lang.toLowerCase().startsWith(short)) || null;
    } catch (e) { return null; }
  },
  say(text, o = {}) {
    if (!window.speechSynthesis) { toast(t('Этот браузер не умеет говорить вслух')); return; }
    Speech.stop();
    const chunks = speechChunks(text);
    if (!chunks.length) return;
    Speech.on = true;
    const v = Speech.voice();
    chunks.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(c);
      u.lang = srLang(); if (v) u.voice = v; u.rate = +S.set.speechRate || 1;
      if (i === chunks.length - 1) u.onend = () => { Speech.on = false; if (o.onend) o.onend(); driveStatus(); };
      speechSynthesis.speak(u);
    });
    driveStatus(text);
  },
  stop() { try { speechSynthesis.cancel(); } catch (e) { } Speech.on = false; }
};

/* ---------- what to say ---------- */
function briefingText(from, to) {
  to = to || from;
  const out = [];
  for (let d = from, k = 0; d <= to && k < 31; d = D.add(d, 1), k++) {
    const ag = sortAgenda(dayAgenda(d).filter(e => e.it.status !== 'cancelled' && e.it.status !== 'done'), 'time');
    const head = cap(D.human(d)) + (d !== D.today() && d !== D.add(D.today(), 1) ? ', ' + D.dowFull(D.parse(d).getDay()) : '');
    if (!ag.length) { if (from === to) out.push(t('{d}: ничего не запланировано.', { d: head })); continue; }
    out.push(t('{d}: дел — {n}.', { d: head, n: ag.length }));
    ag.forEach(e => {
      const it = e.it, bits = [];
      if (e.subs) { bits.push(t('Срок подзадач по «{x}»', { x: it.title }) + ': ' + e.subs.map(s => s.text + (s.time ? ' ' + t('до {t}', { t: s.time }) : '')).join('; ')); out.push(bits.join('') + '.'); return; }
      bits.push(it.start ? t('В {t}', { t: it.start }) : e.cont ? t('Продолжается') : t('Без времени'));
      bits.push((it.kind === 'meeting' ? t('встреча') + ': ' : '') + it.title);
      const place = it.place || ((it.locations || [])[0] && placeTitle(it.locations[0]));
      if (place) bits.push(t('место: {p}', { p: place }));
      if (it.priority === 'critical') bits.push(t('критично')); else if (it.priority === 'high') bits.push(t('важно'));
      const p = progress(it); if (p != null && p > 0) bits.push(t('выполнено {p}%', { p }));
      const ns = nextSub(it); if (ns) bits.push(t('следующий шаг: {s}', { s: ns.text }));
      if (it.kind === 'meeting' && it.autoRecord && it.start) bits.push(t('запись включится сама'));
      out.push(bits.join(', ') + '.');
    });
  }
  if (from === D.today()) {
    const od = overdueList().filter(i => i.date < from);
    if (od.length) out.push(t('Просрочено: {n}.', { n: od.length }) + ' ' + od.slice(0, 5).map(i => i.title).join('; ') + '.');
  }
  return out.join('\n');
}
function meetingSpeech(m) {
  const s = m.summary || {}, out = [];
  out.push(t('Итоги встречи') + ': ' + m.title + (m.date ? ', ' + D.human(m.date) : '') + '.');
  const add = (title, arr) => { if (arr && arr.length) out.push(title + ': ' + arr.map(x => typeof x === 'string' ? x : `${x.who ? x.who + ' — ' : ''}${x.what || ''}${x.due ? ', ' + x.due : ''}`).join('; ') + '.'); };
  add(t('Кратко'), s.short); add(t('Решения'), s.decisions); add(t('Обязательства'), s.commitments); add(t('Сроки'), s.deadlines); add(t('Следующие шаги'), s.next);
  const made = (m.proposed || []).filter(x => x.state === 'created').map(x => getItem(x.itemId)).filter(Boolean);
  if (made.length) out.push(t('Добавлено в планы') + ': ' + made.map(i => i.title + ', ' + whenLabel(i)).join('; ') + '.');
  return out.join('\n');
}
function speakMeeting(id) { const m = getItem(id); if (m && m.summary) Speech.say(meetingSpeech(m)); }
function lastMeetingWithSummary() { return sortByDate(live().filter(i => i.kind === 'meeting' && i.summary), true)[0] || null; }

/* ---------- driving mode ---------- */
let driveWake = null;
async function driveWakeOn() { try { if (navigator.wakeLock && !driveWake) { driveWake = await navigator.wakeLock.request('screen'); driveWake.addEventListener('release', () => { driveWake = null; }); } } catch (e) { } }
function driveWakeOff() { try { driveWake && driveWake.release(); } catch (e) { } driveWake = null; }
function driveStatus(text) { const el = $('#dr_now'); if (el) el.textContent = text != null ? text : (Speech.on ? el.textContent : t('Нажмите кнопку — я прочитаю вслух.')); const st = $('#dr_stop'); if (st) st.hidden = !Speech.on; }
SCREENS.drive = () => {
  const lm = lastMeetingWithSummary();
  const b = `<div class="drive">
    <button class="drive-b pri" onclick="Speech.say(briefingText(D.today()))">${ic('play', 30)}<div>${t('План на сегодня')}<small>${esc(cap(D.long(D.today())))}</small></div></button>
    <button class="drive-b" onclick="Speech.say(briefingText(D.add(D.today(),1)))">${ic('play', 30)}<div>${t('План на завтра')}</div></button>
    <button class="drive-b" onclick="Speech.say(briefingText(D.today(), D.add(D.today(),6)))">${ic('calendar', 30)}<div>${t('План на неделю')}</div></button>
    <button class="drive-b" ${lm ? `onclick="speakMeeting('${lm.id}')"` : 'disabled style="opacity:.5"'}>${ic('users', 30)}<div>${t('Итоги последней встречи')}<small>${lm ? esc(lm.title) : t('Пока нет итогов')}</small></div></button>
    <button class="drive-b" onclick="driveAsk()">${ic('mic', 30)}<div>${t('Спросить голосом')}<small>${t('«Что у меня в пятницу?», «Что решили с Василием?»')}</small></div></button>
    <button class="drive-b sos" id="dr_stop" onclick="Speech.stop();driveStatus('')" ${Speech.on ? '' : 'hidden'}>${ic('pause', 30)}<div>${t('Стоп')}</div></button>
    <div class="drive-now" id="dr_now">${t('Нажмите кнопку — я прочитаю вслух.')}</div>
    <div class="hint">${t('Экран не гаснет, пока открыт этот режим. Звук идёт через динамик телефона или Bluetooth машины.')}</div></div>`;
  return { top: titleTop(t('За рулём')), body: b, after: () => driveWakeOn() };
};
async function driveAsk() {
  const SRc = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SRc) return toast(t('Голосовой ввод работает в Chrome / Edge / Safari'));
  Speech.stop();
  const rec = new SRc(); rec.lang = srLang(); rec.interimResults = false; rec.maxAlternatives = 1;
  driveStatus('🎙 ' + t('Говорите…'));
  rec.onresult = e => { const q = (e.results[0][0].transcript || '').trim(); if (q) driveAnswer(q); };
  rec.onerror = e => { driveStatus(e.error === 'not-allowed' ? t('Разрешите доступ к микрофону') : t('Не расслышал — повторите или напишите')); };
  try { rec.start(); } catch (e) { }
}
async function driveAnswer(q) {
  driveStatus('«' + q + '»\n' + t('MARKUS-A думает…'));
  if (!AI.ready()) {
    const low = q.toLowerCase();
    if (/завтра|tomorrow|ertaga|yarın|morgen/.test(low)) return Speech.say(briefingText(D.add(D.today(), 1)));
    if (/недел|week|hafta|woche/.test(low)) return Speech.say(briefingText(D.today(), D.add(D.today(), 6)));
    return Speech.say(briefingText(D.today()));
  }
  try {
    const p = await AI.parseCommand(q);
    if (p.intent === 'query') { const x = p.query || {}; return Speech.say(briefingText(x.from || D.today(), x.to || x.from || D.today())); }
    if (p.intent === 'find_slot') { const sl = p.slot || {}; const r = findAhead(+sl.durationMin || 60, D.today(), sl.untilDate || D.add(D.today(), 7), 3); return Speech.say(r.length ? t('Свободно') + ': ' + r.map(x => slotLabel(x, true)).join('; ') : t('Свободных окон не нашлось')); }
    if (p.intent === 'create_note') { const n = newItem('note', { title: p.title || q.slice(0, 60), desc: p.noteText || q }); await saveItem(n); return Speech.say(t('Записал')); }
    if (p.intent === 'create_task' || p.intent === 'create_meeting') { Speech.say(t('Проверьте детали на экране, когда остановитесь.')); return createFlow(p, q); }
    const ans = await AI.askData(q);
    Speech.say(ans);
  } catch (e) { driveStatus(e.message); Speech.say(e.message); }
}

/* ---------- manual + AI helper ---------- */
function helpSections() { const H = window.HELP || {}; return H[langCode()] || H.en || H.ru || []; }
SCREENS.help = () => {
  const secs = helpSections();
  const b = `<div class="set-card"><label class="lbl">${ic('ai', 14)} ${t('Спросите помощника, как что сделать')}</label>
      <div class="inp-mic"><input class="inp" id="hp_q" placeholder="${esc(t('Например: как отправить клиенту место встречи?'))}" onkeydown="if(event.key==='Enter')helpAsk()"><button class="mic-sm" onclick="dictateInto('hp_q',this)">${ic('mic')}</button><button class="mic-sm" onclick="helpAsk()">${ic('send')}</button></div>
      <div id="hp_a"></div></div>
    ${secs.map(([id, icon, title, text]) => `<details class="help" id="hs_${id}"><summary>${ic(icon, 18)} ${esc(title)}</summary><div>${esc(text)}</div></details>`).join('')}
    <div class="hint" style="text-align:center;margin:16px 0">MARKUS-A 3.0</div>`;
  return { top: titleTop(t('Инструкция')), body: b };
};
async function helpAsk() {
  const q = ($('#hp_q').value || '').trim(); if (!q) return;
  const out = $('#hp_a');
  const secs = helpSections();
  // without AI: open the sections that contain the words of the question
  const words = q.toLowerCase().split(/[^a-zа-яёўқғҳçğıöşüäöß0-9]+/i).filter(w => w.length > 3).map(w => w.slice(0, Math.max(4, w.length - 2)));
  const hits = secs.filter(s => words.some(w => (s[2] + ' ' + s[3]).toLowerCase().includes(w)));
  hits.forEach(s => { const d = $('#hs_' + s[0]); if (d) d.open = true; });
  if (!AI.ready()) { out.innerHTML = `<div class="hint">${hits.length ? t('Открыл подходящие разделы ниже.') : t('Подключите AI в настройках — тогда помощник ответит своими словами.')}</div>`; return; }
  out.innerHTML = `<div class="ai-box">${t('MARKUS-A думает…')}</div>`;
  try {
    const manual = (window.HELP.ru || []).map(s => '## ' + s[2] + '\n' + s[3]).join('\n\n');
    const a = await AI.call([{ text: `Вопрос пользователя: ${q}` }], { system: `Ты — встроенный помощник приложения MARKUS-A (планировщик, встречи, автозапись, AI-итоги). Отвечай коротко и по шагам, простыми словами для человека без технических знаний, ${IN_LANG()}. Опирайся только на инструкцию ниже; если ответа в ней нет — честно скажи и предложи ближайший вариант.\n\nИНСТРУКЦИЯ:\n${manual}`, temp: 0.2 });
    out.innerHTML = `<div class="ai-box">${esc(a)}</div><button class="link" onclick="Speech.say($('#hp_a .ai-box').textContent)">${ic('play', 14)} ${t('Прочитать вслух')}</button>`;
  } catch (e) { out.innerHTML = `<div class="ai-box">${esc(e.message)}</div>`; }
}
