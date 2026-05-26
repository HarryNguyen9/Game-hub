import { describe, expect, it } from "vitest";
import { applyOAnQuanMove, createOAnQuanState, timeoutOAnQuanTurn } from "@/lib/games/o-an-quan/engine";

const players = [
  { userId: "a", username: "a", displayName: "A" },
  { userId: "b", username: "b", displayName: "B" }
];

describe("o an quan engine", () => {
  it("initializes the traditional simplified board", () => {
    const state = createOAnQuanState("s1", "r1", players);
    expect(state.board).toHaveLength(12);
    expect(state.board.filter((pit) => pit.type === "dan" && pit.smallStones === 5)).toHaveLength(10);
    expect(state.board[0].bigStones).toBe(1);
    expect(state.board[6].bigStones).toBe(1);
    expect(["a", "b"]).toContain(state.currentTurnUserId);
    expect(state.turnDurationSeconds).toBe(30);
  });

  it("rejects moves outside the current player side", () => {
    const state = createOAnQuanState("s1", "r1", players);
    const current = state.currentTurnUserId!;
    const invalidPit = state.players[current].side === "bottom" ? 7 : 1;
    expect(applyOAnQuanMove(state, current, invalidPit, "clockwise")).toBe("Choose one of your five dân pits.");
  });

  it("moves and changes turn", () => {
    const state = createOAnQuanState("s1", "r1", players);
    const current = state.currentTurnUserId!;
    const pit = state.players[current].side === "bottom" ? 1 : 7;
    expect(applyOAnQuanMove(state, current, pit, "clockwise")).toBeNull();
    expect(state.currentTurnUserId).not.toBe(current);
  });

  it("times out and changes turn", () => {
    const state = createOAnQuanState("s1", "r1", players);
    const current = state.currentTurnUserId!;
    expect(timeoutOAnQuanTurn(state)).toBe(true);
    expect(state.currentTurnUserId).not.toBe(current);
    expect(state.lastMove?.reason).toBe("timeout");
  });
});
