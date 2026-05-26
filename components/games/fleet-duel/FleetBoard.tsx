"use client";

import type { FleetCell, FleetPublicShip, FleetShot } from "@/lib/games/fleet-duel/types";

function key(cell: FleetCell) {
  return `${cell.x}:${cell.y}`;
}

export function FleetBoard({
  boardSize,
  ships,
  shots,
  mode,
  disabled,
  onCellClick
}: {
  boardSize: number;
  ships: FleetPublicShip[];
  shots: FleetShot[];
  mode: "own" | "enemy";
  disabled?: boolean;
  onCellClick?: (cell: FleetCell) => void;
}) {
  const shipCells = new Map<string, FleetPublicShip>();
  for (const ship of ships) {
    for (const cell of ship.cells || []) shipCells.set(key(cell), ship);
  }
  const hitCells = new Set<string>();
  for (const ship of ships) {
    for (const hit of ship.hits) hitCells.add(key(hit));
  }
  const shotCells = new Map<string, FleetShot>();
  for (const shot of shots) shotCells.set(key(shot), shot);

  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}>
      {Array.from({ length: boardSize * boardSize }).map((_, index) => {
        const cell = { x: index % boardSize, y: Math.floor(index / boardSize) };
        const cellKey = key(cell);
        const ship = shipCells.get(cellKey);
        const shot = shotCells.get(cellKey);
        const hit = hitCells.has(cellKey) || shot?.result === "hit" || shot?.result === "sunk";
        const miss = shot?.result === "miss";
        return (
          <button
            key={cellKey}
            type="button"
            disabled={disabled}
            onClick={() => onCellClick?.(cell)}
            className={`aspect-square rounded-lg border text-xs font-black transition ${
              mode === "enemy" && !disabled ? "cursor-crosshair hover:scale-105 hover:bg-sky-100" : ""
            } ${ship ? "border-sky-500 bg-sky-200" : "border-white/80 bg-white/65"} ${hit ? "bg-rose-200 text-rose-700" : ""} ${miss ? "bg-slate-100 text-slate-400" : ""}`}
            aria-label={`${mode} cell ${cell.x + 1},${cell.y + 1}`}
          >
            {hit ? "×" : miss ? "•" : ship && mode === "own" ? "■" : ""}
          </button>
        );
      })}
    </div>
  );
}
