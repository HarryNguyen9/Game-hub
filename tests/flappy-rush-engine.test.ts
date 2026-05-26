import { describe, expect, it } from "vitest";
import { applyFlap, createFlappyState, stepFlappyState } from "@/lib/games/flappy-rush/engine";
import { FLAPPY_CONFIG } from "@/lib/games/flappy-rush/config";

describe("flappy rush engine", () => {
  it("applies only flap input to server-owned velocity", () => {
    const state = createFlappyState("session-1", "room-1", [{ userId: "u1", username: "a", displayName: "A" }]);
    state.status = "playing";

    expect(applyFlap(state, "u1", "input-1")).toBe(true);
    expect(state.players.u1.velocity).toBe(FLAPPY_CONFIG.flapVelocity);
    expect(applyFlap(state, "u1", "input-1")).toBe(false);
  });

  it("marks a player dead when hitting world bounds", () => {
    const state = createFlappyState("session-1", "room-1", [{ userId: "u1", username: "a", displayName: "A" }]);
    state.status = "playing";
    state.players.u1.y = FLAPPY_CONFIG.worldHeight - 4;
    state.players.u1.velocity = FLAPPY_CONFIG.maxFallVelocity;

    const dead = stepFlappyState(state);
    expect(dead.map((player) => player.userId)).toEqual(["u1"]);
    expect(state.status).toBe("ended");
    expect(state.winnerUserId).toBe("u1");
  });
});
