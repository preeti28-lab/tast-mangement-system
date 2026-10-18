import type { ReactNode } from "react";

// Small surfaces that sit inside a card: list rows, stat tiles, dashed empty notes.

/** Inset tile inside a glass card (list rows, mini stats). */
export const tileClass = "rounded-xl border border-line bg-white/40 backdrop-blur-sm dark:bg-white/[0.03]";

/** Tile that reacts to hover (clickable rows). */
export const tileInteractiveClass = `${tileClass} transition-all duration-200 ease-out hover:-translate-y-px hover:border-brand-300/70 hover:bg-brand-50/50 hover:shadow-md hover:shadow-brand-600/5 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5`;

/** Dashed placeholder shown inside a card when there is nothing to list. */
export function EmptyNote({ children, className = "mt-5" }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`rounded-xl border border-dashed border-slate-300/80 bg-white/30 px-5 py-10 text-center text-sm text-muted dark:border-slate-700 dark:bg-white/[0.02] ${className}`}
    >
      {children}
    </p>
  );
}
