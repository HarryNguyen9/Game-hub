import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, zodFail } from "@/lib/http";
import { notifyOpenRoomsChanged } from "@/lib/socket-notify";
import { createServiceClient } from "@/lib/supabase/server";
import { joinRoomSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const session = await requireUser();
    const input = joinRoomSchema.parse(await request.json());
    const supabase = createServiceClient();
    const query = supabase
      .from("rooms")
      .select("id, status, has_password, password_hash")
      .in("status", ["waiting", "playing"]);

    const { data: room, error: roomError } = await (input.roomId ? query.eq("id", input.roomId) : query.eq("room_code", input.roomCode || "")).maybeSingle();

    if (roomError) {
      console.error("[rooms:join] Could not find room", {
        error: roomError,
        roomId: input.roomId,
        roomCode: input.roomCode
      });
      return fail(`Could not find room: ${roomError.message}`, 500);
    }
    if (!room) return fail("Room not found.", 404);
    if (room.has_password) {
      const validPassword = room.password_hash && (await bcrypt.compare(input.password || "", room.password_hash));
      if (!validPassword) return fail("Room password is incorrect.", 401);
    } else if (input.password?.trim()) {
      return fail("This room is public. Leave the password empty.", 400);
    }

    const { data: existingMember, error: existingMemberError } = await supabase
      .from("room_members")
      .select("user_id")
      .match({ room_id: room.id, user_id: session.userId })
      .maybeSingle();

    if (existingMemberError) {
      console.error("[rooms:join] Could not check existing room member", {
        error: existingMemberError,
        roomId: room.id,
        userId: session.userId
      });
      return fail(`Could not join room: ${existingMemberError.message}`, 500);
    }

    if (existingMember) {
      return ok({ roomId: room.id });
    }

    const { error: memberError } = await supabase.from("room_members").insert({
      room_id: room.id,
      user_id: session.userId,
      role: "player",
      ready: false,
      participation_status: room.status === "playing" ? "waiting_next_round" : "lobby"
    });

    if (memberError) {
      console.error("[rooms:join] Could not upsert room member", {
        error: memberError,
        roomId: room.id,
        userId: session.userId
      });
      return fail(`Could not join room: ${memberError.message}`, 500);
    }

    await notifyOpenRoomsChanged();
    return ok({ roomId: room.id });
  } catch (error) {
    if (error instanceof ZodError) return zodFail(error);
    console.error("[rooms:join] Unexpected error", error);
    return fail("Could not join room.", 500);
  }
}
