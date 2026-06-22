import { useEffect, useMemo, useState } from "react";
import type * as React from "react";
import { PackagePlus, ShieldCheck, Truck } from "lucide-react";
import type { ReferenceExport } from "@itafika/core";

import { getReferenceExport } from "./api.js";
import { matchRoute } from "./router.js";
import { coerceReferenceRows } from "./types.js";
import type { PortalContext, ReferenceLookups, ReferenceLookupFreshness, RouteProps } from "./types.js";
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
        if (!cancelled) setReferenceError(error instanceof Error ? error.message : "Failed to load reference export");
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
      setContributorName,
      setModeratorToken,
      setProviderToken,
      navigate: (next: string) => {
        window.history.pushState({}, "", next);
        setPath(next);
      },
    }),
    [contributorName, lookups, moderatorToken, providerToken, reference],
  );

  const match = useMemo(() => matchRoute(path), [path]);

  const routeProps: RouteProps = { context, params: match.params };
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

  const freshness = coerceReferenceRows<ReferenceLookupFreshness>(reference?.tables.freshness);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-lockup">
            <strong>Itafika</strong>
            <span>Portal</span>
          </div>
        </div>

        <nav className="nav-stack">
          <NavButton active={path.startsWith("/contribute")} icon={<PackagePlus size={16} />} label="Contribute" onClick={() => context.navigate("/contribute")} />
          <NavButton active={path.startsWith("/moderate")} icon={<ShieldCheck size={16} />} label="Moderate" onClick={() => context.navigate("/moderate")} />
          <NavButton active={path.startsWith("/provider")} icon={<Truck size={16} />} label="Provider" onClick={() => context.navigate("/provider")} />
        </nav>

        <div className="sidebar-summary">
          <div>
            <span className="metric-label">Reference export</span>
            <strong>{reference ? `v${reference.export_version}` : "Loading"}</strong>
          </div>
          <div className="mini-grid">
            <span>Zones</span>
            <strong>{reference?.tables.zones.length ?? 0}</strong>
            <span>Providers</span>
            <strong>{reference?.tables.providers.length ?? 0}</strong>
            <span>Modes</span>
            <strong>{reference?.tables.modes.length ?? 0}</strong>
          </div>
        </div>

        <div className="sidebar-footer">
          {referenceError ? <div className="banner banner-danger">{referenceError}</div> : null}
          <div className="freshness-list">
            {freshness.slice(0, 5).map((entry) => (
              <div key={entry.town} className="freshness-item">
                <span>{entry.town}</span>
                <strong>{entry.last_updated}</strong>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <div className="topbar-kicker">Same-origin portal</div>
            <h1>{match.name.replace(/-/g, " ")}</h1>
          </div>
          <div className="topbar-meta">
            <div>
              <span className="metric-label">Contributor</span>
              <strong>{contributorName || "Not set"}</strong>
            </div>
            <div>
              <span className="metric-label">Moderator</span>
              <strong>{moderatorToken ? "Set" : "Unset"}</strong>
            </div>
            <div>
              <span className="metric-label">Provider</span>
              <strong>{providerToken ? "Set" : "Unset"}</strong>
            </div>
          </div>
        </header>

        <div className="workspace-body">{content}</div>
      </main>
    </div>
  );
}
