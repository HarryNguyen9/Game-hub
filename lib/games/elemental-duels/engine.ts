import { getMonsterDefinition, getTowerDefinition } from "./balance";
import { towerDamage } from "./combat";
import { ELEMENTAL_CONFIG } from "./config";
import { cloneElementalMap } from "./maps";
import { distance, pointAtProgress } from "./pathing";
import { validateBuildTower } from "./validation";
import type {
  ElementKey,
  ElementalEvent,
  ElementalMonster,
  ElementalPlayerInput,
  ElementalPlayerState,
  ElementalState,
  ElementalTower,
  MonsterDefinition,
  Point,
  TowerDefinition,
  TowerTargetMode
} from "./types";

function id(prefix: string, tick = 0) {
  return `${prefix}-${tick}-${Math.random().toString(36).slice(2, 8)}`;
}

function event(state: ElementalState, item: Omit<ElementalEvent, "id" | "at">) {
  state.events = [
    {
      ...item,
      id: id("event", state.tick),
      at: Date.now()
    },
    ...state.events
  ].slice(0, ELEMENTAL_CONFIG.maxEventLog);
}

function asPlayer(member: ElementalPlayerInput, index: number): ElementalPlayerState {
  return {
    ...member,
    side: index === 0 ? "bottom" : "top",
    baseHp: ELEMENTAL_CONFIG.baseHp,
    gold: ELEMENTAL_CONFIG.startingGold,
    selectedSendElement: index === 0 ? "fire" : "ice",
    selectedMonsterType: "normal",
    towers: [],
    monsters: [],
    pendingSendQueue: []
  };
}

export function createElementalState(sessionId: string, roomId: string, players: ElementalPlayerInput[]): ElementalState {
  if (players.length !== 2) throw new Error("Elemental Duels needs exactly 2 active players.");
  const map = cloneElementalMap();
  if (map.variant === "dynamic-path") {
    map.alternatePaths = [JSON.parse(JSON.stringify(map.path)) as Point[], ...(map.alternatePaths || [])];
  }
  const startedAt = Date.now();
  return {
    sessionId,
    roomId,
    gameKey: "elemental-duels",
    status: "countdown",
    tick: 0,
    startedAt,
    endedAt: null,
    winnerUserId: null,
    endReason: null,
    mapId: map.id,
    currentPathIndex: 0,
    countdownEndsAt: startedAt + ELEMENTAL_CONFIG.countdownSeconds * 1000,
    nextWaveAt: startedAt + ELEMENTAL_CONFIG.countdownSeconds * 1000 + 900,
    nextIncomeAt: startedAt + ELEMENTAL_CONFIG.countdownSeconds * 1000 + ELEMENTAL_CONFIG.passiveIncomeMs,
    nextPathChangeAt: map.variant === "dynamic-path" ? startedAt + ELEMENTAL_CONFIG.countdownSeconds * 1000 + 30000 : null,
    players: Object.fromEntries(players.map((player, index) => [player.userId, asPlayer(player, index)])),
    map,
    events: []
  };
}

function opponents(state: ElementalState, userId: string) {
  return Object.values(state.players).filter((player) => player.userId !== userId);
}

function spawnMonster(player: ElementalPlayerState, definition: MonsterDefinition, element: ElementKey, state: ElementalState, weakened = false) {
  const point = pointAtProgress(state.map.path, 0);
  const monster: ElementalMonster = {
    id: id("monster", state.tick),
    monsterType: definition.id,
    element,
    hp: Math.max(8, definition.hp * (weakened ? 0.45 : 1)),
    maxHp: Math.max(8, definition.hp * (weakened ? 0.45 : 1)),
    pathProgress: 0,
    x: point.x,
    y: point.y,
    speed: definition.speed,
    reward: Math.max(1, Math.round(definition.reward * (weakened ? 0.45 : 1))),
    baseDamage: definition.baseDamage,
    statusEffects: []
  };
  player.monsters.push(monster);
  return monster;
}

function spawnNeutralWave(state: ElementalState) {
  const normal = getMonsterDefinition("normal");
  for (const player of Object.values(state.players)) {
    spawnMonster(player, normal, normal.element, state);
  }
  event(state, { type: "map", message: "A new wave entered both fields." });
}

function maybeChangeDynamicPath(state: ElementalState, now: number) {
  if (state.map.variant !== "dynamic-path" || !state.nextPathChangeAt || now < state.nextPathChangeAt) return;
  const paths = state.map.alternatePaths || [state.map.path];
  if (paths.length <= 1) return;
  state.currentPathIndex = (state.currentPathIndex + 1) % paths.length;
  state.map.path = JSON.parse(JSON.stringify(paths[state.currentPathIndex])) as Point[];
  state.nextPathChangeAt = now + 30000;
  event(state, { type: "map", message: "The monster path shifted." });
}

function effectiveMonsterSpeed(monster: ElementalMonster) {
  const stunned = monster.statusEffects.some((effect) => effect.type === "stun" && effect.remainingMs > 0);
  if (stunned) return 0;
  const slow = monster.statusEffects.find((effect) => effect.type === "slow" && effect.remainingMs > 0);
  return monster.speed * (slow ? Math.max(0.25, 1 - slow.value) : 1);
}

function applyStatusEffects(monster: ElementalMonster, deltaMs: number) {
  for (const effect of monster.statusEffects) {
    if (effect.type === "burn") {
      const damage = (effect.value * deltaMs) / 1000;
      monster.hp -= damage;
    }
    effect.remainingMs -= deltaMs;
  }
  monster.statusEffects = monster.statusEffects.filter((effect) => effect.remainingMs > 0);
}

function chooseTarget(tower: ElementalTower, monsters: ElementalMonster[]) {
  const inRange = monsters.filter((monster) => distance(tower, monster) <= getTowerRange(tower));
  if (inRange.length === 0) return null;
  if (tower.mode === "strongest") return inRange.sort((a, b) => b.hp - a.hp)[0];
  if (tower.mode === "weakest") return inRange.sort((a, b) => a.hp - b.hp)[0];
  if (tower.mode === "closest-to-base" || tower.mode === "first") return inRange.sort((a, b) => b.pathProgress - a.pathProgress)[0];
  return inRange[0];
}

function towerDef(tower: ElementalTower) {
  const definition = getTowerDefinition(tower.towerType);
  if (!definition) throw new Error(`Unknown tower type ${tower.towerType}`);
  return definition;
}

function getTowerRange(tower: ElementalTower) {
  const definition = towerDef(tower);
  return definition.range * (1 + (tower.level - 1) * 0.12);
}

function applyTowerHit(state: ElementalState, owner: ElementalPlayerState, tower: ElementalTower, target: ElementalMonster, definition: TowerDefinition) {
  const damage = towerDamage(definition, tower.level, target);
  target.hp -= damage;
  tower.targetMonsterId = target.id;

  if (definition.splashRadius) {
    for (const monster of owner.monsters) {
      if (monster.id !== target.id && distance(monster, target) <= definition.splashRadius) {
        monster.hp -= damage * 0.45;
      }
    }
  }

  if (definition.burnDps && definition.burnDurationMs) {
    target.statusEffects.push({ type: "burn", sourceTowerId: tower.id, remainingMs: definition.burnDurationMs, value: definition.burnDps });
  }

  if (definition.slowPercent && definition.slowDurationMs && !getMonsterDefinition(target.monsterType).slowImmune) {
    target.statusEffects.push({ type: "slow", sourceTowerId: tower.id, remainingMs: definition.slowDurationMs, value: definition.slowPercent });
    if (definition.stunDurationMs && target.statusEffects.filter((effect) => effect.type === "slow").length >= 3) {
      target.statusEffects.push({ type: "stun", sourceTowerId: tower.id, remainingMs: definition.stunDurationMs, value: 1 });
    }
  }

  if (definition.chainTargets && definition.chainTargets > 1) {
    const chainTargets = owner.monsters
      .filter((monster) => monster.id !== target.id && distance(monster, target) <= definition.range)
      .sort((a, b) => distance(a, target) - distance(b, target))
      .slice(0, definition.chainTargets - 1);
    chainTargets.forEach((monster, index) => {
      monster.hp -= damage * (definition.chainFalloff || 0.7) ** (index + 1);
    });
  }

  if (definition.knockback && Math.random() < (definition.knockbackChance || 0)) {
    target.pathProgress = Math.max(0, target.pathProgress - definition.knockback);
    Object.assign(target, pointAtProgress(state.map.path, target.pathProgress));
  }
}

function handleMonsterDeath(state: ElementalState, owner: ElementalPlayerState, monster: ElementalMonster) {
  owner.gold += monster.reward;
  const opponent = opponents(state, owner.userId)[0];
  if (opponent) {
    const sendDefinition = getMonsterDefinition(owner.selectedMonsterType);
    const cost = sendDefinition.sendCost || 0;
    const sendType = owner.gold >= cost ? owner.selectedMonsterType : "normal";
    if (cost > 0 && sendType === owner.selectedMonsterType) owner.gold -= cost;
    spawnMonster(opponent, getMonsterDefinition(sendType), owner.selectedSendElement, state);
    event(state, {
      type: "send",
      userId: owner.userId,
      targetUserId: opponent.userId,
      message: `${owner.displayName} sent a ${owner.selectedSendElement} ${sendType} to ${opponent.displayName}.`,
      x: monster.x,
      y: monster.y
    });
  }

  const definition = getMonsterDefinition(monster.monsterType);
  if (definition.splitOnDeath) {
    spawnMonster(owner, getMonsterDefinition("normal"), monster.element, state, true);
    spawnMonster(owner, getMonsterDefinition("normal"), monster.element, state, true);
  }
}

function stepPlayerField(state: ElementalState, player: ElementalPlayerState, deltaMs: number) {
  for (const monster of player.monsters) {
    applyStatusEffects(monster, deltaMs);
    monster.pathProgress += (effectiveMonsterSpeed(monster) * deltaMs) / 1000;
    Object.assign(monster, pointAtProgress(state.map.path, monster.pathProgress));
  }

  for (const tower of player.towers) {
    tower.cooldownRemaining = Math.max(0, tower.cooldownRemaining - deltaMs);
    if (tower.cooldownRemaining > 0) continue;
    const definition = towerDef(tower);
    const target = chooseTarget(tower, player.monsters);
    if (!target) {
      tower.targetMonsterId = null;
      continue;
    }
    applyTowerHit(state, player, tower, target, definition);
    tower.cooldownRemaining = definition.fireRateMs;
  }

  const dead = player.monsters.filter((monster) => monster.hp <= 0);
  for (const monster of dead) {
    handleMonsterDeath(state, player, monster);
  }

  const escaped = player.monsters.filter((monster) => monster.pathProgress >= 1);
  for (const monster of escaped) {
    player.baseHp -= monster.baseDamage;
    event(state, {
      type: "base_hit",
      userId: player.userId,
      message: `${player.displayName}'s base took ${monster.baseDamage} damage.`,
      x: monster.x,
      y: monster.y
    });
  }

  player.monsters = player.monsters.filter((monster) => monster.hp > 0 && monster.pathProgress < 1);
}

function maybeFinish(state: ElementalState) {
  const defeated = Object.values(state.players).filter((player) => player.baseHp <= 0);
  if (defeated.length === 0) return false;
  state.status = "ended";
  state.endedAt = Date.now();
  state.endReason = "base_destroyed";
  state.winnerUserId = opponents(state, defeated[0].userId)[0]?.userId || null;
  event(state, { type: "end", userId: state.winnerUserId || undefined, message: "A base fell. The duel is over." });
  return true;
}

export function stepElementalState(state: ElementalState, deltaMs: number) {
  if (state.status === "ended") return false;
  const now = Date.now();
  state.tick += 1;

  if (state.status === "countdown") {
    if (now >= state.countdownEndsAt) state.status = "playing";
    return false;
  }

  if (now >= state.nextIncomeAt) {
    for (const player of Object.values(state.players)) player.gold += ELEMENTAL_CONFIG.passiveIncome;
    state.nextIncomeAt = now + ELEMENTAL_CONFIG.passiveIncomeMs;
  }

  if (now >= state.nextWaveAt) {
    spawnNeutralWave(state);
    state.nextWaveAt = now + ELEMENTAL_CONFIG.neutralWaveMs;
  }
  maybeChangeDynamicPath(state, now);

  for (const player of Object.values(state.players)) {
    stepPlayerField(state, player, deltaMs);
  }

  return maybeFinish(state);
}

export function buildTower(state: ElementalState, userId: string, towerType: string, point: Point) {
  if (state.status !== "playing") return "Build after the countdown starts.";
  const player = state.players[userId];
  if (!player) return "Player is not active.";
  const definition = getTowerDefinition(towerType);
  if (!definition) return "Unknown tower.";
  const error = validateBuildTower(state, player, towerType, point);
  if (error) return error;
  const tile = state.map.buildTiles.find((buildTile) => distance(buildTile, point) <= ELEMENTAL_CONFIG.buildTileRadius);
  if (!tile) return "Choose a valid build tile.";
  player.gold -= definition.cost;
  const tower: ElementalTower = {
    id: id("tower", state.tick),
    towerType,
    element: definition.element,
    x: tile.x,
    y: tile.y,
    level: 1,
    targetMonsterId: null,
    cooldownRemaining: 0,
    mode: "first"
  };
  player.towers.push(tower);
  event(state, { type: "build", userId, message: `${player.displayName} built ${definition.label}.`, x: tower.x, y: tower.y });
  return null;
}

export function upgradeTower(state: ElementalState, userId: string, towerId: string) {
  if (state.status !== "playing") return "Upgrade after the countdown starts.";
  const player = state.players[userId];
  const tower = player?.towers.find((item) => item.id === towerId);
  if (!player || !tower) return "Tower not found.";
  const definition = getTowerDefinition(tower.towerType);
  if (!definition) return "Unknown tower.";
  if (tower.level >= 3) return "Tower is already max level.";
  const cost = definition.upgradeCost[tower.level - 1] || 0;
  if (player.gold < cost) return "Not enough gold.";
  player.gold -= cost;
  tower.level += 1;
  event(state, { type: "upgrade", userId, message: `${player.displayName} upgraded ${definition.label}.`, x: tower.x, y: tower.y });
  return null;
}

export function sellTower(state: ElementalState, userId: string, towerId: string) {
  const player = state.players[userId];
  if (!player) return "Player is not active.";
  const towerIndex = player.towers.findIndex((item) => item.id === towerId);
  if (towerIndex < 0) return "Tower not found.";
  const [tower] = player.towers.splice(towerIndex, 1);
  const definition = getTowerDefinition(tower.towerType);
  player.gold += (definition?.sellRefund || 15) + (tower.level - 1) * 18;
  event(state, { type: "sell", userId, message: `${player.displayName} sold a tower.`, x: tower.x, y: tower.y });
  return null;
}

export function setTowerTargetMode(state: ElementalState, userId: string, towerId: string, mode: TowerTargetMode) {
  const player = state.players[userId];
  const tower = player?.towers.find((item) => item.id === towerId);
  if (!tower) return "Tower not found.";
  tower.mode = mode;
  return null;
}

export function selectSendElement(state: ElementalState, userId: string, element: ElementKey) {
  const player = state.players[userId];
  if (!player) return "Player is not active.";
  player.selectedSendElement = element;
  return null;
}

export function selectMonsterType(state: ElementalState, userId: string, monsterType: string) {
  const player = state.players[userId];
  if (!player) return "Player is not active.";
  if (!getMonsterDefinition(monsterType)) return "Unknown monster type.";
  player.selectedMonsterType = monsterType;
  return null;
}
