"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";
import { getTheme, getThemePreference, setTheme, subscribeTheme, type Theme, type ThemePreference } from "@/lib/theme";

// Server render has no theme yet; the client snapshot takes over right after hydration.
const getServerTheme = (): Theme | null => null;

export function useTheme() {
  return useSyncExternalStore<Theme | null>(subscribeTheme, getTheme, getServerTheme);
}

const getServerPreference = (): ThemePreference | null => null;

export function useThemePreference() {
  return useSyncExternalStore<ThemePreference | null>(subscribeTheme, getThemePreference, getServerPreference);
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-600 transition-all duration-200 ease-out hover:scale-105 hover:bg-hover hover:text-fg dark:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-95 ${className}`}
    >
      {/* Both icons share one grid cell and cross-fade. */}
      <SunIcon
        className={`col-start-1 row-start-1 h-5 w-5 transition-all duration-300 motion-reduce:transition-none ${
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
        }`}
      />
      <MoonIcon
        className={`col-start-1 row-start-1 h-5 w-5 transition-all duration-300 motion-reduce:transition-none ${
          isDark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      />
    </button>
  );
}
