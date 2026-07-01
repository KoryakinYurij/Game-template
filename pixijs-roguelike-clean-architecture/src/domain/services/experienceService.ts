import { xpToNextLevel, CLASS_DEFINITIONS } from '../data/classDefinitions';
import { PlayerCharacter } from '../entities/character';
import { ClassType } from '../types';

export interface XpGainResult {
  player: PlayerCharacter;
  levelsGained: number;
}

export function applyXpGain(player: PlayerCharacter, xpGained: number): XpGainResult {
  let { level, xp, xpToNext, baseStats } = player;
  let levelsGained = 0;
  xp += xpGained;
  const growth = CLASS_DEFINITIONS[player.classType as ClassType].growthPerLevel;

  while (xp >= xpToNext) {
    xp -= xpToNext;
    level += 1;
    levelsGained += 1;
    baseStats = {
      ...baseStats,
      maxHp: Math.round(baseStats.maxHp + (growth.maxHp ?? 0)),
      maxMana: Math.round(baseStats.maxMana + (growth.maxMana ?? 0)),
      attack: Math.round((baseStats.attack + (growth.attack ?? 0)) * 10) / 10,
      defense: Math.round((baseStats.defense + (growth.defense ?? 0)) * 10) / 10,
      hp: baseStats.maxHp + (growth.maxHp ?? 0),
      mana: baseStats.maxMana + (growth.maxMana ?? 0),
    };
    xpToNext = xpToNextLevel(level);
  }

  return {
    player: { ...player, level, xp, xpToNext, baseStats },
    levelsGained,
  };
}
