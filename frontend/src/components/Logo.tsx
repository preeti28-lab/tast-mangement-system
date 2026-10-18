import Image from "next/image";

export default function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
      <Image
        src="/logo.png"
        alt=""
        width={44}
        height={44}
        priority
        className="h-11 w-11 shrink-0 object-contain drop-shadow-[0_6px_14px_rgba(34,197,94,0.35)]"
      />
      <span>
        <span className={inverted ? "text-white" : "text-fg"}>Nex</span>
        <span className={inverted ? "text-brand-200" : "text-brand-600 dark:text-brand-400"}>Task</span>
      </span>
    </div>
  );
}
