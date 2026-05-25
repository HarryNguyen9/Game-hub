import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await requireUser();
  const { roomId } = await params;
  const supabase = createServiceClient();
  const { data: room } = await supabase.from("rooms").select("host_user_id, status, game_key").eq("id", roomId).single();

  if (!room) return fail("Room not found.", 404);
  if (room.host_user_id !== session.userId) return fail("Only the host can start the game.", 403);
  if (room.status !== "waiting") return fail("Room is not waiting.", 409);
  if (!room.game_key) return fail("Choose a game before starting.", 409);

  const { data: members } = await supabase.from("room_members").select("role, ready, participation_status").eq("room_id", roomId);
  const unready = (members || []).filter((member) => member.role === "player" && member.participation_status === "lobby" && !member.ready);
  if (unready.length > 0) return fail("Waiting for all players to be ready.", 409);

  const { error } = await supabase.from("rooms").update({ status: "playing" }).eq("id", roomId);
  if (error) return fail("Could not start game.", 500);
  await supabase.from("room_members").update({ participation_status: "active_game" }).eq("room_id", roomId).eq("participation_status", "lobby");
  await supabase.from("room_members").update({ ready: true }).eq("room_id", roomId).eq("role", "host");
  await supabase.from("game_sessions").insert({ room_id: roomId, game_key: room.game_key, status: "playing", started_at: new Date().toISOString() });
  return ok({ ok: true });
}
