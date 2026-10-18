"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
};

export default function FormField({ label, name, error, type = "text", ...rest }: Props) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const errorId = `${name}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={isPassword && show ? "text" : type}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`block w-full rounded-xl border bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:ring-2 dark:bg-zinc-900 dark:text-zinc-100 ${
            isPassword ? "pr-16" : ""
          } ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-zinc-200 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-zinc-700"
          }`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? "Hide" : "Show"}
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
