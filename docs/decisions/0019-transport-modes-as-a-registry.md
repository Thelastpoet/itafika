# ADR 0019 — Use a registry for transport modes

**Status:** Accepted (2026-06-10)
**Date:** 2026-06-09

## Context

Currently, the list of transport modes (like "bus" or "shuttle") is hardcoded in our API contract. If we want to add a new mode, we have to change the code and release a new version. This goes against our goal of making Itafika easy to update with new data.

## Decision

We will move transport modes into a **data registry** (`modes.csv`). This means adding a new mode is just like adding a new rate or zone—it's a data update, not a code change. The API will now get its list of modes from this registry instead of a hardcoded list.

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
