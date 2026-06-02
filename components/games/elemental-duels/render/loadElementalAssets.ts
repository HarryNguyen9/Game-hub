import type { ElementKey } from "@/lib/games/elemental-duels/types";

type AssetEntry = {
  textureKey: string;
  path: string;
};

type AssetScene = {
  load: {
    image: (textureKey: string, path: string) => void;
  };
  textures: {
    exists: (textureKey: string) => boolean;
  };
};

export const ELEMENTAL_MONSTER_ASSETS: AssetEntry[] = [
  { textureKey: "monster-fire-normal", path: "/games/elemental-duels/monsters/fire-normal.png" },
  { textureKey: "monster-ice-normal", path: "/games/elemental-duels/monsters/ice-normal.png" },
  { textureKey: "monster-lightning-normal", path: "/games/elemental-duels/monsters/lightning-normal.png" },
  { textureKey: "monster-earth-normal", path: "/games/elemental-duels/monsters/earth-normal.png" },
  { textureKey: "monster-fire-fire-runner", path: "/games/elemental-duels/monsters/fire-runner.png" },
  { textureKey: "monster-ice-ice-armored", path: "/games/elemental-duels/monsters/ice-armored.png" },
  { textureKey: "monster-lightning-lightning-splitter", path: "/games/elemental-duels/monsters/lightning-splitter.png" },
  { textureKey: "monster-lightning-splitter-small", path: "/games/elemental-duels/monsters/lightning-splitter-small.png" },
  { textureKey: "monster-earth-earth-giant", path: "/games/elemental-duels/monsters/earth-giant.png" }
];

export const ELEMENTAL_TOWER_ASSETS: Record<ElementKey, AssetEntry> = {
  fire: { textureKey: "tower-fire", path: "/games/elemental-duels/towers/fire-tower.png" },
  ice: { textureKey: "tower-ice", path: "/games/elemental-duels/towers/ice-tower.png" },
  lightning: { textureKey: "tower-lightning", path: "/games/elemental-duels/towers/lightning-tower.png" },
  earth: { textureKey: "tower-earth", path: "/games/elemental-duels/towers/earth-tower.png" }
};

export const ELEMENTAL_PROJECTILE_ASSETS: Record<ElementKey, AssetEntry> = {
  fire: { textureKey: "projectile-fireball", path: "/games/elemental-duels/projectiles/fireball.png" },
  ice: { textureKey: "projectile-ice-shard", path: "/games/elemental-duels/projectiles/ice-shard.png" },
  lightning: { textureKey: "projectile-lightning-orb", path: "/games/elemental-duels/projectiles/lightning-orb.png" },
  earth: { textureKey: "projectile-rock", path: "/games/elemental-duels/projectiles/rock.png" }
};

export const ELEMENTAL_EFFECT_ASSETS: AssetEntry[] = [
  { textureKey: "effect-burn", path: "/games/elemental-duels/effects/burn.png" },
  { textureKey: "effect-slow", path: "/games/elemental-duels/effects/slow.png" },
  { textureKey: "effect-stun", path: "/games/elemental-duels/effects/stun.png" },
  { textureKey: "effect-hit-pop", path: "/games/elemental-duels/effects/hit-pop.png" }
];

export function towerTextureKey(element: ElementKey) {
  return ELEMENTAL_TOWER_ASSETS[element].textureKey;
}

export function projectileTextureKey(element: ElementKey) {
  return ELEMENTAL_PROJECTILE_ASSETS[element].textureKey;
}

export function loadElementalAssets(scene: AssetScene) {
  const assets = [
    ...ELEMENTAL_MONSTER_ASSETS,
    ...Object.values(ELEMENTAL_TOWER_ASSETS),
    ...Object.values(ELEMENTAL_PROJECTILE_ASSETS),
    ...ELEMENTAL_EFFECT_ASSETS
  ];

  for (const asset of assets) {
    if (!scene.textures.exists(asset.textureKey)) {
      scene.load.image(asset.textureKey, asset.path);
    }
  }
}
