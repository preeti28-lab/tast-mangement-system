import { initials } from "@/lib/format";

/**
 * Pop-out portrait: on hover, focus or tap the subject escapes its frame. It
 * scales up and leans over the border while the backdrop stays clipped,
 * grayscale flips to colour, the name plate glows and the chips slide up.
 * Uses `img` when given, otherwise a big initials bust (users have no photos).
 * Tailwind only applies hover on hover-capable devices, so focus (tap) lifts it too.
 */
export default function PopOutPortrait3D({
  name,
  role,
  img,
  chips = [],
  badge,
  className = "",
}: {
  name: string;
  role: string;
  img?: string;
  chips?: string[];
  badge?: string;
  className?: string;
}) {
  const subject =
    "absolute bottom-[54px] left-1/2 h-[170px] w-[150px] -translate-x-1/2 rounded-b-[75px] grayscale transition-all duration-500 [clip-path:inset(0_0_0_0_round_0_0_75px_75px)] group-hover:-translate-y-5 group-hover:scale-[1.16] group-hover:grayscale-0 group-hover:[filter:drop-shadow(0_22px_24px_rgba(2,6,23,0.6))] group-focus:-translate-y-5 group-focus:scale-[1.16] group-focus:grayscale-0 motion-reduce:transition-none";

  return (
    <div className={`grid w-full place-items-center pt-6 pb-12 ${className}`} style={{ perspective: "700px" }}>
      <div
        tabIndex={0}
        aria-label={`${name}, ${role}`}
        className="group relative w-[200px] cursor-pointer rounded-[22px] outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-slate-900"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* frame */}
        <div className="relative h-[220px] overflow-visible rounded-[22px] bg-gradient-to-b from-brand-600 to-emerald-800 shadow-[0_24px_50px_-16px_rgba(22,163,74,0.45)] ring-1 ring-white/20 transition-transform duration-500 group-hover:[transform:rotateX(6deg)_rotateY(-6deg)] group-focus:[transform:rotateX(6deg)_rotateY(-6deg)] motion-reduce:transition-none">
          {/* clipped backdrop circle */}
          <span className="absolute top-9 left-1/2 h-[150px] w-[150px] -translate-x-1/2 rounded-full bg-slate-950/40 ring-1 ring-white/15" aria-hidden="true" />

          {badge && (
            <span
              className="absolute -top-3 -right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-base shadow-lg ring-2 ring-surface"
              aria-hidden="true"
            >
              {badge}
            </span>
          )}

          {/* subject: overflows the frame on hover */}
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element -- decorative, arbitrary avatar URL
            <img src={img} alt="" className={`${subject} object-cover object-top`} />
          ) : (
            <div
              className={`${subject} grid place-items-center rounded-t-[75px] bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 [clip-path:inset(0_round_75px)]`}
              aria-hidden="true"
            >
              <span className="text-5xl font-black tracking-tight text-white drop-shadow-sm">{initials(name)}</span>
            </div>
          )}

          {/* name plate */}
          <div className="absolute inset-x-3 bottom-3 rounded-xl bg-white/10 px-3 py-2 text-center backdrop-blur-md transition-all duration-500 group-hover:bg-white/20 group-hover:shadow-[0_0_24px_rgba(255,255,255,0.25)] group-focus:bg-white/20">
            <p className="truncate text-[13.5px] font-extrabold text-white">{name}</p>
            <p className="truncate text-[10px] font-bold tracking-[0.14em] text-brand-200 uppercase">{role}</p>
          </div>
        </div>

        {/* chips slide up */}
        {chips.length > 0 && (
          <div className="pointer-events-none absolute -bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5 opacity-0 transition-all duration-500 group-hover:-bottom-9 group-hover:opacity-100 group-focus:-bottom-9 group-focus:opacity-100">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black whitespace-nowrap text-white shadow-lg dark:bg-white dark:text-slate-900"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
