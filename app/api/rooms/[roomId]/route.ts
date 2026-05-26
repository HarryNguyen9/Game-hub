import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { notifyOpenRoomsChanged } from "@/lib/socket-notify";
import { createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ roomId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await requireUser();
  const { roomId } = await params;
  const supabase = createServiceClient();
  const { data: room, error } = await supabase
    .from("rooms")
    .select(
      "id, room_code, name, game_key, status, has_password, host_user_id, app_users!rooms_host_user_id_fkey(username, display_name, avatar_url), room_members(user_id, role, ready, participation_status, app_users(username, display_name, avatar_url))"
    )
    .eq("id", roomId)
    .single();

  if (error || !room) {
    await supabase.from("room_members").delete().match({ room_id: roomId, user_id: session.userId });
    return fail("Room not found.", 404);
  }
  const isMember = room.room_members.some((member) => member.user_id === session.userId);
  if (!isMember && room.host_user_id !== session.userId) return fail("Join this room before opening it.", 403);

  return ok({ room });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireUser();
  const { roomId } = await params;
  const supabase = createServiceClient();
  const { data: room } = await supabase.from("rooms").select("host_user_id").eq("id", roomId).single();

  if (room?.host_user_id === session.userId) {
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);
    if (error) {
      console.error("[rooms:delete] Could not delete room after host left", { error, roomId, userId: session.userId });
      return fail(`Could not delete room: ${error.message}`, 500);
    }
  } else {
    const { error } = await supabase.from("room_members").delete().match({ room_id: roomId, user_id: session.userId });
    if (error) {
      console.error("[rooms:delete] Could not remove room member", { error, roomId, userId: session.userId });
      return fail(`Could not leave room: ${error.message}`, 500);
    }
  }

  await notifyOpenRoomsChanged();
  return ok({ ok: true });
}
