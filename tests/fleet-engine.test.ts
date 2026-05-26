import { describe, expect, it } from "vitest";
import { confirmFleet, createFleetState, fireAt, placeFleet } from "@/lib/games/fleet-duel/engine";
import { FLEET_CONFIG } from "@/lib/games/fleet-duel/config";
import { normalizeShips } from "@/lib/games/fleet-duel/validation";
import { serializeFleetStateForUser } from "@/lib/games/fleet-duel/serializer";
import type { FleetCell, FleetShipDefinition } from "@/lib/games/fleet-duel/types";

const players = [
  { userId: "a", username: "a", displayName: "A" },
  { userId: "b", username: "b", displayName: "B" }
];

const testDefinitions: FleetShipDefinition[] = FLEET_CONFIG.shipCatalog.slice(0, FLEET_CONFIG.fleetSize).map((ship) => ({
  ...ship,
  shape: ship.shape.map((cell) => ({ ...cell }))
}));

function fleet(offsetY = 0) {
  return normalizeShips(
    testDefinitions.map((ship, index) => ({
      id: ship.id,
      size: ship.size,
      cells: ship.shape.map((cell: FleetCell) => ({ x: cell.x, y: cell.y + offsetY + index * 2 }))
    }))
  );
}

function createTestState() {
  const state = createFleetState("s1", "r1", players);
  state.blockedCells = [];
  state.shipDefinitions = testDefinitions;
  return state;
}

describe("fleet duel engine", () => {
  it("validates placement and starts battle when both players confirm", () => {
    const state = createTestState();
    expect(placeFleet(state, "a", fleet())).toBeNull();
    expect(confirmFleet(state, "a")).toBeNull();
    expect(state.status).toBe("setup");
    expect(placeFleet(state, "b", fleet())).toBeNull();
    expect(confirmFleet(state, "b")).toBeNull();
    expect(state.status).toBe("battle");
    expect(["a", "b"]).toContain(state.currentTurnUserId);
  });

  it("does not expose opponent ship cells before they are sunk", () => {
    const state = createTestState();
    placeFleet(state, "a", fleet());
    placeFleet(state, "b", fleet());
    const snapshot = serializeFleetStateForUser(state, "a");
    expect(snapshot.you.ships[0].cells).toHaveLength(testDefinitions[0].size);
    expect(snapshot.opponent?.ships[0].cells).toBeUndefined();
  });

  it("rejects out of turn shots", () => {
    const state = createTestState();
    placeFleet(state, "a", fleet());
    placeFleet(state, "b", fleet());
    confirmFleet(state, "a");
    confirmFleet(state, "b");
    const wrongPlayer = state.currentTurnUserId === "a" ? "b" : "a";
    expect(fireAt(state, wrongPlayer, { x: 0, y: 0 })).toEqual({ error: "It is not your turn." });
  });

  it("records rock shots as visible misses instead of exposing rocks up front", () => {
    const state = createTestState();
    state.blockedCells = [{ x: 7, y: 7 }];
    placeFleet(state, "a", fleet());
    placeFleet(state, "b", fleet());
    confirmFleet(state, "a");
    confirmFleet(state, "b");
    state.currentTurnUserId = "a";
    expect(serializeFleetStateForUser(state, "a").blockedCells).toHaveLength(0);
    const result = fireAt(state, "a", { x: 7, y: 7 });
    expect(result).toMatchObject({ result: "rock" });
    expect(state.players.a.shots[0].result).toBe("rock");
    expect(serializeFleetStateForUser(state, "a").blockedCells).toEqual([{ x: 7, y: 7 }]);
    expect(state.currentTurnUserId).toBe("b");
  });
});
