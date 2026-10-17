"use client";

import { createContext, useContext } from "react";
import type { User } from "@/lib/api";

type UserContextValue = { user: User; logout: () => Promise<void> };

export const UserContext = createContext<UserContextValue | null>(null);

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <AppShell>");
  return ctx;
}
