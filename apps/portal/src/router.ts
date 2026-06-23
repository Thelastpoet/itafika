export type RouteName =
  | "contribute-home"
  | "contribute-rate"
  | "contribute-zone"
  | "contribute-provider"
  | "contribute-mode"
  | "contribute-success"
  | "staff-signin"
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

const ROUTE_TITLES: Record<RouteName, string> = {
  "contribute-home": "Help improve delivery data",
  "contribute-rate": "Add a rate",
  "contribute-zone": "Add a place",
  "contribute-provider": "Add a provider",
  "contribute-mode": "Add a transport type",
  "contribute-success": "Thank you",
  "staff-signin": "Staff sign-in",
  "moderate-queue": "Review queue",
  "moderate-submission": "Review submission",
  "moderate-change-log": "Change history",
  "provider-dashboard": "Provider workspace",
  "provider-rate-submission": "Submit your rate",
  "provider-bookings": "Bookings",
  "provider-booking-detail": "Booking",
};

const STAFF_ROUTES = new Set<RouteName>([
  "staff-signin",
  "moderate-queue",
  "moderate-submission",
  "moderate-change-log",
  "provider-dashboard",
  "provider-rate-submission",
  "provider-bookings",
  "provider-booking-detail",
]);

export function routeTitle(name: RouteName): string {
  return ROUTE_TITLES[name];
}

export function isStaffRoute(name: RouteName): boolean {
  return STAFF_ROUTES.has(name);
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
    { name: "moderate-submission", pattern: /^\/staff\/moderate\/submissions\/([^/]+)$/ },
    { name: "moderate-change-log", pattern: /^\/staff\/moderate\/change-log$/ },
    { name: "moderate-queue", pattern: /^\/staff\/moderate$/ },
    { name: "provider-booking-detail", pattern: /^\/staff\/provider\/bookings\/([^/]+)$/ },
    { name: "provider-rate-submission", pattern: /^\/staff\/provider\/submissions\/rate$/ },
    { name: "provider-bookings", pattern: /^\/staff\/provider\/bookings$/ },
    { name: "provider-dashboard", pattern: /^\/staff\/provider$/ },
    { name: "staff-signin", pattern: /^\/staff$/ },
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
