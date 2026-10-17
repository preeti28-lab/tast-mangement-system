import { redirect } from "next/navigation";

// proxy.ts normally handles "/"; this is a fallback.
export default function Home() {
  redirect("/login");
}
