# Next Phase Task List

This file turns the current project state into a practical work queue.

It is not the long-term roadmap. It is the next set of concrete tasks that would move the repository forward in a useful way.

Use it with:

- `docs/status.md` for what exists today
- `docs/Itafika-Concept-Doc.md` for the long-term direction
- `spec/` for the canonical contract

## Recommended next phase

The next highest-value phase is:

**make Phase 1 easier to deploy, easier to extend, and easier to contribute to**

That means:

- improve the dataset itself, not only the data tooling
- add the next useful delivery lifecycle behavior
- keep the contributor workflow and release process easy to follow

This is more valuable right now than jumping straight to payments, Workflows, or live provider integrations.

## Priority order

### Completed recently

- deployment guide and remote D1 workflow
- adapter package skeleton with a static reference adapter
- dataset validation workflow
- dataset freshness endpoint
- quote expiry and single-use booking policy
- manual tracking event update path
- CI for validation, tests, and typecheck
- compatibility date aligned with the runtime currently used in local verification

### P1 — Improve the actual dataset

Why this matters:

- the tooling is better now
- the seed data is still partly illustrative
- the open data is the core long-term asset of the project

Tasks:

- replace `seed-illustrative` rows with sourced field data
- expand town and route coverage carefully
- improve provenance quality on existing rows
- decide how freshness updates should be reviewed and enforced

Done when:

- the dataset is meaningfully more trustworthy, not just more structured

### P1 — Extend delivery lifecycle behavior

Why this matters:

- the API now has a solid quote and booking core
- the next meaningful product step is better delivery-state progression

Tasks:

- build on the new manual/internal tracking event path
- decide how adapter-driven, manual, and future webhook-driven updates should coexist
- add tests around status progression once the path is chosen

Done when:

- tracking history can grow in a meaningful and reviewable way

### P1 — Define policy boundaries before adding smarter ranking

Why this matters:

- the project should not bury business heuristics in core code
- ranking and selection policy needs a clear home before it grows
- contributors need to know whether behavior belongs in spec, data, config, adapters, or implementation glue

Tasks:

- define engineering rules for policy ownership
- decide where quote-ranking policy belongs
- keep the current default ranking simple until that boundary is agreed
- only reintroduce smarter ranking once it is spec-backed, data-backed, or explicitly configurable

Done when:

- no hidden domain policy is living in core logic
- future ranking work has a clear architectural home

## What should wait

These are important, but not the best next use of effort:

- payment and settlement flows
- Workflows-based long-running booking
- Queues-based provider jobs
- Durable Objects for coordination
- full live provider integrations

Those become much easier once deployment, adapters, and contribution paths are more mature.

## Suggested implementation order

1. improve the actual dataset
2. extend delivery lifecycle behavior
3. add any remaining operational polish that supports contributor flow
