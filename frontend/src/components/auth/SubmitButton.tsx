type Props = { loading: boolean; children: React.ReactNode };

export default function SubmitButton({ loading, children }: Props) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-3d btn-3d-brand flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}
