import Image from "next/image";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/layout/ThemeToggle";
import HologramProjector3D from "@/components/ui/HologramProjector3D";

const HIGHLIGHTS = [
  "Create, assign and track tasks in one place",
  "Get notified when work lands on your plate",
  "See what's overdue before it slips",
];

const STATS = [
  { value: "3×", label: "more on-time delivery" },
  { value: "24/7", label: "offline-ready access" },
  { value: "100%", label: "team visibility" },
];

const AVATARS = [
  { initials: "AK", tone: "from-amber-300 to-orange-500" },
  { initials: "PS", tone: "from-sky-300 to-blue-500" },
  { initials: "RM", tone: "from-emerald-300 to-teal-500" },
  { initials: "NJ", tone: "from-fuchsia-300 to-violet-500" },
];

// Team photo by Annie Spratt on Unsplash (Unsplash License).
const PHOTO = "/images/auth-team.jpg";

function Check() {
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-300/30 to-emerald-300/20 ring-1 ring-white/25">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // One screen tall on desktop: both panels fit the viewport, so the page never scrolls.
    <div className="flex min-h-dvh flex-1 flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* Visual panel (desktop): team photo under a green wash, hologram and social proof */}
      <aside className="relative hidden overflow-hidden text-white lg:flex lg:w-[52%] xl:w-[55%]">
        <Image src={PHOTO} alt="" fill sizes="(min-width: 1280px) 55vw, 52vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-brand-950/85 to-slate-900/85" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-400/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden="true" />

        <div className="relative flex w-full flex-col justify-between gap-6 p-10 xl:px-14 [@media(max-height:860px)]:py-7">
          <div className="flex items-center justify-between">
            <Logo inverted />
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-100 ring-1 ring-white/15 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              All systems online
            </span>
          </div>

          <div className="mx-auto w-full max-w-lg space-y-6">
            {/* Shrinks on shorter screens and drops out on very short ones, so the panel always fits */}
            <HologramProjector3D className="[@media(max-height:900px)]:h-[230px] [@media(max-height:760px)]:hidden" />
            <div className="space-y-4">
              <h2 className="text-4xl leading-[1.1] font-bold tracking-tight xl:text-5xl [@media(max-height:860px)]:text-4xl">
                Organize your work,{" "}
                <span className="bg-gradient-to-r from-brand-200 via-emerald-100 to-brand-300 bg-clip-text text-transparent">
                  one task at a time.
                </span>
              </h2>
              <ul className="space-y-3 text-brand-100">
                {HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <Check />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mx-auto w-full max-w-lg space-y-4">
            <figure className="rounded-2xl bg-white/10 p-5 [@media(max-height:1020px)]:hidden ring-1 ring-white/15 backdrop-blur-xl">
              <blockquote className="text-sm leading-relaxed text-brand-50">
                &ldquo;Our whole team finally knows who owns what. Deadlines stopped slipping the first week.&rdquo;
              </blockquote>
              <figcaption className="mt-4 flex items-center justify-between gap-3">
                <div className="flex -space-x-2">
                  {AVATARS.map((a) => (
                    <span
                      key={a.initials}
                      className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white ring-2 ring-brand-950 ${a.tone}`}
                    >
                      {a.initials}
                    </span>
                  ))}
                </div>
                <span className="flex items-center gap-1 text-amber-300" aria-label="Rated 5 out of 5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <svg key={i} viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
                      <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.8l-5.3 2.8 1-5.8L1.5 7.7l5.9-.9z" />
                    </svg>
                  ))}
                </span>
              </figcaption>
            </figure>
            <dl className="grid grid-cols-3 gap-3">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10 backdrop-blur-md">
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-xl font-bold tracking-tight">{s.value}</dd>
                  <dd className="text-[11px] leading-tight text-brand-200">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </aside>

      {/* Form side */}
      <main className="relative flex flex-1 flex-col overflow-x-hidden bg-app lg:overflow-y-auto">
        <ThemeToggle className="absolute right-4 top-4 z-20 bg-surface/80 text-fg shadow-sm ring-1 ring-line backdrop-blur-md sm:right-6 sm:top-6 lg:bg-transparent lg:text-muted lg:shadow-none lg:ring-0" />
        {/* Mobile / tablet hero banner with the same photo */}
        <div className="relative h-44 shrink-0 overflow-hidden sm:h-52 lg:hidden">
          <Image src={PHOTO} alt="" fill sizes="100vw" className="object-cover object-[50%_35%]" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-brand-950/80 to-slate-900/90" aria-hidden="true" />
          <div className="relative mx-auto flex h-full max-w-md flex-col justify-center px-5 pb-10 text-white sm:px-6">
            <Logo inverted />
            <p className="mt-3 text-lg font-semibold leading-snug sm:text-xl">
              Organize your work,{" "}
              <span className="bg-gradient-to-r from-brand-200 to-brand-300 bg-clip-text text-transparent">one task at a time.</span>
            </p>
          </div>
        </div>

        {/* Soft background blobs. Clipped: one sits past the bottom edge and would otherwise
            make the form side scroll by ~160px. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-brand-300/25 blur-3xl dark:bg-brand-600/15" />
          <div className="absolute -bottom-40 -left-24 h-[26rem] w-[26rem] rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-700/10" />
        </div>

        <div className="relative z-10 -mt-8 flex flex-1 items-start justify-center px-4 pb-8 sm:px-6 lg:mt-0 lg:items-center lg:py-8">
          <div className="w-full max-w-md">
            {/* Card: solid surface, hairline border, soft neutral shadow */}
            <div className="rounded-2xl border border-slate-200/80 bg-surface p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_24px_48px_-28px_rgba(15,23,42,0.22)] sm:p-10 lg:[@media(max-height:820px)]:p-8 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.7)]">
              {children}
            </div>

            <div className="mt-5 flex flex-col items-center gap-1.5 text-xs text-muted lg:[@media(max-height:760px)]:hidden">
              <p className="inline-flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                Secured with encrypted, httpOnly sessions
              </p>
              <p>NexTask &middot; Task Management System</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
