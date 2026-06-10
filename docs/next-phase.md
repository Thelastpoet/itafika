# Next Phase Task List

This file turns the current project state into a practical work queue.

It is not the long-term roadmap. It is the next set of concrete tasks that would move the repository forward in a useful way.

Use it with:

- `docs/status.md` for what exists today
- `docs/Itafika-Concept-Doc.md` for the long-term direction
- `spec/` for the canonical contract

## Recommended next phase

The Phase 1 reference **code path is essentially complete**: quotes and booking run
through the adapter runtime, tracking is settled on the one-log model, and the adapter
conformance kit now backs the open-contribution promise. The remaining pure-Phase-1
code threads either depend on a live (non-static) adapter — which is Phase 2 — or are
data work.

So the next highest-value effort is:

**improve the actual dataset, then grow live adapter coverage (Phase 2)**

The dataset is the project's long-term asset and is the first thing not blocked on
anything else. Live adapter work is now unblocked too: the runtime seam and the
conformance kit are both in place, so a first real adapter has everything it needs.

## Priority order

### Completed recently

- deployment guide and remote D1 workflow
- live hosted Worker deployment
- adapter package skeleton with a static reference adapter
- dataset validation workflow
- dataset freshness endpoint
- quote expiry and single-use booking policy
- manual tracking event update path
- first sourced Easy Coach rate replacement
- CI for validation, tests, and typecheck
- compatibility date aligned with the runtime currently used in local verification
- quote flow wired through the adapter runtime (ADR 0013)
- booking wired through the adapter runtime, with internal `provider_id`/`provider_ref` (ADR 0014)
- tracking-update model decided: one event log, manual is Phase-1 truth, source recorded per event (ADR 0015)
- adapter conformance kit (`@itafika/adapters/conformance`) backing the contract's "pass the conformance tests" promise

### Phase-2-gated — Extend delivery lifecycle behavior

The lifecycle (quote, booking, tracking, manual events) is built, and how the update
sources coexist is decided (ADR 0015: one log, manual is truth, source per event). The
only remaining thread — adapter-driven `track()` and webhook-driven updates — needs a
live (non-static) adapter to be meaningful, so it lands with the first live adapter in
Phase 2, not as standalone Phase-1 work.

### Done — Move provider flow toward adapter runtime integration

Quotes and booking now run through `LogisticsProviderInterface` (ADRs 0013, 0014),
and the tracking-update model is decided (ADR 0015): one event log, manual is the
Phase-1 source of truth, each event records its source. The remaining thread is
adapter-driven `track()` / webhooks, which only becomes real with a non-static
adapter — captured under "Extend delivery lifecycle behavior" above.

### P1 — Improve the actual dataset

Why this matters:

- the seed data is still partly illustrative
- the open data is still the core long-term asset of the project

Tasks:

- replace `seed-illustrative` rows with sourced field data
- expand town and route coverage carefully
- improve provenance quality on existing rows
- decide how freshness updates should be reviewed and enforced

Done when:

- the dataset is meaningfully more trustworthy, not just more structured

### Done — Checkout-delivery direction (ADRs 0016–0019)

ADRs 0016–0019 are `Accepted` and implemented in the reference Worker:

- modes registry (ADR 0019): `modes.csv` + `GET /v1/modes`, `provider.type` validated
  as an open FK into it in `data:validate`, the closed `CHECK` dropped from the schema
- collection facts on quotes (ADR 0016): `collection_type` on `rates.csv`/quotes, with
  the office-pickup collection point composed from the destination zone
- discovery (ADR 0017): `GET /v1/options` via an adapter `coverage()` seam, `county` on
  zones, and `town`/`county` filters on `GET /v1/zones`
- booking instructions/identity (ADR 0018): `instructions`, `id_number`,
  `alternate_collector` on bookings

A shop can now render the full checkout delivery step from Itafika data. Remaining work
on this front is **data**: replace the illustrative `collection_type`/`county` values
and seed modes provenance with sourced field data.

### P3 — Non-developer data contribution path (ADR 0020)

Why this matters:

- the project promises data contribution with "no code required" (`CONTRIBUTING.md`),
  but the real path is CSV + `data:validate` + a GitHub PR — unusable for the riders,
  SACCO desk staff, and agents whose knowledge is the point
- closing this gap is what makes "the dataset is the asset" actually crowdsourceable

Tasks (contribution tooling — no API contract change):

- a separate contribution Worker (or Pages + Functions) hosting a schema-aware,
  plain-language form (mirrors `SCHEMA.md`, requires `source`/provenance)
- on submit, open a PR against `spec/data/*.csv` via the GitHub API (token as a
  Worker secret); **never write to D1** — the canonical pipeline (validate → review →
  merge → reseed) is unchanged
- Cloudflare Turnstile + rate limiting on the public write endpoint
- once live, point `CONTRIBUTING.md` / `contribute-data.md` at the form first

Done when:

- someone who has never used Git can submit a sourced rate and it arrives as a
  reviewable PR

Later, if PR-per-submission gets noisy: a staging/moderation queue (ADR 0020's
deferred option).

## What should wait

These are important, but not the best next use of effort:

- broad live provider coverage
- Workflows-based long-running booking
- Queues-based provider jobs
- Durable Objects for coordination
- ranking-policy expansion beyond the current simple default

Those become much easier once the current code path is more complete.

## Suggested implementation order

The checkout-delivery contract (P2, ADRs 0016–0019) is **done** — see the section
above. The remaining tracks are independent:

1. **(Ongoing) Improve the dataset (P1).** Sourced rates and broader coverage, plus
   replacing the now-illustrative `collection_type`/`county` values and seed modes
   provenance with real data.
2. **(Independent) Non-developer contribution path (P3, ADR 0020).** A form that opens
   a PR against the CSVs — no API contract change. ADR 0020 is still `Proposed`; sign it
   off before building.
3. **First live adapter (Phase 2)**, then adapter-driven `track()` / webhook updates
   into the one event log, and live `coverage()` for discovery.
