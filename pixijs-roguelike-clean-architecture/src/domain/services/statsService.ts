import { Equipment } from '../entities/character';
import { addStatBonuses, clamp, Stats } from '../types';

export function computeEffectiveStats(base: Stats, equipment: Equipment): Stats {
  const bonuses = [equipment.weapon?.bonuses, equipment.armor?.bonuses, equipment.trinket?.bonuses].filter(
    (b): b is NonNullable<typeof b> => Boolean(b),
  );
  const effective = addStatBonuses(base, bonuses);
  effective.hp = clamp(base.hp, 0, effective.maxHp);
  effective.mana = clamp(base.mana, 0, effective.maxMana);
  return effective;
}

export function applyDamage(base: Stats, equipment: Equipment, amount: number): Stats {
  const effective = computeEffectiveStats(base, equipment);
  const newHp = clamp(effective.hp - amount, 0, effective.maxHp);
  return { ...base, hp: newHp };
}

export function applyHeal(base: Stats, equipment: Equipment, amount: number): Stats {
  const effective = computeEffectiveStats(base, equipment);
  const newHp = clamp(effective.hp + amount, 0, effective.maxHp);
  return { ...base, hp: newHp };
}

export function spendMana(base: Stats, equipment: Equipment, amount: number): Stats {
  const effective = computeEffectiveStats(base, equipment);
  const newMana = clamp(effective.mana - amount, 0, effective.maxMana);
  return { ...base, mana: newMana };
}
