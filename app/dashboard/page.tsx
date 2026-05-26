import { Plus, Ticket } from "lucide-react";
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
      <div className="absolute left-[28%] top-[48%]">
        <div className="relative h-9 w-11 -rotate-6 rounded-[50%] border-2 border-slate-800 bg-rose-400 shadow-md">
          <div className="absolute -left-2 top-3 h-4 w-5 rounded-full bg-white/55" />
          <div className="absolute right-2 top-2 h-3 w-3 rounded-full bg-white" />
          <div className="absolute right-1 top-2.5 h-1.5 w-1.5 rounded-full bg-slate-900" />
          <div className="absolute -right-4 top-4 h-0 w-0 border-y-[5px] border-l-[14px] border-y-transparent border-l-amber-300" />
        </div>
      </div>
      <div className="absolute left-[45%] top-[58%] opacity-40">
        <div className="relative h-7 w-9 rotate-6 rounded-[50%] border-2 border-slate-600 bg-slate-400">
          <div className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-white" />
          <div className="absolute -right-3 top-3 h-0 w-0 border-y-[4px] border-l-[11px] border-y-transparent border-l-amber-300" />
        </div>
      </div>
      <div className="absolute left-5 top-4 rounded-full bg-white/70 px-2 py-1 text-[10px] font-black uppercase text-rose-500">Live duel</div>
    </div>
  );
}

export default async function DashboardPage() {
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
            {game.id === "flappy-duel" ? <FlappyDuelPreview /> : <div className={`mb-4 h-24 rounded-[1.5rem] bg-gradient-to-br ${game.accent}`} />}
            <h2 className="font-black">{game.name}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{game.description}</p>
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
