import { AbilityDefinition } from '../../../domain/data/classDefinitions';
import { cn } from '../../../utils/cn';

interface AbilityBarProps {
  ability: AbilityDefinition;
  cooldownRemaining: number;
  mana: number;
  potions: number;
  onUseAbility: () => void;
  onUsePotion: () => void;
}

export function AbilityBar({ ability, cooldownRemaining, mana, potions, onUseAbility, onUsePotion }: AbilityBarProps) {
  const abilityReady = cooldownRemaining <= 0 && mana >= ability.manaCost;
  return (
    <div className="flex gap-2">
      <button
        onClick={onUseAbility}
        disabled={!abilityReady}
        title={ability.description}
        className={cn(
          'relative flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all',
          abilityReady
            ? 'border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/20'
            : 'border-slate-700 bg-slate-800/50 opacity-60',
        )}
      >
        <span className="text-xl">{ability.icon}</span>
        <span className="flex-1">
          <div className="text-xs font-semibold text-slate-100">
            [{ability.key}] {ability.name}
          </div>
          <div className="text-[10px] text-slate-400">
            {cooldownRemaining > 0 ? `Перезарядка: ${cooldownRemaining}` : `Мана: ${ability.manaCost}`}
          </div>
        </span>
      </button>
      <button
        onClick={onUsePotion}
        disabled={potions <= 0}
        title="Выпить зелье лечения"
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 transition-all',
          potions > 0 ? 'border-emerald-400/60 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-slate-700 bg-slate-800/50 opacity-60',
        )}
      >
        <span className="text-xl">🧪</span>
        <span className="text-xs font-semibold text-slate-100">[H] x{potions}</span>
      </button>
    </div>
  );
}
