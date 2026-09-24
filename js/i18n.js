'use strict';
/* Russian source strings are the keys. Built-in: ru, en, uz, tr, de (see i18n-dict.js).
   Any other language: translated once by AI from English and cached on the device. */
const LANGS = [
  { c: 'ru', n: 'Русский', sr: 'ru-RU', loc: 'ru-RU' },
  { c: 'en', n: 'English', sr: 'en-US', loc: 'en-GB' },
  { c: 'uz', n: 'Oʻzbekcha', sr: 'uz-UZ', loc: 'uz-Latn-UZ' },
  { c: 'tr', n: 'Türkçe', sr: 'tr-TR', loc: 'tr-TR' },
  { c: 'de', n: 'Deutsch', sr: 'de-DE', loc: 'de-DE' }
];
const EXTRA_LANGS = [
  { c: 'kk', n: 'Қазақша', sr: 'kk-KZ', loc: 'kk-KZ' }, { c: 'ky', n: 'Кыргызча', sr: 'ky-KG', loc: 'ky-KG' },
  { c: 'tg', n: 'Тоҷикӣ', sr: 'tg-TJ', loc: 'tg-TJ' }, { c: 'az', n: 'Azərbaycanca', sr: 'az-AZ', loc: 'az-AZ' },
  { c: 'uk', n: 'Українська', sr: 'uk-UA', loc: 'uk-UA' }, { c: 'fr', n: 'Français', sr: 'fr-FR', loc: 'fr-FR' },
  { c: 'es', n: 'Español', sr: 'es-ES', loc: 'es-ES' }, { c: 'it', n: 'Italiano', sr: 'it-IT', loc: 'it-IT' },
  { c: 'pt', n: 'Português', sr: 'pt-PT', loc: 'pt-PT' }, { c: 'pl', n: 'Polski', sr: 'pl-PL', loc: 'pl-PL' },
  { c: 'nl', n: 'Nederlands', sr: 'nl-NL', loc: 'nl-NL' }, { c: 'zh', n: '中文', sr: 'zh-CN', loc: 'zh-CN' },
  { c: 'ja', n: '日本語', sr: 'ja-JP', loc: 'ja-JP' }, { c: 'ko', n: '한국어', sr: 'ko-KR', loc: 'ko-KR' },
  { c: 'hi', n: 'हिन्दी', sr: 'hi-IN', loc: 'hi-IN' }
];
const I18N = window.I18N_DICT || {};
let AI_DICT = null;
const langCode = () => (S.set && S.set.lang) || 'ru';
const langInfo = c => LANGS.concat(EXTRA_LANGS).find(l => l.c === (c || langCode())) || LANGS[0];
function locale() { return langInfo().loc; }
function srLang() { return langInfo().sr; }
function langName(c) { return langInfo(c).n; }
function t(key, vars) {
  let s = key;
  const L = langCode();
  if (L !== 'ru') {
    const d = I18N[L] || AI_DICT;
    s = (d && d[key]) || (I18N.en && I18N.en[key]) || key;
  }
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : m);
  return s;
}
/* plural: key is Russian "one|few|many" (e.g. 'задача|задачи|задач'); other languages store "one|other" */
function tn(n, key) {
  const L = langCode();
  if (L === 'ru') { const [a, b, c] = key.split('|'); return plural(n, a, b, c); }
  const f = t(key).split('|');
  let one = true; try { one = new Intl.PluralRules(locale()).select(n) === 'one'; } catch (e) { one = n === 1; }
  return (one ? f[0] : (f[1] || f[0]));
}
function loadAIDict(code) {
  AI_DICT = null;
  if (I18N[code] || code === 'ru') return true;
  try { AI_DICT = JSON.parse(localStorage.getItem('markus_dict_' + code) || 'null'); } catch (e) { }
  return !!AI_DICT;
}
async function translateUI(code) {
  const info = langInfo(code);
  if (!AI.ready()) throw new Error(t('Для этого языка нужен ключ AI (Настройки → AI)'));
  const en = I18N.en || {};
  const keys = Object.keys(en);
  const out = {};
  for (let i = 0; i < keys.length; i += 120) {
    const chunk = {}; keys.slice(i, i + 120).forEach(k => chunk[k] = en[k]);
    toast(t('Перевожу интерфейс…') + ' ' + Math.min(100, Math.round((i + 120) / keys.length * 100)) + '%', 20000);
    const r = await AI.call([{ text: `Translate the values of this JSON (UI strings of a planner app) from English to ${info.n} (${code}). Keep JSON keys unchanged. Keep {placeholders}, emoji and the "|" separator (singular|plural) exactly. Short, natural UI wording. Return only JSON.\n${JSON.stringify(chunk)}` }], { json: true, temp: 0 });
    Object.assign(out, r);
  }
  localStorage.setItem('markus_dict_' + code, JSON.stringify(out));
  AI_DICT = out;
}
async function setLang(code) {
  if (code !== 'ru' && !I18N[code] && !loadAIDict(code)) {
    try { await translateUI(code); } catch (e) { toast(e.message, 5000); return; }
  }
  S.set.lang = code; saveSettings(); loadAIDict(code);
  document.documentElement.lang = code;
  toast(t('Язык изменён'));
  render();
}
