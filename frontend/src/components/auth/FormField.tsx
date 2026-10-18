"use client";

import { useState, type ComponentType, type InputHTMLAttributes } from "react";
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "@/components/icons";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
  /** Leading icon; email and password fields get one by default. Pass `null` for none. */
  icon?: ComponentType<{ className?: string }> | null;
  /** Shown at the right of the label row (e.g. a "Forgot password?" link). */
  labelAction?: React.ReactNode;
};

const DEFAULT_ICON: Record<string, ComponentType<{ className?: string }>> = { email: MailIcon, password: LockIcon };

export default function FormField({ label, name, error, type = "text", icon, labelAction, ...rest }: Props) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const errorId = `${name}-error`;
  const Icon = icon === undefined ? DEFAULT_ICON[type] : icon;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={name} className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="group relative">
        {Icon && (
          <Icon
            className={`pointer-events-none absolute top-1/2 left-3.5 z-10 h-[18px] w-[18px] -translate-y-1/2 transition-colors ${
              error ? "text-red-500" : "text-slate-400 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400"
            }`}
          />
        )}
        <input
          id={name}
          name={name}
          type={isPassword && show ? "text" : type}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`block h-11 w-full rounded-lg border bg-surface text-sm text-fg shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 hover:border-slate-400/70 focus:ring-[3px] dark:bg-white/[0.03] dark:hover:border-slate-500 ${
            Icon ? "pl-11" : "pl-4"
          } ${isPassword ? "pr-12" : "pr-4"} ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/15"
              : "border-slate-300/80 focus:border-brand-500 focus:ring-brand-500/15 dark:border-slate-700 dark:focus:border-brand-500"
          }`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-hover hover:text-fg focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
