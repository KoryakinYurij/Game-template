import { xpToNextLevel, CLASS_DEFINITIONS } from '../../domain/data/classDefinitions';
import { PlayerCharacter } from '../../domain/entities/character';
import { addStatBonuses, ClassType, StatBonuses } from '../../domain/types';

export function createPlayerCharacter(
  classType: ClassType,
  metaBonuses: StatBonuses,
  position: { x: number; y: number },
): PlayerCharacter {
  const def = CLASS_DEFINITIONS[classType];
  // #6: reuse the domain helper instead of re-listing every stat field by hand.
  const baseStats = addStatBonuses(def.baseStats, [metaBonuses]);
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
