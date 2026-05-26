create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'room_status') then
    create type public.room_status as enum ('waiting', 'playing', 'ended', 'closed');
  else
    alter type public.room_status add value if not exists 'ended';
    alter type public.room_status add value if not exists 'closed';
  end if;
  if not exists (select 1 from pg_type where typname = 'room_member_role') then
    create type public.room_member_role as enum ('host', 'player');
  end if;
  if not exists (select 1 from pg_type where typname = 'participation_status') then
    create type public.participation_status as enum ('lobby', 'active_game', 'waiting_next_round');
  end if;
  if not exists (select 1 from pg_type where typname = 'game_session_status') then
    create type public.game_session_status as enum ('waiting', 'playing', 'finished', 'ended');
  else
    alter type public.game_session_status add value if not exists 'ended';
  end if;
end $$;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text,
  avatar_url text,
  password_hash text not null,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users
add column if not exists display_name text,
add column if not exists avatar_url text;

do $$
begin
  if to_regclass('public.profiles') is not null then
    update public.app_users
    set display_name = coalesce(nullif(btrim(profiles.display_name), ''), app_users.display_name, app_users.username),
        avatar_url = coalesce(profiles.avatar_url, app_users.avatar_url)
    from public.profiles
    where profiles.user_id = app_users.id;
  end if;
end $$;

update public.app_users set display_name = username where display_name is null or btrim(display_name) = '';
alter table public.app_users alter column display_name set not null;
drop table if exists public.profiles cascade;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'username_format' and conrelid = 'public.app_users'::regclass) then
    alter table public.app_users add constraint username_format check (username ~ '^[a-z0-9_]{3,24}$');
  end if;
end $$;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text,
  name text not null,
  game_key text,
  host_user_id uuid not null references public.app_users(id) on delete cascade,
  status public.room_status not null default 'waiting',
  has_password boolean not null default false,
  password_hash text,
  min_players integer not null default 1,
  max_players integer not null default 12,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rooms
add column if not exists room_code text,
add column if not exists game_key text,
add column if not exists has_password boolean not null default false,
add column if not exists password_hash text,
add column if not exists min_players integer not null default 1,
add column if not exists max_players integer not null default 12;

update public.rooms
set min_players = case when game_key = 'fleet-duel' then 2 else coalesce(min_players, 1) end,
    max_players = case when game_key = 'fleet-duel' then 2 when game_key = 'flappy-rush' then 4 else coalesce(max_players, 12) end;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rooms'
      and column_name = 'game_id'
  ) then
    execute 'update public.rooms set game_key = coalesce(game_key, game_id) where game_key is null';
  end if;
end $$;

alter table public.rooms alter column game_key drop not null;

update public.rooms set game_key = 'flappy-rush' where game_key = 'flappy-duel';

do $$
declare
  room_record record;
  candidate integer;
  candidate_code text;
begin
  for room_record in
    select id
    from public.rooms
    where room_code is null
      and status in ('waiting', 'playing', 'ended')
    order by created_at, id
  loop
    for candidate in 0..9999 loop
      candidate_code := lpad(candidate::text, 4, '0');
      if not exists (
        select 1
        from public.rooms
        where room_code = candidate_code
          and status in ('waiting', 'playing', 'ended')
      ) then
        update public.rooms set room_code = candidate_code where id = room_record.id;
        exit;
      end if;
    end loop;
  end loop;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'room_code_format' and conrelid = 'public.rooms'::regclass) then
    alter table public.rooms add constraint room_code_format check (room_code is null or room_code ~ '^[0-9]{4}$');
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rooms'
      and column_name = 'game_id'
  ) then
    alter table public.rooms alter column game_id drop not null;
  end if;
end $$;

create table if not exists public.room_members (
  id uuid default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  role public.room_member_role not null default 'player',
  ready boolean not null default false,
  participation_status public.participation_status not null default 'lobby',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.room_members
add column if not exists id uuid default gen_random_uuid(),
add column if not exists role public.room_member_role not null default 'player',
add column if not exists ready boolean not null default false,
add column if not exists participation_status public.participation_status not null default 'lobby',
add column if not exists updated_at timestamptz not null default now();

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  game_key text,
  status public.game_session_status not null default 'waiting',
  state jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update public.game_sessions set game_key = 'flappy-rush' where game_key = 'flappy-duel';

create index if not exists idx_app_users_display_name on public.app_users using gin (to_tsvector('simple', display_name));
create index if not exists idx_rooms_status on public.rooms(status);
create index if not exists idx_rooms_open on public.rooms(status, created_at desc);
drop index if exists idx_rooms_open_room_code_unique;
create unique index if not exists idx_rooms_open_room_code_unique on public.rooms(room_code) where room_code is not null and status in ('waiting', 'playing', 'ended');
create index if not exists idx_room_members_user_id on public.room_members(user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_app_users_updated_at on public.app_users;
create trigger touch_app_users_updated_at before update on public.app_users for each row execute function public.touch_updated_at();
drop trigger if exists touch_rooms_updated_at on public.rooms;
create trigger touch_rooms_updated_at before update on public.rooms for each row execute function public.touch_updated_at();
drop trigger if exists touch_room_members_updated_at on public.room_members;
create trigger touch_room_members_updated_at before update on public.room_members for each row execute function public.touch_updated_at();
drop trigger if exists touch_game_sessions_updated_at on public.game_sessions;
create trigger touch_game_sessions_updated_at before update on public.game_sessions for each row execute function public.touch_updated_at();

grant usage on schema public to service_role;
grant usage on type public.app_role to service_role;
grant usage on type public.room_status to service_role;
grant usage on type public.room_member_role to service_role;
grant usage on type public.participation_status to service_role;
grant usage on type public.game_session_status to service_role;
grant select, insert, update, delete on table public.app_users to service_role;
grant select, insert, update, delete on table public.rooms to service_role;
grant select, insert, update, delete on table public.room_members to service_role;
grant select, insert, update, delete on table public.game_sessions to service_role;
grant execute on function public.touch_updated_at() to service_role;

alter table public.app_users enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.game_sessions enable row level security;

drop policy if exists "No direct app user access" on public.app_users;
create policy "No direct app user access" on public.app_users for all to anon, authenticated using (false) with check (false);
drop policy if exists "Public rooms are readable" on public.rooms;
create policy "Public rooms are readable" on public.rooms for select to anon, authenticated using (status in ('waiting', 'playing', 'ended'));
drop policy if exists "No direct room writes" on public.rooms;
create policy "No direct room writes" on public.rooms for all to anon, authenticated using (false) with check (false);
drop policy if exists "No direct member writes" on public.room_members;
create policy "No direct member writes" on public.room_members for all to anon, authenticated using (false) with check (false);
drop policy if exists "No direct game session writes" on public.game_sessions;
create policy "No direct game session writes" on public.game_sessions for all to anon, authenticated using (false) with check (false);

grant select on table public.rooms to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
