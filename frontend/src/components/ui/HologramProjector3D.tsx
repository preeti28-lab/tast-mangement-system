const BARS = [50, 80, 35, 95, 65];
const MOTES = [20, 45, 65, 80];

// Brand-green palettes. "dark" is for always-dark surfaces (the auth photo panel);
// "auto" follows the app theme, so it reads on a light page too.
const TONES = {
  dark: {
    glow: "bg-[radial-gradient(closest-side,rgba(34,197,94,0.22),transparent)]",
    cone: "from-brand-400/30 via-brand-400/10",
    mote: "bg-lime-300/90",
    panel: "border-brand-300/60 bg-brand-400/10 shadow-[0_0_18px_rgba(34,197,94,0.25)]",
    title: "text-brand-100",
    bar: "from-lime-300/90 to-brand-400/70",
    stat: "text-lime-300",
    scan: "bg-[repeating-linear-gradient(0deg,transparent_0_3px,rgba(134,239,172,0.16)_3px_4px)]",
    base: "from-slate-600 to-slate-800",
    beam: "bg-brand-300 shadow-[0_0_24px_#4ade80,0_0_60px_rgba(34,197,94,0.6)]",
    caption: "text-brand-300/70",
  },
  auto: {
    glow: "bg-[radial-gradient(closest-side,rgba(22,163,74,0.16),transparent)] dark:bg-[radial-gradient(closest-side,rgba(34,197,94,0.2),transparent)]",
    cone: "from-brand-500/25 via-brand-500/8 dark:from-brand-400/30 dark:via-brand-400/10",
    mote: "bg-brand-500/80 dark:bg-lime-300/90",
    panel: "border-brand-600/50 bg-brand-500/10 shadow-[0_0_18px_rgba(22,163,74,0.18)] dark:border-brand-300/60 dark:bg-brand-400/10",
    title: "text-brand-800 dark:text-brand-100",
    bar: "from-brand-400 to-brand-600/80 dark:from-lime-300/90 dark:to-brand-400/70",
    stat: "text-brand-700 dark:text-lime-300",
    scan: "bg-[repeating-linear-gradient(0deg,transparent_0_3px,rgba(22,163,74,0.10)_3px_4px)]",
    base: "from-slate-300 to-slate-500 dark:from-slate-600 dark:to-slate-800",
    beam: "bg-brand-400 shadow-[0_0_20px_#22c55e,0_0_50px_rgba(34,197,94,0.45)]",
    caption: "text-brand-700/70 dark:text-brand-300/70",
  },
} as const;

/**
 * Hologram projector: a glowing emitter disc beams a flickering green hologram of
 * rotating NexTask data panels with scanlines and motes drifting up the light cone.
 * No frame: it floats on whatever it sits on, over a soft glow. Pure CSS, decorative
 * only; animation stops for reduced-motion users.
 */
export default function HologramProjector3D({
  title = "NEXTASK",
  stat = "▲ 3× on-time",
  caption = "live · workspace sync",
  bars = BARS,
  tone = "dark",
  className = "",
}: {
  title?: string;
  /** Bar heights in % (0–100) shown on each panel. */
  bars?: number[];
  stat?: string;
  caption?: string;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <div aria-hidden="true" className={`relative grid h-[300px] w-full place-items-center ${className}`}>
      <style>{`
        @keyframes tf-holo-spin { from { transform: rotateX(-8deg) rotateY(0); } to { transform: rotateX(-8deg) rotateY(360deg); } }
        @keyframes tf-holo-flicker { 0%,100% { opacity: .95; } 8% { opacity: .55; } 10% { opacity: .9; } 54% { opacity: .98; } 56% { opacity: .6; } 58% { opacity: .92; } }
        @keyframes tf-holo-mote { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(-120px); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .tf-holo-anim { animation: none !important; } }
      `}</style>

      {/* soft glow instead of a box */}
      <span className={`pointer-events-none absolute bottom-6 left-1/2 h-[260px] w-[340px] -translate-x-1/2 ${t.glow}`} />

      {/* light cone */}
      <span
        className={`absolute bottom-[64px] left-1/2 h-[170px] w-[210px] -translate-x-1/2 bg-gradient-to-t to-transparent [clip-path:polygon(38%_100%,62%_100%,100%_0,0_0)] ${t.cone}`}
      />

      {MOTES.map((l, i) => (
        <span
          key={l}
          style={{ left: `${30 + l * 0.4}%`, bottom: 90, animation: `tf-holo-mote ${2.6 + i * 0.7}s ${i * 0.5}s linear infinite` }}
          className={`tf-holo-anim absolute h-1 w-1 rounded-full ${t.mote}`}
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
              className={`absolute inset-0 rounded-lg border p-2 backdrop-blur-[1px] [backface-visibility:hidden] ${t.panel}`}
            >
              <p className={`flex items-center gap-1 font-mono text-[9px] font-black tracking-widest ${t.title}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny decorative mark inside a CSS 3D face */}
                <img src="/logo.png" alt="" width={11} height={11} className="h-[11px] w-[11px]" />
                {title}
              </p>
              <div className="mt-1.5 flex h-10 items-end gap-1">
                {bars.map((h, i) => (
                  <span key={i} style={{ height: `${Math.max(6, Math.min(100, h))}%` }} className={`flex-1 rounded-t-sm bg-gradient-to-t ${t.bar}`} />
                ))}
              </div>
              <p className={`mt-1 font-mono text-[8.5px] font-bold ${t.stat}`}>{stat}</p>
              <span className={`pointer-events-none absolute inset-0 rounded-lg ${t.scan}`} />
            </div>
          ))}
        </div>
      </div>

      {/* emitter */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <span className={`block h-5 w-[130px] rounded-[50%] bg-gradient-to-b shadow-[0_14px_26px_-8px_rgba(0,0,0,0.6)] ${t.base}`} />
        <span className={`absolute top-[3px] left-1/2 h-2.5 w-[86px] -translate-x-1/2 animate-pulse rounded-[50%] motion-reduce:animate-none ${t.beam}`} />
      </div>
      <p className={`absolute bottom-3 font-mono text-[9.5px] font-bold tracking-[0.3em] uppercase ${t.caption}`}>{caption}</p>
    </div>
  );
}
