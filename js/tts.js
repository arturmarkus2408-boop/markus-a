'use strict';
/* ============================================================================
   v4.0 — answers read aloud with a natural Gemini voice (male «Charon» by default),
   with a player that is always visible: ⏸ pause / ▶ continue / ■ stop.
   If the Gemini voice is not available (no key, daily limit, no internet) the phone's
   own voice reads instead — the controls stay the same.
   ========================================================================== */
const TTS_VOICES = [['Charon', 'Мужской — спокойный (как в Gemini)'], ['Orus', 'Мужской — уверенный'], ['Puck', 'Мужской — бодрый'], ['Kore', 'Женский — спокойный'], ['Aoede', 'Женский — лёгкий'], ['device', 'Голос телефона (без интернета)']];
const TTS_MODELS = ['gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-tts', 'gemini-2.5-pro-preview-tts'];
const TTS = {
  on: false, paused: false, audio: null, token: 0, engine: '', warned: false, label: '', cache: new Map(), badModel: {},
  /* markdown and emoji are not read aloud */
  clean(x) {
    return String(x || '').replace(/```[\s\S]*?```/g, ' ').replace(/https?:\/\/\S+/g, '')
      .replace(/^#{1,6}\s*/gm, '').replace(/\*\*|__|`|\*/g, '').replace(/^\s*[-•]\s+/gm, '')
      .replace(/\p{Extended_Pictographic}/gu, '').replace(/[ \t]+/g, ' ').trim();
  },
  /* the first piece is short, so the voice starts quickly; the rest in bigger pieces */
  chunks(text) {
    const parts = TTS.clean(text).split(/(?<=[.!?…:;])\s+|\n+/).map(s => s.trim()).filter(Boolean);
    const out = []; let cur = '';
    for (const p of parts) {
      const lim = out.length ? 650 : 220;
      if (cur && (cur + ' ' + p).length > lim) { out.push(cur); cur = p; } else cur = cur ? cur + ' ' + p : p;
    }
    if (cur) out.push(cur);
    return out;
  },
  voice() { return S.set.ttsVoice || 'Charon'; },
  async fetch(text) {
    const k = TTS.voice() + '|' + text;
    if (TTS.cache.has(k)) return TTS.cache.get(k);
    let lastErr;
    for (const model of TTS_MODELS) {
      if (TTS.badModel[model]) continue;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(AI.key())}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS.voice() } } } } })
      });
      if (r.status === 404 || r.status === 400) { TTS.badModel[model] = 1; lastErr = new Error('model ' + r.status); continue; }
      if (!r.ok) { const e = new Error(r.status === 429 ? t('Лимит голоса Gemini на сегодня исчерпан') : 'TTS ' + r.status); e.status = r.status; throw e; }
      const d = await r.json();
      const part = (((d.candidates || [])[0] || {}).content || {}).parts || [];
      const inl = (part.find(p => p.inlineData) || {}).inlineData;
      if (!inl || !inl.data) { lastErr = new Error('no audio'); continue; }
      const rate = +((inl.mimeType || '').match(/rate=(\d+)/) || [0, 24000])[1];
      const blob = pcmToWav(inl.data, rate);
      TTS.cache.set(k, blob); if (TTS.cache.size > 40) TTS.cache.delete(TTS.cache.keys().next().value);
      return blob;
    }
    throw lastErr || new Error('TTS');
  },
  play(blob, my) {
    return new Promise(res => {
      const a = new Audio(URL.createObjectURL(blob)); TTS.audio = a;
      a.onended = () => { URL.revokeObjectURL(a.src); res(); };
      a.onerror = () => res();
      if (my !== TTS.token) return res();
      a.play().catch(() => res());
    });
  },
  async say(text, o = {}) {
    TTS.stop();
    const my = ++TTS.token;
    TTS.on = true; TTS.paused = false; TTS.label = o.label || ''; TTS.owner = o.owner || null; TTS.onend = o.onend || null;
    ttsBar();
    const chunks = TTS.chunks(text);
    if (!chunks.length) return TTS.done(my);
    if (TTS.voice() !== 'device' && AI.ready() && navigator.onLine !== false) {
      TTS.engine = 'gemini'; ttsBar();
      let i = 0;
      try {
        let next = TTS.fetch(chunks[0]);
        for (; i < chunks.length; i++) {
          const blob = await next;
          if (my !== TTS.token) return;
          next = i + 1 < chunks.length ? TTS.fetch(chunks[i + 1]) : null;
          if (next) next.catch(() => { });
          await TTS.play(blob, my);
          while (TTS.paused && my === TTS.token) await sleep(200);   // «пауза» — wait here
          if (my !== TTS.token) return;
        }
        return TTS.done(my);
      } catch (e) {
        if (my !== TTS.token) return;
        if (!TTS.warned) { TTS.warned = true; toast((e.status === 429 ? e.message : t('Голос Gemini сейчас недоступен')) + ' — ' + t('читаю голосом телефона'), 4500); }
        text = chunks.slice(i).join(' ');   // continue from where the Gemini voice stopped
      }
    }
    // the phone's own voice
    TTS.engine = 'device'; ttsBar();
    Speech.say(TTS.clean(text), { onend: () => TTS.done(my) });
  },
  pause() {
    if (!TTS.on) return;
    if (TTS.engine === 'gemini' && TTS.audio) {
      TTS.paused = !TTS.paused;
      if (TTS.paused) TTS.audio.pause(); else TTS.audio.play().catch(() => { });
    } else if (!NATIVE && window.speechSynthesis) {
      TTS.paused = !TTS.paused;
      try { TTS.paused ? speechSynthesis.pause() : speechSynthesis.resume(); } catch (e) { }
    } else return TTS.stop();   // the phone's voice in the app cannot pause — stop instead
    ttsBar();
  },
  stop() {
    TTS.token++;
    if (TTS.audio) { try { TTS.audio.pause(); } catch (e) { } TTS.audio = null; }
    try { Speech.stop(); } catch (e) { }
    const was = TTS.on; TTS.on = false; TTS.paused = false;
    if (was) { ttsBar(); if (typeof chatRedraw === 'function' && S.route === 'chat') chatRedraw(); }
  },
  done(my) { if (my !== TTS.token) return; TTS.on = false; TTS.paused = false; TTS.audio = null; ttsBar(); if (TTS.onend) TTS.onend(); if (typeof chatRedraw === 'function' && S.route === 'chat') chatRedraw(); }
};
/* Gemini returns raw 16-bit PCM — wrap it into a WAV file the phone can play */
function pcmToWav(b64data, rate = 24000) {
  const bin = atob(b64data), n = bin.length, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n, true);
  const u8 = new Uint8Array(buf, 44); for (let i = 0; i < n; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: 'audio/wav' });
}
/* the player — on top of everything, on every screen, while something is being read */
function ttsBar() {
  let b = document.getElementById('ttsBar');
  if (!TTS.on) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'ttsBar'; b.className = 'tts-bar'; document.body.appendChild(b); }
  const canPause = TTS.engine === 'gemini' || (TTS.engine === 'device' && !NATIVE);
  b.innerHTML = `<span class="tts-eq ${TTS.paused ? 'off' : ''}"><i></i><i></i><i></i></span><span class="tts-l">${esc(TTS.paused ? t('Пауза') : TTS.engine === 'gemini' || !TTS.engine ? t('Отвечаю голосом…') : t('Читаю вслух…'))}</span>
    ${canPause ? `<button onclick="TTS.pause()" aria-label="${esc(t('Пауза'))}">${ic(TTS.paused ? 'play' : 'pause', 18)}</button>` : ''}<button onclick="TTS.stop()" aria-label="${esc(t('Стоп'))}"><i class="tts-sq"></i></button>`;
}
