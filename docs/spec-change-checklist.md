# Spec Change Checklist

Use this checklist whenever you change the API or the core data rules. 

This applies to anyone editing:
- `spec/openapi.yaml` (The API structure)
- `spec/adapter-contract.md` (Rules for delivery companies)
- `spec/data/SCHEMA.md` (Rules for our data files)
- Any other rule that affects how shops or delivery companies interact with Itafika.

## Before You Start Your Pull Request
- [ ] Is this change really a "Rule"? If it's just a small code detail, it doesn't belong in the spec.
- [ ] Can you explain the problem you are solving in plain English?
- [ ] Is this change **Additive** (adds something new), a **Clarification** (makes a rule clearer), or **Breaking** (changes an existing rule in a way that might break shops)?

## While Working on the PR
- [ ] Update the correct file in the `spec/` folder.
- [ ] If the change is a major decision, add a new file to `docs/decisions/`.
- [ ] If you changed `spec/openapi.yaml`, run the command to update the TypeScript types.
- [ ] Update any code that needs to follow the new spec.
- [ ] Update the tests to match the new behavior.
- [ ] Update the documentation (like the Integration Guide) if the change affects how developers use the API.

## Before You Merge
- [ ] Run these commands to make sure everything still works:
  ```bash
  pnpm test
  pnpm typecheck
  ```
- [ ] Do the examples and documentation still match the new rules?
- [ ] Does `docs/status.md` need to be updated?

## If the Change is "Breaking"
- [ ] Can you find a way to make it "Additive" instead? (Avoid breaking things if possible).
- [ ] Did you write down exactly how developers should update their code?
- [ ] Did you get approval from the project maintainers?

### The Rule of Thumb
If a shop developer would need to know about this change to build their app, put it in the `spec/`. 

If it's just a detail about how the code is written, keep it out of the spec.
