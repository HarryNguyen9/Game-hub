import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RoomClient } from "@/components/room-client";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { FlappySnapshot } from "@/lib/games/flappy-rush/types";
import type { FleetSnapshot, FleetState } from "@/lib/games/fleet-duel/types";
import { serializeFleetStateForUser } from "@/lib/games/fleet-duel/serializer";
import type { OAnQuanSnapshot } from "@/lib/games/o-an-quan/types";
import type { ChessSnapshot } from "@/lib/games/chess/types";
import type { ElementalSnapshot } from "@/lib/games/elemental-duels/types";

type PageProps = { params: Promise<{ roomId: string }> };
type AppUserRecord = { username: string; display_name: string | null; avatar_url: string | null } | null;

function profileFrom(appUser: AppUserRecord) {
  return {
    username: appUser?.username || "player",
    displayName: appUser?.display_name || appUser?.username || "Player",
    avatarUrl: appUser?.avatar_url || null
  };
}

export default async function RoomPage({ params }: PageProps) {
  const user = await getCurrentUserWithProfile();
  const { roomId } = await params;
  const supabase = createServiceClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_code, name, game_key, status, has_password, host_user_id, min_players, max_players")
    .eq("id", roomId)
    .single();

  if (!room) {
    await supabase.from("room_members").delete().match({ room_id: roomId, user_id: user.id });
    notFound();
  }

  const { data: memberRows } = await supabase
    .from("room_members")
    .select("user_id, role, ready, participation_status, app_users(username, display_name, avatar_url)")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  const currentMember = memberRows?.find((member) => member.user_id === user.id);
  if (!currentMember && room.host_user_id !== user.id) redirect("/dashboard");

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

  let initialGameSnapshot: FlappySnapshot | null = null;
  let initialFleetSnapshot: FleetSnapshot | null = null;
  let initialOAnQuanSnapshot: OAnQuanSnapshot | null = null;
  let initialChessSnapshot: ChessSnapshot | null = null;
  let initialElementalSnapshot: ElementalSnapshot | null = null;

  if (room.status === "ended") {
    const { data: session } = await supabase
      .from("game_sessions")
      .select("game_key, state")
      .eq("room_id", roomId)
      .eq("status", "ended")
      .order("ended_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (session?.game_key === "flappy-rush") {
      const snapshot = (session.state as FlappySnapshot | null) ?? null;
      if (snapshot?.roomId === roomId && snapshot.status === "ended") initialGameSnapshot = snapshot;
    }
    if (session?.game_key === "fleet-duel") {
      const state = session.state as FleetState | null;
      if (state?.roomId === roomId && state.status === "ended" && state.players[user.id]) {
        initialFleetSnapshot = serializeFleetStateForUser(state, user.id);
      }
    }
    if (session?.game_key === "o-an-quan") {
      const snapshot = (session.state as OAnQuanSnapshot | null) ?? null;
      if (snapshot?.roomId === roomId && snapshot.status === "ended" && snapshot.players[user.id]) initialOAnQuanSnapshot = snapshot;
    }
    if (session?.game_key === "chess") {
      const snapshot = (session.state as ChessSnapshot | null) ?? null;
      if (snapshot?.roomId === roomId && snapshot.status === "ended" && snapshot.players[user.id]) initialChessSnapshot = snapshot;
    }
    if (session?.game_key === "elemental-duels") {
      const snapshot = (session.state as ElementalSnapshot | null) ?? null;
      if (snapshot?.roomId === roomId && snapshot.status === "ended" && snapshot.players[user.id]) initialElementalSnapshot = snapshot;
    }
  }

  const effectiveGameKey =
    room.game_key ||
    (initialGameSnapshot
      ? "flappy-rush"
      : initialFleetSnapshot
        ? "fleet-duel"
        : initialOAnQuanSnapshot
          ? "o-an-quan"
          : initialChessSnapshot
            ? "chess"
            : initialElementalSnapshot
              ? "elemental-duels"
              : null);

  return (
    <AppShell user={user}>
      <RoomClient
        roomId={room.id}
        roomName={room.name}
        roomCode={room.room_code}
        hasPassword={room.has_password}
        initialMembers={members}
        initialStatus={room.status}
        isHost={room.host_user_id === user.id}
        currentUserId={user.id}
        initialGameKey={effectiveGameKey}
        initialGameSnapshot={initialGameSnapshot}
        initialFleetSnapshot={initialFleetSnapshot}
        initialOAnQuanSnapshot={initialOAnQuanSnapshot}
        initialChessSnapshot={initialChessSnapshot}
        initialElementalSnapshot={initialElementalSnapshot}
        initialMinPlayers={room.min_players}
        initialMaxPlayers={room.max_players}
      />
    </AppShell>
  );
}
