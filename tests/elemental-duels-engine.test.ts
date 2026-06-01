import { describe, expect, it } from "vitest";
import { getDamageMultiplier } from "@/lib/games/elemental-duels/combat";
import { buildTower, createElementalState, selectSendElement, selectMonsterType, stepElementalState } from "@/lib/games/elemental-duels/engine";

const players = [
  { userId: "u1", username: "a", displayName: "A" },
  { userId: "u2", username: "b", displayName: "B" }
];

describe("elemental duels engine", () => {
  it("uses the configured element counter cycle", () => {
    expect(getDamageMultiplier("fire", "lightning")).toBe(1.5);
    expect(getDamageMultiplier("fire", "ice")).toBe(0.5);
    expect(getDamageMultiplier("fire", "earth")).toBe(1);
  });

  it("validates tower builds against server-owned gold and tiles", () => {
    const state = createElementalState("session-1", "room-1", players);
    state.status = "playing";
    const firstTile = state.map.buildTiles[0];
    expect(buildTower(state, "u1", "fire-tower", firstTile)).toBeNull();
    expect(state.players.u1.towers).toHaveLength(1);
    expect(buildTower(state, "u1", "ice-tower", firstTile)).toBe("A tower already occupies this tile.");
  });

  it("moves monsters and ends when a base falls", () => {
    const state = createElementalState("session-1", "room-1", players);
    state.status = "playing";
    state.players.u1.baseHp = 1;
    state.players.u1.monsters.push({
      id: "m1",
      monsterType: "normal",
      element: "earth",
      hp: 10,
      maxHp: 10,
      pathProgress: 0.999,
      x: 0,
      y: 0,
      speed: 10,
      reward: 1,
      baseDamage: 1,
      statusEffects: []
    });
    stepElementalState(state, 1000);
    expect(state.status).toBe("ended");
    expect(state.winnerUserId).toBe("u2");
  });

  it("stores send profile as input only and lets server apply it later", () => {
    const state = createElementalState("session-1", "room-1", players);
    expect(selectSendElement(state, "u1", "ice")).toBeNull();
    expect(selectMonsterType(state, "u1", "earth-giant")).toBeNull();
    expect(state.players.u1.selectedSendElement).toBe("ice");
    expect(state.players.u1.selectedMonsterType).toBe("earth-giant");
  });
});
