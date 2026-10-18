import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { TrendingDownIcon, TrendingUpIcon } from "@/components/icons";
import { Sparkline } from "@/components/analytics/premium-charts";
import { TONE_BADGE, cardClass, type Tone } from "@/components/ui/Surface";

type Delta = { value: number; label: string; upIsGood: boolean };

/**
 * KPI tile: icon badge, label, big value, and either a sparkline (weekly trend) or a
 * meter (a share out of 100). An optional delta pill compares with last week; its
 * colour follows direction × whether up is good, and it always carries an arrow.
 */
export default function KpiTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  trend,
  trendColor,
  meter,
  meterColor,
  delta,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: Tone;
  trend?: number[];
  trendColor?: string;
  meter?: number;
  meterColor?: string;
  delta?: Delta;
  /** Makes the whole tile a link. */
  href?: string;
}) {
  const good = delta && (delta.value === 0 ? null : (delta.value > 0) === delta.upIsGood);
  const pill =
    good === null || good === undefined
      ? "bg-hover text-muted"
      : good
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
        : "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300";

  const Box = href ? Link : "div";
  return (
    <Box
      href={href as string}
      className={`group relative flex min-w-0 flex-col gap-3 overflow-hidden p-4 sm:gap-4 sm:p-5 ${cardClass} ${href ? "transition-shadow hover:shadow-[var(--shadow-card-hover)]" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span className={`grid h-9 w-9 shrink-0 sm:h-10 sm:w-10 place-items-center rounded-xl ${TONE_BADGE[tone]}`}>
            <Icon className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium leading-tight text-muted">{label}</p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[1.75rem] font-bold leading-none sm:text-[2rem] tracking-tight text-fg">{value}</p>
          {delta && (
            <span className={`mt-2.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${pill}`}>
              {delta.value >= 0 ? <TrendingUpIcon className="h-3 w-3" /> : <TrendingDownIcon className="h-3 w-3" />}
              {delta.value > 0 ? "+" : ""}
              {delta.value} {delta.label}
            </span>
          )}
          {hint && <p className="mt-2 truncate text-xs text-muted">{hint}</p>}
        </div>
        {trend && trendColor && <Sparkline values={trend} color={trendColor} className="hidden h-10 w-24 shrink-0 sm:block" />}
      </div>

      {meter !== undefined && (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-hover"
          role="meter"
          aria-label={label}
          aria-valuenow={meter}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, meter))}%`, background: meterColor }}
          />
        </div>
      )}
    </Box>
  );
}
