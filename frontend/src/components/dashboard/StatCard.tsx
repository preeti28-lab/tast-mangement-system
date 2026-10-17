import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

type Props = {
  label: string;
  value: number;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: "indigo" | "sky" | "red" | "emerald";
};

const TONES: Record<Props["tone"], string> = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
  red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
};

export default function StatCard({ label, value, href, icon: Icon, tone }: Props) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500/50"
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${TONES[tone]}`}>
        <Icon />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">{value}</p>
      </div>
    </Link>
  );
}
