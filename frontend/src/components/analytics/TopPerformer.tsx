"use client";

import { useState } from "react";
import { TrophyIcon } from "@/components/icons";
import { SectionHeader, cardClass } from "@/components/ui/Surface";
import type { Analytics } from "@/lib/api";
import { initials } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";

type Row = Analytics["perUser"][number];

/**
 * Pop-out portrait of the team's top performer: on hover (or tap) the portrait
 * escapes its frame — it scales up and leans over the border, grayscale flips to
 * colour, the name plate glows and their stat chips slide up. Users have no
 * photos, so the portrait is a big initials bust. Purely decorative — the same
 * numbers are listed next to it as text.
 */
function PopOutPortrait({ top }: { top: Row }) {
  const [lifted, setLifted] = useState(false);

  return (
    <div
      onMouseEnter={() => setLifted(true)}
      onMouseLeave={() => setLifted(false)}
      onClick={() => setLifted((v) => !v)}
      aria-hidden="true"
      className="relative grid h-[340px] w-full cursor-pointer place-items-center overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-50 to-violet-100 select-none dark:from-zinc-900 dark:to-indigo-950"
      style={{ perspective: "700px" }}
    >
      <div className="relative w-[200px]" style={{ transformStyle: "preserve-3d" }}>
        {/* frame */}
        <div
          className="relative h-[220px] rounded-[22px] bg-gradient-to-b from-indigo-600 to-violet-700 shadow-[0_24px_50px_-16px_rgba(79,70,229,0.55)] ring-1 ring-white/20 transition-transform duration-500"
          style={{ transform: lifted ? "rotateX(6deg) rotateY(-6deg)" : undefined }}
        >
          {/* backdrop circle */}
          <span className="absolute top-9 left-1/2 h-[150px] w-[150px] -translate-x-1/2 rounded-full bg-slate-950/40 ring-1 ring-white/15" />

          {/* rank badge */}
          <span className="absolute -top-3 -right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-base shadow-lg ring-2 ring-white dark:ring-zinc-900">
            🏆
          </span>

          {/* portrait — overflows the frame when lifted */}
          <div
            className={`absolute bottom-[54px] left-1/2 grid h-[170px] w-[150px] -translate-x-1/2 place-items-center rounded-t-[75px] rounded-b-[75px] bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 transition-all duration-500 ${
              lifted ? "-translate-y-5 scale-[1.16] grayscale-0" : "grayscale"
            }`}
            style={{ filter: lifted ? "drop-shadow(0 22px 24px rgba(2,6,23,0.6))" : undefined }}
          >
            <span className="text-5xl font-black tracking-tight text-white drop-shadow-sm">{initials(top.user.name)}</span>
          </div>

          {/* name plate */}
          <div
            className={`absolute inset-x-3 bottom-3 rounded-xl px-3 py-2 text-center backdrop-blur-md transition-all duration-500 ${
              lifted ? "bg-white/20 shadow-[0_0_24px_rgba(255,255,255,0.25)]" : "bg-white/10"
            }`}
          >
            <p className="truncate text-[13.5px] font-extrabold text-white">{top.user.name}</p>
            <p className="truncate text-[10px] font-bold tracking-[0.14em] text-indigo-200 uppercase">
              {top.user.role ? ROLE_LABELS[top.user.role] : "Team member"}
            </p>
          </div>
        </div>

        {/* stat chips slide up */}
        <div
          className={`absolute left-1/2 flex -translate-x-1/2 gap-1.5 transition-all duration-500 ${
            lifted ? "-bottom-9 opacity-100" : "-bottom-5 opacity-0"
          }`}
        >
          {[`${top.completed} done`, `${top.completionRate}%`, `${top.onTime} on time`].map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black whitespace-nowrap text-white shadow-lg dark:bg-white dark:text-slate-900"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
      <p className="pointer-events-none absolute top-3 text-[10.5px] font-bold tracking-[0.18em] text-indigo-400/70 uppercase dark:text-indigo-300/50">
        hover or tap the portrait
      </p>
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function TopPerformer({ perUser }: { perUser: Row[] }) {
  // perUser is already ranked by completed tasks (then by assigned).
  const ranked = perUser.filter((row) => row.completed > 0);
  const top = ranked[0];

  return (
    <section className={`p-5 sm:p-6 ${cardClass}`}>
      <SectionHeader
        icon={TrophyIcon}
        tone="amber"
        title="Top performer"
        subtitle="Who completed the most tasks across the team."
      />

      {!top ? (
        <p className="mt-5 rounded-xl border border-dashed border-zinc-200 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No completed tasks yet. The top performer shows up here once someone finishes a task.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <PopOutPortrait top={top} />

          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 p-[3px]">
                <span className="grid h-full w-full place-items-center rounded-full bg-white font-bold text-indigo-600 dark:bg-zinc-900 dark:text-indigo-300">
                  {initials(top.user.name)}
                </span>
              </span>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-zinc-900 dark:text-white">{top.user.name}</p>
                <p className="truncate text-sm text-zinc-500">
                  {top.user.role ? `${ROLE_LABELS[top.user.role]} · ` : ""}
                  {top.user.email}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-3">
              {[
                { label: "Completed", value: top.completed },
                { label: "Completion", value: `${top.completionRate}%` },
                { label: "On time", value: top.onTime },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-zinc-200 px-3 py-3 text-center dark:border-zinc-800">
                  <dd className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">{s.value}</dd>
                  <dt className="mt-0.5 text-xs text-zinc-500">{s.label}</dt>
                </div>
              ))}
            </dl>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Leaderboard</p>
              <ol className="space-y-2">
                {ranked.slice(0, 3).map((row, i) => (
                  <li
                    key={row.user._id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                      i === 0
                        ? "bg-amber-50 dark:bg-amber-400/10"
                        : "border border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <span className="w-6 text-center text-lg" aria-label={`Rank ${i + 1}`}>
                      {MEDALS[i]}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-zinc-800 dark:text-zinc-200">
                      {row.user.name}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
                      {row.completed} done
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
