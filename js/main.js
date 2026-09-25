'use strict';
function applyTheme() {
  const th = THEMES.find(x => x[0] === S.set.theme) || THEMES[0];
  const dark = th[0] === 'dark' || th[0] === 'bronze';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-pal', th[0] === 'warm' || th[0] === 'bronze' ? th[0] : '');
  const m = $('meta[name=theme-color]'); if (m) m.content = th[4];
}

/* ================= reminders & auto-record ticker ================= */
const SENT_KEY = 'markus_sent';
let sent = new Set(); try { sent = new Set(JSON.parse(localStorage.getItem(SENT_KEY) || '[]')); } catch (e) { }
const autoTried = new Set(), recAsked = new Set();
let recBlocked = null;   // auto-record could not start (microphone permission) → banner on the home/meeting screen
function saveSent() { localStorage.setItem(SENT_KEY, JSON.stringify(Array.from(sent).slice(-600))); }
function tick() {
  const now = Date.now();
  let changed = false;
  for (const it of S.items) {
    if (!isOpen(it)) continue;
    const sticky = !!it.nag || it.priority !== 'normal';
    for (const iso of (it.remindTimes || [])) {
      const ms = Date.parse(iso);
      const key = it.id + '|' + iso;
      if (ms <= now && now - ms < 3 * 60000 && !sent.has(key)) {
        sent.add(key); changed = true;
        const lab = it.remindLabels && it.remindLabels[iso];
        const title = lab ? '🔔 ' + it.title : reminderTitle(it);
        const body = lab || [whenLabel(it), it.place].filter(Boolean).join(' · ') || 'MARKUS-A';
        const actions = lab ? [{ action: 'open', title: t('Открыть') }, { action: 'snooze', title: '💤 ' + t('+1 час') }]
          : [{ action: 'done', title: '✓ ' + t('Выполнено') }, { action: 'snooze', title: '💤 ' + t('+10 мин') }];
        notify(title, body + (it.nag ? '\n' + t('Напоминание повторится, пока не отметите «Выполнено»') : ''), { tag: 'r-' + it.id, id: it.id, actions, sticky });
        beep(); toast(title + (lab ? ' — ' + lab : ''), 6000);
      }
    }
    if (it.date && isOverdue(it) && !(Rec.active && Rec.active.meetingId === it.id)) {
      const e = endAt(it).getTime(), key = it.id + '|od|' + e;
      if (now - e < 24 * 3600000 && !sent.has(key)) {
        sent.add(key); changed = true;
        const mins = Math.round((now - e) / 60000), h = Math.round(mins / 60);
        const ago = mins < 60 ? mins + ' ' + t('мин') : h + ' ' + tn(h, 'час|часа|часов');
        const pct = progress(it);
        notify(`${it.priority === 'critical' ? '🔴 ' : '⚠️ '}${t('Просрочено на {x}', { x: ago })}`, it.title + (pct ? ` (${pct}%)` : ''), { tag: 'od-' + it.id, id: it.id, sticky: it.priority !== 'normal', actions: [{ action: 'done', title: '✓ ' + t('Выполнено') }, { action: 'resched', title: '📅 ' + t('Перенести') }] });
      }
    }
    // auto-record: starts by itself N minutes before the start and runs until the end + N minutes.
    // A website may use the microphone only while it is open on the screen; otherwise a notification
    // (and the Telegram bot) brings a «start recording» button — one tap.
    if (it.kind === 'meeting' && it.autoRecord && !it.recording && it.date === D.today() && it.start && !Rec.active && !autoTried.has(it.id)) {
      const st = startAt(it).getTime() - (+S.set.recPre || 0) * 60000;
      const until = D.dt(it.date, it.end || D.addMin(it.start, S.set.defaultDur || 60)).getTime() + (+S.set.recPost || 0) * 60000;
      if (now >= st && now < until) {
        const ask = () => { if (recAsked.has(it.id)) return; recAsked.add(it.id); notify('🎙 ' + t('Встреча «{x}» начинается', { x: it.title }), t('Нажмите, чтобы начать запись'), { tag: 'rec-' + it.id, url: '#rec/' + it.id, sticky: true }); };
        if (document.visibilityState === 'visible') { autoTried.add(it.id); Rec.start(it.id, { auto: true }).then(ok => { if (!ok) { ask(); recBlocked = it.id; render(); } else render(); }); }
        else ask();
      }
    }
    // meeting agreed without a time: at the 09:00 reminder ask for the time (if the app is open)
    if (it.kind === 'meeting' && it.needsTime && !it.start && it.date === D.today() && document.visibilityState === 'visible' && !Sheets.length) {
      const key = it.id + '|nt|' + it.date;
      if (!sent.has(key) && new Date().getHours() >= 9) { sent.add(key); changed = true; askMeetingTime(it.id); }
    }
  }
  if (changed) saveSent();
}
let lastMinute = -1;
function minuteRefresh() {
  const m = new Date().getMinutes();
  if (m === lastMinute) return; lastMinute = m;
  if (!Sheets.length && ['home', 'calendar', 'tasks'].includes(S.route) && !document.activeElement.matches('input,textarea')) render();
}

/* ================= deep links & SW actions ================= */
async function handleAction(action, id) {
  const it = id && getItem(id);
  if (action === 'voice') return openVoice();
  if (action === 'new') return openEditor('task');
  if (action === 'record') return quickRecord();
  if (!it) return;
  if (action === 'done') { await setStatus(it, 'done'); toast(t('Готово ✓') + ' ' + it.title); }
  else if (action === 'snooze') { const lab = Object.values(it.remindLabels || {}).length; it.customRemind = new Date(Date.now() + (lab ? 60 : 10) * 60000).toISOString(); await saveItem(it); toast(lab ? t('Напомню через час') : t('Напомню через 10 минут')); }
  else if (action === 'resched') smartReschedule(id);
  else if (action === 'rec') { go('meeting', id); const ok = await Rec.start(id, { auto: true }); if (!ok) toast(t('Нажмите «Начать запись встречи»')); }
  else if (it.kind === 'meeting' && it.needsTime && !it.start) { go('meeting', id); askMeetingTime(id); }
  else openItem(id);
}
function handleHash() {
  const h = location.hash.replace(/^#/, ''); if (!h) return;
  // Supabase auth links (magic link, password recovery, signup confirm) put tokens in the
  // hash and need to parse it themselves — never strip it out from under them.
  if (/access_token=|refresh_token=|type=(magiclink|recovery|signup|invite)|error_description=/.test(h)) return;
  history.replaceState(null, '', location.pathname + location.search);
  const [action, id] = h.split('/');
  handleAction(action === 'item' ? 'open' : action, id);
}

/* ================= public share page ================= */
async function renderSharePage(token, code) {
  $('#nav').hidden = true; $('#top').hidden = true; $('#dock').innerHTML = '';
  const box = $('#screen'); box.className = 'share-page';
  box.innerHTML = `<div class="hint">${t('Загрузка…')}</div>`;
  if (!Cloud.configured()) { box.innerHTML = emptyBox('⚠️', t('Ссылка не работает: облако не настроено')); return; }
  try {
    const r = await Cloud.publicShare(token, code);
    if (r.error === 'code_required' || r.error === 'bad_code') {
      box.innerHTML = `<div class="share-brand">${logo(28)} MARKUS-A</div><div class="card"><div class="dlg-t">${t('Введите код доступа')}</div>${r.error === 'bad_code' ? `<div class="hint warn">${t('Неверный код')}</div>` : ''}<input class="inp" id="pc" inputmode="numeric"><button class="btn pri full" style="margin-top:10px" onclick="renderSharePage('${esc(token)}',$('#pc').value)">${t('Открыть')}</button></div>`;
      return;
    }
    if (r.error) { box.innerHTML = `<div class="share-brand">${logo(28)} MARKUS-A</div>` + emptyBox('🔒', t('Ссылка недействительна, истекла или доступ отозван')); return; }
    const s = r.snapshot || {};
    const bl2 = a => a && a.length ? `<ul class="bul">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    const places = (s.places || []).map(p => `<div class="place"><div class="place-h">${ic('pin', 18)}<div style="flex:1;min-width:0"><b>${esc(p.name)}</b>${p.address ? `<span>${esc(p.address)}</span>` : ''}${p.note ? `<span class="place-n">${esc(p.note)}</span>` : ''}</div></div>
      ${(p.photos || []).length ? `<div class="thumbs">${p.photos.map(f => `<a class="thumb" href="${esc(f.url)}" target="_blank" rel="noopener" style="background-image:url('${esc(f.url)}')"></a>`).join('')}</div>` : ''}
      <div class="chips wrapchips" style="margin-top:8px">${(p.links || []).map(([n, u]) => `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener">${ic('globe', 13)} ${esc(n)}</a>`).join('')}</div></div>`).join('');
    const links = (s.links || []).length ? `<div class="h4">${t('Ссылки')}</div><div class="att">${s.links.map(l => `<a class="att-i" href="${esc(l.url)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">${ic('link', 16)}<span>${esc(l.title || l.url)}</span></a>`).join('')}</div>` : '';
    const loc = places ? `<div class="h4">${t('Локации')}</div>${places}` : s.location ? `<a class="btn ghost full" style="margin-top:8px" href="${esc(/^https?:/i.test(s.location) ? s.location : 'https://maps.google.com/?q=' + encodeURIComponent(s.location))}" target="_blank" rel="noopener">${ic('pin', 16)} ${t('Открыть на карте')}</a>` : '';
    box.innerHTML = `<div class="share-brand">${logo(28)} MARKUS-A${s.owner ? ` <span class="muted" style="font-weight:500">· ${esc(s.owner)}</span>` : ''}</div>
      <div class="card"><div class="tag" style="display:inline-block;margin-bottom:8px">${s.kind === 'meeting' ? t('Встреча') : s.kind === 'note' ? t('Заметка') : t('Задача')}</div>
      <div style="font-size:22px;font-weight:800;line-height:1.25">${esc(s.title)}</div>
      ${s.date ? `<div class="kv">${ic('calendar', 16)}${esc(D.long(s.date))}${s.start ? ' · ' + esc(s.start) + (s.end ? '–' + esc(s.end) : '') : ''}</div>` : ''}
      ${s.place ? `<div class="kv">${ic('pin', 16)}${esc(s.place)}</div>` : ''}${loc}
      ${(s.participants || []).length ? `<div class="kv">${ic('users', 16)}${esc(s.participants.join(', '))}</div>` : ''}
      ${s.desc ? `<div class="h4">${t('Описание')}</div><div class="pre">${esc(s.desc)}</div>` : ''}
      ${s.summary ? `<div class="h4">${t('Кратко')}</div>${bl2(s.summary.short)}${s.summary.decisions && s.summary.decisions.length ? `<div class="h4">${t('Решения')}</div>` + bl2(s.summary.decisions) : ''}${s.summary.next && s.summary.next.length ? `<div class="h4">${t('Следующие шаги')}</div>` + bl2(s.summary.next) : ''}` : ''}
      ${links}
      ${(s.files || []).length ? `<div class="h4">${t('Материалы')}</div>${s.files.map(f => `<a class="frow" style="text-decoration:none;color:inherit" href="${esc(f.url)}" target="_blank" rel="noopener">${ficon(f)}<div class="fm"><b>${esc(f.name)}</b><span>${mb(f.size)}</span></div>${ic('download', 18)}</a>`).join('')}` : ''}
      </div>
      ${r.permission === 'comment' ? `<div class="card"><div class="h4" style="margin-top:0">${t('Комментарии')}</div>${(r.comments || []).map(c => `<div style="margin:8px 0;font-size:14px"><b>${esc(c.author || t('Гость'))}:</b> ${esc(c.body)}</div>`).join('') || `<div class="hint">${t('Пока нет')}</div>`}
        <input class="inp" id="cm_a" placeholder="${t('Ваше имя')}" style="margin-top:8px"><textarea class="inp" id="cm_b" placeholder="${t('Комментарий')}" style="margin-top:8px;min-height:70px"></textarea>
        <button class="btn pri full" style="margin-top:8px" id="cm_go">${t('Отправить')}</button></div>` : ''}
      <div class="hint" style="text-align:center">${r.expires_at ? t('Ссылка действует до {d}', { d: new Date(r.expires_at).toLocaleDateString(locale()) }) : ''}</div>`;
    const go2 = $('#cm_go');
    if (go2) go2.onclick = async () => {
      const a = $('#cm_a').value.trim(), b = $('#cm_b').value.trim(); if (!b) return toast(t('Напишите комментарий'));
      try { await Cloud.publicComment(token, code, a || t('Гость'), b); toast(t('Отправлено ✓')); renderSharePage(token, code); } catch (e) { toast(e.message, 4000); }
    };
  } catch (e) { box.innerHTML = emptyBox('⚠️', t('Ошибка') + ': ' + esc(e.message)); }
}

/* ================= one-time import from old PESKOV planner (same github.io origin) ================= */
async function offerPeskovImport() {
  if (localStorage.getItem('markus_peskov_done')) return;
  let tasks = [], notes = [];
  try { tasks = JSON.parse(localStorage.getItem('pp_tasks') || '[]'); notes = JSON.parse(localStorage.getItem('pp_notes') || '[]'); } catch (e) { }
  if (!Array.isArray(tasks)) tasks = []; if (!Array.isArray(notes)) notes = [];
  if (!tasks.length && !notes.length) return;
  const v = await dialog({ title: t('Перенести данные из Peskov Planner?'), text: esc(t('Нашёл в этом браузере старые данные: задач — {a}, заметок — {b}.', { a: tasks.length, b: notes.length })), buttons: [{ l: t('Перенести'), v: 1, p: 1 }, { l: t('Не нужно'), v: 0 }] });
  localStorage.setItem('markus_peskov_done', '1');
  if (!v) return;
  const pr = x => x === 'urgent' ? 'critical' : x === 'high' ? 'high' : 'normal';
  const rep = x => ({ daily: 'daily', weekdays: 'weekdays', weekly: 'weekly', monthly: 'monthly' }[x] || 'none');
  let n = 0;
  for (const x of tasks) {
    if (!x || !(x.name || x.title)) continue;
    const it = newItem('task', {
      title: x.name || x.title, date: x.date || null, start: x.timeStart || x.start || null, end: x.timeEnd || x.end || null,
      priority: pr(x.priority), status: x.done ? 'done' : 'todo', desc: x.note || '', repeat: { type: rep(x.recurrence || x.repeat) },
      subtasks: (x.subtasks || []).map(s => ({ id: uid(), text: s.text || s.name || s.title || String(s), done: !!s.done })).filter(s => s.text)
    });
    if (it.start && !it.end) it.end = D.addMin(it.start, 30);
    await saveItem(it, { render: false }); n++;
  }
  for (const x of notes) {
    if (!x || !(x.title || x.text)) continue;
    await saveItem(newItem('note', { title: x.title || String(x.text).slice(0, 60), desc: x.text || '', noteCat: 'Идеи' }), { render: false }); n++;
  }
  render(); toast(t('Перенесено: {n}', { n }));
}

/* ================= boot ================= */
async function boot() {
  loadSettings(); loadAIDict(S.set.lang); document.documentElement.lang = S.set.lang || 'ru'; applyTheme();
  { const st = document.getElementById('splashTag'); if (st) st.textContent = t('Твой личный AI-помощник'); }
  S.selDate = D.today();
  const share = new URLSearchParams(location.search).get('share');
  const hideSplash = () => { const sp = $('#splash'); sp.classList.add('hide'); setTimeout(() => sp.remove(), 400); };
  if (share) { hideSplash(); return renderSharePage(share); }
  try { await DB.open(); S.items = (await DB.all('items')) || []; }
  catch (e) { toast(t('Хранилище браузера недоступно (режим инкогнито?)'), 6000); S.items = []; }
  S.items.forEach(computeReminders);
  render();
  setTimeout(hideSplash, 350);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
    navigator.serviceWorker.addEventListener('message', e => { const d = e.data || {}; if (d.type === 'action') handleAction(d.action, d.id); });
  }
  handleHash(); window.addEventListener('hashchange', handleHash);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window._installPrompt = e; });
  window.addEventListener('online', () => Cloud.sync());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { Cloud.sync(); tick(); minuteRefresh(); } });
  setInterval(() => { tick(); minuteRefresh(); }, 15000);
  setInterval(() => Cloud.sync(), 60000);
  tick();
  Cloud.init().then(() => { if (S.route === 'settings') render(); });
  recoverRecording().then(offerPeskovImport);
}
boot();
