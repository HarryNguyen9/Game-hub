import { Plus, Ticket } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { AppShell } from "@/components/app-shell";
import { DashboardRoomList } from "@/components/dashboard-room-list";
import { ButtonLink } from "@/components/ui/button";
import { getActiveRoomForUser } from "@/lib/active-room";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { GAME_CATALOG } from "@/lib/constants";

function FlappyDuelPreview() {
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
          <div className="absolute -top-2 left-1.5 h-4 w-4 rotate-[-18deg] rounded-tl-full rounded-tr-full bg-pink-400" />
          <div className="absolute -top-1 right-1 h-4 w-3 rotate-[28deg] rounded-tl-full rounded-tr-full bg-pink-400" />
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
      <div className="absolute left-5 top-4 rounded-full bg-white/70 px-2 py-1 text-[10px] font-black uppercase text-rose-500">Live duel</div>
    </div>
  );
}

function FleetDuelPreview() {
  return (
    <div className="relative mb-4 h-28 overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-cyan-200 via-sky-100 to-blue-200 shadow-inner">
      <div className="absolute inset-x-0 bottom-0 h-12 bg-cyan-300/50" />
      <div className="absolute left-5 top-5 rounded-full bg-white/75 px-2 py-1 text-[10px] font-black uppercase text-cyan-700">2 Players</div>
      <div className="absolute right-5 top-5 rounded-full bg-white/75 px-2 py-1 text-[10px] font-black uppercase text-blue-700">Turn-based</div>
      <div className="absolute left-8 top-16 h-1.5 w-20 rounded-full bg-white/60" />
      <div className="absolute right-8 top-20 h-1.5 w-24 rounded-full bg-white/50" />
      <div className="absolute left-[24%] top-[48%]">
        <div className="relative h-7 w-16 rounded-b-xl rounded-t-md bg-slate-700 shadow-md">
          <div className="absolute -top-4 left-5 h-4 w-7 rounded-t-lg bg-slate-500" />
          <div className="absolute -right-4 top-2 h-0 w-0 border-y-[8px] border-l-[16px] border-y-transparent border-l-slate-700" />
          <div className="absolute bottom-1 left-2 h-1 w-10 rounded-full bg-cyan-200" />
        </div>
      </div>
      <div className="absolute right-[22%] top-[50%] opacity-70">
        <div className="relative h-6 w-14 rounded-b-xl rounded-t-md bg-rose-400 shadow-md">
          <div className="absolute -top-3 left-4 h-3 w-6 rounded-t-lg bg-rose-300" />
          <div className="absolute -left-3 top-2 h-0 w-0 border-y-[7px] border-r-[14px] border-y-transparent border-r-rose-400" />
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  noStore();
  const user = await getCurrentUserWithProfile();
  const activeRoom = await getActiveRoomForUser(user.id);

  return (
    <AppShell user={user}>
      <header className="mb-6">
        <p className="text-sm font-black uppercase tracking-wide text-[#ff7a90]">Game hub</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 md:text-5xl">Pick a room, bring the snacks.</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Online party games hub. Let have some fun with your friends!</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {activeRoom ? (
            <ButtonLink href={`/rooms/${activeRoom.id}`}>
              <Plus size={18} /> Back to room
            </ButtonLink>
          ) : (
            <ButtonLink href="/rooms/create">
              <Plus size={18} /> Create room
            </ButtonLink>
          )}
          <ButtonLink href="/rooms/join" variant="secondary">
            <Ticket size={18} /> Join by code
          </ButtonLink>
        </div>
      </header>
      <section className="grid gap-4 md:grid-cols-4">
        {GAME_CATALOG.map((game) => (
          <article key={game.id} className="rounded-[1.75rem] bg-white/86 p-4 shadow-sm ring-1 ring-white">
            {game.id === "flappy-duel" ? <FlappyDuelPreview /> : <FleetDuelPreview />}
            <h2 className="font-black">{game.name}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{game.description}</p>
            <p className="mt-2 text-xs font-black text-slate-400">{game.minPlayers}-{game.maxPlayers} players</p>
          </article>
        ))}
      </section>
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black">Open rooms</h2>
        </div>
        <DashboardRoomList />
      </section>
    </AppShell>
  );
}
