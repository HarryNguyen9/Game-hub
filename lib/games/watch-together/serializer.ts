import type { WatchTogetherSnapshot, WatchTogetherState } from "./types";

export function serializeWatchTogetherState(state: WatchTogetherState): WatchTogetherSnapshot {
  return {
    ...state,
    players: Object.fromEntries(Object.entries(state.players).map(([k, v]) => [k, { ...v }])),
    serverTime: Date.now()
  };
}
