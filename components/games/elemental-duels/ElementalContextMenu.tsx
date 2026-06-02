"use client";

import { Crosshair, Flame, Snowflake, Sprout, Trash2, TrendingUp, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ElementKey, ElementalSnapshot, ElementalTower, Point, TowerDefinition, TowerTargetMode } from "@/lib/games/elemental-duels/types";

export type ElementalSelection =
  | {
      kind: "tile";
      point: Point;
      screen: Point;
    }
  | {
      kind: "tower";
      towerId: string;
      point: Point;
      screen: Point;
    }
  | {
      kind: "obstacle";
      obstacleId: string;
      point: Point;
      screen: Point;
    };

type Size = {
  width: number;
  height: number;
};

const menuSize = { width: 172, height: 188 };

export function clampElementalMenuPosition(point: Point, bounds: Size, size: Size = menuSize) {
  const padding = 8;
  return {
    x: Math.max(padding, Math.min(point.x, bounds.width - size.width - padding)),
    y: Math.max(padding, Math.min(point.y, bounds.height - size.height - padding))
  };
}

function elementIcon(element: ElementKey) {
  if (element === "fire") return <Flame size={15} />;
  if (element === "ice") return <Snowflake size={15} />;
  if (element === "lightning") return <Zap size={15} />;
  return <Sprout size={15} />;
}

function towerDefinition(towers: TowerDefinition[], tower: ElementalTower) {
  return towers.find((item) => item.id === tower.towerType) || null;
}

export function ElementalContextMenu({
  snapshot,
  currentUserId,
  selection,
  bounds,
  onBuild,
  onUpgrade,
  onSell,
  onTargetMode,
  onClose
}: {
  snapshot: ElementalSnapshot;
  currentUserId: string;
  selection: ElementalSelection | null;
  bounds: Size;
  onBuild: (towerType: string, x: number, y: number) => void;
  onUpgrade: (towerId: string) => void;
  onSell: (towerId: string) => void;
  onTargetMode: (towerId: string, mode: TowerTargetMode) => void;
  onClose: () => void;
}) {
  if (!selection) return null;
  const you = snapshot.players[currentUserId];
  if (!you) return null;
  const position = clampElementalMenuPosition(selection.screen, bounds);
  const selectedTower = selection.kind === "tower" ? you.towers.find((tower) => tower.id === selection.towerId) || null : null;
  const definition = selectedTower ? towerDefinition(snapshot.catalog.towers, selectedTower) : null;
  const upgradeCost = selectedTower && definition ? definition.upgradeCost[selectedTower.level - 1] || 0 : 0;
  const sellRefund = selectedTower && definition ? definition.sellRefund + (selectedTower.level - 1) * 18 : 0;

  return (
    <div
      className="absolute z-30 rounded-[1.4rem] border border-white/80 bg-white/95 p-3 text-left shadow-2xl backdrop-blur"
      style={{ left: position.x, top: position.y, width: menuSize.width }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900">
            {selection.kind === "tower" ? definition?.label || "Tower" : selection.kind === "obstacle" ? "Obstacle" : "Build tile"}
          </p>
          <p className="text-[11px] font-bold text-slate-400">
            {selection.kind === "tower" ? `Level ${selectedTower?.level || 1} · ${selectedTower?.mode || "first"}` : `${Math.round(selection.point.x)}, ${Math.round(selection.point.y)}`}
          </p>
        </div>
        <button type="button" aria-label="Close menu" onClick={onClose} className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
          <X size={13} />
        </button>
      </div>

      {selection.kind === "tile" && (
        <div className="grid gap-1.5">
          {snapshot.catalog.towers.map((tower) => {
            const canAfford = you.gold >= tower.cost;
            return (
              <button
                key={tower.id}
                type="button"
                disabled={!canAfford || snapshot.status !== "playing"}
                onClick={() => {
                  onBuild(tower.id, selection.point.x, selection.point.y);
                  onClose();
                }}
                className="flex min-h-10 items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-rose-50 disabled:opacity-45"
              >
                <span className="inline-flex items-center gap-2">
                  {elementIcon(tower.element)}
                  {tower.label.replace(" Tower", "")}
                </span>
                <span className={canAfford ? "text-amber-600" : "text-slate-400"}>{tower.cost}g</span>
              </button>
            );
          })}
        </div>
      )}

      {selection.kind === "tower" && selectedTower && definition && (
        <div className="grid gap-1.5">
          <div className="rounded-2xl bg-slate-50 p-2 text-[11px] font-bold text-slate-500">
            Damage {Math.round(definition.damage * (definition.levelScale[selectedTower.level - 1] || 1))} · Range {Math.round(definition.range)}
          </div>
          <Button
            type="button"
            className="min-h-10 justify-between px-3 py-2 text-xs"
            disabled={selectedTower.level >= 3 || you.gold < upgradeCost}
            onClick={() => {
              onUpgrade(selectedTower.id);
              onClose();
            }}
          >
            <span className="inline-flex items-center gap-2"><TrendingUp size={14} /> Upgrade</span>
            <span>{selectedTower.level >= 3 ? "Max" : `${upgradeCost}g`}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 justify-between px-3 py-2 text-xs"
            onClick={() => {
              onSell(selectedTower.id);
              onClose();
            }}
          >
            <span className="inline-flex items-center gap-2"><Trash2 size={14} /> Sell</span>
            <span>{sellRefund}g</span>
          </Button>
          <div className="grid grid-cols-2 gap-1">
            {(["first", "strongest", "closest-to-base", "weakest"] as TowerTargetMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onTargetMode(selectedTower.id, mode)}
                className={`rounded-xl px-2 py-1.5 text-[10px] font-black capitalize ${selectedTower.mode === mode ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-500"}`}
              >
                <Crosshair size={11} className="mr-1 inline" />
                {mode.replaceAll("-", " ")}
              </button>
            ))}
          </div>
        </div>
      )}

      {selection.kind === "obstacle" && (
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
          Obstacle clearing is not enabled in this duel yet.
        </div>
      )}
    </div>
  );
}
