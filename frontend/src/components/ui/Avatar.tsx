import { initials } from "@/lib/format";

const SIZES = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-11 w-11 text-sm",
};

/** Round brand-gradient badge with a person's initials. */
export default function Avatar({ name, size = "sm", className = "" }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      title={name}
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-semibold text-white shadow-sm ring-2 ring-white/70 dark:ring-slate-900/60 ${SIZES[size]} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
