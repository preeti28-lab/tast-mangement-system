import { ArrowRightIcon } from "@/components/icons";

type Props = {
  loading: boolean;
  children: React.ReactNode;
  /** Trailing arrow that nudges right on hover (auth forms). */
  arrow?: boolean;
};

export default function SubmitButton({ loading, children, arrow = false }: Props) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.15)] transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {children}
      {arrow && !loading && <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />}
    </button>
  );
}
