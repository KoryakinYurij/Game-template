import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CLASS_DEFINITIONS } from '../../domain/data/classDefinitions';
import { VISIBILITY_RADIUS, MAX_LOG_ENTRIES, POTION_HEAL_RATIO } from '../../domain/config';
import { DungeonFloor } from '../../domain/entities/dungeon';
import { Equipment, INVENTORY_CAPACITY, PlayerCharacter } from '../../domain/entities/character';
import { RNG } from '../../domain/services/rng';
import { createRandomSeed } from '../../infrastructure/random/createSeed';
import { resolveAttack } from '../../domain/services/combatService';
import { canUseAbility, executeAbility } from '../../domain/services/abilityService';
import { generateFloor } from '../../domain/services/dungeonGenerator';
import { applyHeal, computeEffectiveStats, spendMana } from '../../domain/services/statsService';
import { updateVisibility } from '../../domain/services/visibilityService';
import {
  FinalizedTurn,
  GameStatus,
  PushLog,
  finalizeTurn,
  handleEnemyDeath,
  handlePickup,
  runEnemyPhase,
  tickAbilityCooldown,
} from '../../domain/services/turnService';
import { ClassType, ItemSlot, LogEntry, Position, TileType, samePosition } from '../../domain/types';
import { createPlayerCharacter } from '../factories/characterFactory';
import { useMetaStore } from '../meta/metaStore';

// Re-export so existing consumers that imported GameStatus from this module keep working.
export type { GameStatus } from '../../domain/services/turnService';

export interface GameStoreState {
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

export const useGameStore = create<GameStoreState>()(
  immer((set, get) => {
    /**
     * Commits a finalized turn to the store. This is the ONE place the death
     * side effect lives: essence is granted exactly once, via the application
     * store, only when the domain reported a death.
     */
    const commitTurn = (result: FinalizedTurn) => {
      set((prev) => ({
        player: result.player,
        floor: result.floor,
        turn: result.turn,
        kills: result.kills,
        bossKills: result.bossKills,
        goldCollected: result.goldCollected,
        status: result.status,
        lastEssenceEarned: result.died
          ? useMetaStore.getState().applyRunResult(result.runSummary!)
          : prev.lastEssenceEarned,
        log: result.log,
      }));
    };

    return {
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
          const attackResult = resolveAttack(effective, enemyAtTarget.stats, rng);
          pushLog(
            `Вы атакуете ${enemyAtTarget.name}: ${attackResult.damage} урона${attackResult.isCrit ? ' (КРИТ!)' : ''}`,
            'combat',
          );
          const newHp = Math.max(0, enemyAtTarget.stats.hp - attackResult.damage);
          if (newHp <= 0) {
            const deathResult = handleEnemyDeath(player, enemyAtTarget, floor, rng, pushLog);
            player = deathResult.player;
            floor = deathResult.floor;
            kills += 1;
            if (enemyAtTarget.isBoss) bossKills += 1;
            goldCollected += enemyAtTarget.goldReward;
          } else {
            floor = {
              ...floor,
              enemies: floor.enemies.map((e) =>
                e.id === enemyAtTarget.id ? { ...e, stats: { ...e.stats, hp: newHp } } : e,
              ),
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
        const finalFloor = {
          ...enemyPhase.floor,
          tiles: updateVisibility(enemyPhase.floor.tiles, enemyPhase.player.position, VISIBILITY_RADIUS),
        };
        commitTurn(finalizeTurn(enemyPhase.player, finalFloor, turn, kills, bossKills, goldCollected, logs, s.log));
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
        player = { ...player, baseStats: spendMana(player.baseStats, player.equipment, outcome.manaCost) };

        let enemies = floor.enemies.map((e) => {
          const hit = outcome.hits.find((h) => h.enemyId === e.id);
          return hit ? { ...e, stats: { ...e.stats, hp: Math.max(0, e.stats.hp - hit.damage) } } : e;
        });
        const dead = enemies.filter((e) => e.stats.hp <= 0);
        enemies = enemies.filter((e) => e.stats.hp > 0);
        floor = { ...floor, enemies };

        for (const enemy of dead) {
          const deathResult = handleEnemyDeath(player, enemy, floor, rng, pushLog);
          player = deathResult.player;
          floor = deathResult.floor;
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
        const finalFloor = {
          ...enemyPhase.floor,
          tiles: updateVisibility(enemyPhase.floor.tiles, enemyPhase.player.position, VISIBILITY_RADIUS),
        };
        commitTurn(finalizeTurn(enemyPhase.player, finalFloor, turn, kills, bossKills, goldCollected, logs, s.log));
      },

      usePotion: () => {
        const s = get();
        if (s.status !== 'playing' || !s.player || !s.floor) return;
        const effective = computeEffectiveStats(s.player.baseStats, s.player.equipment);
        if (s.player.potions <= 0) return;
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
        const finalFloor = {
          ...enemyPhase.floor,
          tiles: updateVisibility(enemyPhase.floor.tiles, enemyPhase.player.position, VISIBILITY_RADIUS),
        };
        commitTurn(finalizeTurn(enemyPhase.player, finalFloor, turn, s.kills, s.bossKills, s.goldCollected, logs, s.log));
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
        set({ player: { ...s.player, inventory: newInventory, equipment: { ...s.player.equipment, [slotKey]: item } } });
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
    };
  }),
);
