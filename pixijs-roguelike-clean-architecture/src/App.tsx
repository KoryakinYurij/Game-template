import { useEffect, useState } from 'react';
import { useGameStore } from './application/game/gameStore';
import { MainMenuScreen } from './presentation/components/screens/MainMenuScreen';
import { ClassSelectScreen } from './presentation/components/screens/ClassSelectScreen';
import { HubScreen } from './presentation/components/screens/HubScreen';
import { PlayScreen } from './presentation/components/screens/PlayScreen';
import { GameOverScreen } from './presentation/components/screens/GameOverScreen';

type Screen = 'menu' | 'class-select' | 'hub' | 'playing' | 'game-over';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const status = useGameStore((s) => s.status);

  useEffect(() => {
    if (status === 'dead' && screen === 'playing') {
      setScreen('game-over');
    }
  }, [status, screen]);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      {screen === 'menu' && <MainMenuScreen onPlay={() => setScreen('class-select')} onHub={() => setScreen('hub')} />}
      {screen === 'class-select' && (
        <ClassSelectScreen onBack={() => setScreen('menu')} onStart={() => setScreen('playing')} />
      )}
      {screen === 'hub' && <HubScreen onBack={() => setScreen('menu')} />}
      {screen === 'playing' && (
        <PlayScreen
          onAbandon={() => {
            useGameStore.getState().returnToHub();
            setScreen('menu');
          }}
        />
      )}
      {screen === 'game-over' && (
        <GameOverScreen onRetry={() => setScreen('class-select')} onHub={() => setScreen('hub')} />
      )}
    </div>
  );
}
