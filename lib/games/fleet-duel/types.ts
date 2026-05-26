export type FleetGameStatus = "setup" | "battle" | "ended";
export type FleetShotResult = "miss" | "hit" | "sunk";

export type FleetCell = {
  x: number;
  y: number;
};

export type FleetShip = {
  id: string;
  size: number;
  cells: FleetCell[];
  hits: FleetCell[];
  sunk: boolean;
};

export type FleetShot = FleetCell & {
  result: FleetShotResult;
  targetUserId: string;
  createdAt: number;
};

export type FleetBoardTheme = "lagoon" | "river" | "harbor";

export type FleetPlayerState = {
  userId: string;
  username: string;
  displayName: string;
  readyToBattle: boolean;
  ships: FleetShip[];
  shots: FleetShot[];
};

export type FleetState = {
  sessionId: string;
  roomId: string;
  gameKey: "fleet-duel";
  status: FleetGameStatus;
  boardSize: number;
  boardTheme: FleetBoardTheme;
  blockedCells: FleetCell[];
  currentTurnUserId: string | null;
  winnerUserId: string | null;
  players: Record<string, FleetPlayerState>;
  startedAt: number;
  updatedAt: number;
};

export type FleetPublicShip = {
  id: string;
  size: number;
  cells?: FleetCell[];
  hits: FleetCell[];
  sunk: boolean;
};

export type FleetPublicPlayer = {
  userId: string;
  username: string;
  displayName: string;
  readyToBattle: boolean;
  ships: FleetPublicShip[];
  shots: FleetShot[];
};

export type FleetSnapshot = {
  sessionId: string;
  roomId: string;
  gameKey: "fleet-duel";
  status: FleetGameStatus;
  boardSize: number;
  boardTheme: FleetBoardTheme;
  blockedCells: FleetCell[];
  currentTurnUserId: string | null;
  winnerUserId: string | null;
  you: FleetPublicPlayer;
  opponent: FleetPublicPlayer | null;
  players: Array<{
    userId: string;
    username: string;
    displayName: string;
    readyToBattle: boolean;
  }>;
};
