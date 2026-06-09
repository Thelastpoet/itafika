# Next Phase Task List

This file turns the current project state into a practical work queue.

It is not the long-term roadmap. It is the next set of concrete tasks that would move the repository forward in a useful way.

Use it with:

- `docs/status.md` for what exists today
- `docs/Itafika-Concept-Doc.md` for the long-term direction
- `spec/` for the canonical contract

## Recommended next phase

The next highest-value phase is:

**finish the remaining Phase 1 code work before the broader data refresh**

That means:

- build on the new delivery lifecycle path
- define how provider flows move toward runtime adapter use
- keep the hosted Worker and the codebase aligned as those pieces land

The large data improvement pass still matters, but it can follow after the current code path is more complete.

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

### P1 — Extend delivery lifecycle behavior

Why this matters:

- the API now has quote, booking, tracking, and manual event updates
- the next code step is making that lifecycle more usable in practice

Tasks:

- build on the new manual/internal tracking event path
- decide how adapter-driven, manual, and future webhook-driven updates should coexist
- add tests around status progression as the path expands

Done when:

- tracking history can grow in a meaningful and reviewable way

### P1 — Move provider flow toward adapter runtime integration

Why this matters:

- booking still records deliveries but does not dispatch to providers
- the adapter package now exists, but the Worker does not yet use adapter instances for provider flows

Tasks:

- decide how booking should call adapters in the reference runtime
- decide how tracking updates should relate to adapters versus manual/internal updates
- implement the first narrow adapter runtime path without pretending Phase 2 is complete

Done when:

- the codebase has a clear, real runtime path from API request to adapter behavior

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

## What should wait

These are important, but not the best next use of effort:

- broad live provider coverage
- payment and settlement flows
- Workflows-based long-running booking
- Queues-based provider jobs
- Durable Objects for coordination
- ranking-policy expansion beyond the current simple default

Those become much easier once the current code path is more complete.

## Suggested implementation order

1. extend delivery lifecycle behavior
2. move provider flow toward adapter runtime integration
3. improve the actual dataset
4. add any remaining operational polish that supports contributor flow
