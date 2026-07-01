import { useMetaStore } from '../../../application/meta/metaStore';
import { CLASS_DEFINITIONS } from '../../../domain/data/classDefinitions';
import { CLASS_UNLOCK_COST, costForUpgradeLevel, META_UPGRADES } from '../../../domain/data/metaUpgradeCatalog';
import { ClassType } from '../../../domain/types';
import { Button } from '../common/Button';
import { Panel } from '../common/Panel';

export function HubScreen({ onBack }: { onBack: () => void }) {
  const essence = useMetaStore((s) => s.essence);
  const upgrades = useMetaStore((s) => s.upgrades);
  const unlockedClasses = useMetaStore((s) => s.unlockedClasses);
  const purchaseUpgrade = useMetaStore((s) => s.purchaseUpgrade);
  const unlockClass = useMetaStore((s) => s.unlockClass);
  const bestFloor = useMetaStore((s) => s.bestFloor);
  const totalKills = useMetaStore((s) => s.totalKills);
  const totalRuns = useMetaStore((s) => s.totalRuns);
  const resetProgress = useMetaStore((s) => s.resetProgress);

  const lockedClasses = (Object.values(ClassType) as ClassType[]).filter((c) => !unlockedClasses.includes(c));

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/images/hub-bg.jpg')" }}
    >
      <div className="min-h-screen w-full bg-black/55 p-2 md:p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-amber-300">🏕️ Убежище</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="rounded-lg border border-amber-400/40 bg-slate-900/70 px-3 py-1.5 font-bold text-amber-300">
                ✨ {essence} эссенции
              </span>
              <Button variant="ghost" onClick={onBack}>
                ← В меню
              </Button>
            </div>
          </div>

          <Panel className="grid grid-cols-3 divide-x divide-slate-700 p-3 text-center text-xs text-slate-300">
            <div>
              <div className="text-lg font-bold text-slate-100">{totalRuns}</div>Экспедиций
            </div>
            <div>
              <div className="text-lg font-bold text-slate-100">{bestFloor}</div>Лучший этаж
            </div>
            <div>
              <div className="text-lg font-bold text-slate-100">{totalKills}</div>Убито врагов
            </div>
          </Panel>

          <Panel className="p-4">
            <h3 className="mb-3 text-lg font-semibold text-slate-100">Постоянные улучшения</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {META_UPGRADES.map((def) => {
                const level = upgrades[def.id] ?? 0;
                const maxed = level >= def.maxLevel;
                const cost = costForUpgradeLevel(def, level);
                const canBuy = !maxed && essence >= cost;
                return (
                  <div key={def.id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold text-slate-100">
                        {def.icon} {def.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {level}/{def.maxLevel}
                      </span>
                    </div>
                    <p className="mb-2 text-[11px] text-slate-400">{def.description}</p>
                    <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full bg-amber-400" style={{ width: `${(level / def.maxLevel) * 100}%` }} />
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!canBuy}
                      onClick={() => purchaseUpgrade(def.id)}
                    >
                      {maxed ? 'Максимум' : `Улучшить за ${cost} ✨`}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Panel>

          {lockedClasses.length > 0 && (
            <Panel className="p-4">
              <h3 className="mb-3 text-lg font-semibold text-slate-100">Разблокировать классы</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {lockedClasses.map((classType) => {
                  const def = CLASS_DEFINITIONS[classType];
                  const cost = CLASS_UNLOCK_COST[classType];
                  return (
                    <div key={classType} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-center">
                      <div className="text-2xl">{def.icon}</div>
                      <div className="mb-1 font-semibold text-slate-100">{def.name}</div>
                      <p className="mb-2 text-[11px] text-slate-400">{def.description}</p>
                      <Button size="sm" className="w-full" disabled={essence < cost} onClick={() => unlockClass(classType)}>
                        Открыть за {cost} ✨
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          <Panel className="flex items-center justify-between p-3 text-xs text-slate-400">
            <span>Сбросить весь прогресс (необратимо)</span>
            <Button size="sm" variant="danger" onClick={resetProgress}>
              Сбросить
            </Button>
          </Panel>
        </div>
      </div>
    </div>
  );
}
