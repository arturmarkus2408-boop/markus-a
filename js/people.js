'use strict';
/* ============================================================================
   v3.8 — people and PDFs:
   · contact photo (avatar, like in Telegram), «where the client came from»
   · a new client right from the meeting editor
   · PDF of a contact and a fuller PDF of a meeting (contacts, places with coordinates, big photos)
   · 🔊 read a contact aloud, 🎙 «call him» / «write in Telegram that…»
   · offline map on the phone (Organic Maps and others)
   ========================================================================== */

/* ---------- avatar ---------- */
function avatarHtml(c, size = 36, cls = '') {
  const s = `width:${size}px;height:${size}px;font-size:${Math.round(size * .4)}px`;
  if (c && c.avatar) return `<span class="pav ${cls}" style="${s};background-image:url('${c.avatar}');background-size:cover;background-position:center"></span>`;
  return `<span class="pav ${cls}" style="${s}">${esc(((c && c.title) || '?').trim()[0] || '?').toUpperCase()}</span>`;
}
/* the photo is shrunk to 512 px (≈40 KB) — sharp enough to recognise a person, light for the phone and the free cloud */
async function imgData(blob, max = 1600, q = .86) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(t('Это не картинка'))); i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', q);
  } finally { URL.revokeObjectURL(url); }
}
async function edPickAvatar(inp) {
  const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
  try { E.avatar = await imgData(f, 512, .82); edRenderAvatar(); } catch (e) { toast(e.message, 4000); }
}
function edRenderAvatar() {
  const box = $('#c_av'); if (!box) return;
  box.innerHTML = `<label class="av-pick">${avatarHtml(E, 72)}<input type="file" accept="image/*" hidden onchange="edPickAvatar(this)"><span>${E.avatar ? t('Сменить фото') : t('Добавить фото')}</span></label>${E.avatar ? `<button class="link" onclick="E.avatar=null;edRenderAvatar()">${t('Убрать')}</button>` : ''}`;
}

/* ---------- a new client right from the meeting / task editor ---------- */
async function edNewClient() {
  const draft = E;
  const id = await editContact(null, {});
  E = draft;
  if (!id) return;
  const c = getItem(id);
  E.contactIds = Array.from(new Set((E.contactIds || []).concat(id)));
  E.participants = Array.from(new Set((E.participants || []).concat(c ? c.title : [])));
  edRenderPeople();
}

/* ---------- PDF pieces ---------- */
function pdfPlace(p) {
  const g = placeGeo(p), links = mapLinks(p);
  return { stack: [
    { text: placeTitle(p), bold: true },
    p.address && p.address !== placeTitle(p) ? { text: p.address } : '',
    p.note ? { text: p.note, color: '#444' } : '',
    g ? { text: t('Координаты') + ': ' + g.lat.toFixed(6) + ', ' + g.lng.toFixed(6), color: '#444', fontSize: 9 } : '',
    links.length ? { text: links.map(([n, u], i) => [{ text: n, link: u, color: '#1d4ed8', decoration: 'underline' }, i < links.length - 1 ? '   ' : '']).flat(), fontSize: 9, margin: [0, 2, 0, 0] } : ''
  ].filter(Boolean), margin: [0, 2, 0, 8] };
}
function contactRows(c) {
  const tg = c.telegram ? tgLink(c.telegram) : '';
  const ph = contactPhones(c);
  return [
    ...ph.map((x, i) => [t('Телефон') + (ph.length > 1 ? ' ' + (i + 1) : ''), { text: x, link: 'tel:' + digits(x) }]),
    c.whatsapp ? ['WhatsApp', { text: c.whatsapp, link: 'https://wa.me/' + digits(c.whatsapp).replace('+', '') }] : null,
    c.telegram ? ['Telegram', { text: c.telegram, link: tg }] : null,
    c.instagram ? ['Instagram', { text: c.instagram, link: 'https://instagram.com/' + igUser(c.instagram) }] : null,
    c.email ? ['Email', { text: c.email, link: 'mailto:' + c.email }] : null,
    c.company ? [t('Место работы'), c.company] : null,
    c.position ? [t('Должность'), c.position] : null,
    ...(c.addresses || []).map((p, i) => [p.name || t('Адрес {n}', { n: i + 1 }), [p.address || placeTitle(p), placeGeo(p) ? ' (' + placeGeo(p).lat.toFixed(6) + ', ' + placeGeo(p).lng.toFixed(6) + ')' : ''].join('')]),
    c.birthday ? [t('Дата рождения'), bdayLabel(c).replace(/ · 🎂.*$/, '')] : null,
    c.marital ? [t('Семейное положение'), t(MARITAL[c.marital] || c.marital)] : null,
    c.children ? [t('Дети'), c.children] : null,
    c.carModel || c.carPlate ? [t('Автомобиль'), [c.carModel, c.carPlate].filter(Boolean).join(' · ')] : null,
    c.source ? [t('Откуда клиент'), c.source] : null,
    c.desc ? [t('Примечание'), c.desc] : null
  ].filter(Boolean);
}
function pdfContactCard(c, big) {
  const rows = contactRows(c).map(([a, b]) => [{ text: a, color: '#666', fontSize: 9 }, typeof b === 'string' ? { text: b } : Object.assign({ color: b.link ? '#1d4ed8' : undefined }, b)]);
  const info = { stack: [{ text: c.title, bold: true, fontSize: big ? 16 : 11.5, margin: [0, 0, 0, 3] }, rows.length ? { table: { widths: [95, '*'], body: rows }, layout: 'noBorders' } : { text: '—', color: '#999' }] };
  const pic = c.avatar ? { image: c.avatar, fit: big ? [150, 150] : [58, 58], width: big ? 150 : 58 } : null;
  return { columns: pic ? [pic, info] : [info], columnGap: 12, margin: [0, 4, 0, 10] };
}
/* photos that go into a PDF (big): place photos, pictures among the materials and the result */
function pdfPhotos(it) {
  const out = [], img = f => f && /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|gif|heic)$/i.test((f && f.name) || '');
  (it.locations || []).forEach(l => (l.photos || []).forEach(f => out.push({ f, cap: placeTitle(l) + (f.name ? ' — ' + f.name : '') })));
  (it.files || []).filter(img).forEach(f => out.push({ f, cap: f.name }));
  if (it.result) (it.result.files || []).filter(img).forEach(f => out.push({ f, cap: t('Результат') + ': ' + f.name }));
  return out;
}
function pdfDoc(content, title) {
  return {
    pageSize: 'A4', pageMargins: [40, 40, 40, 44], defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.2 }, content, info: { title },
    styles: { brand: { fontSize: 12, bold: true, color: '#5b4dff' }, h1: { fontSize: 18, bold: true, margin: [0, 2, 0, 10] }, h2: { fontSize: 12.5, bold: true, margin: [0, 12, 0, 5], color: '#1f2937' } },
    footer: (cur, total) => ({ text: 'MARKUS-A · ' + cur + ' / ' + total, alignment: 'center', fontSize: 8, color: '#9ca3af', margin: [0, 14, 0, 0] })
  };
}

/* ---------- PDF of a contact: everything about the person in one file ---------- */
async function buildContactPdf(c, o) {
  await loadScript(PDFMAKE_URL); await loadScript(PDFFONTS_URL);
  const x = [];
  x.push({ columns: [{ text: 'MARKUS-A', style: 'brand' }, { text: t('Сформировано') + ': ' + D.num(new Date()) + ' ' + D.nowTime(), alignment: 'right', color: '#888', fontSize: 8 }] });
  x.push({ text: t('Контакт').toUpperCase(), color: '#5b4dff', fontSize: 9, bold: true, margin: [0, 8, 0, 4] });
  x.push(pdfContactCard(c, true));
  const ms = contactMeetings(c.id);
  if (o.meet && ms.length) {
    x.push({ text: t('Встречи') + ' (' + ms.length + ')', style: 'h2' });
    ms.forEach(m => {
      x.push({ text: m.title, bold: true, margin: [0, 6, 0, 1] });
      x.push({ text: (m.date ? cap(D.long(m.date)) : t('Без даты')) + (m.start ? ', ' + timeLabel(m) : '') + (m.place ? ' · ' + m.place : ''), color: '#555', fontSize: 9.5 });
      (m.locations || []).forEach(p => x.push(pdfPlace(p)));
      const sm = m.summary && m.summary.short;
      if (o.sum && sm && sm.length) x.push({ ul: sm.slice(0, 8), fontSize: 9.5, margin: [0, 2, 0, 4] });
    });
  }
  const docs = c.files || [];
  if (o.docs && docs.length) {
    x.push({ text: t('Документы'), style: 'h2' });
    x.push({ ul: docs.map(f => f.name + ' (' + mb(f.size) + ')') });
    for (const f of docs) {
      if (!/^image\//.test(f.type || '')) continue;
      try { const b = await getFileBlob(f); if (b) { x.push({ text: f.name, bold: true, pageBreak: 'before', margin: [0, 0, 0, 4] }); x.push({ image: await imgData(b), fit: [515, 700], alignment: 'center' }); } } catch (e) { }
    }
  }
  return new Promise((res, rej) => { try { pdfMake.createPdf(pdfDoc(x, c.title)).getBlob(res); } catch (e) { rej(e); } });
}
async function contactPdf(id) {
  const c = getItem(id); if (!c) return;
  const hasDocs = (c.files || []).length > 0, ms = contactMeetings(id);
  const sh = openSheet(`<div class="sh-h"><b>PDF: ${esc(c.title)}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="hint">${t('Что включить в документ:')}</div>
    <div class="sw-row"><div><b>${t('Фото, телефоны, Telegram, WhatsApp, почта, откуда клиент, заметки')}</b></div><button class="sw on" disabled></button></div>
    ${ms.length ? `<div class="sw-row"><div><b>${t('Встречи с ним ({n}): даты, адреса, координаты, ссылки на карты', { n: ms.length })}</b></div><button class="sw on" data-k="meet"></button></div>
    <div class="sw-row"><div><b>${t('Краткие итоги встреч')}</b></div><button class="sw on" data-k="sum"></button></div>` : ''}
    ${hasDocs ? `<div class="sw-row"><div><b>${t('Документы (паспорт и др.) — картинки крупно')}</b><span>${t('Не включайте, если отдаёте PDF другим людям')}</span></div><button class="sw" data-k="docs"></button></div>` : ''}
    <div class="btns" style="margin-top:14px"><button class="btn pri" id="cp_share">${ic('share', 18)} ${t('Поделиться')}</button><button class="btn ghost" id="cp_dl">${ic('download', 18)} ${isPhone() ? t('В телефон') : t('Скачать')}</button></div>
    <button class="btn ghost full" style="margin-top:8px" id="cp_open">${ic('pdf', 18)} ${t('Открыть / Печать')}</button>`, { cls: 'tall' });
  $$('.sw[data-k]', sh).forEach(b => b.onclick = () => b.classList.toggle('on'));
  const make = async () => { const o = {}; $$('.sw[data-k]', sh).forEach(b => { o[b.dataset.k] = b.classList.contains('on'); }); return { blob: await buildContactPdf(getItem(id), o), name: (c.title.replace(/[\\/:*?"<>|]/g, ' ').slice(0, 60) || 'contact') + '.pdf' }; };
  const run = (btn, fn) => withBusy(btn, async () => { const r = await make(); await fn(r); }, { busy: t('Готовлю PDF…'), ok: t('Готово') });
  $('#cp_share', sh).onclick = function () { run(this, r => { closeSheet(); shareMenu(blobSrc(r.blob, r.name, c.title)); }); };
  $('#cp_dl', sh).onclick = function () { run(this, r => downloadBlob(r.blob, r.name)); };
  $('#cp_open', sh).onclick = function () { run(this, r => window.open(URL.createObjectURL(r.blob), '_blank')); };
}

/* ---------- 🔊 read a contact aloud ---------- */
function contactSpeech(c) {
  const L = [c.title + '.'];
  const job = [c.position, c.company].filter(Boolean).join(', '); if (job) L.push(job + '.');
  if (c.birthday) L.push(t('Дата рождения') + ': ' + D.long(c.birthday).replace(/^[^,]+,\s*/, '') + '.');
  const ph = contactPhones(c); if (ph[0]) L.push(t('Телефон') + ': ' + String(ph[0]).replace(/(\d)/g, '$1 ').trim() + '.');
  if (c.telegram) L.push('Telegram: ' + tgUser(c.telegram) + '.');
  if (c.desc) L.push(c.desc);
  const m = contactMeetings(c.id)[0];
  if (m) {
    L.push(t('Последняя встреча') + ': ' + (m.date ? D.human(m.date) : '') + (m.start ? ' ' + t('в {t}', { t: m.start }) : '') + ', ' + m.title + '.');
    const s = m.summary && m.summary.short; if (s && s.length) L.push(t('Итоги') + ': ' + s.slice(0, 4).join('. '));
  }
  return L.join(' ');
}
function speakContact(id) { const c = getItem(id); if (c) TTS.say(contactSpeech(c)); }
function speakItem(id) {
  const m = getItem(id); if (!m) return;
  if (m.kind === 'meeting' && m.summary) return TTS.say(meetingSpeech(m));
  TTS.say([m.title + '.', m.date ? D.human(m.date) + (m.start ? ' ' + t('в {t}', { t: m.start }) : '') + '.' : '', m.place ? t('Место') + ': ' + m.place + '.' : '', (m.participants || []).length ? t('Участники') + ': ' + m.participants.join(', ') + '.' : '', m.goals || '', m.desc || ''].filter(Boolean).join(' '));
}

/* ---------- 🎙 «позвони ему», «напиши в Telegram, что…» ---------- */
async function contactCommand(id) {
  const c = getItem(id); if (!c) return;
  const v = await dialog({
    title: '🎙 ' + t('Что сделать?'),
    text: esc(t('Скажите или напишите, например: «позвони», «напиши в Telegram, что встреча переносится на 15:00», «отправь в WhatsApp адрес офиса», «письмо: пришлите реквизиты».')),
    html: `<div class="inp-mic"><textarea class="inp" id="cc_t" style="min-height:70px"></textarea><button class="mic-btn" type="button" onclick="dictateInto('cc_t',this,true)">${ic('mic', 18)}</button></div>`,
    buttons: [{ l: t('Выполнить'), v: sh => { const x = $('#cc_t', sh).value.trim(); if (!x) { toast(t('Скажите или напишите команду')); return false; } return x; }, p: 1 }, { l: t('Отмена'), v: null }],
    onMount: sh => setTimeout(() => { const b = $('.mic-btn', sh); if (b && typeof SR !== 'undefined' && SR) b.click(); else $('#cc_t', sh).focus(); }, 300)
  });
  stopDictation();
  if (!v) return;
  const low = v.toLowerCase();
  if (/^(позвони|набери|звони|позвонить|набрать|call|qo['ʻ’]?ng['ʻ’]?iroq)/i.test(low.trim())) {
    const ph = contactPhones(c)[0];
    if (!ph) return toast(t('У контакта нет телефона — добавьте его в карточке'), 4000);
    return window.open('tel:' + digits(ph), '_self');
  }
  const ch = /телеграм|telegram|телеге|тг\b|в тг/.test(low) ? 'tg' : /ватсап|вотсап|вацап|whatsapp|вотс/.test(low) ? 'wa' : /почт|e-?mail|имейл|емейл|письм/.test(low) ? 'mail' : (c.telegram ? 'tg' : contactPhones(c).length || c.whatsapp ? 'wa' : c.email ? 'mail' : '');
  if (!ch) return toast(t('У контакта нет ни Telegram, ни телефона, ни почты'), 4000);
  let text = v.replace(/^(напиши|отправь|написать|отправить|скажи|передай|сообщи)\s*(ему|ей|им)?\s*(в|на|по)?\s*(телеграм\w*|telegram|тг|ватсап\w*|вотсап\w*|whatsapp|почту|e-?mail|письмо)?\s*[,:]?\s*(что|чтобы)?\s*/i, '').trim() || v;
  let subject = '';
  if (AI.ready()) {
    try {
      toast(t('AI составляет сообщение…'), 6000);
      const me = S.set.name && !/@/.test(S.set.name) ? S.set.name : '';
      const r = await AI.call([{ text: `Составь короткое, грамотное и вежливое сообщение${me ? ' от имени ' + me : ''} для «${c.title}»${ch === 'mail' ? ' (электронное письмо)' : ' (' + (ch === 'tg' ? 'Telegram' : 'WhatsApp') + ')'}. Что нужно передать: ${text}
Правила: пиши на языке этой просьбы; обращение на «вы»; без выдуманных фактов, дат и сумм — только то, что сказано; без лишней воды. Верни ТОЛЬКО JSON: {"subject":"тема письма (только для email, иначе пусто)","text":"готовый текст"}` }], { json: true, temp: 0.3 });
      if (r && r.text) { text = r.text; subject = r.subject || ''; }
    } catch (e) { toast(e.message, 4000); }
  }
  const go2 = await dialog({
    title: ch === 'tg' ? 'Telegram → ' + c.title : ch === 'wa' ? 'WhatsApp → ' + c.title : 'Email → ' + c.title,
    html: `${ch === 'mail' ? `<input class="inp" id="cc_s" value="${esc(subject)}" placeholder="${esc(t('Тема'))}" style="margin-bottom:6px">` : ''}<textarea class="inp" id="cc_m" style="min-height:130px">${esc(text)}</textarea>
      <div class="hint">${t('Проверьте текст. Откроется чат — нажмите «Отправить» сами: так ни одно сообщение не уйдёт без вашего взгляда.')}</div>`,
    buttons: [{ l: t('Открыть и вставить'), v: sh => ({ m: $('#cc_m', sh).value.trim(), s: $('#cc_s', sh) ? $('#cc_s', sh).value.trim() : '' }), p: 1 }, { l: t('Отмена'), v: null }]
  });
  if (!go2 || !go2.m) return;
  try { await navigator.clipboard.writeText(go2.m); } catch (e) { }
  if (ch === 'wa') window.open('https://wa.me/' + digits(c.whatsapp || contactPhones(c)[0]).replace('+', '') + '?text=' + encodeURIComponent(go2.m), '_blank');
  else if (ch === 'mail') window.open('mailto:' + encodeURIComponent(c.email) + '?subject=' + encodeURIComponent(go2.s) + '&body=' + encodeURIComponent(go2.m), '_self');
  else {
    const u = tgLink(c.telegram);
    window.open(/\/\+/.test(u) ? u : u + '?text=' + encodeURIComponent(go2.m), '_blank');
    toast(t('Текст скопирован. Если он не вставился сам — нажмите в поле сообщения → «Вставить».'), 6000);
  }
}
/* Telegram: @username → t.me/username; a phone number → t.me/+998… (the «+» is required) */
function tgLink(v) {
  const s = String(v || '').trim();
  const d = digits(s).replace(/^\+/, '');
  if (!/[a-z_]/i.test(s.replace(/^https?:\/\/t\.me\//i, '')) && d.length >= 7) return 'https://t.me/+' + d;
  return 'https://t.me/' + tgUser(s);
}
