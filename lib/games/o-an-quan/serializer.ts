import type { OAnQuanSnapshot, OAnQuanState } from "./types";

export function serializeOAnQuanState(state: OAnQuanState): OAnQuanSnapshot {
  return {
    ...state,
    board: state.board.map((pit) => ({ ...pit })),
    players: Object.fromEntries(Object.entries(state.players).map(([userId, player]) => [userId, { ...player }])),
    lastMove: state.lastMove ? { ...state.lastMove } : null,
    serverTime: Date.now()
  };
}
