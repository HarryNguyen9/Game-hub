import { describe, expect, it } from "vitest";
import { confirmFleet, createFleetState, fireAt, placeFleet } from "@/lib/games/fleet-duel/engine";
import { FLEET_CONFIG } from "@/lib/games/fleet-duel/config";
import { normalizeShips } from "@/lib/games/fleet-duel/validation";
import { serializeFleetStateForUser } from "@/lib/games/fleet-duel/serializer";

const players = [
  { userId: "a", username: "a", displayName: "A" },
  { userId: "b", username: "b", displayName: "B" }
];

function fleet(offsetY = 0) {
  return normalizeShips([
    { id: "carrier", size: 4, cells: [0, 1, 2, 3].map((x) => ({ x, y: offsetY })) },
    { id: "cruiser", size: 3, cells: [0, 1, 2].map((x) => ({ x, y: offsetY + 1 })) },
    { id: "patrol-a", size: 2, cells: [0, 1].map((x) => ({ x, y: offsetY + 2 })) },
    { id: "patrol-b", size: 2, cells: [0, 1].map((x) => ({ x, y: offsetY + 3 })) }
  ]);
}

function createTestState() {
  const state = createFleetState("s1", "r1", players);
  state.blockedCells = [];
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
    expect(snapshot.you.ships[0].cells).toHaveLength(FLEET_CONFIG.ships[0].size);
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
});
