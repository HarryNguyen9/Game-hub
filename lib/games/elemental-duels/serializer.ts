import { ELEMENT_DEFINITIONS, MONSTER_DEFINITIONS, TOWER_DEFINITIONS } from "./balance";
import type { ElementalSnapshot, ElementalState } from "./types";

export function serializeElementalState(state: ElementalState): ElementalSnapshot {
  return {
    ...state,
    serverTime: Date.now(),
    catalog: {
      elements: ELEMENT_DEFINITIONS,
      towers: TOWER_DEFINITIONS,
      monsters: MONSTER_DEFINITIONS
    }
  };
}
