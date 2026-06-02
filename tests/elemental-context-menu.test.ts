import { describe, expect, it } from "vitest";
import { clampElementalMenuPosition } from "@/components/games/elemental-duels/ElementalContextMenu";

describe("elemental context menu positioning", () => {
  it("keeps the floating menu inside the game overlay bounds", () => {
    expect(clampElementalMenuPosition({ x: 430, y: 270 }, { width: 440, height: 280 }, { width: 172, height: 188 })).toEqual({
      x: 260,
      y: 84
    });
    expect(clampElementalMenuPosition({ x: 8, y: 10 }, { width: 440, height: 280 }, { width: 172, height: 188 })).toEqual({
      x: 8,
      y: 10
    });
  });
});
