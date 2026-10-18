"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import FormField from "@/components/auth/FormField";
import FormAlert from "@/components/auth/FormAlert";
import { AuthHeader, AuthSwitch } from "@/components/auth/AuthHeader";
import SubmitButton from "@/components/auth/SubmitButton";
import { ApiError, authApi, type FieldErrors, type Portal } from "@/lib/api";
import { validateLogin, type LoginValues } from "@/lib/validation";

const PORTAL_COPY: Record<Portal, { eyebrow: string; title: string; subtitle: string; link: string }> = {
  admin: {
    eyebrow: "Admin portal",
    title: "Admin login",
    subtitle: "Manage members, roles and what each role can access.",
    link: "bg-violet-50 text-violet-700 ring-violet-600/20 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20",
  },
  manager: {
    eyebrow: "Manager portal",
    title: "Manager login",
    subtitle: "Plan and assign your team's work and see how it's going.",
    link: "bg-sky-50 text-sky-700 ring-sky-600/20 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
  },
};

/** Login form. With `portal`, only that role can sign in (the API enforces it). */
export default function LoginForm({ passwordReset = false, portal }: { passwordReset?: boolean; portal?: Portal }) {
  const copy = portal ? PORTAL_COPY[portal] : null;
  const router = useRouter();
  const [values, setValues] = useState<LoginValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    const found = validateLogin(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      await authApi.login({ email: values.email.trim(), password: values.password, ...(portal ? { portal } : {}) });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(apiErr.errors ?? {});
      setFormError(apiErr.message);
      setLoading(false);
    }
  };

  return (
    <>
      <AuthHeader
        eyebrow={copy?.eyebrow ?? "Sign in"}
        title={copy?.title ?? "Welcome back"}
        subtitle={copy?.subtitle ?? "Log in to pick up right where you left off."}
      />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {passwordReset && !formError && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            Password reset successfully. Log in with your new password.
          </div>
        )}
        <FormAlert message={formError} />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={onChange}
          error={errors.email}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={values.password}
          onChange={onChange}
          error={errors.password}
        />
        <div className="-mt-1 flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
          >
            Forgot password?
          </Link>
        </div>
        <div className="pt-1">
          <SubmitButton loading={loading} arrow>
            {loading ? "Logging in..." : "Log in"}
          </SubmitButton>
        </div>
      </form>

      {portal ? (
        <AuthSwitch text={`Not ${portal === "admin" ? "an admin" : "a manager"}?`} href="/login" label="Use the regular login" />
      ) : (
        <AuthSwitch text="New to NexTask?" href="/register" label="Create an account" />
      )}

      {/* Role portals: only that role can sign in through them */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-muted">Staff login:</span>
        {(["admin", "manager"] as Portal[])
          .filter((p) => p !== portal)
          .map((p) => (
            <Link
              key={p}
              href={`/${p}/login`}
              className={`rounded-full px-3 py-1 font-semibold ring-1 ring-inset transition hover:-translate-y-px ${PORTAL_COPY[p].link}`}
            >
              {PORTAL_COPY[p].title}
            </Link>
          ))}
      </div>
    </>
  );
}
