export function getSafeNextPath(nextPath: string | null | undefined, fallback = "/"): string {
  if (!nextPath) {
    return fallback;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return fallback;
  }

  return nextPath;
}

export function getSafeAdminNextPath(nextPath: string | null | undefined, fallback = "/admin"): string {
  const safeNextPath = getSafeNextPath(nextPath, fallback);
  return safeNextPath.startsWith("/admin") ? safeNextPath : fallback;
}

export function buildRedirectWithNext(loginPath: string, nextPath: string): string {
  const params = new URLSearchParams({
    next: getSafeNextPath(nextPath, "/"),
  });

  return `${loginPath}?${params.toString()}`;
}

export function getLoginRouteForPath(pathname: string): string {
  return pathname.startsWith("/admin") ? "/admin/login" : "/login";
}