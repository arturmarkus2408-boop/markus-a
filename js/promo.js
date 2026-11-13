'use strict';
/* ============================================================================
   v4.3: «Видео о программе» — the presentation film, to show MARKUS-A to people.
   The film lives on the site (media/markus-a-promo.mp4), so it plays in the app and opens
   by a link for anyone. Send: as a file (Telegram, WhatsApp… via «Поделиться»)
   or as a link in Telegram (the person opens it in the browser, nothing to install).
   ========================================================================== */
const PROMO = { file: 'media/markus-a-promo.mp4', poster: 'media/markus-a-promo.jpg', name: 'MARKUS-A — видео о программе.mp4' };
const promoUrl = () => new URL(PROMO.file, location.href.split('#')[0]).href;
const promoText = () => t('MARKUS-A — личный деловой помощник: задачи, встречи с автозаписью и AI-итогами, документы и контакты. Посмотрите видео:');
SCREENS.promo = () => {
  const b = `<div class="promo">
    <div class="promo-v"><video id="pr_v" src="${PROMO.file}" poster="${PROMO.poster}" controls playsinline preload="metadata" onerror="promoMissing()"></video></div>
    <div class="promo-t">${t('MARKUS-A за полторы минуты')}</div>
    <div class="hint">${t('Покажите знакомым, что умеет программа, или отправьте им видео.')}</div>
    <button class="btn pri full" onclick="promoTgLink()">${ic('tg', 18)} ${t('Отправить в Telegram ссылкой')}</button>
    <div class="hint">${t('Человек откроет видео по ссылке в браузере — ничего устанавливать не нужно.')}</div>
    <button class="btn ghost full" onclick="promoShareFile(this)">${ic('share', 18)} ${t('Отправить файлом (Telegram, WhatsApp…)')}</button>
    <button class="btn ghost full" style="margin-top:8px" onclick="promoCopy()">${ic('link', 18)} ${t('Скопировать ссылку')}</button>
    <div id="pr_miss"></div></div>`;
  return { top: titleTop(t('Видео о программе')), body: b };
};
function promoMissing() { const x = $('#pr_miss'); if (x) x.innerHTML = `<div class="hint warn">${t('Видео пока не загружено на сайт.')}</div>`; }
function promoTgLink() {
  const u = 'https://t.me/share/url?url=' + encodeURIComponent(promoUrl()) + '&text=' + encodeURIComponent(promoText());
  if (NATIVE && typeof NATIVE.openUrl === 'function') NATIVE.openUrl(u); else window.open(u, '_blank', 'noopener');
}
async function promoShareFile(btn) {
  await withBusy(btn, async () => {
    const r = await fetch(PROMO.file);
    if (!r.ok) throw new Error(t('Видео пока не загружено на сайт.'));
    const blob = new Blob([await r.blob()], { type: 'video/mp4' });
    shareMenu(blobSrc(blob, PROMO.name, 'MARKUS-A'));
  }, { busy: t('Готовлю видео…'), ok: t('Готово') });
}
async function promoCopy() { try { await navigator.clipboard.writeText(promoText() + ' ' + promoUrl()); toast(t('Ссылка скопирована')); } catch (e) { toast(promoUrl(), 6000); } }
