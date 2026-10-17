"use client";

import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { authApi, type User } from "@/lib/api";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { UserContext } from "./UserContext";

export function Spinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    </div>
  );
}

// Loads the current user once and renders the sidebar + navbar around every app page.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    authApi
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => router.replace("/login"));
  }, [router]);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    router.replace("/login");
    router.refresh();
  }, [router]);

  const ctx = useMemo(() => (user ? { user, logout } : null), [user, logout]);

  if (!ctx) return <Spinner />;

  return (
    <UserContext.Provider value={ctx}>
      <ToastProvider>
        <div className="flex min-h-screen flex-1 bg-zinc-50 dark:bg-zinc-950">
          <Suspense>
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          </Suspense>
          <div className="flex min-w-0 flex-1 flex-col">
            <Navbar onMenuClick={() => setSidebarOpen(true)} />
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </UserContext.Provider>
  );
}
