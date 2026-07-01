import { create, StoreApi, UseBoundStore } from 'zustand';
import { CLASS_UNLOCK_COST, costForUpgradeLevel, META_UPGRADES } from '../../domain/data/metaUpgradeCatalog';
import { IMetaRepository, MetaProgressState } from '../../domain/repositories/metaRepository';
import { RunSummary, computeEssenceReward, computeMetaBonusStats } from '../../domain/services/metaProgressionService';
import { ClassType, StatBonuses } from '../../domain/types';

/**
 * Application-layer contract for the meta progression store.
 *
 * IMPORTANT: this store is created through createMetaStore(repository) so the
 * application depends on the domain's IMetaRepository abstraction, NOT on any
 * concrete adapter (localStorage, IndexedDB, remote API, in-memory test stub…).
 * The concrete adapter is injected once at the composition root (main.tsx).
 */
interface MetaStoreState extends MetaProgressState {
  purchaseUpgrade: (id: string) => boolean;
  unlockClass: (classType: ClassType) => boolean;
  applyRunResult: (summary: RunSummary) => number;
  getBonusStats: () => StatBonuses;
  resetProgress: () => void;
}

export type MetaStore = UseBoundStore<StoreApi<MetaStoreState>>;

/** Builds a meta store bound to a concrete repository implementation. Pure wiring. */
export function createMetaStore(repository: IMetaRepository): MetaStore {
  function persist(state: MetaProgressState) {
    repository.save(state);
  }

  return create<MetaStoreState>((set, get) => ({
    ...repository.load(),

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
      repository.reset();
      const fresh = repository.load();
      set(fresh);
    },
  }));
}

// ---------------------------------------------------------------------------
// Singleton live-binding.
//
// useMetaStore is assigned by initMetaStore(...) at the composition root, which
// runs synchronously before React renders. Because ES module imports are live
// bindings, every consumer that does `import { useMetaStore }` sees the
// initialized store by the time they actually call it (during render or inside
// an action). Consumers therefore need NO changes.
//
// The definite-assignment assertion is intentional: misuse is guarded at
// runtime by getMetaStore() with a clear error.
// ---------------------------------------------------------------------------

export let useMetaStore: MetaStore = undefined as unknown as MetaStore;

export function initMetaStore(repository: IMetaRepository): MetaStore {
  useMetaStore = createMetaStore(repository);
  return useMetaStore;
}

/** Safe accessor that fails loudly if the store was not initialized. */
export function getMetaStore(): MetaStore {
  if (!useMetaStore) {
    throw new Error(
      'Meta store is not initialized. Call initMetaStore(repository) at the composition root (main.tsx) before rendering.',
    );
  }
  return useMetaStore;
}
