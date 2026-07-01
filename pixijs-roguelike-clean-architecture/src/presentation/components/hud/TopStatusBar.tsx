import { PlayerCharacter } from '../../../domain/entities/character';
import { DungeonFloor } from '../../../domain/entities/dungeon';
import { CLASS_DEFINITIONS } from '../../../domain/data/classDefinitions';
import { Button } from '../common/Button';

interface Props {
  player: PlayerCharacter;
  floor: DungeonFloor;
  turn: number;
  onOpenInventory: () => void;
  onAbandon: () => void;
}

export function TopStatusBar({ player, floor, turn, onOpenInventory, onAbandon }: Props) {
  const def = CLASS_DEFINITIONS[player.classType];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2 font-semibold text-slate-100">
        <span className="text-xl">{def.icon}</span>
        <span>{def.name}</span>
        <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs">Ур. {player.level}</span>
      </div>
      <div className="flex items-center gap-4 text-slate-300">
        <span>🗺️ Этаж {floor.level}</span>
        <span>💰 {player.gold}</span>
        <span>⏱️ Ход {turn}</span>
        <span className="hidden sm:inline">
          XP {player.xp}/{player.xpToNext}
        </span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={onOpenInventory}>
          🎒 Инвентарь
        </Button>
        <Button size="sm" variant="danger" onClick={onAbandon}>
          🚪 Сбежать
        </Button>
      </div>
    </div>
  );
}
