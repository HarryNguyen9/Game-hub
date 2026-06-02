import type { ElementKey, ElementalVisualEvent, Point } from "@/lib/games/elemental-duels/types";
import { projectileStyles } from "./projectileTextures";

type GraphicsLike = {
  lineStyle: (width: number, color: number, alpha?: number) => GraphicsLike;
  fillStyle: (color: number, alpha?: number) => GraphicsLike;
  fillCircle: (x: number, y: number, radius: number) => GraphicsLike;
  strokeCircle: (x: number, y: number, radius: number) => GraphicsLike;
  lineBetween: (x1: number, y1: number, x2: number, y2: number) => GraphicsLike;
};

export type ElementalProjectile = {
  id: string;
  element: ElementKey;
  from: Point;
  to: Point;
  createdAt: number;
  durationMs: number;
  hitEffects: ElementalVisualEvent["hitEffects"];
};

export function projectileDuration(element: ElementKey) {
  if (element === "lightning") return 170;
  if (element === "earth") return 520;
  if (element === "ice") return 360;
  return 320;
}

export function projectileFromEvent(event: ElementalVisualEvent, now = event.at): ElementalProjectile | null {
  if (event.type !== "tower_attack" || !event.towerElement) return null;
  return {
    id: event.id,
    element: event.towerElement,
    from: event.from,
    to: event.to,
    createdAt: now,
    durationMs: projectileDuration(event.towerElement),
    hitEffects: event.hitEffects
  };
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function easeOut(amount: number) {
  return 1 - (1 - amount) * (1 - amount);
}

export function projectileProgress(projectile: ElementalProjectile, now: number) {
  return Math.max(0, Math.min(1, (now - projectile.createdAt) / projectile.durationMs));
}

export function projectilePosition(projectile: ElementalProjectile, now: number) {
  const progress = projectileProgress(projectile, now);
  const eased = easeOut(progress);
  return {
    progress,
    x: lerp(projectile.from.x, projectile.to.x, eased),
    y: lerp(projectile.from.y, projectile.to.y, eased) - Math.sin(progress * Math.PI) * (projectile.element === "earth" ? 10 : 5)
  };
}

export function drawProjectileImpact(g: GraphicsLike, projectile: ElementalProjectile, now: number) {
  const progress = Math.max(0, Math.min(1, (now - projectile.createdAt) / projectile.durationMs));
  const style = projectileStyles[projectile.element];
  const color = style.color;
  if (progress > 0.8) {
    const alpha = Math.max(0, 1 - progress);
    g.lineStyle(2, color, alpha * 4);
    g.strokeCircle(projectile.to.x, projectile.to.y, projectile.element === "earth" ? 22 : 16);
    if (projectile.hitEffects.includes("slow")) {
      g.lineStyle(2, 0x38bdf8, alpha * 3);
      g.strokeCircle(projectile.to.x, projectile.to.y, 21);
    }
    if (projectile.hitEffects.includes("burn")) {
      g.fillStyle(0xfb923c, alpha * 2);
      g.fillCircle(projectile.to.x - 7, projectile.to.y - 9, 3);
      g.fillCircle(projectile.to.x + 6, projectile.to.y - 5, 2);
    }
  }
}

export function drawProjectile(g: GraphicsLike, projectile: ElementalProjectile, now: number) {
  const { progress, x, y } = projectilePosition(projectile, now);
  const style = projectileStyles[projectile.element];
  const color = style.color;

  if (projectile.element === "lightning") {
    g.lineStyle(2, color, 0.75 * (1 - progress * 0.3));
    g.lineBetween(projectile.from.x, projectile.from.y, x, y);
    g.fillStyle(color, 0.92);
    g.fillCircle(x, y, style.radius);
    if (progress > 0.72) {
      g.lineStyle(2, 0xffffff, 0.65);
      g.lineBetween(projectile.to.x - 8, projectile.to.y, projectile.to.x + 7, projectile.to.y - 4);
      g.lineBetween(projectile.to.x - 2, projectile.to.y - 9, projectile.to.x + 4, projectile.to.y + 8);
    }
    return;
  }

  if (projectile.element === "earth") {
    g.fillStyle(color, 0.95);
    g.fillCircle(x, y, style.radius);
    g.fillStyle(0x44403c, 0.55);
    g.fillCircle(x - 2, y - 2, 2);
  } else if (projectile.element === "ice") {
    g.fillStyle(0xe0f2fe, 0.95);
    g.fillCircle(x, y, style.radius);
    g.lineStyle(2, color, 0.9);
    g.lineBetween(x - 7, y, x + 7, y);
    g.lineBetween(x, y - 7, x, y + 7);
  } else {
    g.fillStyle(0xffedd5, 0.8);
    g.fillCircle(x, y, style.radius + 3);
    g.fillStyle(color, 0.96);
    g.fillCircle(x, y, style.radius);
  }

  drawProjectileImpact(g, projectile, now);
}
