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
function parseJSON(raw) {
  raw = String(raw || '').replace(/```json|```/g, '').trim();
  try { return JSON.parse(raw); } catch (e) { const m = raw.match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch (e2) { } } throw new Error(t('AI вернул непонятный ответ')); }
}

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
  chain() {
    let good = null, disc = [];
    try { good = localStorage.getItem('markus_ai_good'); disc = (JSON.parse(localStorage.getItem('markus_ai_models') || 'null') || {}).list || []; } catch (e) { }
    const want = (S.set.aiModel || '').trim();
    return Array.from(new Set([want, good].concat(AI.FALLBACK, disc).filter(Boolean))).filter(m => !AI.bad[m] || Date.now() - AI.bad[m] > 30 * 60000);
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
  async callModel(model, parts, { json = false, system, temp = 0.2, contents, tools } = {}) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(AI.key())}`;
    const body = { contents: contents || [{ role: 'user', parts }], generationConfig: { temperature: temp } };
    if (tools) body.tools = tools;
    if (json) body.generationConfig.responseMimeType = 'application/json';
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    let r;
    try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch (e) { const er = new Error(t('Нет связи с AI. Проверьте интернет.')); er.net = true; throw er; }
    if (!r.ok) {
      let m = ''; try { m = (await r.json()).error.message; } catch (e) { }
      const er = new Error('AI ' + r.status + ': ' + m); er.status = r.status;
      if (r.status === 429) { er.message = t('Лимит бесплатного AI на сейчас исчерпан. Попробуйте через минуту.'); er.next = true; }
      else if ((r.status === 400 || r.status === 403) && /API key|API_KEY|permission|PERMISSION/i.test(m)) { er.message = t('Неверный ключ Gemini. Проверьте Настройки → AI.'); er.fatal = true; }
      else if (r.status === 404 || /not found|not supported|deprecated|no longer|unsupported model|is not available/i.test(m)) { er.next = true; er.model = true; }
      else if (r.status >= 500) er.next = true;
      else if (r.status === 400 && /mime|format|unsupported|invalid/i.test(m)) er.input = true;
      throw er;
    }
    const d = await r.json();
    AI.lastFinish = (d.candidates && d.candidates[0] && d.candidates[0].finishReason) || '';   // MAX_TOKENS = the answer was cut off
    const text = ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).filter(p => !p.thought).map(p => p.text || '').join('');
    const gm = d.candidates && d.candidates[0] && d.candidates[0].groundingMetadata;   // web search: the pages the answer is based on
    AI.lastSources = gm && gm.groundingChunks ? gm.groundingChunks.map(c => c.web).filter(w => w && w.uri).map(w => ({ title: w.title || w.uri, uri: w.uri })).slice(0, 6) : [];
    if (!text) { const er = new Error(t('AI вернул пустой ответ')); er.next = true; throw er; }
    return json ? parseJSON(text) : text.trim();
  },
  async call(parts, opts = {}) {
    if (!AI.ready()) throw new Error(t('Добавьте ключ Gemini в Настройках → AI'));
    let chain = AI.chain(), lastErr = null, discovered = false;
    for (let i = 0; i < chain.length && i < 10; i++) {
      const model = chain[i];
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await AI.callModel(model, parts, opts);
          try { localStorage.setItem('markus_ai_good', model); } catch (e) { }
          AI.lastModel = model;
          return res;
        } catch (e) {
          lastErr = e;
          if (e.fatal || e.net || e.input) throw e;
          if (e.status >= 500 && attempt === 0) { await sleep(1500); continue; }   // overloaded → one retry
          break;
        }
      }
      if (lastErr && lastErr.model) {
        AI.bad[model] = Date.now();
        if (!discovered) { discovered = true; const list = await AI.discover(); chain = Array.from(new Set(chain.concat(list))); }
      }
      if (!lastErr || !lastErr.next) throw lastErr;
    }
    throw lastErr || new Error(t('AI вернул пустой ответ'));
  },
  /* big files (long recordings) go through Google's Files API instead of inside the request */
  async uploadFile(blob, mime, onPct) {
    const k = encodeURIComponent(AI.key());
    const start = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${k}`, { method: 'POST', headers: {
      'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(blob.size),
      'X-Goog-Upload-Header-Content-Type': mime, 'Content-Type': 'application/json' }, body: JSON.stringify({ file: { display_name: 'markus-a-recording' } }) });
    const up = start.headers.get('x-goog-upload-url');
    if (!start.ok || !up) throw new Error(t('Не удалось загрузить запись в AI (ошибка {s})', { s: start.status }));
    if (onPct) onPct(10);
    const r = await fetch(up, { method: 'POST', headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' }, body: blob });
    if (!r.ok) throw new Error(t('Не удалось загрузить запись в AI (ошибка {s})', { s: r.status }));
    let f = (await r.json()).file;
    for (let i = 0; i < 60 && f && f.state === 'PROCESSING'; i++) {
      if (onPct) onPct(Math.min(95, 20 + i * 3));
      await sleep(3000);
      const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/${f.name}?key=${k}`); if (g.ok) f = await g.json();
    }
    if (!f || f.state === 'FAILED') throw new Error(t('AI не смог принять файл записи'));
    if (onPct) onPct(100);
    return { file_data: { mime_type: f.mimeType || mime, file_uri: f.uri } };
  },

  parseCommand(text) {
    const cats = S.set.categories.map(c => c.name).join(', ');
    return AI.call([{ text: `${nowContext()}\nКатегории: ${cats}.\nКоманда пользователя: «${text}»` }], { json: true, system: CMD_PROMPT, temp: 0 });
  },

  async transcribe(blob, mime, meeting, onPct, onStep) {
    const base = (mime || blob.type || 'audio/webm').split(';')[0];
    const who = (meeting.participants || []).length ? 'Участники: ' + meeting.participants.join(', ') + ' и владелец записи' + meName() + ' — «Я».' : 'Владелец записи' + meName() + ' — «Я».';
    const prompt = `Сделай точную стенограмму этой записи ${meeting.emergency ? 'разговора' : 'встречи'} на языке оригинала (русский, узбекский или другой). ${who}
Разделяй реплики по говорящим: «Участник 1:», «Участник 2:» — или по именам, если они понятны из разговора. Расставь знаки препинания, разбей на абзацы. Суммы, даты, сроки, ФИО, номера кабинетов, телефоны и названия компаний пиши точно. Телефон мог лежать далеко или в шумном месте: внимательно расшифруй и тихую, дальнюю речь, реплики вполголоса и фразы на фоне шума; что разобрать невозможно — пометь [неразборчиво], а не пропускай молча. Ничего не добавляй от себя и НИЧЕГО не сокращай — нужна дословная стенограмма, а не пересказ. Верни только текст стенограммы.${(meeting.recording && (meeting.recording.calls || []).length) ? ' Запись ставилась на паузу на время телефонных звонков — на стыках фраза может обрываться, отметь такое место как [пауза].' : ''}`;
    const dur = Math.round(+(meeting.recording && meeting.recording.duration) || 0);
    const mt = base === 'audio/webm' ? 'audio/webm' : base;
    // v3.8: a long meeting is transcribed in 10-minute pieces. In one piece the AI shortened or cut off
    // the text after ~20–30 minutes, and the summary was then made from a fragment.
    if (dur > 12 * 60) {
      if (blob.size > 1900 * 1048576) throw new Error(t('Запись слишком большая для AI'));
      const part = await AI.uploadFile(blob, mt, onPct);
      const CH = 10 * 60, n = Math.ceil(dur / CH), out = [];
      for (let k = 0; k < n; k++) {
        const a = k * CH, b = Math.min(dur, (k + 1) * CH);
        if (onStep) onStep(k + 1, n);
        const prev = out.length ? out[out.length - 1].slice(-1200) : '';
        const ask = prompt + `\n\nВАЖНО: расшифруй ТОЛЬКО часть записи с ${hms(a)} по ${hms(b)} (${a >= 3600 || b >= 3600 ? 'часы:минуты:секунды' : 'минуты:секунды'}) — полностью, дословно, от первой до последней реплики этого отрезка.` + (prev ? `\nПредыдущий отрезок закончился так (только чтобы одинаково называть говорящих, не повторяй его):\n«…${prev}»` : '');
        let txt = '';
        for (let tr = 0; tr < 2 && !txt; tr++) {
          try { txt = await AI.call([part, { text: ask }], { temp: 0 }); }
          catch (e) { if (e.fatal || e.net) throw e; if (tr === 0) await sleep(15000); else txt = `[${t('этот отрезок не удалось расшифровать')}: ${e.message}]`; }
        }
        out.push(String(txt).trim());
      }
      return out.map((x, k) => `[${hms(k * CH)}]\n${x}`).join('\n\n');
    }
    if (blob.size > 14 * 1048576) {
      if (blob.size > 1900 * 1048576) throw new Error(t('Запись слишком большая для AI'));
      const part = await AI.uploadFile(blob, mt, onPct);
      return AI.call([part, { text: prompt }], { temp: 0 });
    }
    const data = await b64(blob);
    const tries = [base];
    if (base === 'audio/webm') tries.push('video/webm', 'audio/ogg');
    if (base === 'audio/mp4') tries.push('audio/aac', 'video/mp4');
    let err;
    for (const mt2 of tries) {
      try { return await AI.call([{ inline_data: { mime_type: mt2, data } }, { text: prompt }], { temp: 0 }); }
      catch (e) { err = e; if (!e.input && !/mime|format|unsupported|invalid|400/i.test(e.message)) throw e; }
    }
    throw err;
  },

  analyzeMeeting(m) {
    const md = m.date || D.today();
    const me = S.set.name && !/@/.test(S.set.name) ? `«${S.set.name}» (владелец записи, «Я»)` : 'владелец записи («Я»)';
    const kind = m.emergency ? 'Это ЭКСТРЕННАЯ запись разговора (например, визит в госорган, банк, неожиданная беседа). Особенно выдели: что сказали сделать, какие документы нужны, сроки, куда и к кому обратиться (ФИО, должности, кабинеты, телефоны), размеры платежей.' : '';
    const mins = Math.round((+(m.recording && m.recording.duration) || 0) / 60);
    const size = mins >= 60 ? 'Встреча длинная (' + mins + ' мин): итоги должны быть ПОДРОБНЫМИ — каждая обсуждённая тема отдельным разделом, в каждом разделе 3–10 конкретных пунктов. Краткость здесь вредна: важнее не потерять ни одного плана, цифры, условия и договорённости.'
      : mins >= 20 ? 'Встреча средней длины (' + mins + ' мин): подробно по каждой теме.' : '';
    const prompt = `${nowContext()}
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
${(m.transcript || '').slice(0, 600000)}`;
    return AI.call([{ text: prompt }], { json: true, temp: 0.1 });
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
