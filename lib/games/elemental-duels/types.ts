export type ElementKey = "fire" | "ice" | "lightning" | "earth";
export type ElementalStatus = "countdown" | "playing" | "ended";
export type TowerTargetMode = "first" | "strongest" | "weakest" | "closest-to-base";
export type ElementalSide = "top" | "bottom";

export type Point = {
  x: number;
  y: number;
};

export type ElementDefinition = {
  id: ElementKey;
  label: string;
  color: string;
  strongAgainst: ElementKey;
  weakAgainst: ElementKey;
};

export type ElementalAssetDefinition = {
  textureKey: string;
  path: string;
  type: "image";
};

export type TowerDefinition = {
  id: string;
  label: string;
  element: ElementKey;
  cost: number;
  sellRefund: number;
  range: number;
  damage: number;
  fireRateMs: number;
  splashRadius?: number;
  burnDps?: number;
  burnDurationMs?: number;
  slowPercent?: number;
  slowDurationMs?: number;
  stunDurationMs?: number;
  chainTargets?: number;
  chainFalloff?: number;
  knockback?: number;
  knockbackChance?: number;
  upgradeCost: number[];
  levelScale: number[];
  asset?: ElementalAssetDefinition;
};

export type MonsterDefinition = {
  id: string;
  label: string;
  element: ElementKey;
  hp: number;
  speed: number;
  reward: number;
  baseDamage: number;
  sendCost: number;
  slowImmune?: boolean;
  splitOnDeath?: boolean;
  asset?: ElementalAssetDefinition;
  assetByElement?: Partial<Record<ElementKey, ElementalAssetDefinition>>;
};

export type MapBuildTile = Point & {
  affinity?: ElementKey;
};

export type MapObstacle = Point & {
  id: string;
  hp: number;
  clearCost: number;
  cleared?: boolean;
};

export type MapSpecialTile = Point & {
  type: "affinity" | "portal";
  element?: ElementKey;
};

export type ElementalMapDefinition = {
  id: string;
  label: string;
  variant: "classic" | "portal" | "buff-tiles" | "obstacles" | "dynamic-path";
  path: Point[];
  alternatePaths?: Point[][];
  buildTiles: MapBuildTile[];
  specialTiles: MapSpecialTile[];
  obstacles: MapObstacle[];
};

export type ElementalTower = {
  id: string;
  towerType: string;
  element: ElementKey;
  x: number;
  y: number;
  level: number;
  targetMonsterId: string | null;
  cooldownRemaining: number;
  mode: TowerTargetMode;
};

export type ElementalStatusEffect = {
  type: "burn" | "slow" | "stun";
  sourceTowerId: string;
  remainingMs: number;
  value: number;
  tickMs?: number;
};

export type ElementalMonster = {
  id: string;
  monsterType: string;
  element: ElementKey;
  hp: number;
  maxHp: number;
  pathProgress: number;
  x: number;
  y: number;
  speed: number;
  reward: number;
  baseDamage: number;
  statusEffects: ElementalStatusEffect[];
};

export type ElementalPlayerState = {
  userId: string;
  username: string;
  displayName: string;
  side: ElementalSide;
  baseHp: number;
  gold: number;
  selectedSendElement: ElementKey;
  selectedMonsterType: string;
  towers: ElementalTower[];
  monsters: ElementalMonster[];
  pendingSendQueue: string[];
};

export type ElementalEvent = {
  id: string;
  type: "build" | "upgrade" | "sell" | "kill" | "send" | "base_hit" | "end" | "map" | "error";
  userId?: string;
  targetUserId?: string;
  message: string;
  at: number;
  x?: number;
  y?: number;
};

export type ElementalVisualEvent = {
  id: string;
  type: "tower_attack" | "monster_death" | "base_hit";
  at: number;
  sourcePlayerId: string;
  towerId?: string;
  targetMonsterId?: string;
  towerElement?: ElementKey;
  projectileType?: ElementKey;
  from: Point;
  to: Point;
  hitEffects: ElementalStatusEffect["type"][];
};

export type ElementalState = {
  sessionId: string;
  roomId: string;
  gameKey: "elemental-duels";
  status: ElementalStatus;
  tick: number;
  startedAt: number;
  endedAt: number | null;
  winnerUserId: string | null;
  endReason: string | null;
  mapId: string;
  currentPathIndex: number;
  countdownEndsAt: number;
  nextWaveAt: number;
  nextIncomeAt: number;
  nextPathChangeAt: number | null;
  players: Record<string, ElementalPlayerState>;
  map: ElementalMapDefinition;
  events: ElementalEvent[];
  visualEvents: ElementalVisualEvent[];
};

export type ElementalSnapshot = ElementalState & {
  serverTime: number;
  catalog: {
    elements: ElementDefinition[];
    towers: TowerDefinition[];
    monsters: MonsterDefinition[];
  };
};

export type ElementalPlayerInput = {
  userId: string;
  username: string;
  displayName: string;
};
