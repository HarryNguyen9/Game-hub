import { getElementDefinition } from "./balance";
import type { ElementKey, ElementalMonster, TowerDefinition } from "./types";

export function getElementAdvantage(attackerElement: ElementKey, defenderElement: ElementKey) {
  const attacker = getElementDefinition(attackerElement);
  if (attacker?.strongAgainst === defenderElement) return "advantage";
  if (attacker?.weakAgainst === defenderElement) return "disadvantage";
  return "neutral";
}

export function getDamageMultiplier(attackerElement: ElementKey, defenderElement: ElementKey) {
  const advantage = getElementAdvantage(attackerElement, defenderElement);
  if (advantage === "advantage") return 1.5;
  if (advantage === "disadvantage") return 0.5;
  return 1;
}

export function towerDamage(tower: TowerDefinition, level: number, monster: ElementalMonster) {
  const scale = tower.levelScale[Math.max(0, Math.min(level - 1, tower.levelScale.length - 1))] || 1;
  return tower.damage * scale * getDamageMultiplier(tower.element, monster.element);
}
