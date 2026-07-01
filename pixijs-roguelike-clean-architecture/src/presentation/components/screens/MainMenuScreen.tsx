import { useMetaStore } from '../../../application/meta/metaStore';
import { Button } from '../common/Button';
import { Panel } from '../common/Panel';

interface Props {
  onPlay: () => void;
  onHub: () => void;
}

export function MainMenuScreen({ onPlay, onHub }: Props) {
  const essence = useMetaStore((s) => s.essence);
  const bestFloor = useMetaStore((s) => s.bestFloor);
  const totalRuns = useMetaStore((s) => s.totalRuns);

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/images/menu-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <Panel className="relative z-10 w-full max-w-md p-8 text-center">
        <h1 className="mb-1 text-4xl font-black tracking-tight text-amber-300 drop-shadow">Подземелья Пепла</h1>
        <p className="mb-6 text-sm text-slate-300">Пиксельный рогалик с глубокой мета-прогрессией</p>

        <div className="mb-6 grid grid-cols-3 gap-2 text-center text-xs text-slate-300">
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-2">
            <div className="text-lg font-bold text-amber-300">✨ {essence}</div>
            <div>Эссенция</div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-2">
            <div className="text-lg font-bold text-amber-300">{bestFloor}</div>
            <div>Лучший этаж</div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-2">
            <div className="text-lg font-bold text-amber-300">{totalRuns}</div>
            <div>Экспедиций</div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={onPlay}>
            ⚔️ Начать экспедицию
          </Button>
          <Button size="lg" variant="secondary" onClick={onHub}>
            🏕️ Убежище (прокачка)
          </Button>
        </div>
      </Panel>
    </div>
  );
}
