"use client";

import { themeInitScript } from "@/lib/theme";

// Sets the theme class on <html> before first paint (see "Preventing flash before
// hydration" in the Next.js docs). The script runs during HTML parsing on full page
// loads; on the client it renders as text/plain so React doesn't warn about it.
export default function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
    />
  );
}
