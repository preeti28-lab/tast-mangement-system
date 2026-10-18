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

const TONES: Record<Tone, string> = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400",
  red: "bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
};

/** KPI tile: label with an icon on the right, a big value, and an optional caption. */
export default function StatCard({ label, value, hint, href, icon: Icon, tone = "indigo" }: Props) {
  const className =
    "group flex w-full min-w-0 flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm ring-1 ring-black/5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md sm:p-[18px] dark:border-zinc-700 dark:bg-zinc-900 dark:ring-white/10";

  const content = (
    <>
      <div className="flex items-center justify-between gap-2.5">
        <span className="truncate text-[12.5px] font-[550] tracking-[0.01em] text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        {Icon && (
          <span
            className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg transition-transform duration-200 ease-out group-hover:scale-110 ${TONES[tone]}`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <div className="text-2xl font-bold leading-[1.15] tracking-[-0.01em] tabular-nums text-zinc-900 sm:text-[26px] dark:text-zinc-100">
        {value}
      </div>
      {hint && (
        <div className="text-[12.5px] font-[450] text-zinc-400 dark:text-zinc-500">{hint}</div>
      )}
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
