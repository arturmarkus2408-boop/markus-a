-- =====================================================================
-- MARKUS-A — схема базы данных Supabase
-- Выполните ВЕСЬ этот файл один раз: Supabase → SQL Editor → New query →
-- вставьте текст → Run. Повторный запуск безопасен.
-- =====================================================================

-- ---------- Задачи, встречи, заметки ----------
create table if not exists public.items (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null,
  data        jsonb not null,
  date        text,
  remind_at   timestamptz,
  end_at      timestamptz,
  overdue_key text,
  deleted     boolean not null default false,
  updated_at  timestamptz,
  server_ts   timestamptz not null default now()
);
create index if not exists items_user_ts   on public.items (user_id, server_ts);
create index if not exists items_user_date on public.items (user_id, date);
create index if not exists items_remind    on public.items (remind_at) where remind_at is not null and deleted = false;
create index if not exists items_end       on public.items (end_at) where deleted = false;

create or replace function public.markus_touch() returns trigger
language plpgsql as $$ begin new.server_ts := clock_timestamp(); return new; end $$;
drop trigger if exists items_touch on public.items;
create trigger items_touch before insert or update on public.items
  for each row execute function public.markus_touch();

alter table public.items enable row level security;
drop policy if exists "items own" on public.items;
create policy "items own" on public.items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Профиль (Telegram, часовой пояс, ключ AI) ----------
create table if not exists public.profiles (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  name       text,
  tz_offset  int default 300,
  tg_chat_id bigint,
  tg_code    text,
  pending    jsonb,
  ai_key     text,
  created_at timestamptz default now()
);
create unique index if not exists profiles_tg_chat on public.profiles (tg_chat_id) where tg_chat_id is not null;
alter table public.profiles enable row level security;
drop policy if exists "profiles own" on public.profiles;
create policy "profiles own" on public.profiles for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Ссылки «Поделиться» ----------
create table if not exists public.shares (
  token      text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id    text,
  snapshot   jsonb not null,
  permission text not null default 'view' check (permission in ('view','comment')),
  code       text,
  expires_at timestamptz,
  revoked    boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists shares_item on public.shares (user_id, item_id);
alter table public.shares enable row level security;
drop policy if exists "shares own" on public.shares;
create policy "shares own" on public.shares for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.share_comments (
  id         bigserial primary key,
  token      text not null references public.shares(token) on delete cascade,
  author     text,
  body       text not null,
  created_at timestamptz default now()
);
alter table public.share_comments enable row level security;
drop policy if exists "comments owner read" on public.share_comments;
create policy "comments owner read" on public.share_comments for select to authenticated
  using (exists (select 1 from public.shares s where s.token = share_comments.token and s.user_id = auth.uid()));

-- Открыть ссылку (для получателя без аккаунта)
create or replace function public.get_share(p_token text, p_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.shares;
begin
  select * into s from public.shares where token = p_token;
  if not found or s.revoked or (s.expires_at is not null and s.expires_at < now()) then
    return jsonb_build_object('error', 'not_found');
  end if;
  if s.code is not null and s.code <> '' then
    if p_code is null or p_code = '' then return jsonb_build_object('error', 'code_required'); end if;
    if p_code <> s.code then return jsonb_build_object('error', 'bad_code'); end if;
  end if;
  return jsonb_build_object(
    'snapshot', s.snapshot, 'permission', s.permission, 'expires_at', s.expires_at,
    'comments', case when s.permission = 'comment' then coalesce((
      select jsonb_agg(jsonb_build_object('author', c.author, 'body', c.body, 'created_at', c.created_at) order by c.id)
      from public.share_comments c where c.token = p_token), '[]'::jsonb) else '[]'::jsonb end);
end $$;

create or replace function public.add_share_comment(p_token text, p_code text, p_author text, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.shares;
begin
  select * into s from public.shares where token = p_token;
  if not found or s.revoked or (s.expires_at is not null and s.expires_at < now()) or s.permission <> 'comment' then
    raise exception 'Комментарии недоступны';
  end if;
  if s.code is not null and s.code <> '' and coalesce(p_code, '') <> s.code then raise exception 'Неверный код'; end if;
  if length(coalesce(p_body, '')) = 0 or length(p_body) > 2000 then raise exception 'Пустой или слишком длинный комментарий'; end if;
  if (select count(*) from public.share_comments where token = p_token) >= 300 then raise exception 'Слишком много комментариев'; end if;
  insert into public.share_comments(token, author, body) values (p_token, left(coalesce(p_author, 'Гость'), 60), p_body);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.get_share(text, text) from public;
revoke all on function public.add_share_comment(text, text, text, text) from public;
grant execute on function public.get_share(text, text) to anon, authenticated;
grant execute on function public.add_share_comment(text, text, text, text) to anon, authenticated;

-- ---------- Хранилище файлов (документы, записи встреч) ----------
insert into storage.buckets (id, name, public) values ('files', 'files', false)
on conflict (id) do nothing;
drop policy if exists "markus files own" on storage.objects;
create policy "markus files own" on storage.objects for all to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Расширения для напоминаний по расписанию ----------
create extension if not exists pg_cron;
create extension if not exists pg_net;
