import { useState } from 'react';
import { useMetaStore } from '../../../application/meta/metaStore';
import { CLASS_DEFINITIONS } from '../../../domain/data/classDefinitions';
import { ClassType } from '../../../domain/types';
import { computeMetaBonusStats } from '../../../domain/services/metaProgressionService';
import { Button } from '../common/Button';
import { Panel } from '../common/Panel';
import { cn } from '../../../utils/cn';

export function ClassSelectScreen({ onBack, onStart }: { onBack: () => void; onStart: (classType: ClassType) => void }) {
  const unlockedClasses = useMetaStore((s) => s.unlockedClasses);
  const upgrades = useMetaStore((s) => s.upgrades);
  const [selected, setSelected] = useState<ClassType>(ClassType.WARRIOR);

  const bonuses = computeMetaBonusStats(upgrades);
  const classList = Object.values(CLASS_DEFINITIONS);

  function handleStart() {
    onStart(selected);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-6 p-4">
      <h2 className="text-2xl font-bold text-amber-300">Выберите класс</h2>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {classList.map((def) => {
          const unlocked = unlockedClasses.includes(def.classType);
          const isSelected = selected === def.classType;
          return (
            <button
              key={def.classType}
              disabled={!unlocked}
              onClick={() => setSelected(def.classType)}
              className={cn(
                'rounded-xl border p-4 text-left transition-all',
                unlocked ? 'bg-slate-900/70 hover:border-amber-400/70' : 'cursor-not-allowed bg-slate-900/40 opacity-50',
                isSelected ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-slate-700',
              )}
            >
              <div className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-100">
                <span className="text-2xl">{def.icon}</span>
                {def.name}
                {!unlocked && <span className="ml-auto text-xs font-normal text-slate-400">🔒 {def.unlockCost} эссенции</span>}
              </div>
              <p className="mb-2 text-xs text-slate-400">{def.description}</p>
              <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-300">
                <span>❤️ {def.baseStats.maxHp + (bonuses.maxHp ?? 0)}</span>
                <span>🔷 {def.baseStats.maxMana + (bonuses.maxMana ?? 0)}</span>
                <span>⚔️ {Math.round((def.baseStats.attack + (bonuses.attack ?? 0)) * 10) / 10}</span>
                <span>🛡️ {Math.round((def.baseStats.defense + (bonuses.defense ?? 0)) * 10) / 10}</span>
                <span>💥 {Math.round((def.baseStats.critChance + (bonuses.critChance ?? 0)) * 100)}%</span>
                <span>🍀 {Math.round(def.baseStats.luck + (bonuses.luck ?? 0))}</span>
              </div>
              <div className="mt-2 border-t border-slate-700 pt-2 text-[11px] text-amber-300">
                {def.ability.icon} {def.ability.name}: <span className="text-slate-400">{def.ability.description}</span>
              </div>
            </button>
          );
        })}
      </div>

      <Panel className="w-full p-3 text-center text-[11px] text-slate-400">
        Мета-прогресс из убежища уже учтён в характеристиках выше.
      </Panel>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack}>
          ← Назад
        </Button>
        <Button size="lg" onClick={handleStart} disabled={!unlockedClasses.includes(selected)}>
          Спуститься в подземелье ⚔️
        </Button>
      </div>
    </div>
  );
}
