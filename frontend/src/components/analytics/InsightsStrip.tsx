import type { ComponentType, SVGProps } from "react";
import { CheckCircleIcon, ClockIcon, FilterIcon, TargetIcon, TrendingDownIcon, TrendingUpIcon } from "@/components/icons";
import { cardClass } from "@/components/ui/Surface";
import type { Analytics } from "@/lib/api";

type Mood = "good" | "warn" | "bad" | "neutral";
type Insight = { icon: ComponentType<SVGProps<SVGSVGElement>>; mood: Mood; title: string; detail: string };

const MOOD: Record<Mood, string> = {
  good: "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
  warn: "bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400",
  bad: "bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-400",
  neutral: "bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-400",
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Plain-language takeaways worked out from the analytics numbers. */
function buildInsights({ summary, byStatus, byPriority, trend }: Analytics): Insight[] {
  const insights: Insight[] = [];

  // Overdue pressure.
  if (summary.overdue) {
    const share = summary.open ? Math.round((summary.overdue / summary.open) * 100) : 0;
    insights.push({
      icon: ClockIcon,
      mood: share >= 30 ? "bad" : "warn",
      title: `${plural(summary.overdue, "task")} overdue`,
      detail: `That's ${share}% of open work. Clear these first.`,
    });
  } else if (summary.open) {
    insights.push({ icon: CheckCircleIcon, mood: "good", title: "Nothing overdue", detail: `All ${summary.open} open tasks are on schedule.` });
  }

  // Weekly momentum.
  const [last, current] = trend.slice(-2);
  if (last && current) {
    const diff = current.completed - last.completed;
    insights.push({
      icon: diff >= 0 ? TrendingUpIcon : TrendingDownIcon,
      mood: diff > 0 ? "good" : diff < 0 ? "warn" : "neutral",
      title: diff > 0 ? `${diff} more done than last week` : diff < 0 ? `${-diff} fewer done than last week` : "Same pace as last week",
      detail: `${plural(current.completed, "task")} completed this week so far.`,
    });
  }

  // Bottleneck: where most tasks wait.
  const started = byStatus.in_progress + byStatus.completed;
  if (summary.total) {
    const notStarted = byStatus.todo;
    const stuck = byStatus.in_progress;
    insights.push(
      notStarted >= stuck
        ? {
            icon: FilterIcon,
            mood: notStarted / summary.total > 0.5 ? "warn" : "neutral",
            title: `${plural(notStarted, "task")} not started`,
            detail: `${Math.round((started / summary.total) * 100)}% of tasks have been picked up.`,
          }
        : {
            icon: FilterIcon,
            mood: "warn",
            title: `${stuck} in progress, waiting to finish`,
            detail: "Most tasks stall between started and done.",
          }
    );
  }

  // Priority focus.
  const prioTotal = byPriority.high + byPriority.medium + byPriority.low;
  if (prioTotal) {
    const highShare = Math.round((byPriority.high / prioTotal) * 100);
    insights.push({
      icon: TargetIcon,
      mood: highShare > 50 ? "warn" : "neutral",
      title: `${highShare}% high priority`,
      detail: highShare > 50 ? "Lots of urgent work. Check what can wait." : `${plural(byPriority.high, "high-priority task")} in the mix.`,
    });
  }

  return insights.slice(0, 4);
}

export default function InsightsStrip({ data }: { data: Analytics }) {
  const insights = buildInsights(data);
  if (!insights.length) return null;

  return (
    <section aria-label="Key insights" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {insights.map(({ icon: Icon, mood, title, detail }) => (
        <div key={title} className={`flex items-start gap-3 p-4 transition hover:-translate-y-0.5 ${cardClass}`}>
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${MOOD[mood]}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">{title}</p>
            <p className="mt-0.5 text-xs text-muted">{detail}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
