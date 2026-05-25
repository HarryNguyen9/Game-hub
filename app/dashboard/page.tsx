import { Plus, Ticket } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DashboardRoomList } from "@/components/dashboard-room-list";
import { ButtonLink } from "@/components/ui/button";
import { getActiveRoomForUser } from "@/lib/active-room";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { GAME_CATALOG } from "@/lib/constants";

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
            <div className={`mb-4 h-24 rounded-[1.5rem] bg-gradient-to-br ${game.accent}`} />
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
