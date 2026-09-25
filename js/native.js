'use strict';
/* ============================================================================
   MARKUS-A for Android (the installed app, MARKUS-A.apk).
   The app shows this same website inside itself and adds "MarkusNative":
   recording by Android itself (works with a locked screen, starts on its own),
   exact reminders, voice in/out, sharing and saving files.
   In a normal browser NATIVE is null and nothing in this file changes anything.
   ========================================================================== */

/* events from Android → web: window.__native.emit(name, data) */
window.__native = {
  h: {},
  on(ev, f) { (this.h[ev] = this.h[ev] || []).push(f); },
  emit(ev, d) { (this.h[ev] || []).slice().forEach(f => { try { f(d || {}); } catch (e) { console.error(e); } }); }
};

if (NATIVE) {
  /* ---------- speech recognition (Android's own, the WebView has none) ---------- */
  class NativeSR {
    constructor() { this.lang = 'ru-RU'; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1; this.onresult = this.onerror = this.onend = this.onstart = null; this._on = false; }
    start() {
      if (NativeSR.cur && NativeSR.cur !== this) NativeSR.cur._finish(true);
      NativeSR.cur = this; this._on = true;
      try { NATIVE.listen(this.lang || 'ru-RU'); } catch (e) { this._finish(); return; }
      if (this.onstart) this.onstart({});
    }
    stop() { if (NativeSR.cur === this) { try { NATIVE.stopListen(); } catch (e) { } } }
    abort() { if (NativeSR.cur === this) this._finish(true); }
    _finish(cancel) {
      if (!this._on) return;
      this._on = false;
      if (cancel) { try { NATIVE.cancelListen(); } catch (e) { } }
      if (NativeSR.cur === this) NativeSR.cur = null;
      if (this.onend) this.onend({});
    }
    _ev(d) {
      if (d.type === 'partial' || d.type === 'result') {
        const fin = d.type === 'result';
        if (!fin && !this.interimResults) return;
        const r = [{ transcript: d.text || '', confidence: 1 }]; r.isFinal = fin;
        if (this.onresult) this.onresult({ resultIndex: 0, results: [r] });
      } else if (d.type === 'error') { if (this.onerror) this.onerror({ error: d.error || 'aborted' }); }
      else if (d.type === 'end') this._finish();
    }
  }
  NativeSR.cur = null;
  window.__native.on('sr', d => { if (NativeSR.cur) NativeSR.cur._ev(d); });
  window.SpeechRecognition = NativeSR; window.webkitSpeechRecognition = NativeSR;

  /* ---------- keep the screen on (driving mode, waiting for a recording) ---------- */
  let wakeCount = 0;
  const wakeLock = {
    async request() {
      wakeCount++; NATIVE.keepScreenOn(true);
      const s = { released: false, type: 'screen', addEventListener() { }, removeEventListener() { },
        async release() { if (s.released) return; s.released = true; wakeCount = Math.max(0, wakeCount - 1); if (!wakeCount) NATIVE.keepScreenOn(false); } };
      return s;
    }
  };
  /* ---------- clipboard, sharing ---------- */
  const clipboard = { readText: async () => NATIVE.clipboard() || '', writeText: async x => { NATIVE.setClipboard(String(x == null ? '' : x)); } };
  const share = async d => {
    d = d || {};
    const files = Array.from(d.files || []);
    const text = [d.text, d.url].filter(Boolean).join('\n');
    if (!files.length) { NATIVE.shareText(text || d.title || ''); return; }
    const hs = [];
    for (const f of files) hs.push(await nativePut(f, f.name));
    if (NATIVE.fileShareAll(JSON.stringify(hs), text, d.title || '') !== 'ok') throw new Error(t('Не удалось отправить'));
  };
  const def = (k, v) => { try { Object.defineProperty(navigator, k, { value: v, configurable: true, writable: true }); } catch (e) { } };
  def('wakeLock', wakeLock); def('clipboard', clipboard); def('share', share); def('canShare', () => true);

  /* ---------- links and files opened with window.open ---------- */
  const origOpen = window.open.bind(window);
  window.open = (url, target, feat) => {
    const u = String(url || '');
    if (u.startsWith('blob:')) { fetch(u).then(r => r.blob()).then(b => nativeFile(b, 'MARKUS-A' + extFor(b.type), 'open')).catch(() => toast(t('Не удалось открыть файл'))); return null; }
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) && !u.startsWith(location.origin + '/markus-a')) { NATIVE.openUrl(u); return null; }
    return origOpen(url, target, feat);
  };
}

function extFor(mime) {
  const m = String(mime || '').split(';')[0];
  return ({ 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'audio/mp4': '.m4a', 'audio/mpeg': '.mp3', 'audio/webm': '.webm', 'audio/ogg': '.ogg', 'video/mp4': '.mp4', 'text/plain': '.txt', 'text/html': '.html', 'application/json': '.json',
    'application/msword': '.doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx', 'application/vnd.ms-excel': '.xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx' })[m] || '';
}

/* copy a file into the app so Android can share / open / save it (in pieces, the bridge only carries text) */
async function nativePut(blob, name) {
  const h = NATIVE.fileBegin(name || ('MARKUS-A' + extFor(blob.type)), blob.type || '');
  const CH = 768 * 1024;
  for (let o = 0; o < blob.size; o += CH) {
    const part = await b64(blob.slice(o, o + CH));
    if (!NATIVE.fileAppend(h, part)) throw new Error(t('Мало места в памяти телефона'));
  }
  return h;
}
async function nativeFile(blob, name, how, title) {
  try {
    const h = await nativePut(blob, name);
    if (how === 'save') { const ok = NATIVE.fileSave(h) === 'ok'; toast(ok ? t('Сохранено в телефон: Загрузки → MARKUS-A') : t('Не удалось сохранить файл'), 3500); return ok; }
    if (how === 'open') return NATIVE.fileOpen(h) === 'ok';
    return NATIVE.fileShare(h, title || name) === 'ok';
  } catch (e) { toast(e.message || t('Ошибка'), 4000); return false; }
}

/* ---------- schedule for Android: auto-recordings and reminders (they fire with the app closed) ---------- */
let nativeSyncT = null, nativeTest = null;
function nativeSyncSoon() { if (!NATIVE) return; clearTimeout(nativeSyncT); nativeSyncT = setTimeout(nativeSync, 700); }
function nativeSync() {
  if (!NATIVE) return;
  const now = Date.now(), lim = now + 31 * 86400000, recs = [], rem = [];
  for (const it of S.items) {
    if (it.deleted || !isOpen(it)) continue;
    if (it.kind === 'meeting' && it.autoRecord && !it.recording && it.date && it.start) {
      const start = startAt(it).getTime() - (+S.set.recPre || 0) * 60000;
      const stop = D.dt(it.date, it.end || D.addMin(it.start, S.set.defaultDur || 60)).getTime() + (+S.set.recPost || 0) * 60000;
      if (stop > now && start < lim) recs.push({ id: it.id, title: it.title || '', start, stop: Math.min(stop, start + (+S.set.recMaxMin || 180) * 60000 + 6 * 3600000) });
    }
    for (const iso of (it.remindTimes || [])) {
      const ms = Date.parse(iso);
      if (!(ms > now - 60000) || ms > lim) continue;
      const lab = it.remindLabels && it.remindLabels[iso];
      if (lab && lab.startsWith('🎙')) continue;   // the phone starts these recordings by itself
      rem.push({ id: it.id, at: ms, title: lab ? '🔔 ' + it.title : reminderTitle(it), body: lab || [whenLabel(it), it.place].filter(Boolean).join(' · ') || 'MARKUS-A' });
    }
  }
  if (nativeTest && nativeTest.stop > now) recs.push(nativeTest); else nativeTest = null;
  rem.sort((a, b) => a.at - b.at);
  try { NATIVE.schedule(JSON.stringify({ recs, rem: rem.slice(0, 200) })); } catch (e) { }
}

/* ---------- recordings made by Android → into the meeting (then AI summary as usual) ---------- */
let nativeImporting = false;
async function nativeImport() {
  if (!NATIVE || nativeImporting) return 0;
  nativeImporting = true;
  let n = 0;
  try {
    let list = [];
    try { list = JSON.parse(NATIVE.pending() || '[]'); } catch (e) { }
    for (const r of list) {
      const CH = 768 * 1024, parts = [];
      for (let off = 0; ; ) {
        const s = NATIVE.readChunk(r.file, off, CH);
        if (!s) break;
        const bin = atob(s), u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        parts.push(u); off += u.length;
        if (u.length < CH) break;
        if (parts.length % 8 === 0) await sleep(0);
      }
      const blob = new Blob(parts, { type: 'audio/mp4' });
      if (!blob.size) { NATIVE.recDone(r.file); continue; }
      let m = getItem(r.id);
      if (!m || m.deleted) {
        const st = new Date(r.started || Date.now()), tm = pad(st.getHours()) + ':' + pad(st.getMinutes());
        m = newItem('meeting', { title: r.title || (t('Запись') + ' ' + D.short(D.fmt(st)) + ' ' + tm), date: D.fmt(st), start: tm, end: D.addMin(tm, Math.max(15, Math.round((r.dur || 0) / 60000))), reminders: [], autoRecord: false, category: 'meet' });
        if (r.id) m.id = r.id;
        await saveItem(m, { render: false });
      }
      await afterRecording(m.id, blob, 'audio/mp4', (r.dur || 0) / 1000, { auto: true });
      NATIVE.recDone(r.file);
      n++;
    }
  } catch (e) { console.error(e); }
  finally { nativeImporting = false; }
  if (n) nativeSyncSoon();
  return n;
}

/* ---------- phone settings needed for recording on a locked screen ---------- */
function nativeSetup() { try { return JSON.parse(NATIVE.setup()); } catch (e) { return {}; } }
function nativeInfo() { try { return JSON.parse(NATIVE.info()); } catch (e) { return {}; } }
const NATIVE_STEPS = [
  ['mic', 'Микрофон', 'Без него запись невозможна'],
  ['notif', 'Уведомления', 'Напоминания и сообщения о записи'],
  ['fsi', 'Полноэкранные уведомления', 'Чтобы запись начиналась на заблокированном телефоне'],
  ['overlay', 'Поверх других приложений', 'Чтобы запись начиналась, когда открыто другое приложение'],
  ['battery', 'Батарея: без ограничений', 'Чтобы Android не «усыплял» приложение'],
  ['exact', 'Будильники и напоминания', 'Чтобы запись и напоминания срабатывали минута в минуту']
];
function nativeMissing() { const s = nativeSetup(); return NATIVE_STEPS.filter(([k]) => s[k] === false); }
function nativeSettingsCard() {
  const s = nativeSetup(), inf = nativeInfo();
  const rows = NATIVE_STEPS.map(([k, l, d]) => `<div class="sw-row"><div><b>${s[k] === false ? '⚠️' : '✅'} ${t(l)}</b><span>${t(d)}</span></div>${s[k] === false ? `<button class="chip-btn" onclick="NATIVE.openSetup('${k}')">${t('Включить')}</button>` : ''}</div>`).join('');
  return `<div class="set-card">${rows}
    <div class="hint">${t('Запись идёт через Android: начинается сама по расписанию встречи, даже если телефон заблокирован и приложение закрыто, и сама останавливается. После каждого пункта нажмите «Назад», чтобы вернуться сюда.')}</div>
    <div class="btns"><button class="btn ghost" onclick="nativeTestRec()">${ic('rec', 16)} ${t('Проверить автозапись (через 1 минуту)')}</button><button class="btn ghost" onclick="NATIVE.openSetup('app')">${ic('settings', 16)} ${t('Все настройки приложения')}</button></div>
    <div class="hint">${t('Приложение')} ${esc(inf.version || '')} · Android ${esc(inf.sdk || '')} · ${esc(inf.model || '')}</div></div>`;
}
async function nativeTestRec() {
  const miss = nativeMissing();
  if (miss.length) {
    const v = await dialog({ title: t('Не всё включено'), text: esc(t('Сначала включите:') + ' ' + miss.map(x => t(x[1])).join(', ')), buttons: [{ l: t('Всё равно проверить'), v: 1 }, { l: t('Закрыть'), v: 0, p: 1 }] });
    if (!v) return;
  }
  const now = Date.now(), st = new Date(now + 60000), tm = pad(st.getHours()) + ':' + pad(st.getMinutes());
  const m = newItem('meeting', { title: t('Тест автозаписи'), date: D.fmt(st), start: tm, end: D.addMin(tm, 1), reminders: [], autoRecord: false, category: 'meet' });
  m.test = true;
  await saveItem(m, { render: false });
  nativeTest = { id: m.id, title: m.title, start: now + 60000, stop: now + 120000 };
  nativeSync();
  await dialog({ title: t('Тест автозаписи'), text: esc(t('Сейчас заблокируйте телефон и положите его. Через 1 минуту запись начнётся сама (экран может мигнуть на секунду), ещё через минуту — остановится. Потом откройте MARKUS-A: запись будет во встрече «Тест автозаписи».')), buttons: [{ l: t('Понятно'), v: 1, p: 1 }] });
}

/* ---------- start-up inside the Android app ---------- */
function nativeInstall() {
  if (!NATIVE) return;
  document.documentElement.classList.add('in-app');
  // notifications: Android's own (the WebView has no web notifications)
  window.notify = async (title, body, opt = {}) => { try { NATIVE.notify(String(title || ''), String(body || ''), opt.tag || '', opt.id || ''); } catch (e) { } };
  window.downloadBlob = (blob, name) => { nativeFile(blob, name, 'save'); };
  // voice out
  window.speak = text => { try { if (S.set.voiceReply) NATIVE.speak(JSON.stringify(speechChunks(text)), srLang(), 1.05); } catch (e) { } };
  Speech.say = (text, o = {}) => {
    Speech.stop();
    const chunks = speechChunks(text); if (!chunks.length) return;
    Speech.on = true; Speech._end = o.onend || null;
    try { NATIVE.speak(JSON.stringify(chunks), srLang(), +S.set.speechRate || 1); } catch (e) { Speech.on = false; }
    driveStatus(text);
  };
  Speech.stop = () => { try { NATIVE.stopSpeak(); } catch (e) { } Speech.on = false; Speech._end = null; };
  __native.on('tts-done', () => { if (!Speech.on) return; Speech.on = false; const f = Speech._end; Speech._end = null; if (f) f(); driveStatus(); });
  // keep Android's schedule up to date after every change
  const save0 = saveItem;
  window.saveItem = async (...a) => { const r = await save0(...a); nativeSyncSoon(); return r; };
  const sync0 = Cloud.sync;
  Cloud.sync = async (...a) => { const r = await sync0.apply(Cloud, a); nativeSyncSoon(); return r; };
  const set0 = saveSettings;
  window.saveSettings = (...a) => { const r = set0(...a); nativeSyncSoon(); return r; };
  // events from Android
  __native.on('rec', d => { if (d.state === 'stopped') { if (Rec.active && Rec.active.native) Rec.nativeEnded(); else nativeImport(); } else Rec.syncNative(); });
  __native.on('resume', () => { Rec.syncNative(); nativeImport(); nativeSyncSoon(); if (typeof tick === 'function') tick(); if (S.route === 'settings') render(); });
  __native.on('perm', () => { if (S.route === 'settings') render(); });
  __native.on('toast', d => toast(d.text || '', 3500));
}
async function nativeBoot() {
  if (!NATIVE) return;
  Rec.syncNative();
  await nativeImport();
  nativeSync();
  if (!localStorage.getItem('markus_native_setup') && nativeMissing().length) {
    localStorage.setItem('markus_native_setup', '1');
    const v = await dialog({ title: t('Настройте телефон для автозаписи'), text: esc(t('Чтобы встречи записывались сами, даже на заблокированном телефоне, приложению нужно несколько разрешений. Это займёт 1 минуту.')), buttons: [{ l: t('Настроить'), v: 1, p: 1 }, { l: t('Позже'), v: 0 }] });
    if (v) { go('settings'); setTimeout(() => { const el = document.getElementById('nativeSec'); if (el) el.scrollIntoView({ block: 'start' }); }, 200); }
  }
}
