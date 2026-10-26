'use strict';
const MAMMOTH_URL = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

function nowContext() {
  const d = new Date(), off = -d.getTimezoneOffset() / 60;
  return `Сейчас: ${D.fmt(d)} ${D.nowTime()}, ${D.dowFull(d.getDay())}. Часовой пояс UTC${off >= 0 ? '+' : ''}${off}.`;
}
function meName() { const n = S.set.name && !/@/.test(S.set.name) ? S.set.name : ''; const al = String(S.set.aliases || '').trim(); return n || al ? ' (' + [n, al].filter(Boolean).join(', ') + ')' : ''; }
function hms(sec) { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s); }
function outLang() { const L = langCode(); return L === 'ru' ? 'русском' : ({ en: 'English', uz: "o'zbek (lotin)", tr: 'Türkçe', de: 'Deutsch' }[L] || langName(L)); }
const IN_LANG = () => langCode() === 'ru' ? 'по-русски' : 'на языке: ' + outLang() + ' (язык интерфейса пользователя)';
/* v4.2: an answer that was cut off in the middle (the model ran out of room) is closed by hand:
   the unfinished last item is dropped, everything before it is kept */
function repairJSON(s) {
  const cuts = [], st = []; let inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') st.push(c);
    else if (c === '}' || c === ']') st.pop();
    else if (c === ',') cuts.push([i, st.join('')]);
  }
  const close = k => k.split('').reverse().map(x => x === '{' ? '}' : ']').join('');
  // a text cut inside a word is not kept as it is ("Подготовить дого"): the unfinished item is dropped
  const tries = (inStr ? [] : [[s.length, st.join(''), false]]).concat(cuts.slice(-80).reverse().map(([i, k]) => [i, k, false]));
  for (const [i, k, str] of tries) {
    let body = s.slice(0, i); if (str) body += '"';
    body = body.replace(/[,:\s]+$/, '');
    try { return JSON.parse(body + close(k)); } catch (e) { }
  }
  return null;
}
function parseJSON(raw, meta) {
  raw = String(raw || '').replace(/```json|```/g, '').trim();
  try { return JSON.parse(raw); } catch (e) { }
  const m = raw.match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch (e2) { } }
  const i = raw.indexOf('{');
  if (i >= 0) { const r = repairJSON(raw.slice(i)); if (r && typeof r === 'object' && Object.keys(r).length) { if (meta) meta.repaired = true; return r; } }
  throw new Error(t('AI вернул непонятный ответ'));
}
/* the same text repeated over and over (the model sometimes loops on silence) is cut to two lines */
function squeezeRepeats(s) {
  const out = []; let last = '', n = 0;
  for (const ln of String(s || '').split('\n')) { const k = ln.trim().toLowerCase(); if (k && k === last) { if (++n > 2) continue; } else { last = k; n = 1; } out.push(ln); }
  return out.join('\n');
}
function abortError() { const er = new Error(t('Остановлено')); er.aborted = true; return er; }
/* waits, but wakes up at once when the job is stopped */
async function sleepJob(ms, signal) { const end = Date.now() + ms; while (Date.now() < end) { if (signal && signal.aborted) throw abortError(); await sleep(Math.min(1000, end - Date.now())); } }

const CMD_PROMPT = `Ты — модуль понимания команд личного ассистента MARKUS-A. Пользователь говорит или пишет на любом языке (русский, узбекский, английский, турецкий, немецкий и др.). title и noteText пиши на том же языке, на котором сказана команда. Разбери команду и верни ТОЛЬКО JSON:
{
"intent": "create_task" | "create_meeting" | "create_reminder" | "create_note" | "query" | "find_slot" | "unknown",
"title": "краткое название действия с заглавной буквы, без даты и времени",
"date": "YYYY-MM-DD" или null,
"dateOptions": ["YYYY-MM-DD"] — ТОЛЬКО если дата реально неоднозначна (например «в среду», когда непонятно — эта или следующая), иначе [],
"start": "HH:MM" или null,
"end": "HH:MM" или null,
"durationMin": число или null,
"timeHint": "morning" | "afternoon" | "evening" | null,
"timeless": true — если это дедлайн или дело на весь день без конкретного времени («до пятницы проверить договор»), иначе false,
"priority": "normal" | "high" | "critical",
"category": одно из названий категорий или null,
"participants": ["имена людей или компаний"],
"place": "место" или null,
"remindMinutesBefore": [числа минут] или null,
"remindAt": "YYYY-MM-DDTHH:MM" или null — момент, КОГДА напомнить (не дата события),
"event": {"type": "birthday" | "anniversary" | "holiday" | "other", "date": "YYYY-MM-DD", "person": "чей"} или null — если речь о дне рождения, юбилее, годовщине, празднике,
"yearly": true — если это день рождения / годовщина / ежегодное событие или сказано «каждый год», иначе false,
"query": {"from":"YYYY-MM-DD","to":"YYYY-MM-DD","fromTime":"HH:MM" или null,"toTime":"HH:MM" или null} или null,
"slot": {"durationMin": число, "untilDate": "YYYY-MM-DD"} или null,
"noteText": "аккуратный грамотный текст заметки" или null,
"reply": "короткий ответ пользователю, если intent = unknown"
}
Правила:
1. НИКОГДА не выдумывай время. Если точное время не названо — start=null; при «утром/днём/вечером» заполни timeHint.
2. «с 10 до 11» → start "10:00", end "11:00". «в 14 часов на час» → start "14:00", durationMin 60. «часа на два» → durationMin 120. «в 10 утра до 11 часов» → start "10:00", end "11:00".
3. «через 2 часа», «через 30 минут» — вычисли точные date и start от текущего момента. Для коротких действий (позвонить, написать, отправить, купить) ставь durationMin 15.
4. «Напомни (мне) …», «не забыть …», «напоминалка …» — это create_reminder. title — ЧТО напомнить, коротко и понятно, с датой события, если она есть: «30 сентября в 21:00 напомни, что 1 октября день рождения у Жужика» → intent create_reminder, remindAt "YYYY-09-30T21:00", title «День рождения у Жужика — 1 октября», event {type:"birthday", date:"YYYY-10-01", person:"Жужик"}, yearly true. Если момент напоминания не назван — remindAt null.
4а. Просто сообщение о дне рождения/годовщине без «напомни» («1 октября день рождения у Жужика») — тоже create_reminder с event и remindAt null.
4б. В title для напоминаний ОБЯЗАТЕЛЬНО все детали из фразы: ЧЕЙ день рождения (имя), что купить/сказать/сделать, с кем, где. Никогда не сокращай до «День рождения» или «Позвонить» без имени. «Завтра в 9 напомни про день рождения Джахонгира, купить торт» → title «День рождения Джахонгира — купить торт», event.person «Джахонгир». Имена пиши так, как сказано, с заглавной буквы.
5. Встреча, переговоры, созвон с кем-то — create_meeting.
6. «Запиши…», «заметка…», «запомни…» — create_note.
7. «Что у меня сегодня / завтра / на неделе / после обеда» — query. «После обеда» → fromTime "13:00".
8. «Найди свободное окно / время на N часов до …» — find_slot. «до пятницы» → untilDate ближайшей пятницы.
9. «срочно», «критично», «горит» → critical; «важно», «важная» → high; иначе normal.
10. Числа словами: «двенадцать пятнадцать» = 12:15, «двадцать пятого мая» = 25 мая. «В 10 вечера» = 22:00. «В 3 часа» без уточнения днём = 15:00.
11. Даты без года — ближайшая будущая такая дата.`;

const AI = {
  ready() { return !!(S.set.aiKey && S.set.aiKey.trim()); },
  /* Several models are tried in turn, so AI keeps working when Google renames/retires a model
     or the free limit of one model is used up. The list of available models is also read
     from Google itself (ListModels) and remembered for a day. */
  FALLBACK: ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
  bad: {},
  key() { return (S.set.aiKey || '').trim(); },
  /* v4.2.1: Google counts the free DAILY limit separately for EACH model. A model whose day is used up is skipped
     (until the limit is renewed — at midnight Pacific time) and the next model is tried. The note is kept per key. */
  spentMap() { try { const x = JSON.parse(localStorage.getItem('markus_ai_spent') || 'null'); return x && x.k === AI.key().slice(-8) ? x.m || {} : {}; } catch (e) { return {}; } },
  isSpent(model) { return (AI.spentMap()[model] || 0) > Date.now(); },
  spend(model, until) { try { const m = AI.spentMap(); m[model] = until; localStorage.setItem('markus_ai_spent', JSON.stringify({ k: AI.key().slice(-8), m })); } catch (e) { } },
  nextReset() {   // the next midnight in Pacific time: that is where Google's day ends
    try {
      const p = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).forEach(x => { p[x.type] = +x.value; });
      return Date.now() + (86400 - (p.hour * 3600 + p.minute * 60 + p.second)) * 1000 + 3 * 60000;
    } catch (e) { return Date.now() + 6 * 3600000; }
  },
  dailyError(until) {
    const er = new Error(t('Дневной лимит бесплатного AI исчерпан. Лимит обновляется раз в сутки — запись подождёт и обработается сама.'));
    er.status = 429; er.next = true; er.transient = true; er.daily = true; er.retryAt = until; return er;
  },
  chain() {
    let good = null, disc = [];
    try { good = localStorage.getItem('markus_ai_good'); disc = (JSON.parse(localStorage.getItem('markus_ai_models') || 'null') || {}).list || []; } catch (e) { }
    const want = (S.set.aiModel || '').trim();
    return Array.from(new Set([want, good].concat(AI.FALLBACK, disc).filter(Boolean))).filter(m => (!AI.bad[m] || Date.now() - AI.bad[m] > 30 * 60000) && !AI.isSpent(m));
  },
  async discover() {
    try {
      const c = JSON.parse(localStorage.getItem('markus_ai_models') || 'null');
      if (c && Date.now() - c.at < 86400000) return c.list;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(AI.key())}`);
      if (!r.ok) return [];
      const d = await r.json();
      const list = (d.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''))
        .filter(n => /gemini/.test(n) && /flash/.test(n) && !/(image|tts|live|audio|embedding|thinking-exp|preview-0[0-5])/.test(n))
        .sort((x, y) => { const v = n => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [0, 0])[1]); return v(y) - v(x) || (/lite/.test(x) - /lite/.test(y)); });
      localStorage.setItem('markus_ai_models', JSON.stringify({ at: Date.now(), list }));
      return list;
    } catch (e) { return []; }
  },
  /* v4.2: how many tokens the answer may have (older models allow only 8192) */
  maxOutFor(model, want) { return /gemini-(2\.5|[3-9])|latest|pro/.test(model) ? Math.min(want, 65000) : Math.min(want, 8192); },
  /* options: json, system, temp, tools, contents · signal (stop the job) · timeoutMs · maxOut · meta (gets finish/model) */
  async callModel(model, parts, { json = false, system, temp = 0.2, contents, tools, signal, timeoutMs = 120000, maxOut, meta } = {}) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(AI.key())}`;
    const body = { contents: contents || [{ role: 'user', parts }], generationConfig: { temperature: temp } };
    if (tools) body.tools = tools;
    if (json) body.generationConfig.responseMimeType = 'application/json';
    if (maxOut) body.generationConfig.maxOutputTokens = AI.maxOutFor(model, maxOut);
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    if (signal && signal.aborted) throw abortError();
    // every request has a time limit: a frozen connection can no longer hold the whole job forever
    const ctl = new AbortController(); let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, timeoutMs);
    const onAbort = () => ctl.abort(); if (signal) signal.addEventListener('abort', onAbort);
    const done = () => { clearTimeout(timer); if (signal) signal.removeEventListener('abort', onAbort); };
    const failed = e => {
      done();
      if (signal && signal.aborted) return abortError();
      if (timedOut) { const er = new Error(t('AI не ответил вовремя')); er.next = true; er.timeout = true; er.transient = true; return er; }
      const er = new Error(t('Нет связи с AI. Проверьте интернет.')); er.net = true; return er;
    };
    let r;
    try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal }); }
    catch (e) { throw failed(e); }
    if (!r.ok) {
      let m = '', delay = 0, det = '';
      try { const j = await r.json(); m = (j.error && j.error.message) || ''; det = JSON.stringify((j.error && j.error.details) || ''); const ri = ((j.error && j.error.details) || []).find(d => d && d.retryDelay); if (ri) delay = parseFloat(ri.retryDelay) || 0; } catch (e) { }
      done();
      if (!delay) { const mm = /retry in ([\d.]+)\s*s/i.exec(m); if (mm) delay = parseFloat(mm[1]); }
      const er = new Error('AI ' + r.status + ': ' + m); er.status = r.status; if (delay) er.retry = delay;
      if (r.status === 429) {
        er.message = t('Лимит бесплатного AI на сейчас исчерпан. Попробуйте через минуту.'); er.next = true; er.transient = true;
        er.detail = m.slice(0, 400); er.limitModel = model;
        if (/per ?day|PerDay|daily|limit: ?0\b/i.test(m + ' ' + det)) { er.daily = true; er.message = t('Дневной лимит бесплатного AI исчерпан. Лимит обновляется раз в сутки — запись подождёт и обработается сама.'); }
      }
      else if ((r.status === 400 || r.status === 403) && /API key|API_KEY|permission|PERMISSION/i.test(m)) { er.message = t('Неверный ключ Gemini. Проверьте Настройки → AI.'); er.fatal = true; }
      else if (r.status === 404 || /not found|not supported|deprecated|no longer|unsupported model|is not available/i.test(m)) { er.next = true; er.model = true; }
      else if (r.status >= 500) { er.next = true; er.transient = true; }
      else if (r.status === 400 && /mime|format|unsupported|invalid/i.test(m)) er.input = true;
      throw er;
    }
    let d;
    try { d = await r.json(); } catch (e) { throw failed(e); }
    done();
    const fin = (d.candidates && d.candidates[0] && d.candidates[0].finishReason) || '';
    AI.lastFinish = fin;   // MAX_TOKENS = the answer was cut off
    if (meta) { meta.finish = fin; meta.model = model; }
    const text = ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).filter(p => !p.thought).map(p => p.text || '').join('');
    const gm = d.candidates && d.candidates[0] && d.candidates[0].groundingMetadata;   // web search: the pages the answer is based on
    AI.lastSources = gm && gm.groundingChunks ? gm.groundingChunks.map(c => c.web).filter(w => w && w.uri).map(w => ({ title: w.title || w.uri, uri: w.uri })).slice(0, 6) : [];
    if (!text) { const er = new Error(t('AI вернул пустой ответ')); er.next = true; er.transient = true; throw er; }
    return json ? parseJSON(text, meta) : text.trim();
  },
  /* Models are tried one after another. With { patient: true } (long jobs) a wave of failures that can pass —
     free limit used up, Google overloaded, no connection — is not the end: wait and go round the models again. */
  async call(parts, opts = {}) {
    if (!AI.ready()) throw new Error(t('Добавьте ключ Gemini в Настройках → AI'));
    const rounds = opts.patient ? (opts.rounds || 4) : 1;
    let lastErr = null;
    for (let round = 0; round < rounds; round++) {
      if (opts.signal && opts.signal.aborted) throw abortError();
      let chain = AI.chain(), discovered = false, wait = 0, netDown = false;
      lastErr = null;
      if (!chain.length) {   // every model has used up its day: no request is sent
        const sp = Object.values(AI.spentMap()).filter(v => v > Date.now());
        if (sp.length) throw AI.dailyError(Math.min(...sp));
      }
      for (let i = 0; i < chain.length && i < 14 && !netDown; i++) {
        const model = chain[i];
        if (AI.isSpent(model)) continue;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await AI.callModel(model, parts, opts);
            try { localStorage.setItem('markus_ai_good', model); } catch (e) { }
            AI.lastModel = model;
            return res;
          } catch (e) {
            lastErr = e;
            if (e.aborted || e.fatal || e.input) throw e;
            if (e.net) { if (!opts.patient) throw e; netDown = true; break; }
            if (e.retry) wait = Math.max(wait, e.retry);
            if (e.daily) AI.spend(model, AI.nextReset());
            if (e.status >= 500 && attempt === 0) { await sleep(1500); continue; }   // overloaded → one retry
            break;
          }
        }
        if (netDown) break;
        if (lastErr && (lastErr.model || lastErr.daily)) {   // a retired model, or one whose day is used up: look for others in Google's list
          if (lastErr.model) AI.bad[model] = Date.now();
          if (!discovered) { discovered = true; const list = await AI.discover(); chain = Array.from(new Set(chain.concat(list))); }
        }
        if (!lastErr || !lastErr.next) throw lastErr;
      }
      if (lastErr && lastErr.daily) { const sp = Object.values(AI.spentMap()).filter(v => v > Date.now()); lastErr.retryAt = sp.length ? Math.min(...sp) : AI.nextReset(); }   // every model tried today is spent
      if (!opts.patient || !lastErr || !(lastErr.transient || lastErr.net) || lastErr.daily || round === rounds - 1) throw lastErr;
      const sec = Math.min(90, Math.max(15, Math.ceil(wait) + 3) + round * 15);
      if (opts.onWait) opts.onWait(sec, lastErr.net ? 'net' : 'limit', round + 1);
      await sleepJob(sec * 1000, opts.signal);
    }
    throw lastErr || new Error(t('AI вернул пустой ответ'));
  },
  /* big files (long recordings) go through Google's Files API instead of inside the request — used only when
     the recording cannot be cut into pieces */
  async uploadFile(blob, mime, onPct, signal) {
    const k = encodeURIComponent(AI.key());
    const fx = async (url, init, ms) => {
      const ctl = new AbortController(); let to = false; const tm = setTimeout(() => { to = true; ctl.abort(); }, ms);
      const ab = () => ctl.abort(); if (signal) signal.addEventListener('abort', ab);
      try { return await fetch(url, Object.assign({ signal: ctl.signal }, init)); }
      catch (e) { if (signal && signal.aborted) throw abortError(); const er = new Error(to ? t('AI не ответил вовремя') : t('Нет связи с AI. Проверьте интернет.')); er.net = !to; er.transient = true; throw er; }
      finally { clearTimeout(tm); if (signal) signal.removeEventListener('abort', ab); }
    };
    const start = await fx(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${k}`, { method: 'POST', headers: {
      'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(blob.size),
      'X-Goog-Upload-Header-Content-Type': mime, 'Content-Type': 'application/json' }, body: JSON.stringify({ file: { display_name: 'markus-a-recording' } }) }, 60000);
    const up = start.headers.get('x-goog-upload-url');
    if (!start.ok || !up) throw new Error(t('Не удалось загрузить запись в AI (ошибка {s})', { s: start.status }));
    if (onPct) onPct(10);
    const r = await fx(up, { method: 'POST', headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' }, body: blob }, 25 * 60000);
    if (!r.ok) throw new Error(t('Не удалось загрузить запись в AI (ошибка {s})', { s: r.status }));
    let f = (await r.json()).file;
    for (let i = 0; i < 100 && f && f.state === 'PROCESSING'; i++) {
      if (onPct) onPct(Math.min(95, 20 + i));
      await sleepJob(3000, signal);
      const g = await fx(`https://generativelanguage.googleapis.com/v1beta/${f.name}?key=${k}`, {}, 30000); if (g.ok) f = await g.json();
    }
    if (!f || f.state === 'FAILED') throw new Error(t('AI не смог принять файл записи'));
    if (f.state === 'PROCESSING') { const er = new Error(t('AI слишком долго готовит файл записи')); er.transient = true; throw er; }
    if (onPct) onPct(100);
    return { file_data: { mime_type: f.mimeType || mime, file_uri: f.uri } };
  },

  parseCommand(text) {
    const cats = S.set.categories.map(c => c.name).join(', ');
    return AI.call([{ text: `${nowContext()}\nКатегории: ${cats}.\nКоманда пользователя: «${text}»` }], { json: true, system: CMD_PROMPT, temp: 0 });
  },

  PIECE_SEC: 600,   // v4.2: a long recording is cut into pieces of this length (seconds)
  PAR: 2,           // pieces transcribed at the same time (the free limit allows about 10 requests a minute)
  trOpts(job, ms) { return { temp: 0, patient: true, signal: job.signal, timeoutMs: ms, maxOut: 16000, onWait: job.onWait }; },
  trPrompt(meeting) {
    const who = (meeting.participants || []).length ? 'Участники: ' + meeting.participants.join(', ') + ' и владелец записи' + meName() + ' — «Я».' : 'Владелец записи' + meName() + ' — «Я».';
    return `Сделай точную стенограмму этой записи ${meeting.emergency ? 'разговора' : 'встречи'} на языке оригинала (русский, узбекский или другой). ${who}
Разделяй реплики по говорящим: «Участник 1:», «Участник 2:» — или по именам, если они понятны из разговора. Расставь знаки препинания, разбей на абзацы. Суммы, даты, сроки, ФИО, номера кабинетов, телефоны и названия компаний пиши точно. Телефон мог лежать далеко или в шумном месте: внимательно расшифруй и тихую, дальнюю речь, реплики вполголоса и фразы на фоне шума; что разобрать невозможно — пометь [неразборчиво], а не пропускай молча. Ничего не добавляй от себя и НИЧЕГО не сокращай — нужна дословная стенограмма, а не пересказ. Верни только текст стенограммы.${(meeting.recording && (meeting.recording.calls || []).length) ? ' Запись ставилась на паузу на время телефонных звонков — на стыках фраза может обрываться, отметь такое место как [пауза].' : ''}`;
  },

  /* v4.2. A short recording goes in one request. A long one is cut (in the phone, without decoding) into pieces of
     10 minutes; each piece is a small separate request, so it does not matter how long the meeting was. Finished pieces
     are kept on the device: after a break (app closed, no internet, limit) the work goes on from where it stopped.
     job = { key, sig, signal, onProgress(done,total), onWait(sec,why,round) } */
  async transcribe(blob, mime, meeting, onPct, onStep, job = {}) {
    const base = (mime || blob.type || 'audio/webm').split(';')[0];
    const prompt = AI.trPrompt(meeting);
    const dur = Math.round(+(meeting.recording && meeting.recording.duration) || 0);
    const whole = dur ? (dur <= 12 * 60 && blob.size <= 14 * 1048576) : blob.size <= 6 * 1048576;
    if (whole) return AI.transcribeWhole(blob, base, prompt, job);
    let plan = null;
    if (typeof AudioSplit !== 'undefined') { try { plan = await AudioSplit.split(blob, AI.PIECE_SEC, { duration: dur }); } catch (e) { console.warn('split:', e.message); } }
    if (plan && plan.parts.length) {
      const items = plan.parts.map(p => ({ from: p.from, to: p.to, variants: async () => {
        const data = await b64(await p.get());
        return [p.mime].concat(p.mime === 'audio/webm' ? ['video/webm', 'audio/ogg'] : []).map(mt => [{ inline_data: { mime_type: mt, data } }]);
      } }));
      try { return await AI.runPieces(items, prompt, job, plan.kind + plan.parts.length, AI.PAR); }
      catch (e) { if (!e.input || e.aborted) throw e; console.warn('pieces refused, old way:', e.message); }
    }
    return AI.transcribeRanges(blob, base, dur, prompt, job, onPct);   // the format could not be cut: the old way
  },
  async transcribeWhole(blob, base, prompt, job) {
    const data = await b64(blob);
    const tries = [base];
    if (base === 'audio/webm') tries.push('video/webm', 'audio/ogg');
    if (base === 'audio/mp4') tries.push('audio/aac', 'video/mp4');
    let err;
    for (const mt2 of tries) {
      try { return squeezeRepeats(await AI.call([{ inline_data: { mime_type: mt2, data } }, { text: prompt }], AI.trOpts(job, 240000))); }
      catch (e) { err = e; if (!e.input && !/mime|format|unsupported|invalid|400/i.test(e.message)) throw e; }
    }
    throw err;
  },
  /* only for a recording that could not be cut: the whole file stays at Google and each request names the minutes it needs.
     Every request carries the whole recording, so they go one at a time. */
  async transcribeRanges(blob, base, dur, prompt, job, onPct) {
    if (blob.size > 1900 * 1048576) throw new Error(t('Запись слишком большая для AI'));
    const file = await AI.uploadFile(blob, base, onPct, job.signal);
    if (!dur) return squeezeRepeats(await AI.call([file, { text: prompt }], AI.trOpts(job, 600000)));
    const CH = AI.PIECE_SEC, n = Math.ceil(dur / CH);
    const items = Array.from({ length: n }, (_, k) => ({ from: k * CH, to: Math.min(dur, (k + 1) * CH), range: true, variants: async () => [[file]] }));
    return AI.runPieces(items, prompt, job, 'r' + n, 1);
  },
  async runPieces(items, prompt, job, tag, par) {
    const n = items.length, key = job.key, sig = (job.sig || '') + ':' + tag;
    const res = new Array(n).fill(null), saved = {};
    if (key) { try { const s = await DB.get('meta', key); if (s && s.sig === sig && s.parts) Object.keys(s.parts).forEach(k => { if (+k < n && typeof s.parts[k] === 'string') { res[+k] = s.parts[k]; saved[k] = s.parts[k]; } }); } catch (e) { } }
    const count = () => res.filter(x => x != null).length;
    const persist = async () => { if (key) { try { await DB.put('meta', { sig, parts: saved, at: Date.now() }, key); } catch (e) { } } };
    const report = () => { if (job.onProgress) job.onProgress(count(), n); };
    report();
    const one = async k => {
      const it = items[k];
      const ask = prompt + (it.range
        ? `\n\nВАЖНО: расшифруй ТОЛЬКО часть записи с ${hms(it.from)} по ${hms(it.to)} (${it.from >= 3600 || it.to >= 3600 ? 'часы:минуты:секунды' : 'минуты:секунды'}) — полностью, дословно, от первой до последней реплики этого отрезка. Не пиши отметок времени.`
        : `\n\nЭто фрагмент ${k + 1} из ${n} длинной записи (с ${hms(it.from)} по ${hms(it.to)} от её начала). Расшифруй его ПОЛНОСТЬЮ и дословно, от первой до последней реплики. Говорящих называй одинаково во всех фрагментах («Участник 1», «Участник 2» или по именам, если они прозвучали). Не пиши заголовков, отметок времени и пояснений — только текст стенограммы. Если речи нет — верни «[тишина]».`);
      let err;
      for (const parts of await it.variants()) {
        try { return squeezeRepeats(String(await AI.call(parts.concat([{ text: ask }]), AI.trOpts(job, 240000))).trim()); }
        catch (e) { err = e; if (!e.input && !/mime|format|unsupported|invalid|400/i.test(e.message)) throw e; }
      }
      throw err;
    };
    let halted = false;   // today's free limit is gone: further requests would fail the same way
    const pass = async list => {
      const fails = {}; let next = 0, stop = null;
      const worker = async () => {
        while (!stop && !halted) {
          const idx = next++; if (idx >= list.length) return;
          const k = list[idx];
          try { const txt = await one(k); res[k] = txt; saved[k] = txt; await persist(); report(); }
          catch (e) { if (e.aborted || e.fatal) { stop = e; return; } fails[k] = e; if (e.daily) halted = true; }
        }
      };
      await Promise.all(Array.from({ length: Math.max(1, Math.min(par || 1, list.length)) }, worker));
      if (stop) throw stop;
      return fails;
    };
    const todo = []; for (let k = 0; k < n; k++) if (res[k] == null) todo.push(k);
    let fails = todo.length ? await pass(todo) : {};
    for (let again = 0; again < 2 && Object.keys(fails).length && !halted; again++) {   // a second and third chance for the pieces that failed
      await sleepJob(20000 * (again + 1), job.signal);
      fails = await pass(Object.keys(fails).map(Number));
    }
    const left = Object.keys(fails).map(Number);
    if (left.length) {
      const e0 = fails[left[0]];
      const er = new Error(t('Не удалось расшифровать части: {l} из {n}.', { l: left.map(k => k + 1).join(', '), n }) + ' ' + e0.message + ' ' + t('Готовые части сохранены — обработка продолжится с места остановки.'));
      er.transient = !!(e0.transient || e0.net); er.daily = !!e0.daily; er.retryAt = e0.retryAt; er.detail = e0.detail; er.input = !!e0.input; er.partial = true; throw er;
    }
    return res.map((x, k) => `[${hms(items[k].from)}]\n${x}`).join('\n\n');
  },

  meetingPrompt(m, text, part) {
    const md = m.date || D.today();
    const me = S.set.name && !/@/.test(S.set.name) ? `«${S.set.name}» (владелец записи, «Я»)` : 'владелец записи («Я»)';
    const kind = m.emergency ? 'Это ЭКСТРЕННАЯ запись разговора (например, визит в госорган, банк, неожиданная беседа). Особенно выдели: что сказали сделать, какие документы нужны, сроки, куда и к кому обратиться (ФИО, должности, кабинеты, телефоны), размеры платежей.' : '';
    const mins = Math.round((+(m.recording && m.recording.duration) || 0) / 60);
    const size = part ? `Это ЧАСТЬ ${part.k} ИЗ ${part.n} одной длинной встречи (${mins} мин): стенограмма разрезана по времени. Сделай итоги ТОЛЬКО по этой части — подробно, каждая тема отдельным разделом; ничего не придумывай за её пределами. Говорящие «Участник N» в разных частях могут быть разными людьми.`
      : mins >= 60 ? 'Встреча длинная (' + mins + ' мин): итоги должны быть ПОДРОБНЫМИ — каждая обсуждённая тема отдельным разделом, в каждом разделе 3–10 конкретных пунктов. Краткость здесь вредна: важнее не потерять ни одного плана, цифры, условия и договорённости.'
        : mins >= 20 ? 'Встреча средней длины (' + mins + ' мин): подробно по каждой теме.' : '';
    return `${nowContext()}
Встреча: «${m.title}». ДАТА ВСТРЕЧИ: ${md} (${D.dowFull(D.parse(md).getDay())}), время ${m.start || '—'}–${m.end || '—'}. Участники: ${(m.participants || []).join(', ') || 'не указаны'}. Место: ${m.place || '—'}. Пользователь приложения: ${me}${S.set.aliases ? ' (его также называют: ' + S.set.aliases + ')' : ''}.
${kind}
Ты — опытный помощник юриста и бизнес-аналитик. Прочитай ВСЮ стенограмму от начала до конца и сделай итоги, по которым человек, не бывший на встрече, поймёт всё важное.
${size}
Что считать важным: планы на будущее и их этапы, инвестиции и деньги (суммы, доли, проценты, сроки, условия), решения, договорённости, кто что обещал, позиции и интересы каждой стороны, риски, спорные и открытые вопросы, имена, компании, документы, даты. Что НЕ включать: приветствия, светскую болтовню, технические паузы, повторы одного и того же.
Верни ТОЛЬКО JSON:
{"summary":{
"short":["главные итоги встречи — самое важное, 5–15 пунктов, каждый — законченная мысль с конкретикой"],
"topics":[{"title":"тема","points":["что обсуждали по этой теме: предложения, аргументы, цифры, кто что сказал"],"result":"к чему пришли по теме (или «не решено»)"}],
"plans":["планы и этапы на будущее: этап — что делается — срок — сумма/ресурс — кто отвечает"],
"numbers":["все цифры с контекстом: суммы, доли, проценты, сроки, количества"],
"positions":[{"who":"участник","stance":"чего хочет, что предлагает, чего опасается, на что не согласен"}],
"decisions":["что решили"],
"commitments":[{"who":"кто","what":"что должен сделать","due":"срок как точная дата YYYY-MM-DD и время, или пусто"}],
"deadlines":["точные даты и сроки — что к ним"],
"important":["что важно запомнить: условия, реквизиты, ФИО, названия, документы"],
"risks":["риски и что может пойти не так"],
"questions":["открытые вопросы — что осталось неясным и что нужно уточнить"],
"next":["следующие шаги"]},
"items":[{"type":"task|meeting|control","title":"…","date":"YYYY-MM-DD или null","start":"HH:MM или null","end":"HH:MM или null","dueTime":"HH:MM или null","priority":"normal|high|critical","who":"кто исполняет","participants":["с кем"],"place":"место или null","goals":"для встречи: цели, что обсудить, что подготовить и взять с собой","notes":"детали: суммы, условия, что именно подготовить"}]}
ПРАВИЛА ДЛЯ items:
1. Все относительные сроки считай ОТ ДАТЫ ВСТРЕЧИ ${md}: «завтра» = +1 день, «через 3 дня» = +3 календарных дня, «в пятницу» = ближайшая пятница после даты встречи, «на следующей неделе» = понедельник следующей недели, «через неделю» = +7 дней, «к концу месяца» = последний день месяца. Всегда пиши точную дату YYYY-MM-DD. Даты без года — ближайшая будущая такая дата.
2. type "task" — то, что должен сделать ${me}. Название — конкретное действие с объектом и именем контрагента, например «Подготовить проект договора аренды для Василия». «до 15 часов» → dueTime "15:00"; точное время начала работы → start.
3. type "control" — то, что пообещал сделать собеседник (не пользователь): «Проконтролировать: Василий пришлёт реквизиты» на дату его срока.
4. type "meeting" — договорились о новой встрече, звонке или созвоне: title «Встреча с Василием» (или «Созвон с …»), date, start — только если время прямо названо (иначе null), place, participants, goals — цели и детали встречи из разговора.
5. Не выдумывай задачи, цифры и время. Не включай то, что уже сделано во время встречи. Пустые разделы — пустой массив [].
Пиши ${IN_LANG()}.
СТЕНОГРАММА:
${text}`;
  },
  /* v4.2: the summary is made in one go while the text is not huge; if it is — or the answer did not fit — in parts, then joined */
  async analyzeMeeting(m, o = {}) {
    const text = String(m.transcript || '');
    let partial = null;
    if (text.length <= 150000) {
      const meta = {};
      try {
        const r = await AI.call([{ text: AI.meetingPrompt(m, text, null) }], { json: true, temp: 0.1, patient: true, signal: o.signal, onWait: o.onWait, timeoutMs: 420000, maxOut: 60000, meta });
        if (!meta.repaired && meta.finish !== 'MAX_TOKENS') return r;
        partial = r;
      } catch (e) { if (e.aborted || e.fatal || e.transient || e.net) throw e; }
      if (o.onText) o.onText(t('Итоги получились очень большими — делаю по частям…'));
    }
    try { return await AI.analyzeInParts(m, text, o); }
    catch (e) { if (partial && !e.aborted && !e.fatal) return partial; throw e; }
  },
  /* the text is cut at paragraph borders into parts of about 55 000 characters */
  segments(text, lim) {
    const out = []; let cur = '';
    const push = s => { if (cur && (cur.length + s.length + 2) > lim) { out.push(cur); cur = ''; } cur += (cur ? '\n\n' : '') + s; };
    for (let p of String(text).split(/\n{2,}/)) {
      while (p.length > lim) { const i = p.lastIndexOf('\n', lim) > lim / 2 ? p.lastIndexOf('\n', lim) : (p.lastIndexOf(' ', lim) > lim / 2 ? p.lastIndexOf(' ', lim) : lim); push(p.slice(0, i)); p = p.slice(i).trim(); }
      if (p) push(p);
    }
    if (cur) out.push(cur);
    return out.length ? out : [''];
  },
  async analyzeInParts(m, text, o = {}) {
    const segs = AI.segments(text, 55000), outs = [];
    for (let k = 0; k < segs.length; k++) {
      if (o.onProgress) o.onProgress(k, segs.length);
      const r = await AI.call([{ text: AI.meetingPrompt(m, segs[k], { k: k + 1, n: segs.length }) }], { json: true, temp: 0.1, patient: true, signal: o.signal, onWait: o.onWait, timeoutMs: 360000, maxOut: 30000 });
      outs.push(r);
    }
    if (o.onProgress) o.onProgress(segs.length, segs.length);
    return AI.mergeSummaries(m, outs, o);
  },
  async mergeSummaries(m, outs, o = {}) {
    const Ss = outs.map(x => (x && x.summary) || {});
    const cat = key => [].concat(...Ss.map(s => Array.isArray(s[key]) ? s[key] : []));
    const norm = x => (typeof x === 'string' ? x : JSON.stringify(x)).toLowerCase().replace(/[^a-zа-яё0-9ўқғҳ]+/gi, ' ').trim();
    const uniq = a => { const seen = new Set(); return a.filter(x => { const k = norm(x); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
    const pos = {};
    Ss.forEach(s => (Array.isArray(s.positions) ? s.positions : []).forEach(p => { if (!p) return; const k = norm(p.who || ''); (pos[k] = pos[k] || { who: p.who || '', stance: [] }); if (p.stance) pos[k].stance.push(p.stance); }));
    const sum = { short: [], topics: cat('topics'), plans: uniq(cat('plans')), numbers: uniq(cat('numbers')), positions: Object.values(pos).map(p => ({ who: p.who, stance: p.stance.join(' ') })),
      decisions: uniq(cat('decisions')), commitments: uniq(cat('commitments')), deadlines: uniq(cat('deadlines')), important: uniq(cat('important')), risks: uniq(cat('risks')), questions: uniq(cat('questions')), next: uniq(cat('next')) };
    try {
      const r = await AI.call([{ text: `Ниже — главные итоги отдельных частей одной длинной встречи «${m.title}». Объедини их в единый список главных итогов ВСЕЙ встречи: 8–20 пунктов, без повторов; каждый пункт — законченная мысль с конкретикой (цифры, имена, сроки). Пиши ${IN_LANG()}.\nВерни ТОЛЬКО JSON {"short":["…"]}.\n${JSON.stringify(Ss.map((s, i) => ({ часть: i + 1, итоги: s.short || [] })))}` }],
        { json: true, temp: 0.1, patient: true, signal: o.signal, onWait: o.onWait, timeoutMs: 180000, maxOut: 8000 });
      if (r && Array.isArray(r.short) && r.short.length) sum.short = r.short;
    } catch (e) { if (e.aborted || e.fatal) throw e; }
    if (!sum.short.length) sum.short = uniq([].concat(...Ss.map(s => (Array.isArray(s.short) ? s.short : []).slice(0, 4)))).slice(0, 20);
    const seen = new Set(), items = [];
    outs.forEach(x => (Array.isArray(x && x.items) ? x.items : []).forEach(i => { const k = norm((i && i.title) || '') + '|' + ((i && i.date) || ''); if (i && i.title && !seen.has(k)) { seen.add(k); items.push(i); } }));
    return { summary: sum, items };
  },

  /* v3.8: a private review of how the user himself did in the meeting — only for him */
  coachMeeting(m) {
    const nm = S.set.name && !/@/.test(S.set.name) ? S.set.name : '';
    const names = [nm].concat(String(S.set.aliases || '').split(',')).map(x => x.trim()).filter(Boolean);
    const prompt = `Ты — строгий и доброжелательный наставник по переговорам для юриста/адвоката и предпринимателя. Ниже стенограмма встречи «${m.title}».
Пользователь приложения — ${names.length ? 'это ' + names.map(x => '«' + x + '»').join(' / ') : 'владелец записи'} («Я»). Найди в стенограмме его реплики: по имени, по обращениям к нему собеседников, по тому, кто организовал встречу. Если его реплики однозначно определить нельзя — честно скажи об этом в "overall" и оцени того, кто, скорее всего, им является, указав, кого ты оцениваешь.
Оцени ТОЛЬКО его: как он отвечал и вёл разговор — уверенно или неуверенно, по делу или не в тему, точно и чётко или размыто, где был силён, где ошибся, где упустил выгоду или дал лишнее обещание, где стоило задать вопрос, но не задал. Опирайся на конкретные фразы из стенограммы (цитируй коротко). Никакой лести и общих слов — только конкретика, которую можно применить.
Верни ТОЛЬКО JSON:
{"who":"как он обозначен в стенограмме","score":число 1–10 (общая оценка, как он провёл встречу),"overall":"2–4 предложения: общее впечатление",
"confidence":"уверенность речи: где звучал уверенно, где неуверенно и почему",
"strengths":["сильные стороны — с примером из разговора"],
"weaknesses":["слабые стороны — с примером"],
"moments":[{"time":"отметка времени из стенограммы, если есть, иначе пусто","quote":"что он сказал (коротко)","verdict":"good|weak|off|wrong","comment":"что здесь хорошо или не так","better":"как лучше было сказать — готовая фраза"}],
"fix":["что сделать сейчас, чтобы исправить ошибки этой встречи: кому позвонить, что уточнить, что отправить, какую позицию занять"],
"advice":["рекомендации на следующие встречи"]}
Моментов — от 4 до 12, самые показательные: и удачные, и неудачные. Пиши ${IN_LANG()}, обращайся к нему на «вы».
СТЕНОГРАММА:
${(m.transcript || '').slice(0, 600000)}`;
    return AI.call([{ text: prompt }], { json: true, temp: 0.3 });
  },

  async docParts(f) {
    const blob = await getFileBlob(f);
    if (!blob) throw new Error(t('Файл не найден на этом устройстве'));
    const ty = (f.type || '').toLowerCase(), n = (f.name || '').toLowerCase();
    const inline = async mt => { if (blob.size > 14 * 1048576) throw new Error(t('Файл больше 14 МБ — слишком большой для AI')); return [{ inline_data: { mime_type: mt, data: await b64(blob) } }]; };
    if (ty === 'application/pdf' || n.endsWith('.pdf')) return inline('application/pdf');
    if (ty.startsWith('image/')) return inline(ty);
    if (ty.startsWith('audio/')) return inline(ty.split(';')[0]);
    if (n.endsWith('.docx')) { await loadScript(MAMMOTH_URL); const r = await mammoth.extractRawText({ arrayBuffer: await blob.arrayBuffer() }); return [{ text: r.value.slice(0, 200000) }]; }
    if (/\.(xlsx|xls)$/.test(n)) {
      await loadScript(XLSX_URL);
      const wb = XLSX.read(await blob.arrayBuffer()); let s = '';
      wb.SheetNames.forEach(sn => { s += '# Лист ' + sn + '\n' + XLSX.utils.sheet_to_csv(wb.Sheets[sn]) + '\n'; });
      return [{ text: s.slice(0, 200000) }];
    }
    if (ty.startsWith('text/') || /\.(txt|md|csv|json|xml|html?)$/.test(n)) return [{ text: (await blob.text()).slice(0, 200000) }];
    if (n.endsWith('.doc')) throw new Error(t('Старый формат .doc AI не читает — сохраните как .docx или PDF'));
    throw new Error(t('Этот формат AI пока не читает'));
  },
  async docSummary(f) {
    const parts = await AI.docParts(f);
    parts.push({ text: `Документ «${f.name}». Кратко перескажи ${IN_LANG()}: что это за документ, стороны, предмет, ключевые условия, суммы, сроки, обязательства сторон, на что обратить внимание. Без вступлений.` });
    return AI.call(parts, { temp: 0.2 });
  },
  async docAsk(f, q) {
    const parts = await AI.docParts(f);
    parts.push({ text: `Документ «${f.name}». Ответь на вопрос ${IN_LANG()}, опираясь только на документ. Если ответа в документе нет — так и скажи. Вопрос: ${q}` });
    return AI.call(parts, { temp: 0.2 });
  },
  improveText(t) { return AI.call([{ text: 'Приведи надиктованный текст заметки в аккуратный вид: исправь ошибки распознавания, расставь знаки препинания, разбей на абзацы или пункты при необходимости. Смысл не меняй, ничего не добавляй. Верни только текст.\n\n' + t }], { temp: 0.1 }); },

  askData(q) {
    const words = q.toLowerCase().split(/[^a-zа-яёўқғҳ0-9]+/i).filter(w => w.length > 2).map(w => w.slice(0, Math.max(4, w.length - 2)));
    const hay = i => [i.title, i.desc, (i.participants || []).join(' '), i.place, i.transcript, i.summary ? JSON.stringify(i.summary) : '', (i.files || []).map(f => f.name).join(' ')].join(' ').toLowerCase();
    const scored = live().map(i => ({ i, s: words.reduce((a, w) => a + (hay(i).includes(w) ? 1 : 0), 0) }));
    const rel = scored.filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 40).map(x => x.i);
    const extra = sortByDate(live().filter(i => i.kind !== 'note' && i.date && i.date >= D.add(D.today(), -7) && i.date <= D.add(D.today(), 14))).slice(0, 40);
    const set = Array.from(new Set([...rel, ...extra]));
    const line = i => {
      let s = `[${i.kind === 'meeting' ? 'Встреча' : i.kind === 'note' ? 'Заметка' : 'Задача'}] ${i.title}`;
      if (i.date) s += ` | ${i.date} ${timeLabel(i)}`;
      if (i.kind !== 'note') s += ` | статус: ${STATUS[i.status] || i.status}${isOverdue(i) ? ' (просрочена)' : ''}`;
      if ((i.participants || []).length) s += ` | участники: ${i.participants.join(', ')}`;
      if (i.place) s += ` | место: ${i.place}`;
      if (i.desc) s += `\n  Текст: ${i.desc.slice(0, 600)}`;
      if ((i.files || []).length) s += `\n  Файлы: ${i.files.map(f => f.name).join(', ')}`;
      if (i.summary) s += `\n  Итоги: ${JSON.stringify(i.summary).slice(0, 1500)}`;
      if (i.transcript && rel.includes(i)) s += `\n  Стенограмма (фрагмент): ${i.transcript.slice(0, 3000)}`;
      return s;
    };
    const ctx = set.map(line).join('\n').slice(0, 150000);
    return AI.call([{ text: `${nowContext()}\nНиже — данные пользователя из его планировщика MARKUS-A.\n${ctx || '(данных пока нет)'}\n\nВопрос: ${q}\nОтветь кратко и по делу, ${IN_LANG()}, опираясь только на эти данные. Называй даты и названия. Если данных нет — скажи прямо.` }], { temp: 0.2 });
  }
};
