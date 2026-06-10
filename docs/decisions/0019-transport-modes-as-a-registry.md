# ADR 0019 — Model transport modes as a governed registry

**Status:** Accepted (2026-06-10)
**Date:** 2026-06-09

> One of four related ADRs (0016–0019) evolving Itafika into a checkout-delivery
> layer. Direction and expectations only — implementation and maintainer sign-off
> per [GOVERNANCE.md](../../GOVERNANCE.md) are follow-on.
>
> Supersedes the earlier draft of this ADR, which proposed extending a closed
> `ProviderType` enum. That was the wrong shape: it baked policy (which modes exist)
> into the contract and the engine, so adding a mode meant a spec change and a
> release. This ADR makes modes data instead.

## Context

The checkout funnel ([0017](0017-add-delivery-options-discovery-surface.md)) offers a **mode** choice — "bus", "shuttle", "courier",
"rider", and others Kenyans use to send parcels (taxi/ride-hailing, lorry/cargo).
The set is not fixed: new modes appear, and the project cannot predict them.

Today `ProviderType` is a **closed enum** in the contract. Adding `shuttle` or `taxi`
therefore requires editing `openapi.yaml`, writing an ADR, regenerating types, and
shipping a release — for what is really just a new label. That contradicts Itafika's
own philosophy: providers, rates, and zones are all **data** you add without touching
the core, but modes were hardcoded.

The deciding question for any value set is: **does the engine reason about each
member?**

- **Tracking statuses** (`package_picked … delivered`) — yes. The engine enforces
  forward-only transitions and normalises every provider onto exactly these. They
  are correctly a **closed** enum; "never invent a sixth" is load-bearing.
- **Transport modes** — no. The core never branches on a specific mode; it only
  carries the mode through for grouping, filtering, and display. A value set the
  engine does not branch on has no business being a closed enum.

## Decision

Model transport modes as a **governed reference registry**, not an enum.

- **`modes.csv`** joins the open dataset (`id`, `label`, `description`, `source`).
  Adding `taxi`, `cargo_truck`, or any future mode is a **data contribution with
  provenance**, reviewed like a rate — no code, no contract change, no release.
- **The contract types a mode as an open identifier**, not a closed enum.
  `ProviderType` becomes a string drawn from the registry, with the seed values as
  *examples*, and **`GET /v1/modes`** as the source of truth for what currently
  exists.
- **Display metadata travels with the mode.** Because the registry carries `label`
  and `description`, a shop can render a mode it has never seen — generic icon, the
  registry's label — without a code update. Open *and* consumable.
- **The core never branches on a specific mode.** Validation is "is this a known
  mode id?" against the registry, never a literal string comparison. Any `if mode ==
  '…'` in the core would re-create the hardcoding this ADR removes.
- **Open is not a free-for-all.** Additions go through the same data governance as
  rates, so the registry doesn't accumulate `lorry`, `truck`, and `cargo_truck` as
  three names for one thing.

The seed registry still ships with the modes Kenya needs (`boda_rider`,
`matatu_sacco`, `bus`, `national_courier`, `shuttle`, `taxi`, `cargo_truck`) — but as
**data rows**, not enum members. `providers.type` references a `modes.id`.

## Rationale

- **Add-without-code.** New modes flow in as governed data; the contract and engine
  are untouched.
- **Consistent with Itafika's design.** This applies the existing "no provider logic
  in the core" rule to modes — providers were already data; modes now are too.
- **Fewer breaking changes.** A new mode is a backward-compatible data change, not a
  contract revision. The ADR is needed once (to establish the registry); after that,
  modes are just data.
- **Keeps the closed contract closed.** Tracking statuses stay an enum precisely
  because the engine reasons about them — this ADR draws the line in the right place.

## Options considered

- **Extend the closed `ProviderType` enum (the earlier draft).** Rejected — bakes
  policy into the contract; every new mode is a spec change and release.
- **Free-text mode with no registry.** Rejected — loses the shared vocabulary and
  the display metadata, so consumers can't render or group modes reliably, and
  synonyms proliferate ungoverned.
- **Hardcode in the engine but mirror to data.** Rejected — two sources of truth for
  the same set; the engine copy inevitably drifts and re-introduces branching.

## Consequences

- The OpenAPI `ProviderType` changes from a closed `enum` to an **open identifier**
  (seed values shown as examples); a new `Mode` schema and a `GET /v1/modes` endpoint
  are added. Loosening the enum is backward-compatible for existing values.
- `modes.csv` joins the dataset; `providers.type` is validated as a foreign key into
  it (data work + a `data:validate` rule, follow-on).
- The adapter contract's `ProviderInfo.type` is documented as a registry id; no
  adapter ever branches on a specific mode.
- Generated types and the reference Worker need updating (follow-on).
- **The product judgement** — which modes the seed registry should contain, and
  whether `taxi`/`cargo_truck` are in early scope — is now a *data* review, not a
  contract decision. Still worth a steward's eye, but no longer gates the contract.
