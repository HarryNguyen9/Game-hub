import { createClient } from "@supabase/supabase-js";
import type { Server, Socket } from "socket.io";
import { buildTower, createElementalState, selectMonsterType, selectSendElement, sellTower, setTowerTargetMode, stepElementalState, upgradeTower } from "../../lib/games/elemental-duels/engine";
import { serializeElementalState } from "../../lib/games/elemental-duels/serializer";
import type { ElementKey, ElementalPlayerInput, ElementalState, TowerTargetMode } from "../../lib/games/elemental-duels/types";
import { ELEMENTAL_CONFIG } from "../../lib/games/elemental-duels/config";
import type { AuthedSocket } from "../auth";

type Runtime = {
  state: ElementalState;
  tickTimer: NodeJS.Timeout | null;
  snapshotTimer: NodeJS.Timeout | null;
  lastTickAt: number;
};

type ActivePlayerRow = {
  user_id: string;
  app_users: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
};

const runtimes = new Map<string, Runtime>();

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
  socket.emit("elemental:error", { message });
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

function emitSnapshot(io: Server, state: ElementalState) {
  io.to(roomChannel(state.roomId)).emit("elemental:snapshot", serializeElementalState(state));
}

async function finishGame(io: Server, runtime: Runtime) {
  const { state } = runtime;
  clearRuntime(state.roomId);
  const snapshot = serializeElementalState(state);
  const supabase = serviceClient();
  await supabase.from("rooms").update({ status: "ended" }).eq("id", state.roomId);
  await supabase.from("room_members").update({ ready: false }).eq("room_id", state.roomId);
  await supabase
    .from("game_sessions")
    .update({
      status: "ended",
      state: snapshot,
      ended_at: new Date().toISOString()
    })
    .eq("id", state.sessionId);
  const roomState = await roomSnapshot(state.roomId);
  io.to(roomChannel(state.roomId)).emit("room:members_updated", roomState);
  io.to(roomChannel(state.roomId)).emit("room:status_updated", roomState);
  io.emit("room:open_rooms_updated", { rooms: await openRoomsSnapshot() });
  io.to(roomChannel(state.roomId)).emit("elemental:end", snapshot);
  console.log("[elemental-duels] Game ended", { roomId: state.roomId, sessionId: state.sessionId, winnerUserId: state.winnerUserId });
}

function clearRuntime(roomId: string) {
  const runtime = runtimes.get(roomId);
  if (!runtime) return;
  if (runtime.tickTimer) clearInterval(runtime.tickTimer);
  if (runtime.snapshotTimer) clearInterval(runtime.snapshotTimer);
  runtimes.delete(roomId);
  console.log("[elemental-duels] Runtime cleaned up", { roomId });
}

function startLoop(io: Server, runtime: Runtime) {
  runtime.tickTimer = setInterval(() => {
    const now = Date.now();
    const deltaMs = Math.min(250, now - runtime.lastTickAt);
    runtime.lastTickAt = now;
    const ended = stepElementalState(runtime.state, deltaMs);
    if (ended || runtime.state.status === "ended") void finishGame(io, runtime);
  }, 1000 / ELEMENTAL_CONFIG.simulationTickRate);
  runtime.snapshotTimer = setInterval(() => emitSnapshot(io, runtime.state), 1000 / ELEMENTAL_CONFIG.snapshotRate);
}

export function hasElementalDuelsRuntime(roomId: string) {
  return runtimes.has(roomId);
}

export async function startElementalDuels(io: Server, roomId: string, sessionId: string, activePlayers: ActivePlayerRow[]) {
  if (runtimes.has(roomId)) throw new Error("Elemental Duels runtime is already running for this room.");
  const players: ElementalPlayerInput[] = activePlayers.slice(0, 2).map((member) => {
    const appUser = Array.isArray(member.app_users) ? member.app_users[0] : member.app_users;
    return {
      userId: member.user_id,
      username: appUser?.username || "player",
      displayName: appUser?.display_name || appUser?.username || "Player"
    };
  });
  const state = createElementalState(sessionId, roomId, players);
  const runtime = { state, tickTimer: null, snapshotTimer: null, lastTickAt: Date.now() } satisfies Runtime;
  runtimes.set(roomId, runtime);
  io.to(roomChannel(roomId)).emit("game:start", serializeElementalState(state));
  emitSnapshot(io, state);
  startLoop(io, runtime);
  console.log("[elemental-duels] Runtime started", { roomId, sessionId, players: players.length, mapId: state.mapId });
}

export async function stopElementalDuels(roomId: string) {
  clearRuntime(roomId);
}

export function emitCurrentElementalDuelsSnapshot(socket: Socket, roomId: string) {
  const runtime = runtimes.get(roomId);
  if (!runtime) return false;
  socket.emit("elemental:snapshot", serializeElementalState(runtime.state));
  return true;
}

async function withRuntime(socket: Socket, roomId: string | undefined, sessionId: string | undefined, userId: string, action: (runtime: Runtime) => string | null) {
  if (!roomId || !sessionId) return gameError(socket, "Room id and session id are required.");
  const active = await ensureActiveMember(roomId, userId);
  if (!active) return gameError(socket, "You are waiting for the next round.");
  const runtime = runtimes.get(roomId);
  if (!runtime || runtime.state.sessionId !== sessionId) return gameError(socket, "Elemental Duels session is not active.");
  if (!runtime.state.players[userId]) return gameError(socket, "You are not an active player in this duel.");
  const error = action(runtime);
  if (error) return gameError(socket, error);
  socket.emit("elemental:snapshot", serializeElementalState(runtime.state));
}

export function registerElementalDuelsHandlers(io: Server, socket: Socket) {
  const authedSocket = socket as AuthedSocket;
  const user = authedSocket.data.user;

  socket.on("elemental:sync", async ({ roomId }: { roomId?: string }) => {
    if (!roomId) return gameError(socket, "Room id is required.");
    const active = await ensureActiveMember(roomId, user.userId);
    if (!active) return gameError(socket, "You are waiting for the next round.");
    if (!emitCurrentElementalDuelsSnapshot(socket, roomId)) return gameError(socket, "Elemental Duels is not active.");
  });

  socket.on("elemental:build_tower", async ({ roomId, sessionId, towerType, x, y }: { roomId?: string; sessionId?: string; towerType?: string; x?: number; y?: number }) => {
    if (!towerType || typeof x !== "number" || typeof y !== "number") return gameError(socket, "Invalid build request.");
    await withRuntime(socket, roomId, sessionId, user.userId, (runtime) => buildTower(runtime.state, user.userId, towerType, { x, y }));
  });

  socket.on("elemental:upgrade_tower", async ({ roomId, sessionId, towerId }: { roomId?: string; sessionId?: string; towerId?: string }) => {
    if (!towerId) return gameError(socket, "Tower id is required.");
    await withRuntime(socket, roomId, sessionId, user.userId, (runtime) => upgradeTower(runtime.state, user.userId, towerId));
  });

  socket.on("elemental:sell_tower", async ({ roomId, sessionId, towerId }: { roomId?: string; sessionId?: string; towerId?: string }) => {
    if (!towerId) return gameError(socket, "Tower id is required.");
    await withRuntime(socket, roomId, sessionId, user.userId, (runtime) => sellTower(runtime.state, user.userId, towerId));
  });

  socket.on("elemental:set_tower_target_mode", async ({ roomId, sessionId, towerId, mode }: { roomId?: string; sessionId?: string; towerId?: string; mode?: TowerTargetMode }) => {
    if (!towerId || !mode) return gameError(socket, "Tower id and mode are required.");
    await withRuntime(socket, roomId, sessionId, user.userId, (runtime) => setTowerTargetMode(runtime.state, user.userId, towerId, mode));
  });

  socket.on("elemental:select_send_element", async ({ roomId, sessionId, element }: { roomId?: string; sessionId?: string; element?: ElementKey }) => {
    if (!element) return gameError(socket, "Element is required.");
    await withRuntime(socket, roomId, sessionId, user.userId, (runtime) => selectSendElement(runtime.state, user.userId, element));
  });

  socket.on("elemental:select_monster_type", async ({ roomId, sessionId, monsterType }: { roomId?: string; sessionId?: string; monsterType?: string }) => {
    if (!monsterType) return gameError(socket, "Monster type is required.");
    await withRuntime(socket, roomId, sessionId, user.userId, (runtime) => selectMonsterType(runtime.state, user.userId, monsterType));
  });
}
