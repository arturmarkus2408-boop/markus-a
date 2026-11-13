'use strict';
/* ============================================================================
   v4.3: contacts from the phone's address book.
   · Android app (MARKUS-A.apk 1.N with READ_CONTACTS): the whole book, with your permission;
     «Синхронизировать сами» keeps it up to date once a day.
   · a browser on Android (Chrome): the system contact picker — choose who to bring in;
   · anywhere: a .vcf file (Контакты → Экспорт / «Поделиться всеми»).
   Matching: by phone number (last 9 digits), then by exact name. Existing cards are never
   overwritten — only empty fields are filled in.
   ========================================================================== */
const PB = { pending: false };
const phKey = p => { const d = String(p || '').replace(/\D/g, ''); return d.length >= 7 ? d.slice(-9) : ''; };
function pbCanNative() { return !!(NATIVE && typeof NATIVE.contacts === 'function'); }
function pbCanPicker() { return !!(navigator.contacts && navigator.contacts.select && window.ContactsManager); }

/* ---- .vcf (vCard 2.1 / 3.0 / 4.0) ---- */
function qpDecode(s) {
  const bytes = []; s = s.replace(/=\r?\n/g, '');
  for (let i = 0; i < s.length; i++) { if (s[i] === '=' && /^[0-9A-F]{2}$/i.test(s.substr(i + 1, 2))) { bytes.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; } else bytes.push(s.charCodeAt(i) & 255); }
  try { return new TextDecoder('utf-8').decode(new Uint8Array(bytes)); } catch (e) { return s; }
}
function parseVcf(text) {
  const lines = String(text).replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '')   // folded lines
    .replace(/=\n/g, '=\n').split('\n');
  const out = []; let cur = null, qpBuf = null;
  for (let raw of lines) {
    if (qpBuf != null) { qpBuf.v += '\n' + raw; if (/=$/.test(raw)) continue; raw = qpBuf.k + ':' + qpBuf.v; qpBuf = null; }
    const m = /^([^:]+):(.*)$/.exec(raw); if (!m) continue;
    const key = m[1], up = key.toUpperCase(); let val = m[2];
    if (/QUOTED-PRINTABLE/.test(up) && /=$/.test(val)) { qpBuf = { k: key, v: val }; continue; }
    if (/QUOTED-PRINTABLE/.test(up)) val = qpDecode(val);
    val = val.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/gi, ' ').trim();
    const name = up.split(';')[0].replace(/^ITEM\d+\./, '');
    if (name === 'BEGIN') cur = { name: '', phones: [], emails: [] };
    else if (!cur) continue;
    else if (name === 'END') { if (cur.name || cur.phones.length) out.push(cur); cur = null; }
    else if (name === 'FN') cur.name = val;
    else if (name === 'N' && !cur.name) cur.name = val.split(';').filter(Boolean).reverse().join(' ').trim();
    else if (name === 'TEL' && val) cur.phones.push(val);
    else if (name === 'EMAIL' && val) cur.emails.push(val);
    else if (name === 'ORG') cur.org = val.split(';')[0];
    else if (name === 'TITLE') cur.title = val;
    else if (name === 'BDAY') cur.bday = val;
  }
  return out;
}
function normBday(b) {
  b = String(b || '').trim(); let m;
  if ((m = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(b))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /^--(\d{2})-?(\d{2})/.exec(b))) return `1900-${m[1]}-${m[2]}`;   // no year
  return '';
}

/* ---- merge into MARKUS-A contacts ---- */
function pbPlan(list) {
  const cs = live().filter(c => c.kind === 'contact');
  const byPhone = new Map(), byName = new Map();
  cs.forEach(c => { contactPhones(c).forEach(p => { const k = phKey(p); if (k) byPhone.set(k, c); }); const n = normName(c.title); if (n) byName.set(n, c); });
  // v4.3.1: a contact you deleted (or a copy merged away) is not brought back from the phone book
  const gonePh = new Set(), goneName = new Set();
  S.items.forEach(c => { if (!c.deleted || c.kind !== 'contact') return; contactPhones(c).forEach(p => { const k = phKey(p); if (k) gonePh.add(k); }); const n = normName(c.title); if (n) goneName.add(n); });
  const add = [], upd = new Map(); let same = 0, gone = 0;
  const seen = new Set();
  for (const r of list) {
    const name = String(r.name || '').trim(); const phones = Array.from(new Set((r.phones || []).map(p => String(p).trim()).filter(Boolean)));
    if (!name && !phones.length) continue;
    const keys = phones.map(phKey).filter(Boolean), nn = normName(name);
    const dupKey = keys[0] || 'n:' + nn; if (seen.has(dupKey) || keys.some(k => seen.has(k))) continue; keys.forEach(k => seen.add(k)); seen.add(dupKey);
    const exPh = keys.map(k => byPhone.get(k)).find(Boolean);
    if (!exPh && (keys.length ? keys.some(k => gonePh.has(k)) : nn && goneName.has(nn))) { gone++; continue; }
    const ex = exPh || (nn && byName.get(nn));
    if (!ex) { add.push({ r, name: name || phones[0], phones }); continue; }
    const patch = {};
    const have = new Set(contactPhones(ex).map(phKey));
    const extra = phones.filter(p => !have.has(phKey(p)) && !gonePh.has(phKey(p)));
    ['phone', 'phone2', 'phone3'].forEach(f => { if (!ex[f] && extra.length) patch[f] = extra.shift(); });
    if (!ex.email && (r.emails || [])[0]) patch.email = r.emails[0];
    if (!ex.company && r.org) patch.company = r.org;
    if (!ex.position && r.title) patch.position = r.title;
    const bd = normBday(r.bday); if (!ex.birthday && bd && !bd.startsWith('1900')) patch.birthday = bd;
    if (Object.keys(patch).length) upd.set(ex.id, Object.assign(upd.get(ex.id) || {}, patch)); else same++;
  }
  return { add, upd, same, gone };
}
async function pbApply(plan) {
  for (const a of plan.add) {
    const r = a.r, bd = normBday(r.bday);
    await saveItem(newItem('contact', { title: a.name, phone: a.phones[0] || '', phone2: a.phones[1] || '', phone3: a.phones[2] || '', email: (r.emails || [])[0] || '', company: r.org || '', position: r.title || '', birthday: bd && !bd.startsWith('1900') ? bd : '', fromPhone: true }), { render: false });
  }
  for (const [id, patch] of plan.upd) { const c = getItem(id); if (c) { Object.assign(c, patch); await saveItem(c, { render: false }); } }
  try { localStorage.setItem('markus_pb_at', String(Date.now())); } catch (e) { }
}
/* v4.3.1: first take what the other phone has already put in the cloud — otherwise both phones
   add the same people, each its own copy (that is how the duplicates appeared) */
async function pbCloudFirst() {
  if (!window.Cloud || !Cloud.user || !navigator.onLine) return;
  for (let i = 0; i < 40 && Cloud.busy; i++) await new Promise(r => setTimeout(r, 250));
  try { await Cloud.sync(); } catch (e) { }
}
async function pbRun(list, o = {}) {
  await pbCloudFirst();
  const plan = pbPlan(list);
  if (!plan.add.length && !plan.upd.size) { if (!o.silent) toast(t('Всё уже совпадает: в телефоне {n} контактов, новых нет', { n: list.length }), 4000); try { localStorage.setItem('markus_pb_at', String(Date.now())); } catch (e) { } return; }
  if (!o.silent) {
    const v = await dialog({ title: t('Контакты из телефона'), text: esc(t('В телефоне: {n}. Новых: {a}. Дополнить существующих: {u}. Уже есть и совпадают: {s}.', { n: list.length, a: plan.add.length, u: plan.upd.size, s: plan.same })) + (plan.gone ? ' ' + esc(t('Пропущено удалённых вами: {n}.', { n: plan.gone })) : '') + '<br><span class="muted">' + esc(t('Ваши карточки не перезаписываются — заполняются только пустые поля.')) + '</span>', buttons: [{ l: t('Добавить'), v: 1, p: 1 }, { l: t('Отмена'), v: 0 }] });
    if (!v) return;
  }
  await pbApply(plan);
  if (!o.silent) toast(t('Готово: добавлено {a}, дополнено {u}', { a: plan.add.length, u: plan.upd.size }), 4000);
  if (S.route === 'contacts') render();
}
/* the main button */
async function phoneSync(o = {}) {
  if (pbCanNative()) {
    let p = 'ok'; try { p = NATIVE.contactsPerm(); } catch (e) { }
    if (p !== 'ok') { if (o.silent) return; PB.pending = true; toast(t('Разрешите MARKUS-A доступ к контактам'), 4000); return; }
    let list = []; try { list = JSON.parse(NATIVE.contacts() || '[]'); } catch (e) { }
    return pbRun(list, o);
  }
  if (o.silent) return;
  if (NATIVE) {   // the app is older than 4.3 — the address book needs the new APK
    const v = await dialog({ title: t('Нужна новая версия приложения'), text: esc(t('Чтобы читать телефонную книгу, установите новую версию MARKUS-A.apk (Releases на GitHub). А пока можно загрузить файл .vcf: Контакты телефона → Экспорт.')), buttons: [{ l: t('Загрузить .vcf'), v: 'vcf', p: 1 }, { l: t('Позже'), v: null }] });
    if (v === 'vcf') pbPickVcf();
    return;
  }
  if (pbCanPicker()) {
    try {
      const r = await navigator.contacts.select(['name', 'tel', 'email'], { multiple: true });
      return pbRun((r || []).map(x => ({ name: (x.name || [])[0] || '', phones: x.tel || [], emails: x.email || [] })));
    } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  pbPickVcf();
}
function pbPickVcf() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.vcf,text/vcard,text/x-vcard';
  inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const list = parseVcf(await f.text()); if (!list.length) return toast(t('В файле нет контактов')); pbRun(list); };
  inp.click();
}
function pbAutoOn() { return !!S.set.pbAuto; }
async function pbToggleAuto() { S.set.pbAuto = !S.set.pbAuto; saveSettings(); render(); if (S.set.pbAuto) phoneSync(); }
/* once a day, quietly, when the app opens (only in the Android app and only when switched on) */
function pbDaily() {
  if (!pbAutoOn() || !pbCanNative()) return;
  let at = 0; try { at = +localStorage.getItem('markus_pb_at') || 0; } catch (e) { }
  if (Date.now() - at > 20 * 3600000) phoneSync({ silent: true });
}
function pbLastLabel() { let at = 0; try { at = +localStorage.getItem('markus_pb_at') || 0; } catch (e) { } if (!at) return t('ещё не синхронизировались'); const d = new Date(at); return t('последний раз: {d}', { d: D.human(D.fmt(d)) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) }); }
function phonebookCardHTML() {
  const how = pbCanNative() ? t('Вся телефонная книга — с вашего разрешения.') : NATIVE ? t('Нужна новая версия приложения — или загрузите файл .vcf.') : pbCanPicker() ? t('Выберите людей в телефонной книге.') : t('Загрузите файл .vcf из контактов телефона.');
  return `<div class="pbcard"><div class="pb-ic">${ic('phone', 20)}</div><div class="pb-b"><b>${t('Контакты из телефона')}</b><span>${esc(how)} ${esc(cap(pbLastLabel()))}.</span>
    ${pbCanNative() ? `<label class="pb-auto"><button class="sw ${pbAutoOn() ? 'on' : ''}" onclick="pbToggleAuto()" aria-label="${esc(t('Синхронизировать сами'))}"></button>${t('Обновлять сами раз в день')}</label>` : ''}</div>
    <div class="pb-btns"><button class="btn pri" onclick="phoneSync()">${ic('repeat', 16)} ${t('Синхронизировать')}</button><button class="link" onclick="pbPickVcf()">${t('Файл .vcf')}</button></div></div>`;
}
if (NATIVE) window.__native.on('perm', () => { if (!PB.pending) return; PB.pending = false; let p = ''; try { p = NATIVE.contactsPerm(); } catch (e) { } if (p === 'ok') phoneSync(); });
