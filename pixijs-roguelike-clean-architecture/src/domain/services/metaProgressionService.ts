import { META_UPGRADES } from '../data/metaUpgradeCatalog';
import { StatBonuses } from '../types';

export interface RunSummary {
  floorReached: number;
  kills: number;
  bossKills: number;
  goldCollected: number;
  survived: boolean;
}

export function computeEssenceReward(summary: RunSummary): number {
  const base =
    summary.floorReached * 14 +
    summary.kills * 2.5 +
    summary.bossKills * 45 +
    Math.floor(summary.goldCollected * 0.12);
  return Math.max(5, Math.round(base));
}

export function computeMetaBonusStats(upgrades: Record<string, number>): StatBonuses {
  const result: StatBonuses = {};
  for (const def of META_UPGRADES) {
    const level = upgrades[def.id] ?? 0;
    if (level <= 0) continue;
    for (const [key, value] of Object.entries(def.effectPerLevel)) {
      const k = key as keyof StatBonuses;
      result[k] = (result[k] ?? 0) + (value as number) * level;
    }
  }
  return result;
}
