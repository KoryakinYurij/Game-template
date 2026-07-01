import { ItemRarity, ItemSlot, StatBonuses } from '../types';

export interface Item {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  icon: string;
  bonuses: StatBonuses;
  goldValue: number;
  levelFound: number;
}
