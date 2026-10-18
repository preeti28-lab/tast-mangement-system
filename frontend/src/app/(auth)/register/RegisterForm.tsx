"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import FormField from "@/components/auth/FormField";
import FormAlert from "@/components/auth/FormAlert";
import SubmitButton from "@/components/auth/SubmitButton";
import { ApiError, authApi, type FieldErrors } from "@/lib/api";
import { validateRegister, type RegisterValues } from "@/lib/validation";

export default function RegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState<RegisterValues>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
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
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      await authApi.register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
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
      <div className="mb-7 space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Create your account</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Start managing your tasks in seconds.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormAlert message={formError} />
        <FormField
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          value={values.name}
          onChange={onChange}
          error={errors.name}
        />
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
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            value={values.password}
            onChange={onChange}
            error={errors.password}
          />
          <FormField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            value={values.confirmPassword}
            onChange={onChange}
            error={errors.confirmPassword}
          />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          At least 8 characters, including a letter and a number.
        </p>
        <SubmitButton loading={loading}>
          {loading ? "Creating account..." : "Create account"}
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Log in
        </Link>
      </p>
    </>
  );
}
