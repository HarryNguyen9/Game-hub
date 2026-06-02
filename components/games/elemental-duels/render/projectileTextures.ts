import type { ElementKey } from "@/lib/games/elemental-duels/types";

export const projectileStyles: Record<ElementKey, { color: number; glow: number; radius: number }> = {
  fire: { color: 0xfb7185, glow: 0xffedd5, radius: 6 },
  ice: { color: 0x38bdf8, glow: 0xe0f2fe, radius: 5 },
  lightning: { color: 0xfacc15, glow: 0xfef9c3, radius: 4 },
  earth: { color: 0x78716c, glow: 0xd6d3d1, radius: 7 }
};
