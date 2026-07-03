import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CLASS_DEFINITIONS } from '../../domain/data/classDefinitions';
import { VISIBILITY_RADIUS } from '../../domain/config';
import { DungeonFloor } from '../../domain/entities/dungeon';
import { Equipment, INVENTORY_CAPACITY, PlayerCharacter } from '../../domain/entities/character';
import { RNG } from '../../domain/services/rng';
import { generateFloor } from '../../domain/services/dungeonGenerator';
import { updateVisibility } from '../../domain/services/visibilityService';
import { ClassType, ItemSlot, LogEntry } from '../../domain/types';
import { createPlayerCharacter } from '../factories/characterFactory';
import { useMetaStore } from '../meta/metaStore';
import { GameStatus, performAbility, performMove, performPotion, TurnState } from './turnService';

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

  startRun: (classType: ClassType, seed: number) => void;
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

  startRun: (classType: ClassType, seed: number) => {
    const metaBonuses = useMetaStore.getState().getBonusStats();
    const rng = new RNG(seed);
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

    const applyRunResult = useMetaStore.getState().applyRunResult;
    const newState = performMove(dx, dy, s as TurnState, applyRunResult);
    set(newState);
  },

  useAbility: () => {
    const s = get();
    if (s.status !== 'playing' || !s.player || !s.floor) return;

    const applyRunResult = useMetaStore.getState().applyRunResult;
    const newState = performAbility(s as TurnState, applyRunResult);
    set(newState);
  },

  usePotion: () => {
    const s = get();
    if (s.status !== 'playing' || !s.player || !s.floor) return;

    const applyRunResult = useMetaStore.getState().applyRunResult;
    const newState = performPotion(s as TurnState, applyRunResult);
    set(newState);
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
