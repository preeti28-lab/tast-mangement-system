import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/layout/ThemeToggle";
import HologramProjector3D from "@/components/ui/HologramProjector3D";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/Surface";

export const metadata: Metadata = { title: "Page not found · NexTask" };

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-app text-fg">
      <div className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-brand-300/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-[26rem] w-[26rem] rounded-full bg-emerald-300/15 blur-3xl" aria-hidden="true" />

      <header className="relative flex items-center justify-between px-4 py-5 sm:px-8">
        <Link href="/" aria-label="NexTask home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-12 sm:px-8">
        <div className="grid w-full max-w-4xl items-center gap-8 md:grid-cols-2 md:gap-12">
          <HologramProjector3D
            title="ERROR 404"
            stat="▼ signal lost"
            caption="searching · no task found"
            bars={[30, 12, 45, 8, 20]}
            tone="auto"
            className="h-[280px] sm:h-[320px]"
          />

          <div className="text-center md:text-left">
            <p className="font-mono text-sm font-bold tracking-[0.3em] text-brand-600 uppercase dark:text-brand-400">404</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">This page drifted off the board.</h1>
            <p className="mt-4 text-base text-muted">
              The link may be broken, or the page was moved. Your tasks are safe, so let&apos;s get you back to them.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Link href="/dashboard" className={primaryButtonClass}>
                Go to dashboard
              </Link>
              <Link href="/tasks" className={secondaryButtonClass}>
                View my tasks
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
