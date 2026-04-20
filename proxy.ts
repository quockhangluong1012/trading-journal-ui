import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_TOKEN_COOKIE = "trading-journey-token";
const AUTH_ROLE_COOKIE = "trading-journey-role";

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/admin/login",
]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

function isAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/fonts")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAssetPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const role = request.cookies.get(AUTH_ROLE_COOKIE)?.value;
  const isAdmin = role === "admin";

  if (!token && !isPublicPath(pathname)) {
    const loginPath = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/admin/login" && token && isAdmin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!token || !isAdmin) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
