import { nanoid } from 'nanoid';
import { RNG } from '../../infrastructure/random/rng';
import {
  AFFIX_BASE_VALUE,
  AffixKey,
  RARITY_AFFIX_COUNT,
  RARITY_ORDER,
  RARITY_POWER_MULTIPLIER,
  RARITY_PREFIX_POOL,
  SLOT_AFFIX_POOL,
  SLOT_ICON,
  SLOT_NAME_POOL,
} from '../data/itemAffixes';
import { Item } from '../entities/item';
import { ItemRarity, ItemSlot, StatBonuses } from '../types';

function rollRarity(luck: number, rng: RNG): ItemRarity {
  const weights = [
    { item: ItemRarity.COMMON, weight: Math.max(4, 46 - luck * 0.9) },
    { item: ItemRarity.MAGIC, weight: 30 + luck * 0.4 },
    { item: ItemRarity.RARE, weight: 15 + luck * 0.45 },
    { item: ItemRarity.EPIC, weight: 6 + luck * 0.35 },
    { item: ItemRarity.LEGENDARY, weight: 1.5 + luck * 0.2 },
  ];
  return rng.pickWeighted(weights);
}

export function generateItem(floorLevel: number, luck: number, rng: RNG): Item {
  const slot = rng.pick([ItemSlot.WEAPON, ItemSlot.ARMOR, ItemSlot.TRINKET]);
  const rarity = rollRarity(luck, rng);
  const rarityIndex = RARITY_ORDER.indexOf(rarity);
  const powerMul = RARITY_POWER_MULTIPLIER[rarity] * (1 + floorLevel * 0.06);
  const affixCount = RARITY_AFFIX_COUNT[rarity];

  const pool = [...SLOT_AFFIX_POOL[slot]];
  const bonuses: StatBonuses = {};
  for (let i = 0; i < affixCount && pool.length > 0; i++) {
    const idx = rng.int(0, pool.length - 1);
    const key = pool.splice(idx, 1)[0] as AffixKey;
    const value = AFFIX_BASE_VALUE[key] * powerMul * (0.85 + rng.next() * 0.3);
    (bonuses as Record<AffixKey, number>)[key] = Math.round(value * 100) / 100;
  }

  const baseName = rng.pick(SLOT_NAME_POOL[slot]);
  const prefix = rng.pick(RARITY_PREFIX_POOL[rarity]);
  const goldValue = Math.round(8 * powerMul * (1 + rarityIndex * 0.5));

  return {
    id: nanoid(8),
    name: `${prefix} ${baseName}`,
    slot,
    rarity,
    icon: SLOT_ICON[slot],
    bonuses,
    goldValue,
    levelFound: floorLevel,
  };
}

export function generateGoldAmount(floorLevel: number, luck: number, rng: RNG): number {
  const base = rng.int(4, 10) + floorLevel * 2;
  return Math.round(base * (1 + luck * 0.02));
}

export function scoreItem(item: Item): number {
  const b = item.bonuses;
  return (
    (b.attack ?? 0) * 3 +
    (b.defense ?? 0) * 3 +
    (b.maxHp ?? 0) * 1 +
    (b.maxMana ?? 0) * 0.8 +
    (b.critChance ?? 0) * 200 +
    (b.critMultiplier ?? 0) * 80 +
    (b.luck ?? 0) * 1.5
  );
}
