# ADR 0023: Data lives in D1; git holds code, not data

**Status:** Accepted
**Date:** 2026-06-15

**Supersedes:** [ADR 0003](0003-datastore.md) (the "CSV is source of truth, D1 is
disposable" part) and [ADR 0020](0020-non-developer-data-contribution-via-form-to-pr.md)
(the form → pull request contribution model).

## Context

Under [ADR 0003](0003-datastore.md) the CSV files in `spec/data/` are the source of
truth and D1 is a disposable cache reseeded from them. [ADR 0020](0020-non-developer-data-contribution-via-form-to-pr.md)
added a form that turns a contribution into a GitHub pull request against those CSVs.

[ADR 0022](0022-itafika-builds-the-provider-supply-layer.md) changes the nature of the
data. Providers will upload and update their own routes and rates, and those rates
change. A pull request, a maintainer review, a merge, and a reseed for "this SACCO
raised its Nyeri price by 50 bob" is the wrong tool: too slow, too technical, and it
leaves D1 perpetually drifting from the CSVs between reseeds. ADR 0020 itself anticipated
this and *deferred* an online moderation queue as the "scale-up step." It is time to
adopt it.

The risk in moving off git is losing the two things git gave Itafika for free:
**provenance** (`git blame` answers "how do you know this price?") and **openness**
(anyone can clone the dataset and run their own Itafika). Lose those and Itafika becomes
the closed system its own concept doc criticizes.

## Decision

**D1 is the operational source of truth for reference data.** Git holds code, not data.

- **Contribution** is an online app (the provider/non-technical tool from ADR 0022) that
  writes submissions into a **moderation queue**; trusted **moderators** approve online,
  and approved data goes live in D1. This replaces the form → pull request flow.
- **Provenance** is preserved by an **append-only change log** in D1 (who changed what,
  when, source, before and after), the database equivalent of git history, and the basis
  for trust in the dataset.
- **Openness** is preserved by an **automated, scheduled export of reference data to a
  public snapshot** (e.g. CSV/JSON in git or a public bucket) plus the open read API. The
  snapshot is machine-generated, not hand-edited, which kills the manual PR workflow while
  keeping the dataset open, forkable, and auditable. The export also serves as the backup
  that git used to provide for free.
- The export obeys [ADR 0024](0024-data-classification-and-protection.md): it is
  allowlist-only over **reference** tables and never includes customer data or active
  delivery orchestration records.

## Rationale

- **Right tool for changing data.** Provider-owned rates change; a database with online
  moderation fits that, a PR-per-change does not.
- **Keeps the dataset open without keeping it in git.** The generated snapshot + open API
  give forkability and audit; the change log gives provenance. The openness property is
  retained deliberately rather than as a side effect of the storage choice.
- **Closes the CSV/D1 drift** that ADR 0003 created.

## Rejected options

### Keep CSV-in-git as the source of truth (status quo)

Rejected for provider-owned, frequently-changing data: too slow, too technical, and
permanently drifting from D1.

### Move to D1 and stop there (no export, no change log)

Rejected: it discards provenance and openness and turns Itafika into a closed,
unauditable, unforkable dataset, contradicting the mission. The export and change log are
hard requirements, not nice-to-haves.

### Auto-publish provider submissions without moderation

Rejected: same risk [ADR 0020](0020-non-developer-data-contribution-via-form-to-pr.md)
rejected for "form writes directly." Even first-party provider data goes through
validation and a moderator; first-party provenance is recorded and may fast-track trusted
providers later, but the gate stays.

## Consequences

- New build: moderation queue + moderator tooling, the change-log table, and the scheduled
  export job. None of this exists yet.
- `spec/data/*.csv` stops being the authoritative store; it becomes (at most) generated
  snapshot output and/or initial seed. Seed/validation tooling is reworked accordingly.
- Backups become our responsibility; the public export doubles as the backup.
- No public API contract change is required by this ADR on its own.
