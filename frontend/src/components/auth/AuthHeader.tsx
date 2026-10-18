import Link from "next/link";

/** Title block at the top of the auth card: small eyebrow, heading, subtitle. */
export function AuthHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: React.ReactNode }) {
  return (
    <div className="mb-7">
      <p className="text-xs font-semibold tracking-[0.12em] text-brand-600 uppercase dark:text-brand-400">{eyebrow}</p>
      <h1 className="mt-2 text-[1.75rem] leading-tight font-semibold tracking-tight text-fg">{title}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{subtitle}</p>
    </div>
  );
}

/** "Don't have an account? Sign up" row under a hairline divider. */
export function AuthSwitch({ text, href, label }: { text: string; href: string; label: string }) {
  return (
    <p className="mt-8 border-t border-line pt-6 text-center text-sm text-muted">
      {text}{" "}
      <Link
        href={href}
        className="font-semibold text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
      >
        {label}
      </Link>
    </p>
  );
}

const ROLE_TABS = [
  { href: "/login", label: "Member", portal: undefined },
  { href: "/manager/login", label: "Manager", portal: "manager" },
  { href: "/admin/login", label: "Admin", portal: "admin" },
] as const;

/** Segmented "sign in as" switcher between the member, manager and admin logins. */
export function RoleTabs({ active }: { active?: "manager" | "admin" }) {
  return (
    <nav aria-label="Sign in as" className="mb-7 grid grid-cols-3 gap-1 rounded-xl border border-line bg-hover/60 p-1 text-sm">
      {ROLE_TABS.map((t) => {
        const isActive = t.portal === active;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-center font-medium transition-colors ${
              isActive ? "bg-surface text-fg shadow-sm ring-1 ring-line dark:bg-white/10" : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
