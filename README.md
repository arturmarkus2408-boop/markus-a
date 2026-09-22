# MARKUS-A

Личный AI-помощник: календарь, задачи, встречи с записью и AI-итогами, заметки, документы, Telegram-бот.

Установка — см. **ИНСТРУКЦИЯ.md**.

Структура:
- `index.html`, `css/`, `js/`, `icons/`, `sw.js`, `manifest.json` — приложение (PWA, работает офлайн)
- `config.js` — адрес облака и имя бота (заполняется один раз)
- `supabase/schema.sql` — база данных; `supabase/cron.sql` — расписание напоминаний
- `supabase/functions/telegram-bot` — Telegram-бот; `supabase/functions/reminders` — напоминания
