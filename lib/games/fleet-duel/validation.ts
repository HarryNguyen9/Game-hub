import { FLEET_CONFIG } from "./config";
import type { FleetCell, FleetShip } from "./types";

function key(cell: FleetCell) {
  return `${cell.x}:${cell.y}`;
}

function sameCell(a: FleetCell, b: FleetCell) {
  return a.x === b.x && a.y === b.y;
}

export function normalizeShips(input: Array<{ id?: string; size?: number; cells?: FleetCell[] }>) {
  return input.map((ship) => ({
    id: String(ship.id || ""),
    size: Number(ship.size || 0),
    cells: (ship.cells || []).map((cell) => ({ x: Number(cell.x), y: Number(cell.y) })),
    hits: [],
    sunk: false
  }));
}

export function validateFleetPlacement(ships: FleetShip[]) {
  if (ships.length !== FLEET_CONFIG.ships.length) return "Place every ship in your fleet.";

  const seenCells = new Set<string>();
  const expected = new Map<string, number>(FLEET_CONFIG.ships.map((ship) => [ship.id, ship.size]));

  for (const ship of ships) {
    const expectedSize = expected.get(ship.id);
    if (!expectedSize || ship.size !== expectedSize || ship.cells.length !== expectedSize) return "Fleet has invalid ship sizes.";
    if (ship.cells.some((cell) => !Number.isInteger(cell.x) || !Number.isInteger(cell.y) || cell.x < 0 || cell.y < 0 || cell.x >= FLEET_CONFIG.boardSize || cell.y >= FLEET_CONFIG.boardSize)) {
      return "Ships must stay inside the board.";
    }

    const xs = new Set(ship.cells.map((cell) => cell.x));
    const ys = new Set(ship.cells.map((cell) => cell.y));
    if (xs.size !== 1 && ys.size !== 1) return "Ships must be in a straight line.";

    const sorted = [...ship.cells].sort((a, b) => (xs.size === 1 ? a.y - b.y : a.x - b.x));
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (xs.size === 1 && current.y !== previous.y + 1) return "Ship cells must be continuous.";
      if (ys.size === 1 && current.x !== previous.x + 1) return "Ship cells must be continuous.";
    }

    for (const cell of ship.cells) {
      const cellKey = key(cell);
      if (seenCells.has(cellKey)) return "Ships cannot overlap.";
      seenCells.add(cellKey);
    }
  }

  return null;
}

export function cellInShip(ship: FleetShip, cell: FleetCell) {
  return ship.cells.some((candidate) => sameCell(candidate, cell));
}

export function cellWasHit(ship: FleetShip, cell: FleetCell) {
  return ship.hits.some((candidate) => sameCell(candidate, cell));
}

export function cellWasShot(shots: FleetCell[], cell: FleetCell) {
  return shots.some((shot) => sameCell(shot, cell));
}
