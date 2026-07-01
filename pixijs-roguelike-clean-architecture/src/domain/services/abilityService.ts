import { RNG } from './rng';
import { CLASS_DEFINITIONS } from '../data/classDefinitions';
import { EnemyEntity } from '../entities/enemy';
import { ClassType, chebyshevDistance, Position, Stats } from '../types';
import { resolveAttack } from './combatService';

export interface AbilityHit {
  enemyId: string;
  damage: number;
  isCrit: boolean;
}

export interface AbilityOutcome {
  success: boolean;
  message: string;
  manaCost: number;
  hits: AbilityHit[];
  selfHeal: number;
}

export function canUseAbility(playerStats: Stats, cooldownRemaining: number, classType: ClassType): { ok: boolean; reason?: string } {
  const def = CLASS_DEFINITIONS[classType].ability;
  if (cooldownRemaining > 0) return { ok: false, reason: `Способность перезаряжается (${cooldownRemaining})` };
  if (playerStats.mana < def.manaCost) return { ok: false, reason: 'Недостаточно маны' };
  return { ok: true };
}

export function executeAbility(
  classType: ClassType,
  playerStats: Stats,
  playerPosition: Position,
  enemies: EnemyEntity[],
  rng: RNG,
): AbilityOutcome {
  const def = CLASS_DEFINITIONS[classType].ability;
  if (playerStats.mana < def.manaCost) {
    return { success: false, message: 'Недостаточно маны для способности!', manaCost: 0, hits: [], selfHeal: 0 };
  }

  const hits: AbilityHit[] = [];
  let selfHeal = 0;

  switch (def.id) {
    case 'whirlwind': {
      const targets = enemies.filter((e) => chebyshevDistance(e.position, playerPosition) <= 1);
      for (const enemy of targets) {
        const result = resolveAttack(playerStats, enemy.stats, rng, { flatMultiplier: 1.15 });
        hits.push({ enemyId: enemy.id, damage: result.damage, isCrit: result.isCrit });
      }
      break;
    }
    case 'fireball': {
      const inRange = enemies
        .filter((e) => chebyshevDistance(e.position, playerPosition) <= 5)
        .sort((a, b) => chebyshevDistance(a.position, playerPosition) - chebyshevDistance(b.position, playerPosition));
      const primary = inRange[0];
      if (primary) {
        const splashTargets = enemies.filter((e) => chebyshevDistance(e.position, primary.position) <= 1);
        for (const enemy of splashTargets) {
          const result = resolveAttack(playerStats, enemy.stats, rng, { flatMultiplier: 2.1, ignoreDefenseRatio: 0.3 });
          hits.push({ enemyId: enemy.id, damage: result.damage, isCrit: result.isCrit });
        }
      }
      break;
    }
    case 'fan_of_knives': {
      const targets = enemies.filter((e) => chebyshevDistance(e.position, playerPosition) <= 2);
      for (const enemy of targets) {
        const result = resolveAttack(playerStats, enemy.stats, rng, { guaranteedCrit: true, flatMultiplier: 0.85 });
        hits.push({ enemyId: enemy.id, damage: result.damage, isCrit: result.isCrit });
      }
      break;
    }
    case 'holy_nova': {
      selfHeal = Math.round(playerStats.maxHp * 0.25);
      const targets = enemies.filter((e) => chebyshevDistance(e.position, playerPosition) <= 1);
      for (const enemy of targets) {
        const result = resolveAttack(playerStats, enemy.stats, rng, { flatMultiplier: 1.0 });
        hits.push({ enemyId: enemy.id, damage: result.damage, isCrit: result.isCrit });
      }
      break;
    }
  }

  const message =
    hits.length > 0
      ? `${def.icon} ${def.name} поражает ${hits.length} враг(ов)!`
      : `${def.icon} ${def.name} применена, но целей рядом не было.`;

  return { success: true, message, manaCost: def.manaCost, hits, selfHeal };
}
