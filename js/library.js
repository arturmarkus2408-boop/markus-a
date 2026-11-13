'use strict';
/* ============================================================================
   v4.3: «Моя библиотека» — what you want to keep: meeting archives, documents, links,
   audio and video. Every entry is a separate card (kind 'lib', field sec), synced with the
   cloud like everything else.
   A meeting archive = a full PDF (when, where, with whom, summary, decisions, tasks,
   transcript…) + the recording itself (the same file, not a copy — it stays even when the
   meeting is deleted).
   Video files take a lot of space, so a link is offered first.
   ========================================================================== */
const LIB_SECS = [['meeting', 'Итоги встреч', 'users', '#7c5cff'], ['doc', 'Документы', 'file', '#3b82f6'], ['link', 'Ссылки', 'link', '#0ea5a4'], ['audio', 'Аудио', 'rec', '#f59e0b'], ['video', 'Видео', 'play', '#ef4444']];
/* the business themes get quieter section colours */
const LIB_EXEC = { meeting: '#2f5d8c', doc: '#4f6b8c', link: '#2f7a76', audio: '#b08d57', video: '#b5523b' };
const libSec = k => { const s = LIB_SECS.find(x => x[0] === k) || LIB_SECS[1]; return /^exec/.test(document.documentElement.getAttribute('data-pal') || '') ? [s[0], s[1], s[2], LIB_EXEC[s[0]]] : s; };
const libItems = sec => live().filter(i => i.kind === 'lib' && (!sec || i.sec === sec)).sort((a, b) => (b.created || '').localeCompare(a.created || ''));
const libHost = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
const VIDEO_MAX = 50 * 1048576;

function libCardHTML(i) {
  const [k, , icon, col] = libSec(i.sec);
  const f = (i.files || [])[0];
  let meta = '';
  if (k === 'meeting') meta = [i.snap && i.snap.date ? D.human(i.snap.date) + (i.snap.start ? ' ' + i.snap.start : '') : '', i.snap && i.snap.place, i.recording ? '🎙 ' + fmtDur(i.recording.duration || 0) : ''].filter(Boolean).join(' · ');
  else if (k === 'link' || (k === 'video' && i.url)) meta = libHost(i.url) || i.url || '';
  else if (f) meta = mb(f.size) + ' · ' + D.human((i.created || '').slice(0, 10) || D.today());
  const who = k === 'meeting' && i.snap && (i.snap.participants || []).length ? `<span class="lib-who">${esc(i.snap.participants.slice(0, 3).join(', '))}${i.snap.participants.length > 3 ? ' +' + (i.snap.participants.length - 3) : ''}</span>` : '';
  return `<button class="lib-card" onclick="libOpen('${i.id}')"><span class="lib-ic" style="--c:${col}">${ic(icon, 18)}</span><span class="lib-b"><b>${esc(i.title || t('Без названия'))}</b><span>${esc(meta)}</span>${who}${i.desc ? `<span class="lib-d">${esc(i.desc.slice(0, 120))}</span>` : ''}</span>${i.fav ? `<span style="color:var(--ylw)">${ic('starf', 15)}</span>` : ''}</button>`;
}
SCREENS.library = () => {
  const cur = S.libSec || 'meeting', q = (S.libQ || '').toLowerCase();
  const counts = Object.fromEntries(LIB_SECS.map(([k]) => [k, libItems(k).length]));
  let b = `<div class="lib-tabs">${LIB_SECS.map(x => libSec(x[0])).map(([k, l, icon, col]) => `<button class="lib-tab ${cur === k ? 'on' : ''}" style="--c:${col}" onclick="S.libSec='${k}';render()"><span class="lt-ic">${ic(icon, 18)}</span><span class="lt-l">${t(l)}</span><small>${counts[k] || 0}</small></button>`).join('')}</div>`;
  b += `<div class="search">${ic('search', 18)}<input placeholder="${esc(t('Поиск в библиотеке…'))}" value="${esc(S.libQ || '')}" oninput="S.libQ=this.value;$('#libl').innerHTML=libListHTML()"></div>`;
  b += `<div id="libl">${libListHTML()}</div>`;
  return { top: titleTop(t('Моя библиотека')), body: b, dock: `<div class="fab-wrap"><button class="fab" onclick="libAdd()" aria-label="${esc(t('Добавить'))}">${ic('plus', 26)}</button></div>` };
};
function libListHTML() {
  const cur = S.libSec || 'meeting', q = (S.libQ || '').toLowerCase();
  const xs = libItems(cur).filter(i => !q || [i.title, i.desc, i.url, i.snap && (i.snap.participants || []).join(' '), i.snap && i.snap.place].join(' ').toLowerCase().includes(q));
  if (xs.length) return `<div class="lib-list">${xs.map(libCardHTML).join('')}</div>`;
  if (q) return emptyBox('🔎', t('Ничего не найдено'));
  const E = { meeting: ['📚', t('Здесь хранятся архивы важных встреч: PDF со всеми деталями и аудиозапись. Откройте встречу с итогами и нажмите «В мою библиотеку».')], doc: ['📄', t('Договоры, справки, сканы — нажмите +, чтобы загрузить.')], link: ['🔗', t('Сохраняйте полезные ссылки: статьи, нормы, папки на диске.')], audio: ['🎧', t('Аудиофайлы и голосовые — нажмите +.')], video: ['🎬', t('Видео лучше хранить ссылкой (YouTube, Google Диск) — так не тратится место. Небольшой файл можно загрузить.')] };
  const [e, txt] = E[cur];
  return emptyBox(e, txt) + (cur === 'meeting' ? `<button class="btn ghost full" onclick="libPickMeeting()">${ic('users', 16)} ${t('Выбрать встречу')}</button>` : '');
}

/* ---------- adding ---------- */
async function libAdd() {
  const cur = S.libSec || 'meeting';
  if (cur === 'meeting') return libPickMeeting();
  if (cur === 'link') return libEditLink(null, 'link');
  if (cur === 'video') {
    const v = await dialog({ title: t('Добавить видео'), text: esc(t('Видео занимает много места. Лучше сохранить ссылку (YouTube, Google Диск, Telegram). Файл — до 50 МБ.')), buttons: [{ l: t('Ссылка на видео'), v: 'link', p: 1 }, { l: t('Файл с телефона'), v: 'file' }, { l: t('Отмена'), v: null }] });
    if (v === 'link') return libEditLink(null, 'video');
    if (v === 'file') return libPickFiles('video', 'video/*');
    return;
  }
  libPickFiles(cur, cur === 'audio' ? 'audio/*' : '');
}
function libPickFiles(sec, accept) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; if (accept) inp.accept = accept;
  inp.onchange = async () => {
    let n = 0;
    for (const file of inp.files) {
      if (sec === 'video' && file.size > VIDEO_MAX) { toast(t('«{f}» больше 50 МБ — сохраните ссылкой', { f: file.name }), 5000); continue; }
      const f = await storeFile(file);
      await saveItem(newItem('lib', { sec, title: file.name.replace(/\.[^.]+$/, ''), files: [f] }), { render: false }); n++;
    }
    if (n) { toast(t('В библиотеке: +{n}', { n })); render(); }
  };
  inp.click();
}
function libEditLink(id, sec) {
  const ex = id ? getItem(id) : null;
  const sh = openSheet(`
    <div class="sh-h"><b>${ex ? t('Ссылка') : sec === 'video' ? t('Ссылка на видео') : t('Новая ссылка')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <label class="lbl">${t('Адрес')}</label><input class="inp" id="lk_url" type="url" inputmode="url" placeholder="https://…" value="${esc(ex ? ex.url : '')}">
    <label class="lbl">${t('Название')}</label><input class="inp" id="lk_t" placeholder="${esc(t('Если пусто — возьму из адреса'))}" value="${esc(ex ? ex.title : '')}">
    <label class="lbl">${t('Заметка')}</label><textarea class="inp" id="lk_d" rows="2">${esc(ex ? ex.desc : '')}</textarea>
    <div class="sh-foot"><button class="btn pri" style="flex:1" id="lk_s">${t('Сохранить')}</button></div>`);
  setTimeout(() => { const u = $('#lk_url', sh); if (u && !ex) { u.focus(); if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(x => { if (/^https?:\/\//.test(x || '') && !u.value) u.value = x.trim(); }).catch(() => { }); } }, 200);
  $('#lk_s', sh).onclick = async () => {
    let url = $('#lk_url', sh).value.trim(); if (!url) return toast(t('Вставьте ссылку'));
    if (!/^[a-z]+:\/\//i.test(url)) url = 'https://' + url;
    const title = $('#lk_t', sh).value.trim() || libHost(url) || url;
    const it = ex || newItem('lib', { sec });
    Object.assign(it, { url, title, desc: $('#lk_d', sh).value.trim() });
    await saveItem(it); closeSheet(); toast(t('Сохранено ✓'));
  };
}
async function libPickMeeting() {
  const ms = sortByDate(live().filter(i => i.kind === 'meeting' && (i.summary || i.recording)), true).slice(0, 40);
  if (!ms.length) return toast(t('Пока нет встреч с итогами или записью'), 3500);
  const v = await dialog({ title: t('Какую встречу сохранить?'), text: '', buttons: ms.map(m => ({ l: (libOfMeeting(m.id) ? '✓ ' : '') + shortTitle(m.title, 50) + (m.date ? ' · ' + D.human(m.date) : ''), v: m.id })).concat([{ l: t('Отмена'), v: null }]) });
  if (v) libSaveMeeting(v);
}

/* ---------- a meeting archive ---------- */
const libOfMeeting = mid => live().find(i => i.kind === 'lib' && i.sec === 'meeting' && i.meetingId === mid);
async function libSaveMeeting(mid, btn) {
  const m = getItem(mid); if (!m) return;
  const ex = libOfMeeting(mid);
  let coach = false;
  if (m.coach) {
    const v = await dialog({ title: ex ? t('Обновить архив встречи?') : t('Сохранить встречу в библиотеку'), text: esc(t('В архив войдут: дата, время, место, участники и их контакты, итоги, решения, задачи и сроки, стенограмма и аудиозапись. Добавить ваш личный разбор?')), buttons: [{ l: t('Без личного разбора'), v: 'pub', p: 1 }, { l: t('С моим разбором'), v: 'self' }, { l: t('Отмена'), v: null }] });
    if (!v) return; coach = v === 'self';
  } else if (ex) {
    const v = await dialog({ title: t('Обновить архив встречи?'), text: esc(t('PDF будет собран заново с текущими итогами.')), buttons: [{ l: t('Обновить'), v: 1, p: 1 }, { l: t('Отмена'), v: 0 }] });
    if (!v) return;
  }
  const run = async () => {
    const blob = await buildItemPdf(m, { desc: true, subs: true, people: true, contacts: true, photos: true, files: true, sum: true, made: true, tr: true, res: true, coach });
    const name = (m.title.replace(/[\\/:*?"<>|]/g, ' ').slice(0, 60) || 'MARKUS-A') + (m.date ? ' ' + m.date : '') + ' — ' + t('архив') + '.pdf';
    const f = await storeFile(new File([blob], name, { type: 'application/pdf' }));
    const snap = { date: m.date, start: m.start, end: m.end, place: m.place || '', participants: (m.participants || []).slice(), short: ((m.summary && m.summary.short) || []).slice(0, 5), coach };
    const it = ex || newItem('lib', { sec: 'meeting', meetingId: mid });
    const old = (it.files || []).slice();
    Object.assign(it, { title: m.title, files: [f], recording: m.recording ? clone(m.recording) : it.recording || null, snap, desc: snap.short.slice(0, 2).join(' ') });
    await saveItem(it);
    if (old.length) purgeFiles(old);
    return it;
  };
  const it = btn ? await withBusy(btn, run, { busy: t('Собираю архив…'), ok: t('В библиотеке') }) : await run().catch(e => { toast(e.message, 5000); return null; });
  if (it && it.id) { toast(t('Встреча сохранена в «Мою библиотеку» ✓'), 3500); if (S.route === 'meeting') render(); }
}
function libMeetingBtnHTML(m) {
  if (!m.summary && !m.recording) return '';
  const ex = libOfMeeting(m.id);
  return `<div class="lib-save ${ex ? 'saved' : ''}"><span class="ls-ic">${ic('folder', 18)}</span><div class="ls-b"><b>${ex ? t('В вашей библиотеке') : t('Сохранить в «Мою библиотеку»')}</b><span>${ex ? t('Сохранено {d} · PDF + аудио', { d: D.human((ex.updated || ex.created || '').slice(0, 10) || D.today()).toLowerCase() }) : t('PDF со всеми деталями встречи + аудиозапись')}</span></div>${ex ? `<button class="link" onclick="libOpen('${ex.id}')">${t('Открыть')}</button><button class="link" onclick="libSaveMeeting('${m.id}',this)">${t('Обновить')}</button>` : `<button class="btn pri" onclick="libSaveMeeting('${m.id}',this)">${t('Сохранить')}</button>`}</div>`;
}

/* ---------- opening ---------- */
function libOpen(id) {
  const i = getItem(id); if (!i) return;
  if (i.sec === 'link' || (i.sec === 'video' && i.url && !(i.files || []).length)) return libOpenLink(i);
  if (i.sec !== 'meeting') { const f = (i.files || [])[0]; if (f) return openFile(i.id, f.id); return; }
  const s = i.snap || {}, m = i.meetingId && getItem(i.meetingId), pdf = (i.files || [])[0];
  const sh = openSheet(`
    <div class="sh-h"><span class="lib-ic" style="--c:${libSec('meeting')[3]}">${ic('users', 16)}</span><b style="flex:1;font-size:15px">${t('Архив встречи')}</b><button class="xbtn" onclick="libFav('${id}')">${ic(i.fav ? 'starf' : 'star', 18)}</button><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="arc-t">${esc(i.title)}</div>
    <div class="arc-facts">
      ${s.date ? `<div>${ic('calendar', 15)}<span>${esc(D.long(s.date))}${s.start ? ' · ' + esc(s.start + (s.end ? '–' + s.end : '')) : ''}</span></div>` : ''}
      ${s.place ? `<div>${ic('pin', 15)}<span>${esc(s.place)}</span></div>` : ''}
      ${(s.participants || []).length ? `<div>${ic('users', 15)}<span>${esc(s.participants.join(', '))}</span></div>` : ''}
    </div>
    ${(s.short || []).length ? `<div class="h4">${t('Главное')}</div><ul class="bul">${s.short.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${i.recording ? `<div class="h4">${t('Аудиозапись')} · ${fmtDur(i.recording.duration || 0)}</div><div id="arc_a"><button class="btn ghost full" onclick="libPlay('${id}')">${ic('play', 16)} ${t('Прослушать')}</button></div>` : ''}
    <div class="btns" style="margin-top:12px">${pdf ? `<button class="btn pri" onclick="openFile('${id}','${pdf.id}')">${ic('pdf', 18)} ${t('Открыть PDF')}</button><button class="btn ghost" onclick="shareStored('${id}','${pdf.id}')">${ic('share', 18)} ${t('Поделиться')}</button>` : ''}</div>
    ${m && !m.deleted ? `<button class="btn ghost full" style="margin-top:8px" onclick="closeAllSheets();go('meeting','${m.id}')">${ic('right', 16)} ${t('Перейти к встрече')}</button>` : `<div class="hint">${t('Сама встреча удалена — архив сохранён здесь.')}</div>`}
    <button class="btn danger full" style="margin-top:8px" onclick="libDelete('${id}')">${ic('trash', 16)} ${t('Убрать из библиотеки')}</button>`, { cls: 'tall' });
  return sh;
}
async function libPlay(id) { const i = getItem(id); const r = i && i.recording; if (!r) return; const b = await getFileBlob({ id: r.fileId, cloud: r.cloud, parts: r.parts, type: r.mime }); const box = $('#arc_a'); if (!b) return toast(t('Аудио есть только на другом устройстве')); if (box) box.innerHTML = `<audio controls autoplay style="width:100%" src="${URL.createObjectURL(b)}"></audio>`; }
function libOpenLink(i) {
  openSheet(`<div class="sh-h"><span class="lib-ic" style="--c:${libSec(i.sec)[3]}">${ic(libSec(i.sec)[2], 16)}</span><b style="flex:1;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(i.title)}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="hint" style="word-break:break-all">${esc(i.url || '')}</div>${i.desc ? `<div class="pre">${linkify(i.desc)}</div>` : ''}
    <div class="btns" style="margin-top:12px"><a class="btn pri" href="${esc(i.url)}" target="_blank" rel="noopener">${ic('globe', 18)} ${t('Открыть')}</a><button class="btn ghost" onclick="shareText(${esc(JSON.stringify(i.title))},${esc(JSON.stringify(i.url))})">${ic('share', 18)} ${t('Поделиться')}</button></div>
    <div class="btns" style="margin-top:8px"><button class="btn ghost" onclick="closeSheet();libEditLink('${i.id}','${i.sec}')">${ic('edit', 16)} ${t('Изменить')}</button><button class="btn danger" onclick="libDelete('${i.id}')">${ic('trash', 16)} ${t('Удалить')}</button></div>`);
}
async function libFav(id) { const i = getItem(id); i.fav = !i.fav; await saveItem(i, { render: false }); closeSheet(); libOpen(id); }
async function libDelete(id) {
  const i = getItem(id); if (!i) return;
  const v = await dialog({ title: t('Убрать из библиотеки?'), text: '<b class="dlg-item">«' + esc(shortTitle(i.title, 80)) + '»</b><br>' + esc(i.sec === 'meeting' ? t('PDF-архив удалится. Аудиозапись останется во встрече, если встреча ещё есть.') : t('Отменить будет нельзя.')), buttons: [{ l: t('Удалить'), v: true, d: 1 }, { l: t('Отмена'), v: false }] });
  if (v !== true) return;
  const metas = itemFileMetas(i);
  await deleteItem(i); purgeFiles(metas);
  if (typeof closeAllSheets === 'function') closeAllSheets();
  toast(t('Удалено')); render();
}
