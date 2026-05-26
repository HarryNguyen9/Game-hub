import { createClient } from "@supabase/supabase-js";
import type { Server, Socket } from "socket.io";
import { FLAPPY_CONFIG } from "../../lib/games/flappy-duel/config";
import { applyFlap, createFlappyState, stepFlappyState } from "../../lib/games/flappy-duel/engine";
import { serializeFlappyState } from "../../lib/games/flappy-duel/serializer";
import type { FlappyState } from "../../lib/games/flappy-duel/types";
import type { AuthedSocket } from "../auth";

type Runtime = {
  state: FlappyState;
  tickTimer: NodeJS.Timeout | null;
  snapshotTimer: NodeJS.Timeout | null;
  countdownTimer: NodeJS.Timeout | null;
};

type ActivePlayerRow = {
  user_id: string;
  app_users: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
};

const runtimes = new Map<string, Runtime>();
const lastInputAt = new Map<string, number>();

type SyncResponse =
  | { ok: true; snapshot: ReturnType<typeof serializeFlappyState>; countdown: number | null }
  | { ok: false; error: string };

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function roomChannel(roomId: string) {
  return `room:${roomId}`;
}

function clearRuntime(roomId: string) {
  const runtime = runtimes.get(roomId);
  if (!runtime) return;
  if (runtime.tickTimer) clearInterval(runtime.tickTimer);
  if (runtime.snapshotTimer) clearInterval(runtime.snapshotTimer);
  if (runtime.countdownTimer) clearInterval(runtime.countdownTimer);
  runtimes.delete(roomId);
  for (const key of lastInputAt.keys()) {
    if (key.startsWith(`${roomId}:`)) lastInputAt.delete(key);
  }
  console.log("[flappy-duel] Runtime cleaned up", { roomId });
}

async function finishGame(io: Server, runtime: Runtime) {
  const { state } = runtime;
  clearRuntime(state.roomId);

  const snapshot = serializeFlappyState(state);
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

  io.to(roomChannel(state.roomId)).emit("game:end", snapshot);
  console.log("[flappy-duel] Game ended", { roomId: state.roomId, sessionId: state.sessionId });
}

function emitSnapshot(io: Server, state: FlappyState) {
  io.to(roomChannel(state.roomId)).emit("game:snapshot", serializeFlappyState(state));
}

function currentFlappyDuelSnapshot(roomId: string): SyncResponse {
  const runtime = runtimes.get(roomId);
  if (!runtime) {
    return {
      ok: false,
      error: "Flappy Duel runtime is not running on this socket server. Stop every old socket process, start npm run socket:dev again, then create/start a fresh room."
    };
  }

  const snapshot = serializeFlappyState(runtime.state);
  let countdown: number | null = null;
  if (runtime.state.status === "countdown") {
    const elapsedSeconds = Math.floor((Date.now() - runtime.state.startedAt) / 1000);
    countdown = Math.max(1, FLAPPY_CONFIG.countdownSeconds - elapsedSeconds);
  }
  return { ok: true, snapshot, countdown };
}

export function emitCurrentFlappyDuelSnapshot(socket: Socket, roomId: string) {
  const response = currentFlappyDuelSnapshot(roomId);
  if (!response.ok) {
    socket.emit("game:error", { message: response.error });
    return false;
  }

  if (response.countdown) {
    socket.emit("game:countdown", { roomId, sessionId: response.snapshot.sessionId, remaining: response.countdown });
  }
  socket.emit(response.snapshot.status === "ended" ? "game:end" : "game:snapshot", response.snapshot);
  return true;
}

export function hasFlappyDuelRuntime(roomId: string) {
  return runtimes.has(roomId);
}

function startLoop(io: Server, runtime: Runtime) {
  runtime.state.status = "playing";
  io.to(roomChannel(runtime.state.roomId)).emit("game:start", serializeFlappyState(runtime.state));

  runtime.tickTimer = setInterval(() => {
    const deadPlayers = stepFlappyState(runtime.state);
    for (const player of deadPlayers) {
      io.to(roomChannel(runtime.state.roomId)).emit("game:player_dead", {
        roomId: runtime.state.roomId,
        sessionId: runtime.state.sessionId,
        userId: player.userId,
        score: player.score
      });
    }

    if (runtime.state.status === "ended") {
      void finishGame(io, runtime);
    }
  }, 1000 / FLAPPY_CONFIG.simulationTickRate);

  runtime.snapshotTimer = setInterval(() => emitSnapshot(io, runtime.state), 1000 / FLAPPY_CONFIG.snapshotRate);
}

export async function startFlappyDuel(io: Server, roomId: string, sessionId: string, activePlayers: ActivePlayerRow[]) {
  if (runtimes.has(roomId)) {
    throw new Error("Flappy Duel runtime is already running for this room.");
  }

  const players = activePlayers.map((member) => {
    const appUser = Array.isArray(member.app_users) ? member.app_users[0] : member.app_users;
    return {
      userId: member.user_id,
      username: appUser?.username || "player",
      displayName: appUser?.display_name || appUser?.username || "Player"
    };
  });

  if (players.length === 0) {
    throw new Error("Cannot start Flappy Duel without active lobby players.");
  }

  const runtime: Runtime = {
    state: createFlappyState(sessionId, roomId, players),
    tickTimer: null,
    snapshotTimer: null,
    countdownTimer: null
  };
  runtimes.set(roomId, runtime);
  console.log("[flappy-duel] Runtime started", { roomId, sessionId, players: players.length });

  let remaining = FLAPPY_CONFIG.countdownSeconds;
  emitSnapshot(io, runtime.state);
  io.to(roomChannel(roomId)).emit("game:countdown", { roomId, sessionId, remaining });
  runtime.countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      io.to(roomChannel(roomId)).emit("game:countdown", { roomId, sessionId, remaining });
      return;
    }

    if (runtime.countdownTimer) clearInterval(runtime.countdownTimer);
    runtime.countdownTimer = null;
    startLoop(io, runtime);
  }, 1000);
}

export async function stopFlappyDuel(roomId: string) {
  clearRuntime(roomId);
}

function gameError(socket: Socket, message: string) {
  socket.emit("game:error", { message });
}

export function registerFlappyDuelHandlers(_io: Server, socket: Socket) {
  const authedSocket = socket as AuthedSocket;
  const user = authedSocket.data.user;

  socket.on(
    "game:sync",
    async ({ roomId }: { roomId?: string }, reply?: (response: SyncResponse) => void) => {
      if (!roomId) {
        const response = { ok: false, error: "Room id is required." } as const;
        reply?.(response);
        return gameError(socket, response.error);
      }

      const supabase = serviceClient();
      const { data: member } = await supabase
        .from("room_members")
        .select("participation_status")
        .match({ room_id: roomId, user_id: user.userId })
        .maybeSingle();

      if (!member) {
        const response = { ok: false, error: "Join this room before syncing the game." } as const;
        reply?.(response);
        return gameError(socket, response.error);
      }

      if (member.participation_status !== "active_game") {
        const response = { ok: false, error: "You are waiting for the next round." } as const;
        reply?.(response);
        return;
      }

      const response = currentFlappyDuelSnapshot(roomId);
      reply?.(response);
      if (response.ok) {
        if (response.countdown) socket.emit("game:countdown", { roomId, sessionId: response.snapshot.sessionId, remaining: response.countdown });
        socket.emit(response.snapshot.status === "ended" ? "game:end" : "game:snapshot", response.snapshot);
      } else {
        gameError(socket, response.error);
      }
    }
  );

  socket.on(
    "game:input",
    async ({
      roomId,
      sessionId,
      input,
      inputId,
      ...extra
    }: {
      roomId?: string;
      sessionId?: string;
      input?: "flap";
      inputId?: string;
      clientTime?: number;
      y?: unknown;
      velocity?: unknown;
      score?: unknown;
    }) => {
      if (!roomId || !sessionId || input !== "flap" || !inputId) return gameError(socket, "Invalid game input.");
      if ("y" in extra || "velocity" in extra || "score" in extra) return gameError(socket, "Invalid game input payload.");

      const runtime = runtimes.get(roomId);
      if (!runtime || runtime.state.sessionId !== sessionId) return gameError(socket, "Game session is not active.");
      if (runtime.state.status !== "playing") return gameError(socket, "Game is not accepting input right now.");

      const supabase = serviceClient();
      const { data: member } = await supabase
        .from("room_members")
        .select("participation_status")
        .match({ room_id: roomId, user_id: user.userId })
        .maybeSingle();

      if (member?.participation_status !== "active_game") return gameError(socket, "You are waiting for the next round.");
      const rateKey = `${roomId}:${user.userId}`;
      const now = Date.now();
      const last = lastInputAt.get(rateKey) || 0;
      if (now - last < 40) return;
      lastInputAt.set(rateKey, now);
      applyFlap(runtime.state, user.userId, inputId);
    }
  );
}
