"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import FormField from "@/components/auth/FormField";
import FormAlert from "@/components/auth/FormAlert";
import SubmitButton from "@/components/auth/SubmitButton";
import { ApiError, authApi, type FieldErrors } from "@/lib/api";
import { validateForgot, validateReset, type ResetValues } from "@/lib/validation";

// Step 1 asks for the email and mails an OTP; step 2 takes the OTP and the new password.
export default function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [values, setValues] = useState<ResetValues>({ otp: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  // Seconds until another OTP can be requested (the server allows one a minute).
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const fail = (err: unknown) => {
    const apiErr = err as ApiError;
    setErrors(apiErr.errors ?? {});
    setFormError(apiErr.message);
  };

  const sendOtp = async () => {
    setFormError("");
    setInfo("");
    const found = validateForgot(email);
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      const { message } = await authApi.forgotPassword({ email: email.trim() });
      setInfo(message);
      setStep("reset");
      setCooldown(60);
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitEmail = (e: FormEvent) => {
    e.preventDefault();
    sendOtp();
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const onSubmitReset = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    const found = validateReset(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      await authApi.resetPassword({
        email: email.trim(),
        otp: values.otp.trim(),
        password: values.password,
      });
      router.replace("/login?reset=1");
    } catch (err) {
      fail(err);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-7 space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-fg">Reset password</h1>
        <p className="text-sm text-muted">
          {step === "email"
            ? "Enter your account email and we'll send you a 6-digit OTP."
            : `Enter the OTP sent to ${email.trim()} and choose a new password.`}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={onSubmitEmail} noValidate className="space-y-4">
          <FormAlert message={formError} />
          <FormField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((err) => ({ ...err, email: undefined }));
            }}
            error={errors.email}
          />
          <SubmitButton loading={loading}>{loading ? "Sending OTP..." : "Send OTP"}</SubmitButton>
        </form>
      ) : (
        <form onSubmit={onSubmitReset} noValidate className="space-y-4">
          {info && !formError && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {info}
            </div>
          )}
          <FormAlert message={formError} />
          <FormField
            label="OTP"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            value={values.otp}
            onChange={onChange}
            error={errors.otp}
          />
          <FormField
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={values.password}
            onChange={onChange}
            error={errors.password}
          />
          <FormField
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            value={values.confirmPassword}
            onChange={onChange}
            error={errors.confirmPassword}
          />
          <SubmitButton loading={loading}>{loading ? "Resetting..." : "Reset password"}</SubmitButton>
          <div className="flex justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setFormError("");
                setErrors({});
              }}
              className="font-medium text-muted hover:text-slate-800 dark:hover:text-slate-200"
            >
              Change email
            </button>
            <button
              type="button"
              onClick={sendOtp}
              disabled={loading || cooldown > 0}
              className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 disabled:opacity-60"
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
          Back to log in
        </Link>
      </p>
    </>
  );
}
