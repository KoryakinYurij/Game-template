import { Stats } from '../../../domain/types';

function Bar({ value, max, colorClass, label }: { value: number; max: number; colorClass: string; label: string }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="w-full">
      <div className="mb-0.5 flex justify-between text-[11px] font-semibold text-slate-300">
        <span>{label}</span>
        <span>
          {Math.ceil(value)} / {Math.ceil(max)}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700">
        <div className={`h-full ${colorClass} transition-all duration-300`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

export function HealthManaBars({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-2">
      <Bar value={stats.hp} max={stats.maxHp} colorClass="bg-gradient-to-r from-rose-600 to-rose-400" label="❤️ Здоровье" />
      <Bar value={stats.mana} max={stats.maxMana} colorClass="bg-gradient-to-r from-sky-600 to-sky-400" label="🔷 Мана" />
    </div>
  );
}
