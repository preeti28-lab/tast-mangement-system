"use client";

/** 3D switch: recessed track, raised knob. */
export default function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "bg-gradient-to-b from-brand-600 to-brand-500 shadow-[inset_0_2px_4px_rgba(5,46,22,0.35)]"
          : "well-3d bg-slate-300! dark:bg-slate-700!"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-gradient-to-b from-white to-slate-100 shadow-[0_2px_4px_rgba(15,23,42,0.3),inset_0_-1px_0_rgba(15,23,42,0.08)] transition-all duration-200 ease-out ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}
