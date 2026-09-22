// MARKUS-A — Telegram-бот (Supabase Edge Function "telegram-bot")
// Секреты: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, GEMINI_API_KEY, (необязательно) GEMINI_MODEL, APP_URL
// ВАЖНО: в настройках функции выключите "Verify JWT" (Enforce JWT verification).
import { createClient } from 'npm:@supabase/supabase-js@2';

const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? '';
const GEMINI = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '');
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ---------------- telegram ----------------
async function tg(method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
const escH = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function send(chat_id: number, text: string, buttons?: { text: string; data?: string; url?: string }[][]) {
  const body: Record<string, unknown> = { chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true };
  if (buttons) body.reply_markup = { inline_keyboard: buttons.map(r => r.map(b => b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data })) };
  return tg('sendMessage', body);
}

// ---------------- time helpers (tz = minutes east of UTC) ----------------
const pad = (n: number) => String(n).padStart(2, '0');
const MG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const DOWF = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
function localNow(tz: number) { const d = new Date(Date.now() + tz * 60000); return { date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`, dow: d.getUTCDay() }; }
function toUTC(date: string, time: string | null, tz: number) { const [y, m, d] = date.split('-').map(Number); const [h, mi] = (time || '00:00').split(':').map(Number); return new Date(Date.UTC(y, m - 1, d, h, mi) - tz * 60000); }
function addDays(date: string, n: number) { const [y, m, d] = date.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d + n)); return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`; }
function dowOf(date: string) { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const fromMin = (m: number) => { m = Math.max(0, Math.min(1439, Math.round(m))); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
function human(date: string | null, tz: number) {
  if (!date) return 'без даты';
  const t = localNow(tz).date;
  if (date === t) return 'сегодня'; if (date === addDays(t, 1)) return 'завтра'; if (date === addDays(t, 2)) return 'послезавтра';
  const [, m, d] = date.split('-').map(Number); return `${d} ${MG[m - 1]}`;
}
const tl = (i: any) => i.start ? i.start + (i.end && i.end !== i.start ? '–' + i.end : '') : '';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const isOpen = (i: any) => i && !i.deleted && i.kind !== 'note' && i.status !== 'done' && i.status !== 'cancelled';

// ---------------- items ----------------
function newItem(kind: string, over: Record<string, unknown>) {
  const now = new Date().toISOString();
  return { id: uid(), kind, title: '', desc: '', date: null, start: null, end: null, priority: 'normal', status: 'todo', category: kind === 'meeting' ? 'meet' : 'work', noteCat: kind === 'note' ? 'Идеи' : null, subtasks: [], repeat: { type: 'none' }, reminders: kind === 'note' ? [] : [30], customRemind: null, remindTimes: [] as string[], participants: [], place: '', files: [], fav: false, autoRecord: false, recording: null, transcript: '', summary: null, proposed: [], linked: [], created: now, updated: now, deleted: false, ...over } as any;
}
function finalize(it: any, tz: number) {
  const times: string[] = [];
  if (it.kind !== 'note' && it.date && isOpen(it)) {
    const base = toUTC(it.date, it.start || '09:00', tz).getTime();
    (it.reminders || []).forEach((m: number) => times.push(new Date(base - m * 60000).toISOString()));
  }
  if (it.customRemind && isOpen(it)) times.push(new Date(it.customRemind).toISOString());
  it.remindTimes = [...new Set(times)].sort();
  it.updated = new Date().toISOString();
}
function rowOf(user_id: string, it: any, tz: number) {
  const now = Date.now();
  return { id: it.id, user_id, kind: it.kind, data: it, date: it.date, remind_at: (it.remindTimes || []).find((t: string) => Date.parse(t) > now) || null, end_at: it.kind !== 'note' && it.date ? toUTC(it.date, it.end || it.start || '23:59', tz).toISOString() : null, deleted: !!it.deleted, updated_at: it.updated };
}
async function saveItem(user_id: string, it: any, tz: number) { finalize(it, tz); const { error } = await sb.from('items').upsert(rowOf(user_id, it, tz)); if (error) throw error; }
async function itemsBetween(user_id: string, from: string, to: string) {
  const { data } = await sb.from('items').select('data').eq('user_id', user_id).gte('date', from).lte('date', to).eq('deleted', false).limit(500);
  return (data || []).map((r: any) => r.data).filter((i: any) => i.kind !== 'note' && i.status !== 'cancelled')
    .sort((a: any, b: any) => (a.date + (a.start || '99')).localeCompare(b.date + (b.start || '99')));
}
function busy(items: any[], exclude?: string) { return items.filter(i => i.start && i.end && i.id !== exclude && isOpen(i)).map(i => ({ s: toMin(i.start), e: toMin(i.end), it: i })).sort((a, b) => a.s - b.s); }
function freeSlots(items: any[], date: string, dur: number, tz: number, limit = 3) {
  const ws = 540, we = 1140; const now = localNow(tz);
  if (date < now.date) return [];
  let cur = date === now.date ? Math.max(ws, Math.ceil((toMin(now.time) + 5) / 15) * 15) : ws;
  const out: string[] = [];
  for (const x of busy(items.filter(i => i.date === date))) {
    if (x.e <= cur) continue;
    const g = Math.min(x.s, we); if (g - cur >= dur) out.push(fromMin(cur));
    cur = Math.max(cur, x.e); if (cur >= we) break;
  }
  if (we - cur >= dur) { out.push(fromMin(cur)); const n = Math.ceil((cur + 1) / 60) * 60; if (n + dur <= we && n !== cur) out.push(fromMin(n)); }
  return out.slice(0, limit);
}
function nextOccurrence(it: any) {
  const r = it.repeat || { type: 'none' }; if (r.type === 'none' || !it.date) return null;
  let d = it.date; const step = () => { d = addDays(d, 1); };
  switch (r.type) {
    case 'daily': step(); break;
    case 'weekdays': do step(); while ([0, 6].includes(dowOf(d))); break;
    case 'weekly': d = addDays(d, 7); break;
    case 'monthly': { const [y, m, dd] = d.split('-').map(Number); const x = new Date(Date.UTC(y, m, dd)); d = `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`; break; }
    case 'days': { const days = r.days?.length ? r.days : [dowOf(d)]; let g = 0; do { step(); g++; } while (!days.includes(dowOf(d)) && g < 8); break; }
    case 'interval': d = addDays(d, Math.max(1, +r.interval || 1)); break;
    default: return null;
  }
  return d;
}
async function markDone(user_id: string, it: any, tz: number) {
  if (it.status === 'done') return null;
  let next = null;
  if (it.repeat && it.repeat.type !== 'none' && it.date) {
    const nd = nextOccurrence(it);
    if (nd) { next = { ...structuredClone(it), id: uid(), date: nd, status: 'todo', customRemind: null, recording: null, transcript: '', summary: null, proposed: [], created: new Date().toISOString() }; next.subtasks = (next.subtasks || []).map((s: any) => ({ ...s, done: false })); await saveItem(user_id, next, tz); }
    it.repeat = { type: 'none' };
  }
  it.status = 'done'; await saveItem(user_id, it, tz);
  return next;
}

// ---------------- AI ----------------
const CMD_PROMPT = `Ты — модуль понимания команд личного ассистента MARKUS-A. Пользователь пишет или говорит по-русски (иногда по-узбекски). Верни ТОЛЬКО JSON:
{"heard":"дословно что сказал пользователь (для голосовых)","intent":"create_task|create_meeting|create_note|query|find_slot|unknown","title":"краткое название действия, без даты и времени","date":"YYYY-MM-DD или null","dateOptions":[],"start":"HH:MM или null","end":"HH:MM или null","durationMin":null,"timeHint":"morning|afternoon|evening|null","timeless":false,"priority":"normal|high|critical","participants":[],"place":null,"remindMinutesBefore":null,"remindAt":"YYYY-MM-DDTHH:MM или null","query":{"from":"YYYY-MM-DD","to":"YYYY-MM-DD","fromTime":null,"toTime":null},"slot":{"durationMin":60,"untilDate":"YYYY-MM-DD"},"noteText":null,"reply":"ответ если unknown"}
Правила: НИКОГДА не выдумывай время (нет точного времени → start null, при «утром/днём/вечером» заполни timeHint). «с 10 до 11» → start 10:00 end 11:00. «на час» → durationMin 60. «через 2 часа» — вычисли date и start от текущего момента, для коротких действий (позвонить, написать) durationMin 15 и remindMinutesBefore [0]. «Напомни…» → create_task с remindMinutesBefore [0]. Встречи/переговоры → create_meeting. «Запиши/заметка» → create_note. «Что у меня…» → query («после обеда» → fromTime 13:00). «Найди свободное окно» → find_slot. «срочно/горит» → critical, «важно» → high. dateOptions заполняй только при реальной неоднозначности.`;
async function gemini(parts: unknown[], sys?: string) {
  const body: Record<string, unknown> = { contents: [{ role: 'user', parts }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } };
  if (sys) body.systemInstruction = { parts: [{ text: sys }] };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('AI ' + r.status + (r.status === 429 ? ' (лимит бесплатного тарифа, попробуйте через минуту)' : ''));
  const d = await r.json();
  const t = (d.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').replace(/```json|```/g, '').trim();
  return JSON.parse(t.match(/\{[\s\S]*\}/)?.[0] || t);
}
function ctx(tz: number) { const n = localNow(tz); const off = tz / 60; return `Сейчас: ${n.date} ${n.time}, ${DOWF[n.dow]}. Часовой пояс UTC${off >= 0 ? '+' : ''}${off}.`; }
function b64(buf: Uint8Array) { let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000)); return btoa(s); }

// ---------------- flows ----------------
const HINT: Record<string, string[]> = { morning: ['09:00', '10:00', '11:00'], afternoon: ['13:00', '14:00', '15:00'], evening: ['18:00', '19:00', '20:00'] };
async function setPending(user_id: string, pending: unknown) { await sb.from('profiles').update({ pending }).eq('user_id', user_id); }
async function advance(prof: any, d: any) {
  const chat = prof.tg_chat_id, tz = prof.tz_offset ?? 300, now = localNow(tz);
  const head = `<b>${escH(d.title)}</b>`;
  if (d._dateOpts?.length > 1 && !d._dateChosen) {
    await setPending(prof.user_id, d);
    return send(chat, `${head}\nВы имеете в виду ${d._dateOpts.map((x: string) => human(x, tz)).join(' или ')}?`, [d._dateOpts.slice(0, 3).map((x: string) => ({ text: human(x, tz) + ', ' + DOWF[dowOf(x)], data: 'pd:' + x })), [{ text: 'Отмена', data: 'px' }]]);
  }
  if (!d.date && !d._timeless) {
    await setPending(prof.user_id, d);
    return send(chat, `${head}\nНа какой день?`, [[{ text: 'Сегодня', data: 'pd:' + now.date }, { text: 'Завтра', data: 'pd:' + addDays(now.date, 1) }, { text: 'Послезавтра', data: 'pd:' + addDays(now.date, 2) }], [{ text: 'Без даты', data: 'pd:none' }, { text: 'Отмена', data: 'px' }]]);
  }
  if (d.date && !d.start && !d._timeless && !d._noTime) {
    const dur = d._dur || 60;
    let times = d._hint && HINT[d._hint] ? HINT[d._hint] : freeSlots(await itemsBetween(prof.user_id, d.date, d.date), d.date, dur, tz, 3);
    if (!times.length) times = ['10:00', '14:00', '17:00'];
    await setPending(prof.user_id, d);
    return send(chat, `${head} · ${human(d.date, tz)}\nНа какое время поставить? (или напишите время, например «16:30»)`, [times.map(t => ({ text: t, data: 'pt:' + t })), [{ text: 'Без времени', data: 'pt:none' }, { text: 'Отмена', data: 'px' }]]);
  }
  if (d.start && !d.end) {
    if (d._dur) d.end = fromMin(toMin(d.start) + d._dur);
    else {
      await setPending(prof.user_id, d);
      return send(chat, `${head} · ${human(d.date, tz)}, ${d.start}\nНа сколько времени запланировать?`, [[{ text: '15 мин', data: 'pu:15' }, { text: '30 мин', data: 'pu:30' }, { text: '1 час', data: 'pu:60' }], [{ text: '1,5 часа', data: 'pu:90' }, { text: '2 часа', data: 'pu:120' }, { text: 'Отмена', data: 'px' }]]);
    }
  }
  if (d.start && d.end && toMin(d.end) <= toMin(d.start)) d.end = fromMin(toMin(d.start) + 60);
  if (d.date && d.start && d.end && !d._force) {
    const day = await itemsBetween(prof.user_id, d.date, d.date);
    const s = toMin(d.start), e = toMin(d.end);
    const cs = busy(day, d.id).filter(b => s < b.e && b.s < e);
    if (cs.length) {
      const dur = e - s;
      const slots = freeSlots(day, d.date, dur, tz, 3);
      await setPending(prof.user_id, d);
      const rows = slots.map(x => [{ text: `Поставить на ${x}–${fromMin(toMin(x) + dur)}`, data: 'ps:' + x }]);
      rows.push([{ text: 'Всё равно поставить', data: 'pf' }, { text: 'Отмена', data: 'px' }]);
      return send(chat, `⚠️ ${human(d.date, tz)[0].toUpperCase() + human(d.date, tz).slice(1)} с ${d.start} до ${d.end} у вас уже: ${cs.map(c => `<b>${escH(c.it.title)}</b> (${c.it.start}–${c.it.end})`).join(', ')}.${slots.length ? '\nСвободно: ' + slots.map(x => `${x}–${fromMin(toMin(x) + dur)}`).join(', ') + '. Перенести?' : '\nВ этот день свободных окон нет — напишите другое время.'}`, rows);
    }
  }
  for (const k of Object.keys(d)) if (k.startsWith('_')) delete d[k];
  await saveItem(prof.user_id, d, tz);
  await setPending(prof.user_id, null);
  const when = d.date ? human(d.date, tz) + (d.start ? `, ${tl(d)}` : '') : 'без даты';
  return send(chat, `✅ ${d.kind === 'meeting' ? 'Встреча создана' : 'Задача создана'}\n<b>${escH(d.title)}</b>\n📅 ${when}${d.priority !== 'normal' ? `\n${d.priority === 'critical' ? '🔴 Критическая' : '🟠 Важная'}` : ''}${d.participants?.length ? '\n👥 ' + escH(d.participants.join(', ')) : ''}`, [[{ text: '↩️ Отменить', data: 'del:' + d.id }]]);
}
async function listText(prof: any, from: string, to: string, fromTime?: string | null, toTime?: string | null) {
  const tz = prof.tz_offset ?? 300;
  let its = await itemsBetween(prof.user_id, from, to);
  if (fromTime) its = its.filter((i: any) => !i.start || i.start >= fromTime);
  if (toTime) its = its.filter((i: any) => !i.start || i.start <= toTime);
  const title = from === to ? human(from, tz) : `${human(from, tz)} — ${human(to, tz)}`;
  if (!its.length) return `📅 <b>${title[0].toUpperCase() + title.slice(1)}${fromTime ? ' после ' + fromTime : ''}</b>\nНичего не запланировано 🎉`;
  let out = `📅 <b>${title[0].toUpperCase() + title.slice(1)}${fromTime ? ' после ' + fromTime : ''}</b>`, cur = '';
  const nowMs = Date.now();
  for (const i of its) {
    if (from !== to && i.date !== cur) { cur = i.date; out += `\n\n<b>${human(i.date, tz)}, ${DOWF[dowOf(i.date)]}</b>`; }
    const od = isOpen(i) && toUTC(i.date, i.end || i.start || '23:59', tz).getTime() < nowMs;
    out += `\n${i.status === 'done' ? '✅' : od ? '⚠️' : i.kind === 'meeting' ? '👥' : '•'} ${i.start ? tl(i) + ' ' : ''}${escH(i.title)}${i.priority === 'critical' ? ' 🔴' : i.priority === 'high' ? ' 🟠' : ''}`;
  }
  return out;
}
async function handleParsed(prof: any, p: any, raw: string) {
  const chat = prof.tg_chat_id, tz = prof.tz_offset ?? 300, now = localNow(tz);
  switch (p.intent) {
    case 'create_task': case 'create_meeting': {
      const kind = p.intent === 'create_meeting' ? 'meeting' : 'task';
      const d = newItem(kind, { title: (p.title || raw).replace(/^./, (c: string) => c.toUpperCase()), date: p.date || null, start: p.start || null, end: p.end || null, priority: ['normal', 'high', 'critical'].includes(p.priority) ? p.priority : 'normal', participants: Array.isArray(p.participants) ? p.participants : [], place: p.place || '' });
      if (Array.isArray(p.remindMinutesBefore) && p.remindMinutesBefore.length) d.reminders = p.remindMinutesBefore.map(Number);
      if (p.remindAt) { const [dd, tt] = String(p.remindAt).split('T'); if (dd && tt) d.customRemind = toUTC(dd, tt.slice(0, 5), tz).toISOString(); }
      if (+p.durationMin) d._dur = +p.durationMin;
      if (p.timeHint) d._hint = p.timeHint;
      if (p.timeless) d._timeless = true;
      if (Array.isArray(p.dateOptions) && p.dateOptions.length > 1) d._dateOpts = p.dateOptions;
      return advance(prof, d);
    }
    case 'create_note': {
      const n = newItem('note', { title: (p.title || p.noteText || raw).slice(0, 60), desc: p.noteText || raw });
      await saveItem(prof.user_id, n, tz);
      return send(chat, `📝 Заметка сохранена:\n${escH(n.desc)}`, [[{ text: '↩️ Удалить', data: 'del:' + n.id }]]);
    }
    case 'query': { const q = p.query || {}; return send(chat, await listText(prof, q.from || now.date, q.to || q.from || now.date, q.fromTime, q.toTime)); }
    case 'find_slot': {
      const s = p.slot || {}, dur = +s.durationMin || 60, until = s.untilDate || addDays(now.date, 7);
      const all = await itemsBetween(prof.user_id, now.date, until);
      const res: string[] = []; let d = now.date;
      for (let k = 0; k < 60 && d <= until && res.length < 6; k++) { freeSlots(all, d, dur, tz, 2).forEach(t => res.push(`${human(d, tz)} ${t}–${fromMin(toMin(t) + dur)}`)); d = addDays(d, 1); }
      return send(chat, res.length ? `🕐 Свободные окна на ${dur} мин:\n` + res.slice(0, 6).map(x => '• ' + x).join('\n') + '\n\nНапишите, например: «' + res[0] + ' подготовить договор»' : 'Свободных окон в рабочие часы не нашлось.');
    }
    default: return send(chat, escH(p.reply || 'Не понял 🙂 Пример: «Завтра в 10 встреча с Алишером на час» или «Что у меня сегодня?»'));
  }
}

// ---------------- updates ----------------
async function profileByChat(chat: number) { const { data } = await sb.from('profiles').select('*').eq('tg_chat_id', chat).maybeSingle(); return data; }
const HELP = `Я — MARKUS-A 🤖 Пишите или говорите голосом:
• «Завтра в 10 встреча с Алишером на час»
• «Напомни через 30 минут позвонить Ивану»
• «В пятницу с 9 до 10 подготовить документы»
• «Что у меня сегодня после обеда?»
• «Найди свободное окно на 2 часа до пятницы»
• «Запиши: проверить договор до пятницы»
Команды: /today /tomorrow /week`;

async function onMessage(msg: any) {
  const chat = msg.chat.id; const text = (msg.text || '').trim();
  if (text.startsWith('/start')) {
    const code = text.split(/\s+/)[1];
    if (!code) return send(chat, 'Чтобы подключить бота, откройте MARKUS-A → Настройки → Telegram → «Подключить».');
    const { data: p } = await sb.from('profiles').select('user_id').eq('tg_code', code.toUpperCase()).maybeSingle();
    if (!p) return send(chat, 'Код не найден или устарел. Нажмите «Подключить Telegram» в приложении ещё раз.');
    await sb.from('profiles').update({ tg_chat_id: null }).eq('tg_chat_id', chat);
    await sb.from('profiles').update({ tg_chat_id: chat, tg_code: null }).eq('user_id', p.user_id);
    return send(chat, '✅ Telegram подключён к MARKUS-A!\n\n' + HELP);
  }
  const prof = await profileByChat(chat);
  if (!prof) return send(chat, 'Бот ещё не подключён. Откройте MARKUS-A → Настройки → Telegram → «Подключить».');
  const tz = prof.tz_offset ?? 300, now = localNow(tz);
  if (text === '/help') return send(chat, HELP);
  if (text === '/today') return send(chat, await listText(prof, now.date, now.date));
  if (text === '/tomorrow') return send(chat, await listText(prof, addDays(now.date, 1), addDays(now.date, 1)));
  if (text === '/week') return send(chat, await listText(prof, now.date, addDays(now.date, 6)));
  // answer to a pending "what time?" question with plain text like "16:30"
  const tm = text.match(/^(\d{1,2})[:.\s](\d{2})$/) || text.match(/^(\d{1,2})$/);
  if (prof.pending && tm) {
    const d = prof.pending; const t = pad(+tm[1]) + ':' + pad(+(tm[2] || 0));
    if (d.date && !d.start) { d.start = t; return advance(prof, d); }
    if (d.date && d.start && d.end) { const dur = toMin(d.end) - toMin(d.start); d.start = t; d.end = fromMin(toMin(t) + dur); return advance(prof, d); }
  }
  if (!GEMINI) return send(chat, 'AI не настроен на сервере (секрет GEMINI_API_KEY).');
  await tg('sendChatAction', { chat_id: chat, action: 'typing' });
  try {
    let p: any, raw = text;
    if (msg.voice || msg.audio) {
      const f = await tg('getFile', { file_id: (msg.voice || msg.audio).file_id });
      const bin = new Uint8Array(await (await fetch(`https://api.telegram.org/file/bot${TOKEN}/${f.result.file_path}`)).arrayBuffer());
      p = await gemini([{ inline_data: { mime_type: (msg.voice ? 'audio/ogg' : (msg.audio.mime_type || 'audio/mpeg')), data: b64(bin) } }, { text: ctx(tz) + '\nРаспознай голосовую команду и разбери её.' }], CMD_PROMPT);
      raw = p.heard || '';
      if (raw) await send(chat, `🎙 <i>${escH(raw)}</i>`);
    } else {
      if (!text) return;
      p = await gemini([{ text: `${ctx(tz)}\nКоманда: «${text}»` }], CMD_PROMPT);
    }
    await setPending(prof.user_id, null);
    return handleParsed(prof, p, raw);
  } catch (e) { return send(chat, '⚠️ ' + escH((e as Error).message)); }
}

async function onCallback(cq: any) {
  const chat = cq.message?.chat?.id; const data: string = cq.data || '';
  await tg('answerCallbackQuery', { callback_query_id: cq.id });
  const prof = await profileByChat(chat);
  if (!prof) return;
  const tz = prof.tz_offset ?? 300;
  const clearKb = () => tg('editMessageReplyMarkup', { chat_id: chat, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] } });
  const [cmd, arg] = [data.split(':')[0], data.slice(data.indexOf(':') + 1)];
  // item actions
  if (['done', 'snz', 'tmr', 'del'].includes(cmd)) {
    const { data: row } = await sb.from('items').select('data').eq('id', arg).eq('user_id', prof.user_id).maybeSingle();
    if (!row) return send(chat, 'Задача не найдена');
    const it = row.data; await clearKb();
    if (cmd === 'done') { const next = await markDone(prof.user_id, it, tz); return send(chat, `✅ Выполнено: <b>${escH(it.title)}</b>${next ? `\n🔁 Следующий повтор: ${human(next.date, tz)}` : ''}`); }
    if (cmd === 'snz') { it.customRemind = new Date(Date.now() + 10 * 60000).toISOString(); await saveItem(prof.user_id, it, tz); return send(chat, `💤 Напомню через 10 минут: ${escH(it.title)}`); }
    if (cmd === 'tmr') { it.date = addDays(localNow(tz).date, 1); await saveItem(prof.user_id, it, tz); return send(chat, `📅 Перенесено на завтра${it.start ? ' ' + tl(it) : ''}: ${escH(it.title)}`); }
    if (cmd === 'del') { it.deleted = true; await saveItem(prof.user_id, it, tz); return send(chat, `↩️ Отменено: ${escH(it.title)}`); }
  }
  // pending flow
  const d = prof.pending; await clearKb();
  if (!d) return send(chat, 'Этот вопрос уже неактуален.');
  if (cmd === 'px') { await setPending(prof.user_id, null); return send(chat, 'Отменено.'); }
  if (cmd === 'pd') { d._dateChosen = true; if (arg === 'none') { d.date = null; d._timeless = true; } else d.date = arg; }
  if (cmd === 'pt') { if (arg === 'none') d._noTime = true; else d.start = arg; }
  if (cmd === 'pu') d.end = fromMin(toMin(d.start) + (+arg));
  if (cmd === 'ps') { const dur = toMin(d.end) - toMin(d.start); d.start = arg; d.end = fromMin(toMin(arg) + dur); }
  if (cmd === 'pf') d._force = true;
  return advance(prof, d);
}

// ---------------- entry ----------------
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (SECRET && req.headers.get('x-telegram-bot-api-secret-token') === SECRET) {
      const upd = await req.json();
      if (upd.message) await onMessage(upd.message);
      else if (upd.callback_query) await onCallback(upd.callback_query);
      return new Response('ok');
    }
    // call from the app: send text to the user's Telegram
    const auth = req.headers.get('Authorization') || '';
    const jwt = auth.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'unauthorized' }, 401);
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return json({ error: 'unauthorized' }, 401);
    const body = await req.json().catch(() => ({}));
    if (body.action === 'send') {
      const { data: prof } = await sb.from('profiles').select('tg_chat_id').eq('user_id', u.user.id).maybeSingle();
      if (!prof?.tg_chat_id) return json({ error: 'Telegram не подключён' });
      const text = String(body.text || '').slice(0, 4000);
      const r = await send(prof.tg_chat_id, text);
      if (!r.ok) await send(prof.tg_chat_id, escH(text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')));
      return json({ ok: true });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
