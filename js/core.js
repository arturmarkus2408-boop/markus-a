'use strict';
/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const clone = o => JSON.parse(JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mb = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' ' + t('МБ') : Math.max(1, Math.round((b || 0) / 1024)) + ' ' + t('КБ');
function fmtDur(sec) { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s); }
function durLabel(min) { if (min < 60) return min + ' ' + t('мин'); const h = Math.floor(min / 60), m = min % 60; return h + ' ' + t('ч') + (m ? ' ' + m + ' ' + t('мин') : ''); }
function plural(n, a, b, c) { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return a; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b; return c; }
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
/* Android app (MARKUS-A.apk) exposes window.MarkusNative; in a normal browser this is null */
const NATIVE = (window.MarkusNative && typeof window.MarkusNative === 'object') ? window.MarkusNative : null;

/* ================= dates (local time, locale-aware) ================= */
const D = {
  fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
  parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
  today() { return D.fmt(new Date()); },
  add(s, n) { const d = D.parse(s); d.setDate(d.getDate() + n); return D.fmt(d); },
  toMin(t) { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); },
  fromMin(m) { m = Math.max(0, Math.min(1439, Math.round(m))); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); },
  addMin(t, n) { return D.fromMin(D.toMin(t) + n); },
  nowMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); },
  nowTime() { return D.fromMin(D.nowMin()); },
  dt(date, time) { const d = D.parse(date); if (time) { const [h, m] = time.split(':').map(Number); d.setHours(h, m || 0, 0, 0); } return d; },
  intl(s, o) { try { return new Intl.DateTimeFormat(locale(), o).format(typeof s === 'string' ? D.parse(s) : s); } catch (e) { return typeof s === 'string' ? s : D.fmt(s); } },
  human(s) {
    if (!s) return t('Без даты');
    const td = D.today();
    if (s === td) return t('Сегодня');
    if (s === D.add(td, 1)) return t('Завтра');
    if (s === D.add(td, 2)) return t('Послезавтра');
    if (s === D.add(td, -1)) return t('Вчера');
    return D.short(s, D.parse(s).getFullYear() !== new Date().getFullYear());
  },
  short(s, withYear) { return D.intl(s, withYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' }); },
  num(s) { return D.intl(s, { day: '2-digit', month: '2-digit', year: 'numeric' }); },
  long(s) { return cap(D.intl(s, { weekday: 'long' })) + ', ' + D.intl(s, { day: 'numeric', month: 'long', year: 'numeric' }); },
  monthYear(s) { return cap(D.intl(s, { month: 'long', year: 'numeric' })); },
  dow(i) { return cap(D.intl(new Date(2024, 0, 7 + i), { weekday: 'short' })).replace('.', ''); },
  dowFull(i) { return D.intl(new Date(2024, 0, 7 + i), { weekday: 'long' }); },
  weekStart(s) { const d = D.parse(s); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return D.fmt(d); },
  diffDays(a, b) { return Math.round((D.parse(b) - D.parse(a)) / 86400000); },
  max(a, b) { return !a ? b : !b ? a : (a > b ? a : b); }
};

/* ================= IndexedDB ================= */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('markus_a', 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      };
      r.onsuccess = () => { DB.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const tr = DB.db.transaction(store, mode);
      const req = fn(tr.objectStore(store));
      let out;
      if (req) req.onsuccess = () => { out = req.result; };
      tr.oncomplete = () => res(out);
      tr.onerror = () => rej(tr.error);
      tr.onabort = () => rej(tr.error);
    });
  },
  all(store) { return DB.tx(store, 'readonly', s => s.getAll()); },
  get(store, key) { return DB.tx(store, 'readonly', s => s.get(key)); },
  put(store, val, key) { return DB.tx(store, 'readwrite', s => key !== undefined ? s.put(val, key) : s.put(val)); },
  del(store, key) { return DB.tx(store, 'readwrite', s => s.delete(key)); }
};

/* ================= state & settings ================= */
const DEFAULT_CATS = [
  { id: 'work', name: 'Работа', color: '#3b82f6' },
  { id: 'meet', name: 'Встреча', color: '#8b5cf6' },
  { id: 'client', name: 'Клиент', color: '#22c55e' },
  { id: 'personal', name: 'Личное', color: '#ef4444' },
  { id: 'project', name: 'Проект', color: '#f59e0b' }
];
const DEFAULT_NOTE_CATS = ['Идеи', 'Работа', 'Личные', 'Документы'];
const DEFAULTS = {
  name: '', theme: 'light', lang: 'ru', workStart: '09:00', workEnd: '19:00', defaultDur: 60,
  morningTime: '09:30', eveTime: '19:00', dayEnd: '22:00', nagHours: 1,
  homeSort: 'time', homeLimit: 6, defaultRemind: [30],
  aiKey: '', aiModel: 'gemini-2.5-flash', voiceReply: true, autoTasks: 'auto',
  autoRecDefault: true, recPre: 2, recPost: 30, recDiscreet: true, autoAI: true, recMaxMin: 180,
  sendSummaryTg: true, cloudOnly: false, speechRate: 1, recQuality: 'high', recMode: 'auto',
  sbUrl: '', sbKey: '', botName: '',
  categories: DEFAULT_CATS, noteCats: DEFAULT_NOTE_CATS,
  myCard: {
    brand: 'MARKUS', subtitle: 'бухгалтерская компания · Ташкент',
    fn: 'MARKUS — бухгалтерия', org: 'ООО «MARKUS»', title: 'Бухгалтерские и юридические услуги',
    phone: '+998330801070', phone2: '+998338087744', telegram: 'DDR3128', whatsapp: '',
    email: 'arturusalt@gmail.com', url: 'https://markus.uz', address: 'пр. Амира Темура 25, Ташкент, Узбекистан',
    note: 'ИНН 311283164, ОКЭД 69.20.1, Telegram-бот @MarkusJW_bot, канал @MARKUS_JW', footer: 'ИНН 311 283 164 · +998 33 080-10-70'
  }
};
/* [key, name, preview colour 1, preview colour 2, browser bar colour] */
const THEMES = [
  ['light', 'Светлая', '#f4f5fb', '#5b4dff', '#5b4dff'],
  ['warm', 'Тёплая', '#f7f0e6', '#c2622d', '#c2622d'],
  ['dark', 'Тёмная', '#0b0e1a', '#7c6cff', '#0b0e1a'],
  ['bronze', 'Бронза', '#1a120d', '#c9974f', '#1a120d']
];
const S = { items: [], set: null, route: 'home', calView: 'day', selDate: null, taskFilter: 'today', noteCat: 'all', noteQ: '', docFilter: 'all', docQ: '', contactQ: '', meetingId: null, meetTab: 'short', meetList: 'up', showPast: false, scrollCal: true, homeAll: false, subFilter: 'all' };
const SET_KEY = 'markus_settings';
function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(SET_KEY) || '{}'); } catch (e) { }
  S.set = Object.assign(clone(DEFAULTS), s);
  S.set.myCard = Object.assign(clone(DEFAULTS.myCard), s.myCard || {});
  if (!Array.isArray(S.set.categories) || !S.set.categories.length) S.set.categories = clone(DEFAULT_CATS);
  if (!Array.isArray(S.set.noteCats) || !S.set.noteCats.length) S.set.noteCats = clone(DEFAULT_NOTE_CATS);
  // v3: meeting-recording & AI defaults the owner asked for (applied once over older saved settings)
  if (!s.v3) { Object.assign(S.set, { autoTasks: 'auto', autoRecDefault: true, recDiscreet: true, autoAI: true, v3: 1 }); try { localStorage.setItem(SET_KEY, JSON.stringify(S.set)); } catch (e) { } }
}
function saveSettings() { localStorage.setItem(SET_KEY, JSON.stringify(S.set)); if (window.Cloud && Cloud.user) Cloud.savePrefs(); }
const cfg = {
  get sbUrl() { return (S.set.sbUrl || (window.MARKUS_CONFIG || {}).SUPABASE_URL || '').trim().replace(/\/+$/, ''); },
  get sbKey() { return (S.set.sbKey || (window.MARKUS_CONFIG || {}).SUPABASE_KEY || '').trim(); },
  get bot() { return (S.set.botName || (window.MARKUS_CONFIG || {}).TELEGRAM_BOT || '').replace('@', '').trim(); }
};

/* ================= items ================= */
const isTaskKind = i => i && (i.kind === 'task' || i.kind === 'meeting');
function defaultReminders(priority, timed) {
  if (!timed) return priority === 'normal' ? ['morn'] : ['eve', 'morn'];
  if (priority === 'critical') return ['eve', 'morn', 60, 15];
  if (priority === 'high') return ['eve', 60];
  return clone(S.set.defaultRemind || [30]);
}
function newItem(kind, over) {
  const now = new Date().toISOString();
  const task = kind === 'task' || kind === 'meeting';
  const it = {
    id: uid(), kind, title: '', desc: '',
    date: task ? (S.selDate || D.today()) : null,
    start: null, end: null, priority: 'normal', status: 'todo',
    category: kind === 'meeting' ? 'meet' : 'work', noteCat: kind === 'note' ? 'Идеи' : null,
    subtasks: [], repeat: { type: 'none' }, reminders: task ? clone(S.set.defaultRemind || [30]) : [], nag: false,
    customRemind: null, remindTimes: [], remindLabels: {}, participants: [], contactIds: [], place: '', location: '', locations: [], links: [], files: [], fav: false,
    result: null, needsTime: false, emergency: false,
    autoRecord: kind === 'meeting' && !!(S.set && S.set.autoRecDefault), recording: null, transcript: '', summary: null, proposed: [], linked: [],
    cancelReason: '', cancelledAt: null, doneAt: null,
    phone: '', whatsapp: '', telegram: '', email: '', company: '',
    created: now, updated: now, deleted: false
  };
  return Object.assign(it, over || {});
}
const getItem = id => S.items.find(i => i.id === id);
const live = () => S.items.filter(i => !i.deleted);
let renderQueued = false;
function queueRender() { if (renderQueued) return; renderQueued = true; requestAnimationFrame(() => { renderQueued = false; if (typeof render === 'function') render(); }); }
async function saveItem(it, opt = {}) {
  if (opt.touch !== false) { it.updated = new Date().toISOString(); it._dirty = true; }
  if (typeof normalizeItem === 'function') normalizeItem(it);
  computeReminders(it);
  await DB.put('items', it);
  const i = S.items.findIndex(x => x.id === it.id);
  if (i >= 0) S.items[i] = it; else S.items.push(it);
  if (window.Cloud) Cloud.schedule();
  if (opt.render !== false) queueRender();
  return it;
}
async function deleteItem(it) { it.deleted = true; await saveItem(it); }

/* ================= files ================= */
async function storeFile(file, name) {
  const id = uid();
  await DB.put('files', file, id);
  return { id, name: name || file.name || 'file', type: file.type || '', size: file.size || 0, added: new Date().toISOString(), fav: false, cloud: false };
}
async function getFileBlob(f) {
  let b = await DB.get('files', f.id);
  if (!b && f.cloud && window.Cloud && Cloud.user) {
    b = await Cloud.download(f.id, f.parts, f.type);
    if (b && !S.set.cloudOnly) await DB.put('files', b, f.id);
  }
  return b || null;
}
function b64(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
}
function downloadBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
}
/* share a file (Telegram, WhatsApp… via the phone's share sheet); falls back to download */
async function shareFile(blob, name, title, text) {
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: title || name, text: text || '' }); return true; }
  } catch (e) { if (e && e.name === 'AbortError') return false; }
  downloadBlob(blob, name); toast(t('Файл сохранён в «Загрузки»')); return false;
}
async function shareText(text, url) {
  try { if (navigator.share) { await navigator.share({ text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text + (url ? '\n' + url : '')); toast(t('Скопировано')); } catch (e) { toast(text); }
}
const loadedScripts = {};
function loadScript(src) {
  if (loadedScripts[src]) return loadedScripts[src];
  loadedScripts[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete loadedScripts[src]; rej(new Error(t('Нет интернета — не удалось загрузить модуль'))); }; document.head.appendChild(s); });
  return loadedScripts[src];
}

/* ================= toast / sound / notifications ================= */
let toastT;
function toast(msg, ms = 2600) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms);
}
/* a button that shows what is happening: pressed → «…» (can't be pressed twice) → ✓ green / ✗ red */
async function withBusy(btn, fn, o = {}) {
  if (btn && btn.dataset && btn.dataset.busy) return;
  const html = btn ? btn.innerHTML : '';
  if (btn) { btn.dataset.busy = '1'; btn.disabled = true; btn.classList.add('is-busy'); btn.innerHTML = `<i class="bspin"></i> ${esc(o.busy || t('Отправляю…'))}`; }
  let res, failed = false;
  try { res = await fn(); }
  catch (e) { failed = true; toast(e && e.message ? e.message : String(e), 7000); }
  if (btn) {
    btn.classList.remove('is-busy'); btn.classList.add(failed ? 'is-fail' : 'is-ok');
    btn.innerHTML = failed ? '✗ ' + esc(t('Не получилось')) : '✓ ' + esc(o.ok || t('Готово'));
    setTimeout(() => { btn.classList.remove('is-ok', 'is-fail'); btn.innerHTML = html; btn.disabled = false; delete btn.dataset.busy; }, failed ? 3500 : 2500);
  }
  return failed ? undefined : (res === undefined ? true : res);
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, .25].forEach(x => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.001, ctx.currentTime + x); g.gain.exponentialRampToValueAtTime(.25, ctx.currentTime + x + .02); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + x + .2); o.start(ctx.currentTime + x); o.stop(ctx.currentTime + x + .22); });
    setTimeout(() => ctx.close(), 800);
  } catch (e) { }
}
async function notify(title, body, opt = {}) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    const o = { body, tag: opt.tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { id: opt.id, url: opt.url }, actions: opt.actions || [], vibrate: [200, 100, 200], renotify: true, requireInteraction: !!opt.sticky };
    if (reg) await reg.showNotification(title, o); else new Notification(title, { body });
  } catch (e) { }
}
function speak(text) {
  try {
    if (!S.set.voiceReply || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = srLang(); u.rate = 1.05; speechSynthesis.speak(u);
  } catch (e) { }
}
