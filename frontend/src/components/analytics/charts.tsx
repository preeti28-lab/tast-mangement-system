"use client";

import { useEffect, useRef, useState } from "react";

// Small dependency-free SVG charts. Specs: 2px lines, >=8px markers with a surface
// ring, <=24px bars with a 4px rounded data end, hairline solid grid, one y-axis,
// legend for >=2 series, hover tooltip, and a data table for every chart.

export type Series = { key: string; label: string; color: string; values: number[] };

const niceMax = (max: number) => {
  if (max <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const nice = Math.ceil(max / step) * step;
  // Counts: keep the middle tick a whole number.
  return nice % 2 === 0 ? nice : nice + 1;
};

export function Legend({ series }: { series: Pick<Series, "key" | "label" | "color">[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-muted">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} aria-hidden="true" />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

export function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-muted hover:text-slate-800 dark:hover:text-slate-200">
        View data table
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="glass-head text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c} className="py-1 pr-4 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums text-slate-700 dark:text-slate-300">
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-line transition-colors even:glass-row hover:bg-brand-50/60 dark:hover:bg-brand-500/10">
                {row.map((cell, j) => (
                  <td key={j} className="py-1 pr-4">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

const H = 220;
const PAD = { top: 16, right: 40, bottom: 28, left: 32 };

/** Tracks an element's width so the SVG is drawn at real pixel size (text stays legible). */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Multi-series line chart with a crosshair + tooltip. */
export function LineChart({ labels, series, ariaLabel }: { labels: string[]; series: Series[]; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth<HTMLDivElement>(640);
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (labels.length === 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];
  const last = labels.length - 1;
  // Thin out x labels on narrow charts so they never collide.
  const labelEvery = W < 420 ? 3 : 2;

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--chart-axis)">
              {t}
            </text>
          </g>
        ))}
        {labels.map((label, i) =>
          (last - i) % labelEvery === 0 ? (
            <text key={label} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--chart-axis)">
              {label}
            </text>
          ) : null
        )}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--chart-axis)" strokeWidth={1} opacity={0.5} />
        )}
        {series.map((s) => (
          <g key={s.key}>
            <polyline
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* end marker + direct label on the latest value */}
            <circle cx={x(last)} cy={y(s.values[last])} r={4} fill={s.color} stroke="var(--chart-surface)" strokeWidth={2} />
            {hover !== null && (
              <circle cx={x(hover)} cy={y(s.values[hover])} r={4} fill={s.color} stroke="var(--chart-surface)" strokeWidth={2} />
            )}
          </g>
        ))}
        {series.map((s, si) => (
          <text
            key={`${s.key}-label`}
            x={x(last) + 8}
            y={y(s.values[last]) + (series.length > 1 && si === 1 && Math.abs(y(series[0].values[last]) - y(s.values[last])) < 12 ? 12 : 0)}
            dy="0.32em"
            fontSize={11}
            fill="var(--chart-axis)"
          >
            {s.values[last]}
          </text>
        ))}
        {/* hit areas, one per x position (larger than the marks) */}
        {labels.map((label, i) => (
          <rect
            key={`hit-${label}`}
            x={x(i) - innerW / Math.max(1, labels.length - 1) / 2}
            y={PAD.top}
            width={innerW / Math.max(1, labels.length - 1)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 glass-strong rounded-lg px-3 py-2 text-xs"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > last / 2 ? "-105%" : "5%"})` }}
        >
          <p className="mb-1 font-medium text-fg">{labels[hover]}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}: <span className="font-semibold tabular-nums text-fg">{s.values[hover]}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Horizontal bar list for counts by category (single series). */
export function BarList({ items, color = "var(--series-1)" }: { items: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="group grid grid-cols-[88px_1fr_32px] items-center gap-3 text-sm" title={`${item.label}: ${item.value}`}>
          <span className="truncate text-slate-600 dark:text-muted">{item.label}</span>
          <span className="relative h-5">
            <span
              className="absolute inset-y-0 left-0 rounded-r transition-opacity group-hover:opacity-80"
              style={{ width: `${(item.value / max) * 100}%`, minWidth: item.value ? 4 : 0, background: color, maxHeight: 24 }}
            />
          </span>
          <span className="text-right font-medium tabular-nums text-fg">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
