import { useEffect } from 'react';
import { useGameStore } from '../../application/game/gameStore';

export function useKeyboardControls(enabled: boolean) {
  const move = useGameStore((s) => s.move);
  const useAbility = useGameStore((s) => s.useAbility);
  const usePotion = useGameStore((s) => s.usePotion);

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          e.preventDefault();
          move(0, -1);
          break;
        case 'arrowdown':
        case 's':
          e.preventDefault();
          move(0, 1);
          break;
        case 'arrowleft':
        case 'a':
          e.preventDefault();
          move(-1, 0);
          break;
        case 'arrowright':
        case 'd':
          e.preventDefault();
          move(1, 0);
          break;
        case 'q':
        case ' ':
          e.preventDefault();
          useAbility();
          break;
        case 'h':
          e.preventDefault();
          usePotion();
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, move, useAbility, usePotion]);
}
