import { describe, it, expect } from 'vitest';
import { applyXpGain } from '../experienceService';
import { PlayerCharacter } from '../../entities/character';
import { ClassType } from '../../types';
import { CLASS_DEFINITIONS } from '../../data/classDefinitions';

describe('experienceService', () => {
  it('applyXpGain calculates level ups', () => {
    const player: PlayerCharacter = {
      classType: ClassType.WARRIOR,
      position: { x: 0, y: 0 },
      baseStats: { ...CLASS_DEFINITIONS[ClassType.WARRIOR].baseStats },
      equipment: { weapon: null, armor: null, trinket: null },
      inventory: [],
      potions: 0,
      gold: 0,
      xp: 0,
      level: 1,
      kills: 0,
      xpToNext: 100,
      ability: { cooldownRemaining: 0 }
    };

    // Test xp gain without leveling up
    const result1 = applyXpGain(player, 50);
    expect(result1.player.xp).toBe(50);
    expect(result1.levelsGained).toBe(0);
    expect(result1.player.level).toBe(1);

    // Test leveling up
    const result2 = applyXpGain(player, 150);
    expect(result2.levelsGained).toBe(1);
    expect(result2.player.level).toBe(2);
    expect(result2.player.xp).toBe(50); // 150 - 100
  });
});
