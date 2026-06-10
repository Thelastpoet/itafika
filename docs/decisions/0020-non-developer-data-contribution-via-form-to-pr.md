# ADR 0020 — Allow data updates via a web form

**Status:** Proposed
**Date:** 2026-06-09

## Context

We want people who aren't developers (like riders or agents) to be able to contribute data to Itafika. Right now, contributing requires knowing how to use Git and GitHub, which is a barrier for many domain experts.

## Decision

We will build a simple **web form** for data contributions. When someone submits the form, it will automatically create a "Pull Request" on GitHub.

This ensures:
- **Human review.** Data is reviewed by a maintainer before it's merged.
- **No Git required.** Contributors don't need to know how Git or GitHub works.
- **One source of truth.** The form updates the CSV files, which remain our authoritative data source.
- **Security.** The form will use spam protection and a secure GitHub token.

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
