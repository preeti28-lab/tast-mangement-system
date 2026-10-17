export default function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 text-lg font-semibold ${
        inverted ? "text-white" : "text-indigo-600"
      }`}
    >
      <span
        className={`grid h-9 w-9 place-items-center rounded-lg ${
          inverted ? "bg-white/15" : "bg-indigo-600 text-white"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      TaskFlow
    </div>
  );
}
