import { useEffect, useMemo, useState } from "react";
import type * as React from "react";
import { Check, ChevronRight, ClipboardList, MapPin, PackagePlus, ShieldCheck, Truck, Undo2, X } from "lucide-react";
import type {
  ChangeLogEntry,
  ProviderBookingDetail,
  ProviderBookingEventRequest,
  ProviderBookingStatus,
  ProviderBookingSummary,
  ProviderMeResponse,
  ProviderSubmissionRequest,
  ReferenceExport,
  Submission,
  SubmissionCreateRequest,
  SubmissionDetail,
  SubmissionOperation,
  SubmissionStatus,
  SubmissionTarget,
} from "@itafika/core";

import {
  approveSubmission,
  createSubmission,
  getSubmission,
  listChangeLog,
  listSubmissions,
  providerAcceptBooking,
  providerAppendTrackingEvent,
  providerCreateSubmission,
  providerGetBooking,
  providerListBookings,
  providerMe,
  providerRejectBooking,
  rejectSubmission,
} from "./api.js";
import { coerceReferenceRows } from "./types.js";
import type {
  PortalContext,
  ReferenceLookupMode,
  ReferenceLookupProvider,
  ReferenceLookupZone,
  RouteProps,
} from "./types.js";
import {
  validateModeForm,
  validateProviderForm,
  validateRateForm,
  validateZoneForm,
  type ModeFormValues,
  type ProviderFormValues,
  type RateFormValues,
  type ZoneFormValues,
} from "./validation.js";

function classNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

type PillTone = "success" | "warning" | "danger" | "muted";

function statusTone(status: string): PillTone {
  if (status === "approved" || status === "accepted" || status === "delivered" || status === "booking_confirmed") return "success";
  if (status === "rejected" || status === "delivery_cancelled" || status === "expired") return "danger";
  if (status === "pending" || status === "booking_requested") return "warning";
  return "muted";
}

function Pill({ children, tone = "muted" }: { children: string; tone?: PillTone }) {
  return <span className={classNames("pill", `pill-${tone}`)}>{children}</span>;
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>{title}</h2>
        {action ? <div className="panel-action">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

function Button({
  kind = "default",
  icon,
  children,
  type = "button",
  onClick,
  disabled,
}: {
  kind?: "default" | "primary" | "ghost" | "danger";
  icon?: React.ReactNode;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button className={classNames("button", `button-${kind}`)} type={type} onClick={onClick} disabled={disabled}>
      {icon ? <span className="button-icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="input" {...props} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />;
}

function DataTable({ children }: { children: React.ReactNode }) {
  return <div className="table-wrap">{children}</div>;
}

function SourceBlock({ value }: { value: unknown }) {
  return <pre className="code-block">{jsonText(value)}</pre>;
}

function useAsync<T>(load: () => Promise<T>, deps: React.DependencyList): { value: T | null; loading: boolean; error: string | null; refresh: () => Promise<void> } {
  const [value, setValue] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setValue(await load());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { value, loading, error, refresh };
}

function identityError(name: string): string | null {
  return name.trim().length > 0 ? null : "Enter a contributor name.";
}

function buildProviderRows(reference: ReferenceExport | null): ReferenceLookupProvider[] {
  if (!reference) return [];
  return coerceReferenceRows<ReferenceLookupProvider>(reference.tables.providers);
}

function buildZoneRows(reference: ReferenceExport | null): ReferenceLookupZone[] {
  if (!reference) return [];
  return coerceReferenceRows<ReferenceLookupZone>(reference.tables.zones);
}

function buildModeRows(reference: ReferenceExport | null): ReferenceLookupMode[] {
  if (!reference) return [];
  return coerceReferenceRows<ReferenceLookupMode>(reference.tables.modes);
}

function ArrowLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="link-button" onClick={onClick} type="button">
      <span>{label}</span>
      <ChevronRight size={16} />
    </button>
  );
}

function TokenPrompt({
  label,
  token,
  onChange,
  onClear,
  placeholder,
}: {
  label: string;
  token: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
}) {
  return (
    <div className="token-bar">
      <Field label={label}>
        <TextInput value={token} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      </Field>
      <div className="token-actions">
        <Button kind="ghost" icon={<X size={16} />} type="button" onClick={onClear}>
          Clear
        </Button>
        <span className="field-hint">Token stays in React state only.</span>
      </div>
    </div>
  );
}

function QuickLinks({ links }: { links: Array<{ label: string; path: string }> }) {
  return (
    <div className="quick-links">
      {links.map((link) => (
        <ArrowLink
          key={link.path}
          label={link.label}
          onClick={() => {
            window.history.pushState({}, "", link.path);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
        />
      ))}
    </div>
  );
}

function ContributorBar({ context }: { context: PortalContext }) {
  return (
    <div className="identity-bar">
      <Field label="Contributor name" hint="Used on public submissions.">
        <TextInput
          value={context.contributorName}
          placeholder="Asha Mwangi"
          onChange={(event) => context.setContributorName(event.target.value)}
        />
      </Field>
      <div className="identity-copy">No phone or email fields. Submission provenance comes from the name and the source note.</div>
    </div>
  );
}

type RateFormErrors = Partial<Record<keyof RateFormValues, string>> & { submitted_by?: string };
type ZoneFormErrors = Partial<Record<keyof ZoneFormValues, string>> & { submitted_by?: string };
type ProviderFormErrors = Partial<Record<keyof ProviderFormValues, string>> & { submitted_by?: string };
type ModeFormErrors = Partial<Record<keyof ModeFormValues, string>> & { submitted_by?: string };

function toRatePayload(values: RateFormValues): Record<string, unknown> {
  return {
    provider_id: values.provider_id,
    origin_zone_id: values.origin_zone_id,
    destination_zone_id: values.destination_zone_id,
    base_cost_kes: Number(values.base_cost_kes),
    cost_per_kg_kes: Number(values.cost_per_kg_kes),
    est_time: values.est_time.trim(),
    max_weight_kg: values.max_weight_kg.trim().length ? Number(values.max_weight_kg) : null,
    collection_type: values.collection_type,
    source: values.source.trim(),
  };
}

function RateSubmissionSection({
  context,
  lockedProviderId,
  onSubmit,
  submitLabel,
  providerHint,
}: {
  context: PortalContext;
  lockedProviderId?: string;
  onSubmit: (request: { payload: Record<string, unknown>; source: string; submitted_by: string }) => Promise<Submission>;
  submitLabel: string;
  providerHint?: string;
}) {
  const providerRows = buildProviderRows(context.reference);
  const zoneRows = buildZoneRows(context.reference);
  const [values, setValues] = useState<RateFormValues>({
    provider_id: lockedProviderId ?? providerRows[0]?.id ?? "",
    origin_zone_id: zoneRows[0]?.id ?? "",
    destination_zone_id: zoneRows[1]?.id ?? zoneRows[0]?.id ?? "",
    base_cost_kes: "",
    cost_per_kg_kes: "",
    est_time: "",
    max_weight_kg: "",
    collection_type: "office_pickup",
    source: "",
  });
  const [errors, setErrors] = useState<RateFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lockedProviderId) {
      setValues((current) => ({ ...current, provider_id: lockedProviderId }));
    }
  }, [lockedProviderId]);

  useEffect(() => {
    setValues((current) => ({
      ...current,
      provider_id: current.provider_id || lockedProviderId || providerRows[0]?.id || "",
      origin_zone_id: current.origin_zone_id || zoneRows[0]?.id || "",
      destination_zone_id: current.destination_zone_id || zoneRows[1]?.id || zoneRows[0]?.id || "",
    }));
  }, [lockedProviderId, providerRows, zoneRows]);

  const update = (field: keyof RateFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldErrors = validateRateForm(values);
    const submitterError = identityError(context.contributorName);
    setErrors({ ...fieldErrors, ...(submitterError ? { submitted_by: submitterError } : {}) });
    if (Object.keys(fieldErrors).length > 0 || submitterError) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const submission = await onSubmit({
        payload: toRatePayload(lockedProviderId ? { ...values, provider_id: lockedProviderId } : values),
        source: values.source.trim(),
        submitted_by: context.contributorName.trim(),
      });
      setMessage(`Submission ${submission.id} is ${submission.status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="grid-2">
        <Field label="Contributor name" error={errors.submitted_by}>
          <TextInput
            value={context.contributorName}
            onChange={(event) => context.setContributorName(event.target.value)}
            placeholder="Asha Mwangi"
          />
        </Field>
        <Field label="Source" error={errors.source} hint="Where this rate came from.">
          <TextInput value={values.source} onChange={update("source")} placeholder="Desk call, 2026-06-22" />
        </Field>
      </div>

      <div className="grid-3">
        <Field label="Provider" error={errors.provider_id} hint={providerHint}>
          <SelectInput value={values.provider_id} onChange={update("provider_id")} disabled={Boolean(lockedProviderId)}>
            {providerRows.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Origin zone" error={errors.origin_zone_id}>
          <SelectInput value={values.origin_zone_id} onChange={update("origin_zone_id")}>
            {zoneRows.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} - {zone.town}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Destination zone" error={errors.destination_zone_id}>
          <SelectInput value={values.destination_zone_id} onChange={update("destination_zone_id")}>
            {zoneRows.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} - {zone.town}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <div className="grid-3">
        <Field label="Base cost (KES)" error={errors.base_cost_kes}>
          <TextInput inputMode="numeric" value={values.base_cost_kes} onChange={update("base_cost_kes")} />
        </Field>
        <Field label="Per kg cost (KES)" error={errors.cost_per_kg_kes}>
          <TextInput inputMode="numeric" value={values.cost_per_kg_kes} onChange={update("cost_per_kg_kes")} />
        </Field>
        <Field label="Estimate" error={errors.est_time}>
          <TextInput value={values.est_time} onChange={update("est_time")} placeholder="3 hours" />
        </Field>
      </div>

      <div className="grid-3">
        <Field label="Max weight (kg)" error={errors.max_weight_kg}>
          <TextInput inputMode="decimal" value={values.max_weight_kg} onChange={update("max_weight_kg")} />
        </Field>
        <Field label="Collection type" error={errors.collection_type}>
          <SelectInput value={values.collection_type} onChange={update("collection_type")}>
            <option value="office_pickup">Office pickup</option>
            <option value="door_delivery">Door delivery</option>
          </SelectInput>
        </Field>
        <div className="field field-spacer">
          <span className="field-label">Action</span>
          <div className="field-inline">
            <Button kind="primary" type="submit" icon={<PackagePlus size={16} />} disabled={submitting}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>

      {errors.submitted_by ? <div className="banner banner-danger">{errors.submitted_by}</div> : null}
      {message ? <div className="banner">{message}</div> : null}
    </form>
  );
}

function ZoneSubmissionSection({
  context,
  onSubmit,
  submitLabel,
}: {
  context: PortalContext;
  onSubmit: (request: SubmissionCreateRequest) => Promise<Submission>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<ZoneFormValues>({
    id: "",
    name: "",
    type: "stage",
    town: "",
    county: "",
    lat: "",
    lng: "",
  });
  const [errors, setErrors] = useState<ZoneFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldErrors = validateZoneForm(values);
    const submitterError = identityError(context.contributorName);
    setErrors({ ...fieldErrors, ...(submitterError ? { submitted_by: submitterError } : {}) });
    if (Object.keys(fieldErrors).length > 0 || submitterError) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const submission = await onSubmit({
        target: "zones",
        operation: "create",
        payload: {
          id: values.id.trim(),
          name: values.name.trim(),
          type: values.type,
          town: values.town.trim(),
          county: values.county.trim(),
          lat: values.lat.trim().length ? Number(values.lat) : null,
          lng: values.lng.trim().length ? Number(values.lng) : null,
        },
        source: values.name.trim(),
        submitted_by: context.contributorName.trim(),
      });
      setMessage(`Submission ${submission.id} is ${submission.status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Field label="Contributor name" error={errors.submitted_by}>
        <TextInput
          value={context.contributorName}
          onChange={(event) => context.setContributorName(event.target.value)}
          placeholder="Asha Mwangi"
        />
      </Field>

      <div className="grid-2">
        <Field label="Zone id" error={errors.id}>
          <TextInput value={values.id} onChange={(event) => setValues((current) => ({ ...current, id: event.target.value }))} />
        </Field>
        <Field label="Zone name" error={errors.name}>
          <TextInput value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
        </Field>
      </div>

      <div className="grid-3">
        <Field label="Type" error={errors.type}>
          <SelectInput value={values.type} onChange={(event) => setValues((current) => ({ ...current, type: event.target.value }))}>
            <option value="cbd_hub">CBD hub</option>
            <option value="stage">Stage</option>
            <option value="residential_area">Residential area</option>
          </SelectInput>
        </Field>
        <Field label="Town" error={errors.town}>
          <TextInput value={values.town} onChange={(event) => setValues((current) => ({ ...current, town: event.target.value }))} />
        </Field>
        <Field label="County" error={errors.county}>
          <TextInput value={values.county} onChange={(event) => setValues((current) => ({ ...current, county: event.target.value }))} />
        </Field>
      </div>

      <div className="grid-3">
        <Field label="Latitude" error={errors.lat}>
          <TextInput value={values.lat} onChange={(event) => setValues((current) => ({ ...current, lat: event.target.value }))} />
        </Field>
        <Field label="Longitude" error={errors.lng}>
          <TextInput value={values.lng} onChange={(event) => setValues((current) => ({ ...current, lng: event.target.value }))} />
        </Field>
        <div className="field field-spacer">
          <span className="field-label">Action</span>
          <div className="field-inline">
            <Button kind="primary" type="submit" icon={<PackagePlus size={16} />} disabled={submitting}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>

      {message ? <div className="banner">{message}</div> : null}
    </form>
  );
}

function ProviderSubmissionSection({
  context,
  onSubmit,
  submitLabel,
}: {
  context: PortalContext;
  onSubmit: (request: SubmissionCreateRequest) => Promise<Submission>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<ProviderFormValues>({
    id: "",
    name: "",
    type: "",
    reliability_score: "",
    source: "",
  });
  const [errors, setErrors] = useState<ProviderFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setValues((current) => ({
      ...current,
      type: current.type || context.lookups.modes[0]?.id || "",
    }));
  }, [context.lookups.modes]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldErrors = validateProviderForm(values);
    const submitterError = identityError(context.contributorName);
    setErrors({ ...fieldErrors, ...(submitterError ? { submitted_by: submitterError } : {}) });
    if (Object.keys(fieldErrors).length > 0 || submitterError) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const submission = await onSubmit({
        target: "providers",
        operation: "create",
        payload: {
          id: values.id.trim(),
          name: values.name.trim(),
          type: values.type,
          reliability_score: values.reliability_score.trim().length ? Number(values.reliability_score) : null,
        },
        source: values.source.trim(),
        submitted_by: context.contributorName.trim(),
      });
      setMessage(`Submission ${submission.id} is ${submission.status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Field label="Contributor name" error={errors.submitted_by}>
        <TextInput
          value={context.contributorName}
          onChange={(event) => context.setContributorName(event.target.value)}
          placeholder="Asha Mwangi"
        />
      </Field>

      <div className="grid-2">
        <Field label="Provider id" error={errors.id}>
          <TextInput value={values.id} onChange={(event) => setValues((current) => ({ ...current, id: event.target.value }))} />
        </Field>
        <Field label="Provider name" error={errors.name}>
          <TextInput value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
        </Field>
      </div>

      <div className="grid-2">
        <Field label="Transport mode" error={errors.type}>
          <SelectInput value={values.type} onChange={(event) => setValues((current) => ({ ...current, type: event.target.value }))}>
            {context.lookups.modes.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Reliability score" error={errors.reliability_score}>
          <TextInput value={values.reliability_score} onChange={(event) => setValues((current) => ({ ...current, reliability_score: event.target.value }))} />
        </Field>
      </div>

      <Field label="Source" error={errors.source}>
        <TextInput value={values.source} onChange={(event) => setValues((current) => ({ ...current, source: event.target.value }))} />
      </Field>

      <div className="field-inline">
        <Button kind="primary" type="submit" icon={<PackagePlus size={16} />} disabled={submitting}>
          {submitLabel}
        </Button>
      </div>

      <div className="banner banner-muted">Provider submissions are moderated before they go live.</div>
      {message ? <div className="banner">{message}</div> : null}
    </form>
  );
}

function ModeSubmissionSection({
  context,
  onSubmit,
  submitLabel,
}: {
  context: PortalContext;
  onSubmit: (request: SubmissionCreateRequest) => Promise<Submission>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<ModeFormValues>({
    id: "",
    label: "",
    description: "",
    source: "",
  });
  const [errors, setErrors] = useState<ModeFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldErrors = validateModeForm(values);
    const submitterError = identityError(context.contributorName);
    setErrors({ ...fieldErrors, ...(submitterError ? { submitted_by: submitterError } : {}) });
    if (Object.keys(fieldErrors).length > 0 || submitterError) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const submission = await onSubmit({
        target: "modes",
        operation: "create",
        payload: {
          id: values.id.trim(),
          label: values.label.trim(),
          description: values.description.trim() || null,
          source: values.source.trim(),
        },
        source: values.source.trim(),
        submitted_by: context.contributorName.trim(),
      });
      setMessage(`Submission ${submission.id} is ${submission.status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Field label="Contributor name" error={errors.submitted_by}>
        <TextInput
          value={context.contributorName}
          onChange={(event) => context.setContributorName(event.target.value)}
          placeholder="Asha Mwangi"
        />
      </Field>

      <div className="grid-2">
        <Field label="Mode id" error={errors.id}>
          <TextInput value={values.id} onChange={(event) => setValues((current) => ({ ...current, id: event.target.value }))} />
        </Field>
        <Field label="Label" error={errors.label}>
          <TextInput value={values.label} onChange={(event) => setValues((current) => ({ ...current, label: event.target.value }))} />
        </Field>
      </div>

      <Field label="Description" error={errors.description}>
        <TextArea value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} rows={4} />
      </Field>

      <div className="grid-2">
        <Field label="Source" error={errors.source}>
          <TextInput value={values.source} onChange={(event) => setValues((current) => ({ ...current, source: event.target.value }))} />
        </Field>
        <div className="field field-spacer">
          <span className="field-label">Action</span>
          <div className="field-inline">
            <Button kind="primary" type="submit" icon={<PackagePlus size={16} />} disabled={submitting}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>

      {message ? <div className="banner">{message}</div> : null}
    </form>
  );
}

export function ContributeHome({ context }: RouteProps) {
  const providerCount = context.reference ? context.reference.tables.providers.length : 0;
  const zoneCount = context.reference ? context.reference.tables.zones.length : 0;
  const modeCount = context.reference ? context.reference.tables.modes.length : 0;

  return (
    <div className="stack">
      <Panel title="Contribution workspace" action={<Pill tone="muted">Public</Pill>}>
        <div className="stack">
          <p className="lede">Submit reference data for moderation without opening GitHub.</p>
          <ContributorBar context={context} />
          <QuickLinks
            links={[
              { label: "New rate", path: "/contribute/rate" },
              { label: "New zone", path: "/contribute/zone" },
              { label: "New provider", path: "/contribute/provider" },
              { label: "New mode", path: "/contribute/mode" },
            ]}
          />
        </div>
      </Panel>

      <div className="metrics">
        <div>
          <span className="metric-label">Providers</span>
          <strong>{providerCount}</strong>
        </div>
        <div>
          <span className="metric-label">Zones</span>
          <strong>{zoneCount}</strong>
        </div>
        <div>
          <span className="metric-label">Modes</span>
          <strong>{modeCount}</strong>
        </div>
      </div>
    </div>
  );
}

export function ContributeRate({ context }: RouteProps) {
  return (
    <div className="stack">
      <Panel title="Submit rate" action={<Pill tone="muted">Rates</Pill>}>
        <RateSubmissionSection
          context={context}
          submitLabel="Create submission"
          onSubmit={({ payload, source, submitted_by }) =>
            createSubmission({
              target: "rates",
              operation: "create",
              payload,
              source,
              submitted_by,
            })
          }
          providerHint="The public route lets you choose any provider from the exported registry."
        />
      </Panel>
    </div>
  );
}

export function ContributeZone({ context }: RouteProps) {
  return (
    <Panel title="Submit zone" action={<Pill tone="muted">Zones</Pill>}>
      <ZoneSubmissionSection context={context} submitLabel="Create submission" onSubmit={createSubmission} />
    </Panel>
  );
}

export function ContributeProvider({ context }: RouteProps) {
  return (
    <Panel title="Submit provider" action={<Pill tone="muted">Providers</Pill>}>
      <ProviderSubmissionSection
        context={context}
        submitLabel="Create submission"
        onSubmit={createSubmission}
      />
    </Panel>
  );
}

export function ContributeMode({ context }: RouteProps) {
  return (
    <Panel title="Submit mode" action={<Pill tone="muted">Modes</Pill>}>
      <ModeSubmissionSection context={context} submitLabel="Create submission" onSubmit={createSubmission} />
    </Panel>
  );
}

export function ContributionSuccess({ params }: RouteProps) {
  return (
    <Panel title="Submission created" action={<Pill tone="warning">Pending</Pill>}>
      <div className="stack">
        <p className="lede">The moderation queue now has a pending submission.</p>
        <div className="metric-row">
          <div>
            <span className="metric-label">Submission id</span>
            <strong>{params.id}</strong>
          </div>
          <div>
            <span className="metric-label">Status</span>
            <strong>pending</strong>
          </div>
        </div>
      </div>
    </Panel>
  );
}

const SUBMISSION_STATUS_OPTIONS: Array<SubmissionStatus | ""> = ["", "pending", "approved", "rejected"];
const SUBMISSION_TARGET_OPTIONS: Array<SubmissionTarget | ""> = ["", "rates", "zones", "providers", "modes"];
const BOOKING_STATUS_OPTIONS: Array<ProviderBookingStatus | ""> = ["", "pending", "accepted", "rejected", "expired"];
const TRACKING_EVENT_STATUS_OPTIONS: ProviderBookingEventRequest["status"][] = [
  "package_picked",
  "in_transit",
  "at_sorting_hub",
  "ready_for_pickup",
  "delivered",
];

function ModeratorTokenGate({
  context,
  children,
}: {
  context: PortalContext;
  children: (token: string) => React.ReactNode;
}) {
  return (
    <div className="stack">
      <TokenPrompt
        label="Moderator token"
        token={context.moderatorToken}
        onChange={context.setModeratorToken}
        onClear={() => context.setModeratorToken("")}
        placeholder="test-moderator-token"
      />
      {context.moderatorToken ? children(context.moderatorToken) : <div className="banner">Enter a moderator token to inspect the queue.</div>}
    </div>
  );
}

function ProviderTokenGate({
  context,
  children,
}: {
  context: PortalContext;
  children: (token: string) => React.ReactNode;
}) {
  return (
    <div className="stack">
      <TokenPrompt
        label="Provider token"
        token={context.providerToken}
        onChange={context.setProviderToken}
        onClear={() => context.setProviderToken("")}
        placeholder="provider-mololine-token"
      />
      {context.providerToken ? children(context.providerToken) : <div className="banner">Enter a provider token to view bookings.</div>}
    </div>
  );
}

export function ModerateQueue({ context }: RouteProps) {
  const [status, setStatus] = useState<SubmissionStatus | "">("");
  const [target, setTarget] = useState<SubmissionTarget | "">("");
  const { value, loading, error, refresh } = useAsync(
    context.moderatorToken
      ? () => listSubmissions(context.moderatorToken, { status: status || undefined, target: target || undefined })
      : async () => ({ submissions: [] }),
    [context.moderatorToken, status, target],
  );

  return (
    <ModeratorTokenGate context={context}>
      {(token) => (
        <Panel
          title="Submission queue"
          action={
            <Button kind="ghost" icon={<Undo2 size={16} />} onClick={() => void refresh()}>
              Refresh
            </Button>
          }
        >
          <div className="filters">
            <Field label="Status">
              <SelectInput value={status} onChange={(event) => setStatus(event.target.value as SubmissionStatus | "")}>
                {SUBMISSION_STATUS_OPTIONS.map((option) => (
                  <option key={option || "all"} value={option}>
                    {option || "All"}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Target">
              <SelectInput value={target} onChange={(event) => setTarget(event.target.value as SubmissionTarget | "")}>
                {SUBMISSION_TARGET_OPTIONS.map((option) => (
                  <option key={option || "all"} value={option}>
                    {option || "All"}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          {loading ? <div className="banner">Loading queue...</div> : null}
          {error ? <div className="banner banner-danger">{error}</div> : null}

          {value ? (
            <DataTable>
              <table>
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>Target</th>
                    <th>Operation</th>
                    <th>Status</th>
                    <th>Submitter</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {value.submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td>
                        <button className="link-text" type="button" onClick={() => context.navigate(`/moderate/submissions/${submission.id}`)}>
                          {submission.id}
                        </button>
                      </td>
                      <td>{submission.target}</td>
                      <td>{submission.operation}</td>
                      <td>
                        <Pill tone={statusTone(submission.status)}>{submission.status}</Pill>
                      </td>
                      <td>{submission.submitted_by}</td>
                      <td>{fmtDate(submission.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          ) : null}
          <div className="footer-row">
            <span className="muted">Token is held in React state only for this session.</span>
            <span className="muted">{token ? "Authenticated" : ""}</span>
          </div>
        </Panel>
      )}
    </ModeratorTokenGate>
  );
}

export function ModerateSubmission({ context, params }: RouteProps) {
  const submissionId = params.id ?? "";
  const [note, setNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const { value, loading, error, refresh } = useAsync(
    context.moderatorToken && submissionId ? () => getSubmission(context.moderatorToken, submissionId) : async () => null,
    [context.moderatorToken, submissionId],
  );

  const onApprove = async () => {
    await approveSubmission(context.moderatorToken, submissionId, note.trim() || undefined);
    await refresh();
  };

  const onReject = async () => {
    await rejectSubmission(context.moderatorToken, submissionId, rejectNote.trim());
    await refresh();
  };

  return (
    <ModeratorTokenGate context={context}>
      {(token) => (
        <Panel
          title="Submission detail"
          action={
            <Button kind="ghost" icon={<Undo2 size={16} />} onClick={() => void refresh()}>
              Refresh
            </Button>
          }
        >
          {loading ? <div className="banner">Loading submission...</div> : null}
          {error ? <div className="banner banner-danger">{error}</div> : null}
          {value ? (
            <div className="stack">
              <div className="detail-grid">
                <div>
                  <span className="metric-label">Submission</span>
                  <strong>{value.submission.id}</strong>
                </div>
                <div>
                  <span className="metric-label">Target</span>
                  <strong>{value.submission.target}</strong>
                </div>
                <div>
                  <span className="metric-label">Status</span>
                  <strong>{value.submission.status}</strong>
                </div>
                <div>
                  <span className="metric-label">Submitter</span>
                  <strong>{value.submission.submitted_by}</strong>
                </div>
              </div>

              <div className="grid-2">
                <div className="subsection">
                  <h3>Proposed payload</h3>
                  <SourceBlock value={value.submission.payload} />
                </div>
                <div className="subsection">
                  <h3>Current row</h3>
                  <SourceBlock value={value.current_row} />
                </div>
              </div>

              <div className="grid-2">
                <Field label="Approve note" hint="Optional.">
                  <TextArea value={note} rows={3} onChange={(event) => setNote(event.target.value)} />
                </Field>
                <Field label="Reject note">
                  <TextArea value={rejectNote} rows={3} onChange={(event) => setRejectNote(event.target.value)} />
                </Field>
              </div>

              <div className="action-row">
                <Button kind="primary" icon={<ShieldCheck size={16} />} onClick={() => void onApprove()}>
                  Approve
                </Button>
                <Button kind="danger" icon={<X size={16} />} onClick={() => void onReject()}>
                  Reject
                </Button>
              </div>
            </div>
          ) : null}
        </Panel>
      )}
    </ModeratorTokenGate>
  );
}

export function ModerateChangeLog({ context }: RouteProps) {
  const [target, setTarget] = useState<SubmissionTarget | "">("");
  const [rowKey, setRowKey] = useState("");
  const [limit, setLimit] = useState("50");
  const { value, loading, error, refresh } = useAsync(
    context.moderatorToken
      ? () => listChangeLog(context.moderatorToken, { target: target || undefined, row_key: rowKey || undefined, limit: Number(limit) || 50 })
      : async () => ({ changes: [] }),
    [context.moderatorToken, target, rowKey, limit],
  );

  return (
    <ModeratorTokenGate context={context}>
      {(token) => (
        <Panel
          title="Change log"
          action={
            <Button kind="ghost" icon={<Undo2 size={16} />} onClick={() => void refresh()}>
              Refresh
            </Button>
          }
        >
          <div className="filters">
            <Field label="Target">
              <SelectInput value={target} onChange={(event) => setTarget(event.target.value as SubmissionTarget | "")}>
                {SUBMISSION_TARGET_OPTIONS.map((option) => (
                  <option key={option || "all"} value={option}>
                    {option || "All"}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Row key">
              <TextInput value={rowKey} onChange={(event) => setRowKey(event.target.value)} placeholder="provider|origin|destination" />
            </Field>
            <Field label="Limit">
              <TextInput value={limit} onChange={(event) => setLimit(event.target.value)} inputMode="numeric" />
            </Field>
          </div>

          {loading ? <div className="banner">Loading change log...</div> : null}
          {error ? <div className="banner banner-danger">{error}</div> : null}
          {value ? (
            <DataTable>
              <table>
                <thead>
                  <tr>
                    <th>Changed</th>
                    <th>Target</th>
                    <th>Operation</th>
                    <th>Row key</th>
                    <th>Source</th>
                    <th>Reviewer</th>
                  </tr>
                </thead>
                <tbody>
                  {value.changes.map((entry: ChangeLogEntry) => (
                    <tr key={entry.id}>
                      <td>{fmtDate(entry.changed_at)}</td>
                      <td>{entry.target}</td>
                      <td>{entry.operation}</td>
                      <td>{entry.row_key}</td>
                      <td>{entry.source}</td>
                      <td>{entry.changed_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          ) : null}
        </Panel>
      )}
    </ModeratorTokenGate>
  );
}

export function ProviderDashboard({ context }: RouteProps) {
  const { value, loading, error } = useAsync(
    context.providerToken ? () => providerMe(context.providerToken) : async () => null,
    [context.providerToken],
  );

  return (
    <ProviderTokenGate context={context}>
      {(token) => (
        <div className="stack">
          <Panel title="Provider workspace" action={<Pill tone="muted">Provider</Pill>}>
            <p className="lede">Invite-token access for rate submissions, bookings, and delivery updates.</p>
            {loading ? <div className="banner">Loading account...</div> : null}
            {error ? <div className="banner banner-danger">{error}</div> : null}
            {value ? (
              <div className="detail-grid">
                <div>
                  <span className="metric-label">Account</span>
                  <strong>{value.account.display_name}</strong>
                </div>
                <div>
                  <span className="metric-label">Provider id</span>
                  <strong>{value.account.provider_id}</strong>
                </div>
                <div>
                  <span className="metric-label">Status</span>
                  <strong>{value.account.status}</strong>
                </div>
              </div>
            ) : null}
          </Panel>

          <QuickLinks
            links={[
              { label: "Submit rate", path: "/provider/submissions/rate" },
              { label: "Bookings", path: "/provider/bookings" },
            ]}
          />
        </div>
      )}
    </ProviderTokenGate>
  );
}

export function ProviderRateSubmission({ context }: RouteProps) {
  const { value } = useAsync(
    context.providerToken ? () => providerMe(context.providerToken) : async () => null,
    [context.providerToken],
  );

  return (
    <ProviderTokenGate context={context}>
      {(token) => (
        <Panel title="Submit own rate" action={<Pill tone="muted">Provider</Pill>}>
          <RateSubmissionSection
            context={context}
            lockedProviderId={value?.account.provider_id}
            submitLabel="Create provider submission"
            providerHint={value ? `Locked to ${value.account.display_name}.` : undefined}
            onSubmit={({ payload, source }) =>
              providerCreateSubmission(token, {
                target: "rates",
                operation: "create",
                payload,
                source,
              })
            }
          />
        </Panel>
      )}
    </ProviderTokenGate>
  );
}

export function ProviderBookings({ context }: RouteProps) {
  const [status, setStatus] = useState<ProviderBookingStatus | "">("");
  const { value, loading, error, refresh } = useAsync(
    context.providerToken ? () => providerListBookings(context.providerToken, { status: status || undefined }) : async () => ({ bookings: [] }),
    [context.providerToken, status],
  );

  return (
    <ProviderTokenGate context={context}>
      {(token) => (
        <Panel
          title="Bookings"
          action={
            <Button kind="ghost" icon={<Undo2 size={16} />} onClick={() => void refresh()}>
              Refresh
            </Button>
          }
        >
          <Field label="Status">
            <SelectInput value={status} onChange={(event) => setStatus(event.target.value as ProviderBookingStatus | "")}>
              {BOOKING_STATUS_OPTIONS.map((option) => (
                <option key={option || "all"} value={option}>
                  {option || "All"}
                </option>
              ))}
            </SelectInput>
          </Field>

          {loading ? <div className="banner">Loading bookings...</div> : null}
          {error ? <div className="banner banner-danger">{error}</div> : null}
          {value ? (
            <DataTable>
              <table>
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Tracking</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {value.bookings.map((booking: ProviderBookingSummary) => (
                    <tr key={booking.id}>
                      <td>
                        <button className="link-text" type="button" onClick={() => context.navigate(`/provider/bookings/${booking.id}`)}>
                          {booking.id}
                        </button>
                      </td>
                      <td>{booking.tracking_id}</td>
                      <td>
                        <Pill tone={statusTone(booking.status)}>{booking.status}</Pill>
                      </td>
                      <td>{fmtDate(booking.created_at)}</td>
                      <td>{fmtDate(booking.expires_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          ) : null}
        </Panel>
      )}
    </ProviderTokenGate>
  );
}

export function ProviderBookingDetail({ context, params }: RouteProps) {
  const bookingId = params.id ?? "";
  const { value, loading, error, refresh } = useAsync(
    context.providerToken && bookingId ? () => providerGetBooking(context.providerToken, bookingId) : async () => null,
    [context.providerToken, bookingId],
  );
  const [rejectNote, setRejectNote] = useState("");
  const [eventStatus, setEventStatus] = useState<ProviderBookingEventRequest["status"]>("package_picked");
  const [eventNote, setEventNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const respond = async (action: "accept" | "reject" | "event") => {
    if (!context.providerToken) return;
    setMessage(null);
    try {
      if (action === "accept") {
        await providerAcceptBooking(context.providerToken, bookingId);
      } else if (action === "reject") {
        await providerRejectBooking(context.providerToken, bookingId, rejectNote.trim());
      } else {
        await providerAppendTrackingEvent(context.providerToken, bookingId, {
          status: eventStatus,
          note: eventNote.trim() || undefined,
        });
      }
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed");
    }
  };

  return (
    <ProviderTokenGate context={context}>
      {(token) => (
        <Panel
          title="Booking detail"
          action={
            <Button kind="ghost" icon={<Undo2 size={16} />} onClick={() => void refresh()}>
              Refresh
            </Button>
          }
        >
          {loading ? <div className="banner">Loading booking...</div> : null}
          {error ? <div className="banner banner-danger">{error}</div> : null}
          {message ? <div className="banner">{message}</div> : null}
          {value ? (
            <div className="stack">
              <div className="detail-grid">
                <div>
                  <span className="metric-label">Booking</span>
                  <strong>{value.booking.id}</strong>
                </div>
                <div>
                  <span className="metric-label">Booking status</span>
                  <strong>{value.booking.status}</strong>
                </div>
                <div>
                  <span className="metric-label">Delivery status</span>
                  <strong>{value.delivery.status}</strong>
                </div>
                <div>
                  <span className="metric-label">Quote route</span>
                  <strong>
                    {value.quote.origin_zone_id} → {value.quote.destination_zone_id}
                  </strong>
                </div>
              </div>

              <div className="grid-2">
                <div className="subsection">
                  <h3>Delivery</h3>
                  <div className="stack">
                    <div className="detail-grid compact">
                      <div>
                        <span className="metric-label">Shop ref</span>
                        <strong>{value.delivery.shop_order_ref ?? "—"}</strong>
                      </div>
                      <div>
                        <span className="metric-label">Handoff URL</span>
                        <strong>{value.delivery.shop_handoff_url ?? "—"}</strong>
                      </div>
                    </div>
                    <SourceBlock value={value.delivery} />
                  </div>
                </div>
                <div className="subsection">
                  <h3>Quote</h3>
                  <SourceBlock value={value.quote} />
                </div>
              </div>

              <div className="action-row">
                <Button kind="primary" icon={<Check size={16} />} onClick={() => void respond("accept")}>
                  Accept
                </Button>
                <Button kind="danger" icon={<X size={16} />} onClick={() => void respond("reject")}>
                  Reject
                </Button>
              </div>

              <div className="grid-2">
                <Field label="Reject note">
                  <TextArea value={rejectNote} rows={3} onChange={(event) => setRejectNote(event.target.value)} />
                </Field>
                <div className="stack">
                  <Field label="Tracking status">
                    <SelectInput value={eventStatus} onChange={(event) => setEventStatus(event.target.value as ProviderBookingEventRequest["status"])}>
                      {TRACKING_EVENT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Tracking note">
                    <TextArea value={eventNote} rows={3} onChange={(event) => setEventNote(event.target.value)} />
                  </Field>
                  <Button kind="primary" icon={<ClipboardList size={16} />} onClick={() => void respond("event")}>
                    Append tracking event
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </Panel>
      )}
    </ProviderTokenGate>
  );
}
