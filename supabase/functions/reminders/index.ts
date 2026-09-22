// MARKUS-A — напоминания (Supabase Edge Function "reminders"), вызывается cron раз в минуту.
// Секреты: TELEGRAM_BOT_TOKEN, CRON_SECRET, (необязательно) APP_URL
// ВАЖНО: в настройках функции выключите "Verify JWT".
import { createClient } from 'npm:@supabase/supabase-js@2';

const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '');
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const pad = (n: number) => String(n).padStart(2, '0');
const MG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const escH = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function localDate(ms: number, tz: number) { const d = new Date(ms + tz * 60000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
function toUTC(date: string, time: string | null, tz: number) { const [y, m, d] = date.split('-').map(Number); const [h, mi] = (time || '00:00').split(':').map(Number); return new Date(Date.UTC(y, m - 1, d, h, mi) - tz * 60000); }
const isOpen = (i: any) => i && !i.deleted && i.kind !== 'note' && i.status !== 'done' && i.status !== 'cancelled';
const tl = (i: any) => i.start ? i.start + (i.end && i.end !== i.start ? '–' + i.end : '') : '';

async function send(chat_id: number, text: string, kb?: any[][]) {
  const body: Record<string, unknown> = { chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true };
  if (kb) body.reply_markup = { inline_keyboard: kb };
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.ok;
}
function whenText(it: any, tz: number) {
  if (!it.date) return '';
  const now = Date.now(), s = toUTC(it.date, it.start || '09:00', tz).getTime();
  const m = Math.round((s - now) / 60000);
  const today = localDate(now, tz), tomorrow = localDate(now + 86400000, tz);
  if (it.start && m <= 1 && m > -5) return 'Сейчас';
  if (it.start && m > 0 && m < 60) return `Через ${m} мин`;
  if (it.date === today) return it.start ? `Сегодня в ${it.start}` : 'Сегодня';
  if (it.date === tomorrow) return it.start ? `Завтра в ${it.start}` : 'Завтра';
  const [, mm, dd] = it.date.split('-').map(Number);
  return `${dd} ${MG[mm - 1]}${it.start ? ' в ' + it.start : ''}`;
}

Deno.serve(async req => {
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return new Response('forbidden', { status: 403 });
  const now = Date.now(), nowISO = new Date(now).toISOString();
  const profs = new Map<string, any>();
  const prof = async (id: string) => {
    if (!profs.has(id)) { const { data } = await sb.from('profiles').select('tg_chat_id,tz_offset').eq('user_id', id).maybeSingle(); profs.set(id, data); }
    return profs.get(id);
  };
  let sent = 0;

  // 1) due reminders
  const { data: due } = await sb.from('items').select('id,user_id,data,remind_at').lte('remind_at', nowISO).eq('deleted', false).limit(300);
  for (const r of due || []) {
    const it = r.data, p = await prof(r.user_id);
    const late = now - Date.parse(r.remind_at);
    if (p?.tg_chat_id && isOpen(it) && late < 30 * 60000) {
      const tz = p.tz_offset ?? 300;
      const icon = it.priority === 'critical' ? '🔴' : it.priority === 'high' ? '🟠' : it.kind === 'meeting' ? '👥' : '🔔';
      const info = [it.start ? '🕒 ' + tl(it) : '', it.place ? '📍 ' + escH(it.place) : '', it.participants?.length ? '👥 ' + escH(it.participants.join(', ')) : '', it.files?.length ? `📎 Документов: ${it.files.length}` : ''].filter(Boolean).join('\n');
      const kb: any[][] = [[{ text: '✓ Выполнено', callback_data: 'done:' + it.id }, { text: '💤 +10 мин', callback_data: 'snz:' + it.id }]];
      if (APP_URL && it.kind === 'meeting' && it.autoRecord && !it.recording) kb.unshift([{ text: '🎙 Начать запись', url: `${APP_URL}/#rec/${it.id}` }]);
      else if (APP_URL) kb.push([{ text: 'Открыть в MARKUS-A', url: `${APP_URL}/#item/${it.id}` }]);
      if (await send(p.tg_chat_id, `${icon} <b>${whenText(it, tz)}:</b> ${escH(it.title)}${info ? '\n' + info : ''}`, kb)) sent++;
    }
    const next = (it.remindTimes || []).filter((t: string) => Date.parse(t) > now).sort()[0] || null;
    await sb.from('items').update({ remind_at: next }).eq('id', r.id);
  }

  // 2) overdue (ended within last 24h, still open, not yet announced for this end time)
  const { data: od } = await sb.from('items').select('id,user_id,data,end_at,overdue_key').lt('end_at', nowISO).gt('end_at', new Date(now - 24 * 3600000).toISOString()).eq('deleted', false).neq('kind', 'note').limit(500);
  for (const r of od || []) {
    if (r.overdue_key === r.end_at) continue;
    const it = r.data;
    if (isOpen(it)) {
      const p = await prof(r.user_id);
      if (p?.tg_chat_id) {
        const mins = Math.round((now - Date.parse(r.end_at)) / 60000);
        const ago = mins < 60 ? `${mins} мин` : `${Math.round(mins / 60)} ч`;
        const icon = it.priority === 'critical' ? '🔴' : '⚠️';
        if (await send(p.tg_chat_id, `${icon} Задача «<b>${escH(it.title)}</b>» просрочена на ${ago}.`, [[{ text: '✓ Выполнено', callback_data: 'done:' + it.id }, { text: '📅 На завтра', callback_data: 'tmr:' + it.id }]])) sent++;
      }
    }
    await sb.from('items').update({ overdue_key: r.end_at }).eq('id', r.id);
  }
  return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } });
});
