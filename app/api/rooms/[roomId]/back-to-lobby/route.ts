import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await requireUser();
  const { roomId } = await params;
  const supabase = createServiceClient();
  const { data: room } = await supabase.from("rooms").select("host_user_id, status").eq("id", roomId).single();
  if (!room) return fail("Room not found.", 404);
  if (room.host_user_id !== session.userId) return fail("Only the host can go back to lobby.", 403);

  await supabase.from("rooms").update({ status: "waiting" }).eq("id", roomId);
  await supabase.from("room_members").update({ participation_status: "lobby", ready: false }).eq("room_id", roomId);
  await supabase.from("room_members").update({ participation_status: "lobby", ready: true }).match({ room_id: roomId, user_id: room.host_user_id });
  await supabase
    .from("game_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("status", "playing");

  return ok({ ok: true });
}
