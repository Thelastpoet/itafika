import { useEffect, useMemo, useState } from "react";
import type * as React from "react";
import { ArrowLeft, ClipboardList, History, PackagePlus, ShieldCheck, Truck } from "lucide-react";
import type { ReferenceExport } from "@itafika/core";

import { getReferenceExport } from "./api.js";
import { isStaffRoute, matchRoute, routeTitle } from "./router.js";
import { coerceReferenceRows } from "./types.js";
import type { PortalContext, ReferenceLookups, RouteProps, SubmissionResult } from "./types.js";
import {
  ContributeHome,
  ContributeMode,
  ContributeProvider,
  ContributeRate,
  ContributeZone,
  ContributionSuccess,
  ModerateChangeLog,
  ModerateQueue,
  ModerateSubmission,
  ProviderBookings,
  ProviderDashboard,
  ProviderRateSubmission,
  ProviderBookingDetail,
  StaffSignIn,
} from "./views.js";

function buildLookups(reference: ReferenceExport | null): ReferenceLookups {
  if (!reference) {
    return { providers: [], zones: [], modes: [] };
  }
  return {
    providers: coerceReferenceRows<ReferenceLookups["providers"][number]>(reference.tables.providers),
    zones: coerceReferenceRows<ReferenceLookups["zones"][number]>(reference.tables.zones),
    modes: coerceReferenceRows<ReferenceLookups["modes"][number]>(reference.tables.modes),
  };
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? "nav-button active" : "nav-button"} type="button" onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [reference, setReference] = useState<ReferenceExport | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [contributorName, setContributorName] = useState("");
  const [moderatorToken, setModeratorToken] = useState("");
  const [providerToken, setProviderToken] = useState("");
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getReferenceExport();
        if (!cancelled) setReference(data);
      } catch (error) {
        if (!cancelled) setReferenceError(error instanceof Error ? error.message : "Failed to load delivery data");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const lookups = useMemo(() => buildLookups(reference), [reference]);
  const context = useMemo<PortalContext>(
    () => ({
      reference,
      lookups,
      contributorName,
      moderatorToken,
      providerToken,
      submissionResult,
      setContributorName,
      setModeratorToken,
      setProviderToken,
      setSubmissionResult,
      navigate: (next: string) => {
        window.history.pushState({}, "", next);
        setPath(next);
        window.scrollTo(0, 0);
      },
    }),
    [contributorName, lookups, moderatorToken, providerToken, reference, submissionResult],
  );

  const match = useMemo(() => matchRoute(path), [path]);
  const routeProps: RouteProps = { context, params: match.params };
  const staff = isStaffRoute(match.name);

  const content = (() => {
    switch (match.name) {
      case "contribute-home":
        return <ContributeHome {...routeProps} />;
      case "contribute-rate":
        return <ContributeRate {...routeProps} />;
      case "contribute-zone":
        return <ContributeZone {...routeProps} />;
      case "contribute-provider":
        return <ContributeProvider {...routeProps} />;
      case "contribute-mode":
        return <ContributeMode {...routeProps} />;
      case "contribute-success":
        return <ContributionSuccess {...routeProps} />;
      case "staff-signin":
        return <StaffSignIn {...routeProps} />;
      case "moderate-queue":
        return <ModerateQueue {...routeProps} />;
      case "moderate-submission":
        return <ModerateSubmission {...routeProps} />;
      case "moderate-change-log":
        return <ModerateChangeLog {...routeProps} />;
      case "provider-dashboard":
        return <ProviderDashboard {...routeProps} />;
      case "provider-rate-submission":
        return <ProviderRateSubmission {...routeProps} />;
      case "provider-bookings":
        return <ProviderBookings {...routeProps} />;
      case "provider-booking-detail":
        return <ProviderBookingDetail {...routeProps} />;
      default:
        return <ContributeHome {...routeProps} />;
    }
  })();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-lockup">
            <strong>Itafika</strong>
            <span>{staff ? "Staff" : "Delivery data"}</span>
          </div>
        </div>

        {staff ? (
          <nav className="nav-stack">
            <NavButton active={path.startsWith("/staff/moderate")} icon={<ShieldCheck size={16} />} label="Review queue" onClick={() => context.navigate("/staff/moderate")} />
            <NavButton active={path.startsWith("/staff/moderate/change-log")} icon={<History size={16} />} label="Change history" onClick={() => context.navigate("/staff/moderate/change-log")} />
            <NavButton active={path.startsWith("/staff/provider")} icon={<Truck size={16} />} label="Provider" onClick={() => context.navigate("/staff/provider")} />
          </nav>
        ) : (
          <nav className="nav-stack">
            <NavButton active={path === "/contribute" || path === "/"} icon={<ClipboardList size={16} />} label="Home" onClick={() => context.navigate("/contribute")} />
            <NavButton active={path.startsWith("/contribute/rate")} icon={<PackagePlus size={16} />} label="Add a price" onClick={() => context.navigate("/contribute/rate")} />
          </nav>
        )}

        <div className="sidebar-footer">
          {referenceError ? <div className="banner banner-danger">{referenceError}</div> : null}
          {staff ? (
            <button className="link-text" type="button" onClick={() => context.navigate("/contribute")}>
              <ArrowLeft size={14} /> Back to public site
            </button>
          ) : (
            <button className="link-text staff-link" type="button" onClick={() => context.navigate("/staff")}>
              Staff sign-in
            </button>
          )}
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <div className="topbar-kicker">{staff ? "Staff tools" : "Community contributions"}</div>
            <h1>{routeTitle(match.name)}</h1>
          </div>
          {!staff ? (
            <div className="topbar-meta">
              <div>
                <span className="metric-label">You are</span>
                <strong>{contributorName || "a guest"}</strong>
              </div>
            </div>
          ) : null}
        </header>

        <div className="workspace-body">{content}</div>
      </main>
    </div>
  );
}
