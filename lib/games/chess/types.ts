export type ChessColor = "white" | "black";
export type ChessStatus = "playing" | "ended";
export type ChessEndReason = "checkmate" | "timeout" | "draw" | "resign" | null;

export type ChessPlayer = {
  userId: string;
  username: string;
  displayName: string;
  color: ChessColor;
  connected: boolean;
};

export type ChessMoveRecord = {
  from: string;
  to: string;
  san: string;
  color: "w" | "b";
  userId: string;
  createdAt: number;
};

export type ChessState = {
  sessionId: string;
  roomId: string;
  gameKey: "chess";
  status: ChessStatus;
  fen: string;
  pgn: string;
  turn: "w" | "b";
  currentTurnUserId: string | null;
  turnStartedAt: number;
  turnEndsAt: number;
  turnDurationSeconds: number;
  players: Record<string, ChessPlayer>;
  moveHistory: ChessMoveRecord[];
  check: boolean;
  checkmate: boolean;
  draw: boolean;
  winnerUserId: string | null;
  endReason: ChessEndReason;
  startedAt: number;
  updatedAt: number;
};

export type ChessSnapshot = ChessState & {
  serverTime: number;
};
