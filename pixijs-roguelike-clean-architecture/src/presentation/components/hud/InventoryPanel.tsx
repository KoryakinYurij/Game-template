import { PlayerCharacter } from '../../../domain/entities/character';
import { ItemSlot } from '../../../domain/types';
import { RARITY_COLOR, RARITY_LABEL } from '../../../domain/data/itemAffixes';
import { useGameStore } from '../../../application/game/gameStore';
import { Button } from '../common/Button';
import { formatBonuses } from './itemFormat';

const SLOT_LABELS: Record<ItemSlot, string> = {
  [ItemSlot.WEAPON]: 'Оружие',
  [ItemSlot.ARMOR]: 'Броня',
  [ItemSlot.TRINKET]: 'Аксессуар',
};

export function InventoryPanel({ player, onClose }: { player: PlayerCharacter; onClose: () => void }) {
  const equipItem = useGameStore((s) => s.equipItem);
  const unequipSlot = useGameStore((s) => s.unequipSlot);
  const sellItem = useGameStore((s) => s.sellItem);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-amber-300">🎒 Инвентарь и снаряжение</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            ✕ Закрыть
          </Button>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          {(Object.values(ItemSlot) as ItemSlot[]).map((slot) => {
            const key = slot.toLowerCase() as 'weapon' | 'armor' | 'trinket';
            const item = player.equipment[key];
            return (
              <div key={slot} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">{SLOT_LABELS[slot]}</div>
                {item ? (
                  <>
                    <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: `#${RARITY_COLOR[item.rarity].toString(16).padStart(6, '0')}` }}>
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                    <div className="mt-1 space-y-0.5 text-[10px] text-slate-400">
                      {formatBonuses(item.bonuses).map((b) => (
                        <div key={b}>{b}</div>
                      ))}
                    </div>
                    <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => unequipSlot(slot)}>
                      Снять
                    </Button>
                  </>
                ) : (
                  <div className="py-3 text-center text-xs text-slate-500">Пусто</div>
                )}
              </div>
            );
          })}
        </div>

        <h3 className="mb-2 text-sm font-semibold text-slate-300">Рюкзак ({player.inventory.length}/10)</h3>
        {player.inventory.length === 0 && <p className="text-xs text-slate-500">Пока пусто. Собирайте лут в подземелье!</p>}
        <div className="space-y-2">
          {player.inventory.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/40 p-2.5">
              <div>
                <div
                  className="flex items-center gap-1 text-sm font-semibold"
                  style={{ color: `#${RARITY_COLOR[item.rarity].toString(16).padStart(6, '0')}` }}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                  <span className="text-[10px] font-normal text-slate-500">({RARITY_LABEL[item.rarity]})</span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-slate-400">
                  {formatBonuses(item.bonuses).map((b) => (
                    <span key={b}>{b}</span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="primary" onClick={() => equipItem(item.id)}>
                  Надеть
                </Button>
                <Button size="sm" variant="secondary" onClick={() => sellItem(item.id)}>
                  Продать {item.goldValue}💰
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
