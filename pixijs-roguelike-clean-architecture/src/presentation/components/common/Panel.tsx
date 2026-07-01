import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../../utils/cn';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Panel({ children, className, ...rest }: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-700/60 bg-slate-900/70 backdrop-blur-sm shadow-xl shadow-black/30',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
