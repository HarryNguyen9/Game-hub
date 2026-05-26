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
    <div
      className="grid gap-1.5 rounded-[1.35rem] border border-cyan-100/80 bg-cyan-100/80 p-2 shadow-inner"
      style={{
        gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
        backgroundImage:
          "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.7) 0 8%, transparent 9%), radial-gradient(circle at 78% 34%, rgba(255,255,255,0.5) 0 7%, transparent 8%), linear-gradient(135deg, rgba(186,230,253,0.95), rgba(207,250,254,0.88) 48%, rgba(224,242,254,0.95))"
      }}
    >
      {Array.from({ length: boardSize * boardSize }).map((_, index) => {
        const cell = { x: index % boardSize, y: Math.floor(index / boardSize) };
        const cellKey = key(cell);
        const ship = shipCells.get(cellKey);
        const shot = shotCells.get(cellKey);
        const hit = hitCells.has(cellKey) || shot?.result === "hit" || shot?.result === "sunk";
        const miss = shot?.result === "miss";
        const cellState = hit ? "hit" : miss ? "miss" : ship ? "ship" : "water";

        return (
          <button
            key={cellKey}
            type="button"
            disabled={disabled}
            onClick={() => onCellClick?.(cell)}
            className={`group relative grid aspect-square place-items-center overflow-hidden rounded-xl border text-xs font-black shadow-sm transition ${
              mode === "enemy" && !disabled ? "cursor-crosshair hover:-translate-y-0.5 hover:scale-[1.03] hover:border-cyan-400 hover:bg-cyan-100" : ""
            } ${
              cellState === "water"
                ? "border-sky-200/75 bg-sky-50/70 text-cyan-700"
                : cellState === "ship"
                  ? "border-cyan-500 bg-cyan-300 text-cyan-950"
                  : cellState === "hit"
                    ? "border-rose-300 bg-rose-100 text-rose-600"
                    : "border-blue-100 bg-white/85 text-sky-400"
            } ${disabled ? "cursor-default" : ""}`}
            aria-label={`${mode} cell ${cell.x + 1},${cell.y + 1}`}
          >
            <span className="absolute inset-x-1 top-1 h-1 rounded-full bg-white/35" />
            {hit ? (
              <span className="relative text-base leading-none">x</span>
            ) : miss ? (
              <span className="relative size-2 rounded-full bg-sky-400/75" />
            ) : ship && mode === "own" ? (
              <span className="relative h-2.5 w-3/5 rounded-full bg-slate-700 shadow-[inset_0_-2px_0_rgba(255,255,255,0.22)]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
