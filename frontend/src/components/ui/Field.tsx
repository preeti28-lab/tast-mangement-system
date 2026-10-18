import type { ReactNode, SelectHTMLAttributes } from "react";
import { selectClass } from "@/components/tasks/options";

/** Label + control + hint/error, laid out like FormField. */
export function Field({
  id,
  label,
  optional = false,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">
        {label} {optional && <span className="font-normal text-slate-400">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Input/select classes for controls inside a Field (matches FormField inputs). */
export const fieldControlClass = (error?: string) =>
  `${selectClass} block w-full disabled:opacity-50 ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`;

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
};

/** Labelled native select. */
export function SelectField({ id, label, options, hint, error, optional, ...rest }: SelectFieldProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional}>
      <select
        id={id}
        name={rest.name ?? id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={fieldControlClass(error)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
