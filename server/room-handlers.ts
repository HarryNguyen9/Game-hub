import { createClient } from "@supabase/supabase-js";
import type { Server, Socket } from "socket.io";
import type { AuthedSocket } from "./auth";
import { GAME_CATALOG, getGameConfig } from "../lib/constants";
import { emitCurrentFlappyRushSnapshot, hasFlappyRushRuntime, startFlappyRush, stopFlappyRush } from "./socket/flappy-rush-handlers";
import { emitCurrentFleetDuelSnapshot, hasFleetDuelRuntime, startFleetDuel, stopFleetDuel } from "./socket/fleet-duel-handlers";
import { emitCurrentOAnQuanSnapshot, hasOAnQuanRuntime, startOAnQuan, stopOAnQuan } from "./socket/o-an-quan-handlers";

const DISCONNECT_GRACE_MS = 7000;
const presenceDisconnectTimers = new Map<string, NodeJS.Timeout>();
const startLocks = new Set<string>();
const backToLobbyLocks = new Set<string>();

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function ensureMember(roomId: string, userId: string) {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("room_members")
    .select("role, ready, participation_status")
    .match({ room_id: roomId, user_id: userId })
    .maybeSingle();
  return data;
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

export async function broadcastOpenRooms(io: Server) {
  io.emit("room:open_rooms_updated", { rooms: await openRoomsSnapshot() });
}

async function emitRoom(io: Server, roomId: string) {
  const snapshot = await roomSnapshot(roomId);
  io.to(`room:${roomId}`).emit("room:members_updated", snapshot);
  io.to(`room:${roomId}`).emit("room:status_updated", snapshot);
  await broadcastOpenRooms(io);
}

async function stopGameRuntime(roomId: string, gameKey?: string | null) {
  if (!gameKey || gameKey === "flappy-rush") await stopFlappyRush(roomId);
  if (!gameKey || gameKey === "fleet-duel") await stopFleetDuel(roomId);
  if (!gameKey || gameKey === "o-an-quan") await stopOAnQuan(roomId);
}

function roomError(socket: Socket, message: string) {
  socket.emit("room:error", { message });
}

function presenceKey(roomId: string, userId: string) {
  return `${roomId}:${userId}`;
}

function clearPresenceDisconnect(roomId: string, userId: string) {
  const key = presenceKey(roomId, userId);
  const timer = presenceDisconnectTimers.get(key);
  if (!timer) return;
  clearTimeout(timer);
  presenceDisconnectTimers.delete(key);
}

export function registerRoomHandlers(io: Server, socket: Socket) {
  const authedSocket = socket as AuthedSocket;
  const user = authedSocket.data.user;

  async function syncLobbyPresence(roomId: string, connected: boolean) {
    const supabase = serviceClient();
    const member = await ensureMember(roomId, user.userId);
    if (!member) return;

    const { data: room } = await supabase.from("rooms").select("host_user_id, status").eq("id", roomId).single();
    if (room?.status !== "waiting") return;

    if (room.host_user_id === user.userId || member.role === "host") {
      await supabase
        .from("room_members")
        .update({ ready: connected, participation_status: "lobby" })
        .match({ room_id: roomId, user_id: user.userId });
    } else if (!connected && member.participation_status === "lobby") {
      await supabase.from("room_members").update({ ready: false }).match({ room_id: roomId, user_id: user.userId });
    }

    await emitRoom(io, roomId);
  }

  function scheduleLobbyDisconnect(roomId: string) {
    clearPresenceDisconnect(roomId, user.userId);
    const key = presenceKey(roomId, user.userId);
    const timer = setTimeout(() => {
      presenceDisconnectTimers.delete(key);
      void syncLobbyPresence(roomId, false).catch((error) => {
        console.error("[room:disconnect] Could not sync lobby presence", { error, roomId, userId: user.userId });
      });
    }, DISCONNECT_GRACE_MS);
    presenceDisconnectTimers.set(key, timer);
  }

  socket.on("room:join", async ({ roomId, presence = true }: { roomId?: string; presence?: boolean }) => {
    if (!roomId) return roomError(socket, "Room id is required.");

    const member = await ensureMember(roomId, user.userId);
    if (!member) return roomError(socket, "Join this room before opening realtime lobby.");

    const channel = `room:${roomId}`;
    socket.join(channel);
    if (presence) {
      clearPresenceDisconnect(roomId, user.userId);
      authedSocket.data.rooms = new Set([...(authedSocket.data.rooms || []), roomId]);
      await syncLobbyPresence(roomId, true);
    }
    const snapshot = await roomSnapshot(roomId);
    socket.emit("room:joined", snapshot);
    await emitRoom(io, roomId);
    console.log("[room:join]", { roomId, userId: user.userId, presence, status: snapshot.status });
    if (snapshot.room?.status === "playing" && snapshot.room.game_key === "flappy-rush" && member.participation_status === "active_game") {
      emitCurrentFlappyRushSnapshot(socket, roomId);
    }
    if (snapshot.room?.status === "playing" && snapshot.room.game_key === "fleet-duel" && member.participation_status === "active_game") {
      emitCurrentFleetDuelSnapshot(socket, roomId, user.userId);
    }
    if (snapshot.room?.status === "playing" && snapshot.room.game_key === "o-an-quan" && member.participation_status === "active_game") {
      emitCurrentOAnQuanSnapshot(socket, roomId, user.userId);
    }
  });

  socket.on("room:select_game", async ({ roomId, gameKey }: { roomId?: string; gameKey?: string }) => {
    if (!roomId) return roomError(socket, "Room id is required.");
    if (!GAME_CATALOG.some((game) => game.id === gameKey)) return roomError(socket, "Unknown game.");
    const supabase = serviceClient();
    const game = getGameConfig(gameKey);
    if (!game) return roomError(socket, "Unknown game.");
    const { data: room, error: readError } = await supabase.from("rooms").select("host_user_id, status").eq("id", roomId).single();
    if (readError) return roomError(socket, `Could not load room: ${readError.message}`);
    if (!room || room.host_user_id !== user.userId) return roomError(socket, "Only the host can choose game.");
    if (room.status !== "waiting") return roomError(socket, "Game can only be changed while waiting.");
    const { count } = await supabase
      .from("room_members")
      .select("user_id", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("participation_status", "lobby");
    if ((count || 0) > game.maxPlayers) return roomError(socket, `${game.name} supports up to ${game.maxPlayers} players.`);
    const { error } = await supabase.from("rooms").update({ game_key: gameKey, min_players: game.minPlayers, max_players: game.maxPlayers }).eq("id", roomId);
    if (error) return roomError(socket, `Could not choose game: ${error.message}`);
    await emitRoom(io, roomId);
  });

  socket.on("room:toggle_ready", async ({ roomId }: { roomId?: string }) => {
    if (!roomId) return roomError(socket, "Room id is required.");
    const supabase = serviceClient();
    const { data: room } = await supabase.from("rooms").select("status").eq("id", roomId).single();
    const member = await ensureMember(roomId, user.userId);

    if (!room || !member || room.status !== "waiting" || member.role === "host" || member.participation_status !== "lobby") {
      return roomError(socket, "You cannot change ready status right now.");
    }

    await supabase.from("room_members").update({ ready: !member.ready }).match({ room_id: roomId, user_id: user.userId });
    await emitRoom(io, roomId);
    console.log("[room:toggle_ready]", { roomId, userId: user.userId, ready: !member.ready });
  });

  socket.on("room:start_game", async ({ roomId }: { roomId?: string }) => {
    if (!roomId) return roomError(socket, "Room id is required.");
    if (startLocks.has(roomId)) return roomError(socket, "Game is already starting.");
    startLocks.add(roomId);
    const supabase = serviceClient();
    try {
      const { data: room } = await supabase.from("rooms").select("host_user_id, status, game_key, min_players, max_players").eq("id", roomId).single();
      const member = await ensureMember(roomId, user.userId);
      if (!room || !member || room.host_user_id !== user.userId || member.role !== "host") return roomError(socket, "Only the host can start.");
      if (room.status !== "waiting") return roomError(socket, "Room is not waiting.");
      if (!room.game_key) return roomError(socket, "Choose a game before starting.");
      const game = getGameConfig(room.game_key);
      if (!game) return roomError(socket, "Unknown game.");
      if (room.game_key === "flappy-rush" && hasFlappyRushRuntime(roomId)) return roomError(socket, "A game is already running for this room.");
      if (room.game_key === "fleet-duel" && hasFleetDuelRuntime(roomId)) return roomError(socket, "A game is already running for this room.");
      if (room.game_key === "o-an-quan" && hasOAnQuanRuntime(roomId)) return roomError(socket, "A game is already running for this room.");

      const { data: members } = await supabase.from("room_members").select("role, ready, participation_status").eq("room_id", roomId);
      const lobbyMembers = (members || []).filter((member) => member.participation_status === "lobby");
      if (lobbyMembers.length < game.minPlayers) return roomError(socket, `Need ${game.minPlayers} players to start.`);
      if (lobbyMembers.length > game.maxPlayers) return roomError(socket, "Room has too many active players.");
      const unready = (members || []).filter((member) => member.role === "player" && member.participation_status === "lobby" && !member.ready);
      if (unready.length > 0) return roomError(socket, "Waiting for all players to be ready.");

      const { data: activePlayers, error: activePlayersError } = await supabase
        .from("room_members")
        .select("user_id, app_users(username, display_name)")
        .eq("room_id", roomId)
        .eq("participation_status", "lobby");

      if (activePlayersError) return roomError(socket, `Could not load active players: ${activePlayersError.message}`);
      if (!activePlayers?.length) return roomError(socket, "Cannot start without active players.");

      const { data: session, error: sessionError } = await supabase
        .from("game_sessions")
        .insert({ room_id: roomId, game_key: room.game_key, status: "playing", started_at: new Date().toISOString() })
        .select("id")
        .single();

      if (sessionError || !session) return roomError(socket, sessionError?.message || "Could not create game session.");

      try {
        if (room.game_key === "flappy-rush") {
          await startFlappyRush(io, roomId, session.id, activePlayers);
        } else if (room.game_key === "fleet-duel") {
          await startFleetDuel(io, roomId, session.id, activePlayers);
        } else if (room.game_key === "o-an-quan") {
          await startOAnQuan(io, roomId, session.id, activePlayers);
        }
      } catch (error) {
        console.error("[room:start_game] Could not start game runtime", { error, roomId, gameKey: room.game_key });
        await supabase.from("game_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", session.id);
        return roomError(socket, error instanceof Error ? `Could not start game runtime: ${error.message}` : "Could not start game runtime.");
      }

      const { error: roomUpdateError } = await supabase.from("rooms").update({ status: "playing" }).eq("id", roomId);
      if (roomUpdateError) {
        await stopFlappyRush(roomId);
        await stopFleetDuel(roomId);
        await stopOAnQuan(roomId);
        await supabase.from("game_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", session.id);
        return roomError(socket, `Could not update room status: ${roomUpdateError.message}`);
      }
      await supabase.from("room_members").update({ participation_status: "active_game" }).eq("room_id", roomId).eq("participation_status", "lobby");
      await supabase.from("room_members").update({ ready: true }).eq("room_id", roomId).eq("role", "host");

      const snapshot = await roomSnapshot(roomId);
      await emitRoom(io, roomId);
      console.log("[room:start_game]", { roomId, sessionId: session.id, gameKey: room.game_key, activePlayers: activePlayers.length });

      if (room.game_key !== "flappy-rush" && room.game_key !== "fleet-duel" && room.game_key !== "o-an-quan") {
        io.to(`room:${roomId}`).emit("game:start", snapshot);
      }
    } finally {
      startLocks.delete(roomId);
    }
  });

  socket.on("room:back_to_lobby", async ({ roomId }: { roomId?: string }) => {
    if (!roomId) return roomError(socket, "Room id is required.");
    if (backToLobbyLocks.has(roomId)) return roomError(socket, "Room is already returning to lobby.");
    backToLobbyLocks.add(roomId);
    const supabase = serviceClient();
    try {
      const { data: room } = await supabase.from("rooms").select("host_user_id, max_players").eq("id", roomId).single();
      const member = await ensureMember(roomId, user.userId);
      if (!room || !member || room.host_user_id !== user.userId || member.role !== "host") return roomError(socket, "Only the host can go back to lobby.");

      await stopFlappyRush(roomId);
      await stopFleetDuel(roomId);
      await stopOAnQuan(roomId);
      await supabase.from("rooms").update({ status: "waiting" }).eq("id", roomId);
      const { data: orderedMembers } = await supabase.from("room_members").select("user_id").eq("room_id", roomId).order("joined_at", { ascending: true });
      const lobbyIds = (orderedMembers || []).slice(0, room.max_players).map((row) => row.user_id);
      await supabase.from("room_members").update({ participation_status: "waiting_next_round", ready: false }).eq("room_id", roomId);
      if (lobbyIds.length) await supabase.from("room_members").update({ participation_status: "lobby", ready: false }).eq("room_id", roomId).in("user_id", lobbyIds);
      await supabase.from("room_members").update({ ready: true, participation_status: "lobby" }).match({ room_id: roomId, user_id: room.host_user_id });
      await supabase.from("game_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("room_id", roomId).eq("status", "playing");
      await emitRoom(io, roomId);
      console.log("[room:back_to_lobby]", { roomId, userId: user.userId });
    } finally {
      backToLobbyLocks.delete(roomId);
    }
  });

  socket.on("room:leave", async ({ roomId }: { roomId?: string }) => {
    if (!roomId) return roomError(socket, "Room id is required.");
    const supabase = serviceClient();
    const { data: room } = await supabase.from("rooms").select("host_user_id, status, game_key, min_players, max_players").eq("id", roomId).single();
    const channel = `room:${roomId}`;
    if (!room) return roomError(socket, "Room not found.");
    const game = getGameConfig(room?.game_key);
    const isTwoPlayerGame = game?.maxPlayers === 2 || room?.max_players === 2;
    const shouldShowOpponentLeft = isTwoPlayerGame && (room?.status === "playing" || room?.status === "ended");

    if (room?.host_user_id === user.userId) {
      await stopGameRuntime(roomId, room.game_key);
      const { error } = await supabase.from("rooms").delete().eq("id", roomId);
      if (error) return roomError(socket, `Could not close room: ${error.message}`);
      if (shouldShowOpponentLeft) {
        io.to(channel).emit("room:opponent_left", {
          roomId,
          action: "redirect_dashboard",
          message: "Đối thủ đã rời phòng. Nhấn OK để kết thúc game và quay về dashboard."
        });
      } else {
        io.to(channel).emit("room:closed", { roomId, message: "Host left. Room closed." });
      }
      await broadcastOpenRooms(io);
      console.log("[room:leave] Host closed room", { roomId, userId: user.userId });
    } else {
      if (shouldShowOpponentLeft) {
        await stopGameRuntime(roomId, room.game_key);
        await supabase.from("game_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("room_id", roomId).eq("status", "playing");
        await supabase.from("rooms").update({ status: "waiting" }).eq("id", roomId);
      }
      const { error } = await supabase.from("room_members").delete().match({ room_id: roomId, user_id: user.userId });
      if (error) return roomError(socket, `Could not leave room: ${error.message}`);
      if (shouldShowOpponentLeft) {
        await supabase.from("room_members").update({ participation_status: "lobby", ready: false }).eq("room_id", roomId);
        await supabase.from("room_members").update({ ready: true, participation_status: "lobby" }).match({ room_id: roomId, user_id: room.host_user_id });
        io.to(channel).emit("room:opponent_left", {
          roomId,
          action: "return_to_lobby",
          message: "Đối thủ đã rời phòng. Nhấn OK để kết thúc game và quay lại lobby."
        });
      }
      await emitRoom(io, roomId);
      console.log("[room:leave] Player left room", { roomId, userId: user.userId });
    }

    socket.leave(channel);
  });

  socket.on("disconnect", () => {
    const roomIds = [...(authedSocket.data.rooms || [])];
    console.log("[socket:disconnect]", { userId: user.userId, rooms: roomIds });
    for (const roomId of roomIds) {
      scheduleLobbyDisconnect(roomId);
    }
  });
}
