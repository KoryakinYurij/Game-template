import { ClassType, Stats, StatBonuses } from '../types';

export type AbilityId = 'whirlwind' | 'fireball' | 'fan_of_knives' | 'holy_nova';

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  icon: string;
  description: string;
  manaCost: number;
  cooldown: number;
  key: string;
}

export interface ClassDefinition {
  classType: ClassType;
  name: string;
  icon: string;
  color: number;
  description: string;
  baseStats: Stats;
  growthPerLevel: StatBonuses;
  ability: AbilityDefinition;
  unlockCost: number;
}

export const CLASS_DEFINITIONS: Record<ClassType, ClassDefinition> = {
  [ClassType.WARRIOR]: {
    classType: ClassType.WARRIOR,
    name: 'Воин',
    icon: '⚔️',
    color: 0xe0b23a,
    description: 'Стойкий боец ближнего боя с высоким запасом здоровья и брони.',
    baseStats: {
      maxHp: 60,
      hp: 60,
      maxMana: 20,
      mana: 20,
      attack: 9,
      defense: 5,
      critChance: 0.08,
      critMultiplier: 1.6,
      luck: 2,
    },
    growthPerLevel: { maxHp: 8, attack: 1.6, defense: 1.1, maxMana: 1 },
    ability: {
      id: 'whirlwind',
      name: 'Вихрь клинка',
      icon: '🌀',
      description: 'Наносит урон всем врагам вокруг вас.',
      manaCost: 0,
      cooldown: 4,
      key: 'Q',
    },
    unlockCost: 0,
  },
  [ClassType.MAGE]: {
    classType: ClassType.MAGE,
    name: 'Маг',
    icon: '🧙',
    color: 0x5aa9e6,
    description: 'Хрупкий, но мощный заклинатель огненных сфер по области.',
    baseStats: {
      maxHp: 38,
      hp: 38,
      maxMana: 60,
      mana: 60,
      attack: 11,
      defense: 2,
      critChance: 0.1,
      critMultiplier: 1.7,
      luck: 3,
    },
    growthPerLevel: { maxHp: 4, attack: 2.1, defense: 0.4, maxMana: 6 },
    ability: {
      id: 'fireball',
      name: 'Огненный шар',
      icon: '🔥',
      description: 'Взрыв в области вокруг ближайшего врага.',
      manaCost: 16,
      cooldown: 3,
      key: 'Q',
    },
    unlockCost: 150,
  },
  [ClassType.ROGUE]: {
    classType: ClassType.ROGUE,
    name: 'Плут',
    icon: '🗡️',
    color: 0x8c5ae6,
    description: 'Быстрый и смертоносный, полагается на критические удары.',
    baseStats: {
      maxHp: 46,
      hp: 46,
      maxMana: 35,
      mana: 35,
      attack: 10,
      defense: 3,
      critChance: 0.22,
      critMultiplier: 1.9,
      luck: 5,
    },
    growthPerLevel: { maxHp: 5, attack: 1.8, defense: 0.6, maxMana: 3 },
    ability: {
      id: 'fan_of_knives',
      name: 'Веер клинков',
      icon: '🔪',
      description: 'Бросает ножи во всех врагов рядом с гарантированными критами.',
      manaCost: 12,
      cooldown: 3,
      key: 'Q',
    },
    unlockCost: 250,
  },
  [ClassType.PALADIN]: {
    classType: ClassType.PALADIN,
    name: 'Паладин',
    icon: '🛡️',
    color: 0xf0e6c8,
    description: 'Защитник со священной магией, лечит себя и карает нечисть.',
    baseStats: {
      maxHp: 55,
      hp: 55,
      maxMana: 45,
      mana: 45,
      attack: 8,
      defense: 6,
      critChance: 0.07,
      critMultiplier: 1.5,
      luck: 3,
    },
    growthPerLevel: { maxHp: 7, attack: 1.4, defense: 1.3, maxMana: 4 },
    ability: {
      id: 'holy_nova',
      name: 'Святая вспышка',
      icon: '✨',
      description: 'Лечит вас и наносит урон окружающим врагам.',
      manaCost: 20,
      cooldown: 5,
      key: 'Q',
    },
    unlockCost: 400,
  },
};

export function xpToNextLevel(level: number): number {
  return Math.round(18 * Math.pow(level, 1.5) + 32);
}
