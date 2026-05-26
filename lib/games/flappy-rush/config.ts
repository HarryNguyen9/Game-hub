export const FLAPPY_CONFIG = {
  worldWidth: 900,
  worldHeight: 520,
  birdSize: 28,
  gravity: 0.42,
  flapVelocity: -7.8,
  maxFallVelocity: 9,
  pipeWidth: 72,
  pipeGap: 150,
  pipeSpeed: 3,
  pipeSpawnDistance: 280,
  pipeStartX: 760,
  simulationTickRate: 60,
  snapshotRate: 20,
  countdownSeconds: 3
} as const;
