import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await requireUser();
  const { roomId } = await params;
  const supabase = createServiceClient();
  const { data: room } = await supabase.from("rooms").select("status").eq("id", roomId).single();
  if (!room) return fail("Room not found.", 404);
  if (room.status !== "waiting") return fail("You can only ready while the room is waiting.", 409);

  const { data: member } = await supabase
    .from("room_members")
    .select("role, ready, participation_status")
    .match({ room_id: roomId, user_id: session.userId })
    .single();

  if (!member) return fail("You are not a room member.", 403);
  if (member.role === "host") return fail("Host is auto-ready.", 409);
  if (member.participation_status !== "lobby") return fail("You can ready on the next lobby.", 409);

  const { error } = await supabase
    .from("room_members")
    .update({ ready: !member.ready })
    .match({ room_id: roomId, user_id: session.userId });

  if (error) return fail("Could not update ready status.", 500);
  return ok({ ready: !member.ready });
}
