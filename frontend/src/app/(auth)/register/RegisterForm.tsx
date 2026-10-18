"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import FormField from "@/components/auth/FormField";
import FormAlert from "@/components/auth/FormAlert";
import SubmitButton from "@/components/auth/SubmitButton";
import { AuthHeader, AuthSwitch } from "@/components/auth/AuthHeader";
import { UserIcon } from "@/components/icons";
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
      <AuthHeader eyebrow="Get started" title="Create your account" subtitle="Start managing your tasks in seconds. It's free." />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormAlert message={formError} />
        <FormField
          label="Full name"
          name="name"
          icon={UserIcon}
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
        <p className="text-xs text-muted">
          At least 8 characters, including a letter and a number.
        </p>
        <SubmitButton loading={loading} arrow>
          {loading ? "Creating account..." : "Create account"}
        </SubmitButton>
      </form>

      <AuthSwitch text="Already have an account?" href="/login" label="Log in" />
    </>
  );
}
