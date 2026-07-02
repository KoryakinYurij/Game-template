import { create, StoreApi, UseBoundStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CLASS_UNLOCK_COST, costForUpgradeLevel, META_UPGRADES } from '../../domain/data/metaUpgradeCatalog';
import { IMetaRepository, MetaProgressState } from '../../domain/repositories/metaRepository';
import { RunSummary, computeEssenceReward, computeMetaBonusStats } from '../../domain/services/metaProgressionService';
import { ClassType, StatBonuses } from '../../domain/types';

/**
 * Application-layer contract for the meta progression store.
 *
 * Created through createMetaStore(repository) so the application depends on
 * the domain's IMetaRepository abstraction, NOT on any concrete adapter. The
 * concrete adapter is injected once at the composition root (main.tsx).
 * Backed by the immer middleware, so actions mutate a draft directly.
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
  const persist = (state: MetaProgressState) => repository.save(state);

  return create<MetaStoreState>()(
    immer((set, get) => ({
      ...repository.load(),

      purchaseUpgrade: (id: string) => {
        const def = META_UPGRADES.find((u) => u.id === id);
        if (!def) return false;
        const currentLevel = get().upgrades[id] ?? 0;
        if (currentLevel >= def.maxLevel) return false;
        const cost = costForUpgradeLevel(def, currentLevel);
        if (get().essence < cost) return false;
        set((state) => {
          state.essence -= cost;
          state.upgrades[id] = currentLevel + 1;
        });
        persist(get());
        return true;
      },

      unlockClass: (classType: ClassType) => {
        if (get().unlockedClasses.includes(classType)) return false;
        const cost = CLASS_UNLOCK_COST[classType];
        if (get().essence < cost) return false;
        set((state) => {
          state.essence -= cost;
          state.unlockedClasses.push(classType);
        });
        persist(get());
        return true;
      },

      applyRunResult: (summary: RunSummary) => {
        const essenceEarned = computeEssenceReward(summary);
        set((state) => {
          state.essence += essenceEarned;
          state.totalRuns += 1;
          state.bestFloor = Math.max(state.bestFloor, summary.floorReached);
          state.totalKills += summary.kills;
        });
        persist(get());
        return essenceEarned;
      },

      getBonusStats: () => computeMetaBonusStats(get().upgrades),

      resetProgress: () => {
        repository.reset();
        set(repository.load());
      },
    })),
  );
}

// ---------------------------------------------------------------------------
// Singleton live-binding. useMetaStore is assigned by initMetaStore(...) at the
// composition root (main.tsx) before React renders. Because ES module imports
// are live bindings, every consumer that does `import { useMetaStore }` sees
// the initialized store when it actually calls it. Consumers need NO changes.
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
