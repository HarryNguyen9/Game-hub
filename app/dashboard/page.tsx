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
      <div className="absolute left-[27%] top-[45%]">
        <div className="relative h-10 w-10 rounded-full border-2 border-slate-800 bg-pink-300 shadow-md">
          <div className="absolute -top-2 left-1 h-4 w-4 rotate-[-24deg] rounded-tl-full rounded-tr-full bg-pink-400" />
          <div className="absolute -top-2 right-1 h-4 w-4 rotate-[24deg] rounded-tl-full rounded-tr-full bg-pink-400" />
          <div className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-white" />
          <div className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-white" />
          <div className="absolute left-[0.85rem] top-[0.6rem] h-1.5 w-1.5 rounded-full bg-slate-900" />
          <div className="absolute right-[0.85rem] top-[0.6rem] h-1.5 w-1.5 rounded-full bg-slate-900" />
          <div className="absolute bottom-2 left-1/2 h-4 w-6 -translate-x-1/2 rounded-full border border-slate-700 bg-pink-200">
            <div className="absolute left-1.5 top-1.5 h-1 w-1 rounded-full bg-rose-500" />
            <div className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-rose-500" />
          </div>
          <div className="absolute -right-3 top-6 h-3 w-3 rounded-full border-2 border-rose-400 border-l-transparent" />
        </div>
      </div>
      <div className="absolute left-[48%] top-[55%] opacity-40">
        <div className="relative h-8 w-8 rounded-full border-2 border-slate-600 bg-pink-200">
          <div className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-white" />
          <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-white" />
          <div className="absolute bottom-1.5 left-1/2 h-3 w-5 -translate-x-1/2 rounded-full border border-slate-500 bg-pink-100">
            <div className="absolute left-1 top-1 h-1 w-1 rounded-full bg-rose-400" />
            <div className="absolute right-1 top-1 h-1 w-1 rounded-full bg-rose-400" />
          </div>
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
