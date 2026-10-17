import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Log in · TaskFlow" };

export default function LoginPage() {
  return <LoginForm />;
}
