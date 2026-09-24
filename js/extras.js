'use strict';
const QR_URL = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const PDFMAKE_URL = 'https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/build/pdfmake.min.js';
const PDFFONTS_URL = 'https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/build/vfs_fonts.js';

/* ================= contacts ================= */
const digits = s => String(s || '').replace(/[^\d+]/g, '');
const tgUser = s => String(s || '').trim().replace(/^https?:\/\/t\.me\//, '').replace(/^@/, '');
function contactLinks(c) {
  const L = [];
  if (c.phone) L.push({ i: 'phone', l: t('Позвонить'), u: 'tel:' + digits(c.phone) });
  const wa = digits(c.whatsapp || c.phone).replace('+', '');
  if (c.whatsapp || c.phone) L.push({ i: 'wa', l: 'WhatsApp', u: 'https://wa.me/' + wa });
  if (c.telegram) L.push({ i: 'tg', l: 'Telegram', u: /^\+?\d{7,}$/.test(digits(c.telegram)) && !/[a-z_]/i.test(c.telegram) ? 'https://t.me/' + digits(c.telegram) : 'https://t.me/' + tgUser(c.telegram) });
  if (c.email) L.push({ i: 'mail', l: 'Email', u: 'mailto:' + c.email });
  return L;
}
function contactMeetings(id) { return sortByDate(S.items.filter(i => !i.deleted && i.kind === 'meeting' && (i.contactIds || []).includes(id)), true); }
function openContact(id) {
  const c = getItem(id); if (!c) return;
  const ms = contactMeetings(id);
  openSheet(`
    <div class="sh-h"><span class="pav" style="width:44px;height:44px;font-size:17px">${esc((c.title || '?')[0].toUpperCase())}</span><div style="flex:1;min-width:0"><b style="font-size:17px">${esc(c.title)}</b>${c.company ? `<div class="muted" style="font-size:13px">${esc(c.company)}</div>` : ''}</div><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="btns">${contactLinks(c).map(l => `<a class="btn ghost" href="${esc(l.u)}" target="_blank" rel="noopener">${ic(l.i, 18)} ${esc(l.l)}</a>`).join('') || `<div class="hint">${t('Контактов пока нет — нажмите «Изменить»')}</div>`}</div>
    <div class="card" style="margin-top:12px">
      ${[['phone', 'Телефон', 'tel:' + digits(c.phone || '')], ['whatsapp', 'WhatsApp', 'https://wa.me/' + digits(c.whatsapp || c.phone || '').replace('+', '')], ['telegram', 'Telegram', /^\+?\d{7,}$/.test(digits(c.telegram || '')) && !/[a-z_]/i.test(c.telegram || '') ? 'https://t.me/' + digits(c.telegram || '') : 'https://t.me/' + tgUser(c.telegram || '')], ['email', 'Email', 'mailto:' + (c.email || '')]].filter(([k]) => c[k]).map(([k, l, u]) => `<a class="kv" href="${esc(u)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><b style="min-width:90px">${t(l)}</b><span style="color:var(--acc);word-break:break-all">${esc(c[k])}</span></a>`).join('')}
      ${c.desc ? `<div class="pre" style="margin-top:6px">${linkify(c.desc)}</div>` : ''}
    </div>
    ${(c.files || []).length ? `<div class="h4">${t('Документы (паспорт и др.)')}</div>${attList(c.files, c.id, false)}` : ''}
    ${ms.length ? `<div class="h4">${t('Встречи')}</div>${listOf(ms, { showDate: true })}` : ''}
    <div class="sh-foot"><button class="btn ghost" onclick="shareContact('${id}')">${ic('share', 18)}</button><button class="btn ghost" style="flex:1" onclick="closeSheet();editContact('${id}')">${ic('edit', 18)} ${t('Изменить')}</button></div>`, { cls: 'tall' });
}
function editContact(id, preset) {
  const ex = id ? getItem(id) : null;
  const C = clone(ex || newItem('contact', preset || {}));
  E = C;
  return new Promise(res => {
    let saved = false;
    const sh = openSheet(`
      <div class="sh-h"><b>${ex ? t('Контакт') : t('Новый контакт')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
      <label class="lbl">${t('ФИО')}</label><input class="inp inp-big" id="c_name" value="${esc(C.title)}" placeholder="${esc(t('Фамилия Имя Отчество'))}">
      <label class="lbl">${t('Компания / должность')}</label><input class="inp" id="c_comp" value="${esc(C.company || '')}">
      <div class="g2"><div><label class="lbl">${t('Телефон')}</label><input class="inp" id="c_phone" type="tel" value="${esc(C.phone || '')}" placeholder="+998 …"></div>
      <div><label class="lbl">WhatsApp</label><input class="inp" id="c_wa" type="tel" value="${esc(C.whatsapp || '')}" placeholder="${esc(t('если отличается'))}"></div></div>
      <div class="g2"><div><label class="lbl">Telegram</label><input class="inp" id="c_tg" value="${esc(C.telegram || '')}" placeholder="@username"></div>
      <div><label class="lbl">Email</label><input class="inp" id="c_mail" type="email" value="${esc(C.email || '')}"></div></div>
      <label class="lbl">${t('Заметки')}</label><textarea class="inp" id="c_desc">${esc(C.desc || '')}</textarea>
      <label class="lbl">${t('Копия паспорта и другие документы')}</label><div id="e_files"></div>
      <label class="att-add" style="margin-top:8px">${ic('clip', 16)} ${t('Прикрепить фото или файл')}<input type="file" multiple hidden accept="image/*,application/pdf" onchange="edAddFiles(this)"></label>
      <div class="sh-foot">${ex ? `<button class="btn danger" id="c_del">${ic('trash', 18)}</button>` : ''}<button class="btn pri" style="flex:1" id="c_save">${t('Сохранить')}</button></div>`, { cls: 'tall', onClose: () => { if (!saved) res(null); } });
    edRenderFiles();
    if ($('#c_del', sh)) $('#c_del', sh).onclick = async () => { if (!(await confirmDel(t('Удалить контакт?')))) return; await deleteItem(getItem(C.id)); saved = true; closeAllSheets(); toast(t('Удалено')); res(null); };
    $('#c_save', sh).onclick = async () => {
      C.title = $('#c_name', sh).value.trim(); if (!C.title) return toast(t('Укажите ФИО'));
      Object.assign(C, { company: $('#c_comp', sh).value.trim(), phone: $('#c_phone', sh).value.trim(), whatsapp: $('#c_wa', sh).value.trim(), telegram: $('#c_tg', sh).value.trim(), email: $('#c_mail', sh).value.trim(), desc: $('#c_desc', sh).value.trim() });
      await saveItem(C); saved = true; closeSheet(); toast(t('Сохранено ✓')); res(C.id);
    };
    if (!ex) setTimeout(() => $('#c_name', sh).focus(), 250);
  });
}
/* choose an existing contact or create a new one; resolves with contact id */
function pickContact(exclude = []) {
  const draft = E;
  return new Promise(res => {
    let done = false;
    const sh = openSheet(`<div class="sh-h"><b>${t('Участник')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
      <div class="search">${ic('search', 18)}<input id="pc_q" placeholder="${esc(t('Поиск по имени…'))}"></div>
      <button class="btn pri full" id="pc_new">${ic('plus', 18)} ${t('Новый контакт')}</button>
      <div id="pc_list" style="margin-top:10px"></div>`, { cls: 'tall', onClose: () => { E = draft; if (!done) res(null); } });
    const draw = () => {
      const q = $('#pc_q', sh).value.toLowerCase();
      const cs = live().filter(c => c.kind === 'contact' && !exclude.includes(c.id) && (!q || (c.title + ' ' + (c.company || '') + ' ' + (c.phone || '')).toLowerCase().includes(q))).sort((a, b) => a.title.localeCompare(b.title));
      $('#pc_list', sh).innerHTML = cs.length ? `<div class="list">${cs.map(c => `<div class="ncard" data-pc="${c.id}"><span class="pav">${esc(c.title[0].toUpperCase())}</span><div class="nmain"><b>${esc(c.title)}</b><span>${esc([c.company, c.phone].filter(Boolean).join(' · '))}</span></div></div>`).join('')}</div>` : `<div class="hint">${t('Контактов пока нет')}</div>`;
      $$('[data-pc]', sh).forEach(b => b.onclick = () => { done = true; closeSheet(); res(b.dataset.pc); });
    };
    $('#pc_q', sh).oninput = draw; draw();
    $('#pc_new', sh).onclick = async () => {
      const id = await editContact(null, { title: $('#pc_q', sh).value.trim() });
      if (id) { done = true; E = draft; closeSheet(); res(id); }
    };
  });
}
async function shareContact(id) {
  const c = getItem(id);
  const v = vcardOf({ fn: c.title, org: c.company, phone: c.phone, whatsapp: c.whatsapp, telegram: c.telegram, email: c.email, note: c.desc });
  shareFile(new Blob([v], { type: 'text/vcard' }), (c.title || 'contact').replace(/[\\/:*?"<>|]/g, '') + '.vcf', c.title);
}

/* ================= meeting invitation ================= */
function inviteText(m) {
  const me = S.set.myCard;
  return [
    '📅 ' + t('Встреча') + ': ' + m.title,
    m.date ? '🗓 ' + D.long(m.date) + (m.start ? ', ' + timeLabel(m) : '') : '',
    m.place ? '📍 ' + m.place : '',
    m.location ? '🗺 ' + m.location : '',
    '',
    '— ' + (S.set.name || me.fn) + (me.phone ? ', ' + me.phone : '') + (me.telegram ? ', t.me/' + tgUser(me.telegram) : '')
  ].filter((x, i, a) => x !== '' || i === a.length - 2).join('\n');
}
async function sendInvite(meetingId) {
  const m = getItem(meetingId);
  const cs = (m.contactIds || []).map(getItem).filter(c => c && !c.deleted);
  const text = inviteText(m);
  const btns = [];
  cs.forEach(c => {
    const wa = digits(c.whatsapp || c.phone).replace('+', '');
    if (wa) btns.push({ l: 'WhatsApp → ' + c.title, v: 'https://wa.me/' + wa + '?text=' + encodeURIComponent(text), p: 1 });
  });
  btns.push({ l: t('Telegram (выбрать чат)'), v: 'https://t.me/share/url?url=' + encodeURIComponent(m.location || cfg.bot && ('https://t.me/' + cfg.bot) || location.href) + '&text=' + encodeURIComponent(text) });
  btns.push({ l: t('Другое приложение…'), v: 'share' }, { l: t('Копировать текст'), v: 'copy' }, { l: t('Отмена'), v: null });
  const v = await dialog({ title: t('Отправить приглашение'), html: `<div class="ai-box" style="margin:0 0 6px">${esc(text)}</div>`, buttons: btns });
  if (!v) return;
  if (v === 'share') return shareText(text);
  if (v === 'copy') { try { await navigator.clipboard.writeText(text); toast(t('Скопировано')); } catch (e) { } return; }
  window.open(v, '_blank');
}

/* ================= my business card (vCard + QR) ================= */
function vEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
function vcardOf(c) {
  const L = ['BEGIN:VCARD', 'VERSION:3.0'];
  L.push('N:' + vEsc(c.fn || '') + ';;;;');
  L.push('FN:' + vEsc(c.fn || ''));
  if (c.org) L.push('ORG:' + vEsc(c.org));
  if (c.title) L.push('TITLE:' + vEsc(c.title));
  if (c.phone) L.push('TEL;TYPE=WORK,VOICE:' + digits(c.phone));
  if (c.phone2) L.push('TEL;TYPE=CELL:' + digits(c.phone2));
  if (c.whatsapp) L.push('TEL;TYPE=CELL,WhatsApp:' + digits(c.whatsapp));
  if (c.email) L.push('EMAIL;TYPE=INTERNET:' + c.email);
  if (c.url) L.push('URL:' + c.url);
  if (c.telegram) { const u = tgUser(c.telegram); L.push('URL;TYPE=Telegram:https://t.me/' + u); L.push('X-SOCIALPROFILE;TYPE=telegram:https://t.me/' + u); L.push('IMPP;X-SERVICE-TYPE=Telegram:telegram:' + u); }
  if (c.address) { const p = c.address.split(',').map(x => x.trim()); L.push('ADR;TYPE=WORK:;;' + vEsc(p[0] || '') + ';' + vEsc(p[1] || '') + ';;;' + vEsc(p.slice(2).join(', '))); }
  const note = [c.note, c.telegram ? 'Telegram: @' + tgUser(c.telegram) : ''].filter(Boolean).join('. ');
  if (note) L.push('NOTE:' + vEsc(note));
  L.push('END:VCARD');
  return L.join('\n') + '\n';
}
async function drawCard(canvas) {
  await loadScript(QR_URL);
  const c = S.set.myCard, W = 1200, H = 1380, g = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const q = qrcode(0, 'H'); q.addData(vcardOf(c), 'Byte'); q.make();
  const gold = '#c9a66b', dark = '#0b0b0c';
  g.fillStyle = '#fafaf8'; g.fillRect(0, 0, W, H);
  g.fillStyle = dark; g.fillRect(0, 0, W, 175);
  g.fillStyle = gold; g.fillRect(0, 175, W, 8);
  g.textAlign = 'center';
  g.fillStyle = '#dcc08a'; g.font = 'bold 92px Georgia, "Times New Roman", serif'; g.fillText(c.brand || 'MARKUS', W / 2, 92);
  g.fillStyle = '#9b958a'; g.font = '34px Inter, Arial, sans-serif'; g.fillText(c.subtitle || '', W / 2, 140);
  const n = q.getModuleCount(), size = 980, x0 = 110, y0 = 210, cell = size / n;
  g.fillStyle = dark;
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect(Math.floor(x0 + k * cell), Math.floor(y0 + r * cell), Math.ceil(cell), Math.ceil(cell));
  g.strokeStyle = gold; g.lineWidth = 6;
  [[80, 185, 1, 1], [1120, 185, -1, 1], [80, 1215, 1, -1], [1120, 1215, -1, -1]].forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x + sx * 58, y); g.lineTo(x, y); g.lineTo(x, y + sy * 55); g.stroke(); });
  const cx = W / 2, cy = y0 + size / 2;
  g.fillStyle = '#fafaf8'; g.beginPath(); g.arc(cx, cy, 98, 0, Math.PI * 2); g.fill();
  g.fillStyle = gold; g.beginPath(); g.arc(cx, cy, 86, 0, Math.PI * 2); g.fill();
  g.fillStyle = dark; g.beginPath(); g.arc(cx, cy, 80, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#dcc08a'; g.font = 'bold 110px Georgia, serif'; g.textBaseline = 'middle'; g.fillText((c.brand || 'M')[0], cx, cy + 6); g.textBaseline = 'alphabetic';
  g.fillStyle = '#2d2418'; g.font = 'bold 40px Inter, Arial, sans-serif'; g.fillText(t('Сохранить контакт в телефон'), W / 2, 1292);
  g.fillStyle = '#8a7657'; g.font = '30px "Courier New", monospace'; g.fillText(c.footer || '', W / 2, 1338);
}
async function shareCardImage() {
  const cv = document.createElement('canvas');
  try { await drawCard(cv); } catch (e) { return toast(e.message, 4000); }
  cv.toBlob(b => shareFile(b, (S.set.myCard.brand || 'card') + '-QR.png', t('Моя визитка')), 'image/png');
}
function shareVcf() { shareFile(new Blob([vcardOf(S.set.myCard)], { type: 'text/vcard' }), (S.set.myCard.brand || 'contact') + '.vcf', t('Моя визитка')); }

/* ================= PDF export ================= */
async function openPdfExport(preset) {
  let range = preset || 'today';
  const sh = openSheet(`
    <div class="sh-h"><b>${t('Выгрузить в PDF')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="hint">${t('Для печати или отправки в Telegram / WhatsApp.')}</div>
    <label class="lbl">${t('Период')}</label>
    <div class="chips wrapchips" id="pdf_r">${[['today', 'Сегодня'], ['tomorrow', 'Завтра'], ['week', '7 дней'], ['month', 'Месяц'], ['custom', 'Выбрать период']].map(([k, l]) => `<button class="chip ${k === range ? 'on' : ''}" data-r="${k}">${t(l)}</button>`).join('')}</div>
    <div class="g2" id="pdf_c" ${range === 'custom' ? '' : 'hidden'}><div><label class="lbl">${t('С')}</label><input class="inp" type="date" id="pdf_a" value="${D.today()}"></div><div><label class="lbl">${t('По')}</label><input class="inp" type="date" id="pdf_b" value="${D.add(D.today(), 6)}"></div></div>
    <div class="sw-row"><div><b>${t('Подзадачи')}</b><span>${t('Показывать шаги со сроками и отметками')}</span></div><button class="sw on" id="pdf_s"></button></div>
    <div class="sw-row"><div><b>${t('Выполненные')}</b><span>${t('Включать выполненные и отменённые')}</span></div><button class="sw on" id="pdf_d"></button></div>
    <div class="sw-row"><div><b>${t('Без даты')}</b><span>${t('Добавить список задач без даты')}</span></div><button class="sw" id="pdf_n"></button></div>
    <div class="btns" style="margin-top:14px"><button class="btn pri" id="pdf_share">${ic('share', 18)} ${t('Поделиться')}</button><button class="btn ghost" id="pdf_dl">${ic('download', 18)} ${t('Скачать')}</button></div>
    <button class="btn ghost full" style="margin-top:8px" id="pdf_open">${ic('pdf', 18)} ${t('Открыть / Печать')}</button>`, { cls: 'tall' });
  $$('#pdf_r .chip', sh).forEach(b => b.onclick = () => { range = b.dataset.r; $$('#pdf_r .chip', sh).forEach(x => x.classList.toggle('on', x === b)); $('#pdf_c', sh).hidden = range !== 'custom'; });
  $$('.sw', sh).forEach(b => b.onclick = () => b.classList.toggle('on'));
  const make = async () => {
    const td = D.today();
    let a = td, b = td;
    if (range === 'tomorrow') a = b = D.add(td, 1);
    if (range === 'week') b = D.add(td, 6);
    if (range === 'month') b = D.add(td, 30);
    if (range === 'custom') { a = $('#pdf_a', sh).value || td; b = $('#pdf_b', sh).value || a; if (b < a) [a, b] = [b, a]; }
    toast(t('Готовлю PDF…'), 8000);
    const blob = await buildPdf(a, b, { subs: $('#pdf_s', sh).classList.contains('on'), done: $('#pdf_d', sh).classList.contains('on'), nodate: $('#pdf_n', sh).classList.contains('on') });
    const name = 'MARKUS-A ' + (a === b ? a : a + '—' + b) + '.pdf';
    return { blob, name };
  };
  const run = async fn => { try { const r = await make(); $('#toast').classList.remove('show'); fn(r); } catch (e) { toast(e.message, 5000); } };
  $('#pdf_share', sh).onclick = () => run(r => shareFile(r.blob, r.name, r.name));
  $('#pdf_dl', sh).onclick = () => run(r => downloadBlob(r.blob, r.name));
  $('#pdf_open', sh).onclick = () => run(r => window.open(URL.createObjectURL(r.blob), '_blank'));
}
async function buildPdf(a, b, o) {
  await loadScript(PDFMAKE_URL); await loadScript(PDFFONTS_URL);
  const content = [];
  const periodTxt = a === b ? D.long(a) : D.short(a, true) + ' — ' + D.short(b, true);
  content.push({ columns: [{ text: 'MARKUS-A', style: 'brand' }, { text: t('Сформировано') + ': ' + D.num(new Date()) + ' ' + D.nowTime(), alignment: 'right', color: '#888', fontSize: 8 }] });
  content.push({ text: t('Задачи') + ': ' + periodTxt, style: 'h1' });
  if (S.set.name) content.push({ text: S.set.name, color: '#666', margin: [0, -6, 0, 8] });
  const subLines = it => (it.subtasks || []).map(s => {
    const meta = s.done ? '✓ ' + (s.doneAt ? D.num(s.doneAt.slice(0, 10)) : '') : isBlocked(it, s) ? t('ждёт «{x}»', { x: (subById(it, s.after) || {}).text || '' }) : s.due ? t('срок') + ' ' + D.num(s.due) + (s.time ? ' ' + s.time : '') : '';
    return { text: [{ text: (s.done ? '[x] ' : '[  ] ') + s.text, decoration: s.done ? 'lineThrough' : undefined, color: s.done ? '#888' : '#222' }, meta ? { text: '  — ' + meta, color: '#777', fontSize: 8 } : ''], fontSize: 9, margin: [6, 1, 0, 0] };
  });
  const cellFor = (it, sub) => {
    const st = [{ text: (it.kind === 'meeting' ? t('Встреча') + ': ' : '') + it.title, bold: true }];
    const meta = [it.place, (it.participants || []).join(', ')].filter(Boolean).join(' · ');
    if (meta) st.push({ text: meta, fontSize: 8, color: '#666' });
    if (it.status === 'cancelled' && it.cancelReason) st.push({ text: t('Причина отмены') + ': ' + it.cancelReason, fontSize: 8, color: '#b91c1c' });
    if (sub) st.push({ text: '↳ ' + sub.map(s => s.text).join('; '), fontSize: 9, color: '#1d4ed8' });
    else if (o.subs) st.push(...subLines(it));
    return { stack: st };
  };
  const statusTxt = it => { const p = progress(it); return t(STATUS[it.status] || it.status) + (isOverdue(it) ? '\n' + t('Просрочено') : '') + (p != null ? '\n' + p + '%' : ''); };
  let any = false;
  for (let d = a, k = 0; d <= b && k < 400; d = D.add(d, 1), k++) {
    let ag = dayAgenda(d).filter(e => o.done || isOpen(e.it));
    if (!ag.length) continue;
    any = true;
    ag = ag.sort((x, y) => (x.it.start || '99').localeCompare(y.it.start || '99'));
    const body = [[{ text: t('Время'), style: 'th' }, { text: t('Задача'), style: 'th' }, { text: t('Важность'), style: 'th' }, { text: t('Статус'), style: 'th' }]];
    ag.forEach(e => body.push([
      { text: e.subs ? t('подзадача') : e.cont ? t('до') + ' ' + D.num(spanEnd(e.it)) : (timeLabel(e.it) || '—'), fontSize: 9 },
      cellFor(e.it, e.subs),
      { text: t(PRIO[e.it.priority].l), fontSize: 9, color: PRIO[e.it.priority].c },
      { text: statusTxt(e.it), fontSize: 9 }
    ]));
    content.push({ text: cap(D.long(d)), style: 'day' });
    content.push({ table: { headerRows: 1, widths: [58, '*', 62, 70], body }, layout: { hLineColor: '#e5e7eb', vLineColor: '#e5e7eb', paddingTop: () => 4, paddingBottom: () => 4, fillColor: r => r === 0 ? '#f3f4f6' : null } });
  }
  if (o.nodate) {
    const nd = S.items.filter(i => isTaskKind(i) && !i.deleted && !i.date && (o.done || isOpen(i)));
    if (nd.length) { any = true; content.push({ text: t('Без даты'), style: 'day' }); content.push({ ul: nd.map(i => ({ stack: [{ text: i.title, bold: true }].concat(o.subs ? subLines(i) : []) })) }); }
  }
  if (!any) content.push({ text: t('За этот период задач нет.'), color: '#666', margin: [0, 20, 0, 0] });
  const dd = {
    pageSize: 'A4', pageMargins: [34, 36, 34, 40], defaultStyle: { font: 'Roboto', fontSize: 10 }, content,
    info: { title: 'MARKUS-A ' + periodTxt },
    styles: { brand: { fontSize: 12, bold: true, color: '#5b4dff' }, h1: { fontSize: 17, bold: true, margin: [0, 6, 0, 8] }, day: { fontSize: 12, bold: true, margin: [0, 12, 0, 5] }, th: { bold: true, fontSize: 9, color: '#374151' } },
    footer: (cur, total) => ({ text: 'MARKUS-A · ' + cur + ' / ' + total, alignment: 'center', fontSize: 8, color: '#9ca3af', margin: [0, 12, 0, 0] })
  };
  return new Promise((res, rej) => { try { pdfMake.createPdf(dd).getBlob(res); } catch (e) { rej(e); } });
}
