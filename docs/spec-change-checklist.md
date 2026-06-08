# Spec Change Checklist

Use this checklist when a change touches the canonical API or data contract.

This is for maintainers and contributors who are changing:

- `spec/openapi.yaml`
- `spec/adapter-contract.md`
- `spec/data/SCHEMA.md`
- any contract behavior that consumers or implementers rely on

## Before opening the PR

- confirm that the change really belongs in `spec/` and is not only an implementation detail
- describe the problem in plain language
- identify whether the change is:
  - additive
  - clarification
  - breaking

## In the PR

- update the relevant file in `spec/`
- add or link the ADR in `docs/decisions/` if required by governance
- update generated types if `spec/openapi.yaml` changed
- update any implementation code that follows the spec
- update tests that cover the affected behavior
- update user-facing docs if the change affects what contributors or consumers should expect

## Before merge

- run:

```bash
pnpm test
pnpm typecheck
```

- check that the spec and implementation now agree
- check that examples still match current behavior
- check whether `docs/status.md` needs an update

## Extra checks for breaking changes

- confirm the change cannot stay additive
- document the migration path
- document the deprecation or versioning plan
- get the required sign-off under `GOVERNANCE.md`

## Rule of thumb

If a consumer could build against it, document it in `spec/`.

If only the reference implementation needs to know, keep it out of the canonical contract.
