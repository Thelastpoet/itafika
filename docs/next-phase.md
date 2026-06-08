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

- finish the deployment path for the reference Worker
- create the missing adapter package structure
- improve the seed dataset and data workflow
- tighten small gaps between the contract and the implementation story

This is more valuable right now than jumping straight to payments, Workflows, or live provider integrations.

## Priority order

### P1 — Make the reference Worker deployable

Why this matters:

- local development already works
- hosted deployment still depends on manual setup knowledge
- maintainers need a repeatable path from repo to live environment

Tasks:

- add a deployment guide for Cloudflare setup
- document the exact commands for:
  - creating the D1 database
  - updating `wrangler.jsonc`
  - applying remote migrations
  - seeding remote data
- decide how to handle local vs remote `database_id` configuration cleanly
- reconcile the configured compatibility date with the locally available runtime version

Done when:

- a maintainer can deploy the reference Worker from scratch using repo docs only
- the repo no longer depends on hidden setup steps

### P1 — Create the adapter package skeleton

Why this matters:

- the spec and docs already describe adapters
- contributors currently have a contract but no canonical package to implement against
- this is the biggest structure gap in the repository

Tasks:

- add `packages/adapters/`
- define a real TypeScript `LogisticsProviderInterface`
- add one static reference adapter that reads from the current dataset shape
- add tests for adapter conformance
- update `spec/adapter-contract.md` and `CONTRIBUTING.md` to point to real files instead of planned paths

Done when:

- a contributor can add a provider adapter without inventing the package structure
- the repo contains one real example adapter and one real adapter test path

### P1 — Improve data contribution workflow

Why this matters:

- the current rates are still `seed-illustrative`
- open-source value here depends heavily on better data, not only better code
- non-code contributors need a clearer path

Tasks:

- add a simple “how to contribute data” guide with one worked example
- document provenance expectations more plainly
- add validation scripts for `spec/data/*.csv`
- add a root script that validates data before seed generation
- decide whether freshness data should be surfaced by the API in a later Phase 1.x step

Done when:

- contributors can submit zone/rate fixes with less guesswork
- invalid CSV changes are caught automatically

### P2 — Strengthen quote and delivery behavior

Why this matters:

- the current API shape is solid, but some fields are still passive
- this is the most natural place for incremental product behavior improvements

Tasks:

- add quote expiry rules if quotes should not remain bookable forever
- decide whether duplicate quote persistence needs cleanup or pruning
- add more tracking event creation paths if delivery history is meant to grow beyond the initial event

Done when:

- Phase 1 behavior is clearer and less placeholder-like
- there is less hidden policy in maintainers’ heads

### P2 — Add operational polish

Why this matters:

- maintainers need better confidence as the repo grows
- small operational improvements compound quickly

Tasks:

- add CI for `pnpm test` and `pnpm typecheck`
- add a root `lint` or formatting check if the team wants one
- add a release/checklist doc for changes that touch `spec/`
- decide whether generated Worker types should be refreshed automatically in contributor workflows

Done when:

- the main branch has automated guardrails for the current development process

## What should wait

These are important, but not the best next use of effort:

- payment and settlement flows
- Workflows-based long-running booking
- Queues-based provider jobs
- Durable Objects for coordination
- full live provider integrations

Those become much easier once deployment, adapters, and contribution paths are more mature.

## Suggested implementation order

1. deployment guide and deploy configuration cleanup
2. adapter package skeleton
3. data validation and contribution tooling
4. quote and delivery behavior refinements
5. CI and operational polish
