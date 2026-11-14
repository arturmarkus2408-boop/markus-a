'use strict';
/* ============================================================================
   v3.8 — «Чат с AI»: a conversation with Gemini like in the Gemini app.
   · remembers the conversation (on this device only — it is private)
   · «учитывать мои дела» — sees your plans, meetings and their summaries
   · «искать в интернете» — Google search for fresh facts (prices, news, laws), with sources
   · answers can be read aloud, copied or saved as a note
   v4.4:
   · 📎 attachments: documents (PDF, Word, Excel, text), photos, screenshots (also Ctrl+V and
     drag-and-drop on a computer), bank statements, audio, long pasted text, files from «Моя библиотека».
     Files stay on this device; for the answer they are sent to Gemini (a one-time warning explains this).
   · «⚖ Право Узбекистана» — the AI works as a lawyer-consultant on the law of Uzbekistan:
     analyses the attached materials, names the norms, gives lex.uz links, risks and next steps.
   · «Выгрузить» — an answer (or the whole conversation) as PDF, Word (.docx) or text:
     share (Telegram, WhatsApp…), save to the phone/computer, open/print, or keep in «Моя библиотека».
   ========================================================================== */
const Chat = { msgs: [], loaded: false, busy: false, rec: null, att: [], pc: {} };
if (!ICONS.camera) ICONS.camera = '<path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/>';
if (!ICONS.book) ICONS.book = '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>';
const CHAT_MAX = 60;
const CHAT_INLINE_MAX = 14 * 1048576;     // a file bigger than this goes through Google's Files API
const CHAT_FILE_MAX = 45 * 1048576;
const CHAT_TEXT_EXT = /\.(docx|xlsx|xls|txt|md|csv|json|xml|html?)$/i;
const CHAT_OK_EXT = /\.(pdf|docx|xlsx|xls|txt|md|csv|json|xml|html?|jpe?g|png|webp|heic|heif|mp3|m4a|aac|wav|ogg|oga|opus|flac|webm|mp4|mov|3gp)$/i;
/* Windows often gives a file no type at all — then it is taken from the extension (Google needs it) */
const CHAT_MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac',
  mp4: 'video/mp4', mov: 'video/quicktime', '3gp': 'video/3gpp', webm: 'video/webm', txt: 'text/plain', md: 'text/plain', csv: 'text/csv' };
const chatMime = (name, type) => { const ty = String(type || '').split(';')[0].trim(); return ty && ty !== 'application/octet-stream' ? ty : CHAT_MIME[(String(name || '').toLowerCase().match(/\.(\w+)$/) || [])[1]] || ty; };
async function chatLoad() { if (Chat.loaded) return; Chat.loaded = true; try { Chat.msgs = (await DB.get('meta', 'chat')) || []; } catch (e) { Chat.msgs = []; } }
function chatSave() {
  if (Chat.msgs.length > CHAT_MAX) { chatDropFiles(Chat.msgs.slice(0, Chat.msgs.length - CHAT_MAX)); Chat.msgs = Chat.msgs.slice(-CHAT_MAX); }
  DB.put('meta', Chat.msgs, 'chat').catch(() => { });
}
/* files the chat stored itself are removed with the conversation; files picked from the library stay */
function chatDropFiles(ms) { (ms || []).forEach(m => (m.att || []).forEach(a => { if (a.own && a.text == null) DB.del('files', a.id).catch(() => { }); delete Chat.pc[a.id]; })); }

/* ---------- a little markdown → blocks (used on screen and for PDF / Word / text) ---------- */
function chatBlocks(x) {
  const out = [], lines = String(x || '').replace(/\r/g, '').split('\n');
  for (let k = 0; k < lines.length; k++) {
    const l = lines[k]; let m;
    if (/^\s*\|.*\|\s*$/.test(l)) {   // a table: | a | b |
      const rows = [];
      while (k < lines.length && /^\s*\|.*\|\s*$/.test(lines[k])) {
        const r = lines[k].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
        if (!r.every(c => /^:?-{2,}:?$/.test(c) || c === '')) rows.push(r);
        k++;
      }
      k--;
      if (rows.length) { const n = Math.max(...rows.map(r => r.length)); out.push({ t: 'table', rows: rows.map(r => r.concat(Array(n - r.length).fill(''))) }); }
      continue;
    }
    if (!l.trim()) { if (out.length && out[out.length - 1].t !== 'gap') out.push({ t: 'gap' }); continue; }
    if ((m = /^\s*#{1,6}\s*(.+)$/.exec(l))) out.push({ t: 'h', s: m[1].replace(/\*\*/g, '').trim() });
    else if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) out.push({ t: 'hr' });
    else if ((m = /^(\s*)[-*•]\s+(.+)$/.exec(l))) out.push({ t: 'li', s: m[2], lv: m[1].length >= 2 ? 1 : 0 });
    else if ((m = /^(\s*)(\d{1,3}[.)])\s+(.+)$/.exec(l))) out.push({ t: 'ol', n: m[2], s: m[3], lv: m[1].length >= 2 ? 1 : 0 });
    else out.push({ t: 'p', s: l.trim() });
  }
  while (out.length && out[out.length - 1].t === 'gap') out.pop();
  return out;
}
/* **bold** → runs; other markdown marks are removed */
function chatRuns(s) {
  const clean = x => x.replace(/`+/g, '').replace(/(^|[\s(«])\*([^*\n]+)\*(?=[\s).,;:!?»]|$)/g, '$1$2').replace(/__([^_]+)__/g, '$1');
  return String(s || '').split(/\*\*(.+?)\*\*/).map((p, i) => ({ s: clean(p), b: i % 2 === 1 })).filter(r => r.s);
}
const chatPlain = s => chatRuns(s).map(r => r.s).join('');
function chatInl(s) {
  return chatRuns(s).map(r => { const h = esc(r.s).replace(/(https?:\/\/[^\s<)»]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); return r.b ? '<b>' + h + '</b>' : h; }).join('');
}
function chatMd(x) {
  return chatBlocks(x).map(b => {
    if (b.t === 'h') return `<div class="cb-h">${chatInl(b.s)}</div>`;
    if (b.t === 'li') return `<div class="cb-li${b.lv ? ' l2' : ''}"><span>•</span><span>${chatInl(b.s)}</span></div>`;
    if (b.t === 'ol') return `<div class="cb-li${b.lv ? ' l2' : ''}"><span>${esc(b.n)}</span><span>${chatInl(b.s)}</span></div>`;
    if (b.t === 'gap') return '<div class="cb-gap"></div>';
    if (b.t === 'hr') return '<hr class="cb-hr">';
    if (b.t === 'table') return `<div class="cb-tw"><table class="cb-t">${b.rows.map((r, i) => `<tr>${r.map(c => i ? `<td>${chatInl(c)}</td>` : `<th>${chatInl(c)}</th>`).join('')}</tr>`).join('')}</table></div>`;
    return `<div>${chatInl(b.s)}</div>`;
  }).join('');
}

/* ---------- attachments ---------- */
function attKind(a) {
  const ty = (a.type || '').toLowerCase(), n = (a.name || '').toLowerCase();
  if (a.text != null) return 'text';
  if (ty.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/.test(n)) return 'image';
  if (ty === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (ty.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|oga|opus|amr)$/.test(n)) return 'audio';
  if (ty.startsWith('video/') || /\.(mp4|mov|3gp|webm)$/.test(n)) return 'video';
  if (/\.(xlsx|xls|csv)$/.test(n)) return 'sheet';
  return 'doc';
}
const ATT_EMO = { text: '📝', image: '🖼', pdf: '📄', audio: '🎧', video: '🎬', sheet: '📊', doc: '📄' };
const attShort = n => { n = String(n || ''); return n.length > 34 ? n.slice(0, 24) + '…' + n.slice(-8) : n; };
function chatAttHTML() {
  if (!Chat.att.length) return '';
  return Chat.att.map((a, k) => `<span class="att-chip">${ATT_EMO[attKind(a)]} <span>${esc(attShort(a.name))}</span><small>${a.text != null ? '' : mb(a.size)}</small><button onclick="chatAttRemove(${k})" aria-label="${esc(t('Убрать'))}">✕</button></span>`).join('');
}
function chatAttRedraw() {
  const box = $('#chatAtt'); if (box) { box.innerHTML = chatAttHTML(); box.hidden = !Chat.att.length; }
  const l = $('#chatList'); if (l) l.classList.toggle('with-att', Chat.att.length > 0);
  const i = $('#ch_in'); if (i) i.placeholder = Chat.att.length ? t('Вопрос по файлам — или сразу ➤') : t('Сообщение…');
}
function chatAttRemove(k) { const a = Chat.att.splice(k, 1)[0]; if (a && a.own && a.text == null) DB.del('files', a.id).catch(() => { }); chatAttRedraw(); }

/* one time: files go to Google — the user decides what may be sent */
async function chatPrivacyOk() {
  if (S.set.chatAttOk) return true;
  const v = await dialog({
    title: t('Файлы будут отправлены в Google Gemini'),
    text: esc(t('Чтобы AI прочитал файл, фото или текст, они отправляются в Google (Gemini). На бесплатном тарифе Google может использовать присланное для улучшения своих моделей. Материалы, составляющие адвокатскую тайну, и персональные данные клиентов отправляйте только с их согласия — или закройте имена, паспортные данные и номера счетов перед отправкой. На телефоне файлы хранятся только в этом разговоре и удаляются вместе с ним.')),
    buttons: [{ l: t('Понятно, продолжить'), v: true, p: 1 }, { l: t('Отмена'), v: false }]
  });
  if (v === true) { setVal('chatAttOk', true); return true; }
  return false;
}
async function chatAddFiles(list) {
  list = Array.from(list || []); if (!list.length) return;
  if (!(await chatPrivacyOk())) return;
  let n = 0;
  for (const f of list) {
    const nm = (f.name || '').toLowerCase(), ty = (f.type || '').toLowerCase();
    if (Chat.att.length >= 10) { toast(t('Не больше 10 файлов за один вопрос')); break; }
    if (/\.doc$/.test(nm)) { toast(t('Старый формат .doc AI не читает — сохраните как .docx или PDF'), 5000); continue; }
    if (!CHAT_OK_EXT.test(nm) && !/^(image|audio|video|text)\//.test(ty) && ty !== 'application/pdf') { toast(t('«{x}»: этот формат AI пока не читает', { x: f.name || '?' }), 5000); continue; }
    if (f.size > CHAT_FILE_MAX) { toast(t('«{x}» больше 45 МБ — слишком большой для AI', { x: f.name }), 5000); continue; }
    if (/\.(gif|bmp|tiff?|amr)$/.test(nm) || /^image\/(gif|bmp|tiff)/.test(ty)) { toast(t('«{x}»: такой формат Google не принимает — сохраните как JPG/PNG/PDF (для звука — MP3)', { x: f.name }), 5000); continue; }
    const isImg = /^image\//.test(ty);
    const name = f.name && !/^image\.(png|jpe?g)$/i.test(f.name) ? f.name : t('Снимок') + ' ' + D.nowTime().replace(':', '-') + (n ? '-' + n : '') + '.' + ((ty.split('/')[1] || 'png').replace('jpeg', 'jpg'));
    try {
      const file = isImg ? await shrinkImage(f, 2400) : f;
      const a = await storeFile(file, isImg && file !== f ? name.replace(/\.\w+$/, '.jpg') : name);
      a.type = chatMime(a.name, a.type);
      a.own = true; Chat.att.push(a); n++;
    } catch (e) { toast(e.message || String(e), 4000); }
  }
  chatAttRedraw();
  if (n) { const i = $('#ch_in'); if (i) i.focus(); }
}
async function chatAddText(tx) {
  tx = String(tx || '').trim(); if (!tx) return;
  if (!(await chatPrivacyOk())) return;
  Chat.att.push({ id: uid(), own: true, name: t('Вставленный текст') + ' (' + tx.length.toLocaleString('ru-RU') + ' ' + t('знаков') + ')', type: 'text/plain', size: tx.length, text: tx.slice(0, 300000), added: new Date().toISOString() });
  chatAttRedraw();
}
/* paste: a screenshot (Ctrl+V / «Вставить») becomes an attachment; very long text — too */
function chatPaste(e) {
  const cd = e.clipboardData; if (!cd) return;
  const files = Array.from(cd.files || []).filter(f => /^image\//.test(f.type));
  if (files.length) { e.preventDefault(); chatAddFiles(files); return; }
  const tx = cd.getData('text/plain') || '';
  if (tx.length > 2500) { e.preventDefault(); chatAddText(tx); toast(t('Длинный текст добавлен вложением — так он не загромождает чат'), 3500); }
}
function chatPick(accept, capture) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = !capture;
  if (accept) inp.accept = accept; if (capture) inp.setAttribute('capture', 'environment');
  inp.onchange = () => chatAddFiles(inp.files);
  inp.click();
}
function chatAttachMenu() {
  const lib = typeof libItems === 'function' ? libItems().filter(i => (i.files || []).length) : [];
  const phone = isPhone();
  openSheet(`
    <div class="sh-h">${ic('clip', 20)}<b>${t('Приложить к вопросу')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <button class="btn pri full" onclick="closeSheet();chatPick()">${ic('file', 18)} ${t('Файл: PDF, Word, Excel, фото, скриншот, аудио')}</button>
    <div class="hint sm-h">${t('Договор, иск, решение суда, выписка из банка, акт сверки, переписка, скриншот — можно несколько сразу.')}</div>
    ${phone ? `<button class="btn ghost full" onclick="closeSheet();chatPick('image/*',true)">${ic('camera', 18)} ${t('Сфотографировать документ')}</button>
    <div class="hint sm-h">${t('Снимайте ровно, при хорошем свете, чтобы текст читался. Несколько страниц — несколько снимков.')}</div>` : ''}
    <button class="btn ghost full" onclick="closeSheet();chatPasteDialog()">${ic('edit', 18)} ${t('Вставить длинный текст')}</button>
    <div class="hint sm-h">${phone ? t('Текст письма, сообщения из Telegram, выдержку из документа.') : t('Скриншот можно просто вставить в поле сообщения: Ctrl+V. Файлы — перетащить мышкой в окно чата.')}</div>
    ${lib.length ? `<button class="btn ghost full" onclick="closeSheet();chatPickLib()">${ic('book', 18)} ${t('Из «Моей библиотеки»')} (${lib.length})</button>` : ''}`);
}
async function chatPasteDialog() {
  let val = '';
  const v = await dialog({
    title: t('Вставьте текст'), html: `<textarea id="cp_tx" class="inp" rows="9" style="width:100%;min-height:180px" placeholder="${esc(t('Нажмите и удерживайте → «Вставить»'))}"></textarea>`,
    buttons: [{ l: t('Добавить'), v: true, p: 1 }, { l: t('Отмена'), v: false }],
    onMount: el => { const x = $('#cp_tx', el); if (x) { x.oninput = () => { val = x.value; }; setTimeout(() => x.focus(), 50); } }
  });
  if (v === true && val.trim()) { if (val.length <= 2500) { const i = $('#ch_in'); if (i) { i.value = [i.value.trim(), val.trim()].filter(Boolean).join('\n\n'); Chat.draft = i.value; i.dispatchEvent(new Event('input')); } } else chatAddText(val); }
}
function chatPickLib() {
  const lib = libItems().filter(i => (i.files || []).length).slice(0, 80);
  openSheet(`
    <div class="sh-h">${ic('book', 20)}<b>${t('Из «Моей библиотеки»')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="chat-lib">${lib.map(i => `<button class="lib-pick" onclick="chatAddLib('${i.id}')">${ATT_EMO[attKind(i.files[0])]} <span>${esc(i.title || i.files[0].name)}</span><small>${mb(i.files[0].size || 0)}</small></button>`).join('')}</div>`, { cls: 'tall' });
}
async function chatAddLib(id) {
  const it = getItem(id), f = it && (it.files || [])[0]; if (!f) return;
  closeSheet();
  if (Chat.att.some(a => a.id === f.id)) return;
  if (!(await chatPrivacyOk())) return;
  if (Chat.att.length >= 10) return toast(t('Не больше 10 файлов за один вопрос'));
  Chat.att.push(Object.assign({}, f, { own: false, type: chatMime(f.name, f.type) })); chatAttRedraw();
}
/* drag files from the computer straight into the chat */
document.addEventListener('dragover', e => { if (S.route === 'chat' && e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault(); });
document.addEventListener('drop', e => { if (S.route !== 'chat' || !e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); chatAddFiles(e.dataTransfer.files); });

async function chatOpenAtt(i, id) {
  const a = ((Chat.msgs[i] || {}).att || []).find(x => x.id === id); if (!a) return;
  if (a.text != null) return dialog({ title: a.name, html: `<div style="white-space:pre-wrap;max-height:60vh;overflow:auto;font-size:13px">${esc(a.text.slice(0, 20000))}${a.text.length > 20000 ? '…' : ''}</div>` });
  const b = await getFileBlob(a); if (!b) return toast(t('Файл не найден на этом устройстве'));
  window.open(URL.createObjectURL(b), '_blank');
}
/* what Gemini gets for one attachment. Only light parts (text, a link to an uploaded file) are kept in memory —
   base64 of a big PDF is made again for each request, so the phone's memory is not filled up.
   upload = true: send through Google's Files API (the request itself would be too big) */
async function chatAttParts(a, upload) {
  if (Chat.pc[a.id]) return Chat.pc[a.id];
  const head = { text: `[Вложение: «${a.name}»]` };
  let p;
  if (a.text != null) p = [{ text: a.text }];
  else {
    const k = attKind(a);
    if (['pdf', 'image', 'audio', 'video'].includes(k) && (upload || a.size > CHAT_INLINE_MAX || k === 'video')) {
      if (a.fu && Date.now() - a.fu.at < 46 * 3600000) p = [a.fu.part];   // Google keeps an uploaded file 48 hours
      else {
        const b = await getFileBlob(a); if (!b) throw new Error(t('Файл «{x}» не найден на этом устройстве', { x: a.name }));
        const mime = chatMime(a.name, b.type || a.type) || (k === 'pdf' ? 'application/pdf' : 'application/octet-stream');
        const part = await AI.uploadFile(b, mime); a.fu = { part, at: Date.now() }; chatSave(); p = [part];
      }
    } else p = await AI.docParts(Object.assign({}, a, { type: chatMime(a.name, a.type) }));
  }
  const res = [head].concat(p);
  if (!p.some(x => x.inline_data)) Chat.pc[a.id] = res;
  return res;
}
/* the conversation for Gemini: the newest files first get into the request (Google takes ~20 MB at once) */
async function chatHistory() {
  const ms = Chat.msgs.filter(m => !m.err).slice(-20);
  let bytes = 12 * 1048576, chars = 450000;
  const out = [];
  for (let k = ms.length - 1; k >= 0; k--) {
    const m = ms[k], parts = [], last = k === ms.length - 1;
    for (const a of (m.att || [])) {
      if (m.attBad) { parts.push({ text: `[Файл «${a.name}» Google не смог прочитать — он не передаётся]` }); continue; }
      const kd = attKind(a), isText = kd === 'text' || CHAT_TEXT_EXT.test(a.name || '');
      const cost = isText || a.fu || a.size > CHAT_INLINE_MAX || kd === 'video' ? 0 : Math.ceil(a.size * 1.37);
      const ccost = isText ? Math.min(a.size || 0, 200000) : 0;
      let upload = false;
      if (cost > bytes || ccost > chars) {
        // the newest question: a file that does not fit into the request goes through the Files API; older ones are only named
        if (last && cost > bytes) upload = true;
        else if (!last) { parts.push({ text: `[Ранее был приложен файл «${a.name}» — в этот запрос он не поместился; опирайся на свой прошлый разбор]` }); continue; }
      }
      try { (await chatAttParts(a, upload)).forEach(x => parts.push(x)); if (!upload) bytes -= cost; chars -= ccost; }
      catch (e) { if (last) { if (!e.net && !e.transient && !e.status) e.attRead = true; throw e; } parts.push({ text: `[Файл «${a.name}» сейчас недоступен]` }); }
    }
    parts.push({ text: m.text });
    out.unshift({ role: m.role === 'user' ? 'user' : 'model', parts });
  }
  return out;
}

/* ---------- screen ---------- */
function chatBubble(m, i) {
  if (m.role === 'user') {
    const att = (m.att || []).length ? `<div class="cb-att">${m.att.map(a => `<button onclick="chatOpenAtt(${i},'${a.id}')">${ATT_EMO[attKind(a)]} ${esc(attShort(a.name))}</button>`).join('')}</div>` : '';
    return `<div class="cb me">${att}${esc(m.text).replace(/\n/g, '<br>')}</div>`;
  }
  const src = (m.src || []).length ? `<div class="cb-src">${t('Источники')}: ${m.src.map(s => `<a href="${esc(s.uri)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join(' · ')}</div>` : '';
  return `<div class="cb ai${m.err ? ' err' : ''}">${chatMd(m.text)}${src}${m.err ? '' : `<div class="cb-act"><button class="cb-exp" onclick="chatExport(${i})">${ic('download', 14)} ${t('Выгрузить')}</button><button onclick="chatSpeak(${i})" aria-label="${esc(t('Прослушать'))}">${TTS.on && TTS.owner === i ? '<i class="tts-sq sm"></i> ' + t('Стоп') : ic('play', 14) + ' ' + t('Прослушать')}</button><button onclick="chatCopy(${i})">${t('Копировать')}</button><button onclick="chatNote(${i})">${t('В заметку')}</button></div>`}</div>`;
}
function chatListHTML() {
  if (!Chat.msgs.length) return `<div class="empty"><b>💬</b>${t('Спросите что угодно — как в Gemini. Можно приложить документ, фото или скриншот (кнопка 📎). Например:')}<div class="chat-ex">${[
    'Проверь договор на риски для моего клиента (приложите файл 📎)',
    'Какие сроки исковой давности по договору поставки в Узбекистане?',
    'Что грозит работодателю за задержку зарплаты в Узбекистане?',
    'Что у меня важного на этой неделе и что подготовить?',
    'Какие документы нужны для открытия ООО в Узбекистане?'
  ].map(x => `<button class="chip" onclick="chatAsk(${esc(JSON.stringify(t(x)))})">${esc(t(x))}</button>`).join('')}</div></div>`;
  const busy = Chat.busy ? `<div class="cb ai"><i class="spin"></i> ${Chat.busy === 'files' ? t('Читаю файлы и думаю… (большой документ — до пары минут)') : t('Думаю…')}</div>` : '';
  return Chat.msgs.map(chatBubble).join('') + busy;
}
SCREENS.chat = () => {
  if (!Chat.loaded) { chatLoad().then(() => { if (S.route === 'chat') render(); }); }
  const st = S.set;
  const body = `${AI.ready() ? '' : `<div class="banner" onclick="go('settings')">${ic('ai')}<div><b>${t('Подключите AI (бесплатно)')}</b><span>${t('Нужен ключ Gemini — Настройки → AI')}</span></div>${ic('right')}</div>`}
    <div class="chips" style="margin-bottom:10px">
      <button class="chip ${st.chatLaw !== false ? 'on' : ''}" onclick="setVal('chatLaw',S.set.chatLaw===false);render()">⚖ ${t('Право Узбекистана')}</button>
      <button class="chip ${st.chatCtx !== false ? 'on' : ''}" onclick="setVal('chatCtx',S.set.chatCtx===false);render()">${ic('calendar', 13)} ${t('Учитывать мои дела')}</button>
      <button class="chip ${st.chatWeb ? 'on' : ''}" onclick="setVal('chatWeb',!S.set.chatWeb);render()">${ic('globe', 13)} ${t('Искать в интернете')}</button>
    </div>
    <div id="chatList" class="chat-list${Chat.att.length ? ' with-att' : ''}">${chatListHTML()}</div>
    <div class="chat-in"><div id="chatAtt" class="chat-att"${Chat.att.length ? '' : ' hidden'}>${chatAttHTML()}</div><button class="mic-btn att-btn" type="button" onclick="chatAttachMenu()" aria-label="${esc(t('Приложить файл'))}" title="${esc(t('Приложить файл, фото, скриншот'))}">${ic('clip', 18)}</button><textarea id="ch_in" class="inp" rows="1" placeholder="${esc(Chat.att.length ? t('Вопрос по файлам — или сразу ➤') : t('Сообщение…'))}" onpaste="chatPaste(event)" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();chatSend()}" oninput="Chat.draft=this.value;this.style.height='auto';this.style.height=Math.min(140,this.scrollHeight)+'px'">${esc(Chat.draft || '')}</textarea><button class="mic-btn ${Chat.rec ? 'on' : ''}" type="button" onclick="chatMic(this)" aria-label="${esc(t('Спросить голосом'))}">${ic('mic', 18)}</button><button class="chat-send" onclick="chatSend()" aria-label="${esc(t('Отправить'))}">${ic('send', 18)}</button></div>`;
  const clear = `<button class="tbtn" onclick="chatClear()" aria-label="${esc(t('Очистить'))}" title="${esc(t('Новый разговор'))}">${ic('trash')}</button>`;
  return { top: titleTop(t('Чат с AI'), { extra: clear }), body, after: () => chatScroll() };
};
function chatScroll() { const l = $('#chatList'); if (l) setTimeout(() => { const last = l.lastElementChild; if (last) last.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, 30); }
function chatRedraw() { const l = $('#chatList'); if (l) { l.innerHTML = chatListHTML(); chatScroll(); } }
async function chatClear() {
  if (!Chat.msgs.length && !Chat.att.length) return;
  if (!(await confirmDel(t('Начать новый разговор? Этот удалится вместе с приложенными файлами (файлы из библиотеки останутся).')))) return;
  chatDropFiles(Chat.msgs.concat([{ att: Chat.att }])); Chat.msgs = []; Chat.att = []; chatSave(); render();
}
function chatAsk(q) { const i = $('#ch_in'); if (!i) return; if (/📎/.test(q)) { i.value = q.replace(/\s*\(.*📎\)\s*$/, ''); Chat.draft = i.value; chatAttachMenu(); return; } i.value = q; chatSend(); }
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
/* «⚖ Право Узбекистана»: the AI is a lawyer-consultant. Only lex.uz addresses checked by hand are given;
   for everything else — a lex.uz search link, so no invented document numbers */
const LEX_DOCS = [
  ['Конституция Республики Узбекистан (2023)', 6445147], ['Гражданский кодекс, часть 1', 111181], ['Гражданский кодекс, часть 2', 180550],
  ['Трудовой кодекс (2022, действует с 30.04.2023)', 6257291], ['Налоговый кодекс (2019)', 4674893], ['Уголовный кодекс', 111457],
  ['Кодекс об административной ответственности', 97661], ['Семейный кодекс', 104723], ['Жилищный кодекс', 106134],
  ['Гражданский процессуальный кодекс', 3517334], ['Экономический процессуальный кодекс', 3523895], ['Уголовно-процессуальный кодекс', 111463],
  ['Закон «О персональных данных»', 4396428], ['Закон «О защите прав потребителей»', 14643], ['Закон «Об адвокатуре»', 58372]
];
function chatLawPrompt() {
  return `РЕЖИМ «ПРАВО УЗБЕКИСТАНА». Пользователь — практикующий юрист (адвокат) в Республике Узбекистан, говори с ним как коллега: по существу, без общих фраз и без напоминаний «обратитесь к юристу».
Ты — опытный юрист-консультант по законодательству Республики Узбекистан (гражданское, договорное, корпоративное, трудовое, налоговое, семейное, жилищное, административное, уголовное право и процесс).
Правила:
1. По умолчанию применяй право Республики Узбекистан. Если вопрос касается другой страны — скажи это прямо.
2. Если приложены документы, фото, скриншоты, выписки, переписка или вставленный текст — внимательно прочитай ВСЁ. Сначала коротко: что это за документ (вид, стороны, даты, номера, суммы). Затем разбор: правовая квалификация, соответствие закону, слабые места и риски (для кого именно), недостающие или опасные условия, сроки (исковая давность, процессуальные сроки, сроки обжалования, претензионный порядок), доказательства — что есть и чего не хватает. Выписки и таблицы — проверь цифры, итоги, даты; найди несостыковки.
3. Ссылайся на конкретные нормы: акт, статья, часть. НЕ выдумывай номера статей, даты и реквизиты. Если не уверен в номере статьи или норма могла измениться — так и напиши: «проверьте по актуальной редакции».
4. Ссылки — только на lex.uz. Проверенные адреса (русская версия):
${LEX_DOCS.map(([n, id]) => `   ${n} — https://lex.uz/ru/docs/${id}`).join('\n')}
   Для остальных актов НЕ придумывай номер документа — давай ссылку на поиск: https://lex.uz/ru/search/nat?query=<название акта>
5. Законодательство Узбекистана часто меняется (новая Конституция 2023 г., новый Трудовой кодекс с 30.04.2023, ежегодные изменения Налогового кодекса, постановления Пленумов Верховного суда). Если норма могла измениться после твоих данных — предупреди.
6. Давай практические шаги: что сделать, в какой последовательности, в какой орган/суд, в какие сроки, какие документы собрать, размер госпошлины (если знаешь точно; иначе — где проверить).
7. Где уместно — предложи готовый текст: претензию, заявление, жалобу, пункт договора, ответ контрагенту.
8. Отделяй то, что прямо следует из документа, от своих предположений. Если для вывода не хватает фактов — перечисли, что уточнить.
9. Структура длинного ответа: **Коротко** → **Анализ** → **Риски** → **Что делать** → **Нормы** (со ссылками). Короткий вопрос — короткий ответ.`;
}
/* 🎤 ask by voice: speak — the question goes by itself — the answer is read aloud */
function chatMic(btn) {
  if (Chat.rec) { Chat.rec.stop(); return; }   // pressed again = «готово, отправляй»
  if (!SR) return toast(t('Голосовой ввод работает в Chrome / Edge / Safari'));
  TTS.stop(); stopAllListening('chat');
  const inp = $('#ch_in'); const base = inp ? inp.value.trim() : '';
  btn.classList.add('on'); if (inp) inp.placeholder = t('Слушаю… говорите');
  Chat.rec = listenLong({
    onText: x => { const el = $('#ch_in'); if (el) { el.value = [base, x].filter(Boolean).join(' '); Chat.draft = el.value; el.style.height = 'auto'; el.style.height = Math.min(140, el.scrollHeight) + 'px'; } },
    onTick: left => { const el = $('#ch_in'); if (el) el.placeholder = left != null ? t('Пауза… отправлю через {n} с', { n: left }) : t('Слушаю… говорите'); },
    onDone: x => {
      Chat.rec = null;
      const b = $('.chat-in .mic-btn:not(.att-btn)'); if (b) b.classList.remove('on');
      const el = $('#ch_in'); if (el) el.placeholder = t('Сообщение…');
      if (x && el && el.value.trim()) chatSend({ voice: true });
    }
  });
  toast(t('Говорите — замолчите на {n} с, и вопрос отправится сам. Ответ прозвучит голосом.', { n: +S.set.voiceSilence || 5 }), 3500);
}
function chatSpeak(i) {
  if (TTS.on && TTS.owner === i) return TTS.stop();
  TTS.say(chatBlocks(Chat.msgs[i].text).map(b => b.t === 'table' ? b.rows.map(r => r.join(', ')).join('. ') : chatPlain(b.s || '')).join('\n'), { owner: i }); chatRedraw();
}
async function chatSend(o = {}) {
  const inp = $('#ch_in'); if (!inp || Chat.busy) return;
  if (Chat.rec && !o.voice) { Chat.rec.cancel(); Chat.rec = null; const b = $('.chat-in .mic-btn:not(.att-btn)'); if (b) b.classList.remove('on'); inp.placeholder = t('Сообщение…'); }
  let q = inp.value.trim(); const att = Chat.att.slice();
  if (!q && !att.length) return;
  if (!AI.ready()) return toast(t('Добавьте ключ Gemini в Настройках → AI'), 4000);
  const law = S.set.chatLaw !== false;
  if (!q) q = law ? t('Проанализируй приложенные материалы и дай советы по законодательству Узбекистана') : t('Проанализируй приложенные материалы');
  stopDictation();
  inp.value = ''; Chat.draft = ''; inp.style.height = 'auto';
  Chat.msgs.push(Object.assign({ role: 'user', text: q, at: Date.now() }, att.length ? { att } : {}));
  Chat.att = []; chatAttRedraw();
  const files = Chat.msgs.some(m => (m.att || []).length);
  Chat.busy = att.length ? 'files' : true; chatSave(); chatRedraw();
  const me = S.set.name && !/@/.test(S.set.name) ? S.set.name : '';
  const system = `Ты — MARKUS-A, умный личный помощник и советник${me ? ' пользователя по имени ' + me : ''}. Отвечай на языке вопроса, по существу, дружелюбно и уверенно, как опытный консультант. Структурируй длинные ответы (короткие абзацы, списки, при необходимости таблицы). Если чего-то не знаешь или факт мог устареть — прямо скажи об этом и предложи, где проверить.${law ? '\n\n' + chatLawPrompt() : ' По юридическим, медицинским и финансовым вопросам давай полезную информацию, но напоминай, что окончательное решение — за специалистом.'}${files ? '\nК разговору приложены файлы (помечены «[Вложение: …]»). Опирайся на их содержание; цитируй ключевые места дословно и указывай, где в документе (пункт, страница).' : ''}${S.set.chatCtx !== false ? '\n\n' + chatContext() : '\n' + nowContext()}`;
  let text = '', src = [], err = '';
  try {
    const hist = await chatHistory();
    const opts = { system, temp: law ? 0.3 : 0.6, contents: hist, timeoutMs: files ? 300000 : 120000 };
    if (S.set.chatWeb) {
      try { text = await AI.call([], Object.assign({}, opts, { tools: [{ google_search: {} }] })); src = AI.lastSources || []; }
      catch (e) { if (e.fatal || e.net) throw e; text = await AI.call([], opts); toast(t('Поиск в интернете сейчас недоступен — ответил без него'), 4000); }
    } else text = await AI.call([], opts);
  } catch (e) {
    err = e.message || String(e);
    // a file Google rejected (or that cannot be read) is not sent again with every next question
    const um = Chat.msgs[Chat.msgs.length - 1];
    if (att.length && (e.input || e.attRead) && um && um.role === 'user') { um.attBad = true; err += ' — ' + t('Google не принял один из файлов. Попробуйте PDF или снимок экрана вместо него и спросите ещё раз.'); }
  }
  Chat.busy = false;
  Chat.msgs.push(err ? { role: 'ai', text: '⚠ ' + err, err: true, at: Date.now() } : { role: 'ai', text, src, at: Date.now() });
  chatSave(); chatRedraw();
  // asked by voice → answered by voice
  if (o.voice && !err && S.set.voiceReply !== false) { chatSpeak(Chat.msgs.length - 1); }
}

/* ============================ «Выгрузить» ============================ */
/* entries: [{ q: user message or null, a: AI message }] */
function chatEntries(i, scope) {
  const pick = k => ({ q: Chat.msgs[k - 1] && Chat.msgs[k - 1].role === 'user' ? Chat.msgs[k - 1] : null, a: Chat.msgs[k] });
  if (scope !== 'all') return [pick(i)];
  return Chat.msgs.map((m, k) => m.role !== 'user' && !m.err ? pick(k) : null).filter(Boolean);
}
const chatNoEmoji = s => String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu, '').replace(/[ \t]{2,}/g, ' ');
function chatFileName(entries, ext) {
  const qm = (entries[0] || {}).q || {};
  let q = entries.length > 1 ? t('Разговор с AI') : chatPlain((qm.text || t('Ответ AI')).split('\n')[0]);
  if (entries.length === 1 && (qm.att || []).length && /^Проанализируй приложенные материалы/.test(qm.text || '')) q = t('Разбор') + ' — ' + qm.att[0].name.replace(/\.[^.]+$/, '');
  let base = chatNoEmoji(q).replace(/[\\/:*?"<>|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (base.length > 60) base = base.slice(0, 61).replace(/\s+\S*$/, '');
  base = base.replace(/[\s.,;:!?—-]+$/, '') || 'MARKUS-A';
  return base + ' ' + D.today() + '.' + ext;
}
const CHAT_NOTE = 'Ответ подготовлен искусственным интеллектом (Google Gemini) в приложении MARKUS-A и может содержать неточности. Нормы проверяйте по актуальной редакции на lex.uz.';

async function chatPdf(entries, o) {
  await loadScript(PDFMAKE_URL); await loadScript(PDFFONTS_URL);
  const R = s => chatRuns(chatNoEmoji(s)).map(r => r.b ? { text: r.s, bold: true } : r.s);
  const blocks = bs => bs.map(b => {
    if (b.t === 'h') return { text: R(b.s), style: 'h2' };
    if (b.t === 'li' || b.t === 'ol') return { columns: [{ width: b.t === 'ol' ? 18 : 10, text: b.t === 'ol' ? b.n : '•' }, { width: '*', text: R(b.s) }], columnGap: 4, margin: [b.lv ? 26 : 8, 0, 0, 2] };
    if (b.t === 'gap') return { text: ' ', fontSize: 4 };
    if (b.t === 'hr') return { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 515, y2: 4, lineWidth: 0.5, lineColor: '#cccccc' }], margin: [0, 2, 0, 6] };
    if (b.t === 'table') return { table: { headerRows: 1, widths: b.rows[0].map(() => '*'), body: b.rows.map((r, k) => r.map(c => ({ text: R(c), bold: !k, fontSize: 9.5, fillColor: k ? null : '#f1f3f5' }))) }, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#c8ccd2', vLineColor: () => '#c8ccd2', paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 2, 0, 8] };
    return { text: R(b.s), margin: [0, 0, 0, 3] };
  });
  const c = [];
  c.push({ columns: [{ text: 'MARKUS-A', style: 'brand' }, { text: t('Сформировано') + ': ' + D.num(new Date()) + ' ' + D.nowTime(), alignment: 'right', color: '#888', fontSize: 8 }] });
  c.push({ text: entries.length > 1 ? t('Разговор с AI') : t('Ответ AI'), style: 'h1' });
  entries.forEach((e, k) => {
    if (k) c.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#1f3a5f' }], margin: [0, 10, 0, 8] });
    if (o.q && e.q) {
      const st = [{ text: t('Вопрос'), bold: true, fontSize: 8.5, color: '#555' }, { text: chatNoEmoji(e.q.text) }];
      if ((e.q.att || []).length) st.push({ text: t('Приложено') + ': ' + e.q.att.map(a => a.name).join('; '), fontSize: 8.5, color: '#555', margin: [0, 3, 0, 0] });
      c.push({ table: { widths: ['*'], body: [[{ stack: st, fillColor: '#f3f1ec', margin: [6, 5, 6, 5] }]] }, layout: 'noBorders', margin: [0, 2, 0, 8] });
      c.push({ text: t('Ответ'), bold: true, fontSize: 8.5, color: '#555', margin: [0, 0, 0, 3] });
    }
    blocks(chatBlocks(e.a.text)).forEach(x => c.push(x));
    if ((e.a.src || []).length) { c.push({ text: t('Источники'), bold: true, fontSize: 9, margin: [0, 6, 0, 2] }); c.push({ ul: e.a.src.map(s => ({ text: chatNoEmoji(s.title) + ' — ' + s.uri, link: s.uri, color: '#1d4ed8', fontSize: 8.5 })) }); }
  });
  c.push({ text: t(CHAT_NOTE), fontSize: 7.5, color: '#888', italics: true, margin: [0, 16, 0, 0] });
  const dd = {
    pageSize: 'A4', pageMargins: [40, 40, 40, 44], defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.25 }, content: c,
    info: { title: chatFileName(entries, 'pdf').replace(/\.pdf$/, ''), author: 'MARKUS-A' },
    styles: { brand: { fontSize: 12, bold: true, color: '#1f3a5f' }, h1: { fontSize: 17, bold: true, margin: [0, 6, 0, 10] }, h2: { fontSize: 12, bold: true, margin: [0, 8, 0, 4], color: '#1f2937' } },
    footer: (cur, total) => ({ text: 'MARKUS-A · ' + cur + ' / ' + total, alignment: 'center', fontSize: 8, color: '#9ca3af', margin: [0, 14, 0, 0] })
  };
  return new Promise((res, rej) => { try { pdfMake.createPdf(dd).getBlob(res); } catch (e) { rej(e); } });
}

/* Word (.docx) without any library: a few XML files packed into a zip (no compression) */
const CRC_T = (() => { const tb = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; } return tb; })();
function crc32(u) { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC_T[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipStore(files, type) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  const now = new Date(), dt = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(), tm = (now.getHours() << 11) | (now.getMinutes() << 5);
  files.forEach(f => {
    const nm = enc.encode(f.name), d = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true);
    h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nm, d);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true);
    c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + d.length;
  });
  const csize = central.reduce((s, a) => s + a.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
  return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type });
}
const xe = s => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function chatDocx(entries, o) {
  const run = (s, rp = '') => `<w:r>${rp ? '<w:rPr>' + rp + '</w:rPr>' : ''}<w:t xml:space="preserve">${xe(s)}</w:t></w:r>`;
  const runs = (s, rp = '') => chatRuns(chatNoEmoji(s)).map(r => run(r.s, (r.b ? '<w:b/>' : '') + rp)).join('');
  const P = (inner, pp = '') => `<w:p><w:pPr>${pp}</w:pPr>${inner}</w:p>`;
  const sp = (b, a) => `<w:spacing w:before="${b}" w:after="${a}"/>`;
  const W = 9355;   // text width in twips: A4 11906 − margins 1701 − 850
  const body = [];
  const blocks = bs => bs.forEach(b => {
    if (b.t === 'h') body.push(P(runs(b.s, '<w:sz w:val="26"/>'), '<w:keepNext/>' + sp(160, 80)));
    else if (b.t === 'li' || b.t === 'ol') { const ind = b.lv ? 1080 : 540; body.push(P(run((b.t === 'ol' ? b.n : '•') + '\t') + runs(b.s), `<w:tabs><w:tab w:val="left" w:pos="${ind}"/></w:tabs>` + sp(0, 60) + `<w:ind w:left="${ind}" w:hanging="${b.t === 'ol' ? 400 : 300}"/>`)); }
    else if (b.t === 'gap') body.push(P('', sp(0, 0)));
    else if (b.t === 'hr') body.push(P('', '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="BBBBBB"/></w:pBdr>' + sp(0, 120)));
    else if (b.t === 'table') {
      const n = b.rows[0].length, cw = Math.floor(W / n), bd = s => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="999999"/>`;
      body.push(`<w:tbl><w:tblPr><w:tblW w:w="${cw * n}" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(bd).join('')}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${('<w:gridCol w:w="' + cw + '"/>').repeat(n)}</w:tblGrid>${b.rows.map((r, k) => `<w:tr>${r.map(c => `<w:tc><w:tcPr><w:tcW w:w="${cw}" w:type="dxa"/>${k ? '' : '<w:shd w:val="clear" w:color="auto" w:fill="EEEEEE"/>'}</w:tcPr>${P(runs(c, (k ? '' : '<w:b/>') + '<w:sz w:val="22"/>'), sp(20, 20))}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`);
      body.push(P('', sp(0, 60)));
    }
    else body.push(P(runs(b.s), sp(0, 100) + '<w:jc w:val="both"/>'));
  });
  body.push(P(run('MARKUS-A', '<w:b/><w:color w:val="1F3A5F"/>') + run('\t' + t('Сформировано') + ': ' + D.num(new Date()) + ' ' + D.nowTime(), '<w:color w:val="888888"/><w:sz w:val="18"/>'), `<w:tabs><w:tab w:val="right" w:pos="${W}"/></w:tabs>` + sp(0, 120)));
  body.push(P(run(entries.length > 1 ? t('Разговор с AI') : t('Ответ AI'), '<w:b/><w:sz w:val="32"/>'), sp(0, 200)));
  entries.forEach((e, k) => {
    if (k) body.push(P('', '<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="1F3A5F"/></w:pBdr>' + sp(120, 200)));
    if (o.q && e.q) {
      const shd = '<w:shd w:val="clear" w:color="auto" w:fill="F3F1EC"/>';
      body.push(P(run(t('Вопрос'), '<w:b/><w:color w:val="555555"/><w:sz w:val="20"/>'), shd + sp(0, 0)));
      chatNoEmoji(e.q.text).split('\n').forEach(l => body.push(P(run(l), shd + sp(0, 0))));
      if ((e.q.att || []).length) body.push(P(run(t('Приложено') + ': ' + e.q.att.map(a => a.name).join('; '), '<w:color w:val="555555"/><w:sz w:val="20"/>'), shd + sp(0, 0)));
      body.push(P(run(t('Ответ'), '<w:b/><w:color w:val="555555"/><w:sz w:val="20"/>'), sp(160, 60)));
    }
    blocks(chatBlocks(e.a.text));
    if ((e.a.src || []).length) { body.push(P(run(t('Источники'), '<w:b/>'), sp(120, 40))); e.a.src.forEach(s => body.push(P(run('• ' + chatNoEmoji(s.title) + ' — ' + s.uri, '<w:sz w:val="20"/>'), sp(0, 40)))); }
  });
  body.push(P(run(t(CHAT_NOTE), '<w:i/><w:color w:val="888888"/><w:sz w:val="18"/>'), sp(240, 0)));
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ru-RU" w:eastAsia="ru-RU" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const drels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const iso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xe(chatFileName(entries, 'docx').replace(/\.docx$/, ''))}</dc:title><dc:creator>MARKUS-A</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created></cp:coreProperties>`;
  return zipStore([
    { name: '[Content_Types].xml', data: ct }, { name: '_rels/.rels', data: rels }, { name: 'docProps/core.xml', data: core },
    { name: 'word/document.xml', data: doc }, { name: 'word/_rels/document.xml.rels', data: drels }, { name: 'word/styles.xml', data: styles }
  ], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
function chatTxt(entries, o) {
  const plain = x => chatBlocks(x).map(b => b.t === 'gap' ? '' : b.t === 'hr' ? '———' : b.t === 'h' ? chatPlain(b.s).toUpperCase()
    : b.t === 'li' ? (b.lv ? '    • ' : '  • ') + chatPlain(b.s) : b.t === 'ol' ? (b.lv ? '    ' : '  ') + b.n + ' ' + chatPlain(b.s)
      : b.t === 'table' ? b.rows.map(r => '| ' + r.map(chatPlain).join(' | ') + ' |').join('\n') : chatPlain(b.s)).join('\n');
  const s = ['MARKUS-A — ' + (entries.length > 1 ? t('Разговор с AI') : t('Ответ AI')) + ' · ' + D.num(new Date()) + ' ' + D.nowTime(), ''];
  entries.forEach((e, k) => {
    if (k) s.push('', '══════════════════════', '');
    if (o.q && e.q) { s.push(t('Вопрос') + ':', e.q.text); if ((e.q.att || []).length) s.push(t('Приложено') + ': ' + e.q.att.map(a => a.name).join('; ')); s.push('', t('Ответ') + ':'); }
    s.push(plain(e.a.text));
    if ((e.a.src || []).length) s.push('', t('Источники') + ':', ...e.a.src.map(x => '• ' + x.title + ' — ' + x.uri));
  });
  s.push('', '—', t(CHAT_NOTE));
  return new Blob(['﻿' + s.join('\n').replace(/\r?\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' });
}

function chatExport(i) {
  const m = Chat.msgs[i]; if (!m || m.err) return;
  const many = Chat.msgs.filter(x => x.role !== 'user' && !x.err).length > 1;
  let fmt = ['pdf', 'docx', 'txt'].includes(S.set.chatFmt) ? S.set.chatFmt : 'pdf', scope = 'one';
  const sh = openSheet(`
    <div class="sh-h">${ic('download', 20)}<b>${t('Выгрузить ответ AI')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    ${many ? `<div class="hint">${t('Что выгрузить')}</div><div class="seg" id="ce_scope"><button data-v="one" class="on">${t('Этот ответ')}</button><button data-v="all">${t('Весь разговор')}</button></div>` : ''}
    <div class="hint">${t('Формат')}</div>
    <div class="seg" id="ce_fmt">${[['pdf', 'PDF'], ['docx', 'Word'], ['txt', t('Текст')]].map(([v, l]) => `<button data-v="${v}" class="${v === fmt ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="hint sm-h" id="ce_fh"></div>
    <div class="sw-row"><div><b>${t('Добавить мой вопрос и список вложений')}</b></div><button class="sw on" id="ce_q"></button></div>
    <div class="btns" style="margin-top:14px"><button class="btn pri" id="ce_share">${ic('share', 18)} ${t('Поделиться')}</button><button class="btn ghost" id="ce_dl">${ic('download', 18)} ${isPhone() ? t('В телефон') : t('Скачать')}</button></div>
    <div class="btns" style="margin-top:8px"><button class="btn ghost" id="ce_lib">${ic('book', 18)} ${t('В «Мою библиотеку»')}</button><button class="btn ghost" id="ce_open">${ic('pdf', 18)} ${t('Открыть / Печать')}</button></div>`);
  const FH = { pdf: t('PDF — для отправки и печати, выглядит одинаково везде.'), docx: t('Word — можно дописать и отредактировать (шрифт Times New Roman 12).'), txt: t('Текст — для вставки куда угодно.') };
  const sync = () => { $('#ce_fh', sh).textContent = FH[fmt]; $('#ce_open', sh).style.display = fmt === 'pdf' ? '' : 'none'; };
  $$('#ce_fmt button', sh).forEach(b => b.onclick = () => { fmt = b.dataset.v; setVal('chatFmt', fmt); $$('#ce_fmt button', sh).forEach(x => x.classList.toggle('on', x === b)); sync(); });
  $$('#ce_scope button', sh).forEach(b => b.onclick = () => { scope = b.dataset.v; $$('#ce_scope button', sh).forEach(x => x.classList.toggle('on', x === b)); });
  $('#ce_q', sh).onclick = function () { this.classList.toggle('on'); };
  sync();
  const make = async () => {
    const entries = chatEntries(i, scope), o = { q: $('#ce_q', sh).classList.contains('on') };
    const blob = fmt === 'pdf' ? await chatPdf(entries, o) : fmt === 'docx' ? chatDocx(entries, o) : chatTxt(entries, o);
    return { blob, name: chatFileName(entries, fmt) };
  };
  const run = (btn, fn) => withBusy(btn, async () => { const r = await make(); await fn(r); }, { busy: t('Готовлю файл…'), ok: t('Готово') });
  $('#ce_share', sh).onclick = function () { run(this, r => { closeSheet(); shareMenu(blobSrc(r.blob, r.name, r.name)); }); };
  $('#ce_dl', sh).onclick = function () { run(this, r => { downloadBlob(r.blob, r.name); if (!NATIVE) toast(t('Файл сохранён в «Загрузки»')); }); };
  $('#ce_open', sh).onclick = function () { run(this, r => window.open(URL.createObjectURL(r.blob), '_blank')); };
  $('#ce_lib', sh).onclick = function () {
    run(this, async r => {
      const f = await storeFile(new File([r.blob], r.name, { type: r.blob.type }), r.name);
      await saveItem(newItem('lib', { sec: 'doc', title: r.name.replace(/\.[^.]+$/, ''), files: [f] }), { render: false });
      toast(t('Сохранено в «Моя библиотека» → Документы ✓'), 3500);
    });
  };
}
