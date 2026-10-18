import Logo from "@/components/Logo";
import ExplodedUiStack3D from "@/components/ui/ExplodedUiStack3D";

const HIGHLIGHTS = [
  "Create, assign and track tasks in one place",
  "Get notified when work lands on your plate",
  "See what's overdue before it slips",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-12 text-white lg:flex">
        {/* soft decorative shapes */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" aria-hidden="true" />

        <Logo inverted />
        <div className="relative max-w-md space-y-6">
          <ExplodedUiStack3D className="[@media(max-height:820px)]:hidden" />
          <h2 className="text-4xl font-bold leading-tight tracking-tight">Organize your work, one task at a time.</h2>
          <ul className="space-y-3 text-indigo-100">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-indigo-200">TaskFlow &middot; Task Management System</p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-[#f7f7fc] bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,rgba(129,140,248,0.12),transparent)] px-4 py-12 sm:px-6 dark:bg-zinc-950 dark:bg-none">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_16px_40px_-16px_rgba(79,70,229,0.25)] sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
