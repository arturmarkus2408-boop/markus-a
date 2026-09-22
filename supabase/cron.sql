-- =====================================================================
-- MARKUS-A — запуск напоминаний каждую минуту.
-- ПЕРЕД ЗАПУСКОМ замените 2 значения:
--   ВАШ_ПРОЕКТ     → ID проекта из адреса Supabase (https://ВАШ_ПРОЕКТ.supabase.co)
--   ВАШ_CRON_SECRET → тот же текст, что в секрете CRON_SECRET функций
-- Затем: Supabase → SQL Editor → вставить → Run.
-- =====================================================================
select cron.unschedule('markus-reminders') where exists (select 1 from cron.job where jobname = 'markus-reminders');

select cron.schedule(
  'markus-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://ВАШ_ПРОЕКТ.supabase.co/functions/v1/reminders',
    headers := '{"Content-Type":"application/json","x-cron-secret":"ВАШ_CRON_SECRET"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
