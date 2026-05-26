import { FLAPPY_CONFIG } from "./config";
import { hitPipe, hitWorldBounds } from "./collision";
import type { FlappyPipe, FlappyPlayerState, FlappyState } from "./types";

type PlayerInput = {
  userId: string;
  username: string;
  displayName: string;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createPipe(index: number, x: number): FlappyPipe {
  const gapSize = Math.round(randomBetween(132, 178));
  const halfGap = gapSize / 2;
  const padding = 92;
  return {
    id: `pipe-${index}`,
    x,
    gapY: Math.round(randomBetween(padding + halfGap, FLAPPY_CONFIG.worldHeight - padding - halfGap)),
    gapSize,
    passedBy: []
  };
}

export function createFlappyState(sessionId: string, roomId: string, players: PlayerInput[]): FlappyState {
  const playerEntries = players.map((player, index) => [
    player.userId,
    {
      ...player,
      y: FLAPPY_CONFIG.worldHeight / 2 + (index - (players.length - 1) / 2) * 34,
      velocity: 0,
      score: 0,
      alive: true,
      ready: true,
      deathTick: null,
      lastInputId: null,
      recentInputIds: []
    } satisfies FlappyPlayerState
  ]);

  return {
    sessionId,
    roomId,
    status: "countdown",
    tick: 0,
    startedAt: Date.now(),
    players: Object.fromEntries(playerEntries),
    pipes: [createPipe(0, FLAPPY_CONFIG.pipeStartX), createPipe(1, FLAPPY_CONFIG.pipeStartX + FLAPPY_CONFIG.pipeSpawnDistance)],
    winnerUserId: null
  };
}

export function applyFlap(state: FlappyState, userId: string, inputId: string) {
  if (state.status !== "playing") return false;
  const player = state.players[userId];
  if (!player || !player.alive || player.lastInputId === inputId || player.recentInputIds.includes(inputId)) return false;
  player.velocity = FLAPPY_CONFIG.flapVelocity;
  player.lastInputId = inputId;
  player.recentInputIds = [...player.recentInputIds.slice(-20), inputId];
  return true;
}

export function stepFlappyState(state: FlappyState) {
  if (state.status !== "playing") return [];

  state.tick += 1;
  const deadPlayers: FlappyPlayerState[] = [];
  const birdX = FLAPPY_CONFIG.worldWidth * 0.25;

  for (const pipe of state.pipes) {
    pipe.x -= FLAPPY_CONFIG.pipeSpeed;
  }

  const lastPipe = state.pipes[state.pipes.length - 1];
  if (lastPipe && lastPipe.x < FLAPPY_CONFIG.worldWidth - FLAPPY_CONFIG.pipeSpawnDistance) {
    state.pipes.push(createPipe(state.tick, lastPipe.x + FLAPPY_CONFIG.pipeSpawnDistance));
  }
  state.pipes = state.pipes.filter((pipe) => pipe.x + FLAPPY_CONFIG.pipeWidth > -20);

  for (const player of Object.values(state.players)) {
    if (!player.alive) continue;

    player.velocity = Math.min(FLAPPY_CONFIG.maxFallVelocity, player.velocity + FLAPPY_CONFIG.gravity);
    player.y += player.velocity;

    for (const pipe of state.pipes) {
      if (!pipe.passedBy.includes(player.userId) && pipe.x + FLAPPY_CONFIG.pipeWidth < birdX) {
        pipe.passedBy.push(player.userId);
        player.score += 1;
      }
    }

    if (hitWorldBounds(player) || state.pipes.some((pipe) => hitPipe(player, pipe))) {
      player.alive = false;
      player.deathTick = state.tick;
      deadPlayers.push(player);
    }
  }

  const alivePlayers = Object.values(state.players).filter((player) => player.alive);
  if (alivePlayers.length === 0) {
    state.status = "ended";
    state.winnerUserId = getLeaderboard(state)[0]?.userId || null;
  }

  return deadPlayers;
}

export function getLeaderboard(state: FlappyState) {
  return Object.values(state.players)
    .map((player) => ({
      userId: player.userId,
      username: player.username,
      displayName: player.displayName,
      score: player.score,
      alive: player.alive,
      deathTick: player.deathTick
    }))
    .sort((a, b) => b.score - a.score || (b.deathTick ?? Number.MAX_SAFE_INTEGER) - (a.deathTick ?? Number.MAX_SAFE_INTEGER));
}
