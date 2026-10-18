import type { FieldErrors } from "./api";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export type LoginValues = { email: string; password: string };
export type RegisterValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const validateEmail = (email: string) => {
  if (!email.trim()) return "Email is required";
  if (!EMAIL_RE.test(email.trim())) return "Please enter a valid email";
};

export function validateLogin(v: LoginValues): FieldErrors {
  const errors: FieldErrors = {};
  errors.email = validateEmail(v.email);
  if (!v.password) errors.password = "Password is required";
  return clean(errors);
}

export type ResetValues = { otp: string; password: string; confirmPassword: string };

export function validateForgot(email: string): FieldErrors {
  return clean({ email: validateEmail(email) });
}

export function validateReset(v: ResetValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!/^\d{6}$/.test(v.otp.trim())) errors.otp = "Enter the 6-digit OTP from your email";
  Object.assign(errors, validateNewPassword(v.password, v.confirmPassword));
  return clean(errors);
}

function validateNewPassword(password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    errors.password = "Password must contain a letter and a number";

  if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
  else if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match";
  return errors;
}

export function validateRegister(v: RegisterValues): FieldErrors {
  const errors: FieldErrors = {};
  const name = v.name.trim();
  if (!name) errors.name = "Name is required";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters";
  else if (name.length > 50) errors.name = "Name must be at most 50 characters";

  errors.email = validateEmail(v.email);

  Object.assign(errors, validateNewPassword(v.password, v.confirmPassword));

  return clean(errors);
}

function clean(errors: FieldErrors): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, msg]) => msg));
}
