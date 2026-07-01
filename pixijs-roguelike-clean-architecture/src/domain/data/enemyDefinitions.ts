import { EnemyKind, Stats } from '../types';

export interface EnemyTemplate {
  kind: EnemyKind;
  name: string;
  icon: string;
  color: number;
  minFloor: number;
  aggroRadius: number;
  base: Stats;
}

const T = (
  kind: EnemyKind,
  name: string,
  icon: string,
  color: number,
  minFloor: number,
  aggroRadius: number,
  base: Stats,
): EnemyTemplate => ({ kind, name, icon, color, minFloor, aggroRadius, base });

export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  T(EnemyKind.SLIME, 'Слизень', '🟢', 0x59c96f, 1, 4, {
    maxHp: 14, hp: 14, maxMana: 0, mana: 0, attack: 3, defense: 0, critChance: 0.02, critMultiplier: 1.3, luck: 0,
  }),
  T(EnemyKind.RAT, 'Гигантская крыса', '🐀', 0x9a8264, 1, 5, {
    maxHp: 10, hp: 10, maxMana: 0, mana: 0, attack: 4, defense: 0, critChance: 0.05, critMultiplier: 1.3, luck: 0,
  }),
  T(EnemyKind.GOBLIN, 'Гоблин', '👺', 0x6fae4b, 2, 5, {
    maxHp: 20, hp: 20, maxMana: 0, mana: 0, attack: 5, defense: 1, critChance: 0.05, critMultiplier: 1.4, luck: 0,
  }),
  T(EnemyKind.BAT, 'Летучая мышь', '🦇', 0x7a5ea8, 3, 6, {
    maxHp: 12, hp: 12, maxMana: 0, mana: 0, attack: 5, defense: 0, critChance: 0.12, critMultiplier: 1.5, luck: 0,
  }),
  T(EnemyKind.SKELETON, 'Скелет', '💀', 0xd8d3c4, 4, 5, {
    maxHp: 26, hp: 26, maxMana: 0, mana: 0, attack: 6, defense: 2, critChance: 0.05, critMultiplier: 1.4, luck: 0,
  }),
  T(EnemyKind.ORC, 'Орк', '👹', 0xb1502f, 6, 5, {
    maxHp: 34, hp: 34, maxMana: 0, mana: 0, attack: 8, defense: 3, critChance: 0.06, critMultiplier: 1.4, luck: 0,
  }),
  T(EnemyKind.NECROMANCER, 'Некромант', '🧟', 0x4f6b8f, 8, 6, {
    maxHp: 30, hp: 30, maxMana: 0, mana: 0, attack: 10, defense: 2, critChance: 0.1, critMultiplier: 1.6, luck: 0,
  }),
  T(EnemyKind.DRAGONLING, 'Дракончик', '🐉', 0xd1483f, 11, 5, {
    maxHp: 44, hp: 44, maxMana: 0, mana: 0, attack: 12, defense: 4, critChance: 0.1, critMultiplier: 1.6, luck: 0,
  }),
];

export function availableTemplates(floorLevel: number): EnemyTemplate[] {
  const pool = ENEMY_TEMPLATES.filter((t) => t.minFloor <= floorLevel);
  return pool.length > 0 ? pool : [ENEMY_TEMPLATES[0]];
}

export function scaleStatsForFloor(base: Stats, floorLevel: number, bossMultiplier = 1): Stats {
  const growth = 1 + 0.16 * (floorLevel - 1);
  const hp = Math.round(base.maxHp * growth * bossMultiplier);
  return {
    maxHp: hp,
    hp,
    maxMana: base.maxMana,
    mana: base.mana,
    attack: Math.round(base.attack * (1 + 0.11 * (floorLevel - 1)) * (bossMultiplier > 1 ? 1.3 : 1)),
    defense: Math.round(base.defense * (1 + 0.08 * (floorLevel - 1)) * (bossMultiplier > 1 ? 1.4 : 1) * 10) / 10,
    critChance: base.critChance,
    critMultiplier: base.critMultiplier,
    luck: base.luck,
  };
}

const BOSS_NAMES = [
  'Вождь гоблинов',
  'Король скелетов',
  'Повелитель орков',
  'Верховный некромант',
  'Древний дракон',
];

export function getBossTemplate(floorLevel: number): { template: EnemyTemplate; name: string } {
  const pool = availableTemplates(floorLevel);
  const template = pool[pool.length - 1];
  const tier = Math.floor(floorLevel / 5) - 1;
  const name = BOSS_NAMES[Math.min(Math.max(tier, 0), BOSS_NAMES.length - 1)];
  return { template, name };
}
