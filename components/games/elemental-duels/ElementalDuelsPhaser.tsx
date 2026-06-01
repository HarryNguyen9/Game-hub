"use client";

import { useEffect, useRef } from "react";
import { ELEMENTAL_CONFIG } from "@/lib/games/elemental-duels/config";
import type { ElementalSnapshot, Point } from "@/lib/games/elemental-duels/types";

type PhaserGameHandle = {
  destroy: (removeCanvas: boolean, noReturn?: boolean) => void;
};

type PhaserTextHandle = {
  destroy: () => void;
};

type PhaserPointer = {
  x: number;
  y: number;
};

function elementColor(element: string) {
  if (element === "fire") return 0xfb7185;
  if (element === "ice") return 0x38bdf8;
  if (element === "lightning") return 0xfacc15;
  return 0x84cc16;
}

export function ElementalDuelsPhaser({
  snapshot,
  currentUserId,
  onSelectTile
}: {
  snapshot: ElementalSnapshot;
  currentUserId: string;
  onSelectTile: (point: Point) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<PhaserGameHandle | null>(null);
  const snapshotRef = useRef(snapshot);
  const selectRef = useRef(onSelectTile);

  useEffect(() => {
    snapshotRef.current = snapshot;
    selectRef.current = onSelectTile;
  }, [onSelectTile, snapshot]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!containerRef.current || gameRef.current) return;
      const Phaser = await import("phaser");
      if (cancelled || !containerRef.current) return;

      class ElementalScene extends Phaser.Scene {
        field!: Phaser.GameObjects.Graphics;
        labels: PhaserTextHandle[] = [];

        constructor() {
          super("elemental-duels");
        }

        create() {
          this.field = this.add.graphics();
          this.input.on("pointerdown", (pointer: PhaserPointer) => {
            const current = snapshotRef.current;
            if (current.status !== "playing") return;
            const scaleX = ELEMENTAL_CONFIG.worldWidth / this.scale.width;
            const scaleY = ELEMENTAL_CONFIG.worldHeight / this.scale.height;
            const x = pointer.x * scaleX;
            const y = pointer.y * scaleY;
            selectRef.current({ x, y });
          });
        }

        update() {
          const current = snapshotRef.current;
          const you = current.players[currentUserId];
          const opponent = Object.values(current.players).find((player) => player.userId !== currentUserId);
          if (!you) return;

          this.field.clear();
          for (const label of this.labels) label.destroy();
          this.labels = [];

          const g = this.field;
          g.fillStyle(0xe8fbff, 1);
          g.fillRoundedRect(0, 0, ELEMENTAL_CONFIG.worldWidth, ELEMENTAL_CONFIG.worldHeight, 24);
          g.fillStyle(0xd8f7d4, 1);
          g.fillRect(0, ELEMENTAL_CONFIG.worldHeight * 0.58, ELEMENTAL_CONFIG.worldWidth, ELEMENTAL_CONFIG.worldHeight * 0.42);

          g.lineStyle(12, 0xffffff, 0.7);
          for (let i = 1; i < current.map.path.length; i += 1) {
            const a = current.map.path[i - 1];
            const b = current.map.path[i];
            g.lineBetween(a.x, a.y, b.x, b.y);
          }
          g.lineStyle(6, 0x92d8ff, 0.85);
          for (let i = 1; i < current.map.path.length; i += 1) {
            const a = current.map.path[i - 1];
            const b = current.map.path[i];
            g.lineBetween(a.x, a.y, b.x, b.y);
          }

          for (const tile of current.map.buildTiles) {
            const blocked = current.map.obstacles.some((obstacle) => !obstacle.cleared && Math.hypot(obstacle.x - tile.x, obstacle.y - tile.y) < 20);
            g.fillStyle(blocked ? 0xb8a28c : tile.affinity ? elementColor(tile.affinity) : 0xffffff, blocked ? 0.75 : 0.8);
            g.lineStyle(3, blocked ? 0x8b735f : 0xfbbf24, 0.9);
            g.fillRoundedRect(tile.x - 18, tile.y - 18, 36, 36, 10);
            g.strokeRoundedRect(tile.x - 18, tile.y - 18, 36, 36, 10);
          }

          g.fillStyle(0xffe4e6, 1);
          g.fillRoundedRect(ELEMENTAL_CONFIG.worldWidth - 34, ELEMENTAL_CONFIG.worldHeight / 2 - 42, 26, 84, 12);
          g.fillStyle(0xfb7185, 1);
          g.fillRect(ELEMENTAL_CONFIG.worldWidth - 28, ELEMENTAL_CONFIG.worldHeight / 2 + 42 - Math.max(0, you.baseHp / ELEMENTAL_CONFIG.baseHp) * 84, 14, Math.max(0, you.baseHp / ELEMENTAL_CONFIG.baseHp) * 84);

          for (const tower of you.towers) {
            g.fillStyle(elementColor(tower.element), 1);
            g.fillCircle(tower.x, tower.y, 16);
            g.lineStyle(3, 0x1f2937, 0.85);
            g.strokeCircle(tower.x, tower.y, 16);
            this.labels.push(this.add.text(tower.x - 5, tower.y - 8, String(tower.level), { fontFamily: "Arial", fontSize: "13px", color: "#0f172a", fontStyle: "bold" }));
          }

          for (const monster of you.monsters) {
            const hpPercent = Math.max(0, monster.hp / monster.maxHp);
            g.fillStyle(elementColor(monster.element), 1);
            g.fillCircle(monster.x, monster.y, 11);
            g.lineStyle(2, 0x334155, 0.7);
            g.strokeCircle(monster.x, monster.y, 11);
            g.fillStyle(0xffffff, 0.9);
            g.fillRoundedRect(monster.x - 14, monster.y - 20, 28, 4, 2);
            g.fillStyle(0x22c55e, 1);
            g.fillRoundedRect(monster.x - 14, monster.y - 20, 28 * hpPercent, 4, 2);
          }

          if (opponent) {
            g.fillStyle(0xffffff, 0.78);
            g.fillRoundedRect(12, 12, 136, 46, 16);
            this.labels.push(this.add.text(24, 22, `${opponent.displayName}`, { fontFamily: "Arial", fontSize: "12px", color: "#334155", fontStyle: "bold" }));
            this.labels.push(this.add.text(24, 38, `${opponent.baseHp} HP · ${opponent.monsters.length} mobs`, { fontFamily: "Arial", fontSize: "11px", color: "#64748b", fontStyle: "bold" }));
          }
        }
      }

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: ELEMENTAL_CONFIG.worldWidth,
        height: ELEMENTAL_CONFIG.worldHeight,
        backgroundColor: "#e8fbff",
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: ELEMENTAL_CONFIG.worldWidth,
          height: ELEMENTAL_CONFIG.worldHeight
        },
        scene: ElementalScene
      });
    }

    boot();
    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [currentUserId]);

  return <div ref={containerRef} className="min-h-[18rem] overflow-hidden rounded-[1.5rem] bg-sky-50 shadow-inner" />;
}
