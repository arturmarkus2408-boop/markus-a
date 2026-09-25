'use strict';
const MAMMOTH_URL = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

function nowContext() {
  const d = new Date(), off = -d.getTimezoneOffset() / 60;
  return `Сейчас: ${D.fmt(d)} ${D.nowTime()}, ${D.dowFull(d.getDay())}. Часовой пояс UTC${off >= 0 ? '+' : ''}${off}.`;
}
function outLang() { const L = langCode(); return L === 'ru' ? 'русском' : ({ en: 'English', uz: "o'zbek (lotin)", tr: 'Türkçe', de: 'Deutsch' }[L] || langName(L)); }
const IN_LANG = () => langCode() === 'ru' ? 'по-русски' : 'на языке: ' + outLang() + ' (язык интерфейса пользователя)';
function parseJSON(raw) {
  raw = String(raw || '').replace(/```json|```/g, '').trim();
  try { return JSON.parse(raw); } catch (e) { const m = raw.match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch (e2) { } } throw new Error(t('AI вернул непонятный ответ')); }
}

const CMD_PROMPT = `Ты — модуль понимания команд личного ассистента MARKUS-A. Пользователь говорит или пишет на любом языке (русский, узбекский, английский, турецкий, немецкий и др.). title и noteText пиши на том же языке, на котором сказана команда. Разбери команду и верни ТОЛЬКО JSON:
{
"intent": "create_task" | "create_meeting" | "create_note" | "query" | "find_slot" | "unknown",
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
"remindAt": "YYYY-MM-DDTHH:MM" или null — если назван отдельный момент напоминания,
"query": {"from":"YYYY-MM-DD","to":"YYYY-MM-DD","fromTime":"HH:MM" или null,"toTime":"HH:MM" или null} или null,
"slot": {"durationMin": число, "untilDate": "YYYY-MM-DD"} или null,
"noteText": "аккуратный грамотный текст заметки" или null,
"reply": "короткий ответ пользователю, если intent = unknown"
}
Правила:
1. НИКОГДА не выдумывай время. Если точное время не названо — start=null; при «утром/днём/вечером» заполни timeHint.
2. «с 10 до 11» → start "10:00", end "11:00". «в 14 часов на час» → start "14:00", durationMin 60. «часа на два» → durationMin 120. «в 10 утра до 11 часов» → start "10:00", end "11:00".
3. «через 2 часа», «через 30 минут» — вычисли точные date и start от текущего момента. Для коротких действий (позвонить, написать, отправить, купить) ставь durationMin 15.
4. «Напомни мне …» — это create_task с remindMinutesBefore [0], если не сказано иное.
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
  async callModel(model, parts, { json = false, system, temp = 0.2 } = {}) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(AI.key())}`;
    const body = { contents: [{ role: 'user', parts }], generationConfig: { temperature: temp } };
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
    const text = ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).map(p => p.text || '').join('');
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

  async transcribe(blob, mime, meeting, onPct) {
    const base = (mime || blob.type || 'audio/webm').split(';')[0];
    const who = (meeting.participants || []).length ? 'Участники: ' + meeting.participants.join(', ') + ' и владелец записи' + (S.set.name ? ' (' + S.set.name + ')' : '') + ' — «Я».' : 'Владелец записи' + (S.set.name ? ' (' + S.set.name + ')' : '') + ' — «Я».';
    const prompt = `Сделай точную стенограмму этой записи ${meeting.emergency ? 'разговора' : 'встречи'} на языке оригинала (русский, узбекский или другой). ${who}
Разделяй реплики по говорящим: «Участник 1:», «Участник 2:» — или по именам, если они понятны из разговора. Расставь знаки препинания, разбей на абзацы. Суммы, даты, сроки, ФИО, номера кабинетов, телефоны и названия компаний пиши точно. Ничего не добавляй от себя. Верни только текст стенограммы.`;
    if (blob.size > 14 * 1048576) {
      if (blob.size > 1900 * 1048576) throw new Error(t('Запись слишком большая для AI'));
      const part = await AI.uploadFile(blob, base === 'audio/webm' ? 'audio/webm' : base, onPct);
      return AI.call([part, { text: prompt }], { temp: 0 });
    }
    const data = await b64(blob);
    const tries = [base];
    if (base === 'audio/webm') tries.push('video/webm', 'audio/ogg');
    if (base === 'audio/mp4') tries.push('audio/aac', 'video/mp4');
    let err;
    for (const mt of tries) {
      try { return await AI.call([{ inline_data: { mime_type: mt, data } }, { text: prompt }], { temp: 0 }); }
      catch (e) { err = e; if (!e.input && !/mime|format|unsupported|invalid|400/i.test(e.message)) throw e; }
    }
    throw err;
  },

  analyzeMeeting(m) {
    const md = m.date || D.today();
    const me = S.set.name ? `«${S.set.name}» (владелец записи, «Я»)` : 'владелец записи («Я»)';
    const kind = m.emergency ? 'Это ЭКСТРЕННАЯ запись разговора (например, визит в госорган, банк, неожиданная беседа). Особенно выдели: что сказали сделать, какие документы нужны, сроки, куда и к кому обратиться (ФИО, должности, кабинеты, телефоны), размеры платежей.' : '';
    const prompt = `${nowContext()}
Встреча: «${m.title}». ДАТА ВСТРЕЧИ: ${md} (${D.dowFull(D.parse(md).getDay())}), время ${m.start || '—'}–${m.end || '—'}. Участники: ${(m.participants || []).join(', ') || 'не указаны'}. Место: ${m.place || '—'}. Пользователь приложения: ${me}.
${kind}
Проанализируй стенограмму и верни ТОЛЬКО JSON:
{"summary":{"short":["3–10 главных мыслей"],"decisions":["что решили"],"commitments":[{"who":"кто","what":"что должен сделать","due":"срок как точная дата YYYY-MM-DD и время, или пусто"}],"deadlines":["точные даты и сроки — что к ним"],"important":["что важно запомнить: суммы, условия, реквизиты, ФИО"],"risks":["что осталось нерешённым, риски"],"next":["следующие шаги"]},
"items":[{"type":"task|meeting|control","title":"…","date":"YYYY-MM-DD или null","start":"HH:MM или null","end":"HH:MM или null","dueTime":"HH:MM или null","priority":"normal|high|critical","who":"кто исполняет","participants":["с кем"],"place":"место или null","goals":"для встречи: цели, что обсудить, что подготовить и взять с собой","notes":"детали: суммы, условия, что именно подготовить"}]}
ПРАВИЛА ДЛЯ items:
1. Все относительные сроки считай ОТ ДАТЫ ВСТРЕЧИ ${md}: «завтра» = +1 день, «через 3 дня» = +3 календарных дня, «в пятницу» = ближайшая пятница после даты встречи, «на следующей неделе» = понедельник следующей недели, «через неделю» = +7 дней, «к концу месяца» = последний день месяца. Всегда пиши точную дату YYYY-MM-DD. Даты без года — ближайшая будущая такая дата.
2. type "task" — то, что должен сделать ${me}. Название — конкретное действие с объектом и именем контрагента, например «Подготовить проект договора аренды для Василия». «до 15 часов» → dueTime "15:00"; точное время начала работы → start.
3. type "control" — то, что пообещал сделать собеседник (не пользователь): «Проконтролировать: Василий пришлёт реквизиты» на дату его срока.
4. type "meeting" — договорились о новой встрече, звонке или созвоне: title «Встреча с Василием» (или «Созвон с …»), date, start — только если время прямо названо (иначе null), place, participants, goals — цели и детали встречи из разговора.
5. Не выдумывай задачи и время. Не включай то, что уже сделано во время встречи.
Пиши ${IN_LANG()}.
СТЕНОГРАММА:
${(m.transcript || '').slice(0, 400000)}`;
    return AI.call([{ text: prompt }], { json: true, temp: 0.1 });
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
