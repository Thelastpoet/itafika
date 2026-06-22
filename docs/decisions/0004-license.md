# ADR 0004: Use the MIT License

**Status:** Accepted
**Date:** 2026-06-08

## Context

We want Itafika to be widely adopted by everyone, from individual developers to large companies. The license should be simple and allow for commercial use.

## Decision

The project uses the **MIT License**.

## Rationale

- **Maximally adoptable.** MIT is short, permissive, and widely understood. It lets anyone use Itafika in anything, including closed and commercial products, which is exactly what an infrastructure standard wants.
- **The code is meant to be copied.** Consistent with the project's thesis: the durable asset is not the source code but the open, community-maintained representation of how Kenyan delivery works. A permissive license maximises reach of the standard.
- **Low legal overhead** for the kinds of contributors we most want: domain experts and individual developers.

## Options considered

- **Apache-2.0**: also permissive, with an explicit patent grant and more corporate-friendly legal robustness. A reasonable alternative; rejected in favour of MIT's brevity and ubiquity. If patent concerns become material, a future ADR may revisit this.
- **Copyleft (GPL/AGPL)**: rejected. It would discourage the commercial and proprietary adoption that drives a standard's reach.

## Consequences

- All contributions are accepted under MIT; the PR checklist in [CONTRIBUTING.md](../../CONTRIBUTING.md) makes contributors aware of this.
- Commercial entities can build hosted Itafika services. That is intended; the moat is data freshness and community, not license restriction.
