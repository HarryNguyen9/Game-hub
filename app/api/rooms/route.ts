import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, zodFail } from "@/lib/http";
import { createRoomCode } from "@/lib/room-code";
import { notifyOpenRoomsChanged } from "@/lib/socket-notify";
import { createServiceClient } from "@/lib/supabase/server";
import { createRoomSchema } from "@/lib/validation";

function devDetails(error: unknown) {
  return process.env.NODE_ENV === "development" ? error : undefined;
}

async function findAvailableRoomCode(supabase: ReturnType<typeof createServiceClient>) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const code = createRoomCode();
    const { data, error } = await supabase
      .from("rooms")
      .select("id")
      .eq("room_code", code)
      .in("status", ["waiting", "playing"])
      .maybeSingle();

    if (error) throw new Error(`Could not check room code availability: ${error.message}`);
    if (!data) return code;
  }

  throw new Error("Could not generate an available room code. Please try again.");
}

export async function GET() {
  await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("id, room_code, name, game_key, status, has_password, host_user_id, created_at, app_users!rooms_host_user_id_fkey(username, display_name, avatar_url), room_members(user_id)")
    .in("status", ["waiting", "playing"])
    .order("status", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(24);

  if (error) return fail("Could not load rooms.", 500);
  return ok({ rooms: data || [] });
}

export async function POST(request: Request) {
  try {
    const session = await requireUser();
    const input = createRoomSchema.parse(await request.json());
    const supabase = createServiceClient();
    const passwordHash = input.hasPassword ? await bcrypt.hash(input.password?.trim() || "", 12) : null;
    const roomCode = await findAvailableRoomCode(supabase);
    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        host_user_id: session.userId,
        room_code: roomCode,
        name: input.name,
        game_key: "",
        has_password: input.hasPassword,
        password_hash: passwordHash,
        status: "waiting"
      })
      .select("id, room_code")
      .single();

    if (error || !room) {
      console.error("[rooms:create] Could not insert room", {
        error,
        input: { name: input.name, hasPassword: input.hasPassword, roomCode },
        hint: "If your local Supabase schema is older, make sure rooms.game_key is nullable or accepts an empty placeholder."
      });
      return fail(error?.message ? `Could not create room: ${error.message}` : "Could not create room.", 500, devDetails(error));
    }

    const { error: memberError } = await supabase.from("room_members").upsert({
      room_id: room.id,
      user_id: session.userId,
      role: "host",
      ready: true,
      participation_status: "lobby"
    });

    if (memberError) {
      console.error("[rooms:create] Could not create host membership", {
        error: memberError,
        roomId: room.id,
        userId: session.userId
      });
      return fail(`Room was created but host membership failed: ${memberError.message}`, 500, devDetails(memberError));
    }

    await notifyOpenRoomsChanged();
    return ok({ roomId: room.id, roomCode: room.room_code }, 201);
  } catch (error) {
    if (error instanceof ZodError) return zodFail(error);
    console.error("[rooms:create] Unexpected error", error);
    return fail(error instanceof Error ? `Could not create room: ${error.message}` : "Could not create room.", 500, devDetails(error));
  }
}
