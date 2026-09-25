'use strict';
/* ============================================================================
   Places (several per task/meeting, each with map links and landmark photos),
   links (videos, cloud folders, Telegram "Saved messages"), task results
   (final document / screenshot that the client accepted the work),
   and where files are kept (phone vs cloud).
   ========================================================================== */
const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
const TASHKENT = { lat: 41.3111, lng: 69.2797 };

function newPlace(o) { return Object.assign({ id: uid(), name: '', address: '', url: '', lat: null, lng: null, note: '', photos: [] }, o || {}); }

/* coordinates from links of Yandex Maps, 2GIS, Google Maps, geo: links or plain "41.31, 69.27" */
function parseGeo(src) {
  let s = String(src || '').trim(); if (!s) return null;
  try { s = decodeURIComponent(s); } catch (e) { }
  const ok = (a, b) => { a = +a; b = +b; return isFinite(a) && isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180 && !(a === 0 && b === 0) ? { lat: a, lng: b } : null; };
  let m;
  if (/yandex\.|ya\.ru/.test(s) && (m = s.match(/(?:[?&](?:pt|ll)=|whatshere\[point\]=)(-?\d+\.\d+),\s*(-?\d+\.\d+)/))) return ok(m[2], m[1]);
  if (/2gis\./.test(s) && (m = s.match(/(?:[?&]m=|\/geo\/(?:\d+\/)?|\||points\/)(-?\d+\.\d+),\s*(-?\d+\.\d+)/))) return ok(m[2], m[1]);
  if ((m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/))) return ok(m[1], m[2]);
  if ((m = s.match(/[?&](?:q|query|ll|daddr|destination|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/))) return ok(m[1], m[2]);
  if ((m = s.match(/geo:(-?\d+\.\d+),(-?\d+\.\d+)/))) return ok(m[1], m[2]);
  if ((m = s.match(/^(-?\d{1,2}\.\d{3,})\s*[,;\s]\s*(-?\d{1,3}\.\d{3,})$/))) return ok(m[1], m[2]);
  return null;
}
function placeGeo(p) {
  if (!p) return null;
  if (p.lat != null && p.lng != null && p.lat !== '' && isFinite(+p.lat)) return { lat: +p.lat, lng: +p.lng };
  return parseGeo(p.url) || parseGeo(p.address);
}
function placeUrl(p) {
  if (!p) return '';
  if (p.url) return p.url;
  const g = placeGeo(p);
  if (g) return `https://maps.google.com/?q=${g.lat.toFixed(6)},${g.lng.toFixed(6)}`;
  return p.address ? 'https://maps.google.com/?q=' + encodeURIComponent(p.address) : '';
}
function mapLinks(p) {
  const g = placeGeo(p), L = [];
  if (g) {
    const la = g.lat.toFixed(6), lo = g.lng.toFixed(6);
    L.push([t('Яндекс Карты'), `https://yandex.uz/maps/?pt=${lo},${la}&z=17&l=map`]);
    L.push([t('2ГИС'), `https://2gis.uz/geo/${lo},${la}`]);
    L.push(['Google Maps', `https://maps.google.com/?q=${la},${lo}`]);
  } else if (p.address) {
    const q = encodeURIComponent(p.address);
    L.push([t('Яндекс Карты'), `https://yandex.uz/maps/?text=${q}`]);
    L.push([t('2ГИС'), `https://2gis.uz/search/${q}`]);
    L.push(['Google Maps', `https://maps.google.com/?q=${q}`]);
  }
  if (p.url && !L.some(x => x[1] === p.url)) L.unshift([t('Ссылка'), p.url]);
  return L;
}
function placeTitle(p) { const g = placeGeo(p); return p.name || p.address || (g ? g.lat.toFixed(5) + ', ' + g.lng.toFixed(5) : '') || (p.url ? p.url.replace(/^https?:\/\//, '').slice(0, 40) : t('Место')); }
function placeShareText(p, it) {
  const lines = ['📍 ' + placeTitle(p)];
  if (p.address && p.address !== placeTitle(p)) lines.push(p.address);
  if (p.note) lines.push('ℹ️ ' + p.note);
  if (it && isTaskKind(it) && it.date) lines.push('📅 ' + it.title + ' — ' + D.long(it.date) + (it.start ? ', ' + timeLabel(it) : ''));
  lines.push('');
  mapLinks(p).forEach(([n, u]) => lines.push('🗺 ' + n + ': ' + u));
  return lines.join('\n');
}
function holderOf(id) { return getItem(id) || (typeof E !== 'undefined' && E && E.id === id ? E : null); }
function allFileMetas(it) {
  const out = (it.files || []).slice();
  (it.locations || []).forEach(l => (l.photos || []).forEach(f => out.push(f)));
  if (it.result && it.result.files) it.result.files.forEach(f => out.push(f));
  return out;
}

/* ---------- places: display ---------- */
function placesBlock(it, o = {}) {
  const ls = it.locations || [];
  if (!ls.length) return '';
  const tg = Cloud.user && Cloud.profile && Cloud.profile.tg_chat_id;
  return ls.map(p => {
    const g = placeGeo(p);
    return `<div class="place">
      <div class="place-h">${ic('pin', 18)}<div style="flex:1;min-width:0"><b>${esc(placeTitle(p))}</b>${p.address && p.address !== placeTitle(p) ? `<span>${esc(p.address)}</span>` : ''}${p.note ? `<span class="place-n">${esc(p.note)}</span>` : ''}</div></div>
      ${(p.photos || []).length ? `<div class="thumbs">${p.photos.map(f => `<button class="thumb" data-ph="${it.id}|${f.id}" onclick="openFile('${it.id}','${f.id}')" aria-label="${esc(f.name)}"></button>`).join('')}</div>` : ''}
      <div class="chips wrapchips" style="margin:8px 0 0">${mapLinks(p).map(([n, u]) => `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener">${ic('globe', 13)} ${esc(n)}</a>`).join('')}</div>
      <div class="btns" style="margin-top:8px"><button class="btn ghost" onclick="sharePlace('${it.id}','${p.id}')">${ic('share', 16)} ${t('Отправить партнёру')}</button>${g && tg ? `<button class="btn ghost" onclick="placeToTelegram('${it.id}','${p.id}')">${ic('tg', 16)} ${t('Точкой в Telegram')}</button>` : ''}</div>
    </div>`;
  }).join('') + (o.after || '');
}
/* photo thumbnails are loaded after the HTML is on screen */
async function loadThumbs(root) {
  for (const b of $$('[data-ph]', root || document)) {
    if (b.dataset.done) continue; b.dataset.done = 1;
    const [hid, fid] = b.dataset.ph.split('|');
    const { f } = findFile(hid, fid); if (!f) continue;
    try { const blob = await getFileBlob(f); if (blob) b.style.backgroundImage = `url("${URL.createObjectURL(blob)}")`; else b.classList.add('nophoto'); } catch (e) { }
  }
}
async function sharePlace(holderId, pid) {
  const it = holderOf(holderId); if (!it) return;
  const p = (it.locations || []).find(x => x.id === pid); if (!p) return;
  const text = placeShareText(p, it);
  const files = [];
  for (const ph of (p.photos || [])) { const b = await getFileBlob(ph); if (b) files.push(new File([b], ph.name || 'photo.jpg', { type: b.type || ph.type || 'image/jpeg' })); }
  const choice = files.length ? await dialog({ title: t('Отправить место'), html: `<div class="ai-box" style="margin:0 0 6px">${esc(text)}</div>`, buttons: [{ l: t('Текст и фото ({n})', { n: files.length }), v: 'all', p: 1 }, { l: t('Только текст и ссылки'), v: 'text' }, { l: t('Отмена'), v: null }] }) : 'text';
  if (!choice) return;
  if (choice === 'all') {
    try { if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, text, title: placeTitle(p) }); return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
    toast(t('Этот браузер не умеет отправлять фото — отправляю текст'), 3500);
  }
  shareText(text);
}
async function placeToTelegram(holderId, pid) {
  const it = holderOf(holderId); const p = it && (it.locations || []).find(x => x.id === pid);
  const g = placeGeo(p); if (!g) return toast(t('Для точки нужны координаты — выберите место на карте'), 4000);
  try {
    await Cloud.sendVenue({ lat: g.lat, lng: g.lng, title: placeTitle(p), address: [p.address, p.note].filter(Boolean).join(' · ') || (it.title || '') });
    await dialog({ title: t('Точка отправлена вам в Telegram'), text: t('Откройте чат с ботом, нажмите и удерживайте сообщение с картой → «Переслать» → выберите партнёра. Он получит настоящую точку на карте Telegram.'), buttons: [{ l: t('Понятно'), v: 1, p: 1 }] });
  } catch (e) { toast(e.message, 5000); }
}

/* ---------- places: editing (inside the task/meeting editor) ---------- */
function edRenderPlaces() {
  const box = $('#e_places'); if (!box) return;
  const ls = E.locations || [];
  box.innerHTML = ls.map(p => `<div class="place mini-place" onclick="edEditPlace('${p.id}')">
      <div class="place-h">${ic('pin', 16)}<div style="flex:1;min-width:0"><b>${esc(placeTitle(p))}</b><span>${placeGeo(p) ? '✓ ' + t('точка на карте') : p.url ? t('ссылка') : ''}${(p.photos || []).length ? ' · 📷 ' + p.photos.length : ''}</span></div>
      <button class="xbtn" style="width:28px;height:28px" onclick="event.stopPropagation();edRemovePlace('${p.id}')" aria-label="${esc(t('Удалить'))}">${ic('x', 14)}</button></div></div>`).join('')
    + `<button class="att-add" style="margin-top:6px" onclick="edEditPlace()">${ic('pin', 16)} ${t('Добавить место')}</button>`;
}
async function edEditPlace(pid) {
  E.locations = E.locations || [];
  const ex = pid && E.locations.find(x => x.id === pid);
  const res = await openPlaceEditor(ex ? clone(ex) : newPlace());
  if (!res) return;
  const i = E.locations.findIndex(x => x.id === res.id);
  if (i >= 0) E.locations[i] = res; else E.locations.push(res);
  edRenderPlaces();
}
function edRemovePlace(pid) { E.locations = (E.locations || []).filter(x => x.id !== pid); edRenderPlaces(); }

let PE = null;   // place being edited
function openPlaceEditor(place) {
  PE = place;
  return new Promise(res => {
    let saved = false;
    const sh = openSheet(`
      <div class="sh-h"><b>${t('Место встречи')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
      <label class="lbl">${t('Название')}</label><input class="inp" id="pl_name" value="${esc(PE.name)}" placeholder="${esc(t('Например: кафе «Caravan», вход со стороны парка'))}">
      <label class="lbl">${t('Ссылка на место')} <span class="muted">(${t('Яндекс Карты, 2ГИС, Google Maps')})</span></label>
      <div class="inp-mic"><input class="inp" id="pl_url" value="${esc(PE.url)}" placeholder="https://…" oninput="plGeoHint()"><button class="mic-sm" onclick="plPaste()" title="${esc(t('Вставить'))}">${ic('clip')}</button></div>
      <div class="btns" style="margin-top:8px"><button class="btn ghost" onclick="plPickOnMap()">${ic('pin', 16)} ${t('Выбрать на карте')}</button><button class="btn ghost" onclick="plMyPos()">${ic('globe', 16)} ${t('Я сейчас здесь')}</button></div>
      <div class="hint" id="pl_geo"></div>
      <label class="lbl">${t('Адрес')}</label><input class="inp" id="pl_addr" value="${esc(PE.address)}" placeholder="${esc(t('Улица, дом, ориентир'))}">
      <label class="lbl">${t('Как найти')}</label><textarea class="inp" id="pl_note" style="min-height:64px" placeholder="${esc(t('Например: 2 этаж, столик у окна; парковка справа'))}">${esc(PE.note)}</textarea>
      <label class="lbl">${t('Фото ориентиров')} <span class="muted">(${t('подходы, вход, вывеска')})</span></label>
      <div class="thumbs" id="pl_photos"></div>
      <label class="att-add" style="margin-top:8px">${ic('clip', 16)} ${t('Добавить фото')}<input type="file" accept="image/*" multiple hidden onchange="plAddPhotos(this)"></label>
      <div class="hint">${t('Из Telegram: откройте точку на карте → «Открыть в…» Яндекс/Google → «Поделиться» → «Копировать ссылку» и вставьте сюда.')}</div>
      <div class="sh-foot"><button class="btn pri" style="flex:1" id="pl_save">${t('Сохранить место')}</button></div>`,
      { cls: 'tall', onClose: () => { if (!saved) res(null); } });
    plRenderPhotos(); plGeoHint();
    $('#pl_save', sh).onclick = () => {
      PE.name = $('#pl_name', sh).value.trim(); PE.url = $('#pl_url', sh).value.trim();
      PE.address = $('#pl_addr', sh).value.trim(); PE.note = $('#pl_note', sh).value.trim();
      if (PE.lat == null) { const g = parseGeo(PE.url) || parseGeo(PE.address); if (g) { PE.lat = g.lat; PE.lng = g.lng; } }
      if (!PE.name && !PE.url && !PE.address && PE.lat == null && !PE.photos.length) { toast(t('Укажите место: ссылку, адрес или точку на карте'), 3500); return; }
      saved = true; closeSheet(); res(PE);
    };
  });
}
function plGeoHint() {
  const el = $('#pl_geo'); if (!el || !PE) return;
  const url = ($('#pl_url') || {}).value || '';
  const g = PE.lat != null ? { lat: PE.lat, lng: PE.lng } : parseGeo(url);
  el.innerHTML = g ? `<span class="ok">✓ ${t('Точка на карте')}: ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}</span>` : url ? t('Ссылка сохранится как есть. Чтобы получатель мог открыть место и в Яндексе, и в 2ГИС — отметьте точку на карте.') : '';
}
async function plPaste() { try { const x = await navigator.clipboard.readText(); if (x) { $('#pl_url').value = x.trim(); plGeoHint(); } else toast(t('Буфер обмена пуст')); } catch (e) { toast(t('Вставьте ссылку вручную (долгое нажатие → Вставить)')); } }
function plMyPos() {
  if (!navigator.geolocation) return toast(t('Геопозиция недоступна'));
  toast(t('Определяю местоположение…'));
  navigator.geolocation.getCurrentPosition(async p => {
    PE.lat = +p.coords.latitude.toFixed(6); PE.lng = +p.coords.longitude.toFixed(6); plGeoHint();
    const a = await reverseGeocode(PE.lat, PE.lng); if (a && !$('#pl_addr').value) $('#pl_addr').value = a;
    toast(t('Локация добавлена ✓'));
  }, () => toast(t('Нет доступа к геопозиции')), { enableHighAccuracy: true, timeout: 15000 });
}
function plRenderPhotos() {
  const box = $('#pl_photos'); if (!box || !PE) return;
  box.innerHTML = PE.photos.map(f => `<div class="thumb-w"><button class="thumb" data-pl="${f.id}" onclick="plOpenPhoto('${f.id}')"></button><button class="thumb-x" onclick="plDelPhoto('${f.id}')" aria-label="${esc(t('Удалить'))}">${ic('x', 12)}</button></div>`).join('');
  PE.photos.forEach(async f => { const b = await getFileBlob(f); const el = $(`[data-pl="${f.id}"]`, box); if (b && el) el.style.backgroundImage = `url("${URL.createObjectURL(b)}")`; });
}
async function plAddPhotos(inp) { for (const f of inp.files) PE.photos.push(await storeFile(await shrinkImage(f), f.name)); inp.value = ''; plRenderPhotos(); }
function plDelPhoto(id) { PE.photos = PE.photos.filter(f => f.id !== id); plRenderPhotos(); }
async function plOpenPhoto(id) { const f = PE.photos.find(x => x.id === id); const b = f && await getFileBlob(f); if (b) window.open(URL.createObjectURL(b), '_blank'); }
/* phone photos are 3–8 MB; 1600 px is plenty for "where is the entrance" and saves memory and cloud space */
async function shrinkImage(file, max = 1600) {
  try {
    if (!/^image\/(jpeg|png|webp)/.test(file.type) || file.size < 400 * 1024) return file;
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (k >= 1 && file.size < 1.5 * 1048576) return file;
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
    return b && b.size < file.size ? new File([b], (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch (e) { return file; }
}

/* ---------- map picker (OpenStreetMap, free) ---------- */
function loadCss(href) { if (document.querySelector(`link[href="${href}"]`)) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); }
async function reverseGeocode(lat, lng) {
  try { const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=${langCode()}&lat=${lat}&lon=${lng}`); if (!r.ok) return ''; const d = await r.json(); return (d.display_name || '').split(', ').slice(0, 4).join(', '); } catch (e) { return ''; }
}
async function plPickOnMap() {
  try { loadCss(LEAFLET_CSS); await loadScript(LEAFLET_JS); } catch (e) { return toast(e.message, 4000); }
  const start = PE.lat != null ? { lat: PE.lat, lng: PE.lng } : (parseGeo($('#pl_url').value) || TASHKENT);
  let pick = PE.lat != null || start !== TASHKENT ? start : null;
  const sh = openSheet(`<div class="sh-h"><b>${t('Отметьте место на карте')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
    <div class="inp-mic"><input class="inp" id="mp_q" placeholder="${esc(t('Поиск: адрес или название'))}" onkeydown="if(event.key==='Enter')mpSearch()"><button class="mic-sm" onclick="mpSearch()">${ic('search')}</button></div>
    <div id="mp_res"></div>
    <div id="mp_map" class="mapbox"></div>
    <div class="hint" id="mp_hint">${t('Нажмите на карту, чтобы поставить точку.')}</div>
    <div class="sh-foot"><button class="btn ghost" onclick="mpLocate()">${ic('globe', 16)}</button><button class="btn pri" style="flex:1" id="mp_ok">${t('Готово')}</button></div>`, { cls: 'tall' });
  await sleep(250);
  const map = L.map($('#mp_map', sh), { zoomControl: true }).setView([start.lat, start.lng], pick ? 17 : 12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  let mk = null;
  const setPick = (lat, lng, zoom) => {
    pick = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
    if (mk) mk.setLatLng([lat, lng]); else mk = L.circleMarker([lat, lng], { radius: 11, color: '#fff', weight: 3, fillColor: '#e0452f', fillOpacity: 1 }).addTo(map);
    if (zoom) map.setView([lat, lng], zoom);
    $('#mp_hint', sh).textContent = `✓ ${pick.lat}, ${pick.lng}`;
  };
  if (pick) setPick(pick.lat, pick.lng);
  map.on('click', e => setPick(e.latlng.lat, e.latlng.lng));
  window.mpLocate = () => navigator.geolocation && navigator.geolocation.getCurrentPosition(p => setPick(p.coords.latitude, p.coords.longitude, 17), () => toast(t('Нет доступа к геопозиции')), { enableHighAccuracy: true, timeout: 15000 });
  window.mpSearch = async () => {
    const q = $('#mp_q', sh).value.trim(); if (!q) return;
    $('#mp_res', sh).innerHTML = `<div class="hint">${t('Ищу…')}</div>`;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=${langCode()}&countrycodes=uz&q=${encodeURIComponent(q)}`);
      const list = r.ok ? await r.json() : [];
      $('#mp_res', sh).innerHTML = list.length ? list.map((x, i) => `<button class="mp-r" data-i="${i}">${esc(x.display_name.split(', ').slice(0, 4).join(', '))}</button>`).join('') : `<div class="hint">${t('Ничего не найдено')}</div>`;
      $$('.mp-r', sh).forEach(b => b.onclick = () => { const x = list[+b.dataset.i]; setPick(+x.lat, +x.lon, 17); $('#mp_res', sh).innerHTML = ''; if (!$('#pl_addr').value) $('#pl_addr').value = x.display_name.split(', ').slice(0, 4).join(', '); });
    } catch (e) { $('#mp_res', sh).innerHTML = `<div class="hint">${t('Нет интернета')}</div>`; }
  };
  $('#mp_ok', sh).onclick = async () => {
    if (!pick) return toast(t('Нажмите на карту, чтобы поставить точку.'));
    PE.lat = pick.lat; PE.lng = pick.lng; closeSheet(); plGeoHint();
    if (!$('#pl_addr').value) { const a = await reverseGeocode(pick.lat, pick.lng); if (a) $('#pl_addr').value = a; }
  };
}

/* ---------- links: video, cloud folders, Telegram "Saved messages" ---------- */
function linkIcon(u) { return /t\.me|telegram/.test(u) ? 'tg' : /youtu|vimeo|video/.test(u) ? 'play' : /drive\.google|disk\.yandex|dropbox|onedrive|icloud/.test(u) ? 'folder' : 'link'; }
function linksBlock(it) {
  const L = it.links || []; if (!L.length) return '';
  return `<div class="att">${L.map(l => `<a class="att-i" href="${esc(l.url)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><span class="ficon" style="background:#0ea5e9">${ic(linkIcon(l.url), 14)}</span><span>${esc(l.title || l.url.replace(/^https?:\/\//, '').slice(0, 60))}</span></a>`).join('')}</div>`;
}
function edRenderLinks() {
  const box = $('#e_links'); if (!box) return;
  box.innerHTML = (E.links || []).map(l => `<div class="att-i"><span class="ficon" style="background:#0ea5e9">${ic(linkIcon(l.url), 14)}</span><span>${esc(l.title || l.url)}</span><button class="xbtn" style="width:26px;height:26px" onclick="edRemoveLink('${l.id}')">${ic('x', 14)}</button></div>`).join('')
    + `<button class="att-add" style="margin-top:6px" onclick="edAddLink()">${ic('link', 16)} ${t('Добавить ссылку (видео, облако, Telegram)')}</button>`;
}
async function edAddLink() {
  const v = await dialog({ title: t('Ссылка'), html: `<input class="inp" id="lk_u" placeholder="https://…" inputmode="url"><input class="inp" id="lk_t" style="margin-top:8px" placeholder="${esc(t('Название (необязательно)'))}"><div class="hint">${t('Большие видео удобно держать в Telegram («Избранное») или на Google Диске и прикладывать сюда ссылку.')}</div>`,
    buttons: [{ l: t('Добавить'), p: 1, v: sh => { let u = $('#lk_u', sh).value.trim(); if (!u) { toast(t('Вставьте ссылку')); return false; } if (!/^[a-z]+:/i.test(u)) u = 'https://' + u; return { u, t: $('#lk_t', sh).value.trim() }; } }, { l: t('Отмена'), v: null }],
    onMount: async sh => { try { const x = await navigator.clipboard.readText(); if (/^https?:\/\//.test(x || '')) $('#lk_u', sh).value = x.trim(); } catch (e) { } } });
  if (!v) return;
  E.links = E.links || []; E.links.push({ id: uid(), url: v.u, title: v.t }); edRenderLinks();
}
function edRemoveLink(id) { E.links = (E.links || []).filter(l => l.id !== id); edRenderLinks(); }

/* ---------- task result: final document / screenshot «client accepted the work» ---------- */
function resultBlock(it) {
  if (it.kind !== 'task') return '';
  const r = it.result;
  const has = r && (r.note || (r.files || []).length);
  return `<div class="h4" style="display:flex;align-items:center">${t('Результат выполнения')}<span style="flex:1"></span><button class="link" onclick="openResultEditor('${it.id}')">${has ? t('Изменить') : '+ ' + t('Добавить')}</button></div>
    ${has ? `<div class="result-box">${r.note ? `<div class="pre">${linkify(r.note)}</div>` : ''}${(r.files || []).length ? attList(r.files, it.id, false) : ''}${r.at ? `<div class="mini" style="margin-top:6px">${esc(D.human(r.at.slice(0, 10)))}</div>` : ''}</div>`
      : `<div class="hint">${t('Прикрепите итоговый документ или скриншот переписки, что работу приняли.')}</div>`}`;
}
function openResultEditor(id) {
  const it = getItem(id); if (!it) return;
  const R = clone(it.result || { note: '', files: [] });
  return new Promise(res => {
    const sh = openSheet(`<div class="sh-h"><b>${t('Результат выполнения')}</b><button class="xbtn" onclick="closeSheet()">${ic('x', 18)}</button></div>
      <div class="hint">${esc(it.title)}</div>
      <label class="lbl">${t('Что сделано')}</label><textarea class="inp" id="rs_note" style="min-height:90px" placeholder="${esc(t('Например: договор консигнации отправлен, Пётр подтвердил 26.09'))}">${esc(R.note || '')}</textarea>
      <label class="lbl">${t('Итоговый документ, скриншоты')}</label><div id="rs_files"></div>
      <label class="att-add" style="margin-top:8px">${ic('clip', 16)} ${t('Прикрепить файлы')}<input type="file" multiple hidden id="rs_inp"></label>
      <div class="sh-foot"><button class="btn pri" style="flex:1" id="rs_save">${t('Сохранить')}</button></div>`, { cls: 'tall', onClose: () => res(null) });
    const draw = () => { $('#rs_files', sh).innerHTML = R.files.map(f => `<div class="att-i">${ficon(f)}<span>${esc(f.name)}</span><button class="xbtn" style="width:26px;height:26px" data-del="${f.id}">${ic('x', 14)}</button></div>`).join(''); $$('[data-del]', sh).forEach(b => b.onclick = () => { R.files = R.files.filter(f => f.id !== b.dataset.del); draw(); }); };
    draw();
    $('#rs_inp', sh).onchange = async e => { for (const f of e.target.files) R.files.push(await storeFile(/^image\//.test(f.type) ? await shrinkImage(f, 2200) : f, f.name)); e.target.value = ''; draw(); };
    $('#rs_save', sh).onclick = async () => {
      R.note = $('#rs_note', sh).value.trim(); R.at = new Date().toISOString();
      it.result = (R.note || R.files.length) ? R : null;
      await saveItem(it); closeSheet(); toast(t('Сохранено ✓')); refreshDetail(id); res(it.result);
    };
  });
}

/* ---------- where files live ---------- */
async function storageInfo() {
  let used = 0, quota = 0; try { const e = await navigator.storage.estimate(); used = e.usage || 0; quota = e.quota || 0; } catch (e) { }
  let n = 0, cloud = 0, local = 0;
  for (const it of live()) for (const f of allFileMetas(it).concat(it.recording ? [{ id: it.recording.fileId, cloud: it.recording.cloud }] : [])) { n++; if (f.cloud) cloud++; }
  return { used, quota, n, cloud, local };
}
/* delete the phone copies of files that are safely in the cloud (they download again when opened) */
async function freePhoneMemory() {
  if (!Cloud.user) return toast(t('Сначала войдите в облако — иначе файлы потеряются'), 4000);
  await Cloud.sync();
  let n = 0;
  for (const it of live()) {
    const metas = allFileMetas(it).concat(it.recording ? [{ id: it.recording.fileId, cloud: it.recording.cloud }] : []);
    for (const f of metas) if (f.cloud && await DB.get('files', f.id)) { await DB.del('files', f.id); n++; }
  }
  toast(t('Освобождено файлов на телефоне: {n}', { n }), 4000);
  if (S.route === 'settings') render();
}
