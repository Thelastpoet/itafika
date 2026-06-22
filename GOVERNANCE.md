# Governance

Itafika is an open standard with a reference implementation. How it's governed should keep the **standard trustworthy** while keeping contribution **easy**. This document describes how decisions get made. It is intentionally lightweight and will grow only as the project does.

## Principles

1. **The spec is the constitution.** `spec/` defines what Itafika *is*. Changes to it carry the most weight and get the most scrutiny.
2. **Adoption over control.** Decisions favour what makes the standard easier to adopt and contribute to, over what's convenient for any single implementer.
3. **Transparency.** Significant decisions are written down as ADRs in [`docs/decisions/`](docs/decisions/) so the *why* outlives the people who made the call.

## Roles

**Contributors**: anyone who opens an issue, PR, or data entry. No commitment required.

**Maintainers**: review and merge PRs, triage issues, and safeguard the spec. Maintainers are added by existing maintainers based on a track record of good contributions and judgment.

**Stewards**: a small group (initially the founder) responsible for the project's direction, the license, and breaking-change decisions. Stewardship is a responsibility, not ownership; the code is MIT and forkable by design.

## How decisions are made

**Everyday changes** (bug fixes, new adapters, data additions/corrections, docs): a maintainer reviews and merges. No ceremony.

**Spec changes** (endpoints, fields, types, tracking states, the adapter contract) require:
1. A pull request to `spec/`.
2. A short ADR in `docs/decisions/` explaining the problem, the options, and the choice.
3. Sign-off from at least one maintainer who did not author the change.
4. For **breaking** changes: steward sign-off and a versioning/deprecation plan.

**Disagreements** are discussed in the issue or PR. If consensus among maintainers can't be reached, a steward decides and records the reasoning in an ADR. Decisions are reversible; an ADR can be superseded by a later one.

## Versioning

The API is versioned by path (`/v1`). Within a major version, changes are additive and backwards-compatible. Breaking changes go to the next major version with a documented deprecation window so shops aren't broken without warning.

The **dataset** is versioned by date of last update per region, so consumers can reason about freshness.

## Amending this document

Changes to governance follow the spec-change process: a PR, an ADR, and steward sign-off.
