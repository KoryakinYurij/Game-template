import { create } from 'zustand';
import { CLASS_UNLOCK_COST, costForUpgradeLevel, META_UPGRADES } from '../../domain/data/metaUpgradeCatalog';
import { metaRepository } from '../../infrastructure/persistence/localStorageMetaRepository';
import { MetaProgressState } from '../../domain/repositories/metaRepository';
import { computeMetaBonusStats, RunSummary, computeEssenceReward } from '../../domain/services/metaProgressionService';
import { ClassType, StatBonuses } from '../../domain/types';

interface MetaStoreState extends MetaProgressState {
  purchaseUpgrade: (id: string) => boolean;
  unlockClass: (classType: ClassType) => boolean;
  applyRunResult: (summary: RunSummary) => number;
  getBonusStats: () => StatBonuses;
  resetProgress: () => void;
}

function persist(state: MetaProgressState) {
  metaRepository.save(state);
}

export const useMetaStore = create<MetaStoreState>((set, get) => ({
  ...metaRepository.load(),

  purchaseUpgrade: (id: string) => {
    const def = META_UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    const state = get();
    const currentLevel = state.upgrades[id] ?? 0;
    if (currentLevel >= def.maxLevel) return false;
    const cost = costForUpgradeLevel(def, currentLevel);
    if (state.essence < cost) return false;
    const next: MetaProgressState = {
      ...state,
      essence: state.essence - cost,
      upgrades: { ...state.upgrades, [id]: currentLevel + 1 },
    };
    persist(next);
    set(next);
    return true;
  },

  unlockClass: (classType: ClassType) => {
    const state = get();
    if (state.unlockedClasses.includes(classType)) return false;
    const cost = CLASS_UNLOCK_COST[classType];
    if (state.essence < cost) return false;
    const next: MetaProgressState = {
      ...state,
      essence: state.essence - cost,
      unlockedClasses: [...state.unlockedClasses, classType],
    };
    persist(next);
    set(next);
    return true;
  },

  applyRunResult: (summary: RunSummary) => {
    const state = get();
    const essenceEarned = computeEssenceReward(summary);
    const next: MetaProgressState = {
      ...state,
      essence: state.essence + essenceEarned,
      totalRuns: state.totalRuns + 1,
      bestFloor: Math.max(state.bestFloor, summary.floorReached),
      totalKills: state.totalKills + summary.kills,
    };
    persist(next);
    set(next);
    return essenceEarned;
  },

  getBonusStats: () => computeMetaBonusStats(get().upgrades),

  resetProgress: () => {
    metaRepository.reset();
    const fresh = metaRepository.load();
    set(fresh);
  },
}));
