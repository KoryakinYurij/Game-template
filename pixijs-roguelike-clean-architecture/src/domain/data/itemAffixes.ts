import { ItemRarity, ItemSlot } from '../types';

export const RARITY_ORDER: ItemRarity[] = [
  ItemRarity.COMMON,
  ItemRarity.MAGIC,
  ItemRarity.RARE,
  ItemRarity.EPIC,
  ItemRarity.LEGENDARY,
];

export const RARITY_COLOR: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 0xb5b5b5,
  [ItemRarity.MAGIC]: 0x4f8cf0,
  [ItemRarity.RARE]: 0xd6b23c,
  [ItemRarity.EPIC]: 0xa04fe0,
  [ItemRarity.LEGENDARY]: 0xe0762f,
};

export const RARITY_LABEL: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: 'Обычное',
  [ItemRarity.MAGIC]: 'Волшебное',
  [ItemRarity.RARE]: 'Редкое',
  [ItemRarity.EPIC]: 'Эпическое',
  [ItemRarity.LEGENDARY]: 'Легендарное',
};

export const RARITY_POWER_MULTIPLIER: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 1,
  [ItemRarity.MAGIC]: 1.6,
  [ItemRarity.RARE]: 2.4,
  [ItemRarity.EPIC]: 3.6,
  [ItemRarity.LEGENDARY]: 5.2,
};

export const RARITY_AFFIX_COUNT: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 1,
  [ItemRarity.MAGIC]: 2,
  [ItemRarity.RARE]: 2,
  [ItemRarity.EPIC]: 3,
  [ItemRarity.LEGENDARY]: 4,
};

export const SLOT_ICON: Record<ItemSlot, string> = {
  [ItemSlot.WEAPON]: '🗡️',
  [ItemSlot.ARMOR]: '🧥',
  [ItemSlot.TRINKET]: '💍',
};

export const SLOT_NAME_POOL: Record<ItemSlot, string[]> = {
  [ItemSlot.WEAPON]: ['Клинок', 'Топор', 'Кинжал', 'Посох', 'Молот', 'Копьё'],
  [ItemSlot.ARMOR]: ['Кольчуга', 'Доспех', 'Плащ', 'Роба', 'Латы', 'Туника'],
  [ItemSlot.TRINKET]: ['Перстень', 'Амулет', 'Талисман', 'Печать', 'Оберег', 'Медальон'],
};

export const RARITY_PREFIX_POOL: Record<ItemRarity, string[]> = {
  [ItemRarity.COMMON]: ['Простой', 'Грубый', 'Ветхий'],
  [ItemRarity.MAGIC]: ['Заряженный', 'Сияющий', 'Зачарованный'],
  [ItemRarity.RARE]: ['Редкий', 'Хищный', 'Стальной'],
  [ItemRarity.EPIC]: ['Эпохальный', 'Демонический', 'Драконий'],
  [ItemRarity.LEGENDARY]: ['Легендарный', 'Божественный', 'Вечный'],
};

export type AffixKey = 'attack' | 'defense' | 'maxHp' | 'maxMana' | 'critChance' | 'critMultiplier' | 'luck';

export const SLOT_AFFIX_POOL: Record<ItemSlot, AffixKey[]> = {
  [ItemSlot.WEAPON]: ['attack', 'critChance', 'critMultiplier', 'luck'],
  [ItemSlot.ARMOR]: ['defense', 'maxHp', 'maxMana', 'luck'],
  [ItemSlot.TRINKET]: ['maxHp', 'maxMana', 'critChance', 'luck', 'attack', 'defense'],
};

export const AFFIX_BASE_VALUE: Record<AffixKey, number> = {
  attack: 2.2,
  defense: 1.4,
  maxHp: 9,
  maxMana: 7,
  critChance: 0.03,
  critMultiplier: 0.08,
  luck: 1.6,
};
