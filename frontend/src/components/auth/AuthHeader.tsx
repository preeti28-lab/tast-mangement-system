import Image from "next/image";
import Link from "next/link";

/** Title block at the top of the auth card: brand mark with an eyebrow, heading, subtitle. */
export function AuthHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2.5">
        <Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 object-contain drop-shadow-[0_6px_12px_rgba(34,197,94,0.35)]" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-brand-700 uppercase ring-1 ring-brand-600/15 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
          {eyebrow}
        </span>
      </div>
      <h1 className="mt-5 text-[1.9rem] leading-tight font-bold tracking-tight text-fg">{title}</h1>
      <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
    </div>
  );
}

/** "Don't have an account? Sign up" row under a hairline divider. */
export function AuthSwitch({ text, href, label }: { text: string; href: string; label: string }) {
  return (
    <div className="mt-7 border-t border-line pt-6 text-center text-sm text-muted">
      {text}{" "}
      <Link
        href={href}
        className="font-semibold text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
      >
        {label}
      </Link>
    </div>
  );
}
