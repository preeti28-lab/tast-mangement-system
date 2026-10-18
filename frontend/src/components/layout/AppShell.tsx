"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AppLoader, InlineLoader } from "@/components/ui/Loader";
import { ToastProvider } from "@/components/ui/Toast";
import { authApi, type ApiError, type User } from "@/lib/api";
import { clearOfflineQueue } from "@/lib/offlineQueue";
import Navbar from "./Navbar";
import TiltController from "@/components/ui/TiltController";
import OfflineSync from "./OfflineSync";
import Sidebar from "./Sidebar";
import { UserContext } from "./UserContext";

/** Inline loader, kept under its old name for existing call sites. */
export function Spinner() {
  return <InlineLoader />;
}

// Loads the current user once and renders the sidebar + navbar around every app page.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    authApi
      .me()
      .then(({ user }) => setUser(user))
      .catch(async (err: ApiError) => {
        if (err.status === 401) {
          // Stale session: make sure the cookie is gone, then do a full page load so
          // proxy.ts sees no cookie and doesn't bounce back to the dashboard.
          await authApi.logout().catch(() => {});
          window.location.replace("/login");
        } else {
          router.replace("/login");
        }
      });
  }, [router]);

  const logout = useCallback(async () => {
    clearOfflineQueue();
    // Drop cached API responses so the next user on this device can't see them offline.
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_API_CACHE" });
    await authApi.logout().catch(() => {});
    router.replace("/login");
    router.refresh();
  }, [router]);

  const ctx = useMemo(() => (user ? { user, logout } : null), [user, logout]);

  if (!ctx) return <AppLoader />;

  return (
    <UserContext.Provider value={ctx}>
      <ToastProvider>
        <OfflineSync />
        <TiltController />
        <div className="relative isolate flex min-h-screen flex-1 bg-app">
          {/* Color blobs the glass cards frost over */}
          <div className="glass-backdrop" aria-hidden="true">
            <span className="-top-32 right-[-8rem] h-[28rem] w-[28rem] bg-emerald-300 dark:bg-emerald-500" />
            <span className="top-1/3 -left-40 h-[26rem] w-[26rem] bg-sky-300 dark:bg-sky-600" />
            <span className="right-1/4 -bottom-40 h-[24rem] w-[24rem] bg-violet-300 dark:bg-violet-600" />
          </div>
          <Suspense>
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          </Suspense>
          <div className="flex min-w-0 flex-1 flex-col">
            <Navbar onMenuClick={() => setSidebarOpen(true)} />
            <main key={pathname} className="page-enter flex-1 px-4 pt-4 pb-7 sm:px-6 lg:px-10">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </UserContext.Provider>
  );
}
