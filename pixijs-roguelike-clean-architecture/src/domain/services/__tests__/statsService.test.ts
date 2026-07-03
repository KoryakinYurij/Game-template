import { describe, it, expect } from 'vitest';
import { computeEffectiveStats, spendMana, applyHeal } from '../statsService';
import { ClassType, ItemRarity, ItemSlot } from '../../types';
import { Equipment } from '../../entities/character';
import { CLASS_DEFINITIONS } from '../../data/classDefinitions';

describe('statsService', () => {
  it('computeEffectiveStats adds equipment bonuses', () => {
    const baseStats = CLASS_DEFINITIONS[ClassType.WARRIOR].baseStats;
    const equipment: Equipment = {
      weapon: { id: 'w1', name: 'Sword', rarity: ItemRarity.COMMON, slot: ItemSlot.WEAPON, levelFound: 1, goldValue: 10, bonuses: { attack: 5 }, icon: '🗡️' },
      armor: null,
      trinket: { id: 't1', name: 'Ring', rarity: ItemRarity.COMMON, slot: ItemSlot.TRINKET, levelFound: 1, goldValue: 10, bonuses: { maxHp: 20 }, icon: '💍' }
    };

    const effective = computeEffectiveStats(baseStats, equipment);
    expect(effective.attack).toBe(baseStats.attack + 5);
    expect(effective.maxHp).toBe(baseStats.maxHp + 20);
    // hp/mana don't go beyond max, but current hp is equal to base hp since equipment bonus doesn't heal
    expect(effective.hp).toBe(baseStats.hp);
  });

  it('spendMana subtracts mana', () => {
    const baseStats = { ...CLASS_DEFINITIONS[ClassType.MAGE].baseStats, mana: 50 };
    const equipment: Equipment = { weapon: null, armor: null, trinket: null };

    const newStats = spendMana(baseStats, equipment, 20);
    expect(newStats.mana).toBe(30);
  });

  it('applyHeal adds hp clamped to max', () => {
    const baseStats = { ...CLASS_DEFINITIONS[ClassType.WARRIOR].baseStats, hp: 10, maxHp: 100 };
    const equipment: Equipment = { weapon: null, armor: null, trinket: null };

    const newStats = applyHeal(baseStats, equipment, 50);
    expect(newStats.hp).toBe(60);

    const fullHeal = applyHeal(baseStats, equipment, 500);
    expect(fullHeal.hp).toBe(100);
  });
});
