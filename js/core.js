'use strict';
/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const clone = o => JSON.parse(JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mb = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round((b || 0) / 1024)) + ' КБ';
function fmtDur(sec) { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s); }
function durLabel(min) { if (min < 60) return min + ' мин'; const h = Math.floor(min / 60), m = min % 60; return h + ' ч' + (m ? ' ' + m + ' мин' : ''); }
function plural(n, a, b, c) { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return a; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b; return c; }

/* ================= dates (local time) ================= */
const D = {
  MG: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  M: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  DOW: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  DOWF: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
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
  human(s) {
    if (!s) return 'Без даты';
    const t = D.today();
    if (s === t) return 'Сегодня';
    if (s === D.add(t, 1)) return 'Завтра';
    if (s === D.add(t, 2)) return 'Послезавтра';
    if (s === D.add(t, -1)) return 'Вчера';
    const d = D.parse(s);
    return d.getDate() + ' ' + D.MG[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
  },
  short(s) { const d = D.parse(s); return d.getDate() + ' ' + D.MG[d.getMonth()]; },
  long(s) { const d = D.parse(s); return d.getDate() + ' ' + D.MG[d.getMonth()] + ' ' + d.getFullYear() + ', ' + D.DOWF[d.getDay()]; },
  weekStart(s) { const d = D.parse(s); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return D.fmt(d); },
  diffDays(a, b) { return Math.round((D.parse(b) - D.parse(a)) / 86400000); }
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
      const t = DB.db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      let out;
      if (req) req.onsuccess = () => { out = req.result; };
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  },
  all(store) { return DB.tx(store, 'readonly', s => s.getAll()); },
  get(store, key) { return DB.tx(store, 'readonly', s => s.get(key)); },
  put(store, val, key) { return DB.tx(store, 'readwrite', s => key !== undefined ? s.put(val, key) : s.put(val)); },
  del(store, key) { return DB.tx(store, 'readwrite', s => s.delete(key)); }
};

/* ================= state & settings ================= */
const DEFAULTS = {
  name: '', theme: 'light', workStart: '09:00', workEnd: '19:00', defaultDur: 60, defaultRemind: [30],
  aiKey: '', aiModel: 'gemini-2.5-flash', voiceReply: true, autoTasks: 'confirm',
  sbUrl: '', sbKey: '', botName: '',
  categories: [
    { id: 'work', name: 'Работа', color: '#3b82f6' },
    { id: 'meet', name: 'Встреча', color: '#8b5cf6' },
    { id: 'client', name: 'Клиент', color: '#22c55e' },
    { id: 'personal', name: 'Личное', color: '#ef4444' },
    { id: 'project', name: 'Проект', color: '#f59e0b' }
  ],
  noteCats: ['Идеи', 'Работа', 'Личные', 'Документы']
};
const S = { items: [], set: null, route: 'home', calView: 'day', selDate: null, taskFilter: 'today', noteCat: 'all', noteQ: '', docFilter: 'all', docQ: '', meetingId: null, meetTab: 'short', meetList: 'up', showPast: false, scrollCal: true };
const SET_KEY = 'markus_settings';
function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(SET_KEY) || '{}'); } catch (e) { }
  S.set = Object.assign(clone(DEFAULTS), s);
  if (!Array.isArray(S.set.categories) || !S.set.categories.length) S.set.categories = clone(DEFAULTS.categories);
}
function saveSettings() { localStorage.setItem(SET_KEY, JSON.stringify(S.set)); }
const cfg = {
  get sbUrl() { return (S.set.sbUrl || (window.MARKUS_CONFIG || {}).SUPABASE_URL || '').trim().replace(/\/+$/, ''); },
  get sbKey() { return (S.set.sbKey || (window.MARKUS_CONFIG || {}).SUPABASE_KEY || '').trim(); },
  get bot() { return (S.set.botName || (window.MARKUS_CONFIG || {}).TELEGRAM_BOT || '').replace('@', '').trim(); }
};

/* ================= items ================= */
function newItem(kind, over) {
  const now = new Date().toISOString();
  const it = {
    id: uid(), kind, title: '', desc: '',
    date: kind === 'note' ? null : (S.selDate || D.today()),
    start: null, end: null, priority: 'normal', status: 'todo',
    category: kind === 'meeting' ? 'meet' : 'work', noteCat: kind === 'note' ? 'Идеи' : null,
    subtasks: [], repeat: { type: 'none' }, reminders: kind === 'note' ? [] : clone(S.set.defaultRemind || []),
    customRemind: null, remindTimes: [], participants: [], place: '', files: [], fav: false,
    autoRecord: false, recording: null, transcript: '', summary: null, proposed: [], linked: [],
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
    b = await Cloud.download(f.id);
    if (b) await DB.put('files', b, f.id);
  }
  return b || null;
}
function b64(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
}
function downloadBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
const loadedScripts = {};
function loadScript(src) {
  if (loadedScripts[src]) return loadedScripts[src];
  loadedScripts[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete loadedScripts[src]; rej(new Error('Не удалось загрузить ' + src)); }; document.head.appendChild(s); });
  return loadedScripts[src];
}

/* ================= toast / sound / notifications ================= */
let toastT;
function toast(msg, ms = 2600) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms);
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, .25].forEach(t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(.25, ctx.currentTime + t + .02); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t + .2); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .22); });
    setTimeout(() => ctx.close(), 800);
  } catch (e) { }
}
async function notify(title, body, opt = {}) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    const o = { body, tag: opt.tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { id: opt.id, url: opt.url }, actions: opt.actions || [], vibrate: [200, 100, 200], renotify: true };
    if (reg) await reg.showNotification(title, o); else new Notification(title, { body });
  } catch (e) { }
}
function speak(text) {
  try {
    if (!S.set.voiceReply || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'ru-RU'; u.rate = 1.05; speechSynthesis.speak(u);
  } catch (e) { }
}
