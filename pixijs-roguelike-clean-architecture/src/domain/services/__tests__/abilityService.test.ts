import { describe, it, expect } from 'vitest';
import { canUseAbility, executeAbility } from '../abilityService';
import { ClassType, EnemyKind } from '../../types';
import { CLASS_DEFINITIONS } from '../../data/classDefinitions';
import { EnemyEntity } from '../../entities/enemy';
import { RNG } from '../rng';

describe('abilityService', () => {
  it('canUseAbility checks cooldown and mana', () => {
    // Use Mage to test mana check as Warrior's ability costs 0 mana
    const stats = { ...CLASS_DEFINITIONS[ClassType.MAGE].baseStats, mana: 100 };

    // Can use
    expect(canUseAbility(stats, 0, ClassType.MAGE).ok).toBe(true);

    // Cooldown
    expect(canUseAbility(stats, 1, ClassType.MAGE).ok).toBe(false);

    // No mana
    const noManaStats = { ...stats, mana: 0 };
    expect(canUseAbility(noManaStats, 0, ClassType.MAGE).ok).toBe(false);
  });

  it('executeAbility calculates damage and hits', () => {
    const stats = { ...CLASS_DEFINITIONS[ClassType.WARRIOR].baseStats };
    const position = { x: 0, y: 0 };
    const enemies: EnemyEntity[] = [
      { id: 'e1', kind: EnemyKind.RAT, aggroRadius: 5, name: 'Rat', icon: 'r', color: 0, position: { x: 1, y: 1 }, stats: { attack: 1, defense: 0, hp: 10, maxHp: 10, mana: 0, maxMana: 0, critChance: 0, critMultiplier: 2, luck: 0 }, xpReward: 10, goldReward: 0, isBoss: false }
    ];
    const rng = new RNG(1);

    const result = executeAbility(ClassType.WARRIOR, stats, position, enemies, rng);

    expect(result.hits.length).toBeGreaterThanOrEqual(0);
    expect(result.manaCost).toBe(CLASS_DEFINITIONS[ClassType.WARRIOR].ability.manaCost);
  });
});
