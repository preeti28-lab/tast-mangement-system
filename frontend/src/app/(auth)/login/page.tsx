import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Log in · TaskFlow" };

type SearchParams = Promise<{ reset?: string }>;

// Reads ?reset=1 (set after a successful password reset) at request time.
async function LoginWithResetNotice({ searchParams }: { searchParams: SearchParams }) {
  const { reset } = await searchParams;
  return <LoginForm passwordReset={reset === "1"} />;
}

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  // searchParams is runtime data, so it must sit inside <Suspense> (Cache Components).
  // The plain form is the prerendered fallback; the reset notice streams in.
  return (
    <Suspense fallback={<LoginForm />}>
      <LoginWithResetNotice searchParams={searchParams} />
    </Suspense>
  );
}
