export default function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-2xl font-bold tracking-tight">
      <span
        className={`grid h-11 w-11 place-items-center rounded-xl ${
          inverted
            ? "bg-white/15 text-white"
            : "bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-md shadow-brand-600/25"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.75">
          <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>
        <span className={inverted ? "text-white" : "text-fg"}>Task</span>
        <span className={inverted ? "text-brand-200" : "text-brand-600 dark:text-brand-400"}>Flow</span>
      </span>
    </div>
  );
}
