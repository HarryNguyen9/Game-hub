import type { ElementalMonster, Point } from "@/lib/games/elemental-duels/types";

type GraphicsLike = {
  lineStyle: (width: number, color: number, alpha?: number) => GraphicsLike;
  fillStyle: (color: number, alpha?: number) => GraphicsLike;
  fillCircle: (x: number, y: number, radius: number) => GraphicsLike;
  strokeCircle: (x: number, y: number, radius: number) => GraphicsLike;
  lineBetween: (x1: number, y1: number, x2: number, y2: number) => GraphicsLike;
};

export function drawMonsterShadow(g: GraphicsLike, point: Point, scale: number) {
  g.fillStyle(0x0f172a, 0.16);
  g.fillCircle(point.x, point.y + 12 * scale, 14 * scale);
}

export function drawMonsterStatusEffects(g: GraphicsLike, monster: ElementalMonster, point: Point, now: number, scale: number) {
  for (const effect of monster.statusEffects) {
    if (effect.type === "burn") {
      const flicker = Math.sin(now / 90 + point.x) * 1.5;
      g.lineStyle(2, 0xfb7185, 0.58);
      g.strokeCircle(point.x, point.y, 23 * scale + flicker);
      g.fillStyle(0xfb923c, 0.65);
      g.fillCircle(point.x - 8 * scale, point.y - 13 * scale, 2.4 * scale);
      g.fillCircle(point.x + 8 * scale, point.y - 10 * scale, 2 * scale);
    } else if (effect.type === "slow") {
      g.lineStyle(2, 0x38bdf8, 0.6);
      g.strokeCircle(point.x, point.y, 25 * scale);
      g.lineBetween(point.x - 8 * scale, point.y - 18 * scale, point.x + 8 * scale, point.y - 18 * scale);
    } else if (effect.type === "stun") {
      g.lineStyle(2, 0xfacc15, 0.8);
      g.strokeCircle(point.x, point.y - 11 * scale, 9 * scale);
      g.fillStyle(0xfacc15, 0.9);
      g.fillCircle(point.x - 7 * scale, point.y - 20 * scale, 2.2 * scale);
      g.fillCircle(point.x + 7 * scale, point.y - 20 * scale, 2.2 * scale);
    }
  }
}
