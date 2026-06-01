"use client";

import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ElementalSnapshot, Point } from "@/lib/games/elemental-duels/types";

export function ElementalBuildPanel({
  snapshot,
  currentUserId,
  selectedTile,
  onBuild,
  onUpgrade,
  onSell
}: {
  snapshot: ElementalSnapshot;
  currentUserId: string;
  selectedTile: Point | null;
  onBuild: (towerType: string, x: number, y: number) => void;
  onUpgrade: (towerId: string) => void;
  onSell: (towerId: string) => void;
}) {
  const you = snapshot.players[currentUserId];
  const selectedTower = selectedTile
    ? you?.towers.find((tower) => Math.hypot(tower.x - selectedTile.x, tower.y - selectedTile.y) < 24)
    : null;

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-orange-500" />
          <p className="font-black">Build</p>
        </div>
        {selectedTile && <span className="rounded-full bg-orange-50 px-2 py-1 text-[11px] font-black text-orange-700">Tile {Math.round(selectedTile.x)}, {Math.round(selectedTile.y)}</span>}
      </div>
      {selectedTower ? (
        <div className="grid gap-2">
          <p className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-500">Selected tower level {selectedTower.level}</p>
          <Button type="button" disabled={selectedTower.level >= 3} onClick={() => onUpgrade(selectedTower.id)}>
            Upgrade
          </Button>
          <Button type="button" variant="secondary" onClick={() => onSell(selectedTower.id)}>
            Sell
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          {!selectedTile && <p className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-500">Tap a glowing build tile on your field.</p>}
          {snapshot.catalog.towers.map((tower) => (
            <Button
              key={tower.id}
              type="button"
              disabled={!selectedTile || !you || you.gold < tower.cost || snapshot.status !== "playing"}
              variant="secondary"
              onClick={() => selectedTile && onBuild(tower.id, selectedTile.x, selectedTile.y)}
              className={`min-h-12 justify-between border-2 ${you && you.gold >= tower.cost ? "border-transparent" : "border-slate-100 opacity-60"}`}
            >
              <span className="text-left">
                <span className="block">{tower.label}</span>
                <span className="block text-xs text-slate-400">{tower.element} - {tower.range} range</span>
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">{tower.cost}g</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
