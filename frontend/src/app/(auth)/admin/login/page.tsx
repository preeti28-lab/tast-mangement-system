import type { Metadata } from "next";
import LoginForm from "../../login/LoginForm";

export const metadata: Metadata = { title: "Admin login · NexTask" };

// Only admins can sign in here; the API rejects other roles.
export default function AdminLoginPage() {
  return <LoginForm portal="admin" />;
}
