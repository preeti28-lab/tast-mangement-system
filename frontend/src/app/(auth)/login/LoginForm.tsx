"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import FormField from "@/components/auth/FormField";
import FormAlert from "@/components/auth/FormAlert";
import { AuthHeader, AuthSwitch, RoleTabs } from "@/components/auth/AuthHeader";
import SubmitButton from "@/components/auth/SubmitButton";
import { ApiError, authApi, type FieldErrors, type Portal } from "@/lib/api";
import { validateLogin, type LoginValues } from "@/lib/validation";

const PORTAL_COPY: Record<Portal, { eyebrow: string; title: string; subtitle: string }> = {
  admin: {
    eyebrow: "Admin sign in",
    title: "Admin login",
    subtitle: "Manage members, roles and what each role can access.",
  },
  manager: {
    eyebrow: "Manager sign in",
    title: "Manager login",
    subtitle: "Plan and assign your team's work and see how it's going.",
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
  // Signed in, waiting for the dashboard: say so, so nobody reloads mid-way.
  const [redirecting, setRedirecting] = useState(false);

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
      setRedirecting(true);
      router.replace("/dashboard");
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(apiErr.errors ?? {});
      setFormError(apiErr.message);
      setLoading(false);
    }
  };

  return (
    <>
      <RoleTabs active={portal} />
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
          placeholder="Enter your password"
          value={values.password}
          onChange={onChange}
          error={errors.password}
          labelAction={
            <Link
              href="/forgot-password"
              className="text-[13px] font-medium text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
            >
              Forgot password?
            </Link>
          }
        />
        <div className="pt-2">
          <SubmitButton loading={loading} arrow>
            {redirecting ? "Signed in! Opening your dashboard…" : loading ? "Checking your details…" : "Log in"}
          </SubmitButton>
        </div>
      </form>

      {portal ? (
        <p className="mt-8 border-t border-line pt-6 text-center text-sm text-muted">
          Staff accounts are created by an admin from the Team page.
        </p>
      ) : (
        <AuthSwitch text="New to NexTask?" href="/register" label="Create an account" />
      )}
    </>
  );
}
