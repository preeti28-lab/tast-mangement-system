import { GridIcon } from "@/components/icons";
import { SectionHeader, cardClass } from "@/components/ui/Surface";
import type { Analytics } from "@/lib/api";

const weekLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** Green scale by completion %, light + dark. */
function cellStyle(v: number | null) {
  if (v == null) return "bg-zinc-50 text-zinc-300 dark:bg-zinc-800/40 dark:text-zinc-600";
  if (v >= 90) return "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white";
  if (v >= 70) return "bg-emerald-400 text-emerald-950 dark:bg-emerald-500/70 dark:text-emerald-50";
  if (v >= 50) return "bg-emerald-300 text-emerald-900 dark:bg-emerald-500/50 dark:text-emerald-50";
  if (v >= 30) return "bg-emerald-200 text-emerald-900 dark:bg-emerald-500/30 dark:text-emerald-100";
  if (v > 0) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200";
  return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
}

/**
 * Completion cohorts heatmap: rows are the weeks tasks were created, columns are
 * weeks since creation; each cell shows the % of that week's tasks done by then.
 */
export default function CompletionCohorts({ cohorts }: { cohorts: Analytics["cohorts"] }) {
  const cols = cohorts[0]?.values.map((_, i) => `W${i}`) ?? [];

  return (
    <section className={`p-5 sm:p-6 ${cardClass}`}>
      <SectionHeader
        icon={GridIcon}
        tone="emerald"
        title="Completion cohorts"
        subtitle="% of each week's new tasks completed, week by week"
        action={
          <div className="hidden items-center gap-1.5 text-[11px] text-zinc-500 sm:flex dark:text-zinc-400">
            <span>Low</span>
            <span className="flex overflow-hidden rounded-md ring-1 ring-black/5 dark:ring-white/10">
              <span className="h-3 w-4 bg-emerald-100 dark:bg-emerald-500/20" />
              <span className="h-3 w-4 bg-emerald-300 dark:bg-emerald-500/50" />
              <span className="h-3 w-4 bg-emerald-400 dark:bg-emerald-500/70" />
              <span className="h-3 w-4 bg-emerald-600 dark:bg-emerald-500" />
            </span>
            <span>High</span>
          </div>
        }
      />

      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-2 py-1.5 text-left text-xs font-semibold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                Created week
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400">Tasks</th>
              {cols.map((c) => (
                <th key={c} className="px-2 py-1.5 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.weekStart}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-1.5 text-left text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  {weekLabel(c.weekStart)}
                </th>
                <td className="whitespace-nowrap px-2 py-1.5 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{c.size}</td>
                {c.values.map((v, i) => (
                  <td key={i} className="p-0">
                    <div
                      className={`grid h-10 min-w-[3rem] place-items-center rounded-md text-xs font-semibold tabular-nums transition-transform duration-200 ease-out hover:scale-[1.06] ${cellStyle(v)}`}
                      title={
                        v == null
                          ? c.size
                            ? "Not there yet"
                            : "No tasks created this week"
                          : `Week of ${weekLabel(c.weekStart)} · ${cols[i]}: ${v}% done`
                      }
                    >
                      {v == null ? "—" : `${Math.round(v)}%`}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-500">
        W0 is the week the tasks were created. Blank cells are weeks that haven&apos;t happened yet, or weeks with no new tasks.
      </p>
    </section>
  );
}
