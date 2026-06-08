# Release Checklist

Use this checklist before cutting a release, tagging a milestone, or declaring a branch ready for wider use.

The goal is simple:

- the repo should describe itself truthfully
- the spec and implementation should agree
- contributors should not need maintainer memory to understand the current state

## 1. Reality check

- confirm `README.md` still matches the repository layout and current maturity
- confirm [`docs/status.md`](status.md) still matches the implementation
- confirm [`docs/next-phase.md`](next-phase.md) still reflects the actual remaining work

## 2. Contract check

- if `spec/openapi.yaml` changed, regenerate types
- if canonical docs in `spec/` changed, confirm the required ADR exists
- if the public contract changed, confirm examples still match runtime behavior

## 3. Data check

- run `pnpm data:validate`
- if `spec/data/` changed, confirm provenance and freshness updates are present
- if dataset changes affect examples or docs, update them

## 4. Implementation check

- run `pnpm test`
- run `pnpm typecheck`
- confirm CI passes for the same scope

## 5. Deployment check

- confirm deployment docs still match the current Worker setup
- confirm any new migration or seed steps are documented
- call out any known deploy gaps plainly in the PR or release notes

## 6. Contributor check

- if behavior moved between `Implemented`, `Partial`, `Specified, not yet implemented`, or `Planned`, update docs to say so directly
- if a new engineering rule was introduced, document it instead of relying on convention

## Rule of thumb

If a contributor or consumer would be surprised after pulling the repo, the release is not ready yet.
