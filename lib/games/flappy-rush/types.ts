export type FlappyGameStatus = "countdown" | "playing" | "ended";

export type FlappyPlayerState = {
  userId: string;
  username: string;
  displayName: string;
  y: number;
  velocity: number;
  score: number;
  alive: boolean;
  ready: boolean;
  deathTick: number | null;
  lastInputId: string | null;
  recentInputIds: string[];
};

export type FlappyPipe = {
  id: string;
  x: number;
  gapY: number;
  gapSize: number;
  passedBy: string[];
};

export type FlappyState = {
  sessionId: string;
  roomId: string;
  status: FlappyGameStatus;
  tick: number;
  startedAt: number;
  players: Record<string, FlappyPlayerState>;
  pipes: FlappyPipe[];
  winnerUserId: string | null;
};

export type FlappySnapshot = FlappyState & {
  serverTime: number;
  config: {
    worldWidth: number;
    worldHeight: number;
    birdSize: number;
    pipeWidth: number;
    pipeGap: number;
  };
  leaderboard: Array<{
    userId: string;
    username: string;
    displayName: string;
    score: number;
    alive: boolean;
    deathTick: number | null;
  }>;
};
