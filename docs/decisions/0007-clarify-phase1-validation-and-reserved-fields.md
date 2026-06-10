# ADR 0007 — Simplify validation and quote fields

**Status:** Accepted
**Date:** 2026-06-08

## Context

As we built Phase 1, we found some parts of the API spec that were unclear or didn't match the actual code. For example, some examples used old ID formats, and some validation rules were in the code but not the spec.

## Decision

We will update the API spec to match how the code actually works. This includes:

- Clearly documenting ID formats (like `quote_id`).
- Adding missing error codes (like `400` for bad tracking IDs).
- Removing unused fields from the spec (like the `query` field in zone search).
- Clarifying that some fields (like `package_type`) are reserved for future use.
- Updating all examples to use current ID formats.

## Rationale

- **Contributor clarity.** The contract should not force people to infer behavior by reading Worker code.
- **Spec honesty.** If a field is reserved for compatibility but not used yet, say so plainly.
- **Low-risk correction.** These changes clarify behavior that already exists or remove accidental mismatches in prose/examples. They do not change the main Phase 1 resource model.
- **Open-source usability.** Non-code contributors and early implementers need simple, accurate docs more than ambitious wording.

## Options considered

- **Leave the spec loose and explain the differences elsewhere.** Rejected — that keeps the canonical contract less trustworthy than the status doc and the code.
- **Remove `package_type` entirely from Phase 1.** Rejected — the field is still useful as a forward-compatible part of the quote request shape, and removing it would be an unnecessary contract change.
- **Change the Worker to match every stale spec example.** Rejected — the Worker behavior is already more defensible in areas like ID entropy and request validation.

## Consequences

- Generated types need to be refreshed after the OpenAPI changes.
- Contributors can now treat the spec as a more reliable description of the current Phase 1 API behavior.
- Future implementations remain free to start using `package_type` in quote ranking or filtering without changing the request shape.
