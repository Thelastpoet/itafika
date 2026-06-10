# Engineering Principles

This document sets the engineering rules for the project.

The goal is simple:

- keep the standard trustworthy
- keep the implementation understandable
- keep the open-source contribution path clean
- prevent architectural drift as the project grows

These rules apply to code, docs, and data work.

## 1. Spec first, but not spec everywhere

The spec owns the public contract.

Put behavior in `spec/` when:

- API consumers depend on it
- implementers in other languages need the same rule
- changing it would affect compatibility

Do **not** put implementation-only details in the spec.

## 2. No hidden business policy in core code

Core code should not contain buried domain policy such as:

- hardcoded package-type preference lists
- provider preference rules
- route-specific exceptions
- silent ranking heuristics

If a rule affects product behavior, it must have an explicit home:

- `spec/` if it is contractual
- `spec/data/` if it is domain data
- explicit config if it is implementation-tunable

## 3. Separate mechanism from policy

We should keep these concerns separate:

- cost calculation
- quote ranking
- delivery lifecycle rules
- adapter behavior
- HTTP validation and orchestration

Example:

- the quote engine can calculate candidate options
- a ranking policy can decide how those options are ordered

Those should not be mixed casually.

## 4. Prefer data-driven or config-driven behavior over hardcoding

Open-source projects scale better when important behavior is reviewable without reading TypeScript internals.

Prefer:

- CSV or schema-backed data
- explicit configuration
- documented policy modules

Avoid:

- magic constants with domain meaning
- rules that only exist in implementation code

**Closed vocabulary vs. open registry.** A value set may be a *closed enum* in the
contract **only if the engine semantically reasons about each member**. Otherwise it is
an *open registry* and belongs in data. Test: does the core branch on the value?

- The five tracking statuses are closed — the engine enforces forward-only transitions
  and normalises every provider onto exactly them (ADR 0015). "Never invent a sixth" is
  load-bearing.
- Transport modes are an open registry (`modes.csv`, ADR 0019) — the core never
  branches on a specific mode, so adding one is governed data, not a code or contract
  change. Display metadata travels with each mode so consumers can render values they
  have never seen.

If you find yourself writing `if value == "some_literal"` in the core for a set that
keeps growing, it should have been a registry.

## 5. Keep boundaries clear

Current intended boundaries:

- `spec/` defines the standard
- `packages/core` contains reusable domain logic
- `packages/adapters` translates provider-specific behavior
- `packages/worker` handles HTTP, validation, and persistence
- `spec/data/` holds reviewable domain data

Do not blur these layers without a clear reason.

## 6. Make important behavior easy to explain

A maintainer should be able to answer:

- why was this quote ranked first?
- why was this request accepted or rejected?
- why is this field present?
- where does this provider behavior come from?

The answer should come from:

- spec
- data
- config
- a clearly named module

It should not require digging through unrelated code.

## 7. Defaults should be simple

When the architecture is not settled yet:

- keep behavior minimal
- avoid premature heuristics
- avoid pretending a placeholder rule is a finished policy model

Simple and explicit is better than clever and hidden.

## 8. Tests should lock behavior, not guesses

Tests should confirm:

- contractual behavior
- invariants
- data validation
- lifecycle rules

Tests should not normalize weak design decisions into permanence by accident.

If a behavior feels hard to justify, it should not be locked in casually.

## 9. Docs must match reality

We keep separate documents for:

- vision
- current status
- next phase
- spec

Do not let these drift:

- if implementation changes behavior, update status/docs
- if the public contract changes, update spec and generated types
- if a rule is important enough to matter, document where it belongs

## 10. Add structure before complexity

Before adding smarter behavior, ask:

1. what layer should own this?
2. is it contract, data, config, adapter logic, or implementation glue?
3. how will contributors discover and change it?
4. how will we test it?

If those answers are unclear, stop and define the boundary first.
