// Light/dark theme. The `.dark` class on <html> drives every `dark:` utility and
// the tokens in globals.css. A saved choice lives in localStorage; without one we
// follow the OS setting (and keep following it if it changes).

export type Theme = "light" | "dark";
/** What the user picked: a fixed theme, or follow the OS. */
export type ThemePreference = Theme | "system";

export const THEME_STORAGE_KEY = "taskflow-theme";

// Must match the background of each theme in globals.css (used for the browser UI color).
export const THEME_COLOR: Record<Theme, string> = { light: "#f8fafc", dark: "#0b1220" };

// Runs inline in <head> before first paint so the page never flashes the wrong theme.
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.style.colorScheme=t}catch(e){}})()`;

const listeners = new Set<() => void>();

function readSaved(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

const systemQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function apply(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 300);
  }
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", THEME_COLOR[theme]));
  listeners.forEach((l) => l());
}

export function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode etc.) — still switch for this page view.
  }
  apply(theme, true);
}

export function getThemePreference(): ThemePreference {
  return readSaved() ?? "system";
}

export function setThemePreference(preference: ThemePreference) {
  if (preference !== "system") return setTheme(preference);
  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Storage blocked — nothing saved to clear.
  }
  apply(systemQuery().matches ? "dark" : "light", true);
}

/** Subscribe to theme changes (for useSyncExternalStore). */
export function subscribeTheme(listener: () => void) {
  listeners.add(listener);

  // Follow the OS setting while the user hasn't picked a theme.
  const media = systemQuery();
  const onSystemChange = () => {
    if (!readSaved()) apply(media.matches ? "dark" : "light", true);
  };
  // Keep tabs in sync when the choice changes in another tab.
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) apply(readSaved() ?? (media.matches ? "dark" : "light"), false);
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}
