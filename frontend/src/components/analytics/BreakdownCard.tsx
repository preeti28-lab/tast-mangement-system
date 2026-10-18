import type { ComponentType, SVGProps } from "react";
import { SectionHeader, cardClass, type Tone } from "@/components/ui/Surface";

export type BreakdownItem = { label: string; value: number; color: string };

/**
 * Share-of-total breakdown: one stacked bar showing each category's slice, then a
 * row per category with its own colour, count and percentage.
 */
export default function BreakdownCard({
  title,
  subtitle,
  icon,
  tone,
  items,
}: {
  title: string;
  subtitle?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: Tone;
  items: BreakdownItem[];
}) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);

  return (
    <section className={`p-5 sm:p-6 ${cardClass}`}>
      <SectionHeader
        icon={icon}
        tone={tone}
        title={title}
        subtitle={subtitle}
        action={
          <span className="rounded-full bg-hover px-2.5 py-1 text-xs font-semibold tabular-nums text-muted">{total} total</span>
        }
      />

      <div
        className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-hover"
        role="img"
        aria-label={items.map((i) => `${i.label} ${pct(i.value)}%`).join(", ")}
      >
        {items.map((i) =>
          i.value ? (
            <span
              key={i.label}
              className={`h-full transition-[width] duration-700 ease-out first:rounded-l-full last:rounded-r-full ${i.color}`}
              style={{ width: `${(i.value / total) * 100}%` }}
              title={`${i.label}: ${i.value}`}
            />
          ) : null
        )}
      </div>

      <ul className="mt-5 space-y-3">
        {items.map((i) => (
          <li key={i.label} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${i.color}`} aria-hidden="true" />
              <span className="truncate text-muted">{i.label}</span>
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-hover">
              <span
                className={`block h-full rounded-full transition-[width] duration-700 ease-out ${i.color}`}
                style={{ width: `${pct(i.value)}%` }}
              />
            </span>
            <span className="w-20 text-right tabular-nums">
              <span className="font-semibold text-fg">{i.value}</span>
              <span className="ml-1.5 text-xs text-muted">{pct(i.value)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
