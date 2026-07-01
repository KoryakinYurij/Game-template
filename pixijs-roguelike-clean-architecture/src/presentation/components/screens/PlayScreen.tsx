import { useState } from 'react';
import { useGameStore } from '../../../application/game/gameStore';
import { computeEffectiveStats } from '../../../domain/services/statsService';
import { CLASS_DEFINITIONS } from '../../../domain/data/classDefinitions';
import { PixiGameCanvas } from '../../pixi/PixiGameCanvas';
import { useKeyboardControls } from '../../hooks/useKeyboardControls';
import { HealthManaBars } from '../hud/HealthManaBars';
import { AbilityBar } from '../hud/AbilityBar';
import { MessageLog } from '../hud/MessageLog';
import { TopStatusBar } from '../hud/TopStatusBar';
import { InventoryPanel } from '../hud/InventoryPanel';
import { Button } from '../common/Button';

export function PlayScreen({ onAbandon }: { onAbandon: () => void }) {
  const player = useGameStore((s) => s.player);
  const floor = useGameStore((s) => s.floor);
  const status = useGameStore((s) => s.status);
  const turn = useGameStore((s) => s.turn);
  const log = useGameStore((s) => s.log);
  const move = useGameStore((s) => s.move);
  const useAbility = useGameStore((s) => s.useAbility);
  const usePotion = useGameStore((s) => s.usePotion);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  useKeyboardControls(status === 'playing' && !inventoryOpen);

  if (!player || !floor) return null;

  const effective = computeEffectiveStats(player.baseStats, player.equipment);
  const abilityDef = CLASS_DEFINITIONS[player.classType].ability;

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 md:p-4">
      <TopStatusBar player={player} floor={floor} turn={turn} onOpenInventory={() => setInventoryOpen(true)} onAbandon={onAbandon} />

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="flex justify-center overflow-auto lg:flex-1">
          <PixiGameCanvas />
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-72">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3">
            <HealthManaBars stats={effective} />
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3">
            <AbilityBar
              ability={abilityDef}
              cooldownRemaining={player.ability.cooldownRemaining}
              mana={effective.mana}
              potions={player.potions}
              onUseAbility={useAbility}
              onUsePotion={usePotion}
            />
          </div>

          <div className="grid grid-cols-3 gap-1.5 lg:hidden">
            <div />
            <Button variant="secondary" onClick={() => move(0, -1)}>
              ↑
            </Button>
            <div />
            <Button variant="secondary" onClick={() => move(-1, 0)}>
              ←
            </Button>
            <Button variant="secondary" onClick={() => move(0, 1)}>
              ↓
            </Button>
            <Button variant="secondary" onClick={() => move(1, 0)}>
              →
            </Button>
          </div>

          <div className="min-h-[180px] flex-1 rounded-xl border border-slate-700/60 bg-slate-900/70 p-2">
            <MessageLog entries={log} />
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-500">
        Управление: WASD / стрелки — движение, Q / Пробел — способность, H — зелье лечения
      </p>

      {inventoryOpen && <InventoryPanel player={player} onClose={() => setInventoryOpen(false)} />}
    </div>
  );
}
