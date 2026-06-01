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

type DisplayPoint = {
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
        monsterPositions = new Map<string, DisplayPoint>();

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
            selectRef.current({ x: pointer.x * scaleX, y: pointer.y * scaleY });
          });
        }

        drawPath(g: Phaser.GameObjects.Graphics, current: ElementalSnapshot) {
          g.lineStyle(18, 0xffffff, 0.72);
          for (let i = 1; i < current.map.path.length; i += 1) {
            g.lineBetween(current.map.path[i - 1].x, current.map.path[i - 1].y, current.map.path[i].x, current.map.path[i].y);
          }
          g.lineStyle(9, 0x92d8ff, 0.9);
          for (let i = 1; i < current.map.path.length; i += 1) {
            g.lineBetween(current.map.path[i - 1].x, current.map.path[i - 1].y, current.map.path[i].x, current.map.path[i].y);
          }
          g.lineStyle(2, 0x38bdf8, 0.35);
          for (let i = 1; i < current.map.path.length; i += 1) {
            g.lineBetween(current.map.path[i - 1].x, current.map.path[i - 1].y + 7, current.map.path[i].x, current.map.path[i].y + 7);
          }
        }

        drawTiles(g: Phaser.GameObjects.Graphics, current: ElementalSnapshot) {
          for (const tile of current.map.buildTiles) {
            const blocked = current.map.obstacles.some((obstacle) => !obstacle.cleared && Math.hypot(obstacle.x - tile.x, obstacle.y - tile.y) < 20);
            g.fillStyle(blocked ? 0xb8a28c : tile.affinity ? elementColor(tile.affinity) : 0xffffff, blocked ? 0.75 : 0.84);
            g.lineStyle(3, blocked ? 0x8b735f : 0xfbbf24, 0.9);
            g.fillRoundedRect(tile.x - 18, tile.y - 18, 36, 36, 10);
            g.strokeRoundedRect(tile.x - 18, tile.y - 18, 36, 36, 10);
            if (tile.affinity) {
              g.fillStyle(elementColor(tile.affinity), 0.24);
              g.fillCircle(tile.x, tile.y, 10);
            }
          }
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
          g.fillStyle(0xffffff, 0.28);
          g.fillCircle(74, 58, 30);
          g.fillCircle(348, 46, 38);
          g.fillCircle(232, 88, 24);
          g.fillStyle(0xd8f7d4, 1);
          g.fillRect(0, ELEMENTAL_CONFIG.worldHeight * 0.58, ELEMENTAL_CONFIG.worldWidth, ELEMENTAL_CONFIG.worldHeight * 0.42);
          g.fillStyle(0xb7edb1, 0.4);
          for (let x = 22; x < ELEMENTAL_CONFIG.worldWidth; x += 52) {
            g.fillRoundedRect(x, ELEMENTAL_CONFIG.worldHeight * 0.68 + (x % 3) * 8, 24, 7, 4);
          }

          this.drawPath(g, current);
          this.drawTiles(g, current);

          g.fillStyle(0xffe4e6, 1);
          g.fillRoundedRect(ELEMENTAL_CONFIG.worldWidth - 34, ELEMENTAL_CONFIG.worldHeight / 2 - 42, 26, 84, 12);
          g.fillStyle(0xfb7185, 1);
          g.fillRect(
            ELEMENTAL_CONFIG.worldWidth - 28,
            ELEMENTAL_CONFIG.worldHeight / 2 + 42 - Math.max(0, you.baseHp / ELEMENTAL_CONFIG.baseHp) * 84,
            14,
            Math.max(0, you.baseHp / ELEMENTAL_CONFIG.baseHp) * 84
          );

          for (const tower of you.towers) {
            g.fillStyle(elementColor(tower.element), 1);
            g.fillRoundedRect(tower.x - 14, tower.y - 18, 28, 34, 9);
            g.fillStyle(0xffffff, 0.55);
            g.fillCircle(tower.x, tower.y - 7, 7);
            g.lineStyle(3, 0x1f2937, 0.85);
            g.strokeRoundedRect(tower.x - 14, tower.y - 18, 28, 34, 9);
            this.labels.push(this.add.text(tower.x - 5, tower.y - 8, String(tower.level), { fontFamily: "Arial", fontSize: "13px", color: "#0f172a", fontStyle: "bold" }));
          }

          const liveMonsterIds = new Set<string>();
          for (const monster of you.monsters) {
            liveMonsterIds.add(monster.id);
            const previous = this.monsterPositions.get(monster.id) || { x: monster.x, y: monster.y };
            const display = {
              x: previous.x + (monster.x - previous.x) * 0.22,
              y: previous.y + (monster.y - previous.y) * 0.22
            };
            this.monsterPositions.set(monster.id, display);

            const hpPercent = Math.max(0, monster.hp / monster.maxHp);
            g.fillStyle(elementColor(monster.element), 1);
            g.fillCircle(display.x, display.y, 11);
            g.fillStyle(0xffffff, 0.55);
            g.fillCircle(display.x - 4, display.y - 4, 3);
            g.lineStyle(2, 0x334155, 0.7);
            g.strokeCircle(display.x, display.y, 11);
            g.fillStyle(0xffffff, 0.9);
            g.fillRoundedRect(display.x - 14, display.y - 20, 28, 4, 2);
            g.fillStyle(0x22c55e, 1);
            g.fillRoundedRect(display.x - 14, display.y - 20, 28 * hpPercent, 4, 2);

            for (const effect of monster.statusEffects) {
              if (effect.type === "burn") {
                g.lineStyle(2, 0xfb7185, 0.55);
                g.strokeCircle(display.x, display.y, 16);
              } else if (effect.type === "slow") {
                g.lineStyle(2, 0x38bdf8, 0.55);
                g.strokeCircle(display.x, display.y, 17);
              } else if (effect.type === "stun") {
                g.lineStyle(2, 0xfacc15, 0.75);
                g.strokeCircle(display.x, display.y - 2, 19);
              }
            }
          }

          for (const monsterId of this.monsterPositions.keys()) {
            if (!liveMonsterIds.has(monsterId)) this.monsterPositions.delete(monsterId);
          }

          for (const tower of you.towers) {
            if (!tower.targetMonsterId) continue;
            const target = you.monsters.find((monster) => monster.id === tower.targetMonsterId);
            if (!target) continue;
            const targetPoint = this.monsterPositions.get(target.id) || target;
            if (tower.element === "lightning") {
              g.lineStyle(3, 0xfacc15, 0.8);
              g.lineBetween(tower.x, tower.y, targetPoint.x, targetPoint.y);
              g.lineStyle(1, 0xffffff, 0.9);
              g.lineBetween(tower.x + 4, tower.y - 4, targetPoint.x - 3, targetPoint.y + 3);
            } else if (tower.element === "fire") {
              g.lineStyle(3, 0xfb7185, 0.55);
              g.lineBetween(tower.x, tower.y, targetPoint.x, targetPoint.y);
              g.fillStyle(0xfb7185, 0.16);
              g.fillCircle(targetPoint.x, targetPoint.y, 26);
            } else if (tower.element === "ice") {
              g.lineStyle(3, 0x38bdf8, 0.62);
              g.lineBetween(tower.x, tower.y, targetPoint.x, targetPoint.y);
              g.fillStyle(0x38bdf8, 0.15);
              g.fillCircle(targetPoint.x, targetPoint.y, 24);
            } else {
              g.lineStyle(4, 0x84cc16, 0.62);
              g.lineBetween(tower.x, tower.y, targetPoint.x, targetPoint.y);
              g.lineStyle(2, 0x4d7c0f, 0.5);
              g.strokeCircle(targetPoint.x, targetPoint.y, 22);
            }
          }

          if (opponent) {
            g.fillStyle(0xffffff, 0.78);
            g.fillRoundedRect(12, 12, 158, 52, 16);
            g.fillStyle(0xfef3c7, 1);
            g.fillRoundedRect(26, 42, 80, 7, 4);
            g.fillStyle(0xf97316, 1);
            g.fillRoundedRect(26, 42, 80 * Math.max(0, opponent.baseHp / ELEMENTAL_CONFIG.baseHp), 7, 4);
            this.labels.push(this.add.text(24, 22, opponent.displayName, { fontFamily: "Arial", fontSize: "12px", color: "#334155", fontStyle: "bold" }));
            this.labels.push(this.add.text(112, 38, `${opponent.monsters.length} mobs`, { fontFamily: "Arial", fontSize: "11px", color: "#64748b", fontStyle: "bold" }));
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

  return <div ref={containerRef} className="aspect-[11/7] min-h-[18rem] w-full overflow-hidden rounded-[1.5rem] bg-sky-50 shadow-inner" />;
}
