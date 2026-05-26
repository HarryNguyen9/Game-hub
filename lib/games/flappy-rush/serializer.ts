import { FLAPPY_CONFIG } from "./config";
import { getLeaderboard } from "./engine";
import type { FlappySnapshot, FlappyState } from "./types";

export function serializeFlappyState(state: FlappyState): FlappySnapshot {
  return {
    ...state,
    players: Object.fromEntries(Object.entries(state.players).map(([userId, player]) => [userId, { ...player }])),
    pipes: state.pipes.map((pipe) => ({ ...pipe, gapSize: pipe.gapSize || FLAPPY_CONFIG.pipeGap, passedBy: [...pipe.passedBy] })),
    serverTime: Date.now(),
    config: {
      worldWidth: FLAPPY_CONFIG.worldWidth,
      worldHeight: FLAPPY_CONFIG.worldHeight,
      birdSize: FLAPPY_CONFIG.birdSize,
      pipeWidth: FLAPPY_CONFIG.pipeWidth,
      pipeGap: FLAPPY_CONFIG.pipeGap
    },
    leaderboard: getLeaderboard(state)
  };
}
