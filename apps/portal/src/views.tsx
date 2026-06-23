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
import { KENYA_COUNTIES, ZONE_TYPE_OPTIONS } from "./constants.js";
import { coerceReferenceRows } from "./types.js";
import type {
  PortalContext,
  ReferenceLookupMode,
  ReferenceLookupProvider,
  ReferenceLookupZone,
  RouteProps,
  SubmittedItem,
} from "./types.js";
import {
  buildZoneId,
  slugId,
  validateNewProvider,
  validateNewZone,
  validateRateForm,
  type ModeFormValues,
  type NewProviderValues,
  type NewZoneValues,
  type ProviderFormValues,
  type RateFormValues,
  type ZoneFormValues,
} from "./validation.js";

function classNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Sentinel select value meaning "the user wants to add a new one inline". */
const NEW = "__new__";

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

/** Plain-language status text for the public contributor side. */
function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Waiting for review";
    case "approved":
      return "Live";
    case "rejected":
      return "Not accepted";
    default:
      return status;
  }
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

function QuickLinks({ links, navigate }: { links: Array<{ label: string; path: string }>; navigate: (path: string) => void }) {
  return (
    <div className="quick-links">
      {links.map((link) => (
        <ArrowLink key={link.path} label={link.label} onClick={() => navigate(link.path)} />
      ))}
    </div>
  );
}

function ContributorBar({ context }: { context: PortalContext }) {
  return (
    <div className="identity-bar">
      <Field label="Your name" hint="Shown on what you submit.">
        <TextInput
          value={context.contributorName}
          placeholder="Asha"
          onChange={(event) => context.setContributorName(event.target.value)}
        />
      </Field>
      <div className="identity-copy">No phone or email needed.</div>
    </div>
  );
}

function CountySelect({ value, onChange, error }: { value: string; onChange: (next: string) => void; error?: string }) {
  return (
    <Field label="County" error={error}>
      <SelectInput value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose…</option>
        {KENYA_COUNTIES.map((county) => (
          <option key={county} value={county}>
            {county}
          </option>
        ))}
      </SelectInput>
    </Field>
  );
}

/** Select an existing transport mode or add a new one inline. */
function ModeChooser({
  modes,
  choice,
  onChoice,
  newLabel,
  onNewLabel,
  choiceError,
  labelError,
}: {
  modes: ReferenceLookupMode[];
  choice: string;
  onChoice: (next: string) => void;
  newLabel: string;
  onNewLabel: (next: string) => void;
  choiceError?: string;
  labelError?: string;
}) {
  return (
    <div className="stack">
      <Field label="How do they move parcels?" error={choiceError}>
        <SelectInput value={choice} onChange={(event) => onChoice(event.target.value)}>
          <option value="">Choose…</option>
          {modes.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.label}
            </option>
          ))}
          <option value={NEW}>+ Add a new transport type…</option>
        </SelectInput>
      </Field>
      {choice === NEW ? (
        <Field label="New transport type" error={labelError} hint="e.g. Boda boda, Bus parcel service.">
          <TextInput value={newLabel} onChange={(event) => onNewLabel(event.target.value)} placeholder="e.g. Boda boda" />
        </Field>
      ) : null}
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
        <Field label="Your name" error={errors.submitted_by}>
          <TextInput
            value={context.contributorName}
            onChange={(event) => context.setContributorName(event.target.value)}
            placeholder="Asha"
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
  const existingZoneIds = buildZoneRows(context.reference).map((z) => z.id);
  const [values, setValues] = useState<NewZoneValues>(emptyZone());
  const [errors, setErrors] = useState<ZoneFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldErrors = validateNewZone(values);
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
          id: buildZoneId(values.town, values.type, existingZoneIds),
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
      setMessage(`Sent for review. It is ${statusLabel(submission.status).toLowerCase()}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field: keyof NewZoneValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Field label="Your name" error={errors.submitted_by}>
        <TextInput
          value={context.contributorName}
          onChange={(event) => context.setContributorName(event.target.value)}
          placeholder="Asha"
        />
      </Field>

      <div className="grid-2">
        <Field label="Place name" error={errors.name} hint="A stage, hub, or area people recognise.">
          <TextInput value={values.name} onChange={set("name")} placeholder="e.g. Nyeri Town Stage" />
        </Field>
        <Field label="Type" error={errors.type}>
          <SelectInput value={values.type} onChange={set("type")}>
            {ZONE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <div className="grid-2">
        <Field label="Town" error={errors.town}>
          <TextInput value={values.town} onChange={set("town")} placeholder="e.g. Nyeri" />
        </Field>
        <CountySelect value={values.county} onChange={(next) => setValues((current) => ({ ...current, county: next }))} error={errors.county} />
      </div>

      <div className="grid-3">
        <Field label="Latitude" error={errors.lat} hint="Optional.">
          <TextInput value={values.lat} onChange={set("lat")} />
        </Field>
        <Field label="Longitude" error={errors.lng} hint="Optional.">
          <TextInput value={values.lng} onChange={set("lng")} />
        </Field>
        <div className="field field-spacer">
          <span className="field-label">&nbsp;</span>
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
  const modeRows = buildModeRows(context.reference);
  const [values, setValues] = useState({ name: "", type: "", source: "" });
  const [newModeLabel, setNewModeLabel] = useState("");
  const [errors, setErrors] = useState<ProviderFormErrors & { mode_label?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resolvedModeId = values.type === NEW ? slugId(newModeLabel) : values.type;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldErrors: ProviderFormErrors & { mode_label?: string } = {};
    const np = validateNewProvider({ name: values.name, type: values.type });
    if (np.name) fieldErrors.name = np.name;
    if (np.type) fieldErrors.type = np.type;
    if (!fieldErrors.name && !slugId(values.name)) fieldErrors.name = "Use a name with letters.";
    if (values.type === NEW && (!newModeLabel.trim() || !slugId(newModeLabel))) fieldErrors.mode_label = "Enter the transport type.";
    if (!values.source.trim()) fieldErrors.source = "Enter the source for this submission.";
    const submitterError = identityError(context.contributorName);
    if (submitterError) fieldErrors.submitted_by = submitterError;
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    setMessage(null);
    const source = values.source.trim();
    const submitted_by = context.contributorName.trim();
    try {
      if (values.type === NEW) {
        await createSubmission({
          target: "modes",
          operation: "create",
          payload: { id: resolvedModeId, label: newModeLabel.trim(), description: null, source },
          source,
          submitted_by,
        });
      }
      const submission = await onSubmit({
        target: "providers",
        operation: "create",
        payload: { id: slugId(values.name), name: values.name.trim(), type: resolvedModeId, reliability_score: null },
        source,
        submitted_by,
      });
      setMessage(`Sent for review. It is ${statusLabel(submission.status).toLowerCase()}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Field label="Your name" error={errors.submitted_by}>
        <TextInput
          value={context.contributorName}
          onChange={(event) => context.setContributorName(event.target.value)}
          placeholder="Asha"
        />
      </Field>

      <Field label="Courier name" error={errors.name}>
        <TextInput value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Mololine" />
      </Field>

      <ModeChooser
        modes={modeRows}
        choice={values.type}
        onChoice={(next) => setValues((current) => ({ ...current, type: next }))}
        newLabel={newModeLabel}
        onNewLabel={setNewModeLabel}
        choiceError={errors.type}
        labelError={errors.mode_label}
      />

      <Field label="How do you know this?" error={errors.source} hint="e.g. called their desk, saw it at the stage.">
        <TextInput value={values.source} onChange={(event) => setValues((current) => ({ ...current, source: event.target.value }))} placeholder="Called their desk, 2026-06-22" />
      </Field>

      <div className="field-inline">
        <Button kind="primary" type="submit" icon={<PackagePlus size={16} />} disabled={submitting}>
          {submitLabel}
        </Button>
      </div>

      <div className="banner banner-muted">A reviewer checks new couriers before they go live.</div>
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
  const [values, setValues] = useState({ label: "", description: "", source: "" });
  const [errors, setErrors] = useState<ModeFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldErrors: ModeFormErrors = {};
    if (!values.label.trim() || !slugId(values.label)) fieldErrors.label = "Enter a name with letters.";
    if (!values.source.trim()) fieldErrors.source = "Enter the source for this submission.";
    const submitterError = identityError(context.contributorName);
    if (submitterError) fieldErrors.submitted_by = submitterError;
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const submission = await onSubmit({
        target: "modes",
        operation: "create",
        payload: {
          id: slugId(values.label),
          label: values.label.trim(),
          description: values.description.trim() || null,
          source: values.source.trim(),
        },
        source: values.source.trim(),
        submitted_by: context.contributorName.trim(),
      });
      setMessage(`Sent for review. It is ${statusLabel(submission.status).toLowerCase()}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Field label="Your name" error={errors.submitted_by}>
        <TextInput
          value={context.contributorName}
          onChange={(event) => context.setContributorName(event.target.value)}
          placeholder="Asha"
        />
      </Field>

      <Field label="Transport type" error={errors.label} hint="e.g. Boda boda, Bus parcel service.">
        <TextInput value={values.label} onChange={(event) => setValues((current) => ({ ...current, label: event.target.value }))} placeholder="e.g. Boda boda" />
      </Field>

      <Field label="Description" error={errors.description} hint="Optional.">
        <TextArea value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} rows={3} />
      </Field>

      <div className="grid-2">
        <Field label="How do you know this?" error={errors.source}>
          <TextInput value={values.source} onChange={(event) => setValues((current) => ({ ...current, source: event.target.value }))} placeholder="Saw it at the stage" />
        </Field>
        <div className="field field-spacer">
          <span className="field-label">&nbsp;</span>
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

function HowItWorks() {
  return (
    <ol className="how-it-works">
      <li>
        <span className="step-num">1</span>
        <span>You share what you know about a delivery price or place.</span>
      </li>
      <li>
        <span className="step-num">2</span>
        <span>A reviewer checks it.</span>
      </li>
      <li>
        <span className="step-num">3</span>
        <span>Once approved, it goes live for everyone.</span>
      </li>
    </ol>
  );
}

export function ContributeHome({ context }: RouteProps) {
  return (
    <div className="stack">
      <Panel title="Help improve delivery prices">
        <div className="stack">
          <p className="lede">
            Know a delivery price, a stage, or a courier in your area? Share it here. You don't need a GitHub
            account or any technical know-how.
          </p>
          <HowItWorks />
          <ContributorBar context={context} />
          <div className="cta-row">
            <Button kind="primary" icon={<PackagePlus size={16} />} onClick={() => context.navigate("/contribute/rate")}>
              Add a delivery price
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Other things you can add">
        <p className="lede">Most people only need "Add a delivery price" above, which can create these for you as you go.</p>
        <QuickLinks
          navigate={context.navigate}
          links={[
            { label: "Add a place (town or stage)", path: "/contribute/zone" },
            { label: "Add a courier", path: "/contribute/provider" },
            { label: "Add a transport type", path: "/contribute/mode" },
          ]}
        />
      </Panel>
    </div>
  );
}

type WizardStep = "provider" | "route" | "details" | "review";
const WIZARD_STEPS: Array<{ key: WizardStep; label: string }> = [
  { key: "provider", label: "Courier" },
  { key: "route", label: "Route" },
  { key: "details", label: "Price" },
  { key: "review", label: "Review" },
];

function emptyZone(): NewZoneValues {
  return { name: "", type: "stage", town: "", county: "", lat: "", lng: "" };
}

function WizardSteps({ step }: { step: WizardStep }) {
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.key === step);
  return (
    <div className="wizard-steps">
      {WIZARD_STEPS.map((s, i) => (
        <div key={s.key} className={classNames("wizard-step", s.key === step && "active", i < currentIndex && "done")}>
          <span className="step-num">{i + 1}</span>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function ZoneFields({
  prefix,
  values,
  onChange,
  errors,
}: {
  prefix: string;
  values: NewZoneValues;
  onChange: (next: NewZoneValues) => void;
  errors: Record<string, string>;
}) {
  const set = (field: keyof NewZoneValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...values, [field]: event.target.value });
  return (
    <div className="subsection stack">
      <div className="grid-2">
        <Field label="Place name" error={errors[`${prefix}_name`]} hint="A stage, hub, or area people recognise.">
          <TextInput value={values.name} onChange={set("name")} placeholder="e.g. Nyeri Town Stage" />
        </Field>
        <Field label="Type" error={errors[`${prefix}_type`]}>
          <SelectInput value={values.type} onChange={set("type")}>
            {ZONE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Town" error={errors[`${prefix}_town`]}>
          <TextInput value={values.town} onChange={set("town")} placeholder="e.g. Nyeri" />
        </Field>
        <CountySelect value={values.county} onChange={(next) => onChange({ ...values, county: next })} error={errors[`${prefix}_county`]} />
      </div>
    </div>
  );
}

function RateWizard({ context }: { context: PortalContext }) {
  const providerRows = buildProviderRows(context.reference);
  const zoneRows = buildZoneRows(context.reference);
  const modeRows = buildModeRows(context.reference);
  const existingZoneIds = useMemo(() => zoneRows.map((z) => z.id), [zoneRows]);
  const zoneLabel = (id: string) => {
    const zone = zoneRows.find((z) => z.id === id);
    return zone ? `${zone.name} — ${zone.town}` : id;
  };

  const [step, setStep] = useState<WizardStep>("provider");
  const [providerChoice, setProviderChoice] = useState("");
  const [newProvider, setNewProvider] = useState<NewProviderValues>({ name: "", type: "" });
  const [newModeLabel, setNewModeLabel] = useState("");
  const [originChoice, setOriginChoice] = useState("");
  const [destChoice, setDestChoice] = useState("");
  const [newOrigin, setNewOrigin] = useState<NewZoneValues>(emptyZone());
  const [newDest, setNewDest] = useState<NewZoneValues>(emptyZone());
  const [details, setDetails] = useState({
    base_cost_kes: "",
    cost_per_kg_kes: "",
    est_time: "",
    max_weight_kg: "",
    collection_type: "office_pickup",
    source: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setProviderChoice((c) => c || providerRows[0]?.id || NEW);
    setOriginChoice((c) => c || zoneRows[0]?.id || NEW);
    setDestChoice((c) => c || (zoneRows.length > 1 ? zoneRows[1]!.id : NEW));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerRows.length, zoneRows.length]);

  const resolvedProviderId = providerChoice === NEW ? slugId(newProvider.name) : providerChoice;
  const resolvedModeId = newProvider.type === NEW ? slugId(newModeLabel) : newProvider.type;
  const resolvedOriginId = originChoice === NEW ? buildZoneId(newOrigin.town, newOrigin.type, existingZoneIds) : originChoice;
  const resolvedDestId =
    destChoice === NEW
      ? buildZoneId(newDest.town, newDest.type, [...existingZoneIds, ...(originChoice === NEW ? [resolvedOriginId] : [])])
      : destChoice;

  const providerName = providerChoice === NEW ? newProvider.name.trim() : providerRows.find((p) => p.id === providerChoice)?.name ?? providerChoice;

  const validateStep = (target: WizardStep): Record<string, string> => {
    const next: Record<string, string> = {};
    if (target === "provider") {
      if (providerChoice === NEW) {
        const e = validateNewProvider(newProvider);
        if (e.name) next.np_name = e.name;
        if (e.type) next.np_type = e.type;
        if (!next.np_name && !slugId(newProvider.name)) next.np_name = "Use a name with letters.";
        if (slugId(newProvider.name) && providerRows.some((p) => p.id === slugId(newProvider.name)))
          next.np_name = "A courier with this name already exists — pick it from the list.";
        if (newProvider.type === NEW) {
          if (!newModeLabel.trim() || !slugId(newModeLabel)) next.np_mode = "Enter the transport type.";
          else if (modeRows.some((m) => m.id === slugId(newModeLabel)))
            next.np_mode = "That transport type already exists — pick it from the list.";
        }
      } else if (!providerChoice) {
        next.provider = "Choose a courier or add one.";
      }
    }
    if (target === "route") {
      if (originChoice === NEW) {
        const e = validateNewZone(newOrigin);
        for (const [k, v] of Object.entries(e)) next[`origin_${k}`] = v as string;
        if (!resolvedOriginId) next.origin_town = "Add a town so we can name this place.";
      } else if (!originChoice) next.origin = "Choose an origin or add one.";
      if (destChoice === NEW) {
        const e = validateNewZone(newDest);
        for (const [k, v] of Object.entries(e)) next[`dest_${k}`] = v as string;
        if (!resolvedDestId) next.dest_town = "Add a town so we can name this place.";
      } else if (!destChoice) next.dest = "Choose a destination or add one.";
      if (resolvedOriginId && resolvedDestId && resolvedOriginId === resolvedDestId)
        next.dest = "Origin and destination must be different.";
    }
    if (target === "details") {
      const rateErrors = validateRateForm({
        provider_id: resolvedProviderId,
        origin_zone_id: resolvedOriginId,
        destination_zone_id: resolvedDestId,
        base_cost_kes: details.base_cost_kes,
        cost_per_kg_kes: details.cost_per_kg_kes,
        est_time: details.est_time,
        max_weight_kg: details.max_weight_kg,
        collection_type: details.collection_type,
        source: details.source,
      });
      for (const [k, v] of Object.entries(rateErrors)) {
        if (k === "provider_id" || k === "origin_zone_id" || k === "destination_zone_id") continue;
        next[k] = v as string;
      }
    }
    return next;
  };

  const goNext = () => {
    const stepErrors = validateStep(step);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    const order: WizardStep[] = ["provider", "route", "details", "review"];
    setStep(order[order.indexOf(step) + 1] ?? "review");
  };

  const goBack = () => {
    const order: WizardStep[] = ["provider", "route", "details", "review"];
    setStep(order[Math.max(0, order.indexOf(step) - 1)]!);
  };

  const submitAll = async () => {
    if (!context.contributorName.trim()) {
      setSubmitError("Please add your name at the top first.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const items: SubmittedItem[] = [];
    const source = details.source.trim();
    const submitted_by = context.contributorName.trim();

    const trySubmit = async (
      kind: SubmittedItem["kind"],
      label: string,
      request: () => Promise<{ id: string }>,
    ) => {
      try {
        const submission = await request();
        items.push({ kind, label, status: "ok", submissionId: submission.id });
      } catch (err) {
        items.push({ kind, label, status: "error", error: err instanceof Error ? err.message : "Failed to send." });
      }
    };

    if (providerChoice === NEW && newProvider.type === NEW) {
      await trySubmit("mode", `Transport type: ${newModeLabel.trim()}`, () =>
        createSubmission({
          target: "modes",
          operation: "create",
          payload: { id: resolvedModeId, label: newModeLabel.trim(), description: null, source },
          source,
          submitted_by,
        }),
      );
    }
    if (providerChoice === NEW) {
      await trySubmit("provider", `Courier: ${newProvider.name.trim()}`, () =>
        createSubmission({
          target: "providers",
          operation: "create",
          payload: { id: resolvedProviderId, name: newProvider.name.trim(), type: resolvedModeId, reliability_score: null },
          source,
          submitted_by,
        }),
      );
    }
    if (originChoice === NEW) {
      await trySubmit("place", `Place: ${newOrigin.name.trim()}`, () =>
        createSubmission(zoneCreateRequest(newOrigin, resolvedOriginId, source, submitted_by)),
      );
    }
    if (destChoice === NEW) {
      await trySubmit("place", `Place: ${newDest.name.trim()}`, () =>
        createSubmission(zoneCreateRequest(newDest, resolvedDestId, source, submitted_by)),
      );
    }
    await trySubmit("rate", `Price: ${providerName}, ${zoneLabelFor(resolvedOriginId)} → ${zoneLabelFor(resolvedDestId)}`, () =>
      createSubmission({
        target: "rates",
        operation: "create",
        payload: {
          provider_id: resolvedProviderId,
          origin_zone_id: resolvedOriginId,
          destination_zone_id: resolvedDestId,
          base_cost_kes: Number(details.base_cost_kes),
          cost_per_kg_kes: Number(details.cost_per_kg_kes),
          est_time: details.est_time.trim(),
          max_weight_kg: details.max_weight_kg.trim().length ? Number(details.max_weight_kg) : null,
          collection_type: details.collection_type,
          source,
        },
        source,
        submitted_by,
      }),
    );

    setSubmitting(false);
    context.setSubmissionResult({ contributorName: submitted_by, items });
    context.navigate("/contribute/success/done");
  };

  function zoneCreateRequest(values: NewZoneValues, id: string, source: string, submitted_by: string) {
    return {
      target: "zones" as const,
      operation: "create" as const,
      payload: {
        id,
        name: values.name.trim(),
        type: values.type,
        town: values.town.trim(),
        county: values.county.trim(),
        lat: values.lat.trim().length ? Number(values.lat) : null,
        lng: values.lng.trim().length ? Number(values.lng) : null,
      },
      source,
      submitted_by,
    };
  }

  function zoneLabelFor(id: string): string {
    if (id === resolvedOriginId && originChoice === NEW) return newOrigin.name.trim() || newOrigin.town.trim();
    if (id === resolvedDestId && destChoice === NEW) return newDest.name.trim() || newDest.town.trim();
    return zoneLabel(id);
  }

  const setDetail = (field: keyof typeof details) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDetails((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="stack">
      <ContributorBar context={context} />
      <Panel title="Add a delivery price">
        <div className="stack">
          <WizardSteps step={step} />

          {step === "provider" ? (
            <div className="stack">
              <Field label="Which courier?" error={errors.provider}>
                <SelectInput value={providerChoice} onChange={(event) => setProviderChoice(event.target.value)}>
                  {providerRows.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                  <option value={NEW}>+ Add a new courier…</option>
                </SelectInput>
              </Field>
              {providerChoice === NEW ? (
                <div className="subsection stack">
                  <Field label="Courier name" error={errors.np_name}>
                    <TextInput value={newProvider.name} onChange={(e) => setNewProvider((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Mololine" />
                  </Field>
                  <ModeChooser
                    modes={modeRows}
                    choice={newProvider.type}
                    onChoice={(next) => setNewProvider((c) => ({ ...c, type: next }))}
                    newLabel={newModeLabel}
                    onNewLabel={setNewModeLabel}
                    choiceError={errors.np_type}
                    labelError={errors.np_mode}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {step === "route" ? (
            <div className="stack">
              <Field label="From (origin)" error={errors.origin}>
                <SelectInput value={originChoice} onChange={(event) => setOriginChoice(event.target.value)}>
                  {zoneRows.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} — {zone.town}
                    </option>
                  ))}
                  <option value={NEW}>+ Add a new place…</option>
                </SelectInput>
              </Field>
              {originChoice === NEW ? <ZoneFields prefix="origin" values={newOrigin} onChange={setNewOrigin} errors={errors} /> : null}

              <Field label="To (destination)" error={errors.dest}>
                <SelectInput value={destChoice} onChange={(event) => setDestChoice(event.target.value)}>
                  {zoneRows.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} — {zone.town}
                    </option>
                  ))}
                  <option value={NEW}>+ Add a new place…</option>
                </SelectInput>
              </Field>
              {destChoice === NEW ? <ZoneFields prefix="dest" values={newDest} onChange={setNewDest} errors={errors} /> : null}
            </div>
          ) : null}

          {step === "details" ? (
            <div className="stack">
              <div className="grid-3">
                <Field label="Starting price (KES)" error={errors.base_cost_kes}>
                  <TextInput inputMode="numeric" value={details.base_cost_kes} onChange={setDetail("base_cost_kes")} placeholder="350" />
                </Field>
                <Field label="Extra per kg (KES)" error={errors.cost_per_kg_kes} hint="Put 0 if there's no per-kg charge.">
                  <TextInput inputMode="numeric" value={details.cost_per_kg_kes} onChange={setDetail("cost_per_kg_kes")} placeholder="0" />
                </Field>
                <Field label="How long does it take?" error={errors.est_time}>
                  <TextInput value={details.est_time} onChange={setDetail("est_time")} placeholder="e.g. 3 hours" />
                </Field>
              </div>
              <div className="grid-3">
                <Field label="Most weight they carry (kg)" error={errors.max_weight_kg} hint="Optional.">
                  <TextInput inputMode="decimal" value={details.max_weight_kg} onChange={setDetail("max_weight_kg")} placeholder="20" />
                </Field>
                <Field label="Where does the customer hand over?" error={errors.collection_type}>
                  <SelectInput value={details.collection_type} onChange={setDetail("collection_type")}>
                    <option value="office_pickup">At the courier's office</option>
                    <option value="door_delivery">At the door</option>
                  </SelectInput>
                </Field>
                <Field label="How do you know this?" error={errors.source} hint="e.g. called their desk, saw it at the stage.">
                  <TextInput value={details.source} onChange={setDetail("source")} placeholder="Called their desk, 2026-06-22" />
                </Field>
              </div>
            </div>
          ) : null}

          {step === "review" ? (
            <div className="stack">
              <p className="lede">Check the details, then send. Anything new you added will be created too.</p>
              <div className="review-list">
                <div className="review-row">
                  <span>Courier</span>
                  <strong>{providerName}{providerChoice === NEW ? " (new)" : ""}</strong>
                </div>
                <div className="review-row">
                  <span>Route</span>
                  <strong>
                    {zoneLabelFor(resolvedOriginId)}{originChoice === NEW ? " (new)" : ""} → {zoneLabelFor(resolvedDestId)}
                    {destChoice === NEW ? " (new)" : ""}
                  </strong>
                </div>
                <div className="review-row">
                  <span>Starting price</span>
                  <strong>KES {details.base_cost_kes || "0"}{details.cost_per_kg_kes && details.cost_per_kg_kes !== "0" ? ` + ${details.cost_per_kg_kes}/kg` : ""}</strong>
                </div>
                <div className="review-row">
                  <span>Time</span>
                  <strong>{details.est_time || "—"}</strong>
                </div>
                <div className="review-row">
                  <span>Source</span>
                  <strong>{details.source || "—"}</strong>
                </div>
              </div>
              {submitError ? <div className="banner banner-danger">{submitError}</div> : null}
            </div>
          ) : null}

          <div className="action-row">
            {step !== "provider" ? (
              <Button kind="ghost" onClick={goBack} disabled={submitting}>
                Back
              </Button>
            ) : null}
            {step !== "review" ? (
              <Button kind="primary" icon={<ChevronRight size={16} />} onClick={goNext}>
                Next
              </Button>
            ) : (
              <Button kind="primary" icon={<PackagePlus size={16} />} onClick={() => void submitAll()} disabled={submitting}>
                {submitting ? "Sending…" : "Send for review"}
              </Button>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

export function ContributeRate({ context }: RouteProps) {
  return <RateWizard context={context} />;
}

export function ContributeZone({ context }: RouteProps) {
  return (
    <Panel title="Add a place" action={<Pill tone="muted">Places</Pill>}>
      <ZoneSubmissionSection context={context} submitLabel="Send" onSubmit={createSubmission} />
    </Panel>
  );
}

export function ContributeProvider({ context }: RouteProps) {
  return (
    <Panel title="Add a courier" action={<Pill tone="muted">Couriers</Pill>}>
      <ProviderSubmissionSection
        context={context}
        submitLabel="Send"
        onSubmit={createSubmission}
      />
    </Panel>
  );
}

export function ContributeMode({ context }: RouteProps) {
  return (
    <Panel title="Add a transport type" action={<Pill tone="muted">Transport</Pill>}>
      <ModeSubmissionSection context={context} submitLabel="Send" onSubmit={createSubmission} />
    </Panel>
  );
}

export function ContributionSuccess({ context }: RouteProps) {
  const result = context.submissionResult;

  if (!result) {
    return (
      <Panel title="Thank you">
        <div className="stack">
          <p className="lede">Your contribution was sent for review.</p>
          <div className="cta-row">
            <Button kind="primary" icon={<PackagePlus size={16} />} onClick={() => context.navigate("/contribute/rate")}>
              Add another
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  const anyError = result.items.some((item) => item.status === "error");
  const okCount = result.items.filter((item) => item.status === "ok").length;

  return (
    <Panel title={anyError ? "Almost there" : "Thank you!"}>
      <div className="stack">
        <p className="lede">
          Thanks{result.contributorName ? `, ${result.contributorName}` : ""}! {okCount > 0 ? `We sent ${okCount} ${okCount === 1 ? "thing" : "things"} for review.` : ""}
        </p>

        <div className="review-list">
          {result.items.map((item, index) => (
            <div key={index} className="review-row">
              <span>{item.label}</span>
              <Pill tone={item.status === "ok" ? "warning" : "danger"}>
                {item.status === "ok" ? statusLabel("pending") : "Didn't send"}
              </Pill>
            </div>
          ))}
        </div>

        {anyError ? (
          <div className="banner banner-danger">
            Some items didn't send. You can try adding those again. The ones marked "Waiting for review" are fine.
          </div>
        ) : null}

        <div className="banner banner-muted">
          What happens next: a reviewer checks each item. If you added a new courier or place, those are approved first,
          then the price. Once approved, everything shows up in the data automatically.
        </div>

        <div className="cta-row">
          <Button kind="primary" icon={<PackagePlus size={16} />} onClick={() => { context.setSubmissionResult(null); context.navigate("/contribute/rate"); }}>
            Add another
          </Button>
          <Button kind="ghost" onClick={() => { context.setSubmissionResult(null); context.navigate("/contribute"); }}>
            Done
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export function StaffSignIn({ context }: RouteProps) {
  return (
    <div className="stack">
      <Panel title="Staff sign-in" action={<Pill tone="muted">Staff</Pill>}>
        <p className="lede">
          This area is for reviewers and couriers. Enter the token you were given. It is kept in this browser tab only
          and is never saved.
        </p>
      </Panel>

      <Panel title="Reviewers" action={<ShieldCheck size={18} />}>
        <div className="stack">
          <TokenPrompt
            label="Reviewer token"
            token={context.moderatorToken}
            onChange={context.setModeratorToken}
            onClear={() => context.setModeratorToken("")}
            placeholder="Paste your reviewer token"
          />
          <div className="cta-row">
            <Button kind="primary" icon={<ShieldCheck size={16} />} disabled={!context.moderatorToken} onClick={() => context.navigate("/staff/moderate")}>
              Open review queue
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Couriers" action={<Truck size={18} />}>
        <div className="stack">
          <TokenPrompt
            label="Courier token"
            token={context.providerToken}
            onChange={context.setProviderToken}
            onClear={() => context.setProviderToken("")}
            placeholder="Paste your courier token"
          />
          <div className="cta-row">
            <Button kind="primary" icon={<Truck size={16} />} disabled={!context.providerToken} onClick={() => context.navigate("/staff/provider")}>
              Open courier workspace
            </Button>
          </div>
        </div>
      </Panel>
    </div>
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
                        <button className="link-text" type="button" onClick={() => context.navigate(`/staff/moderate/submissions/${submission.id}`)}>
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
            navigate={context.navigate}
            links={[
              { label: "Submit rate", path: "/staff/provider/submissions/rate" },
              { label: "Bookings", path: "/staff/provider/bookings" },
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
            submitLabel="Send"
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
                        <button className="link-text" type="button" onClick={() => context.navigate(`/staff/provider/bookings/${booking.id}`)}>
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
