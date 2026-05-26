"use client";

import type { FleetBoardTheme, FleetCell, FleetPublicShip, FleetShot } from "@/lib/games/fleet-duel/types";

function key(cell: FleetCell) {
  return `${cell.x}:${cell.y}`;
}

export function FleetBoard({
  boardSize,
  ships,
  shots,
  blockedCells = [],
  theme = "lagoon",
  mode,
  disabled,
  onCellClick
}: {
  boardSize: number;
  ships: FleetPublicShip[];
  shots: FleetShot[];
  blockedCells?: FleetCell[];
  theme?: FleetBoardTheme;
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
  const blocked = new Set(blockedCells.map(key));
  const themeClass =
    theme === "river"
      ? "border-blue-200/90 bg-blue-200/80"
      : theme === "harbor"
        ? "border-teal-200/90 bg-teal-200/80"
        : "border-cyan-200/90 bg-cyan-200/80";
  const themeBackground =
    theme === "river"
      ? "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.75) 0 7%, transparent 8%), linear-gradient(135deg, rgba(125,211,252,0.98), rgba(191,219,254,0.96) 50%, rgba(186,230,253,0.98))"
      : theme === "harbor"
        ? "radial-gradient(circle at 75% 25%, rgba(255,255,255,0.68) 0 7%, transparent 8%), linear-gradient(135deg, rgba(153,246,228,0.98), rgba(165,243,252,0.94) 52%, rgba(94,234,212,0.82))"
        : "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.74) 0 8%, transparent 9%), radial-gradient(circle at 78% 34%, rgba(255,255,255,0.55) 0 7%, transparent 8%), linear-gradient(135deg, rgba(186,230,253,0.98), rgba(207,250,254,0.95) 48%, rgba(224,242,254,0.98))";

  return (
    <div
      className={`grid gap-1.5 rounded-[1.35rem] border p-2 shadow-inner ${themeClass}`}
      style={{
        gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
        backgroundImage: themeBackground
      }}
    >
      {Array.from({ length: boardSize * boardSize }).map((_, index) => {
        const cell = { x: index % boardSize, y: Math.floor(index / boardSize) };
        const cellKey = key(cell);
        const ship = shipCells.get(cellKey);
        const shot = shotCells.get(cellKey);
        const rock = blocked.has(cellKey);
        const hit = hitCells.has(cellKey) || shot?.result === "hit" || shot?.result === "sunk";
        const miss = shot?.result === "miss";
        const cellState = rock ? "rock" : hit ? "hit" : miss ? "miss" : ship ? "ship" : "water";

        return (
          <button
            key={cellKey}
            type="button"
            disabled={disabled}
            onClick={() => onCellClick?.(cell)}
            className={`group relative grid aspect-square place-items-center overflow-hidden rounded-xl border text-xs font-black shadow-sm transition ${
              mode === "enemy" && !disabled && !rock ? "cursor-crosshair hover:-translate-y-0.5 hover:scale-[1.03] hover:border-cyan-500 hover:bg-cyan-100" : ""
            } ${
              cellState === "water"
                ? "border-cyan-300/90 bg-cyan-50/90 text-cyan-700"
                : cellState === "ship"
                  ? "border-slate-500 bg-slate-700 text-white"
                  : cellState === "hit"
                    ? "border-rose-300 bg-rose-100 text-rose-600"
                    : cellState === "rock"
                      ? "border-stone-400 bg-gradient-to-br from-stone-300 to-stone-500 text-stone-800"
                      : "border-blue-100 bg-white/90 text-sky-500"
            } ${disabled ? "cursor-default" : ""}`}
            aria-label={`${mode} cell ${cell.x + 1},${cell.y + 1}`}
          >
            <span className="absolute inset-x-1 top-1 h-1 rounded-full bg-white/35" />
            {rock ? (
              <span className="relative size-3 rounded-full bg-stone-700 shadow-[0_2px_0_rgba(255,255,255,0.35)]" />
            ) : hit ? (
              <span className="relative text-base leading-none">x</span>
            ) : miss ? (
              <span className="relative size-2 rounded-full bg-sky-400/75" />
            ) : ship && mode === "own" ? (
              <span
                className={`relative h-2.5 w-3/5 rounded-full shadow-[inset_0_-2px_0_rgba(255,255,255,0.28)] ${
                  ship.id.includes("carrier") || ship.size >= 4 ? "bg-slate-800" : ship.size === 3 ? "bg-indigo-700" : "bg-rose-500"
                }`}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
