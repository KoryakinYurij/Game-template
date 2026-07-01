import { ClassType, Position, Stats } from '../types';
import { Item } from './item';

export interface Equipment {
  weapon: Item | null;
  armor: Item | null;
  trinket: Item | null;
}

export interface AbilityState {
  cooldownRemaining: number;
}

export interface PlayerCharacter {
  classType: ClassType;
  level: number;
  xp: number;
  xpToNext: number;
  /** Stats derived purely from class base + level growth + meta upgrades. Current hp/mana live here. */
  baseStats: Stats;
  position: Position;
  equipment: Equipment;
  inventory: Item[];
  gold: number;
  potions: number;
  ability: AbilityState;
  kills: number;
}

export const INVENTORY_CAPACITY = 10;
