import type { Point } from "./types";

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pathLength(path: Point[]) {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    total += distance(path[index - 1], path[index]);
  }
  return total;
}

export function pointAtProgress(path: Point[], progress: number) {
  if (path.length === 0) return { x: 0, y: 0 };
  const total = pathLength(path);
  const target = Math.max(0, Math.min(1, progress)) * total;
  let walked = 0;
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1];
    const end = path[index];
    const segment = distance(start, end);
    if (walked + segment >= target) {
      const t = segment === 0 ? 0 : (target - walked) / segment;
      return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t
      };
    }
    walked += segment;
  }
  return path[path.length - 1];
}

export function nearestPointDistance(point: Point, path: Point[]) {
  return Math.min(...path.map((node) => distance(point, node)));
}
