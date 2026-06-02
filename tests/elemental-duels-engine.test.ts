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

  it("records tower attack events for client-only projectiles without trusting the client for damage", () => {
    const state = createElementalState("session-1", "room-1", players);
    state.status = "playing";
    const tile = state.map.buildTiles[0];
    expect(buildTower(state, "u1", "fire-tower", tile)).toBeNull();
    state.players.u1.monsters.push({
      id: "m1",
      monsterType: "normal",
      element: "lightning",
      hp: 100,
      maxHp: 100,
      pathProgress: 0.1,
      x: tile.x + 12,
      y: tile.y,
      speed: 0,
      reward: 1,
      baseDamage: 1,
      statusEffects: []
    });

    stepElementalState(state, 100);

    const attackEvent = state.visualEvents.find((event) => event.type === "tower_attack");
    expect(attackEvent).toMatchObject({
      type: "tower_attack",
      sourcePlayerId: "u1",
      towerElement: "fire",
      towerId: state.players.u1.towers[0].id,
      targetMonsterId: "m1"
    });
    expect(attackEvent?.from).toEqual({ x: tile.x, y: tile.y });
    expect(attackEvent?.to).toEqual({
      x: state.players.u1.monsters[0].x,
      y: state.players.u1.monsters[0].y
    });
    expect(state.players.u1.monsters[0].hp).toBeLessThan(100);
  });
});
