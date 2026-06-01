import { ELEMENTAL_CONFIG } from "./config";
import { getTowerDefinition } from "./balance";
import { distance, nearestPointDistance } from "./pathing";
import type { ElementalPlayerState, ElementalState, Point } from "./types";

export function validateBuildTower(state: ElementalState, player: ElementalPlayerState, towerType: string, point: Point) {
  const tower = getTowerDefinition(towerType);
  if (!tower) return "Unknown tower.";
  if (player.gold < tower.cost) return "Not enough gold.";
  const buildTile = state.map.buildTiles.find((tile) => distance(tile, point) <= ELEMENTAL_CONFIG.buildTileRadius);
  if (!buildTile) return "Choose a valid build tile.";
  if (state.map.obstacles.some((obstacle) => !obstacle.cleared && distance(obstacle, buildTile) <= ELEMENTAL_CONFIG.buildTileRadius)) return "Clear this obstacle before building.";
  if (nearestPointDistance(buildTile, state.map.path) <= ELEMENTAL_CONFIG.pathHitRadius) return "Cannot build on the monster path.";
  if (player.towers.some((tower) => distance(tower, buildTile) <= ELEMENTAL_CONFIG.buildTileRadius)) return "A tower already occupies this tile.";
  return null;
}
