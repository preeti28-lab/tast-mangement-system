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

export function validateRegister(v: RegisterValues): FieldErrors {
  const errors: FieldErrors = {};
  const name = v.name.trim();
  if (!name) errors.name = "Name is required";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters";
  else if (name.length > 50) errors.name = "Name must be at most 50 characters";

  errors.email = validateEmail(v.email);

  if (!v.password) errors.password = "Password is required";
  else if (v.password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password))
    errors.password = "Password must contain a letter and a number";

  if (!v.confirmPassword) errors.confirmPassword = "Please confirm your password";
  else if (v.confirmPassword !== v.password) errors.confirmPassword = "Passwords do not match";

  return clean(errors);
}

function clean(errors: FieldErrors): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, msg]) => msg));
}
