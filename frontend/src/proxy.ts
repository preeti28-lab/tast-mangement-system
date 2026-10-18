import { NextResponse, type NextRequest } from "next/server";

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/admin/login", "/manager/login"];
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/tasks",
  "/notifications",
  "/analytics",
  "/activity",
  "/team",
  "/settings",
  "/profile",
];

// Optimistic redirect based on cookie presence; the backend still verifies the JWT.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has("token");

  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasToken ? "/dashboard" : "/login", request.url));
  }
  if (!hasToken && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasToken && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/tasks/:path*",
    "/notifications/:path*",
    "/analytics/:path*",
    "/activity/:path*",
    "/team/:path*",
    "/settings/:path*",
    "/profile/:path*",
    // Router prefetches of the auth pages are skipped: right after login the client
    // re-prefetches the /login link, and redirecting that request to /dashboard 404s.
    {
      source: "/(login|register|forgot-password|admin/login|manager/login)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
