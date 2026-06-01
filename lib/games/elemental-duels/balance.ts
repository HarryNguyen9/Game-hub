import elementsData from "./data/elements.json";
import mapsData from "./data/maps.json";
import monstersData from "./data/monsters.json";
import towersData from "./data/towers.json";
import type { ElementDefinition, ElementalMapDefinition, MonsterDefinition, TowerDefinition } from "./types";

export const ELEMENT_DEFINITIONS = elementsData as ElementDefinition[];
export const TOWER_DEFINITIONS = towersData as TowerDefinition[];
export const MONSTER_DEFINITIONS = monstersData as MonsterDefinition[];
export const MAP_DEFINITIONS = mapsData as ElementalMapDefinition[];

export function getTowerDefinition(towerType: string) {
  return TOWER_DEFINITIONS.find((tower) => tower.id === towerType) || null;
}

export function getMonsterDefinition(monsterType: string) {
  return MONSTER_DEFINITIONS.find((monster) => monster.id === monsterType) || MONSTER_DEFINITIONS[0];
}

export function getElementDefinition(element: string) {
  return ELEMENT_DEFINITIONS.find((item) => item.id === element) || null;
}

export function randomElementalMap() {
  return MAP_DEFINITIONS[Math.floor(Math.random() * MAP_DEFINITIONS.length)] || MAP_DEFINITIONS[0];
}
