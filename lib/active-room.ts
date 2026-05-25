import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

type RoomJoin = {
  id: string;
  name: string;
  status: "waiting" | "playing" | "ended" | "closed";
};

export async function getActiveRoomForUser(userId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("room_members")
    .select("room_id, rooms(id, name, status)")
    .eq("user_id", userId)
    .limit(10);

  const active = (data || [])
    .map((row) => {
      const room = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
      return room as RoomJoin | null;
    })
    .find((room) => room && room.status !== "closed");

  return active ? { id: active.id, name: active.name, status: active.status } : null;
}
