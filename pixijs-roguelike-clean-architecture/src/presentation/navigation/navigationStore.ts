// ============================================================================
// PRESENTATION LAYER — navigation state.
//
// Holds ONLY the screen the user selected while the game is idle
// ('menu' | 'class-select' | 'hub'). The 'playing' and 'game-over' screens are
// intentionally NOT stored here: they are DERIVED from the game store's
// lifecycle status (see presentation/hooks/useCurrentScreen.ts).
//
// This is what removes App.tsx's former dual source of truth — the old local
// useState('menu') that had to be bridged to game status via a useEffect.
// ============================================================================

import { create } from 'zustand';

export type IdleScreen = 'menu' | 'class-select' | 'hub';

interface NavigationState {
  idleScreen: IdleScreen;
  goToMenu: () => void;
  goToClassSelect: () => void;
  goToHub: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  idleScreen: 'menu',
  goToMenu: () => set({ idleScreen: 'menu' }),
  goToClassSelect: () => set({ idleScreen: 'class-select' }),
  goToHub: () => set({ idleScreen: 'hub' }),
}));
