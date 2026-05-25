do $$
begin
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

alter table public.rooms
add column if not exists room_code text,
add column if not exists game_key text,
add column if not exists has_password boolean not null default false,
add column if not exists password_hash text,
add column if not exists max_players integer not null default 12;

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

update public.rooms
set has_password = coalesce(has_password, false);

alter table public.rooms
alter column game_key drop not null,
alter column status type public.room_status using status::text::public.room_status;

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
      and status in ('waiting', 'playing')
    order by created_at, id
  loop
    for candidate in 0..9999 loop
      candidate_code := lpad(candidate::text, 4, '0');
      if not exists (
        select 1
        from public.rooms
        where room_code = candidate_code
          and status in ('waiting', 'playing')
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

create unique index if not exists idx_rooms_open_room_code_unique on public.rooms(room_code) where room_code is not null and status in ('waiting', 'playing');

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

alter table public.room_members
add column if not exists id uuid default gen_random_uuid(),
add column if not exists role public.room_member_role not null default 'player',
add column if not exists ready boolean not null default false,
add column if not exists participation_status public.participation_status not null default 'lobby',
add column if not exists updated_at timestamptz not null default now();

update public.room_members
set role = 'host',
    ready = true,
    participation_status = case when rooms.status = 'playing' then 'active_game'::public.participation_status else 'lobby'::public.participation_status end
from public.rooms
where room_members.room_id = rooms.id
  and room_members.user_id = rooms.host_user_id;

update public.room_members
set participation_status = 'active_game'
from public.rooms
where room_members.room_id = rooms.id
  and rooms.status = 'playing'
  and room_members.participation_status = 'lobby';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'room_members_id_unique'
      and conrelid = 'public.room_members'::regclass
  ) then
    alter table public.room_members add constraint room_members_id_unique unique (id);
  end if;
end $$;

alter table public.game_sessions
add column if not exists game_key text,
add column if not exists state jsonb not null default '{}'::jsonb,
add column if not exists started_at timestamptz,
add column if not exists ended_at timestamptz;

update public.game_sessions
set game_key = rooms.game_key
from public.rooms
where game_sessions.room_id = rooms.id
  and game_sessions.game_key is null;

drop trigger if exists touch_room_members_updated_at on public.room_members;
create trigger touch_room_members_updated_at
before update on public.room_members
for each row execute function public.touch_updated_at();

grant usage on type public.room_member_role to service_role;
grant usage on type public.participation_status to service_role;
grant select, insert, update, delete on table public.rooms to service_role;
grant select, insert, update, delete on table public.room_members to service_role;
grant select, insert, update, delete on table public.game_sessions to service_role;

notify pgrst, 'reload schema';
