import type { ButtonHTMLAttributes, ComponentType, ReactNode, SVGProps } from "react";
import { primaryButtonClass, secondaryButtonClass } from "./Surface";

/** Small spinning ring for buttons and inline loading. */
export function Spinner({ className = "h-4 w-4", light = true }: { className?: string; light?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 animate-spin rounded-full border-2 ${light ? "border-white/40 border-t-white" : "border-slate-300 border-t-slate-600"} ${className}`}
    />
  );
}

const VARIANTS = {
  primary: primaryButtonClass,
  secondary: secondaryButtonClass,
  danger:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:opacity-60",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  children: ReactNode;
};

/** App button in the shared primary / secondary / danger styles. */
export function Button({ variant = "primary", loading = false, icon: Icon, className = "", disabled, type = "button", children, ...rest }: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} className={`${VARIANTS[variant]} ${className}`} {...rest}>
      {loading ? <Spinner light={variant !== "secondary"} /> : Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Accessible name, also used as the tooltip. */
  label: string;
  tone?: "default" | "danger";
};

/** Square icon-only button for row actions (edit, delete…). */
export function IconButton({ icon: Icon, label, tone = "default", className = "", type = "button", ...rest }: IconButtonProps) {
  const toneClass =
    tone === "danger"
      ? "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
      : "hover:bg-hover hover:text-brand-600 dark:hover:text-brand-400";
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:opacity-40 xl:h-8 xl:w-8 ${toneClass} ${className}`}
      {...rest}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
