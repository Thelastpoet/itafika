# Engineering Principles

This document explains the rules we follow when building Itafika. Our goal is to keep the project easy to understand, easy to contribute to, and trustworthy for everyone using it.

## 1. The Spec is the Truth

The "Spec" (in the `spec/` folder) defines how Itafika works for the outside world.

- Put rules in `spec/` if they affect the API or if other developers need to follow them.
- If a change affects how a shop interacts with Itafika, it must be in the spec.
- Don't put "how-to-code-it" details in the spec—only "what-it-does" rules.

## 2. No Hidden Rules in the Code

Rules that change how the product works should never be buried deep in the code.

- **Bad:** Hardcoding a list of favorite couriers inside a TypeScript file.
- **Good:** Putting courier preferences in a config file or the database.

If a rule affects the price, the route, provider selection, handoff state, or tracking state, it must be visible in the `spec/`, `spec/data/`, or an ADR.

## 3. Keep "What" and "How" Separate

We keep different parts of the logic separate so the code stays clean:

- **Calculation:** How we figure out the cost.
- **Ranking:** How we decide which option to show first.
- **Lifecycle:** How a delivery moves from provider handoff to "delivered."

If you are changing how we calculate prices, you shouldn't have to touch the code that handles tracking updates.

## 4. Use Data, Not Hardcoding

It's easier for everyone to review reference data than to read complex code.

- **Prefer:** Putting names, prices, and modes in reference data tables, seed files, or generated public snapshots.
- **Avoid:** Using "magic numbers" or fixed text strings inside the code.

**The "Can I change it in a CSV?" Test:**
If a value changes often (like a new town or a new price), it belongs in reference data (a "registry"). If changing it would break the core logic of the system (like changing the "Delivered" status), it stays in the code (a "contract").

## 5. Keep Clear Boundaries

Don't mix up the layers:

- `spec/`: The public API, adapter contract, and reference-data schema.
- `packages/core`: The logic shared by everything.
- `packages/adapters`: How we talk to different providers.
- `packages/worker`: The "engine" that runs the API and saves to the database.

## 6. Make Decisions Easy to Explain

A developer should be able to answer "Why did the API do that?" without reading 1,000 lines of code. The answer should be found easily in the spec, the data files, or a clearly named piece of code.

## 7. Keep It Simple First

If we haven't fully decided how a feature should work yet, keep the code minimal. It's better to have a simple rule that works than a "clever" one that is hard to fix later.

## 8. Tests Must Be Meaningful

Tests should confirm that our rules are being followed. They shouldn't just exist to "cover the code." If a test is hard to write, it's usually a sign that the code is too complicated.

## 9. Docs Must Match Reality

If you change how the code works, you **must** update the documentation.
- If the API changes, update the spec.
- If the status changes, update `status.md`.
- If you add a new step for contributors, update `CONTRIBUTING.md`.

## 10. Fix the Structure Before Adding Complexity

Before you add a "smart" new feature, ask:
1. Which folder should own this?
2. Is this a rule (spec), a piece of information (data), or just code?
3. How will the next person find and change it?

If you can't answer these, stop and simplify the design first.
