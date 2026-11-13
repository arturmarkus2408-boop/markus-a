'use strict';
/* ============================================================================
   v4.3.1: contacts — delete one, delete several, and tidy up duplicates.
   Duplicates appear when two phones bring in the same address book
   (each phone adds its copy before it sees the other one's in the cloud).
   · «Анализировать» — finds groups: the same number (last 9 digits) or the same name
     (word order, case, ё/е and punctuation do not matter);
   · «Объединить» — one card stays, empty fields are filled from the copies
     (phones, messengers, work, birthday, notes, files, addresses), meetings and tasks
     move to the card that stays, the copies are deleted;
   · «Удалить дубли» — one card stays as it is, the copies are deleted
     (meetings and tasks still move to the card that stays).
   ========================================================================== */
const normName = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}\s]+/gu, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
const CD = { groups: [], on: new Set(), keep: new Map() };

/* how complete a card is — the fullest one stays by default */
function contactScore(c) {
  const F = ['email', 'telegram', 'whatsapp', 'instagram', 'company', 'position', 'birthday', 'marital', 'children', 'carModel', 'carPlate', 'desc'];
  const refs = S.items.filter(i => !i.deleted && i.kind !== 'contact' && !i.birthdayOf && (i.contactIds || []).includes(c.id)).length;
  return contactPhones(c).length * 2 + F.filter(f => String(c[f] || '').trim()).length + (c.avatar ? 2 : 0) + (c.files || []).length * 2 + (c.addresses || []).length * 2 + refs * 3 + (/\p{L}/u.test(c.title || '') ? 1 : 0);
}

/* groups of duplicates (union–find over «same number» and «same name») */
function contactDupes() {
  const cs = live().filter(c => c.kind === 'contact');
  const par = new Map(cs.map(c => [c.id, c.id]));
  const find = x => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) par.set(b, a); };
  const byPhone = new Map(), byName = new Map(), viaPhone = new Set();
  for (const c of cs) {
    for (const p of contactPhones(c)) {
      const k = phKey(p); if (!k) continue;
      if (byPhone.has(k)) { join(byPhone.get(k), c.id); viaPhone.add(c.id); viaPhone.add(byPhone.get(k)); } else byPhone.set(k, c.id);
    }
    const n = normName(c.title);
    if (n.length >= 2 && /\p{L}/u.test(n)) { if (byName.has(n)) join(byName.get(n), c.id); else byName.set(n, c.id); }
  }
  const G = new Map();
  cs.forEach(c => { const r = find(c.id); if (!G.has(r)) G.set(r, []); G.get(r).push(c); });
  const out = [];
  for (const list of G.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => contactScore(b) - contactScore(a) || String(a.created || '').localeCompare(String(b.created || '')));
    const byNum = list.some(c => viaPhone.has(c.id));
    // the same name but every card has its own, different number — maybe two different people
    const keys = list.map(c => new Set(contactPhones(c).map(phKey).filter(Boolean)));
    const risky = !byNum && keys.filter(s => s.size).length >= 2;
    const shared = byNum ? (() => { const cnt = new Map(); keys.forEach(s => s.forEach(k => cnt.set(k, (cnt.get(k) || 0) + 1))); const k = [...cnt].find(([, n]) => n > 1); if (!k) return ''; for (const c of list) { const p = contactPhones(c).find(x => phKey(x) === k[0]); if (p) return p; } return ''; })() : '';
    out.push({ id: list[0].id, list, byNum, risky, shared });
  }
  return out.sort((a, b) => (a.risky - b.risky) || a.list[0].title.localeCompare(b.list[0].title));
}
function dupesCount() { try { return contactDupes().reduce((s, g) => s + g.list.length - 1, 0); } catch (e) { return 0; } }

/* ---- the «Дубли» sheet ---- */
function dupesAnalyze() {
  CD.groups = contactDupes();
  CD.on = new Set(CD.groups.filter(g => !g.risky).map(g => g.id));
  CD.keep = new Map(CD.groups.map(g => [g.id, g.list[0].id]));
  if (!CD.groups.length) { toast(t('Повторов не найдено ✓ Все контакты разные'), 3500); return; }
  openSheet(`<div class="sh-h"><b>${t('Повторяющиеся контакты')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div><div id="cdbox"></div>`, { cls: 'tall' });
  dupesDraw();
}
function dupesExtra() { return CD.groups.filter(g => CD.on.has(g.id)).reduce((s, g) => s + g.list.length - 1, 0); }
function dupesDraw() {
  const box = $('#cdbox'); if (!box) return;
  const total = CD.groups.reduce((s, g) => s + g.list.length - 1, 0), n = dupesExtra(), all = CD.groups.every(g => CD.on.has(g.id));
  const row = (g, c) => {
    const keep = CD.keep.get(g.id) === c.id, ph = contactPhones(c);
    const refs = S.items.filter(i => !i.deleted && i.kind !== 'contact' && !i.birthdayOf && (i.contactIds || []).includes(c.id)).length;
    const meta = [ph.join(', '), c.company, c.fromPhone ? t('из телефона') : '', refs ? t('встреч и задач: {n}', { n: refs }) : ''].filter(Boolean).join(' · ');
    return `<div class="cd-row ${keep ? 'keep' : ''}" onclick="dupesKeep('${g.id}','${c.id}')"><span class="cd-radio"></span>${avatarHtml(c, 34)}<div class="nmain"><b>${esc(c.title)}</b><span>${esc(meta || t('без номера'))}</span></div><em class="cd-tag">${keep ? t('останется') : t('дубль')}</em></div>`;
  };
  box.innerHTML = `<div class="cd-sum"><b>${t('Групп: {g} · лишних карточек: {n}', { g: CD.groups.length, n: total })}</b><span>${t('В каждой группе отмечена карточка, которая останется (самая полная). Нажмите на другую, чтобы оставить её.')}</span></div>
    <div class="selbar"><button class="chip ${all ? 'on' : ''}" onclick="dupesAll()">${ic('check', 13)} ${t('Выбрать все')} (${CD.groups.length})</button><span class="muted" style="font-size:12.5px">${t('Выбрано групп: {n}', { n: CD.on.size })}</span></div>
    ${CD.groups.map(g => `<div class="cd-grp ${CD.on.has(g.id) ? 'on' : ''}">
      <div class="cd-gh" onclick="dupesToggle('${g.id}')"><span class="fsel">${CD.on.has(g.id) ? ic('checkmark', 14) : ''}</span><b>${g.byNum ? t('Один номер') + (g.shared ? ': ' + esc(g.shared) : '') : t('Одно имя')}</b><span class="muted">${g.list.length} ${tn(g.list.length, 'карточка|карточки|карточек')}</span></div>
      ${g.risky ? `<div class="cd-warn">⚠ ${t('Номера разные — возможно, это разные люди. Проверьте, прежде чем объединять.')}</div>` : ''}
      ${g.list.map(c => row(g, c)).join('')}</div>`).join('')}
    <div class="hint" style="margin:6px 2px 4px">${t('«Объединить» — данные из копий (номера, мессенджеры, работа, день рождения, заметки, файлы) переносятся в оставшуюся карточку. «Удалить дубли» — копии просто удаляются. В обоих случаях встречи и задачи переходят к оставшейся карточке.')}</div>
    <div class="sh-foot"><button class="btn danger" ${n ? '' : 'disabled'} onclick="dupesRun(false)">${ic('trash', 18)} ${t('Удалить дубли')}</button><button class="btn pri" style="flex:1" ${n ? '' : 'disabled'} onclick="dupesRun(true)">${ic('users', 18)} ${t('Объединить ({n})', { n })}</button></div>`;
}
function dupesToggle(gid) { if (CD.on.has(gid)) CD.on.delete(gid); else CD.on.add(gid); dupesDraw(); }
function dupesAll() { const all = CD.groups.every(g => CD.on.has(g.id)); CD.on = new Set(all ? [] : CD.groups.map(g => g.id)); dupesDraw(); }
function dupesKeep(gid, cid) { CD.keep.set(gid, cid); CD.on.add(gid); dupesDraw(); }

async function dupesRun(merge) {
  const gs = CD.groups.filter(g => CD.on.has(g.id)); if (!gs.length) return toast(t('Ничего не выбрано'));
  const extra = gs.reduce((s, g) => s + g.list.length - 1, 0);
  const v = await dialog({
    title: merge ? t('Объединить повторы: {n}?', { n: extra }) : t('Удалить дубли: {n}?', { n: extra }),
    text: esc(merge ? t('Карточек станет {g} вместо {a}. Данные из копий перейдут в оставшиеся карточки. Отменить будет нельзя.', { g: gs.length, a: gs.length + extra })
      : t('Лишние карточки удалятся ({n}), оставшиеся не изменятся. Отменить будет нельзя.', { n: extra })),
    buttons: [{ l: merge ? t('Объединить') : t('Удалить'), v: true, d: merge ? 0 : 1, p: merge ? 1 : 0 }, { l: t('Отмена'), v: false }]
  });
  if (v !== true) return;
  let done = 0;
  for (const g of gs) {
    const keep = getItem(CD.keep.get(g.id)) || g.list[0];
    const others = g.list.map(c => getItem(c.id)).filter(c => c && c.id !== keep.id && !c.deleted);
    await mergeContacts(keep, others, { fill: merge }); done += others.length;
  }
  closeAllSheets();
  toast(merge ? t('Объединено ✓ Убрано лишних карточек: {n}', { n: done }) : t('Удалено дублей: {n}', { n: done }), 4000);
  render();
}

/* the core: copies → the card that stays */
async function mergeContacts(keep, others, o = {}) {
  if (!keep || !others.length) return;
  if (o.fill) {
    // phones: every different number, up to 3 in the fields, the rest into the note
    const seen = new Set(), phones = [];
    [keep, ...others].forEach(c => contactPhones(c).forEach(p => { const k = phKey(p) || p; if (!seen.has(k)) { seen.add(k); phones.push(p); } }));
    keep.phone = phones[0] || ''; keep.phone2 = phones[1] || ''; keep.phone3 = phones[2] || '';
    const notes = [];
    if (phones.length > 3) notes.push(t('Другие телефоны') + ': ' + phones.slice(3).join(', '));
    ['email', 'telegram', 'whatsapp', 'instagram', 'company', 'position', 'birthday', 'marital', 'children', 'carModel', 'carPlate', 'avatar'].forEach(f => {
      if (String(keep[f] || '').trim()) return;
      const src = others.find(c => String(c[f] || '').trim()); if (src) keep[f] = src[f];
    });
    // a card named only by a number gets the real name
    if (!/\p{L}/u.test(keep.title || '')) { const nm = others.find(c => /\p{L}/u.test(c.title || '')); if (nm) keep.title = nm.title; }
    others.forEach(c => { const d = String(c.desc || '').trim(); if (d && !String(keep.desc || '').includes(d)) notes.push(d); });
    if (notes.length) keep.desc = [String(keep.desc || '').trim(), ...notes].filter(Boolean).join('\n');
    const fids = new Set((keep.files || []).map(f => f.id));
    keep.files = (keep.files || []).concat(...others.map(c => (c.files || []).filter(f => f && !fids.has(f.id) && fids.add(f.id))));
    const adr = (keep.addresses || []).slice(), aset = new Set(adr.map(p => (p.address || placeTitle(p) || '').toLowerCase()));
    others.forEach(c => (c.addresses || []).forEach(p => { const k = (p.address || placeTitle(p) || '').toLowerCase(); if (!aset.has(k) && adr.length < 2) { aset.add(k); adr.push(p); } }));
    keep.addresses = adr;
    keep.fromPhone = keep.fromPhone || others.some(c => c.fromPhone);
  }
  // meetings and tasks: the copies' places go to the card that stays
  const ids = new Set(others.map(c => c.id)), names = new Set(others.map(c => c.title).filter(n => n && n !== keep.title));
  for (const it of S.items) {
    if (it.deleted || it.kind === 'contact' || it.birthdayOf) continue;
    const cids = it.contactIds || [];
    if (!cids.some(x => ids.has(x))) continue;
    it.contactIds = Array.from(new Set(cids.map(x => ids.has(x) ? keep.id : x)));
    if (Array.isArray(it.participants)) it.participants = Array.from(new Set(it.participants.map(n => names.has(n) ? keep.title : n)));
    await saveItem(it, { render: false });
  }
  const metas = o.fill ? [] : others.flatMap(c => itemFileMetas(c));
  for (const c of others) {
    c.deleted = true; c.mergedInto = keep.id;
    await saveItem(c, { render: false });
    await syncBirthday(c);        // its yearly birthday reminder goes away
  }
  await saveItem(keep, { render: false });
  await syncBirthday(keep);
  if (metas.length) purgeFiles(metas);
}

/* ---- delete one contact (from its card) ---- */
async function deleteContact(id) {
  const c = getItem(id); if (!c) return;
  const refs = S.items.filter(i => !i.deleted && i.kind !== 'contact' && !i.birthdayOf && (i.contactIds || []).includes(id)).length;
  const v = await dialog({ title: t('Удалить контакт?'), text: '<b class="dlg-item">«' + esc(c.title) + '»</b><br>' + esc((refs ? t('Встречи и задачи останутся, просто без этого участника.') + ' ' : '') + t('Из телефонной книги он сам больше не добавится. Отменить будет нельзя.')), buttons: [{ l: t('Удалить'), v: true, d: 1 }, { l: t('Отмена'), v: false }] });
  if (v !== true) return;
  await contactsDelete([id]);
  closeAllSheets(); toast(t('Удалено')); render();
}
async function contactsDelete(ids) {
  const metas = [];
  for (const id of ids) {
    const c = getItem(id); if (!c || c.deleted) continue;
    metas.push(...itemFileMetas(c));
    c.deleted = true; await saveItem(c, { render: false }); await syncBirthday(c);
  }
  if (metas.length) purgeFiles(metas);
}

/* ---- choose several on the list and delete them ---- */
function contactsShown() {
  const q = (S.contactQ || '').toLowerCase();
  const hay = c => [c.title, c.company, c.position, c.phone, c.phone2, c.phone3, c.telegram, c.instagram, c.email, c.carPlate, c.carModel, c.desc, ...(c.addresses || []).map(p => p.address || '')].join(' ').toLowerCase();
  return live().filter(c => c.kind === 'contact' && (!q || hay(c).includes(q) || digits(hay(c)).includes(digits(q)) && digits(q).length > 3)).sort((a, b) => a.title.localeCompare(b.title));
}
function conSelToggle(id) { const s = S.conSel; if (!s) return; if (s.has(id)) s.delete(id); else s.add(id); contactsRedraw(); }
function conSelAll() { const xs = contactsShown().map(c => c.id); const all = xs.length && xs.every(k => S.conSel.has(k)); S.conSel = new Set(all ? [] : xs); contactsRedraw(); }
function contactsRedraw() { const l = $('#cl'); if (l) l.innerHTML = contactsListHTML(); const d = $('#dock'); if (d && S.route === 'contacts') d.innerHTML = SCREENS.contacts().dock || ''; }
async function conDeleteSelected() {
  const ids = Array.from(S.conSel || []); if (!ids.length) return toast(t('Ничего не выбрано'));
  const v = await dialog({ title: t('Удалить контакты: {n}?', { n: ids.length }), text: esc(t('Встречи и задачи останутся. Из телефонной книги эти контакты сами больше не добавятся. Отменить будет нельзя.')), buttons: [{ l: t('Удалить'), v: true, d: 1 }, { l: t('Отмена'), v: false }] });
  if (v !== true) return;
  await contactsDelete(ids);
  S.conSel = null; toast(t('Удалено контактов: {n}', { n: ids.length })); render();
}
