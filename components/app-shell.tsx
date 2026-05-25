import { Gamepad2, Home, LogOut, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { getActiveRoomForUser } from "@/lib/active-room";

export type ShellUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "admin";
};

export async function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const activeRoom = await getActiveRoomForUser(user.id);

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-white/70 bg-white/72 p-5 shadow-sm backdrop-blur-xl md:block">
        <Link href="/dashboard" className="flex items-center gap-3 text-xl font-black text-slate-800">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#ffcf5a]">
            <Gamepad2 />
          </span>
          Game Hub
        </Link>
        <div className="mt-8 flex items-center gap-3 rounded-3xl bg-white p-3 shadow-sm">
          <Avatar displayName={user.displayName} username={user.username} avatarUrl={user.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate font-extrabold">{user.displayName}</p>
            <p className="truncate text-sm text-slate-500">@{user.username}</p>
          </div>
        </div>
        <nav className="mt-8 grid gap-2 text-sm font-bold text-slate-700">
          <Link className="rounded-2xl px-4 py-3 hover:bg-white" href="/dashboard">
            Dashboard
          </Link>
          <Link className="rounded-2xl px-4 py-3 hover:bg-white" href="/profile">
            Profile
          </Link>
          {user.role === "admin" && (
            <Link className="rounded-2xl px-4 py-3 hover:bg-white" href="/admin">
              Admin
            </Link>
          )}
        </nav>
        <form action="/api/auth/logout" method="post" className="absolute bottom-5 left-5 right-5">
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
            <LogOut size={18} /> Logout
          </button>
        </form>
      </aside>
      <main className="mx-auto max-w-6xl px-4 py-5 md:ml-64 md:px-8 md:py-8">{children}</main>
      <nav className="fixed bottom-3 left-3 right-3 z-20 grid grid-cols-4 rounded-3xl bg-white/90 p-2 shadow-2xl shadow-slate-200 backdrop-blur md:hidden">
        <Link className="grid place-items-center gap-1 rounded-2xl p-2 text-xs font-bold" href="/dashboard">
          <Home size={20} /> Home
        </Link>
        <Link className="grid place-items-center gap-1 rounded-2xl p-2 text-xs font-bold" href={activeRoom ? `/rooms/${activeRoom.id}` : "/rooms/create"}>
          <Gamepad2 size={20} /> {activeRoom ? "Room" : "Create"}
        </Link>
        <Link className="grid place-items-center gap-1 rounded-2xl p-2 text-xs font-bold" href="/profile">
          <UserRound size={20} /> Profile
        </Link>
        {user.role === "admin" ? (
          <Link className="grid place-items-center gap-1 rounded-2xl p-2 text-xs font-bold" href="/admin">
            <Shield size={20} /> Admin
          </Link>
        ) : (
          <form action="/api/auth/logout" method="post">
            <button className="grid w-full place-items-center gap-1 rounded-2xl p-2 text-xs font-bold">
              <LogOut size={20} /> Out
            </button>
          </form>
        )}
      </nav>
    </div>
  );
}
