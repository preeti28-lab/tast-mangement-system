"use client";

import { useEffect, useId, useRef, useState } from "react";

// Premium SVG charts: 2px lines, ringed >=8px markers, hairline solid grid, one
// y-axis, monotone curves with a soft area wash, hover tooltips. Every chart that
// uses these sits next to a legend and a data table.

export type Series = {
  key: string;
  label: string;
  color: string;
  values: number[];
};

/**
 * Series colours come from the theme tokens in globals.css (one source of truth):
 * created = blue (--series-2), completed = green (--series-1), overdue = --error.
 * The pair is validated for light and dark surfaces. They're CSS variables, so the
 * SVG below always applies colours through `style`, never presentation attributes.
 */
export const SERIES_COLORS = {
  created: "var(--series-2)",
  completed: "var(--series-1)",
  overdue: "var(--error)",
} as const;

/** A useId value that is safe inside url(#…) references. */
const useSvgId = (prefix: string) => `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

type Pt = [number, number];

/** Axis top for 4 equal steps of a clean size (1, 2, 3, 4, 5, 6, 8, 10, 15, 20…), so every tick is a round number. */
const niceMax = (max: number) => {
  const raw = Math.max(1, max) / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step =
    [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
      .map((f) => f * mag)
      .find((v) => v >= raw && Number.isInteger(v)) ?? 10 * mag;
  return Math.max(1, step) * 4;
};

function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, Math.round(entry.contentRect.width))),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Monotone cubic path (Fritsch–Carlson): smooth and never overshoots below zero. */
function monotonePath(pts: Pt[]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  const n = pts.length;
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0]);
  const slope = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / dx[i]);
  const m = pts.map((_, i) =>
    i === 0
      ? slope[0]
      : i === n - 1
        ? slope[n - 2]
        : slope[i - 1] * slope[i] <= 0
          ? 0
          : (slope[i - 1] + slope[i]) / 2,
  );
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

/** Legend: a short line key per series (identity never relies on colour alone). */
export function ChartLegend({
  series,
}: {
  series: Pick<Series, "key" | "label" | "color">[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span
            className="h-[3px] w-4 rounded-full"
            style={{ background: s.color }}
            aria-hidden="true"
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/** Multi-series smooth area chart with a gradient wash, crosshair and tooltip. */
export function AreaChart({
  labels,
  series,
  ariaLabel,
  height = 260,
  tooltipPrefix = "Week of",
}: {
  labels: string[];
  series: Series[];
  ariaLabel: string;
  height?: number;
  tooltipPrefix?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth<HTMLDivElement>(640);
  const pad = { top: 18, right: 34, bottom: 30, left: 34 };
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const innerW = W - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (i: number) =>
    pad.left +
    (labels.length === 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const last = labels.length - 1;
  const labelEvery = W < 420 ? 3 : W < 640 ? 2 : 1;
  const uid = useSvgId("area");
  const band = innerW / Math.max(1, last);

  return (
    <div ref={ref} className="relative">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          {series.map((s) => (
            <linearGradient
              key={s.key}
              id={`${uid}-${s.key}`}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" style={{ stopColor: s.color }} stopOpacity={0.2} />
              <stop offset="100%" style={{ stopColor: s.color }} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--chart-grid)"
              strokeWidth={1}
            />
            <text
              x={pad.left - 10}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              fontSize={11}
              fill="var(--chart-axis)"
            >
              {Number.isInteger(t) ? t : ""}
            </text>
          </g>
        ))}
        {labels.map((label, i) =>
          (last - i) % labelEvery === 0 ? (
            <text
              key={label}
              x={x(i)}
              y={height - 8}
              textAnchor="middle"
              fontSize={11}
              fill="var(--chart-axis)"
            >
              {label}
            </text>
          ) : null,
        )}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={pad.top}
            y2={pad.top + innerH}
            stroke="var(--chart-axis)"
            strokeWidth={1}
            strokeOpacity={0.35}
          />
        )}
        {series.map((s) => {
          const pts: Pt[] = s.values.map((v, i) => [x(i), y(v)]);
          const line = monotonePath(pts);
          return (
            <g key={s.key}>
              <path
                d={`${line} L${x(last)},${y(0)} L${x(0)},${y(0)} Z`}
                fill={`url(#${uid}-${s.key})`}
              />
              <path
                d={line}
                fill="none"
                style={{ stroke: s.color }}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle
                cx={x(last)}
                cy={y(s.values[last])}
                r={4.5}
                style={{ fill: s.color }}
                stroke="var(--chart-surface)"
                strokeWidth={2}
              />
              {hover !== null && (
                <circle
                  cx={x(hover)}
                  cy={y(s.values[hover])}
                  r={5}
                  style={{ fill: s.color }}
                  stroke="var(--chart-surface)"
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}
        {series.map((s, si) => (
          <text
            key={`${s.key}-end`}
            x={x(last) + 9}
            y={
              y(s.values[last]) +
              (si === 1 &&
              series.length > 1 &&
              Math.abs(y(series[0].values[last]) - y(s.values[last])) < 12
                ? 12
                : 0)
            }
            dy="0.32em"
            fontSize={11}
            fontWeight={600}
            fill="var(--chart-axis)"
          >
            {s.values[last]}
          </text>
        ))}
        {labels.map((label, i) => (
          <rect
            key={`hit-${label}`}
            x={x(i) - band / 2}
            y={pad.top}
            width={band}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-xl border border-line bg-surface/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > last / 2 ? "-108%" : "8%"})`,
          }}
        >
          <p className="mb-1.5 font-semibold text-fg">
            {tooltipPrefix} {labels[hover]}
          </p>
          {series.map((s) => (
            <p
              key={s.key}
              className="flex items-center justify-between gap-4 text-muted"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: s.color }}
                />
                {s.label}
              </span>
              <span className="font-semibold tabular-nums text-fg">
                {s.values[hover]}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export type DonutSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

/** Donut with a 2px surface gap between slices, the total in the middle and a legend beside it. */
export function DonutChart({
  slices,
  centerLabel,
  ariaLabel,
}: {
  slices: DonutSlice[];
  centerLabel: string;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const R = 70;
  const STROKE = 18;
  const C = 2 * Math.PI * R;
  const shown = slices.filter((s) => s.value);
  const gap = shown.length > 1 ? 3 : 0;
  const active = slices.find((s) => s.key === hover);
  const arcs = shown.reduce<
    { slice: DonutSlice; start: number; len: number }[]
  >((acc, slice) => {
    const start = acc.length
      ? acc[acc.length - 1].start + acc[acc.length - 1].len
      : 0;
    return [...acc, { slice, start, len: (slice.value / total) * C }];
  }, []);

  // Container query: legend sits beside the donut only when the card itself is wide enough.
  return (
    <div className="@container">
      <div className="flex flex-col items-center gap-5 @md:flex-row @md:justify-center @md:gap-8">
        <div className="relative h-44 w-44 shrink-0">
          <svg
            viewBox="0 0 180 180"
            className="h-full w-full -rotate-90"
            role="img"
            aria-label={ariaLabel}
          >
            <circle
              cx={90}
              cy={90}
              r={R}
              fill="none"
              stroke="var(--chart-grid)"
              strokeWidth={STROKE}
            />
            {arcs.map(({ slice, start, len }) => {
              const dash = Math.max(0.5, len - gap);
              return (
                <circle
                  key={slice.key}
                  cx={90}
                  cy={90}
                  r={R}
                  fill="none"
                  style={{ stroke: slice.color }}
                  strokeWidth={hover === slice.key ? STROKE + 4 : STROKE}
                  strokeDasharray={`${dash} ${C - dash}`}
                  strokeDashoffset={-start}
                  className="cursor-pointer transition-[stroke-width] duration-200"
                  onMouseEnter={() => setHover(slice.key)}
                  onMouseLeave={() => setHover(null)}
                >
                  <title>{`${slice.label}: ${slice.value}`}</title>
                </circle>
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-3xl font-bold tracking-tight text-fg">
                {active ? active.value : total}
              </p>
              <p className="text-xs text-muted">
                {active ? active.label : centerLabel}
              </p>
            </div>
          </div>
        </div>
        <ul className="w-full min-w-0 max-w-72 space-y-1.5">
          {slices.map((s) => (
            <li
              key={s.key}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${hover === s.key ? "bg-hover" : ""}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: s.color }}
                  aria-hidden="true"
                />
                <span className="truncate text-muted">{s.label}</span>
              </span>
              <span className="tabular-nums">
                <span className="font-semibold text-fg">{s.value}</span>
                <span className="ml-1.5 text-xs text-muted">
                  {total ? Math.round((s.value / total) * 100) : 0}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Tiny trend line for KPI tiles: soft history with an accent dot on the latest value. */
export function Sparkline({
  values,
  color,
  className = "h-10 w-28",
}: {
  values: number[];
  color: string;
  className?: string;
}) {
  const w = 112;
  const h = 40;
  const max = Math.max(1, ...values);
  const pts: Pt[] = values.map((v, i) => [
    values.length === 1 ? w / 2 : 4 + (i / (values.length - 1)) * (w - 8),
    h - 5 - (v / max) * (h - 12),
  ]);
  const line = monotonePath(pts);
  const id = useSvgId("spark");
  const lastPt = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" style={{ stopColor: color }} stopOpacity={0.25} />
          <stop offset="100%" style={{ stopColor: color }} stopOpacity={0} />
        </linearGradient>
      </defs>
      {pts.length > 1 && (
        <path
          d={`${line} L${lastPt[0]},${h} L${pts[0][0]},${h} Z`}
          fill={`url(#${id})`}
        />
      )}
      <path
        d={line}
        fill="none"
        style={{ stroke: color }}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {lastPt && (
        <circle
          cx={lastPt[0]}
          cy={lastPt[1]}
          r={3.5}
          style={{ fill: color }}
          stroke="var(--chart-surface)"
          strokeWidth={2}
        />
      )}
    </svg>
  );
}
