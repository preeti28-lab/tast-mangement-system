import type { ComponentType, ReactNode, SVGProps } from "react";

// Shared look for the logged-in pages (matches the dashboard design).

/** Card without pointer tilt, for faces inside an existing 3D scene (flip cards). */
export const cardFlatClass = "glass rounded-2xl";

/** Standard card: glass surface that tilts toward the pointer (see TiltController). */
export const cardClass = `${cardFlatClass} tilt-3d`;

export const primaryButtonClass =
  "btn-shine btn-3d btn-3d-brand inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 hover:from-brand-600 hover:to-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:translate-y-0 disabled:opacity-60";

export const secondaryButtonClass =
  "btn-3d inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-surface px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:opacity-40 dark:border-slate-700 dark:text-slate-200";

export const tabListClass =
  "well-3d inline-flex max-w-full gap-1 overflow-x-auto rounded-xl p-1.5";

export const tabClass = (active: boolean) =>
  `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
    active
      ? "raised-3d text-brand-700 dark:text-brand-300"
      : "text-slate-600 hover:bg-surface/60 hover:text-fg dark:text-muted"
  }`;

export type Tone = "brand" | "sky" | "red" | "emerald" | "amber" | "violet";

export const TONE_BADGE: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-400",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400",
  red: "bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400",
};

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

/** Tinted rounded square holding an icon. */
export function IconBadge({ icon: Icon, tone = "brand", size = "md" }: { icon: IconType; tone?: Tone; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14 rounded-2xl" : "h-12 w-12 rounded-xl";
  return (
    <span className={`grid shrink-0 place-items-center shadow-sm ring-1 ring-inset ring-current/10 ${box} ${TONE_BADGE[tone]}`}>
      <Icon className={size === "lg" ? "h-7 w-7" : "h-6 w-6"} />
    </span>
  );
}

/** Big page title + subtitle, with optional actions on the right. */
export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-gradient text-3xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1.5 text-base text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/** Card header: icon badge, title + subtitle, optional action on the right. */
export function SectionHeader({
  icon,
  tone = "brand",
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
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <IconBadge icon={icon} tone={tone} />
      <div className="min-w-0 flex-1 basis-40">
        <h3 className="truncate text-lg font-bold text-fg">{title}</h3>
        {subtitle && <p className="text-sm text-muted sm:truncate">{subtitle}</p>}
      </div>
      {/* Wraps under the title on narrow cards instead of squeezing it */}
      {action && <div className="max-w-full shrink-0">{action}</div>}
    </header>
  );
}

/** Card with the standard padding and a SectionHeader on top. */
export function SectionCard({
  icon,
  tone,
  title,
  subtitle,
  action,
  id,
  className = "",
  bodyClassName,
  children,
}: {
  icon: IconType;
  tone?: Tone;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
  /** Wraps the content in a div with these classes (e.g. "mt-5"). */
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`p-5 sm:p-6 ${cardClass} ${className}`}>
      <SectionHeader icon={icon} tone={tone} title={title} subtitle={subtitle} action={action} />
      {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
    </section>
  );
}

/** Friendly empty state inside a card. */
export function EmptyState({ icon, title, children }: { icon: IconType; title: string; children?: ReactNode }) {
  return (
    <div className={`${cardClass} flex flex-col items-center px-6 py-14 text-center`}>
      <IconBadge icon={icon} size="lg" />
      <h3 className="mt-4 text-lg font-bold text-fg">{title}</h3>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}
