import { useGameStore } from '../../../application/game/gameStore';
import { CLASS_DEFINITIONS } from '../../../domain/data/classDefinitions';
import { Button } from '../common/Button';
import { Panel } from '../common/Panel';

export function GameOverScreen({ onRetry, onHub }: { onRetry: () => void; onHub: () => void }) {
  const player = useGameStore((s) => s.player);
  const floor = useGameStore((s) => s.floor);
  const kills = useGameStore((s) => s.kills);
  const goldCollected = useGameStore((s) => s.goldCollected);
  const lastEssenceEarned = useGameStore((s) => s.lastEssenceEarned);
  const returnToHub = useGameStore((s) => s.returnToHub);

  if (!player || !floor) return null;
  const def = CLASS_DEFINITIONS[player.classType];

  function handle(nav: () => void) {
    returnToHub();
    nav();
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-rose-950/40 via-slate-950 to-black p-4">
      <Panel className="w-full max-w-md p-8 text-center">
        <div className="mb-3 text-5xl">💀</div>
        <h2 className="mb-1 text-2xl font-bold text-rose-400">Экспедиция окончена</h2>
        <p className="mb-6 text-sm text-slate-400">
          {def.icon} {def.name} пал(а) на {floor.level} этаже, достигнув {player.level} уровня.
        </p>

        <div className="mb-6 grid grid-cols-3 gap-2 text-xs text-slate-300">
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-2">
            <div className="text-lg font-bold text-amber-300">{floor.level}</div>Этаж
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-2">
            <div className="text-lg font-bold text-amber-300">{kills}</div>Убито
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-2">
            <div className="text-lg font-bold text-amber-300">{goldCollected}</div>Золото
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-amber-300">
          <span className="text-2xl font-bold">+{lastEssenceEarned}</span> ✨ эссенции получено
        </div>

        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={() => handle(onRetry)}>
            ⚔️ Новая экспедиция
          </Button>
          <Button size="lg" variant="secondary" onClick={() => handle(onHub)}>
            🏕️ В убежище (потратить эссенцию)
          </Button>
        </div>
      </Panel>
    </div>
  );
}
