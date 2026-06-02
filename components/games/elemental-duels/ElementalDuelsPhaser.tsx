"use client";

import { useEffect, useRef } from "react";
import { ELEMENTAL_CONFIG } from "@/lib/games/elemental-duels/config";
import type { ElementalMonster, ElementalSnapshot, Point } from "@/lib/games/elemental-duels/types";
import type { ElementalSelection } from "./ElementalContextMenu";
import { drawMonsterShadow, drawMonsterStatusEffects } from "./render/effects";
import { loadElementalAssets, projectileTextureKey, towerTextureKey } from "./render/loadElementalAssets";
import { ensureMonsterTextures, monsterTextureKey, monsterVisualScale } from "./render/monsterTextures";
import { drawProjectile, drawProjectileImpact, projectileFromEvent, projectilePosition, type ElementalProjectile } from "./render/projectileRenderer";

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

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function bob(monster: ElementalMonster, now: number) {
  if (monster.monsterType === "earth-giant") return Math.sin(now / 520 + monster.x) * 1.2;
  if (monster.monsterType === "fire-runner") return Math.sin(now / 120 + monster.x) * 2.4;
  if (monster.element === "lightning") return Math.sin(now / 80 + monster.y) * 1.8;
  return Math.sin(now / 260 + monster.x) * 1.4;
}

export function ElementalDuelsPhaser({
  snapshot,
  currentUserId,
  onSelect
}: {
  snapshot: ElementalSnapshot;
  currentUserId: string;
  onSelect: (selection: ElementalSelection | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<PhaserGameHandle | null>(null);
  const snapshotRef = useRef(snapshot);
  const selectRef = useRef(onSelect);

  useEffect(() => {
    snapshotRef.current = snapshot;
    selectRef.current = onSelect;
  }, [onSelect, snapshot]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!containerRef.current || gameRef.current) return;
      const Phaser = await import("phaser");
      if (cancelled || !containerRef.current) return;

      class ElementalScene extends Phaser.Scene {
        field!: Phaser.GameObjects.Graphics;
        effects!: Phaser.GameObjects.Graphics;
        labels: PhaserTextHandle[] = [];
        monsterPositions = new Map<string, DisplayPoint>();
        monsterSprites = new Map<string, Phaser.GameObjects.Image>();
        towerSprites = new Map<string, Phaser.GameObjects.Image>();
        projectileSprites = new Map<string, Phaser.GameObjects.Image>();
        processedVisualEventIds = new Set<string>();
        projectiles: ElementalProjectile[] = [];

        constructor() {
          super("elemental-duels");
        }

        preload() {
          loadElementalAssets(this);
        }

        create() {
          ensureMonsterTextures(this);
          this.field = this.add.graphics();
          this.field.setDepth(0);
          this.effects = this.add.graphics();
          this.effects.setDepth(8);
          this.input.on("pointerdown", (pointer: PhaserPointer) => {
            const current = snapshotRef.current;
            if (current.status !== "playing") {
              selectRef.current(null);
              return;
            }
            const scaleX = ELEMENTAL_CONFIG.worldWidth / this.scale.width;
            const scaleY = ELEMENTAL_CONFIG.worldHeight / this.scale.height;
            const point = { x: pointer.x * scaleX, y: pointer.y * scaleY };
            const screen = { x: pointer.x, y: pointer.y };
            const you = current.players[currentUserId];
            if (!you) return selectRef.current(null);

            const tower = you.towers.find((item) => distance(item, point) <= 24);
            if (tower) {
              selectRef.current({ kind: "tower", towerId: tower.id, point: { x: tower.x, y: tower.y }, screen });
              return;
            }

            const obstacle = current.map.obstacles.find((item) => !item.cleared && distance(item, point) <= 26);
            if (obstacle) {
              selectRef.current({ kind: "obstacle", obstacleId: obstacle.id, point: { x: obstacle.x, y: obstacle.y }, screen });
              return;
            }

            const tile = current.map.buildTiles.find((item) => distance(item, point) <= ELEMENTAL_CONFIG.buildTileRadius);
            if (tile) {
              selectRef.current({ kind: "tile", point: { x: tile.x, y: tile.y }, screen });
              return;
            }

            selectRef.current(null);
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
            const blocked = current.map.obstacles.some((obstacle) => !obstacle.cleared && distance(obstacle, tile) < 20);
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

        drawTowers(g: Phaser.GameObjects.Graphics, current: ElementalSnapshot) {
          const you = current.players[currentUserId];
          if (!you) return;
          const liveTowerIds = new Set<string>();
          for (const tower of you.towers) {
            liveTowerIds.add(tower.id);
            const key = towerTextureKey(tower.element);
            if (this.textures.exists(key)) {
              const sprite = this.towerSprites.get(tower.id) || this.add.image(tower.x, tower.y - 2, key);
              if (!this.towerSprites.has(tower.id)) {
                sprite.setDepth(4);
                this.towerSprites.set(tower.id, sprite);
              }
              sprite.setTexture(key);
              sprite.setPosition(tower.x, tower.y - 2);
              this.fitImage(sprite, 42 + (tower.level - 1) * 6, 48 + (tower.level - 1) * 6);
            } else {
              const existing = this.towerSprites.get(tower.id);
              if (existing) {
                existing.destroy();
                this.towerSprites.delete(tower.id);
              }
              g.fillStyle(elementColor(tower.element), 1);
              g.fillRoundedRect(tower.x - 14, tower.y - 18, 28, 34, 9);
              g.fillStyle(0xffffff, 0.55);
              g.fillCircle(tower.x, tower.y - 7, 7);
              g.lineStyle(3, 0x1f2937, 0.85);
              g.strokeRoundedRect(tower.x - 14, tower.y - 18, 28, 34, 9);
            }
            this.labels.push(this.add.text(tower.x - 5, tower.y - 8, String(tower.level), { fontFamily: "Arial", fontSize: "13px", color: "#0f172a", fontStyle: "bold" }));
          }
          for (const [towerId, sprite] of this.towerSprites.entries()) {
            if (!liveTowerIds.has(towerId)) {
              sprite.destroy();
              this.towerSprites.delete(towerId);
            }
          }
        }

        consumeVisualEvents(current: ElementalSnapshot) {
          const now = performance.now();
          for (const event of [...current.visualEvents].reverse()) {
            if (event.sourcePlayerId !== currentUserId || this.processedVisualEventIds.has(event.id)) continue;
            const projectile = projectileFromEvent(event, now);
            if (projectile) this.projectiles.push(projectile);
            this.processedVisualEventIds.add(event.id);
          }
          if (this.processedVisualEventIds.size > 80) {
            this.processedVisualEventIds = new Set([...this.processedVisualEventIds].slice(-40));
          }
        }

        fitImage(sprite: Phaser.GameObjects.Image, maxWidth: number, maxHeight = maxWidth) {
          const frame = sprite.frame;
          const width = frame?.width || maxWidth;
          const height = frame?.height || maxHeight;
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          sprite.setDisplaySize(width * ratio, height * ratio);
        }

        drawMonsters(current: ElementalSnapshot, now: number) {
          const you = current.players[currentUserId];
          if (!you) return;
          const liveMonsterIds = new Set<string>();

          for (const monster of you.monsters) {
            liveMonsterIds.add(monster.id);
            const previous = this.monsterPositions.get(monster.id) || { x: monster.x, y: monster.y };
            const display = {
              x: previous.x + (monster.x - previous.x) * 0.22,
              y: previous.y + (monster.y - previous.y) * 0.22
            };
            this.monsterPositions.set(monster.id, display);
            const scale = monsterVisualScale(monster);
            const y = display.y + bob(monster, now);

            drawMonsterShadow(this.field, { x: display.x, y }, scale);
            drawMonsterStatusEffects(this.effects, monster, { x: display.x, y }, now, scale);

            const key = monsterTextureKey(monster);
            const sprite = this.monsterSprites.get(monster.id) || this.add.image(display.x, y, key);
            if (!this.monsterSprites.has(monster.id)) {
              sprite.setDepth(5);
              this.monsterSprites.set(monster.id, sprite);
            }
            if (!this.textures.exists(key)) sprite.setTexture("monster-fallback");
            else sprite.setTexture(key);
            sprite.setPosition(display.x, y);
            this.fitImage(sprite, 80 * scale, 80 * scale);
            sprite.setAlpha(monster.statusEffects.some((effect) => effect.type === "stun") ? 0.82 : 1);

            const hpPercent = Math.max(0, monster.hp / monster.maxHp);
            this.effects.fillStyle(0xffffff, 0.92);
            this.effects.fillRoundedRect(display.x - 15, y - 26 * scale - 12, 30, 4, 2);
            this.effects.fillStyle(hpPercent < 0.35 ? 0xfb7185 : 0x22c55e, 1);
            this.effects.fillRoundedRect(display.x - 15, y - 26 * scale - 12, 30 * hpPercent, 4, 2);
          }

          for (const [monsterId, sprite] of this.monsterSprites.entries()) {
            if (!liveMonsterIds.has(monsterId)) {
              sprite.destroy();
              this.monsterSprites.delete(monsterId);
            }
          }
          for (const monsterId of this.monsterPositions.keys()) {
            if (!liveMonsterIds.has(monsterId)) this.monsterPositions.delete(monsterId);
          }
        }

        drawProjectiles(now: number) {
          this.projectiles = this.projectiles.filter((projectile) => now - projectile.createdAt <= projectile.durationMs + 140);
          const liveProjectileIds = new Set<string>();
          for (const projectile of this.projectiles) {
            liveProjectileIds.add(projectile.id);
            const key = projectileTextureKey(projectile.element);
            if (this.textures.exists(key)) {
              const point = projectilePosition(projectile, now);
              const sprite = this.projectileSprites.get(projectile.id) || this.add.image(point.x, point.y, key);
              if (!this.projectileSprites.has(projectile.id)) {
                sprite.setDepth(7);
                this.projectileSprites.set(projectile.id, sprite);
              }
              sprite.setTexture(key);
              sprite.setPosition(point.x, point.y);
              sprite.setAlpha(Math.max(0, 1 - point.progress * 0.35));
              this.fitImage(sprite, projectile.element === "earth" ? 36 : 30, projectile.element === "earth" ? 36 : 30);
              sprite.setRotation(Math.atan2(projectile.to.y - projectile.from.y, projectile.to.x - projectile.from.x));
              drawProjectileImpact(this.effects, projectile, now);
            } else {
              const existing = this.projectileSprites.get(projectile.id);
              if (existing) {
                existing.destroy();
                this.projectileSprites.delete(projectile.id);
              }
              drawProjectile(this.effects, projectile, now);
            }
          }
          for (const [projectileId, sprite] of this.projectileSprites.entries()) {
            if (!liveProjectileIds.has(projectileId)) {
              sprite.destroy();
              this.projectileSprites.delete(projectileId);
            }
          }
        }

        drawOpponentCard(g: Phaser.GameObjects.Graphics, current: ElementalSnapshot) {
          const opponent = Object.values(current.players).find((player) => player.userId !== currentUserId);
          if (!opponent) return;
          g.fillStyle(0xffffff, 0.78);
          g.fillRoundedRect(12, 12, 158, 52, 16);
          g.fillStyle(0xfef3c7, 1);
          g.fillRoundedRect(26, 42, 80, 7, 4);
          g.fillStyle(0xf97316, 1);
          g.fillRoundedRect(26, 42, 80 * Math.max(0, opponent.baseHp / ELEMENTAL_CONFIG.baseHp), 7, 4);
          this.labels.push(this.add.text(24, 22, opponent.displayName, { fontFamily: "Arial", fontSize: "12px", color: "#334155", fontStyle: "bold" }));
          this.labels.push(this.add.text(112, 38, `${opponent.monsters.length} mobs`, { fontFamily: "Arial", fontSize: "11px", color: "#64748b", fontStyle: "bold" }));
        }

        update() {
          const current = snapshotRef.current;
          const you = current.players[currentUserId];
          if (!you) return;
          const now = performance.now();

          this.field.clear();
          this.effects.clear();
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
          this.drawTowers(g, current);

          g.fillStyle(0xffe4e6, 1);
          g.fillRoundedRect(ELEMENTAL_CONFIG.worldWidth - 34, ELEMENTAL_CONFIG.worldHeight / 2 - 42, 26, 84, 12);
          g.fillStyle(0xfb7185, 1);
          g.fillRect(
            ELEMENTAL_CONFIG.worldWidth - 28,
            ELEMENTAL_CONFIG.worldHeight / 2 + 42 - Math.max(0, you.baseHp / ELEMENTAL_CONFIG.baseHp) * 84,
            14,
            Math.max(0, you.baseHp / ELEMENTAL_CONFIG.baseHp) * 84
          );

          this.consumeVisualEvents(current);
          this.drawProjectiles(now);
          this.drawMonsters(current, now);
          this.drawOpponentCard(g, current);
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

  return (
    <div
      ref={containerRef}
      className="h-[clamp(13rem,42vh,23rem)] w-full overflow-hidden rounded-[1.5rem] bg-sky-50 shadow-inner md:aspect-[11/7] md:h-auto [&>canvas]:!block [&>canvas]:!h-full [&>canvas]:!w-full"
    />
  );
}
