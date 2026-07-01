import { useEffect, useRef } from 'react';
import { LogEntry } from '../../../domain/types';
import { cn } from '../../../utils/cn';

const KIND_STYLES: Record<string, string> = {
  info: 'text-slate-300',
  combat: 'text-orange-300',
  loot: 'text-emerald-300',
  danger: 'text-rose-400 font-semibold',
  success: 'text-amber-300 font-semibold',
  level: 'text-fuchsia-300 font-bold',
};

export function MessageLog({ entries }: { entries: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [entries.length]);

  return (
    <div className="flex h-full flex-col-reverse overflow-y-auto rounded-lg bg-black/30 p-2 text-xs leading-relaxed">
      <div ref={endRef} />
      {[...entries].reverse().map((entry) => (
        <div key={entry.id} className={cn('py-0.5', KIND_STYLES[entry.kind] ?? 'text-slate-300')}>
          {entry.text}
        </div>
      ))}
    </div>
  );
}
