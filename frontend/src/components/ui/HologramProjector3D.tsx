const BARS = [50, 80, 35, 95, 65];
const MOTES = [20, 45, 65, 80];

/**
 * Hologram projector: a glowing emitter disc beams a flickering cyan hologram of
 * rotating TaskFlow data panels with scanlines and motes drifting up the light
 * cone. Pure CSS, decorative only; animation stops for reduced-motion users.
 */
export default function HologramProjector3D({
  title = "TASKFLOW",
  stat = "▲ 3× on-time",
  caption = "live · workspace sync",
  bars = BARS,
  className = "",
}: {
  title?: string;
  /** Bar heights in % (0–100) shown on each panel. */
  bars?: number[];
  stat?: string;
  caption?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative grid h-[300px] w-full place-items-center overflow-hidden rounded-3xl bg-[radial-gradient(80%_80%_at_50%_30%,rgba(4,47,46,0.82),rgba(2,6,23,0.88)_75%)] ring-1 ring-white/10 backdrop-blur-sm ${className}`}
    >
      <style>{`
        @keyframes tf-holo-spin { from { transform: rotateX(-8deg) rotateY(0); } to { transform: rotateX(-8deg) rotateY(360deg); } }
        @keyframes tf-holo-flicker { 0%,100% { opacity: .95; } 8% { opacity: .55; } 10% { opacity: .9; } 54% { opacity: .98; } 56% { opacity: .6; } 58% { opacity: .92; } }
        @keyframes tf-holo-mote { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(-120px); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .tf-holo-anim { animation: none !important; } }
      `}</style>

      {/* light cone */}
      <span className="absolute bottom-[64px] left-1/2 h-[170px] w-[210px] -translate-x-1/2 bg-gradient-to-t from-cyan-400/25 via-cyan-400/10 to-transparent [clip-path:polygon(38%_100%,62%_100%,100%_0,0_0)]" />

      {MOTES.map((l, i) => (
        <span
          key={l}
          style={{ left: `${30 + l * 0.4}%`, bottom: 90, animation: `tf-holo-mote ${2.6 + i * 0.7}s ${i * 0.5}s linear infinite` }}
          className="tf-holo-anim absolute h-1 w-1 rounded-full bg-cyan-300/90"
        />
      ))}

      {/* hologram */}
      <div style={{ perspective: "700px" }} className="absolute bottom-[112px] left-1/2 -translate-x-1/2">
        <div
          style={{ transformStyle: "preserve-3d", animation: "tf-holo-spin 12s linear infinite, tf-holo-flicker 4s steps(1) infinite" }}
          className="tf-holo-anim relative h-[110px] w-[110px]"
        >
          {[0, 90, 180, 270].map((deg) => (
            <div
              key={deg}
              style={{ transform: `rotateY(${deg}deg) translateZ(62px)` }}
              className="absolute inset-0 rounded-lg border border-cyan-300/60 bg-cyan-400/10 p-2 backdrop-blur-[1px] [backface-visibility:hidden]"
            >
              <p className="font-mono text-[9px] font-black tracking-widest text-cyan-200">{title}</p>
              <div className="mt-1.5 flex h-10 items-end gap-1">
                {bars.map((h, i) => (
                  <span key={i} style={{ height: `${Math.max(6, Math.min(100, h))}%` }} className="flex-1 rounded-t-sm bg-cyan-300/70" />
                ))}
              </div>
              <p className="mt-1 font-mono text-[8.5px] font-bold text-emerald-300">{stat}</p>
              <span className="pointer-events-none absolute inset-0 rounded-lg bg-[repeating-linear-gradient(0deg,transparent_0_3px,rgba(103,232,249,0.14)_3px_4px)]" />
            </div>
          ))}
        </div>
      </div>

      {/* emitter */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <span className="block h-5 w-[130px] rounded-[50%] bg-gradient-to-b from-slate-600 to-slate-800 shadow-[0_14px_26px_-8px_rgba(0,0,0,0.8)]" />
        <span className="absolute left-1/2 top-[3px] h-2.5 w-[86px] -translate-x-1/2 animate-pulse rounded-[50%] bg-cyan-300 shadow-[0_0_24px_#22d3ee,0_0_60px_rgba(34,211,238,0.6)] motion-reduce:animate-none" />
        <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-5">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
        </span>
      </div>
      <p className="absolute bottom-3 font-mono text-[9.5px] font-bold uppercase tracking-[0.3em] text-cyan-400/60">{caption}</p>
    </div>
  );
}
