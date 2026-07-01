// ============================================================================
// PRESENTATION LAYER — derives the concrete screen from ONE source of truth.
//
// The game store's lifecycle status is authoritative for the gameplay screens:
//   status 'playing' -> 'playing'
//   status 'dead'    -> 'game-over'   (death auto-routes; no effect bridge)
//   status 'idle'    -> the user's chosen idle screen (menu/class-select/hub)
//
// Replaces App.tsx's former local useState('menu') + useEffect bridge.
// ============================================================================

import { useGameStore } from '../../application/game/gameStore';
import { useNavigationStore, IdleScreen } from '../navigation/navigationStore';

export type Screen = IdleScreen | 'playing' | 'game-over';

export function useCurrentScreen(): Screen {
  const status = useGameStore((s) => s.status);
  const idleScreen = useNavigationStore((s) => s.idleScreen);
  if (status === 'playing') return 'playing';
  if (status === 'dead') return 'game-over';
  return idleScreen;
}
