import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import FlipCard3D from "@/components/ui/FlipCard3D";

type Tone = "brand" | "sky" | "red" | "emerald";

type Props = {
  label: string;
  value: number | string;
  /** Optional caption under the value, e.g. "3 of 7 tasks completed". */
  hint?: string;
  /** Makes the whole card a link (dashboard cards open the matching task list). */
  href?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: Tone;
  /** When set, the tile becomes a 3D flip card with this on its back (plus the `href` link). */
  back?: ReactNode;
  /** Label for the back-face link, e.g. "View overdue tasks". */
  backLinkLabel?: string;
};

const TONES: Record<Tone, { icon: string; wave: string; back: string }> = {
  brand: {
    icon: "bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-400",
    wave: "text-brand-400",
    back: "from-brand-500 to-emerald-700 shadow-brand-500/30 dark:from-brand-600 dark:to-emerald-800",
  },
  sky: {
    icon: "bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400",
    wave: "text-sky-400",
    back: "from-sky-500 to-brand-500 shadow-sky-500/30 dark:from-sky-600 dark:to-brand-600",
  },
  red: {
    icon: "bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-400",
    wave: "text-red-400",
    back: "from-rose-500 to-red-600 shadow-red-500/30 dark:from-rose-600 dark:to-red-700",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
    wave: "text-emerald-400",
    back: "from-emerald-500 to-teal-600 shadow-emerald-500/30 dark:from-emerald-600 dark:to-teal-700",
  },
};

const surfaceClass = "glass";

/** KPI tile: tinted icon on the left, label and big value, soft decorative wave. */
export default function StatCard({ label, value, hint, href, icon: Icon, tone = "brand", back, backLinkLabel }: Props) {
  const colors = TONES[tone];
  const layoutClass = "group relative isolate flex min-w-0 items-start gap-4 overflow-hidden rounded-2xl p-6";
  const className = `${layoutClass} ${surfaceClass} glass-hover`;

  const content = (
    <>
      {/* Decorative wave in the card's tone, bottom-right */}
      <svg
        viewBox="0 0 200 80"
        preserveAspectRatio="none"
        className={`pointer-events-none absolute bottom-0 right-0 -z-10 h-24 w-3/4 ${colors.wave}`}
        aria-hidden="true"
      >
        <path d="M0 80C80 80 110 30 200 22V80Z" fill="currentColor" fillOpacity="0.06" />
        <path d="M50 80C115 80 140 46 200 40V80Z" fill="currentColor" fillOpacity="0.05" />
      </svg>

      {Icon && (
        <span
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl transition-transform duration-200 ease-out group-hover:scale-105 ${colors.icon}`}
        >
          <Icon className="h-7 w-7" />
        </span>
      )}
      <div className="min-w-0 pt-1.5">
        <p className="text-base font-medium leading-snug text-slate-600 dark:text-muted">{label}</p>
        <p className="mt-3 text-4xl font-bold leading-none tracking-tight tabular-nums text-fg">
          {value}
        </p>
        {hint && <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">{hint}</p>}
      </div>
    </>
  );

  if (back) {
    return (
      <FlipCard3D
        height={152}
        className="transition-transform duration-200 ease-out hover:-translate-y-0.5"
        frontClassName={`${layoutClass} glass-flat`}
        backClassName={`flex flex-col justify-between bg-gradient-to-br p-5 text-white shadow-xl ring-1 ring-white/20 ${colors.back}`}
        front={content}
        back={
          <>
            <div className="text-sm leading-snug text-white/90">{back}</div>
            {href && (
              <Link
                href={href}
                className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {backLinkLabel ?? `View ${label.toLowerCase()}`}
                <span aria-hidden="true">&rarr;</span>
              </Link>
            )}
          </>
        }
      />
    );
  }

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
