import { createClient } from "@supabase/supabase-js";
import type { Server, Socket } from "socket.io";
import { applyOAnQuanMove, createOAnQuanState, timeoutOAnQuanTurn } from "../../lib/games/o-an-quan/engine";
import { serializeOAnQuanState } from "../../lib/games/o-an-quan/serializer";
import type { OAnQuanDirection, OAnQuanState } from "../../lib/games/o-an-quan/types";
import type { AuthedSocket } from "../auth";

type ActivePlayerRow = {
  user_id: string;
  app_users: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
};

const runtimes = new Map<string, OAnQuanState>();
const turnTimers = new Map<string, NodeJS.Timeout>();

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function roomChannel(roomId: string) {
  return `room:${roomId}`;
}

function gameError(socket: Socket, message: string) {
  socket.emit("game:error", { message });
}

async function ensureActiveMember(roomId: string, userId: string) {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("room_members")
    .select("participation_status")
    .match({ room_id: roomId, user_id: userId })
    .maybeSingle();
  return data?.participation_status === "active_game";
}

async function roomSnapshot(roomId: string) {
  const supabase = serviceClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_code, name, game_key, status, has_password, host_user_id, min_players, max_players")
    .eq("id", roomId)
    .single();
  const { data: members } = await supabase
    .from("room_members")
    .select("user_id, role, ready, participation_status, app_users(username, display_name, avatar_url)")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });
  return {
    roomId,
    room,
    status: room?.status || "closed",
    members:
      members?.map((member) => {
        const appUser = Array.isArray(member.app_users) ? member.app_users[0] : member.app_users;
        return {
          userId: member.user_id,
          username: appUser?.username || "player",
          displayName: appUser?.display_name || appUser?.username || "Player",
          avatarUrl: appUser?.avatar_url || null,
          role: member.role,
          ready: member.ready,
          participationStatus: member.participation_status
        };
      }) || []
  };
}

async function openRoomsSnapshot() {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("rooms")
    .select("id, room_code, name, game_key, status, has_password, host_user_id, min_players, max_players, created_at, app_users!rooms_host_user_id_fkey(username, display_name, avatar_url), room_members(user_id, participation_status)")
    .in("status", ["waiting", "playing", "ended"])
    .order("status", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(24);
  return data || [];
}

function emitToPlayers(io: Server, state: OAnQuanState, event = "oaq:snapshot") {
  const snapshot = serializeOAnQuanState(state);
  for (const userId of Object.keys(state.players)) {
    io.to(`user:${userId}`).emit(event, snapshot);
  }
}

function clearTurnTimer(roomId: string) {
  const timer = turnTimers.get(roomId);
  if (!timer) return;
  clearTimeout(timer);
  turnTimers.delete(roomId);
}

function scheduleTurnTimer(io: Server, state: OAnQuanState) {
  clearTurnTimer(state.roomId);
  if (state.status !== "playing" || !state.currentTurnUserId) return;
  const delay = Math.max(0, state.turnEndsAt - Date.now());
  const timer = setTimeout(async () => {
    const current = runtimes.get(state.roomId);
    if (!current || current.sessionId !== state.sessionId || current.status !== "playing") return;
    if (!timeoutOAnQuanTurn(current)) return;
    emitToPlayers(io, current, "oaq:turn_timeout");
    if ((current as OAnQuanState).status === "ended") {
      await finishOAnQuan(io, current);
      return;
    }
    emitToPlayers(io, current);
    scheduleTurnTimer(io, current);
  }, delay + 25);
  turnTimers.set(state.roomId, timer);
}

async function finishOAnQuan(io: Server, state: OAnQuanState) {
  clearTurnTimer(state.roomId);
  runtimes.delete(state.roomId);
  const supabase = serviceClient();
  await supabase.from("rooms").update({ status: "ended" }).eq("id", state.roomId);
  await supabase.from("room_members").update({ ready: false }).eq("room_id", state.roomId);
  await supabase
    .from("game_sessions")
    .update({ status: "ended", state: serializeOAnQuanState(state), ended_at: new Date().toISOString() })
    .eq("id", state.sessionId);
  const roomState = await roomSnapshot(state.roomId);
  io.to(roomChannel(state.roomId)).emit("room:members_updated", roomState);
  io.to(roomChannel(state.roomId)).emit("room:status_updated", roomState);
  io.emit("room:open_rooms_updated", { rooms: await openRoomsSnapshot() });
  emitToPlayers(io, state, "oaq:end");
  console.log("[o-an-quan] Game ended", { roomId: state.roomId, sessionId: state.sessionId, winnerUserId: state.winnerUserId });
}

export function hasOAnQuanRuntime(roomId: string) {
  return runtimes.has(roomId);
}

export async function startOAnQuan(io: Server, roomId: string, sessionId: string, activePlayers: ActivePlayerRow[]) {
  if (runtimes.has(roomId)) throw new Error("Ô Ăn Quan runtime is already running for this room.");
  const players = activePlayers.slice(0, 2).map((member) => {
    const appUser = Array.isArray(member.app_users) ? member.app_users[0] : member.app_users;
    return {
      userId: member.user_id,
      username: appUser?.username || "player",
      displayName: appUser?.display_name || appUser?.username || "Player"
    };
  });
  if (players.length !== 2) throw new Error("Ô Ăn Quan needs exactly 2 active players.");
  const state = createOAnQuanState(sessionId, roomId, players);
  runtimes.set(roomId, state);
  emitToPlayers(io, state, "game:start");
  emitToPlayers(io, state);
  scheduleTurnTimer(io, state);
  console.log("[o-an-quan] Runtime started", { roomId, sessionId });
}

export async function stopOAnQuan(roomId: string) {
  clearTurnTimer(roomId);
  if (runtimes.delete(roomId)) console.log("[o-an-quan] Runtime cleaned up", { roomId });
}

export function emitCurrentOAnQuanSnapshot(socket: Socket, roomId: string, userId: string) {
  const state = runtimes.get(roomId);
  if (!state || !state.players[userId]) return false;
  socket.emit("oaq:snapshot", serializeOAnQuanState(state));
  return true;
}

export function registerOAnQuanHandlers(io: Server, socket: Socket) {
  const authedSocket = socket as AuthedSocket;
  const user = authedSocket.data.user;

  socket.on("oaq:sync", async ({ roomId }: { roomId?: string }) => {
    if (!roomId) return gameError(socket, "Room id is required.");
    const active = await ensureActiveMember(roomId, user.userId);
    if (!active) return gameError(socket, "You are waiting for the next round.");
    if (!emitCurrentOAnQuanSnapshot(socket, roomId, user.userId)) return gameError(socket, "Ô Ăn Quan is not active.");
  });

  socket.on("oaq:move", async ({ roomId, sessionId, selectedPitIndex, direction }: { roomId?: string; sessionId?: string; selectedPitIndex?: number; direction?: OAnQuanDirection }) => {
    if (!roomId || !sessionId || typeof selectedPitIndex !== "number" || (direction !== "clockwise" && direction !== "counterclockwise")) {
      return gameError(socket, "Invalid Ô Ăn Quan move.");
    }
    const active = await ensureActiveMember(roomId, user.userId);
    if (!active) return gameError(socket, "You are waiting for the next round.");
    const state = runtimes.get(roomId);
    if (!state || state.sessionId !== sessionId) return gameError(socket, "Ô Ăn Quan session is not active.");
    clearTurnTimer(roomId);
    const error = applyOAnQuanMove(state, user.userId, selectedPitIndex, direction);
    if (error) {
      scheduleTurnTimer(io, state);
      return gameError(socket, error);
    }
    emitToPlayers(io, state, "oaq:move_result");
    if ((state as OAnQuanState).status === "ended") {
      await finishOAnQuan(io, state);
      return;
    }
    emitToPlayers(io, state);
    scheduleTurnTimer(io, state);
  });
}
