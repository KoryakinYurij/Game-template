import { nanoid } from 'nanoid';
import { VISIBILITY_RADIUS, MAX_LOG_ENTRIES, ENEMY_DROP_CHANCE, BOSS_DROP_CHANCE, POTION_HEAL_RATIO } from '../../domain/config';
import { DungeonFloor, GroundItem } from '../../domain/entities/dungeon';
import { EnemyEntity } from '../../domain/entities/enemy';
import { INVENTORY_CAPACITY, PlayerCharacter } from '../../domain/entities/character';
import { RNG } from '../../domain/services/rng';
import { canUseAbility, executeAbility } from '../../domain/services/abilityService';
import { resolveAttack } from '../../domain/services/combatService';
import { generateFloor } from '../../domain/services/dungeonGenerator';
import { applyXpGain } from '../../domain/services/experienceService';
import { generateItem } from '../../domain/services/lootService';
import { RunSummary } from '../../domain/services/metaProgressionService';
import { applyDamage, applyHeal, computeEffectiveStats, spendMana } from '../../domain/services/statsService';
import { updateVisibility } from '../../domain/services/visibilityService';
import { CLASS_DEFINITIONS } from '../../domain/data/classDefinitions';
import { LogEntry, LogKind, Position, TileType, chebyshevDistance, samePosition } from '../../domain/types';

export type GameStatus = 'idle' | 'playing' | 'dead';

type PushLog = (text: string, kind?: LogKind) => void;

function handleEnemyDeath(
  player: PlayerCharacter,
  enemy: EnemyEntity,
  floor: DungeonFloor,
  rng: RNG,
  pushLog: PushLog,
): { player: PlayerCharacter; floor: DungeonFloor } {
  pushLog(`${enemy.icon} ${enemy.name} повержен!`, 'success');
  const xpResult = applyXpGain(player, enemy.xpReward);
  let newPlayer = xpResult.player;
  if (xpResult.levelsGained > 0) pushLog(`✨ Новый уровень! Теперь вы ${newPlayer.level} уровня.`, 'level');
  newPlayer = { ...newPlayer, gold: newPlayer.gold + enemy.goldReward, kills: newPlayer.kills + 1 };

  let groundItems = floor.groundItems;
  const luck = computeEffectiveStats(newPlayer.baseStats, newPlayer.equipment).luck;
  const dropChance = enemy.isBoss ? BOSS_DROP_CHANCE : ENEMY_DROP_CHANCE;
  if (rng.chance(dropChance)) {
    const item = generateItem(floor.level, luck, rng);
    groundItems = [...groundItems, { id: nanoid(8), position: enemy.position, kind: 'item', item }];
    pushLog(`💎 Выпал предмет: ${item.name}`, 'loot');
  }
  const enemies = floor.enemies.filter((e) => e.id !== enemy.id);
  return { player: newPlayer, floor: { ...floor, enemies, groundItems } };
}

function handlePickup(
  player: PlayerCharacter,
  groundItem: GroundItem,
  pushLog: PushLog,
): { player: PlayerCharacter; goldGained: number } {
  if (groundItem.kind === 'gold') {
    pushLog(`💰 Найдено золото: +${groundItem.amount}`, 'loot');
    return { player: { ...player, gold: player.gold + (groundItem.amount ?? 0) }, goldGained: groundItem.amount ?? 0 };
  }
  if (groundItem.kind === 'potion') {
    pushLog('🧪 Найдено зелье лечения.', 'loot');
    return { player: { ...player, potions: player.potions + 1 }, goldGained: 0 };
  }
  if (player.inventory.length < INVENTORY_CAPACITY && groundItem.item) {
    pushLog(`🎒 Подобрано: ${groundItem.item.name}`, 'loot');
    return { player: { ...player, inventory: [...player.inventory, groundItem.item] }, goldGained: 0 };
  }
  if (groundItem.item) {
    pushLog(`🎒 Инвентарь полон. ${groundItem.item.name} продан за ${groundItem.item.goldValue}з.`, 'loot');
    return { player: { ...player, gold: player.gold + groundItem.item.goldValue }, goldGained: groundItem.item.goldValue };
  }
  return { player, goldGained: 0 };
}

function tickAbilityCooldown(player: PlayerCharacter): PlayerCharacter {
  return { ...player, ability: { cooldownRemaining: Math.max(0, player.ability.cooldownRemaining - 1) } };
}

function runEnemyPhase(
  player: PlayerCharacter,
  floor: DungeonFloor,
  rng: RNG,
  pushLog: PushLog,
): { player: PlayerCharacter; floor: DungeonFloor } {
  const occupied = new Set(floor.enemies.map((e) => `${e.position.x},${e.position.y}`));
  let currentPlayer = player;
  const updatedEnemies: EnemyEntity[] = [];

  for (const original of floor.enemies) {
    const enemy = { ...original, position: { ...original.position } };
    const dist = chebyshevDistance(enemy.position, currentPlayer.position);

    if (dist <= 1) {
      const effective = computeEffectiveStats(currentPlayer.baseStats, currentPlayer.equipment);
      const result = resolveAttack(enemy.stats, effective, rng);
      currentPlayer = { ...currentPlayer, baseStats: applyDamage(currentPlayer.baseStats, currentPlayer.equipment, result.damage) };
      pushLog(`${enemy.icon} ${enemy.name} бьёт вас на ${result.damage}${result.isCrit ? ' (КРИТ!)' : ''}`, 'danger');
    } else if (dist <= enemy.aggroRadius) {
      const dx = Math.sign(currentPlayer.position.x - enemy.position.x);
      const dy = Math.sign(currentPlayer.position.y - enemy.position.y);
      const candidates: Position[] = [];
      if (dx !== 0 || dy !== 0) {
        candidates.push({ x: enemy.position.x + dx, y: enemy.position.y + dy });
        if (dx !== 0) candidates.push({ x: enemy.position.x + dx, y: enemy.position.y });
        if (dy !== 0) candidates.push({ x: enemy.position.x, y: enemy.position.y + dy });
      }
      occupied.delete(`${enemy.position.x},${enemy.position.y}`);
      for (const candidate of candidates) {
        const key = `${candidate.x},${candidate.y}`;
        const tile = floor.tiles[candidate.y]?.[candidate.x];
        if (!tile || tile.type === TileType.WALL) continue;
        if (occupied.has(key)) continue;
        if (samePosition(candidate, currentPlayer.position)) continue;
        enemy.position = candidate;
        break;
      }
      occupied.add(`${enemy.position.x},${enemy.position.y}`);
    }
    updatedEnemies.push(enemy);
  }

  return { player: currentPlayer, floor: { ...floor, enemies: updatedEnemies } };
}

export interface FinalizedTurn {
  player: PlayerCharacter;
  floor: DungeonFloor;
  turn: number;
  kills: number;
  bossKills: number;
  goldCollected: number;
  status: GameStatus;
  lastEssenceEarned: number;
  log: LogEntry[];
}

function finalizeTurn(
  player: PlayerCharacter,
  floor: DungeonFloor,
  turn: number,
  kills: number,
  bossKills: number,
  goldCollected: number,
  newLogs: LogEntry[],
  prevLog: LogEntry[],
  prevLastEssence: number,
  applyRunResult: (summary: RunSummary) => number,
): FinalizedTurn {
  const effective = computeEffectiveStats(player.baseStats, player.equipment);
  let status: GameStatus = 'playing';
  let lastEssenceEarned = prevLastEssence;

  if (effective.hp <= 0) {
    status = 'dead';
    newLogs.push({ id: nanoid(6), turn, text: '💀 Вы погибли... Экспедиция окончена.', kind: 'danger' });
    const summary: RunSummary = { floorReached: floor.level, kills, bossKills, goldCollected, survived: false };
    lastEssenceEarned = applyRunResult(summary);
  }

  return {
    player,
    floor,
    turn,
    kills,
    bossKills,
    goldCollected,
    status,
    lastEssenceEarned,
    log: [...prevLog, ...newLogs].slice(-MAX_LOG_ENTRIES),
  };
}

export interface TurnState {
  player: PlayerCharacter;
  floor: DungeonFloor;
  turn: number;
  kills: number;
  bossKills: number;
  goldCollected: number;
  log: LogEntry[];
  rng: RNG;
  status: GameStatus;
  lastEssenceEarned: number;
}

export function performMove(
  dx: number,
  dy: number,
  state: TurnState,
  applyRunResult: (summary: RunSummary) => number
): TurnState {
  if (state.status !== 'playing' || !state.player || !state.floor) return state;
  const rng = state.rng;
  let player = state.player;
  let floor = state.floor;
  let turn = state.turn;
  let kills = state.kills;
  let bossKills = state.bossKills;
  let goldCollected = state.goldCollected;
  const logs: LogEntry[] = [];
  const pushLog: PushLog = (text, kind = 'info') => logs.push({ id: nanoid(6), turn, text, kind });

  const target: Position = { x: player.position.x + dx, y: player.position.y + dy };
  if (target.x < 0 || target.y < 0 || target.x >= floor.width || target.y >= floor.height) return state;
  const targetTile = floor.tiles[target.y][target.x];
  if (targetTile.type === TileType.WALL) return state;

  const enemyAtTarget = floor.enemies.find((e) => samePosition(e.position, target));
  let descending = false;

  if (enemyAtTarget) {
    const effective = computeEffectiveStats(player.baseStats, player.equipment);
    const result = resolveAttack(effective, enemyAtTarget.stats, rng);
    pushLog(`Вы атакуете ${enemyAtTarget.name}: ${result.damage} урона${result.isCrit ? ' (КРИТ!)' : ''}`, 'combat');
    const newHp = Math.max(0, enemyAtTarget.stats.hp - result.damage);
    if (newHp <= 0) {
      const outcome = handleEnemyDeath(player, enemyAtTarget, floor, rng, pushLog);
      player = outcome.player;
      floor = outcome.floor;
      kills += 1;
      if (enemyAtTarget.isBoss) bossKills += 1;
      goldCollected += enemyAtTarget.goldReward;
    } else {
      floor = {
        ...floor,
        enemies: floor.enemies.map((e) => (e.id === enemyAtTarget.id ? { ...e, stats: { ...e.stats, hp: newHp } } : e)),
      };
    }
  } else {
    player = { ...player, position: target };
    const groundItem = floor.groundItems.find((g) => samePosition(g.position, target));
    if (groundItem) {
      const pickup = handlePickup(player, groundItem, pushLog);
      player = pickup.player;
      goldCollected += pickup.goldGained;
      floor = { ...floor, groundItems: floor.groundItems.filter((g) => g.id !== groundItem.id) };
    }
    if (targetTile.type === TileType.STAIRS) descending = true;
  }

  turn += 1;
  player = tickAbilityCooldown(player);

  if (descending) {
    const nextLevel = floor.level + 1;
    const luck = computeEffectiveStats(player.baseStats, player.equipment).luck;
    const newFloor = generateFloor(nextLevel, luck, rng);
    player = { ...player, position: newFloor.playerStart };
    newFloor.tiles = updateVisibility(newFloor.tiles, player.position, VISIBILITY_RADIUS);
    pushLog(`⬇️ Вы спускаетесь на этаж ${nextLevel}.`, 'success');
    return {
      ...state,
      player,
      floor: newFloor,
      turn,
      kills,
      bossKills,
      goldCollected,
      log: [...state.log, ...logs].slice(-MAX_LOG_ENTRIES),
    };
  }

  const enemyPhase = runEnemyPhase(player, floor, rng, pushLog);
  const finalFloor = { ...enemyPhase.floor, tiles: updateVisibility(enemyPhase.floor.tiles, enemyPhase.player.position, VISIBILITY_RADIUS) };

  const finalized = finalizeTurn(
    enemyPhase.player, finalFloor, turn, kills, bossKills, goldCollected, logs, state.log, state.lastEssenceEarned, applyRunResult
  );
  return { ...state, ...finalized };
}

export function performAbility(
  state: TurnState,
  applyRunResult: (summary: RunSummary) => number
): TurnState {
  if (state.status !== 'playing' || !state.player || !state.floor) return state;
  const rng = state.rng;
  let player = state.player;
  let floor = state.floor;
  let turn = state.turn;
  let kills = state.kills;
  let bossKills = state.bossKills;
  let goldCollected = state.goldCollected;
  const logs: LogEntry[] = [];
  const pushLog: PushLog = (text, kind = 'info') => logs.push({ id: nanoid(6), turn, text, kind });

  const effective = computeEffectiveStats(player.baseStats, player.equipment);
  const check = canUseAbility(effective, player.ability.cooldownRemaining, player.classType);
  if (!check.ok) {
    pushLog(check.reason ?? 'Способность недоступна', 'info');
    return { ...state, log: [...state.log, ...logs].slice(-MAX_LOG_ENTRIES) };
  }

  const outcome = executeAbility(player.classType, effective, player.position, floor.enemies, rng);
  pushLog(outcome.message, 'combat');
  const baseStats = spendMana(player.baseStats, player.equipment, outcome.manaCost);
  player = { ...player, baseStats };

  let enemies = floor.enemies;
  for (const hit of outcome.hits) {
    enemies = enemies.map((e) => (e.id === hit.enemyId ? { ...e, stats: { ...e.stats, hp: Math.max(0, e.stats.hp - hit.damage) } } : e));
  }
  const dead = enemies.filter((e) => e.stats.hp <= 0);
  enemies = enemies.filter((e) => e.stats.hp > 0);
  floor = { ...floor, enemies };

  for (const enemy of dead) {
    const outcomeDeath = handleEnemyDeath(player, enemy, floor, rng, pushLog);
    player = outcomeDeath.player;
    floor = outcomeDeath.floor;
    kills += 1;
    if (enemy.isBoss) bossKills += 1;
    goldCollected += enemy.goldReward;
  }

  if (outcome.selfHeal > 0) {
    player = { ...player, baseStats: applyHeal(player.baseStats, player.equipment, outcome.selfHeal) };
    pushLog(`💚 Восстановлено ${outcome.selfHeal} HP`, 'success');
  }

  player = { ...player, ability: { cooldownRemaining: CLASS_DEFINITIONS[player.classType].ability.cooldown } };
  turn += 1;

  const enemyPhase = runEnemyPhase(player, floor, rng, pushLog);
  const finalFloor = { ...enemyPhase.floor, tiles: updateVisibility(enemyPhase.floor.tiles, enemyPhase.player.position, VISIBILITY_RADIUS) };

  const finalized = finalizeTurn(
    enemyPhase.player, finalFloor, turn, kills, bossKills, goldCollected, logs, state.log, state.lastEssenceEarned, applyRunResult
  );
  return { ...state, ...finalized };
}

export function performPotion(
  state: TurnState,
  applyRunResult: (summary: RunSummary) => number
): TurnState {
  if (state.status !== 'playing' || !state.player || !state.floor) return state;
  if (state.player.potions <= 0) return state;
  const effective = computeEffectiveStats(state.player.baseStats, state.player.equipment);
  if (effective.hp >= effective.maxHp) return state;

  let turn = state.turn;
  const logs: LogEntry[] = [];
  const pushLog: PushLog = (text, kind = 'info') => logs.push({ id: nanoid(6), turn, text, kind });

  const healAmount = Math.round(effective.maxHp * POTION_HEAL_RATIO);
  let player: PlayerCharacter = {
    ...state.player,
    potions: state.player.potions - 1,
    baseStats: applyHeal(state.player.baseStats, state.player.equipment, healAmount),
  };
  pushLog(`🧪 Выпито зелье лечения: +${healAmount} HP`, 'success');

  turn += 1;
  player = tickAbilityCooldown(player);

  const enemyPhase = runEnemyPhase(player, state.floor, state.rng, pushLog);
  const finalFloor = { ...enemyPhase.floor, tiles: updateVisibility(enemyPhase.floor.tiles, enemyPhase.player.position, VISIBILITY_RADIUS) };

  const finalized = finalizeTurn(
    enemyPhase.player, finalFloor, turn, state.kills, state.bossKills, state.goldCollected, logs, state.log, state.lastEssenceEarned, applyRunResult
  );
  return { ...state, ...finalized };
}
