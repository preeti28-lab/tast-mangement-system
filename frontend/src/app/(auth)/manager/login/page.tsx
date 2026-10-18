import type { Metadata } from "next";
import LoginForm from "../../login/LoginForm";

export const metadata: Metadata = { title: "Manager login · NexTask" };

// Only managers can sign in here; the API rejects other roles.
export default function ManagerLoginPage() {
  return <LoginForm portal="manager" />;
}
