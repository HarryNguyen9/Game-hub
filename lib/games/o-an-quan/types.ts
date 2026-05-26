export type OAnQuanDirection = "clockwise" | "counterclockwise";
export type OAnQuanSide = "top" | "bottom";
export type OAnQuanStatus = "playing" | "ended";
export type OAnQuanResult = "win" | "draw" | null;

export type OAnQuanPit = {
  index: number;
  type: "quan" | "dan";
  ownerUserId: string | null;
  smallStones: number;
  bigStones: number;
};

export type OAnQuanPlayer = {
  userId: string;
  username: string;
  displayName: string;
  score: number;
  side: OAnQuanSide;
  connected: boolean;
};

export type OAnQuanMove = {
  userId: string;
  selectedPitIndex: number | null;
  direction: OAnQuanDirection | null;
  captured: number;
  reason?: "move" | "timeout" | "no_moves";
  createdAt: number;
};

export type OAnQuanState = {
  sessionId: string;
  roomId: string;
  gameKey: "o-an-quan";
  status: OAnQuanStatus;
  board: OAnQuanPit[];
  players: Record<string, OAnQuanPlayer>;
  currentTurnUserId: string | null;
  turnStartedAt: number;
  turnEndsAt: number;
  turnDurationSeconds: number;
  lastMove: OAnQuanMove | null;
  winnerUserId: string | null;
  result: OAnQuanResult;
  startedAt: number;
  updatedAt: number;
};

export type OAnQuanSnapshot = OAnQuanState & {
  serverTime: number;
};
