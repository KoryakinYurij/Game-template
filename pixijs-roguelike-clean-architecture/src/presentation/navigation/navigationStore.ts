// ============================================================================
// PRESENTATION LAYER — navigation state (immer-backed).
//
// Holds ONLY the screen chosen while idle ('menu' | 'class-select' | 'hub').
// 'playing' / 'game-over' are derived elsewhere (see useCurrentScreen.ts), so
// this is not a second source of truth for them.
// ============================================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

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
