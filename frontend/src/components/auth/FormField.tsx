"use client";

import { useState, type ComponentType, type InputHTMLAttributes } from "react";
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "@/components/icons";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
  /** Leading icon; email and password fields get one by default. Pass `null` for none. */
  icon?: ComponentType<{ className?: string }> | null;
};

const DEFAULT_ICON: Record<string, ComponentType<{ className?: string }>> = { email: MailIcon, password: LockIcon };

export default function FormField({ label, name, error, type = "text", icon, ...rest }: Props) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const errorId = `${name}-error`;
  const Icon = icon === undefined ? DEFAULT_ICON[type] : icon;

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
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
          className={`block h-12 w-full rounded-xl border bg-surface/80 text-sm text-fg shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:bg-surface focus:ring-4 dark:bg-white/[0.03] dark:hover:border-slate-600 dark:focus:bg-white/[0.05] ${
            Icon ? "pl-11" : "pl-4"
          } ${isPassword ? "pr-12" : "pr-4"} ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/15"
              : "border-slate-200 focus:border-brand-500 focus:ring-brand-500/15 dark:border-slate-700 dark:focus:border-brand-500"
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
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
