"use client";

import { useState } from "react";
import type { Analytics } from "@/lib/api";
import { initials } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import { EmptyNote } from "@/components/ui/Tile";

type Row = Analytics["perUser"][number];

// Four non-overlapping map "zones" (position + colours); the busiest member gets the largest.
const ZONES = [
  {
    fill: "from-brand-400 to-emerald-600 dark:from-brand-500 dark:to-emerald-700",
    ring: "ring-brand-500 dark:ring-brand-400",
    dot: "bg-brand-500 dark:bg-brand-400",
    avatar: "from-brand-500 to-emerald-700",
    pos: "top-[5%] left-[5%] w-[52%] h-[44%]",
  },
  {
    fill: "from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600",
    ring: "ring-amber-500 dark:ring-amber-400",
    dot: "bg-amber-500 dark:bg-amber-400",
    avatar: "from-amber-500 to-orange-600",
    pos: "top-[5%] right-[5%] w-[36%] h-[54%]",
  },
  {
    fill: "from-emerald-400 to-teal-500 dark:from-emerald-500 dark:to-teal-600",
    ring: "ring-emerald-500 dark:ring-emerald-400",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    avatar: "from-emerald-500 to-teal-600",
    pos: "bottom-[5%] left-[5%] w-[40%] h-[42%]",
  },
  {
    fill: "from-fuchsia-400 to-pink-500 dark:from-fuchsia-500 dark:to-pink-600",
    ring: "ring-fuchsia-500 dark:ring-fuchsia-400",
    dot: "bg-fuchsia-500 dark:bg-fuchsia-400",
    avatar: "from-fuchsia-500 to-pink-600",
    pos: "bottom-[5%] right-[5%] w-[48%] h-[32%]",
  },
];

const PinIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

const open = (row: Row) => row.assigned - row.completed;

/**
 * Workload map (territory-map style): the team's four busiest members, by open
 * tasks, as coloured zones on a grid board. Clicking a zone or its legend row
 * shows that person's numbers.
 */
export default function WorkloadMap({ perUser }: { perUser: Row[] }) {
  const zones = [...perUser]
    .filter((row) => row.assigned > 0)
    .sort((a, b) => open(b) - open(a) || b.assigned - a.assigned)
    .slice(0, ZONES.length)
    .map((row, i) => ({ row, style: ZONES[i] }));

  const [activeId, setActiveId] = useState<string | null>(null);
  const selected = zones.find((z) => z.row.user._id === activeId) ?? zones[0];
  const totalOpen = perUser.reduce((sum, row) => sum + open(row), 0);
  const busyMembers = perUser.filter((row) => open(row) > 0).length;

  return (
    <section className="@container w-full glass overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 truncate text-lg font-bold tracking-tight text-fg">
            <span className="text-brand-500 dark:text-brand-400">
              <PinIcon />
            </span>
            Team workload map
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            {busyMembers} member{busyMembers === 1 ? "" : "s"} with open work · {totalOpen} open task
            {totalOpen === 1 ? "" : "s"} · busiest {zones.length} shown
          </p>
        </div>
      </header>

      {zones.length === 0 ? (
        <EmptyNote className="m-5">
          No assigned tasks yet. The map fills in as work is assigned to the team.
        </EmptyNote>
      ) : (
        <div className="grid grid-cols-1 gap-5 p-5 @min-[720px]:grid-cols-[1.4fr_1fr]">
          {/* Board */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 ring-1 ring-black/5 ring-inset dark:from-slate-800 dark:to-slate-950 dark:ring-white/10">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(148,163,184,0.3)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.3)_1px,transparent_1px)] [background-size:22px_22px]" />
            {zones.map(({ row, style }) => {
              const isActive = selected?.row.user._id === row.user._id;
              return (
                <button
                  key={row.user._id}
                  type="button"
                  onClick={() => setActiveId(row.user._id)}
                  aria-pressed={isActive}
                  aria-label={`${row.user.name}, ${open(row)} open task${open(row) === 1 ? "" : "s"}`}
                  className={`absolute ${style.pos} flex flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-br ${style.fill} p-2 text-center text-white shadow-md ring-1 ring-white/20 ring-inset transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${
                    isActive ? `scale-[1.04] ring-2 ${style.ring} shadow-lg` : "opacity-90 hover:opacity-100 hover:shadow-lg"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-[11px] font-bold ring-1 ring-white/40 backdrop-blur-sm">
                    {initials(row.user.name)}
                  </span>
                  <span className="max-w-full truncate px-1 text-[12px] font-bold tracking-tight drop-shadow-sm">
                    {row.user.name.split(" ")[0]}
                  </span>
                  <span className="text-[10.5px] font-semibold text-white/90">{open(row)} open</span>
                </button>
              );
            })}
          </div>

          {/* Legend + details */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">Busiest members</p>
            <ul className="flex flex-col gap-1.5">
              {zones.map(({ row, style }) => {
                const isActive = selected?.row.user._id === row.user._id;
                return (
                  <li key={row.user._id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(row.user._id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none ${
                        isActive
                          ? "border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10"
                          : "border-slate-200 bg-white hover:border-brand-200 hover:bg-hover dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-brand-500/30"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${style.avatar} text-[11px] font-bold text-white shadow-sm ring-2 ring-surface`}
                      >
                        {initials(row.user.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                          <span className="truncate text-[13px] font-semibold text-fg">{row.user.name}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted">
                          {row.user.role ? ROLE_LABELS[row.user.role] : "Member"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[12px] font-bold tabular-nums text-fg">{open(row)}</span>
                        <span className="block text-[10px] text-slate-400 dark:text-slate-500">open</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {selected && (
              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                  {selected.row.user.name}
                </p>
                <p className="mt-0.5 mb-2 truncate text-[12px] text-slate-600 dark:text-muted">{selected.row.user.email}</p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] text-slate-700 dark:text-slate-300">
                  <div>
                    <dt className="inline text-slate-400">Assigned </dt>
                    <dd className="inline font-semibold tabular-nums">{selected.row.assigned}</dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-400">Completed </dt>
                    <dd className="inline font-semibold tabular-nums">{selected.row.completed}</dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-400">Overdue </dt>
                    <dd className={`inline font-semibold tabular-nums ${selected.row.overdue ? "text-red-600 dark:text-red-400" : ""}`}>
                      {selected.row.overdue}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-400">On time </dt>
                    <dd className="inline font-semibold tabular-nums">{selected.row.onTime}</dd>
                  </div>
                  <div className="col-span-2 mt-1">
                    <dt className="sr-only">Completion rate</dt>
                    <dd className="flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <span
                          className="block h-full rounded-full bg-emerald-500"
                          style={{ width: `${selected.row.completionRate}%` }}
                        />
                      </span>
                      <span className="font-bold tabular-nums text-fg">{selected.row.completionRate}%</span>
                      <span className="text-slate-400">done</span>
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
