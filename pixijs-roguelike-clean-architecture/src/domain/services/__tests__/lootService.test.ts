import { describe, it, expect } from 'vitest';
import { generateItem, generateGoldAmount, scoreItem } from '../lootService';
import { Item } from '../../entities/item';
import { ItemRarity, ItemSlot } from '../../types';
import { RNG } from '../rng';

describe('lootService', () => {
  it('generateItem generates a valid item', () => {
    const rng = new RNG(1);
    const item = generateItem(1, 10, rng);

    expect(item).toBeDefined();
    expect(item.id).toBeDefined();
    expect(item.name).toBeDefined();
    expect(item.slot).toBeDefined();
    expect(item.rarity).toBeDefined();
  });

  it('generateGoldAmount generates sensible amounts', () => {
    const rng = new RNG(1);
    const gold = generateGoldAmount(1, 10, rng);

    expect(gold).toBeGreaterThan(0);
  });

  it('scoreItem gives score based on stats', () => {
    const item: Item = {
      id: 'eq1', name: 'Sword', rarity: ItemRarity.COMMON, slot: ItemSlot.WEAPON, levelFound: 1, goldValue: 10,
      bonuses: { attack: 5 }, icon: '🗡️'
    };

    const score = scoreItem(item);
    expect(score).toBe(15); // 5 * 3
  });
});
