import { FLEET_CONFIG } from "./config";
import type { FleetCell, FleetShip, FleetShipDefinition } from "./types";

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

function normalizeShape(cells: FleetCell[]) {
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  return cells
    .map((cell) => ({ x: cell.x - minX, y: cell.y - minY }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map(key)
    .join("|");
}

function rotateShape(cells: FleetCell[], turns: number) {
  let rotated = cells.map((cell) => ({ ...cell }));
  for (let turn = 0; turn < turns; turn += 1) {
    rotated = rotated.map((cell) => ({ x: cell.y, y: -cell.x }));
  }
  return rotated;
}

function matchesDefinition(ship: FleetShip, definition: FleetShipDefinition) {
  const submitted = normalizeShape(ship.cells);
  return [0, 1, 2, 3].some((turns) => normalizeShape(rotateShape(definition.shape, turns)) === submitted);
}

function defaultDefinitions(): FleetShipDefinition[] {
  return FLEET_CONFIG.shipCatalog.slice(0, FLEET_CONFIG.fleetSize).map((ship) => ({
    ...ship,
    shape: ship.shape.map((cell) => ({ ...cell }))
  }));
}

export function validateFleetPlacement(ships: FleetShip[], blockedCells: FleetCell[] = [], definitions: FleetShipDefinition[] = defaultDefinitions()) {
  if (ships.length !== definitions.length) return "Place every ship in your fleet.";

  const seenCells = new Set<string>();
  const seenShips = new Set<string>();
  const blocked = new Set(blockedCells.map(key));
  const expected = new Map<string, FleetShipDefinition>(definitions.map((ship) => [ship.id, ship]));

  for (const ship of ships) {
    if (seenShips.has(ship.id)) return "Fleet has duplicate ships.";
    seenShips.add(ship.id);
    const definition = expected.get(ship.id);
    if (!definition || ship.size !== definition.size || ship.cells.length !== definition.size) return "Fleet has invalid ship sizes.";
    if (ship.cells.some((cell) => !Number.isInteger(cell.x) || !Number.isInteger(cell.y) || cell.x < 0 || cell.y < 0 || cell.x >= FLEET_CONFIG.boardSize || cell.y >= FLEET_CONFIG.boardSize)) {
      return "Ships must stay inside the board.";
    }

    if (!matchesDefinition(ship, definition)) return "Ship shape does not match the selected fleet.";

    for (const cell of ship.cells) {
      const cellKey = key(cell);
      if (blocked.has(cellKey)) return "Ships cannot be placed on rocks.";
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
