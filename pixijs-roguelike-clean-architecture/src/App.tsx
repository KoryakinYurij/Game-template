import { useGameStore } from './application/game/gameStore';
import { useNavigationStore } from './presentation/navigation/navigationStore';
import { useCurrentScreen } from './presentation/hooks/useCurrentScreen';
import { MainMenuScreen } from './presentation/components/screens/MainMenuScreen';
import { ClassSelectScreen } from './presentation/components/screens/ClassSelectScreen';
import { HubScreen } from './presentation/components/screens/HubScreen';
import { PlayScreen } from './presentation/components/screens/PlayScreen';
import { GameOverScreen } from './presentation/components/screens/GameOverScreen';

export default function App() {
  // Single source of truth: the screen is DERIVED from game status + the
  // user's idle selection. No more local useState / useEffect bridge.
  const screen = useCurrentScreen();
  const goToMenu = useNavigationStore((s) => s.goToMenu);
  const goToClassSelect = useNavigationStore((s) => s.goToClassSelect);
  const goToHub = useNavigationStore((s) => s.goToHub);
  const returnToHub = useGameStore((s) => s.returnToHub);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      {screen === 'menu' && <MainMenuScreen onPlay={goToClassSelect} onHub={goToHub} />}

      {screen === 'class-select' && (
        // ClassSelectScreen.handleStart() already calls startRun(), which flips
        // status to 'playing' — useCurrentScreen then resolves to the 'playing'
        // screen automatically, so onStart is a deliberate no-op here.
        <ClassSelectScreen onBack={goToMenu} onStart={() => {}} />
      )}

      {screen === 'hub' && <HubScreen onBack={goToMenu} />}

      {screen === 'playing' && (
        <PlayScreen
          onAbandon={() => {
            returnToHub(); // -> status 'idle'
            goToMenu();
          }}
        />
      )}

      {screen === 'game-over' && (
        // GameOverScreen.handle(nav) calls returnToHub() (-> status 'idle')
        // BEFORE invoking onRetry/onHub, so the derived screen then resolves
        // to the user's chosen idle screen. No reset logic needed here.
        <GameOverScreen onRetry={goToClassSelect} onHub={goToHub} />
      )}
    </div>
  );
}
