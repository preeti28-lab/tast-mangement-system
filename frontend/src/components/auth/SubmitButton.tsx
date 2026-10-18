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
      className="btn-shine btn-3d btn-3d-brand group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 px-4 text-sm font-semibold text-white hover:from-brand-600 hover:to-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {children}
      {arrow && !loading && <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />}
    </button>
  );
}
