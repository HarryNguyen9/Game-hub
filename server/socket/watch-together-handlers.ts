import type { Server, Socket } from "socket.io";
import { serializeWatchTogetherState } from "../../lib/games/watch-together/serializer";
import type { WatchTogetherState } from "../../lib/games/watch-together/types";
import type { AuthedSocket } from "../auth";

type ActivePlayerRow = {
  user_id: string;
  app_users: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
};

const runtimes = new Map<string, WatchTogetherState>();

function gameError(socket: Socket, message: string) {
  socket.emit("game:error", { message });
}

function emitSnapshot(io: Server, state: WatchTogetherState, event = "watch-together:snapshot") {
  io.to(`room:${state.roomId}`).emit(event, serializeWatchTogetherState(state));
}

export function hasWatchTogetherRuntime(roomId: string) {
  return runtimes.has(roomId);
}

export async function startWatchTogether(io: Server, roomId: string, sessionId: string, activePlayers: ActivePlayerRow[], hostUserId: string) {
  if (runtimes.has(roomId)) throw new Error("Watch Together runtime is already running for this room.");
  const players = Object.fromEntries(
    activePlayers.map((member) => {
      const appUser = Array.isArray(member.app_users) ? member.app_users[0] : member.app_users;
      return [
        member.user_id,
        {
          userId: member.user_id,
          username: appUser?.username || "player",
          displayName: appUser?.display_name || appUser?.username || "Player"
        }
      ];
    })
  );
  const state: WatchTogetherState = {
    sessionId,
    roomId,
    gameKey: "watch-together",
    hostUserId,
    videoId: null,
    status: "idle",
    currentTime: 0,
    lastUpdatedAt: Date.now(),
    players
  };
  runtimes.set(roomId, state);
  emitSnapshot(io, state, "game:start");
  emitSnapshot(io, state);
  console.log("[watch-together] Runtime started", { roomId, sessionId });
}

export async function stopWatchTogether(roomId: string) {
  if (runtimes.delete(roomId)) console.log("[watch-together] Runtime cleaned up", { roomId });
}

export function emitCurrentWatchTogetherSnapshot(socket: Socket, roomId: string) {
  const state = runtimes.get(roomId);
  if (!state) return false;
  socket.emit("watch-together:snapshot", serializeWatchTogetherState(state));
  return true;
}

export function registerWatchTogetherHandlers(io: Server, socket: Socket) {
  const authedSocket = socket as AuthedSocket;
  const user = authedSocket.data.user;

  socket.on("watch-together:sync", ({ roomId }: { roomId?: string }) => {
    if (!roomId) return gameError(socket, "Room id is required.");
    if (!emitCurrentWatchTogetherSnapshot(socket, roomId)) return gameError(socket, "Watch Together is not active.");
  });

  socket.on("watch-together:set_video", ({ roomId, videoId }: { roomId?: string; videoId?: string }) => {
    if (!roomId || !videoId) return gameError(socket, "Room id and video id are required.");
    const state = runtimes.get(roomId);
    if (!state) return gameError(socket, "Watch Together is not active.");
    if (state.hostUserId !== user.userId) return gameError(socket, "Only the host can set the video.");
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return gameError(socket, "Invalid video id.");
    state.videoId = videoId;
    state.status = "paused";
    state.currentTime = 0;
    state.lastUpdatedAt = Date.now();
    emitSnapshot(io, state);
  });

  socket.on("watch-together:play", ({ roomId, currentTime }: { roomId?: string; currentTime?: number }) => {
    if (!roomId) return gameError(socket, "Room id is required.");
    const state = runtimes.get(roomId);
    if (!state) return gameError(socket, "Watch Together is not active.");
    if (state.hostUserId !== user.userId) return gameError(socket, "Only the host can control playback.");
    state.status = "playing";
    if (typeof currentTime === "number") state.currentTime = currentTime;
    state.lastUpdatedAt = Date.now();
    emitSnapshot(io, state);
  });

  socket.on("watch-together:pause", ({ roomId, currentTime }: { roomId?: string; currentTime?: number }) => {
    if (!roomId) return gameError(socket, "Room id is required.");
    const state = runtimes.get(roomId);
    if (!state) return gameError(socket, "Watch Together is not active.");
    if (state.hostUserId !== user.userId) return gameError(socket, "Only the host can control playback.");
    state.status = "paused";
    if (typeof currentTime === "number") state.currentTime = currentTime;
    state.lastUpdatedAt = Date.now();
    emitSnapshot(io, state);
  });

  socket.on("watch-together:seek", ({ roomId, currentTime }: { roomId?: string; currentTime?: number }) => {
    if (!roomId || typeof currentTime !== "number") return gameError(socket, "Room id and current time are required.");
    const state = runtimes.get(roomId);
    if (!state) return gameError(socket, "Watch Together is not active.");
    if (state.hostUserId !== user.userId) return gameError(socket, "Only the host can seek.");
    state.currentTime = currentTime;
    state.lastUpdatedAt = Date.now();
    emitSnapshot(io, state);
  });

  socket.on("watch-together:heartbeat", ({ roomId, currentTime }: { roomId?: string; currentTime?: number }) => {
    if (!roomId || typeof currentTime !== "number") return;
    const state = runtimes.get(roomId);
    if (!state || state.hostUserId !== user.userId || state.status !== "playing") return;
    state.currentTime = currentTime;
    state.lastUpdatedAt = Date.now();
    emitSnapshot(io, state);
  });
}

