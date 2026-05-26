import { FLEET_CONFIG } from "./config";
import type { FleetBoardTheme, FleetCell, FleetPlayerState, FleetShip, FleetState } from "./types";
import { cellInShip, cellWasHit, cellWasShot, validateFleetPlacement } from "./validation";

type PlayerInput = {
  userId: string;
  username: string;
  displayName: string;
};

const themes: FleetBoardTheme[] = ["lagoon", "river", "harbor"];

function key(cell: FleetCell) {
  return `${cell.x}:${cell.y}`;
}

function sameCell(a: FleetCell, b: FleetCell) {
  return a.x === b.x && a.y === b.y;
}

function createBlockedCells(boardSize: number) {
  const blocked = new Set<string>();
  const target = 5 + Math.floor(Math.random() * 4);
  const safeCells = new Set(["0:0", "0:1", "1:0", `${boardSize - 1}:${boardSize - 1}`, `${boardSize - 1}:${boardSize - 2}`, `${boardSize - 2}:${boardSize - 1}`]);

  while (blocked.size < target) {
    const cell = {
      x: Math.floor(Math.random() * boardSize),
      y: Math.floor(Math.random() * boardSize)
    };
    const cellKey = key(cell);
    if (!safeCells.has(cellKey)) blocked.add(cellKey);
  }

  return [...blocked].map((cellKey) => {
    const [x, y] = cellKey.split(":").map(Number);
    return { x, y };
  });
}

export function createFleetState(sessionId: string, roomId: string, players: PlayerInput[]): FleetState {
  return {
    sessionId,
    roomId,
    gameKey: "fleet-duel",
    status: "setup",
    boardSize: FLEET_CONFIG.boardSize,
    boardTheme: themes[Math.floor(Math.random() * themes.length)],
    blockedCells: createBlockedCells(FLEET_CONFIG.boardSize),
    currentTurnUserId: null,
    winnerUserId: null,
    players: Object.fromEntries(
      players.slice(0, 2).map((player) => [
        player.userId,
        {
          ...player,
          readyToBattle: false,
          ships: [],
          shots: []
        } satisfies FleetPlayerState
      ])
    ),
    startedAt: Date.now(),
    updatedAt: Date.now()
  };
}

export function placeFleet(state: FleetState, userId: string, ships: FleetShip[]) {
  if (state.status !== "setup") return "Fleet can only be placed during setup.";
  const player = state.players[userId];
  if (!player) return "You are not an active Fleet Duel player.";
  const error = validateFleetPlacement(ships, state.blockedCells);
  if (error) return error;
  player.ships = ships.map((ship) => ({ ...ship, cells: ship.cells.map((cell) => ({ ...cell })), hits: [], sunk: false }));
  player.readyToBattle = false;
  state.updatedAt = Date.now();
  return null;
}

export function confirmFleet(state: FleetState, userId: string) {
  if (state.status !== "setup") return "Fleet can only be confirmed during setup.";
  const player = state.players[userId];
  if (!player) return "You are not an active Fleet Duel player.";
  const error = validateFleetPlacement(player.ships, state.blockedCells);
  if (error) return error;
  player.readyToBattle = true;
  const activePlayers = Object.values(state.players);
  if (activePlayers.length === 2 && activePlayers.every((candidate) => candidate.readyToBattle)) {
    state.status = "battle";
    state.currentTurnUserId = activePlayers[Math.floor(Math.random() * activePlayers.length)].userId;
  }
  state.updatedAt = Date.now();
  return null;
}

export function fireAt(
  state: FleetState,
  shooterUserId: string,
  cell: FleetCell
): { error: string } | { result: "miss" | "hit" | "sunk"; targetUserId: string; sunkShipId: string | null } {
  if (state.status !== "battle") return { error: "Battle has not started." };
  if (state.currentTurnUserId !== shooterUserId) return { error: "It is not your turn." };
  if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y) || cell.x < 0 || cell.y < 0 || cell.x >= state.boardSize || cell.y >= state.boardSize) {
    return { error: "Shot is outside the board." };
  }
  if (state.blockedCells.some((blocked) => sameCell(blocked, cell))) return { error: "Rocks block that cell." };

  const shooter = state.players[shooterUserId];
  const target = Object.values(state.players).find((player) => player.userId !== shooterUserId);
  if (!shooter || !target) return { error: "Opponent is not available." };
  if (cellWasShot(shooter.shots, cell)) return { error: "You already fired at that cell." };

  const hitShip = target.ships.find((ship) => cellInShip(ship, cell));
  let result: "miss" | "hit" | "sunk" = "miss";
  if (hitShip) {
    if (!cellWasHit(hitShip, cell)) hitShip.hits.push({ ...cell });
    hitShip.sunk = hitShip.cells.every((shipCell) => cellWasHit(hitShip, shipCell));
    result = hitShip.sunk ? "sunk" : "hit";
  }

  shooter.shots.push({ ...cell, result, targetUserId: target.userId, createdAt: Date.now() });

  if (target.ships.length > 0 && target.ships.every((ship) => ship.sunk)) {
    state.status = "ended";
    state.currentTurnUserId = null;
    state.winnerUserId = shooterUserId;
  } else {
    state.currentTurnUserId = target.userId;
  }
  state.updatedAt = Date.now();
  return { result, targetUserId: target.userId, sunkShipId: hitShip?.sunk ? hitShip.id : null };
}
