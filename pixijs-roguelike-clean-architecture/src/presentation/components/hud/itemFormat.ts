import { StatBonuses } from '../../../domain/types';

const LABELS: Record<string, string> = {
  maxHp: 'Здоровье',
  maxMana: 'Мана',
  attack: 'Атака',
  defense: 'Защита',
  critChance: 'Шанс крита',
  critMultiplier: 'Сила крита',
  luck: 'Удача',
};

export function formatBonuses(bonuses: StatBonuses): string[] {
  return (Object.entries(bonuses) as [keyof StatBonuses, number][])
    .filter(([, v]) => !!v)
    .map(([key, value]) => {
      const isPercent = key === 'critChance';
      const display = isPercent ? `${Math.round(value * 100)}%` : `${value > 0 ? '+' : ''}${value}`;
      return `${LABELS[key]}: ${display}`;
    });
}
