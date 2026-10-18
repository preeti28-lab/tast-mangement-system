"use client";

import { useEffect, useState } from "react";
import { ChartIcon, ClockIcon, TrendingDownIcon, TrendingUpIcon, TrophyIcon } from "@/components/icons";
import { SectionHeader, cardClass } from "@/components/ui/Surface";
import type { Analytics } from "@/lib/api";

type Week = Analytics["trend"][number];
type Tone = "a" | "b";

const BAR_TONE: Record<Tone, string> = {
  a: "bg-indigo-500 dark:bg-indigo-400",
  b: "bg-fuchsia-500 dark:bg-fuchsia-400",
};

const weekLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** A count bar, scaled against the larger of the two weeks; grows in on mount. */
function MetricBar({ label, value, max, tone, highlight }: { label: string; value: number; max: number; tone: Tone; highlight: boolean }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
        <span
          className={`font-semibold tabular-nums ${highlight ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"}`}
        >
          {value}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${BAR_TONE[tone]}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function WeekColumn({ tone, letter, title, week, max, isWinner }: { tone: Tone; letter: string; title: string; week: Week; max: number; isWinner: boolean }) {
  const ratio = week.created ? Math.round((week.completed / week.created) * 100) : null;
  return (
    <div
      className={`relative rounded-xl border p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 ${
        isWinner
          ? "border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200 dark:border-emerald-500/40 dark:bg-emerald-500/5 dark:ring-emerald-500/30"
          : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      }`}
    >
      {isWinner && (
        <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm dark:bg-emerald-400 dark:text-emerald-950">
          <TrophyIcon className="h-3 w-3" strokeWidth={2.4} />
          Better week
        </span>
      )}
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white shadow-sm ${
            tone === "a" ? "bg-gradient-to-br from-indigo-500 to-indigo-600" : "bg-gradient-to-br from-fuchsia-500 to-fuchsia-600"
          }`}
        >
          {letter}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Week of {weekLabel(week.weekStart)}</p>
        </div>
      </div>
      <div className="space-y-2.5">
        <MetricBar label="Completed" value={week.completed} max={max} tone={tone} highlight={isWinner} />
        <MetricBar label="Created" value={week.created} max={max} tone={tone} highlight={false} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Done / created</p>
          <p className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{ratio === null ? "—" : `${ratio}%`}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
          <p className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            <ClockIcon className="h-3 w-3" /> Overdue
          </p>
          <p className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{week.overdue}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * This week vs last week, side by side like an A/B test result: the week that
 * completed more tasks is highlighted and the change in completions is shown as
 * an uplift (or drop) badge.
 */
export default function WeekComparison({ trend }: { trend: Analytics["trend"] }) {
  if (trend.length < 2) return null;
  const last = trend[trend.length - 2];
  const current = trend[trend.length - 1];
  const max = Math.max(last.completed, last.created, current.completed, current.created);

  const winner: Tone | null = current.completed === last.completed ? null : current.completed > last.completed ? "b" : "a";
  const change = last.completed ? Math.round(((current.completed - last.completed) / last.completed) * 100) : null;
  const up = current.completed >= last.completed;

  const badge =
    change === null ? (current.completed ? "New activity" : "No change") : `${change > 0 ? "+" : ""}${change}% completions`;

  return (
    <section className={`p-5 sm:p-6 ${cardClass}`}>
      <SectionHeader
        icon={ChartIcon}
        tone="violet"
        title="This week vs. last week"
        subtitle="Completed tasks, head to head"
        action={
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
              up
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
                : "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30"
            }`}
          >
            {up ? <TrendingUpIcon className="h-3.5 w-3.5" /> : <TrendingDownIcon className="h-3.5 w-3.5" />}
            {badge}
          </span>
        }
      />

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WeekColumn tone="a" letter="A" title="Last week" week={last} max={max} isWinner={winner === "a"} />
        <WeekColumn tone="b" letter="B" title="This week" week={current} max={max} isWinner={winner === "b"} />
      </div>

      <div
        className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${
          winner === "a"
            ? "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30"
            : "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30"
        }`}
      >
        <TrophyIcon className="h-4 w-4 shrink-0" />
        <span>
          {winner === "b" ? (
            <>
              <strong>This week</strong> is ahead with <strong>{current.completed - last.completed}</strong> more tasks done. Keep it up!
            </>
          ) : winner === "a" ? (
            <>
              <strong>{last.completed - current.completed}</strong> tasks behind last week so far. There&apos;s still time to catch up.
            </>
          ) : (
            <>Neck and neck: <strong>{current.completed}</strong> tasks completed in both weeks.</>
          )}
        </span>
      </div>
    </section>
  );
}
