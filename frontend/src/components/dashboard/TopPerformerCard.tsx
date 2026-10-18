import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRightIcon, ChartIcon, CheckCircleIcon, ClockIcon, TrophyIcon } from "@/components/icons";
import Avatar from "@/components/ui/Avatar";
import { EmptyNote } from "@/components/ui/Tile";
import { SectionHeader, cardClass } from "@/components/ui/Surface";
import type { DashboardData } from "@/lib/api";
import { initials } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";

/** Fields the card needs; dashboard `topPerformers` and analytics `perUser` rows both fit. */
export type PerformerRow = Pick<DashboardData["topPerformers"][number], "user" | "assigned" | "completed" | "onTime" | "completionRate">;
type Row = PerformerRow;

const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);

// ---- decorative pieces -----------------------------------------------------

/** Gold crown that sits on the avatar. */
function Crown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 72" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tp-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.55" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path d="M8 62 2 18l30 20L60 4l28 34 30-20-6 44Z" fill="url(#tp-gold)" stroke="#fef3c7" strokeOpacity=".5" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="8" y="58" width="104" height="12" rx="4" fill="url(#tp-gold)" />
      {[2, 60, 118].map((cx, i) => (
        <circle key={cx} cx={cx} cy={i === 1 ? 5 : 18} r="5" fill="#fef3c7" />
      ))}
      <circle cx="60" cy="40" r="5" fill="#ef4444" />
      <circle cx="34" cy="46" r="3.5" fill="#22c55e" />
      <circle cx="86" cy="46" r="3.5" fill="#22c55e" />
    </svg>
  );
}

/** One side of the laurel wreath; mirrored for the right side. */
function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 40 120" className={`h-36 w-12 text-brand-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] ${flip ? "-scale-x-100" : ""}`} aria-hidden="true">
      <path d="M32 116C12 96 6 64 16 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {[18, 34, 50, 66, 82, 98].map((y, i) => (
        <g key={y} fill="currentColor" opacity={0.65 + i * 0.05}>
          <ellipse cx={14 - i * 0.4} cy={y} rx="9" ry="4" transform={`rotate(-35 ${14 - i * 0.4} ${y})`} />
          <ellipse cx={24 + i * 0.6} cy={y + 6} rx="8" ry="3.5" transform={`rotate(30 ${24 + i * 0.6} ${y + 6})`} />
        </g>
      ))}
    </svg>
  );
}

const CONFETTI: { style: CSSProperties; cls: string }[] = [
  { style: { top: "14%", left: "12%", rotate: "25deg" }, cls: "h-3 w-1.5 bg-lime-400" },
  { style: { top: "30%", left: "5%" }, cls: "h-1.5 w-1.5 rounded-full bg-violet-400" },
  { style: { top: "55%", left: "9%", rotate: "45deg" }, cls: "h-2.5 w-2.5 bg-amber-400" },
  { style: { top: "72%", left: "15%" }, cls: "h-1 w-1 rounded-full bg-sky-300" },
  { style: { top: "12%", right: "14%", rotate: "45deg" }, cls: "h-2.5 w-2.5 bg-amber-300" },
  { style: { top: "34%", right: "6%" }, cls: "h-1.5 w-1.5 rounded-full bg-sky-400" },
  { style: { top: "52%", right: "10%", rotate: "45deg" }, cls: "h-2.5 w-2.5 bg-lime-400" },
  { style: { top: "70%", right: "16%" }, cls: "h-1.5 w-1.5 rounded-full bg-amber-400" },
];

/** Avatar on a glowing podium under a spotlight, with crown and laurels. */
function Podium({ row }: { row: Row }) {
  return (
    <div className="relative flex h-full min-h-72 items-end justify-center overflow-hidden pt-6 pb-6">
      {/* Spotlight cone */}
      <span
        className="pointer-events-none absolute top-0 left-1/2 h-full w-[85%] -translate-x-1/2 bg-gradient-to-b from-lime-200/45 via-brand-400/15 to-transparent [clip-path:polygon(38%_0,62%_0,100%_100%,0_100%)]"
        aria-hidden="true"
      />
      {CONFETTI.map((c, i) => (
        <span key={i} className={`absolute ${c.cls} motion-safe:animate-pulse`} style={{ ...c.style, animationDelay: `${i * 220}ms` }} aria-hidden="true" />
      ))}

      <div className="relative flex flex-col items-center">
        <div className="relative flex items-center">
          <Laurel />
          <div className="relative -mx-3">
            <Crown className="absolute -top-14 left-1/2 w-24 -translate-x-1/2 drop-shadow-[0_6px_10px_rgba(245,158,11,0.45)]" />
            <span className="grid h-32 w-32 place-items-center rounded-full bg-gradient-to-b from-brand-400 to-brand-700 text-4xl font-black text-white shadow-[0_0_0_6px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.55),inset_0_2px_0_rgba(255,255,255,0.35)]">
              {initials(row.user.name)}
            </span>
            <span className="absolute top-2 -right-1 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-amber-900 shadow-lg ring-2 ring-emerald-950/60">
              <TrophyIcon className="h-4.5 w-4.5" />
            </span>
          </div>
          <Laurel flip />
        </div>

        {/* Podium plate */}
        <div className="relative -mt-3 flex flex-col items-center">
          <div className="relative z-10 min-w-48 rounded-2xl bg-gradient-to-b from-emerald-900/90 to-slate-950/90 px-5 pt-3 pb-2.5 text-center shadow-xl ring-1 ring-brand-400/30">
            <p className="max-w-52 truncate text-base font-bold text-white">{row.user.name}</p>
            <span className="mt-1 inline-block rounded-md bg-brand-500/20 px-2 py-0.5 text-[11px] font-bold tracking-[0.14em] text-brand-300 uppercase">
              {row.user.role ? ROLE_LABELS[row.user.role] : "Member"}
            </span>
          </div>
          <span
            className="-mt-4 h-9 w-64 max-w-[85vw] rounded-[50%] border-2 border-brand-400/80 bg-brand-500/10 shadow-[0_0_24px_rgba(34,197,94,0.6),inset_0_0_18px_rgba(34,197,94,0.35)]"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

// ---- stat tiles --------------------------------------------------------------

const TILE_TONES = {
  green: {
    box: "from-emerald-500/20 to-emerald-900/30 ring-emerald-400/25",
    icon: "bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-emerald-500/40",
    bar: "from-emerald-400 to-lime-300",
  },
  violet: {
    box: "from-violet-500/20 to-indigo-900/30 ring-violet-400/25",
    icon: "bg-gradient-to-b from-violet-400 to-indigo-600 shadow-violet-500/40",
    bar: "from-violet-400 to-fuchsia-300",
  },
  blue: {
    box: "from-sky-500/20 to-blue-900/30 ring-sky-400/25",
    icon: "bg-gradient-to-b from-sky-400 to-blue-600 shadow-sky-500/40",
    bar: "from-sky-400 to-cyan-300",
  },
};

function StatTile({
  icon,
  value,
  label,
  hint,
  progress,
  tone,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  hint: string;
  progress: number;
  tone: keyof typeof TILE_TONES;
}) {
  const t = TILE_TONES[tone];
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-4 ring-1 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 ${t.box}`}>
      <div className="flex items-center gap-3.5">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-lg ${t.icon}`}>{icon}</span>
        <div className="min-w-0">
          <dd className="text-2xl leading-none font-bold tabular-nums text-white sm:text-3xl">{value}</dd>
          <dt className="mt-1 text-sm text-white/75">{label}</dt>
        </div>
      </div>
      <div className="mt-3.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full bg-gradient-to-r ${t.bar}`} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
        <p className="mt-1.5 truncate text-xs text-white/60">{hint}</p>
      </div>
    </div>
  );
}

/** Ribbon medal with the rank number (gold, silver, bronze). */
function Medal({ rank }: { rank: number }) {
  const colors = [
    ["#fde047", "#d97706"],
    ["#e2e8f0", "#94a3b8"],
    ["#fdba74", "#c2410c"],
  ][rank - 1] ?? ["#cbd5e1", "#64748b"];
  return (
    <svg viewBox="0 0 28 34" className="h-8 w-7 shrink-0" role="img" aria-label={`Rank ${rank}`}>
      <path d="M6 0h6l4 10h-6zM22 0h-6l-4 10h6z" fill="#6366f1" opacity=".85" />
      <circle cx="14" cy="21" r="11" fill={colors[0]} stroke={colors[1]} strokeWidth="2" />
      <text x="14" y="25.5" textAnchor="middle" fontSize="12" fontWeight="800" fill={colors[1]}>
        {rank}
      </text>
    </svg>
  );
}

/** Spotlight on the team's top performer, with a leaderboard (dashboard and analytics). */
export default function TopPerformerCard({
  rows,
  currentUserId,
  showAnalyticsLink,
}: {
  rows: PerformerRow[];
  currentUserId: string;
  showAnalyticsLink: boolean;
}) {
  const top = rows[0];

  if (!top) {
    return (
      <section className={`p-5 sm:p-6 ${cardClass}`}>
        <SectionHeader icon={TrophyIcon} tone="amber" title="Top performer" subtitle="Who's completed the most tasks across the team" />
        <EmptyNote>No completed tasks yet. The top performer shows up here once someone finishes an assigned task.</EmptyNote>
      </section>
    );
  }

  const isMe = top.user._id === currentUserId;

  return (
    <section aria-labelledby="top-performer-title" className="space-y-4">
      {/* Neon hero: fixed dark palette in both themes, like a stage */}
      <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_top_left,#065f46_0%,transparent_55%),linear-gradient(120deg,#062e2a_0%,#0b1d33_55%,#0d3b3a_100%)] text-white shadow-[0_0_0_1px_rgba(45,212,191,0.35),0_0_32px_-6px_rgba(45,212,191,0.45),0_24px_48px_-24px_rgba(0,0,0,0.6)]">
        {/* Flowing light lines, top right */}
        <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="pointer-events-none absolute top-0 right-0 h-48 w-2/3 opacity-60" aria-hidden="true">
          {[0, 14, 28, 42].map((d) => (
            <path key={d} d={`M0 ${150 - d} C150 ${60 - d} 300 ${210 - d} 600 ${40 - d}`} fill="none" stroke="#2dd4bf" strokeOpacity={0.35 - d / 200} strokeWidth="1.2" />
          ))}
        </svg>

        <div className="relative grid lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.6fr)]">
          <Podium row={top} />

          <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-7 lg:pl-2">
            <header className="flex flex-wrap items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-amber-400/25 to-amber-700/20 text-amber-300 ring-1 ring-amber-300/30">
                <TrophyIcon className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1 basis-48">
                <h3 id="top-performer-title" className="text-xl font-bold text-amber-300 sm:text-2xl">
                  Top performer
                </h3>
                <p className="mt-0.5 text-sm text-white/70">Who&apos;s completed the most tasks across the team</p>
              </div>
              {showAnalyticsLink && (
                <Link
                  href="/analytics"
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-400/50 bg-brand-500/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-brand-300 hover:bg-brand-500/20 hover:shadow-[0_0_20px_rgba(34,197,94,0.35)] focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none"
                >
                  <ChartIcon className="h-5 w-5 text-brand-300" />
                  Analytics
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              )}
            </header>

            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.12em] text-brand-300 uppercase">{isMe ? "That's you! 🎉" : "Leading the team"}</p>
              <p className="mt-1 truncate text-3xl font-bold tracking-tight sm:text-4xl">{top.user.name}</p>
              <p className="mt-0.5 truncate text-sm text-white/70 sm:text-base">{top.user.email}</p>
            </div>

            <dl className="grid gap-3 sm:grid-cols-3">
              <StatTile
                tone="green"
                icon={<CheckCircleIcon className="h-6 w-6" />}
                value={top.completed}
                label="Completed"
                hint={`of ${top.assigned} assigned`}
                progress={pct(top.completed, top.assigned)}
              />
              <StatTile
                tone="violet"
                icon={
                  <span
                    className="h-6 w-6 rounded-full"
                    style={{ background: `conic-gradient(#fff ${top.completionRate * 3.6}deg, rgba(255,255,255,0.25) 0)`, mask: "radial-gradient(circle, transparent 52%, #000 54%)" }}
                  />
                }
                value={`${top.completionRate}%`}
                label="Completion"
                hint="of assigned tasks done"
                progress={top.completionRate}
              />
              <StatTile
                tone="blue"
                icon={<ClockIcon className="h-6 w-6" />}
                value={top.onTime}
                label="On time"
                hint={`${pct(top.onTime, top.completed)}% of completed`}
                progress={pct(top.onTime, top.completed)}
              />
            </dl>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <p className="mb-2 px-1 text-xs font-semibold tracking-[0.12em] text-muted uppercase">Leaderboard</p>
        <ol className="space-y-2">
          {rows.map((row, i) => {
            const me = row.user._id === currentUserId;
            return (
              <li
                key={row.user._id}
                className={`glass flex items-center gap-3 rounded-2xl px-4 py-3 transition duration-200 hover:-translate-y-0.5 sm:gap-4 sm:px-5 ${
                  i === 0 ? "border-amber-400/40! bg-gradient-to-r from-amber-100/80 to-amber-50/30 dark:from-amber-500/15 dark:to-amber-500/5" : ""
                }`}
              >
                <Medal rank={i + 1} />
                <Avatar name={row.user.name} size="sm" />
                <span className="min-w-0 flex-1 truncate font-medium text-fg">
                  {row.user.name}
                  {me && <span className="ml-1.5 text-sm font-normal text-muted">(you)</span>}
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-fg sm:text-base">{row.completed} done</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
