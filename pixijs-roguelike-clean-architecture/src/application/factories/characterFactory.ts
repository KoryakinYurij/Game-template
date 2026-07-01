import { xpToNextLevel, CLASS_DEFINITIONS } from '../../domain/data/classDefinitions';
import { PlayerCharacter } from '../../domain/entities/character';
import { ClassType, StatBonuses } from '../../domain/types';

export function createPlayerCharacter(
  classType: ClassType,
  metaBonuses: StatBonuses,
  position: { x: number; y: number },
): PlayerCharacter {
  const def = CLASS_DEFINITIONS[classType];
  const baseStats = { ...def.baseStats };
  baseStats.maxHp += metaBonuses.maxHp ?? 0;
  baseStats.maxMana += metaBonuses.maxMana ?? 0;
  baseStats.attack += metaBonuses.attack ?? 0;
  baseStats.defense += metaBonuses.defense ?? 0;
  baseStats.critChance += metaBonuses.critChance ?? 0;
  baseStats.critMultiplier += metaBonuses.critMultiplier ?? 0;
  baseStats.luck += metaBonuses.luck ?? 0;
  baseStats.hp = baseStats.maxHp;
  baseStats.mana = baseStats.maxMana;

  return {
    classType,
    level: 1,
    xp: 0,
    xpToNext: xpToNextLevel(1),
    baseStats,
    position: { ...position },
    equipment: { weapon: null, armor: null, trinket: null },
    inventory: [],
    gold: 0,
    potions: 1,
    ability: { cooldownRemaining: 0 },
    kills: 0,
  };
}
