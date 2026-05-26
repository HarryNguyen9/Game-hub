import type { ChessSnapshot, ChessState } from "./types";

export function serializeChessState(state: ChessState): ChessSnapshot {
  return {
    ...state,
    players: Object.fromEntries(Object.entries(state.players).map(([userId, player]) => [userId, { ...player }])),
    moveHistory: state.moveHistory.map((move) => ({ ...move })),
    serverTime: Date.now()
  };
}
