import { FLAPPY_CONFIG } from "./config";
import type { FlappyPipe, FlappyPlayerState } from "./types";

export function hitWorldBounds(player: FlappyPlayerState) {
  const half = FLAPPY_CONFIG.birdSize / 2;
  return player.y - half <= 0 || player.y + half >= FLAPPY_CONFIG.worldHeight;
}

export function hitPipe(player: FlappyPlayerState, pipe: FlappyPipe) {
  const birdX = FLAPPY_CONFIG.worldWidth * 0.25;
  const half = FLAPPY_CONFIG.birdSize / 2;
  const birdLeft = birdX - half;
  const birdRight = birdX + half;
  const pipeLeft = pipe.x;
  const pipeRight = pipe.x + FLAPPY_CONFIG.pipeWidth;

  if (birdRight < pipeLeft || birdLeft > pipeRight) return false;

  const gapTop = pipe.gapY - FLAPPY_CONFIG.pipeGap / 2;
  const gapBottom = pipe.gapY + FLAPPY_CONFIG.pipeGap / 2;
  return player.y - half < gapTop || player.y + half > gapBottom;
}
