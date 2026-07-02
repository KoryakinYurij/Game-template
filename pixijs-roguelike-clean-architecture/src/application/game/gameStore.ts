import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CLASS_DEFINITIONS } from '../../domain/data/classDefinitions';
import { VISIBILITY_RADIUS, MAX_LOG_ENTRIES, ENEMY_DROP_CHANCE, BOSS_DROP_CHANCE, POTION_HEAL_RATIO } from '../../domain/config';
import { DungeonFloor, GroundItem } from '../../domain/entities/dungeon';
import { EnemyEntity } from '../../domain/entities/enemy';
import { Equipment, INVENTORY_CAPACITY, PlayerCharacter } from '../../domain/entities/character';
import { RNG } from '../../domain/services/rng';
import { createRandomSeed } from '../../infrastructure/random/createSeed';
import { canUseAbility, executeAbility } from '../../domain/services/abilityService';
import { resolveAttack } from '../../domain/services/combatService';
import { generateFloor } from '../../domain/services/dungeonGenerator';
import { applyXpGain } from '../../domain/services/experienceService';
import { generateItem } from '../../domain/services/lootService';
import { RunSummary } from '../../domain/services/metaProgressionService';
import { applyDamage, applyHeal, computeEffectiveStats, spendMana } from '../../domain/services/statsService';
import { updateVisibility } from '../../domain/services/visibilityService';
import { ClassType, ItemSlot, LogEntry, LogKind, Position, TileType, chebyshevDistance, samePosition } from '../../domain/types';
import { createPlayerCharacter } from '../factories/characterFactory';
import { useMetaStore } from '../meta/metaStore';

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

interface FinalizedTurn {
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
): FinalizedTurn {
  const effective = computeEffectiveStats(player.baseStats, player.equipment);
  let status: GameStatus = 'playing';
  let lastEssenceEarned = prevLastEssence;

  if (effective.hp <= 0) {
    status = 'dead';
    newLogs.push({ id: nanoid(6), turn, text: '💀 Вы погибли... Экспедиция окончена.', kind: 'danger' });
    const summary: RunSummary = { floorReached: floor.level, kills, bossKills, goldCollected, survived: false };
    lastEssenceEarned = useMetaStore.getState().applyRunResult(summary);
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

interface GameState {
  status: GameStatus;
  player: PlayerCharacter | null;
  floor: DungeonFloor | null;
  rng: RNG;
  turn: number;
  kills: number;
  bossKills: number;
  goldCollected: number;
  log: LogEntry[];
  lastEssenceEarned: number;

  startRun: (classType: ClassType) => void;
  move: (dx: number, dy: number) => void;
  useAbility: () => void;
  usePotion: () => void;
  equipItem: (itemId: string) => void;
  unequipSlot: (slot: ItemSlot) => void;
  sellItem: (itemId: string) => void;
  returnToHub: () => void;
}

export const useGameStore = create<GameState>()(immer((set, get) => ({
  status: 'idle',
  player: null,
  floor: null,
  rng: new RNG(1),
  turn: 0,
  kills: 0,
  bossKills: 0,
  goldCollected: 0,
  log: [],
  lastEssenceEarned: 0,

  startRun: (classType: ClassType) => {
    const metaBonuses = useMetaStore.getState().getBonusStats();
    const rng = new RNG(createRandomSeed());
    const startingLuck = CLASS_DEFINITIONS[classType].baseStats.luck + (metaBonuses.luck ?? 0);
    const floor = generateFloor(1, startingLuck, rng);
    const player = createPlayerCharacter(classType, metaBonuses, floor.playerStart);
    floor.tiles = updateVisibility(floor.tiles, player.position, VISIBILITY_RADIUS);
    set({
      status: 'playing',
      player,
      floor,
      rng,
      turn: 0,
      kills: 0,
      bossKills: 0,
      goldCollected: 0,
      lastEssenceEarned: 0,
      log: [
        {
          id: nanoid(6),
          turn: 0,
          text: `⚔️ Экспедиция начата: ${CLASS_DEFINITIONS[classType].name}. Найдите лестницу вниз!`,
          kind: 'info',
        },
      ],
    });
  },

  move: (dx: number, dy: number) => {
    const s = get();
    if (s.status !== 'playing' || !s.player || !s.floor) return;
    const rng = s.rng;
    let player = s.player;
    let floor = s.floor;
    let turn = s.turn;
    let kills = s.kills;
    let bossKills = s.bossKills;
    let goldCollected = s.goldCollected;
    const logs: LogEntry[] = [];
    const pushLog: PushLog = (text, kind = 'info') => logs.push({ id: nanoid(6), turn, text, kind });

    const target: Position = { x: player.position.x + dx, y: player.position.y + dy };
    if (target.x < 0 || target.y < 0 || target.x >= floor.width || target.y >= floor.height) return;
    const targetTile = floor.tiles[target.y][target.x];
    if (targetTile.type === TileType.WALL) return;

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
      set((prev) => ({
        player,
        floor: newFloor,
        turn,
        kills,
        bossKills,
        goldCollected,
        log: [...prev.log, ...logs].slice(-MAX_LOG_ENTRIES),
      }));
      return;
    }

    const enemyPhase = runEnemyPhase(player, floor, rng, pushLog);
    const finalFloor = { ...enemyPhase.floor, tiles: updateVisibility(enemyPhase.floor.tiles, enemyPhase.player.position, VISIBILITY_RADIUS) };

    set((prev) => finalizeTurn(enemyPhase.player, finalFloor, turn, kills, bossKills, goldCollected, logs, prev.log, prev.lastEssenceEarned));
  },

  useAbility: () => {
    const s = get();
    if (s.status !== 'playing' || !s.player || !s.floor) return;
    const rng = s.rng;
    let player = s.player;
    let floor = s.floor;
    let turn = s.turn;
    let kills = s.kills;
    let bossKills = s.bossKills;
    let goldCollected = s.goldCollected;
    const logs: LogEntry[] = [];
    const pushLog: PushLog = (text, kind = 'info') => logs.push({ id: nanoid(6), turn, text, kind });

    const effective = computeEffectiveStats(player.baseStats, player.equipment);
    const check = canUseAbility(effective, player.ability.cooldownRemaining, player.classType);
    if (!check.ok) {
      pushLog(check.reason ?? 'Способность недоступна', 'info');
      set((prev) => ({ log: [...prev.log, ...logs].slice(-MAX_LOG_ENTRIES) }));
      return;
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

    set((prev) => finalizeTurn(enemyPhase.player, finalFloor, turn, kills, bossKills, goldCollected, logs, prev.log, prev.lastEssenceEarned));
  },

  usePotion: () => {
    const s = get();
    if (s.status !== 'playing' || !s.player || !s.floor) return;
    if (s.player.potions <= 0) return;
    const effective = computeEffectiveStats(s.player.baseStats, s.player.equipment);
    if (effective.hp >= effective.maxHp) return;

    let turn = s.turn;
    const logs: LogEntry[] = [];
    const pushLog: PushLog = (text, kind = 'info') => logs.push({ id: nanoid(6), turn, text, kind });

    const healAmount = Math.round(effective.maxHp * POTION_HEAL_RATIO);
    let player: PlayerCharacter = {
      ...s.player,
      potions: s.player.potions - 1,
      baseStats: applyHeal(s.player.baseStats, s.player.equipment, healAmount),
    };
    pushLog(`🧪 Выпито зелье лечения: +${healAmount} HP`, 'success');

    turn += 1;
    player = tickAbilityCooldown(player);

    const enemyPhase = runEnemyPhase(player, s.floor, s.rng, pushLog);
    const finalFloor = { ...enemyPhase.floor, tiles: updateVisibility(enemyPhase.floor.tiles, enemyPhase.player.position, VISIBILITY_RADIUS) };

    set((prev) => finalizeTurn(enemyPhase.player, finalFloor, turn, s.kills, s.bossKills, s.goldCollected, logs, prev.log, prev.lastEssenceEarned));
  },

  equipItem: (itemId: string) => {
    const s = get();
    if (!s.player) return;
    const item = s.player.inventory.find((i) => i.id === itemId);
    if (!item) return;
    const slotKey = item.slot.toLowerCase() as keyof Equipment;
    const currentEquipped = s.player.equipment[slotKey];
    const newInventory = s.player.inventory.filter((i) => i.id !== itemId);
    if (currentEquipped) newInventory.push(currentEquipped);
    set({
      player: {
        ...s.player,
        inventory: newInventory,
        equipment: { ...s.player.equipment, [slotKey]: item },
      },
    });
  },

  unequipSlot: (slot: ItemSlot) => {
    const s = get();
    if (!s.player) return;
    const slotKey = slot.toLowerCase() as keyof Equipment;
    const equipped = s.player.equipment[slotKey];
    if (!equipped) return;
    if (s.player.inventory.length >= INVENTORY_CAPACITY) return;
    set({
      player: {
        ...s.player,
        inventory: [...s.player.inventory, equipped],
        equipment: { ...s.player.equipment, [slotKey]: null },
      },
    });
  },

  sellItem: (itemId: string) => {
    const s = get();
    if (!s.player) return;
    const item = s.player.inventory.find((i) => i.id === itemId);
    if (!item) return;
    set({
      player: {
        ...s.player,
        inventory: s.player.inventory.filter((i) => i.id !== itemId),
        gold: s.player.gold + item.goldValue,
      },
    });
  },

  returnToHub: () => {
    set({ status: 'idle', player: null, floor: null, log: [] });
  },
})));
