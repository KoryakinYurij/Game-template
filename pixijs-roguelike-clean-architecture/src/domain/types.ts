// ============================================================================
// DOMAIN LAYER — core types & enums. No dependencies on any other layer.
// ============================================================================

export enum ClassType {
  WARRIOR = 'WARRIOR',
  MAGE = 'MAGE',
  ROGUE = 'ROGUE',
  PALADIN = 'PALADIN',
}

export enum ItemRarity {
  COMMON = 'COMMON',
  MAGIC = 'MAGIC',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

export enum ItemSlot {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  TRINKET = 'TRINKET',
}

export enum TileType {
  WALL = 'WALL',
  FLOOR = 'FLOOR',
  STAIRS = 'STAIRS',
}

export enum EnemyKind {
  SLIME = 'SLIME',
  RAT = 'RAT',
  GOBLIN = 'GOBLIN',
  BAT = 'BAT',
  SKELETON = 'SKELETON',
  ORC = 'ORC',
  NECROMANCER = 'NECROMANCER',
  DRAGONLING = 'DRAGONLING',
}

export interface Position {
  x: number;
  y: number;
}

export interface Stats {
  maxHp: number;
  hp: number;
  maxMana: number;
  mana: number;
  attack: number;
  defense: number;
  critChance: number;
  critMultiplier: number;
  luck: number;
}

/** A partial set of stat deltas used by items, class growth and meta upgrades. */
export type StatBonuses = Partial<Omit<Stats, 'hp' | 'mana'>>;

export type LogKind = 'info' | 'combat' | 'loot' | 'danger' | 'success' | 'level';

export interface LogEntry {
  id: string;
  turn: number;
  text: string;
  kind: LogKind;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function chebyshevDistance(a: Position, b: Position): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function addStatBonuses(base: Stats, bonuses: StatBonuses[]): Stats {
  const result: Stats = { ...base };
  for (const bonus of bonuses) {
    if (bonus.maxHp) result.maxHp += bonus.maxHp;
    if (bonus.maxMana) result.maxMana += bonus.maxMana;
    if (bonus.attack) result.attack += bonus.attack;
    if (bonus.defense) result.defense += bonus.defense;
    if (bonus.critChance) result.critChance += bonus.critChance;
    if (bonus.critMultiplier) result.critMultiplier += bonus.critMultiplier;
    if (bonus.luck) result.luck += bonus.luck;
  }
  return result;
}
