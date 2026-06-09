# ADR 0020 — Non-developer data contributions enter via a form that opens a PR

**Status:** Proposed
**Date:** 2026-06-09

> A contribution-tooling decision, not an API-contract change — so it touches no
> `spec/` file and needs no contract sign-off. It is recorded as an ADR because *how
> non-developer data enters the canonical pipeline* is a real architectural decision
> worth pinning before anyone builds it.

## Context

Itafika repeatedly promises that contributing data needs **no code**:

- `CONTRIBUTING.md` §1 — "Contribute data (no code required)"; and "Many contributors
  are domain experts (riders, agents, SACCO staff) who may not be developers. Their
  knowledge is the point."
- `README.md`, `docs/contribute-data.md`, `docs/status.md`, and ADR 0007 echo the same
  intent.

But the actual documented path is: open the CSVs → read `SCHEMA.md` → add rows → run
`pnpm data:validate` → open a GitHub pull request. That requires Git, GitHub, Node/pnpm,
and CSV literacy — which the target contributor (a rider, a SACCO parcel-desk clerk, an
agent) almost certainly does not have. **The promise of a friendly place exists; the
friendly place does not.**

A natural temptation is to put up a form that writes **directly to D1** so submissions
appear in the live API immediately. That must be rejected — see below.

## Decision

Provide a **schema-aware contribution form** whose submissions are turned into a **pull
request against `spec/data/*.csv`** via the GitHub API. The form is the friendly front
door; the canonical pipeline behind it is unchanged.

- **The form never writes to D1.** `spec/data/` is canonical; D1 is a projection
  rebuilt from seed. The form produces a reviewable PR; nothing goes live until that PR
  is validated, reviewed, and merged, then reseeded — exactly today's flow.
- **A separate Worker** (or Pages + Functions app), not the public API Worker. The API
  Worker stays a clean read surface; the contribution app is a write concern that holds
  a GitHub token and a spam surface, which do not belong on the API.
- **Provenance is mandatory.** The form requires the `source` field; no anonymous,
  unsourced rates.
- **The form mirrors `SCHEMA.md`** (including the planned `modes` / `collection_type` /
  `county` fields, ADRs 0016–0019) so it cannot produce an invalid row, and surfaces
  the same rules `data:validate` enforces.
- **Public-write hardening:** Cloudflare Turnstile + rate limiting in front; the GitHub
  token is a Worker secret, never committed.

Data flow:

```
contributor → form Worker → GitHub PR against spec/data/*.csv
            → data:validate + maintainer review + provenance → merge → reseed → D1 → API
```

## Rationale

- **Keeps one source of truth.** The contribution becomes git history with provenance
  and review, not an out-of-band D1 write that the next reseed wipes or that silently
  diverges from the CSVs.
- **Reuses the trust machinery.** Validation, review, and provenance already exist; the
  form only automates the part a non-developer can't do (branch + commit + PR).
- **Respects the boundaries** (ADR 0009): read API and contribution tooling are
  different concerns and stay separate.

## Options considered

- **Form writes directly to D1.** Rejected — inverts the canonical model (CSV is the
  source of truth, D1 is disposable), bypasses provenance and review, and either gets
  wiped on reseed or drifts into a second source of truth. Unverified data going live
  instantly is precisely the "confident guess" the project guards against.
- **Form lives on the public API Worker.** Rejected — puts a GitHub token and a public
  write/spam surface on the clean read API; mixes concerns ADR 0009 keeps apart.
- **A staging queue with a moderation UI now** (Worker writes submissions to a review
  store; a maintainer approves; approved rows are batched into a CSV PR). Deferred —
  more to build than is warranted yet. Keep as the **scale-up step** if PR-per-
  submission becomes noisy; the front-door form is unchanged either way.

## Consequences

- A new contribution Worker/app to build and host, with a GitHub token secret and spam
  protection. Not part of `packages/` Phase-1 scope; tracked in `docs/next-phase.md`.
- The form's field rules must be kept in sync with `spec/data/SCHEMA.md` (a maintenance
  cost; mitigated by validating server-side against the same rules and letting
  `data:validate` remain the final gate in CI).
- No API contract change; no `spec/` edit.
- Once built, `CONTRIBUTING.md` and `docs/contribute-data.md` should point non-
  developers at the form first, and the developer CSV/PR path becomes the advanced
  route — closing the gap between the promise and the reality.
