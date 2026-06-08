# ADR 0007 — Clarify Phase 1 validation rules and reserved quote fields

**Status:** Accepted
**Date:** 2026-06-08

## Context

Phase 1 is now far enough along that contributors can compare three things directly:

- the canonical contract in `spec/openapi.yaml`
- the Cloudflare Worker reference implementation
- the repository status documentation

That comparison exposed a few places where the contract was still underspecified or misleading:

- examples still used short placeholder IDs that no longer match the Worker
- the tracking endpoint did not document the `400` returned for malformed tracking IDs
- the search response schema included a `query` field that the Worker does not return
- contact, package description, and opaque identifier validation rules were enforced in code but not stated in the contract
- `package_type` existed in the quote request shape, but its role in Phase 1 was easy to overread as active quote logic rather than a forward-compatible field

This is not a product redesign. It is a spec clarification so contributors do not mistake reserved fields for implemented logic, and do not mistake implementation validation for undocumented behavior.

## Decision

Clarify the Phase 1 contract to match the current reference behavior and current project status.

- Document `quote_id` and `tracking_id` as opaque identifiers with concrete format patterns.
- Document current validation constraints for contacts and package descriptions.
- Add the missing `400` response for malformed tracking IDs.
- Remove the undocumented `query` field from the `/v1/zones/search` success response schema.
- Keep `package_type` in `QuoteRequest`, but describe it as an optional field reserved for current or future ranking/filtering logic. Phase 1 implementations may ignore it.
- Update examples so they use current opaque ID shapes.

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
