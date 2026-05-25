import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { createServiceClient } from "@/lib/supabase/server";
import { roomCodeSchema } from "@/lib/validation";

export async function GET(request: Request) {
  await requireUser();

  const url = new URL(request.url);
  const parsed = roomCodeSchema.safeParse(url.searchParams.get("roomCode"));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid room code.", 422);

  const supabase = createServiceClient();
  const { data: room, error } = await supabase
    .from("rooms")
    .select("id, room_code, name, game_key, status, has_password, room_members(user_id)")
    .eq("room_code", parsed.data)
    .in("status", ["waiting", "playing"])
    .maybeSingle();

  if (error) {
    console.error("[rooms:lookup] Could not lookup room code", { error, roomCode: parsed.data });
    return fail(`Could not lookup room: ${error.message}`, 500);
  }

  if (!room) return fail("Room not found.", 404);

  return ok({
    room: {
      id: room.id,
      roomCode: room.room_code,
      name: room.name,
      gameKey: room.game_key,
      status: room.status,
      hasPassword: room.has_password,
      playerCount: room.room_members?.length || 0
    }
  });
}
