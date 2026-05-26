import { describe, expect, it } from "vitest";
import { applyChessMove, createChessState, timeoutChessTurn } from "@/lib/games/chess/engine";

const players = [
  { userId: "a", username: "a", displayName: "A" },
  { userId: "b", username: "b", displayName: "B" }
];

function userByColor(state: ReturnType<typeof createChessState>, color: "white" | "black") {
  return Object.values(state.players).find((player) => player.color === color)!.userId;
}

describe("chess engine", () => {
  it("initializes two players and starts white's 30s turn", () => {
    const state = createChessState("s1", "r1", players);
    expect(Object.values(state.players)).toHaveLength(2);
    expect(state.turn).toBe("w");
    expect(state.players[state.currentTurnUserId!].color).toBe("white");
    expect(state.turnDurationSeconds).toBe(30);
  });

  it("rejects black moving before white", () => {
    const state = createChessState("s1", "r1", players);
    const black = userByColor(state, "black");
    expect(applyChessMove(state, black, "e7", "e5")).toBe("It is not your turn.");
  });

  it("applies a legal move and switches turn", () => {
    const state = createChessState("s1", "r1", players);
    const white = userByColor(state, "white");
    const black = userByColor(state, "black");
    expect(applyChessMove(state, white, "e2", "e4")).toBeNull();
    expect(state.currentTurnUserId).toBe(black);
    expect(state.moveHistory.at(-1)?.san).toBe("e4");
  });

  it("ends the game when the current player times out", () => {
    const state = createChessState("s1", "r1", players);
    const loser = state.currentTurnUserId!;
    const winner = Object.keys(state.players).find((userId) => userId !== loser)!;
    expect(timeoutChessTurn(state)).toBe(true);
    expect(state.status).toBe("ended");
    expect(state.winnerUserId).toBe(winner);
    expect(state.endReason).toBe("timeout");
  });
});
