import { describe, it, expect } from 'vitest';
import { resolveAttack } from '../combatService';
import { RNG } from '../rng';
import { Stats } from '../../types';

describe('combatService', () => {
  it('resolveAttack handles normal attack', () => {
    const attacker: Stats = { attack: 10, critChance: 0, critMultiplier: 2, maxHp: 100, hp: 100, maxMana: 50, mana: 50, defense: 0, luck: 0 };
    const defender: Stats = { defense: 2, maxHp: 100, hp: 100, maxMana: 50, mana: 50, attack: 5, critChance: 0, critMultiplier: 2, luck: 0 };
    const rng = new RNG(1);

    const result = resolveAttack(attacker, defender, rng);

    // (10 - 2) * (1 +- 0.15)
    // 8 * 0.85 = 6.8 -> 7
    // 8 * 1.15 = 9.2 -> 9
    expect(result.damage).toBeGreaterThanOrEqual(1);
    expect(result.isCrit).toBe(false);
  });

  it('resolveAttack handles critical hit', () => {
    const attacker: Stats = { attack: 10, critChance: 1, critMultiplier: 2, maxHp: 100, hp: 100, maxMana: 50, mana: 50, defense: 0, luck: 0 };
    const defender: Stats = { defense: 0, maxHp: 100, hp: 100, maxMana: 50, mana: 50, attack: 5, critChance: 0, critMultiplier: 2, luck: 0 };
    const rng = new RNG(1);

    const result = resolveAttack(attacker, defender, rng);

    // 10 * 2 = 20 * (0.85 - 1.15) -> 17 to 23
    expect(result.damage).toBeGreaterThanOrEqual(17);
    expect(result.damage).toBeLessThanOrEqual(23);
    expect(result.isCrit).toBe(true);
  });
});
