export type RouteName =
  | "contribute-home"
  | "contribute-rate"
  | "contribute-zone"
  | "contribute-provider"
  | "contribute-mode"
  | "contribute-success"
  | "moderate-queue"
  | "moderate-submission"
  | "moderate-change-log"
  | "provider-dashboard"
  | "provider-rate-submission"
  | "provider-bookings"
  | "provider-booking-detail";

export interface RouteMatch {
  name: RouteName;
  params: Record<string, string>;
}

function normalizePath(pathname: string): string {
  if (pathname === "/") return "/contribute";
  return pathname.replace(/\/+$/, "") || "/";
}

export function matchRoute(pathname: string): RouteMatch {
  const path = normalizePath(pathname);

  const patterns: Array<{ name: RouteName; pattern: RegExp }> = [
    { name: "contribute-success", pattern: /^\/contribute\/success\/([^/]+)$/ },
    { name: "contribute-rate", pattern: /^\/contribute\/rate$/ },
    { name: "contribute-zone", pattern: /^\/contribute\/zone$/ },
    { name: "contribute-provider", pattern: /^\/contribute\/provider$/ },
    { name: "contribute-mode", pattern: /^\/contribute\/mode$/ },
    { name: "contribute-home", pattern: /^\/contribute$/ },
    { name: "moderate-submission", pattern: /^\/moderate\/submissions\/([^/]+)$/ },
    { name: "moderate-change-log", pattern: /^\/moderate\/change-log$/ },
    { name: "moderate-queue", pattern: /^\/moderate$/ },
    { name: "provider-booking-detail", pattern: /^\/provider\/bookings\/([^/]+)$/ },
    { name: "provider-rate-submission", pattern: /^\/provider\/submissions\/rate$/ },
    { name: "provider-bookings", pattern: /^\/provider\/bookings$/ },
    { name: "provider-dashboard", pattern: /^\/provider$/ },
  ];

  for (const { name, pattern } of patterns) {
    const match = path.match(pattern);
    if (match) {
      const params: Record<string, string> = {};
      if (name === "contribute-success" || name === "moderate-submission" || name === "provider-booking-detail") {
        params.id = decodeURIComponent(match[1]!);
      }
      return { name, params };
    }
  }

  return { name: "contribute-home", params: {} };
}

export function isActivePath(current: string, target: string): boolean {
  return normalizePath(current) === normalizePath(target);
}
