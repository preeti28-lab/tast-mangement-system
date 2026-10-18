import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

type Tone = "indigo" | "sky" | "red" | "emerald";

type Props = {
  label: string;
  value: number | string;
  /** Optional caption under the value, e.g. "3 of 7 tasks completed". */
  hint?: string;
  /** Makes the whole card a link (dashboard cards open the matching task list). */
  href?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: Tone;
};

const TONES: Record<Tone, { icon: string; wave: string }> = {
  indigo: {
    icon: "bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400",
    wave: "text-indigo-400",
  },
  sky: {
    icon: "bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400",
    wave: "text-sky-400",
  },
  red: {
    icon: "bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-400",
    wave: "text-red-400",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
    wave: "text-emerald-400",
  },
};

/** KPI tile: tinted icon on the left, label and big value, soft decorative wave. */
export default function StatCard({ label, value, hint, href, icon: Icon, tone = "indigo" }: Props) {
  const colors = TONES[tone];
  const className =
    "group relative isolate flex min-w-0 items-start gap-4 overflow-hidden rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(79,70,229,0.18)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_14px_32px_-12px_rgba(79,70,229,0.28)] dark:border-zinc-800 dark:bg-zinc-900";

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
        <p className="truncate text-base font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
        <p className="mt-3 text-4xl font-bold leading-none tracking-tight tabular-nums text-zinc-900 dark:text-white">
          {value}
        </p>
        {hint && <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">{hint}</p>}
      </div>
    </>
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
