import type { ComponentType, SVGProps } from "react";
import { CheckCircleIcon, FilterIcon, TargetIcon, TrendingDownIcon } from "@/components/icons";
import { SectionHeader, cardClass } from "@/components/ui/Surface";
import type { Analytics } from "@/lib/api";

const BAR_TONES = [
  "bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-500",
  "bg-gradient-to-r from-sky-500 to-sky-600 dark:from-sky-400 dark:to-sky-500",
  "bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500",
  "bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500",
];

/**
 * Task funnel: Created → Started → Completed → On time, as tapering bars with the
 * conversion between each step; the worst drop-off is highlighted in red.
 */
export default function TaskFunnel({ data }: { data: Analytics }) {
  const { summary, byStatus } = data;
  const stages = [
    { name: "Created", count: summary.total },
    { name: "Started", count: byStatus.in_progress + byStatus.completed },
    { name: "Completed", count: summary.completed },
    { name: "On time", count: summary.completedOnTime ?? 0 },
  ];
  const top = stages[0].count;

  const steps = stages.slice(1).map((s, i) => {
    const prev = stages[i].count;
    const conv = prev > 0 ? (s.count / prev) * 100 : 0;
    return { from: stages[i].name, to: s.name, conv, drop: 100 - conv };
  });
  const worstIdx = top > 0 ? steps.reduce((worst, s, i) => (s.drop > steps[worst].drop ? i : worst), 0) : -1;
  const overall = top > 0 ? (summary.completed / top) * 100 : 0;

  return (
    <section className={`p-5 sm:p-6 ${cardClass}`}>
      <SectionHeader icon={FilterIcon} tone="sky" title="Task funnel" subtitle="Where tasks stall on the way to done" />

      <div className="mt-5 space-y-1">
        {stages.map((s, i) => {
          const width = top > 0 ? (s.count / top) * 100 : 0;
          const share = top > 0 ? Math.round((s.count / top) * 1000) / 10 : 0;
          return (
            <div key={s.name}>
              <div className="flex items-center gap-3">
                <div className="w-20 shrink-0 text-right text-xs font-medium text-zinc-600 dark:text-zinc-300">{s.name}</div>
                <div className="flex flex-1 justify-center">
                  <div
                    className={`flex h-11 items-center justify-between rounded-lg px-3 text-white shadow-sm transition-[width] duration-500 ease-out hover:brightness-110 ${BAR_TONES[i]}`}
                    style={{ width: `${Math.max(width, 22)}%` }}
                    role="meter"
                    aria-label={s.name}
                    aria-valuenow={s.count}
                    aria-valuemin={0}
                    aria-valuemax={top}
                  >
                    <span className="text-sm font-bold tabular-nums">{s.count}</span>
                    <span className="ml-2 hidden text-[11px] font-medium tabular-nums opacity-90 sm:inline">{share}%</span>
                  </div>
                </div>
              </div>

              {i < steps.length && (
                <div className="flex items-center gap-3 py-1">
                  <div className="w-20 shrink-0" />
                  <div className="flex flex-1 justify-center">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        i === worstIdx
                          ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200 ring-inset dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      <TrendingDownIcon className="h-3 w-3" />
                      {Math.round(steps[i].conv)}% move on
                      {i === worstIdx && <span className="ml-1 font-bold">· biggest drop</span>}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-3 dark:border-zinc-800">
        <SummaryStat icon={TargetIcon} label="Overall completion" value={`${Math.round(overall * 10) / 10}%`} tone="text-emerald-600 dark:text-emerald-400" />
        <SummaryStat
          icon={TrendingDownIcon}
          label="Biggest drop-off"
          value={worstIdx >= 0 ? `${steps[worstIdx].from} → ${steps[worstIdx].to}` : "—"}
          tone="text-rose-600 dark:text-rose-400"
        />
        <SummaryStat icon={CheckCircleIcon} label="Done on time" value={summary.completedOnTime ?? 0} tone="text-indigo-600 dark:text-indigo-400" />
      </div>
    </section>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/60">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        <Icon className={`h-3.5 w-3.5 ${tone}`} />
        {label}
      </div>
      <p className={`mt-0.5 truncate text-sm font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
