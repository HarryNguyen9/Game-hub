import { createClient } from "@supabase/supabase-js";
import type { Server, Socket } from "socket.io";
import { createFleetState, confirmFleet, fireAt, placeFleet } from "../../lib/games/fleet-duel/engine";
import { normalizeShips } from "../../lib/games/fleet-duel/validation";
import { serializeFleetFinalState, serializeFleetStateForUser } from "../../lib/games/fleet-duel/serializer";
import type { FleetCell, FleetState } from "../../lib/games/fleet-duel/types";
import type { AuthedSocket } from "../auth";

type ActivePlayerRow = {
  user_id: string;
  app_users: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
};

const runtimes = new Map<string, FleetState>();

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

function emitToPlayers(io: Server, state: FleetState, event = "fleet:snapshot") {
  for (const userId of Object.keys(state.players)) {
    io.to(`user:${userId}`).emit(event, serializeFleetStateForUser(state, userId));
  }
}

function emitToSocket(socket: Socket, state: FleetState, userId: string, event = "fleet:snapshot") {
  socket.emit(event, serializeFleetStateForUser(state, userId));
}

async function finishFleetDuel(io: Server, state: FleetState) {
  runtimes.delete(state.roomId);
  const supabase = serviceClient();
  await supabase.from("rooms").update({ status: "ended" }).eq("id", state.roomId);
  await supabase.from("room_members").update({ ready: false }).eq("room_id", state.roomId);
  await supabase
    .from("game_sessions")
    .update({ status: "ended", state: serializeFleetFinalState(state), ended_at: new Date().toISOString() })
    .eq("id", state.sessionId);
  const roomState = await roomSnapshot(state.roomId);
  io.to(roomChannel(state.roomId)).emit("room:members_updated", roomState);
  io.to(roomChannel(state.roomId)).emit("room:status_updated", roomState);
  io.emit("room:open_rooms_updated", { rooms: await openRoomsSnapshot() });
  emitToPlayers(io, state, "fleet:end");
  console.log("[fleet-duel] Game ended", { roomId: state.roomId, sessionId: state.sessionId, winnerUserId: state.winnerUserId });
}

export function hasFleetDuelRuntime(roomId: string) {
  return runtimes.has(roomId);
}

export async function startFleetDuel(io: Server, roomId: string, sessionId: string, activePlayers: ActivePlayerRow[]) {
  if (runtimes.has(roomId)) throw new Error("Fleet Duel runtime is already running for this room.");
  const players = activePlayers.slice(0, 2).map((member) => {
    const appUser = Array.isArray(member.app_users) ? member.app_users[0] : member.app_users;
    return {
      userId: member.user_id,
      username: appUser?.username || "player",
      displayName: appUser?.display_name || appUser?.username || "Player"
    };
  });
  if (players.length !== 2) throw new Error("Fleet Duel needs exactly 2 active players.");
  const state = createFleetState(sessionId, roomId, players);
  runtimes.set(roomId, state);
  emitToPlayers(io, state, "game:start");
  emitToPlayers(io, state);
  console.log("[fleet-duel] Runtime started", { roomId, sessionId });
}

export async function stopFleetDuel(roomId: string) {
  if (runtimes.delete(roomId)) console.log("[fleet-duel] Runtime cleaned up", { roomId });
}

export function emitCurrentFleetDuelSnapshot(socket: Socket, roomId: string, userId: string) {
  const state = runtimes.get(roomId);
  if (!state) return false;
  if (!state.players[userId]) return false;
  emitToSocket(socket, state, userId);
  return true;
}

export function registerFleetDuelHandlers(io: Server, socket: Socket) {
  const authedSocket = socket as AuthedSocket;
  const user = authedSocket.data.user;

  socket.on("fleet:sync", async ({ roomId }: { roomId?: string }) => {
    if (!roomId) return gameError(socket, "Room id is required.");
    const active = await ensureActiveMember(roomId, user.userId);
    if (!active) return gameError(socket, "You are waiting for the next round.");
    const state = runtimes.get(roomId);
    if (!state || !state.players[user.userId]) return gameError(socket, "Fleet Duel is not active.");
    emitToSocket(socket, state, user.userId);
  });

  socket.on("fleet:place_ships", async ({ roomId, sessionId, ships }: { roomId?: string; sessionId?: string; ships?: Array<{ id?: string; size?: number; cells?: FleetCell[] }> }) => {
    if (!roomId || !sessionId || !Array.isArray(ships)) return gameError(socket, "Invalid fleet placement.");
    const active = await ensureActiveMember(roomId, user.userId);
    if (!active) return gameError(socket, "You are waiting for the next round.");
    const state = runtimes.get(roomId);
    if (!state || state.sessionId !== sessionId) return gameError(socket, "Fleet Duel session is not active.");
    const error = placeFleet(state, user.userId, normalizeShips(ships));
    if (error) return gameError(socket, error);
    emitToPlayers(io, state, "fleet:setup_updated");
  });

  socket.on("fleet:confirm_ready", async ({ roomId, sessionId }: { roomId?: string; sessionId?: string }) => {
    if (!roomId || !sessionId) return gameError(socket, "Invalid fleet ready request.");
    const active = await ensureActiveMember(roomId, user.userId);
    if (!active) return gameError(socket, "You are waiting for the next round.");
    const state = runtimes.get(roomId);
    if (!state || state.sessionId !== sessionId) return gameError(socket, "Fleet Duel session is not active.");
    const before = state.status;
    const error = confirmFleet(state, user.userId);
    if (error) return gameError(socket, error);
    emitToPlayers(io, state, before !== state.status ? "fleet:battle_started" : "fleet:setup_updated");
  });

  socket.on("fleet:fire", async ({ roomId, sessionId, x, y }: { roomId?: string; sessionId?: string; x?: number; y?: number }) => {
    if (!roomId || !sessionId || typeof x !== "number" || typeof y !== "number") return gameError(socket, "Invalid shot.");
    const active = await ensureActiveMember(roomId, user.userId);
    if (!active) return gameError(socket, "You are waiting for the next round.");
    const state = runtimes.get(roomId);
    if (!state || state.sessionId !== sessionId) return gameError(socket, "Fleet Duel session is not active.");
    const result = fireAt(state, user.userId, { x, y });
    if ("error" in result) return gameError(socket, result.error);
    emitToPlayers(io, state, "fleet:shot_result");
    if (state.status === "ended") {
      await finishFleetDuel(io, state);
    } else {
      emitToPlayers(io, state, "fleet:turn_changed");
    }
  });
}
