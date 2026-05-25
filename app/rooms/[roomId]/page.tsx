import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RoomClient } from "@/components/room-client";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { GAME_CATALOG } from "@/lib/constants";

type PageProps = { params: Promise<{ roomId: string }> };
type AppUserRecord = { username: string; display_name: string | null; avatar_url: string | null } | null;

function profileFrom(appUser: AppUserRecord) {
  return {
    username: appUser?.username || "player",
    displayName: appUser?.display_name || appUser?.username || "Player",
    avatarUrl: appUser?.avatar_url || null
  };
}

function titleLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function RoomPage({ params }: PageProps) {
  const user = await getCurrentUserWithProfile();
  const { roomId } = await params;
  const supabase = createServiceClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_code, name, game_key, status, has_password, host_user_id")
    .eq("id", roomId)
    .single();

  if (!room) notFound();

  const { data: memberRows } = await supabase
    .from("room_members")
    .select("user_id, role, ready, participation_status, app_users(username, display_name, avatar_url)")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  const currentMember = memberRows?.find((member) => member.user_id === user.id);
  if (!currentMember && room.host_user_id !== user.id) redirect("/dashboard");

  const game = GAME_CATALOG.find((item) => item.id === room.game_key);
  const members =
    memberRows?.map((member) => {
      const appUser = Array.isArray(member.app_users) ? member.app_users[0] : member.app_users;
      return {
        userId: member.user_id,
        role: member.role,
        ready: member.ready,
        participationStatus: member.participation_status,
        ...profileFrom(appUser)
      };
    }) || [];

  return (
    <AppShell user={user}>
      <header className="mb-5 rounded-[2rem] bg-white/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-[#ff7a90]">{game?.name || "No game selected"}</p>
            <h1 className="mt-1 text-3xl font-black">{room.name}</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              {titleLabel(room.status)} · {room.has_password ? "Password Room" : "Public Room"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {room.room_code && <div className="rounded-3xl bg-sky-100 px-5 py-3 text-center font-black text-sky-800">Code {room.room_code}</div>}
            <div className="rounded-3xl bg-[#ffcf5a] px-5 py-3 text-center font-black">{members.length} players</div>
          </div>
        </div>
      </header>
      <RoomClient
        roomId={room.id}
        initialMembers={members}
        initialStatus={room.status}
        isHost={room.host_user_id === user.id}
        currentUserId={user.id}
        initialGameKey={room.game_key}
      />
    </AppShell>
  );
}
