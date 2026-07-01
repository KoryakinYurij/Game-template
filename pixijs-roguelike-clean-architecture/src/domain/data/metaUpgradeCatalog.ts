import { ClassType, StatBonuses } from '../types';

export interface MetaUpgradeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  effectPerLevel: StatBonuses;
}

export const META_UPGRADES: MetaUpgradeDef[] = [
  {
    id: 'vitality',
    name: 'Живучесть',
    icon: '❤️',
    description: '+6 к макс. здоровью за уровень',
    maxLevel: 20,
    baseCost: 18,
    costGrowth: 1.16,
    effectPerLevel: { maxHp: 6 },
  },
  {
    id: 'strength',
    name: 'Сила',
    icon: '💪',
    description: '+2 к атаке за уровень',
    maxLevel: 20,
    baseCost: 22,
    costGrowth: 1.18,
    effectPerLevel: { attack: 2 },
  },
  {
    id: 'resilience',
    name: 'Стойкость',
    icon: '🛡️',
    description: '+1.5 к защите за уровень',
    maxLevel: 20,
    baseCost: 20,
    costGrowth: 1.17,
    effectPerLevel: { defense: 1.5 },
  },
  {
    id: 'fortune',
    name: 'Удача',
    icon: '🍀',
    description: '+3 к удаче за уровень (лучший лут и золото)',
    maxLevel: 15,
    baseCost: 26,
    costGrowth: 1.22,
    effectPerLevel: { luck: 3 },
  },
  {
    id: 'wisdom',
    name: 'Мудрость',
    icon: '🔮',
    description: '+8 к макс. мане за уровень',
    maxLevel: 15,
    baseCost: 18,
    costGrowth: 1.16,
    effectPerLevel: { maxMana: 8 },
  },
  {
    id: 'precision',
    name: 'Точность',
    icon: '🎯',
    description: '+1.5% шанса крита за уровень',
    maxLevel: 10,
    baseCost: 30,
    costGrowth: 1.28,
    effectPerLevel: { critChance: 0.015 },
  },
];

export function costForUpgradeLevel(def: MetaUpgradeDef, currentLevel: number): number {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}

export const CLASS_UNLOCK_COST: Record<ClassType, number> = {
  [ClassType.WARRIOR]: 0,
  [ClassType.MAGE]: 150,
  [ClassType.ROGUE]: 250,
  [ClassType.PALADIN]: 400,
};
