import { randomElementalMap } from "./balance";
import type { ElementalMapDefinition } from "./types";

export function cloneElementalMap(map: ElementalMapDefinition = randomElementalMap()): ElementalMapDefinition {
  return JSON.parse(JSON.stringify(map)) as ElementalMapDefinition;
}
