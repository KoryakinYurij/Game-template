// #1 fix: RNG now lives in the domain — no more infrastructure import here.
import { RNG } from './rng';
// #3 fix: combat "magic numbers" sourced from central config.
import { DAMAGE_VARIANCE_MIN, DAMAGE_VARIANCE_RANGE, DEFAULT_IGNORE_DEFENSE_RATIO } from '../config';
import { Stats } from '../types';

export interface AttackResult {
  damage: number;
  isCrit: boolean;
  targetDied: boolean;
}

export function resolveAttack(
  attacker: Stats,
  defender: Stats,
  rng: RNG,
  options?: { guaranteedCrit?: boolean; flatMultiplier?: number; ignoreDefenseRatio?: number },
): AttackResult {
  const isCrit = options?.guaranteedCrit || rng.chance(attacker.critChance);
  const defenseReduction = defender.defense * (options?.ignoreDefenseRatio ?? DEFAULT_IGNORE_DEFENSE_RATIO);
  let raw = Math.max(1, attacker.attack - defenseReduction);
  if (options?.flatMultiplier) raw *= options.flatMultiplier;
  if (isCrit) raw *= attacker.critMultiplier;
  const variance = DAMAGE_VARIANCE_MIN + rng.next() * DAMAGE_VARIANCE_RANGE;
  const damage = Math.max(1, Math.round(raw * variance));
  const targetDied = defender.hp - damage <= 0;
  return { damage, isCrit, targetDied };
}
