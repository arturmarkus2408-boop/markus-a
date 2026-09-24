'use strict';
const SB_URL_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

const Cloud = {
  sb: null, user: null, profile: null, busy: false, timer: null, lastError: '', lastSync: null,
  configured() { return !!(cfg.sbUrl && cfg.sbKey); },
  async init() {
    if (!Cloud.configured()) return;
    try {
      await loadScript(SB_URL_JS);
      Cloud.sb = window.supabase.createClient(cfg.sbUrl, cfg.sbKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'markus_auth' } });
      const { data } = await Cloud.sb.auth.getSession();
      Cloud.user = data.session ? data.session.user : null;
      const fromAuthLink = /access_token=|type=(magiclink|recovery|signup|invite)|[?&]code=/.test(location.hash + location.search);
      const recovery = /type=recovery/.test(location.hash + location.search);
      Cloud.sb.auth.onAuthStateChange((ev, sess) => {
        const wasLoggedOut = !Cloud.user;
        Cloud.user = sess ? sess.user : null;
        if (ev === 'PASSWORD_RECOVERY' || (recovery && ev === 'SIGNED_IN' && !Cloud._askedPw)) {
          Cloud._askedPw = true;
          setTimeout(() => Cloud.loadProfile().then(() => { go('settings'); Cloud.askNewPassword(); }), 300);
        } else if (ev === 'SIGNED_IN' && Cloud.user && wasLoggedOut && fromAuthLink) {
          Cloud.loadProfile().then(() => { toast(t('Вход выполнен ✓')); go('settings'); Cloud.sync(true); });
        } else if (S.route === 'settings') queueRender();
        if (fromAuthLink && /access_token=/.test(location.hash) && sess) history.replaceState(null, '', location.pathname);
      });
      if (Cloud.user && recovery && !Cloud._askedPw) { Cloud._askedPw = true; setTimeout(() => { go('settings'); Cloud.askNewPassword(); }, 300); }
      if (Cloud.user) { await Cloud.loadProfile(); Cloud.sync(); }
    } catch (e) { Cloud.lastError = e.message; }
  },
  schedule() { clearTimeout(Cloud.timer); Cloud.timer = setTimeout(() => Cloud.sync(), 2500); },

  /* ---------- auth ---------- */
  async signIn(email, pass) {
    if (!Cloud.sb) await Cloud.init();
    if (!Cloud.sb) throw new Error(t('Облако не настроено (config.js)'));
    const { data, error } = await Cloud.sb.auth.signInWithPassword({ email, password: pass });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? t('Неверный email или пароль') : error.message);
    Cloud.user = data.user; await Cloud.loadProfile(); await Cloud.sync(true);
  },
  async signUp(email, pass) {
    if (!Cloud.sb) await Cloud.init();
    if (!Cloud.sb) throw new Error(t('Облако не настроено (config.js)'));
    const { data, error } = await Cloud.sb.auth.signUp({ email, password: pass });
    if (error) throw new Error(error.message);
    if (!data.session) return 'confirm';
    Cloud.user = data.user; await Cloud.loadProfile(); await Cloud.sync(true);
    return 'ok';
  },
  appUrl() { return location.origin + location.pathname.replace(/index\.html$/, ''); },
  async magicLink(email) {
    if (!Cloud.sb) await Cloud.init();
    if (!Cloud.sb) throw new Error(t('Облако не настроено (config.js)'));
    const { error } = await Cloud.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: Cloud.appUrl(), shouldCreateUser: false } });
    if (error) throw new Error(/rate|limit|seconds/i.test(error.message) ? t('Слишком много писем. Бесплатный лимит — около 2 писем в час. Попробуйте позже.') : error.message);
  },
  async resetPassword(email) {
    if (!Cloud.sb) await Cloud.init();
    if (!Cloud.sb) throw new Error(t('Облако не настроено (config.js)'));
    const { error } = await Cloud.sb.auth.resetPasswordForEmail(email, { redirectTo: Cloud.appUrl() });
    if (error) throw new Error(/rate|limit|seconds/i.test(error.message) ? t('Слишком много писем. Бесплатный лимит — около 2 писем в час. Попробуйте позже.') : error.message);
  },
  async setPassword(pw) {
    if (!Cloud.user) throw new Error(t('Сначала войдите в аккаунт'));
    if (!pw || pw.length < 6) throw new Error(t('Пароль — минимум 6 символов'));
    const { error } = await Cloud.sb.auth.updateUser({ password: pw });
    if (error) throw new Error(error.message);
  },
  async askNewPassword() {
    const pw = await dialog({ title: t('Придумайте новый пароль'), text: t('Вы вошли по ссылке из письма. Задайте новый пароль — дальше входите с ним.'), html: `<input class="inp" id="np1" type="text" placeholder="${t('Новый пароль (минимум 6 символов)')}" autocomplete="new-password" style="margin-top:8px">`,
      buttons: [{ l: t('Сохранить пароль'), v: sh => { const x = sh.querySelector('#np1').value.trim(); if (x.length < 6) { toast(t('Пароль — минимум 6 символов')); return false; } return x; }, p: 1 }, { l: t('Позже'), v: null }],
      onMount: sh => setTimeout(() => { const i = sh.querySelector('#np1'); if (i) i.focus(); }, 250) });
    if (!pw) return;
    try { await Cloud.setPassword(pw); toast(t('Пароль изменён ✓ Запомните его'), 5000); } catch (e) { toast(e.message, 5000); }
  },
  async signOut() { if (Cloud.sb) await Cloud.sb.auth.signOut(); Cloud.user = null; Cloud.profile = null; await DB.del('meta', 'lastPull'); },

  /* ---------- profile ---------- */
  async loadProfile() {
    if (!Cloud.user) return;
    const tz = -new Date().getTimezoneOffset();
    let { data } = await Cloud.sb.from('profiles').select('*').eq('user_id', Cloud.user.id).maybeSingle();
    if (!data) {
      const ins = await Cloud.sb.from('profiles').upsert({ user_id: Cloud.user.id, tz_offset: tz, name: S.set.name || null }).select().maybeSingle();
      data = ins.data;
    } else if (data.tz_offset !== tz) {
      await Cloud.sb.from('profiles').update({ tz_offset: tz }).eq('user_id', Cloud.user.id);
    }
    Cloud.profile = data || null;
    if (Cloud.profile && Cloud.profile.ai_key && !S.set.aiKey) { S.set.aiKey = Cloud.profile.ai_key; saveSettings(); }
    if (Cloud.profile && !Cloud.profile.ai_key && S.set.aiKey) Cloud.saveProfile({ ai_key: S.set.aiKey });
    Cloud.savePrefs();
  },
  async saveProfile(patch) {
    if (!Cloud.user) return;
    const { data, error } = await Cloud.sb.from('profiles').update(patch).eq('user_id', Cloud.user.id).select().maybeSingle();
    if (data) Cloud.profile = data;
    return error;
  },
  /* reminder times and language are also used by the Telegram bot */
  savePrefs() {
    clearTimeout(Cloud._pt);
    Cloud._pt = setTimeout(async () => {
      if (!Cloud.user || !Cloud.sb) return;
      const st = S.set, prefs = { morningTime: st.morningTime, eveTime: st.eveTime, dayEnd: st.dayEnd, nagHours: st.nagHours, lang: st.lang };
      const err = await Cloud.saveProfile({ prefs, lang: st.lang });
      if (err) await Cloud.saveProfile({ lang: st.lang }).catch(() => { }); // migration not run yet — ignore
    }, 800);
  },

  /* ---------- sync ---------- */
  row(it) {
    const c = Object.assign({}, it); delete c._dirty;
    return {
      id: it.id, user_id: Cloud.user.id, kind: it.kind, data: c, date: it.date || null,
      remind_at: nextRemindISO(it), end_at: (isTaskKind(it) && it.date) ? endAt(it).toISOString() : null,
      deleted: !!it.deleted, updated_at: it.updated
    };
  },
  async uploadFile(f) {
    if (f.cloud) return;
    const blob = await DB.get('files', f.id); if (!blob) return;
    const { error } = await Cloud.sb.storage.from('files').upload(Cloud.user.id + '/' + f.id, blob, { upsert: true, contentType: f.type || blob.type || 'application/octet-stream' });
    if (!error) f.cloud = true;
  },
  async download(fileId) {
    if (!Cloud.sb || !Cloud.user) return null;
    const { data, error } = await Cloud.sb.storage.from('files').download(Cloud.user.id + '/' + fileId);
    return error ? null : data;
  },
  async sync(verbose) {
    if (!Cloud.sb || !Cloud.user || Cloud.busy || !navigator.onLine) return;
    Cloud.busy = true;
    try {
      const dirty = S.items.filter(i => i._dirty);
      for (const it of dirty) {
        for (const f of (it.files || [])) await Cloud.uploadFile(f);
        if (it.recording && it.recording.fileId) {
          const rf = { id: it.recording.fileId, type: it.recording.mime, cloud: it.recording.cloud };
          await Cloud.uploadFile(rf); it.recording.cloud = rf.cloud;
        }
      }
      if (dirty.length) {
        const rows = dirty.map(i => Cloud.row(i));
        for (let k = 0; k < rows.length; k += 100) {
          const { error } = await Cloud.sb.from('items').upsert(rows.slice(k, k + 100));
          if (error) throw error;
        }
        for (const it of dirty) { const cur = getItem(it.id); if (cur && cur.updated === it.updated) { delete cur._dirty; await DB.put('items', cur); } }
      }
      let since = (await DB.get('meta', 'lastPull')) || '1970-01-01T00:00:00+00:00', changed = false;
      for (let page = 0; page < 20; page++) {
        const { data, error } = await Cloud.sb.from('items').select('id,data,deleted,server_ts').gt('server_ts', since).order('server_ts', { ascending: true }).limit(500);
        if (error) throw error;
        for (const r of data) {
          since = r.server_ts;
          const inc = r.data; if (!inc) continue;
          inc.deleted = !!r.deleted;
          const loc = getItem(r.id);
          const newer = !loc || (inc.updated || '') > (loc.updated || '');
          if (newer) {
            computeReminders(inc);
            await DB.put('items', inc);
            const i = S.items.findIndex(x => x.id === inc.id); if (i >= 0) S.items[i] = inc; else S.items.push(inc);
            changed = true;
          }
        }
        if (data.length < 500) break;
      }
      await DB.put('meta', since, 'lastPull');
      Cloud.lastSync = new Date(); Cloud.lastError = '';
      if (changed) queueRender();
      if (verbose) toast(t('Синхронизировано ✓'));
    } catch (e) {
      Cloud.lastError = e.message || String(e);
      if (verbose) toast(t('Ошибка синхронизации') + ': ' + Cloud.lastError, 4000);
    } finally { Cloud.busy = false; }
  },

  /* ---------- telegram ---------- */
  async linkTelegram() {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    await Cloud.saveProfile({ tg_code: code });
    return code;
  },
  async unlinkTelegram() { await Cloud.saveProfile({ tg_chat_id: null, tg_code: null }); },
  async sendTelegram(text) {
    if (!Cloud.user) throw new Error(t('Войдите в аккаунт (Настройки → Облако)'));
    if (!Cloud.profile || !Cloud.profile.tg_chat_id) throw new Error(t('Telegram не подключён (Настройки → Telegram)'));
    const { data, error } = await Cloud.sb.functions.invoke('telegram-bot', { body: { action: 'send', text } });
    if (error) throw new Error(t('Не удалось отправить') + ': ' + (Cloud._fnErr ? Cloud._fnErr : error.message));
    if (data && data.error) throw new Error(data.error);
  },

  /* ---------- sharing ---------- */
  async createShare(it, { permission, days, code }) {
    if (!Cloud.user) throw new Error(t('Для ссылок нужен вход в облако'));
    Cloud.schedule(); await Cloud.sync();
    const secs = days ? days * 86400 : 365 * 86400;
    const files = [];
    for (const f of (it.files || [])) {
      await Cloud.uploadFile(f);
      if (f.cloud) {
        const { data } = await Cloud.sb.storage.from('files').createSignedUrl(Cloud.user.id + '/' + f.id, secs, { download: f.name });
        if (data) files.push({ name: f.name, type: f.type, size: f.size, url: data.signedUrl });
      }
    }
    const snap = {
      kind: it.kind, title: it.title, desc: it.desc, date: it.date, start: it.start, end: it.end, place: it.place,
      participants: it.participants, priority: it.priority, category: catName(catOf(it)), files, location: it.location || '', lang: S.set.lang,
      summary: it.summary ? { short: it.summary.short, decisions: it.summary.decisions, next: it.summary.next } : null,
      owner: S.set.name || ''
    };
    const token = uid() + uid();
    const row = { token, item_id: it.id, snapshot: snap, permission, code: code || null, expires_at: days ? new Date(Date.now() + secs * 1000).toISOString() : null };
    const { error } = await Cloud.sb.from('shares').insert(row);
    if (error) throw new Error(error.message);
    return location.origin + location.pathname.replace(/index\.html$/, '') + '?share=' + token;
  },
  async listShares(itemId) {
    if (!Cloud.user) return [];
    const { data } = await Cloud.sb.from('shares').select('token,permission,code,expires_at,revoked,created_at,share_comments(author,body,created_at)').eq('item_id', itemId).order('created_at', { ascending: false });
    return data || [];
  },
  async revokeShare(token) { await Cloud.sb.from('shares').update({ revoked: true }).eq('token', token); },
  async publicShare(token, code) {
    if (!Cloud.sb) { await loadScript(SB_URL_JS); Cloud.sb = window.supabase.createClient(cfg.sbUrl, cfg.sbKey, { auth: { persistSession: false } }); }
    const { data, error } = await Cloud.sb.rpc('get_share', { p_token: token, p_code: code || null });
    if (error) throw new Error(error.message);
    return data;
  },
  async publicComment(token, code, author, body) {
    const { data, error } = await Cloud.sb.rpc('add_share_comment', { p_token: token, p_code: code || null, p_author: author, p_body: body });
    if (error) throw new Error(error.message);
    return data;
  }
};
window.Cloud = Cloud;
