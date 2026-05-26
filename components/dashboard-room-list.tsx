"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { Lock, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

type Room = {
  id: string;
  room_code: string | null;
  name: string;
  game_key: string | null;
  has_password: boolean;
  status: "waiting" | "playing";
  app_users?: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
  room_members?: { user_id: string }[];
};

export function DashboardRoomList() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [joiningRoom, setJoiningRoom] = useState<Room | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingRoomId, setLoadingRoomId] = useState<string | null>(null);

  useEffect(() => {
    let activeSocket: Socket | null = null;
    let cancelled = false;

    async function loadRooms() {
      const response = await fetch("/api/rooms");
      const payload = await response.json();
      if (!cancelled) setRooms(payload.rooms || []);
    }

    async function connectDashboardSocket() {
      const response = await fetch("/api/socket-token");
      const payload = await response.json();
      if (!response.ok) return;
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
      if (!socketUrl) return;
      activeSocket = io(socketUrl, {
        auth: { token: payload.token }
      });
      activeSocket.on("room:open_rooms_updated", ({ rooms: nextRooms }: { rooms: Room[] }) => setRooms(nextRooms || []));
      activeSocket.on("connect", () => loadRooms());
    }

    loadRooms()
      .then(connectDashboardSocket)
      .catch(() => setRooms([]));

    const interval = window.setInterval(loadRooms, 10000);
    window.addEventListener("focus", loadRooms);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadRooms);
      activeSocket?.disconnect();
    };
  }, []);

  if (rooms.length === 0) {
    return <p className="rounded-3xl bg-white/80 p-5 text-sm font-semibold text-slate-500">No rooms yet. Create the first cozy lobby.</p>;
  }

  async function join(room: Room, roomPassword = "") {
    if (loadingRoomId) return;
    setError("");
    setLoadingRoomId(room.id);
    const response = await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, password: roomPassword })
    });
    const payload = await response.json();
    setLoadingRoomId(null);
    if (!response.ok) {
      setError(payload.error || "Could not join room.");
      return;
    }
    router.push(`/rooms/${payload.roomId}`);
  }

  return (
    <div className="grid gap-3">
      {rooms.map((room) => (
        <article key={room.id} className="rounded-3xl bg-white/88 p-4 shadow-sm ring-1 ring-white transition hover:-translate-y-0.5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-black">{room.name}</p>
              <p className="text-sm font-semibold text-slate-500">{room.game_key ? room.game_key.replaceAll("-", " ") : "No game selected"}</p>
              <p className="text-xs font-bold text-slate-400">
                Host {Array.isArray(room.app_users) ? room.app_users[0]?.display_name || room.app_users[0]?.username : room.app_users?.display_name || room.app_users?.username}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {room.room_code && <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">#{room.room_code}</span>}
              {room.has_password && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"><Lock size={13} /> Locked</span>}
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">{room.status === "playing" ? "In Game" : "Waiting"}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-slate-500">
            <span className="inline-flex items-center gap-2"><UsersRound size={16} /> {room.room_members?.length || 0} players</span>
            <Button className="min-h-9 px-4 py-1" variant="secondary" disabled={loadingRoomId === room.id} onClick={() => (room.has_password ? (setPassword(""), setError(""), setJoiningRoom(room)) : join(room))}>
              {loadingRoomId === room.id ? "Joining..." : "Join"}
            </Button>
          </div>
        </article>
      ))}
      {joiningRoom && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/30 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              join(joiningRoom, password);
            }}
            className="w-full max-w-sm rounded-[2rem] bg-white p-5 shadow-2xl"
          >
            <h3 className="text-lg font-black">Room password</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{joiningRoom.name} is locked.</p>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-300" />
            {error && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <Button disabled={loadingRoomId === joiningRoom.id}>{loadingRoomId === joiningRoom.id ? "Joining..." : "Join"}</Button>
              <Button type="button" variant="secondary" onClick={() => setJoiningRoom(null)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
