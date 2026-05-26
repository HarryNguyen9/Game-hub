import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

type RoomJoin = {
  id: string;
  name: string;
  status: "waiting" | "playing" | "ended" | "closed";
};

export async function getActiveRoomForUser(userId: string) {
  noStore();
  const supabase = createServiceClient();
  const { data: memberRows } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", userId)
    .limit(10);

  const roomIds = (memberRows || []).map((row) => row.room_id).filter(Boolean);
  if (roomIds.length === 0) return null;

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, status")
    .in("id", roomIds)
    .neq("status", "closed")
    .order("updated_at", { ascending: false })
    .limit(1);

  const active = (rooms?.[0] as RoomJoin | undefined) || null;
  if (active) return { id: active.id, name: active.name, status: active.status };

  await supabase.from("room_members").delete().eq("user_id", userId).in("room_id", roomIds);
  return null;
}
