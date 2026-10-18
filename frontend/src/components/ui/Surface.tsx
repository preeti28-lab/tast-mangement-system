import type { ComponentType, ReactNode, SVGProps } from "react";

// Shared look for the logged-in pages (matches the dashboard design).

export const cardClass =
  "rounded-2xl border border-zinc-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(79,70,229,0.18)] dark:border-zinc-800 dark:bg-zinc-900";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/35 disabled:translate-y-0 disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export const tabListClass =
  "inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-zinc-200/70 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export const tabClass = (active: boolean) =>
  `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
    active
      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
  }`;

export type Tone ="indigo" | "sky" | "red" | "emerald" | "amber" | "violet";

export const TONE_BADGE: Record<Tone, string> = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400",
  red: "bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400",
};

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

/** Tinted rounded square holding an icon. */
export function IconBadge({ icon: Icon, tone = "indigo", size = "md" }: { icon: IconType; tone?: Tone; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14 rounded-2xl" : "h-12 w-12 rounded-xl";
  return (
    <span className={`grid shrink-0 place-items-center ${box} ${TONE_BADGE[tone]}`}>
      <Icon className={size === "lg" ? "h-7 w-7" : "h-6 w-6"} />
    </span>
  );
}

/** Big page title + subtitle, with optional actions on the right. */
export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{title}</h2>
        {subtitle && <p className="mt-1.5 text-base text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/** Card header: icon badge, title + subtitle, optional action on the right. */
export function SectionHeader({
  icon,
  tone = "indigo",
  title,
  subtitle,
  action,
}: {
  icon: IconType;
  tone?: Tone;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-4">
      <IconBadge icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-lg font-bold text-zinc-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm text-zinc-500 sm:truncate dark:text-zinc-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/** Friendly empty state inside a card. */
export function EmptyState({ icon, title, children }: { icon: IconType; title: string; children?: ReactNode }) {
  return (
    <div className={`${cardClass} flex flex-col items-center px-6 py-14 text-center`}>
      <IconBadge icon={icon} size="lg" />
      <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-white">{title}</h3>
      {children && <div className="mt-1 max-w-sm text-sm text-zinc-500">{children}</div>}
    </div>
  );
}
