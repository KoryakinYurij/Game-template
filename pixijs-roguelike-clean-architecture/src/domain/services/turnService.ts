// ============================================================================
// DOMAIN LAYER — pure turn & phase logic.
//
// Everything here is a deterministic, side-effect-free function operating on
// plain domain data (player, floor, rng). There is NO zustand, NO React, NO
// localStorage. This is what makes the game rules unit-testable.
//
// IMPORTANT: finalizeTurn() used to call useMetaStore.applyRunResult() directly
// — a domain -> application dependency that broke the Clean Architecture rule.
// It now merely REPORTS a death (died + runSummary); the application store
// decides whether to grant essence. (Domain computes; application reacts.)
// ============================================================================

import { nanoid } from 'nanoid';
import { BOSS_DROP_CHANCE, ENEMY_DROP_CHANCE, MAX_LOG_ENTRIES } from '../config';
import { DungeonFloor, GroundItem } from '../entities/dungeon';
import { EnemyEntity } from '../entities/enemy';
import { INVENTORY_CAPACITY, PlayerCharacter } from '../entities/character';
import { RNG } from './rng';
import { resolveAttack } from './combatService';
import { applyXpGain } from './experienceService';
import { generateItem } from './lootService';
import { RunSummary } from './metaProgressionService';
import { applyDamage, computeEffectiveStats } from './statsService';
import { LogEntry, LogKind, Position, TileType, chebyshevDistance, samePosition } from '../types';

/** Lifecycle of a run. Lives in the domain because turn rules reason about it. */
export type GameStatus = 'idle' | 'playing' | 'dead';

export type PushLog = (text: string, kind?: LogKind) => void;

/** Outcome of a finalized turn: everything the application layer needs to commit. */
export interface FinalizedTurn {
  player: PlayerCharacter;
  floor: DungeonFloor;
  turn: number;
  kills: number;
  bossKills: number;
  goldCollected: number;
  status: GameStatus;
  /** True iff the player died this turn (application grants essence when so). */
  died: boolean;
  /** Present iff died; the run summary to feed applyRunResult. */
  runSummary: RunSummary | null;
  log: LogEntry[];
}

/** Ticks every ability cooldown down by one (floored at 0). */
export function tickAbilityCooldown(player: PlayerCharacter): PlayerCharacter {
  return { ...player, ability: { cooldownRemaining: Math.max(0, player.ability.cooldownRemaining - 1) } };
}

/** Resolves picking up a ground item: gold, potion, item (or auto-sell if full). */
export function handlePickup(
  player: PlayerCharacter,
  groundItem: GroundItem,
  pushLog: PushLog,
): { player: PlayerCharacter; goldGained: number } {
  if (groundItem.kind === 'gold') {
    pushLog(`💰 Найдено золото: +${groundItem.amount}`, 'loot');
    return { player: { ...player, gold: player.gold + groundItem.amount }, goldGained: groundItem.amount };
  }
  if (groundItem.kind === 'potion') {
    pushLog('🧪 Найдено зелье лечения.', 'loot');
    return { player: { ...player, potions: player.potions + 1 }, goldGained: 0 };
  }
  if (player.inventory.length < INVENTORY_CAPACITY) {
    pushLog(`🎒 Подобрано: ${groundItem.item.name}`, 'loot');
    return { player: { ...player, inventory: [...player.inventory, groundItem.item] }, goldGained: 0 };
  }
  pushLog(`🎒 Инвентарь полон. ${groundItem.item.name} продан за ${groundItem.item.goldValue}з.`, 'loot');
  return { player: { ...player, gold: player.gold + groundItem.item.goldValue }, goldGained: groundItem.item.goldValue };
}

/** Resolves an enemy death: XP, gold, kill count, and a possible item drop. */
export function handleEnemyDeath(
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

/**
 * Enemy AI phase: each enemy within aggro radius either attacks the player
 * (Chebyshev distance <= 1) or steps one tile toward them, respecting walls,
 * other enemies, and the player's tile.
 */
export function runEnemyPhase(
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

/**
 * Finalizes a turn: detects the player's death (hp <= 0), appends the death
 * log line, and reports the run summary. Does NOT grant essence — that is the
 * application store's responsibility (see commitTurn in gameStore).
 */
export function finalizeTurn(
  player: PlayerCharacter,
  floor: DungeonFloor,
  turn: number,
  kills: number,
  bossKills: number,
  goldCollected: number,
  newLogs: LogEntry[],
  prevLog: LogEntry[],
): FinalizedTurn {
  const effective = computeEffectiveStats(player.baseStats, player.equipment);
  const died = effective.hp <= 0;
  const status: GameStatus = died ? 'dead' : 'playing';
  let runSummary: RunSummary | null = null;

  if (died) {
    newLogs.push({ id: nanoid(6), turn, text: '💀 Вы погибли... Экспедиция окончена.', kind: 'danger' });
    runSummary = { floorReached: floor.level, kills, bossKills, goldCollected, survived: false };
  }

  return {
    player,
    floor,
    turn,
    kills,
    bossKills,
    goldCollected,
    status,
    died,
    runSummary,
    log: [...prevLog, ...newLogs].slice(-MAX_LOG_ENTRIES),
  };
}
