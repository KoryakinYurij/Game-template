// ============================================================================
// apply-immer.mjs — closes task #5 (immer dependency installed but unused).
//
// Run from the REPOSITORY ROOT (the folder that contains
// `pixijs-roguelike-clean-architecture/`), AFTER apply-refactor.mjs (#1/#2)
// and apply-navigation.mjs (#4):
//
//     node apply-immer.mjs
//
// What it does:
//   - Wires zustand's `immer` middleware into all three stores.
//   - navigationStore + metaStore: full rewrite using immer DRAFT mutations
//     (immer is now genuinely exercised, and the verbose spreads are gone).
//   - gameStore: SURGICAL wrap of `create(...)` -> `create<T>()(immer(...))`.
//     Behaviour-preserving: zustand v5 shallow-merges by default, so every
//     existing `set((prev) => ({...}))` / `set((prev) => finalizeTurn(...))`
//     keeps working unchanged. (Their spreads can be converted to draft
//     mutations later, as part of #3's turnService refactor.)
//
// Note: this script SUPERSEDES the metaStore.ts produced by apply-refactor.mjs
// (same DI design + immer). Idempotent. Safe to re-run.
// ============================================================================

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'pixijs-roguelike-clean-architecture';
const SRC = join(ROOT, 'src');

if (!existsSync(join(SRC, 'App.tsx'))) {
  console.error(`\n✗ Could not find '${SRC}/App.tsx'.\n  Run this script from the repository root (the folder that contains '${ROOT}/').`);
  process.exit(1);
}

const write = (rel, content) => {
  writeFileSync(join(SRC, rel), content, 'utf8');
  console.log(`✓ wrote  ${join(SRC, rel)}`);
};

// ---------------------------------------------------------------------------
// 1) navigationStore.ts — full rewrite with immer + draft mutations.
//    (Created originally by apply-navigation.mjs; this adds immer.)
// ---------------------------------------------------------------------------
write('presentation/navigation/navigationStore.ts', `// ============================================================================
// PRESENTATION LAYER — navigation state (immer-backed).
//
// Holds ONLY the screen chosen while idle ('menu' | 'class-select' | 'hub').
// 'playing' / 'game-over' are derived elsewhere (see useCurrentScreen.ts), so
// this is not a second source of truth for them.
// ============================================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware';

export type IdleScreen = 'menu' | 'class-select' | 'hub';

interface NavigationState {
  idleScreen: IdleScreen;
  goToMenu: () => void;
  goToClassSelect: () => void;
  goToHub: () => void;
}

export const useNavigationStore = create<NavigationState>()(
  immer((set) => ({
    idleScreen: 'menu',
    // Draft mutations: immer produces the immutable next state for us.
    goToMenu: () =>
      set((state) => {
        state.idleScreen = 'menu';
      }),
    goToClassSelect: () =>
      set((state) => {
        state.idleScreen = 'class-select';
      }),
    goToHub: () =>
      set((state) => {
        state.idleScreen = 'hub';
      }),
  })),
);
`);

// ---------------------------------------------------------------------------
// 2) metaStore.ts — full rewrite with immer + draft mutations.
//    (Supersedes apply-refactor.mjs's metaStore: same IMetaRepository DI,
//     now exercised through immer drafts instead of manual spreads.)
// ---------------------------------------------------------------------------
write('application/meta/metaStore.ts', `import { create, StoreApi, UseBoundStore } from 'zustand';
import { immer } from 'zustand/middleware';
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
// are live bindings, every consumer that does \`import { useMetaStore }\` sees
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
`);

// ---------------------------------------------------------------------------
// 3) gameStore.ts — surgical immer wrap (behaviour-preserving).
//    We only touch the import + the create() wrapper; all internal logic,
//    including the parts of the file we cannot see, stays byte-for-byte intact.
// ---------------------------------------------------------------------------
const gamePath = join(SRC, 'application/game/gameStore.ts');
let game = readFileSync(gamePath, 'utf8');

if (game.includes('zustand/middleware')) {
  console.log(`• skip   ${gamePath} already uses immer middleware`);
} else {
  // 3a. add the immer import right after the zustand create import
  if (!game.includes("import { immer } from 'zustand/middleware'")) {
    const before = "import { create } from 'zustand';";
    const after = `${before}\nimport { immer } from 'zustand/middleware';`;
    if (game.includes(before)) {
      game = game.split(before).join(after);
    } else {
      // fallback: prepend if the create import differs slightly
      game = `import { immer } from 'zustand/middleware';\n` + game;
    }
  }

  // 3b. wrap the create() opening:
  //     create<T>((set, get) => ({   ->   create<T>()(immer((set, get) => ({
  //     (generic is optional; regex handles both `create<T>` and bare `create`)
  const openingRe = /export const useGameStore = create(<[^>]*>)?\s*\(\(set, get\) => \(\{/;
  if (!openingRe.test(game)) {
    console.warn(`⚠ Could not find the expected create() opening in gameStore.ts.\n  Please report the exact first line of the store so the regex can be fixed.`);
  } else {
    game = game.replace(openingRe, (_m, generic) => {
      const g = generic || '';
      return `export const useGameStore = create${g}()(immer((set, get) => ({`;
    });
  }

  // 3c. wrap the create() closing. The store object + create call are the LAST
  //     thing in the file, so anchor to end-of-string. `}));` -> `})));`
  //     (one extra paren to close the immer() wrapper).
  const closingRe = /\}\)\);(\s*)$/;
  if (!closingRe.test(game)) {
    console.warn(`⚠ Could not find the file-ending })); in gameStore.ts.\n  The create() call may not be the last statement — manual review needed.`);
  } else {
    // Build the immer closing "})));" from pieces so the paren count is
    // unambiguous:  }  +  ))  +  )  +  ;   ->   })));
    game = game.replace(closingRe, (_full, ws) => '}' + '))' + ')' + ';' + ws);
  }

  writeFileSync(gamePath, game, 'utf8');
  console.log(`✓ edited ${gamePath}  (immer middleware wired)`);
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------
const checks = [
  ['presentation/navigation/navigationStore.ts', 'create<NavigationState>()'],
  ['application/meta/metaStore.ts', 'create<MetaStoreState>()'],
  ['application/game/gameStore.ts', 'immer((set, get)'],
];
console.log('\nVerification:');
let ok = true;
for (const [rel, needle] of checks) {
  const present = readFileSync(join(SRC, rel), 'utf8').includes(needle);
  console.log(`  ${present ? '✓' : '✗'}  ${rel}  ${present ? 'immer wired' : 'IMMER NOT FOUND'}`);
  if (!present) ok = false;
}
console.log(ok ? '\n✓ All three stores use the immer middleware.' : '\n⚠ At least one store was not wired — see warnings above.');
console.log('\nDone. Next:\n  cd pixijs-roguelike-clean-architecture && npm run build\n  git add -A && git commit');
