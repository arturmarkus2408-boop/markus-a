'use strict';
const MAMMOTH_URL = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

function nowContext() {
  const d = new Date(), off = -d.getTimezoneOffset() / 60;
  return `Сейчас: ${D.fmt(d)} ${D.nowTime()}, ${D.dowFull(d.getDay())}. Часовой пояс UTC${off >= 0 ? '+' : ''}${off}.`;
}
function outLang() { const L = langCode(); return L === 'ru' ? 'русском' : ({ en: 'English', uz: "o'zbek (lotin)", tr: 'Türkçe', de: 'Deutsch' }[L] || langName(L)); }
const IN_LANG = () => langCode() === 'ru' ? 'по-русски' : 'на языке: ' + outLang() + ' (язык интерфейса пользователя)';
function parseJSON(t) {
  t = String(t || '').replace(/```json|```/g, '').trim();
  try { return JSON.parse(t); } catch (e) { const m = t.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error(t('AI вернул непонятный ответ')); }
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
  async call(parts, { json = false, system, temp = 0.2 } = {}) {
    if (!AI.ready()) throw new Error(t('Добавьте ключ Gemini в Настройках → AI'));
    const model = (S.set.aiModel || 'gemini-2.5-flash').trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(S.set.aiKey.trim())}`;
    const body = { contents: [{ role: 'user', parts }], generationConfig: { temperature: temp } };
    if (json) body.generationConfig.responseMimeType = 'application/json';
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    let r;
    try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch (e) { throw new Error(t('Нет связи с AI. Проверьте интернет.')); }
    if (!r.ok) {
      let m = ''; try { m = (await r.json()).error.message; } catch (e) { }
      if (r.status === 429) throw new Error(t('Лимит бесплатного AI на сейчас исчерпан. Попробуйте через минуту.'));
      if (r.status === 400 && /API key/i.test(m)) throw new Error(t('Неверный ключ Gemini. Проверьте Настройки → AI.'));
      throw new Error('AI ' + r.status + ': ' + m);
    }
    const d = await r.json();
    const text = ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).map(p => p.text || '').join('');
    if (!text) throw new Error(t('AI вернул пустой ответ'));
    return json ? parseJSON(text) : text.trim();
  },

  parseCommand(text) {
    const cats = S.set.categories.map(c => c.name).join(', ');
    return AI.call([{ text: `${nowContext()}\nКатегории: ${cats}.\nКоманда пользователя: «${text}»` }], { json: true, system: CMD_PROMPT, temp: 0 });
  },

  async transcribe(blob, mime, meeting) {
    if (blob.size > 14.5 * 1048576) throw new Error(t('Запись больше 14 МБ (≈1 ч 40 мин) — бесплатный AI такую за раз не примет.'));
    const data = await b64(blob);
    const base = (mime || blob.type || 'audio/webm').split(';')[0];
    const tries = [base];
    if (base === 'audio/webm') tries.push('video/webm', 'audio/ogg');
    if (base === 'audio/mp4') tries.push('audio/aac', 'video/mp4');
    const who = (meeting.participants || []).length ? 'Участники: ' + meeting.participants.join(', ') + ' и пользователь («Я»).' : '';
    const prompt = `Сделай точную стенограмму этой записи встречи на языке оригинала (русский/узбекский). ${who}
Разделяй реплики по говорящим: «Участник 1:», «Участник 2:» — или по именам, если они понятны из разговора. Расставь знаки препинания, разбей на абзацы. Суммы, даты, названия компаний пиши точно. Ничего не добавляй от себя. Верни только текст стенограммы.`;
    let err;
    for (const mt of tries) {
      try { return await AI.call([{ inline_data: { mime_type: mt, data } }, { text: prompt }], { temp: 0 }); }
      catch (e) { err = e; if (!/mime|format|unsupported|invalid|400/i.test(e.message)) throw e; }
    }
    throw err;
  },

  analyzeMeeting(m) {
    const prompt = `${nowContext()}
Встреча: «${m.title}», ${m.date || ''} ${m.start || ''}–${m.end || ''}. Участники: ${(m.participants || []).join(', ') || 'не указаны'}. Место: ${m.place || '—'}.
Проанализируй стенограмму и верни ТОЛЬКО JSON:
{"summary":{"short":["3–10 главных мыслей"],"decisions":["что решили"],"commitments":[{"who":"кто","what":"что должен сделать","due":"срок или пусто"}],"deadlines":["даты и сроки, что к ним"],"important":["что важно запомнить: суммы, условия, реквизиты"],"risks":["что осталось нерешённым, риски"],"next":["следующие шаги"]},
"tasks":[{"title":"конкретное действие, например «Отправить договор Алишеру»","date":"YYYY-MM-DD или null","start":"HH:MM или null","end":"HH:MM или null","dueTime":"HH:MM или null — если сказано «до 15 часов»","priority":"normal|high|critical","who":"кто исполняет"}]}
Относительные даты («завтра», «в пятницу») считай от даты встречи. В tasks включай только реальные поручения и обещания. Пиши ${IN_LANG()}.
СТЕНОГРАММА:
${(m.transcript || '').slice(0, 400000)}`;
    return AI.call([{ text: prompt }], { json: true, temp: 0.1 });
  },

  async docParts(f) {
    const blob = await getFileBlob(f);
    if (!blob) throw new Error(t('Файл не найден на этом устройстве'));
    const t = (f.type || '').toLowerCase(), n = (f.name || '').toLowerCase();
    const inline = async mt => { if (blob.size > 14 * 1048576) throw new Error(t('Файл больше 14 МБ — слишком большой для AI')); return [{ inline_data: { mime_type: mt, data: await b64(blob) } }]; };
    if (t === 'application/pdf' || n.endsWith('.pdf')) return inline('application/pdf');
    if (t.startsWith('image/')) return inline(t);
    if (t.startsWith('audio/')) return inline(t.split(';')[0]);
    if (n.endsWith('.docx')) { await loadScript(MAMMOTH_URL); const r = await mammoth.extractRawText({ arrayBuffer: await blob.arrayBuffer() }); return [{ text: r.value.slice(0, 200000) }]; }
    if (/\.(xlsx|xls)$/.test(n)) {
      await loadScript(XLSX_URL);
      const wb = XLSX.read(await blob.arrayBuffer()); let s = '';
      wb.SheetNames.forEach(sn => { s += '# Лист ' + sn + '\n' + XLSX.utils.sheet_to_csv(wb.Sheets[sn]) + '\n'; });
      return [{ text: s.slice(0, 200000) }];
    }
    if (t.startsWith('text/') || /\.(txt|md|csv|json|xml|html?)$/.test(n)) return [{ text: (await blob.text()).slice(0, 200000) }];
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
