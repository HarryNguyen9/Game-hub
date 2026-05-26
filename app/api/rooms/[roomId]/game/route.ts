import { requireUser } from "@/lib/auth";
import { getGameConfig } from "@/lib/constants";
import { fail, ok } from "@/lib/http";
import { notifyOpenRoomsChanged } from "@/lib/socket-notify";
import { createServiceClient } from "@/lib/supabase/server";
import { selectRoomGameSchema } from "@/lib/validation";

type Params = { params: Promise<{ roomId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireUser();
  const { roomId } = await params;
  const parsed = selectRoomGameSchema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid game.", 422);

  const game = getGameConfig(parsed.data.gameKey);
  if (!game) return fail("Unknown game.", 422);

  const supabase = createServiceClient();
  const { data: room, error: readError } = await supabase.from("rooms").select("host_user_id, status").eq("id", roomId).single();
  if (readError || !room) return fail(readError?.message || "Room not found.", 404);
  if (room.host_user_id !== session.userId) return fail("Only the host can choose game.", 403);
  if (room.status !== "waiting") return fail("Game can only be changed while waiting.", 409);
  const { count } = await supabase
    .from("room_members")
    .select("user_id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("participation_status", "lobby");
  if ((count || 0) > game.maxPlayers) return fail(`${game.name} supports up to ${game.maxPlayers} players.`, 409);

  const { error } = await supabase
    .from("rooms")
    .update({ game_key: parsed.data.gameKey, min_players: game.minPlayers, max_players: game.maxPlayers })
    .eq("id", roomId);
  if (error) {
    console.error("[rooms:select-game] Could not update room game", { error, roomId, gameKey: parsed.data.gameKey });
    return fail(`Could not choose game: ${error.message}`, 500);
  }

  await notifyOpenRoomsChanged();
  return ok({ gameKey: parsed.data.gameKey, minPlayers: game.minPlayers, maxPlayers: game.maxPlayers });
}
