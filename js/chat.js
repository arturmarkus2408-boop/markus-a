'use strict';
/* ============================================================================
   v3.8 — «Чат с AI»: a conversation with Gemini like in the Gemini app.
   · remembers the conversation (on this device only — it is private)
   · «учитывать мои дела» — sees your plans, meetings and their summaries
   · «искать в интернете» — Google search for fresh facts (prices, news, laws), with sources
   · answers can be read aloud, copied or saved as a note
   ========================================================================== */
const Chat = { msgs: [], loaded: false, busy: false };
const CHAT_MAX = 60;
async function chatLoad() { if (Chat.loaded) return; Chat.loaded = true; try { Chat.msgs = (await DB.get('meta', 'chat')) || []; } catch (e) { Chat.msgs = []; } }
function chatSave() { DB.put('meta', Chat.msgs.slice(-CHAT_MAX), 'chat').catch(() => { }); }

/* a little markdown: **bold**, lists, headings, links — everything else is escaped */
function chatMd(x) {
  return esc(String(x || ''))
    .replace(/^#{1,4}\s*(.+)$/gm, '<b>$1</b>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^\s*[-*•]\s+(.+)$/gm, '• $1')
    .replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br>');
}
function chatBubble(m, i) {
  if (m.role === 'user') return `<div class="cb me">${esc(m.text).replace(/\n/g, '<br>')}</div>`;
  const src = (m.src || []).length ? `<div class="cb-src">${t('Источники')}: ${m.src.map(s => `<a href="${esc(s.uri)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join(' · ')}</div>` : '';
  return `<div class="cb ai${m.err ? ' err' : ''}">${chatMd(m.text)}${src}${m.err ? '' : `<div class="cb-act"><button onclick="Speech.say(Chat.msgs[${i}].text)">${ic('play', 14)}</button><button onclick="chatCopy(${i})">${t('Копировать')}</button><button onclick="chatNote(${i})">${t('В заметку')}</button></div>`}</div>`;
}
function chatListHTML() {
  if (!Chat.msgs.length) return `<div class="empty"><b>💬</b>${t('Спросите что угодно — как в Gemini. Например:')}<div class="chat-ex">${[
    'Составь план подготовки к переговорам об инвестициях',
    'Как вежливо напомнить клиенту об оплате?',
    'Что у меня важного на этой неделе и что подготовить?',
    'Какие документы нужны для открытия ООО в Узбекистане?'
  ].map(x => `<button class="chip" onclick="chatAsk(${esc(JSON.stringify(t(x)))})">${esc(t(x))}</button>`).join('')}</div></div>`;
  return Chat.msgs.map(chatBubble).join('') + (Chat.busy ? `<div class="cb ai"><i class="spin"></i> ${t('Думаю…')}</div>` : '');
}
SCREENS.chat = () => {
  if (!Chat.loaded) { chatLoad().then(() => { if (S.route === 'chat') render(); }); }
  const st = S.set;
  const body = `${AI.ready() ? '' : `<div class="banner" onclick="go('settings')">${ic('ai')}<div><b>${t('Подключите AI (бесплатно)')}</b><span>${t('Нужен ключ Gemini — Настройки → AI')}</span></div>${ic('right')}</div>`}
    <div class="chips" style="margin-bottom:10px">
      <button class="chip ${st.chatCtx !== false ? 'on' : ''}" onclick="setVal('chatCtx',S.set.chatCtx===false);render()">${ic('calendar', 13)} ${t('Учитывать мои дела')}</button>
      <button class="chip ${st.chatWeb ? 'on' : ''}" onclick="setVal('chatWeb',!S.set.chatWeb);render()">${ic('globe', 13)} ${t('Искать в интернете')}</button>
    </div>
    <div id="chatList" class="chat-list">${chatListHTML()}</div>
    <div class="chat-in"><textarea id="ch_in" class="inp" rows="1" placeholder="${esc(t('Сообщение…'))}" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();chatSend()}" oninput="Chat.draft=this.value;this.style.height='auto';this.style.height=Math.min(140,this.scrollHeight)+'px'">${esc(Chat.draft || '')}</textarea><button class="mic-btn" type="button" onclick="dictateInto('ch_in',this,true)">${ic('mic', 18)}</button><button class="chat-send" onclick="chatSend()" aria-label="${esc(t('Отправить'))}">${ic('send', 18)}</button></div>`;
  const clear = `<button class="tbtn" onclick="chatClear()" aria-label="${esc(t('Очистить'))}" title="${esc(t('Новый разговор'))}">${ic('trash')}</button>`;
  return { top: titleTop(t('Чат с AI'), { extra: clear }), body, after: () => chatScroll() };
};
function chatScroll() { const l = $('#chatList'); if (l) setTimeout(() => { const last = l.lastElementChild; if (last) last.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, 30); }
function chatRedraw() { const l = $('#chatList'); if (l) { l.innerHTML = chatListHTML(); chatScroll(); } }
async function chatClear() { if (!Chat.msgs.length) return; if (!(await confirmDel(t('Начать новый разговор? Этот удалится.')))) return; Chat.msgs = []; chatSave(); render(); }
function chatAsk(q) { const i = $('#ch_in'); if (i) { i.value = q; chatSend(); } }
async function chatCopy(i) { try { await navigator.clipboard.writeText(Chat.msgs[i].text); toast(t('Скопировано')); } catch (e) { } }
async function chatNote(i) { const x = Chat.msgs[i].text, q = (Chat.msgs[i - 1] || {}).text || ''; const n = newItem('note', { title: (q || x).split('\n')[0].slice(0, 60), desc: (q ? '❓ ' + q + '\n\n' : '') + x, noteCat: 'Идеи' }); await saveItem(n, { render: false }); toast(t('Сохранено в Заметки ✓')); }

/* what the AI knows about your plans (only when «учитывать мои дела» is on) */
function chatContext() {
  const td = D.today();
  const its = sortByDate(live().filter(i => isTaskKind(i) && i.date && i.date >= D.add(td, -14) && i.date <= D.add(td, 21)));
  const line = i => `${i.date} ${timeLabel(i)} [${i.kind === 'meeting' ? 'встреча' : 'задача'}] ${i.title}${i.status !== 'todo' ? ' (' + (STATUS[i.status] || i.status) + ')' : ''}${isOverdue(i) ? ' ПРОСРОЧЕНО' : ''}${(i.participants || []).length ? ' · ' + i.participants.join(', ') : ''}${i.place ? ' · ' + i.place : ''}${i.summary && i.summary.short ? '\n   итоги: ' + i.summary.short.slice(0, 6).join('; ') : ''}`;
  const nodate = live().filter(i => isOpen(i) && !i.date).slice(0, 20).map(i => '— ' + i.title);
  return `${nowContext()}\nДела пользователя (±2–3 недели):\n${its.map(line).join('\n') || '(нет)'}${nodate.length ? '\nБез даты:\n' + nodate.join('\n') : ''}`.slice(0, 60000);
}
async function chatSend() {
  const inp = $('#ch_in'); if (!inp || Chat.busy) return;
  const q = inp.value.trim(); if (!q) return;
  if (!AI.ready()) return toast(t('Добавьте ключ Gemini в Настройках → AI'), 4000);
  stopDictation();
  inp.value = ''; Chat.draft = ''; inp.style.height = 'auto';
  Chat.msgs.push({ role: 'user', text: q, at: Date.now() });
  Chat.busy = true; chatRedraw();
  const me = S.set.name && !/@/.test(S.set.name) ? S.set.name : '';
  const system = `Ты — MARKUS-A, умный личный помощник и советник${me ? ' пользователя по имени ' + me : ''}. Отвечай на языке вопроса, по существу, дружелюбно и уверенно, как опытный консультант. Структурируй длинные ответы (короткие абзацы, списки). Если чего-то не знаешь или факт мог устареть — прямо скажи об этом и предложи, где проверить. По юридическим, медицинским и финансовым вопросам давай полезную информацию, но напоминай, что окончательное решение — за специалистом.${S.set.chatCtx !== false ? '\n\n' + chatContext() : '\n' + nowContext()}`;
  const hist = Chat.msgs.filter(m => !m.err).slice(-20).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
  let text = '', src = [], err = '';
  try {
    const opts = { system, temp: 0.6, contents: hist };
    if (S.set.chatWeb) {
      try { text = await AI.call([], Object.assign({}, opts, { tools: [{ google_search: {} }] })); src = AI.lastSources || []; }
      catch (e) { if (e.fatal || e.net) throw e; text = await AI.call([], opts); toast(t('Поиск в интернете сейчас недоступен — ответил без него'), 4000); }
    } else text = await AI.call([], opts);
  } catch (e) { err = e.message || String(e); }
  Chat.busy = false;
  Chat.msgs.push(err ? { role: 'ai', text: '⚠ ' + err, err: true, at: Date.now() } : { role: 'ai', text, src, at: Date.now() });
  chatSave(); chatRedraw();
}
