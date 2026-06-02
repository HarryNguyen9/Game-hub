"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Ticket } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { DashboardRoomList } from "@/components/dashboard-room-list";
import { GameRulesInfoButton } from "@/components/games/game-rules-modal";
import { GAME_CATALOG } from "@/lib/constants";

type DashboardTab = "games" | "rooms";

function FlappyRushPreview() {
  return (
    <div className="relative mb-4 h-28 overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-sky-200 via-emerald-50 to-amber-100 shadow-inner">
      <div className="absolute left-7 top-5 h-4 w-16 rounded-full bg-white/55" />
      <div className="absolute left-28 top-9 h-3 w-12 rounded-full bg-white/45" />
      <div className="absolute right-9 top-6 h-4 w-14 rounded-full bg-white/55" />
      <div className="absolute bottom-0 left-0 h-2 w-full bg-sky-300" />
      <div className="absolute right-10 top-0 h-9 w-9 rounded-b-lg border-2 border-emerald-500 bg-emerald-300" />
      <div className="absolute bottom-2 right-10 h-10 w-9 rounded-t-lg border-2 border-emerald-500 bg-emerald-300" />
      <div className="absolute left-[27%] top-[45%]">
        <div className="relative h-10 w-11 -rotate-3 rounded-[50%] border-2 border-slate-800 bg-pink-300 shadow-md">
          <div className="absolute -top-1 left-2 h-3.5 w-3 rounded-full border border-slate-800 bg-pink-400" />
          <div className="absolute -top-0.5 right-2 h-3 w-2.5 rounded-full border border-slate-800 bg-pink-400" />
          <div className="absolute left-5 top-2 h-2.5 w-2.5 rounded-full bg-white" />
          <div className="absolute right-1.5 top-2.5 h-2 w-2 rounded-full bg-white" />
          <div className="absolute left-[1.45rem] top-[0.65rem] h-1.5 w-1.5 rounded-full bg-slate-900" />
          <div className="absolute right-[0.55rem] top-[0.72rem] h-1.5 w-1.5 rounded-full bg-slate-900" />
          <div className="absolute bottom-2 right-0 h-4 w-6 rounded-full border border-slate-700 bg-pink-200">
            <div className="absolute left-1.5 top-1.5 h-1 w-1 rounded-full bg-rose-500" />
            <div className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-rose-500" />
          </div>
          <div className="absolute -left-2 top-5 h-3 w-3 rounded-full border-2 border-rose-400 border-l-transparent" />
        </div>
      </div>
      <div className="absolute left-[48%] top-[55%] opacity-40">
        <div className="relative h-8 w-9 rounded-[50%] border-2 border-slate-600 bg-pink-200">
          <div className="absolute left-4 top-1.5 h-2 w-2 rounded-full bg-white" />
          <div className="absolute right-1 top-2 h-2 w-2 rounded-full bg-white" />
          <div className="absolute bottom-1.5 right-0 h-3 w-5 rounded-full border border-slate-500 bg-pink-100">
            <div className="absolute left-1 top-1 h-1 w-1 rounded-full bg-rose-400" />
            <div className="absolute right-1 top-1 h-1 w-1 rounded-full bg-rose-400" />
          </div>
        </div>
      </div>
      <div className="absolute left-4 top-4 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-sky-700 shadow-sm">1-4 Players</div>
      <div className="absolute right-4 top-4 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-rose-500 shadow-sm">Realtime</div>
    </div>
  );
}

function FleetDuelPreview() {
  return (
    <div className="relative mb-4 h-28 overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-cyan-200 via-sky-100 to-blue-200 shadow-inner">
      <div className="absolute inset-x-0 bottom-0 h-12 bg-cyan-300/50" />
      <div className="absolute left-4 top-4 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-cyan-700 shadow-sm">2 Players</div>
      <div className="absolute right-4 top-4 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-blue-700 shadow-sm">Turn-based</div>
      <div className="absolute left-8 top-16 h-1.5 w-20 rounded-full bg-white/60" />
      <div className="absolute right-8 top-20 h-1.5 w-24 rounded-full bg-white/50" />
      <div className="absolute left-[24%] top-[48%] h-7 w-16 rounded-b-xl rounded-t-md bg-slate-700 shadow-md">
        <div className="absolute -top-4 left-5 h-4 w-7 rounded-t-lg bg-slate-500" />
        <div className="absolute -right-4 top-2 h-0 w-0 border-y-[8px] border-l-[16px] border-y-transparent border-l-slate-700" />
        <div className="absolute bottom-1 left-2 h-1 w-10 rounded-full bg-cyan-200" />
      </div>
      <div className="absolute right-[22%] top-[50%] h-6 w-14 rounded-b-xl rounded-t-md bg-rose-400 opacity-70 shadow-md">
        <div className="absolute -top-3 left-4 h-3 w-6 rounded-t-lg bg-rose-300" />
        <div className="absolute -left-3 top-2 h-0 w-0 border-y-[7px] border-r-[14px] border-y-transparent border-r-rose-400" />
      </div>
    </div>
  );
}

function OAnQuanPreview() {
  return (
    <div className="relative mb-4 h-28 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-amber-100 via-lime-100 to-emerald-100 shadow-inner">
      <div className="absolute left-4 top-4 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-amber-700 shadow-sm">2 Players</div>
      <div className="absolute right-4 top-4 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-emerald-700 shadow-sm">Turn-based</div>
      <div className="absolute inset-x-6 bottom-5 grid grid-cols-[2.4rem_1fr_2.4rem] gap-1">
        <div className="h-14 rounded-full border-2 border-stone-300 bg-amber-200" />
        <div className="grid gap-1">
          <div className="grid grid-cols-5 gap-1">{Array.from({ length: 5 }).map((_, index) => <span key={`top-${index}`} className="h-6 rounded-lg bg-white/75" />)}</div>
          <div className="grid grid-cols-5 gap-1">{Array.from({ length: 5 }).map((_, index) => <span key={`bottom-${index}`} className="h-6 rounded-lg bg-white/75" />)}</div>
        </div>
        <div className="h-14 rounded-full border-2 border-stone-300 bg-amber-200" />
      </div>
    </div>
  );
}

function ChessPreview() {
  return (
    <div className="relative mb-4 h-28 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-indigo-100 via-white to-amber-100 shadow-inner">
      <div className="absolute left-4 top-4 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-indigo-700 shadow-sm">2 Players</div>
      <div className="absolute right-4 top-4 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-amber-700 shadow-sm">Turn-based</div>
      <div className="absolute inset-x-8 bottom-5 grid grid-cols-6 overflow-hidden rounded-xl border-2 border-white/80 shadow-sm">
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index} className={`h-5 ${index % 2 === Math.floor(index / 6) % 2 ? "bg-[#7fc8a9]" : "bg-[#fff4c7]"}`} />
        ))}
      </div>
      <div className="absolute left-[40%] top-[42%] text-4xl drop-shadow-sm">♟️</div>
      <div className="absolute right-[34%] top-[52%] text-3xl opacity-70 drop-shadow-sm">♔</div>
    </div>
  );
}

function ElementalDuelsPreview() {
  return (
    <div className="relative mb-4 h-28 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-orange-100 via-cyan-100 to-emerald-100 shadow-inner">
      <div className="absolute left-4 top-4 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-orange-700 shadow-sm">2 Players</div>
      <div className="absolute right-4 top-4 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-cyan-700 shadow-sm">Realtime</div>
      <div className="absolute right-4 bottom-4 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-emerald-700 shadow-sm">Strategy</div>
      <div className="absolute inset-x-0 top-1/2 h-1.5 bg-white/70" />
      <div className="absolute left-8 bottom-6 grid size-11 place-items-center rounded-xl border-2 border-orange-400 bg-orange-200 shadow-md">
        <span className="text-xl">🔥</span>
      </div>
      <div className="absolute right-9 top-10 grid size-11 place-items-center rounded-xl border-2 border-cyan-400 bg-cyan-200 shadow-md">
        <span className="text-xl">❄️</span>
      </div>
      <div className="absolute left-[45%] top-[45%] grid size-9 place-items-center rounded-full border-2 border-slate-700 bg-lime-200 shadow-md">
        <span className="text-[10px] font-black">TD</span>
      </div>
      <div className="absolute left-[58%] bottom-7 size-4 rounded-full bg-yellow-300 shadow-sm" />
      <div className="absolute left-[35%] top-10 size-4 rounded-full bg-purple-300 shadow-sm" />
    </div>
  );
}

function WatchTogetherPreview() {
  return (
    <div className="relative mb-4 h-28 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-red-100 via-rose-50 to-rose-200 shadow-inner">
      <div className="absolute left-4 top-4 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-rose-600 shadow-sm">1-8 Players</div>
      <div className="absolute right-4 top-4 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-slate-500 shadow-sm">Watch</div>
      <div className="absolute inset-x-10 bottom-4 top-10 overflow-hidden rounded-xl bg-slate-800 shadow-md">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid size-8 place-items-center rounded-full bg-white/90">
            <div className="ml-0.5 h-0 w-0 border-y-[7px] border-l-[13px] border-y-transparent border-l-rose-500" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-1 w-2/5 bg-rose-400" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10" />
      </div>
    </div>
  );
}

function GamePreview({ gameId }: { gameId: string }) {
  if (gameId === "flappy-rush") return <FlappyRushPreview />;
  if (gameId === "fleet-duel") return <FleetDuelPreview />;
  if (gameId === "o-an-quan") return <OAnQuanPreview />;
  if (gameId === "elemental-duels") return <ElementalDuelsPreview />;
  if (gameId === "watch-together") return <WatchTogetherPreview />;
  return <ChessPreview />;
}

export function DashboardHub({ activeRoomId }: { activeRoomId: string | null }) {
  const [tab, setTab] = useState<DashboardTab>("games");
  const [gameSearch, setGameSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [showActiveRoomDialog, setShowActiveRoomDialog] = useState(false);
  const currentSearch = tab === "games" ? gameSearch : roomSearch;
  const setCurrentSearch = tab === "games" ? setGameSearch : setRoomSearch;
  const visibleGames = useMemo(() => {
    const query = gameSearch.trim().toLowerCase();
    return GAME_CATALOG.filter((game) => {
      if (!query) return true;
      return `${game.name} ${game.description} ${game.minPlayers}-${game.maxPlayers}`.toLowerCase().includes(query);
    }).slice(0, 10);
  }, [gameSearch]);

  return (
    <div>
      <header className="sticky top-0 z-30 -mx-4 mb-5 rounded-b-[2rem] bg-white/82 px-4 py-4 shadow-sm backdrop-blur-xl md:-mx-8 md:px-8">
        <p className="text-sm font-black uppercase tracking-wide text-[#ff7a90]">Game hub</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 md:text-5xl">Pick a room, bring the snacks.</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">Online party games hub. Let have some fun with your friends!</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {activeRoomId ? (
            <>
              <ButtonLink href={`/rooms/${activeRoomId}`}>
                <Plus size={18} /> Back to room
              </ButtonLink>
              <Button type="button" variant="secondary" onClick={() => setShowActiveRoomDialog(true)}>
                <Plus size={18} /> New room
              </Button>
            </>
          ) : (
            <ButtonLink href="/rooms/create">
              <Plus size={18} /> Create room
            </ButtonLink>
          )}
          <ButtonLink href="/rooms/join" variant="secondary">
            <Ticket size={18} /> Join by code
          </ButtonLink>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            {(["games", "rooms"] as DashboardTab[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${tab === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                {item === "games" ? "Games" : "Rooms"}
              </button>
            ))}
          </div>
          <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-500">
            <Search size={17} />
            <input
              value={currentSearch}
              onChange={(event) => setCurrentSearch(event.target.value)}
              placeholder={tab === "games" ? "Search games" : "Search rooms, code, host"}
              className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>
      </header>

      {tab === "games" ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Game list</h2>
            <span className="text-xs font-black text-slate-400">{visibleGames.length}/10 shown</span>
          </div>
          {visibleGames.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {visibleGames.map((game) => (
                <article key={game.id} className="rounded-[1.75rem] bg-white/86 p-4 shadow-sm ring-1 ring-white">
                  <GamePreview gameId={game.id} />
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 font-black">{game.name}</h2>
                    <GameRulesInfoButton game={game} />
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-500">{game.description}</p>
                  {"turnDurationLabel" in game && <p className="mt-1 text-xs font-bold text-slate-400">{game.turnDurationLabel}</p>}
                  <p className="mt-2 text-xs font-black text-slate-400">
                    {game.minPlayers}-{game.maxPlayers} players
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-3xl bg-white/80 p-5 text-sm font-semibold text-slate-500">No games match your search.</p>
          )}
        </section>
      ) : (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Open rooms</h2>
            <span className="text-xs font-black text-slate-400">Max 10</span>
          </div>
          <DashboardRoomList searchQuery={roomSearch} limit={10} />
        </section>
      )}
      {showActiveRoomDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-5 text-center shadow-2xl">
            <div className="mx-auto grid size-14 place-items-center rounded-3xl bg-amber-100 text-2xl">🎮</div>
            <h3 className="mt-4 text-xl font-black text-slate-900">Bạn đang trong phòng</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Vui lòng rời phòng hiện tại trước khi tạo phòng mới.
            </p>
            <Button className="mt-5 w-full" type="button" onClick={() => setShowActiveRoomDialog(false)}>
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
