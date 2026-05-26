alter table public.rooms
add column if not exists min_players integer not null default 1,
add column if not exists max_players integer not null default 12;

update public.rooms
set min_players = case when game_key = 'fleet-duel' then 2 else coalesce(min_players, 1) end,
    max_players = case when game_key = 'fleet-duel' then 2 when game_key = 'flappy-duel' then 4 else coalesce(max_players, 12) end;

drop index if exists idx_rooms_open_room_code_unique;
create unique index if not exists idx_rooms_open_room_code_unique on public.rooms(room_code) where room_code is not null and status in ('waiting', 'playing', 'ended');

drop policy if exists "Public rooms are readable" on public.rooms;
create policy "Public rooms are readable" on public.rooms for select to anon, authenticated using (status in ('waiting', 'playing', 'ended'));

notify pgrst, 'reload schema';
