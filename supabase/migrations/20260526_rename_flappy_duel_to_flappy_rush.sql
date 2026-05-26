update public.rooms
set game_key = 'flappy-rush'
where game_key = 'flappy-duel';

do $$
begin
  if to_regclass('public.game_sessions') is not null then
    update public.game_sessions
    set game_key = 'flappy-rush'
    where game_key = 'flappy-duel';
  end if;
end $$;

notify pgrst, 'reload schema';
