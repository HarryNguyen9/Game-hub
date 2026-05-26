import { createClient } from "@supabase/supabase-js";
import type { Server, Socket } from "socket.io";
import { applyChessMove, createChessState, resignChess, timeoutChessTurn } from "../../lib/games/chess/engine";
import { serializeChessState } from "../../lib/games/chess/serializer";
import type { ChessState } from "../../lib/games/chess/types";
import type { AuthedSocket } from "../auth";

type ActivePlayerRow = {
  user_id: string;
  app_users: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
};

const runtimes = new Map<string, ChessState>();
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

function emitToPlayers(io: Server, state: ChessState, event = "chess:snapshot") {
  const snapshot = serializeChessState(state);
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

function scheduleTurnTimer(io: Server, state: ChessState) {
  clearTurnTimer(state.roomId);
  if (state.status !== "playing" || !state.currentTurnUserId) return;
  const delay = Math.max(0, state.turnEndsAt - Date.now());
  const timer = setTimeout(async () => {
    const current = runtimes.get(state.roomId);
    if (!current || current.sessionId !== state.sessionId || current.status !== "playing") return;
    if (!timeoutChessTurn(current)) return;
    emitToPlayers(io, current, "chess:turn_timeout");
    await finishChess(io, current);
  }, delay + 25);
  turnTimers.set(state.roomId, timer);
}

async function finishChess(io: Server, state: ChessState) {
  clearTurnTimer(state.roomId);
  runtimes.delete(state.roomId);
  const supabase = serviceClient();
  await supabase.from("rooms").update({ status: "ended" }).eq("id", state.roomId);
  await supabase.from("room_members").update({ ready: false }).eq("room_id", state.roomId);
  await supabase
    .from("game_sessions")
    .update({ status: "ended", state: serializeChessState(state), ended_at: new Date().toISOString() })
    .eq("id", state.sessionId);
  const roomState = await roomSnapshot(state.roomId);
  io.to(roomChannel(state.roomId)).emit("room:members_updated", roomState);
  io.to(roomChannel(state.roomId)).emit("room:status_updated", roomState);
  io.emit("room:open_rooms_updated", { rooms: await openRoomsSnapshot() });
  emitToPlayers(io, state, "chess:end");
  console.log("[chess] Game ended", { roomId: state.roomId, sessionId: state.sessionId, winnerUserId: state.winnerUserId, endReason: state.endReason });
}

export function hasChessRuntime(roomId: string) {
  return runtimes.has(roomId);
}

export async function startChess(io: Server, roomId: string, sessionId: string, activePlayers: ActivePlayerRow[]) {
  if (runtimes.has(roomId)) throw new Error("Chess runtime is already running for this room.");
  const players = activePlayers.slice(0, 2).map((member) => {
    const appUser = Array.isArray(member.app_users) ? member.app_users[0] : member.app_users;
    return {
      userId: member.user_id,
      username: appUser?.username || "player",
      displayName: appUser?.display_name || appUser?.username || "Player"
    };
  });
  if (players.length !== 2) throw new Error("Chess needs exactly 2 active players.");
  const state = createChessState(sessionId, roomId, players);
  runtimes.set(roomId, state);
  emitToPlayers(io, state, "game:start");
  emitToPlayers(io, state);
  scheduleTurnTimer(io, state);
  console.log("[chess] Runtime started", { roomId, sessionId });
}

export async function stopChess(roomId: string) {
  clearTurnTimer(roomId);
  if (runtimes.delete(roomId)) console.log("[chess] Runtime cleaned up", { roomId });
}

export function emitCurrentChessSnapshot(socket: Socket, roomId: string, userId: string) {
  const state = runtimes.get(roomId);
  if (!state || !state.players[userId]) return false;
  socket.emit("chess:snapshot", serializeChessState(state));
  return true;
}

export function registerChessHandlers(io: Server, socket: Socket) {
  const authedSocket = socket as AuthedSocket;
  const user = authedSocket.data.user;

  socket.on("chess:sync", async ({ roomId }: { roomId?: string }) => {
    if (!roomId) return gameError(socket, "Room id is required.");
    const active = await ensureActiveMember(roomId, user.userId);
    if (!active) return gameError(socket, "You are waiting for the next round.");
    if (!emitCurrentChessSnapshot(socket, roomId, user.userId)) return gameError(socket, "Chess is not active.");
  });

  socket.on("chess:move", async ({ roomId, sessionId, from, to, promotion }: { roomId?: string; sessionId?: string; from?: string; to?: string; promotion?: string }) => {
    if (!roomId || !sessionId || typeof from !== "string" || typeof to !== "string") return gameError(socket, "Invalid chess move.");
    const active = await ensureActiveMember(roomId, user.userId);
    if (!active) return gameError(socket, "You are waiting for the next round.");
    const state = runtimes.get(roomId);
    if (!state || state.sessionId !== sessionId) return gameError(socket, "Chess session is not active.");
    clearTurnTimer(roomId);
    const error = applyChessMove(state, user.userId, from, to, promotion || "q");
    if (error) {
      scheduleTurnTimer(io, state);
      return gameError(socket, error);
    }
    emitToPlayers(io, state, "chess:move_result");
    if (state.status === "ended") {
      await finishChess(io, state);
      return;
    }
    emitToPlayers(io, state, "chess:turn_changed");
    emitToPlayers(io, state);
    scheduleTurnTimer(io, state);
  });

  socket.on("chess:resign", async ({ roomId, sessionId }: { roomId?: string; sessionId?: string }) => {
    if (!roomId || !sessionId) return gameError(socket, "Invalid resign request.");
    const active = await ensureActiveMember(roomId, user.userId);
    if (!active) return gameError(socket, "You are waiting for the next round.");
    const state = runtimes.get(roomId);
    if (!state || state.sessionId !== sessionId) return gameError(socket, "Chess session is not active.");
    const error = resignChess(state, user.userId);
    if (error) return gameError(socket, error);
    emitToPlayers(io, state, "chess:end");
    await finishChess(io, state);
  });
}
