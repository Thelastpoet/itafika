# Release Checklist

Use this checklist before you finish a major update, tag a version, or merge a branch into the main project.

Our goal is to make sure the repository always tells the truth about what it can do.

## 1. Check the Documentation
- [ ] Does `README.md` still match how the project is organized?
- [ ] Does `docs/status.md` correctly show what is finished and what is still being worked on?
- [ ] Does `docs/next-phase.md` still reflect the most important next steps?

## 2. Check the API Contract
- [ ] If you changed `spec/openapi.yaml`, did you run the command to regenerate the types?
- [ ] If you changed the core rules in `spec/`, is there a matching decision file (ADR) in `docs/decisions/`?
- [ ] Do the examples still work with the new rules?

## 3. Check the Data
- [ ] Run `pnpm data:validate`. Did it pass?
- [ ] If you changed seed/snapshot files in `spec/data/`, did you include where the data came from (source)?
- [ ] Did you update the "freshness" date for any towns you changed?

## 4. Check the Code
- [ ] Run `pnpm test`. Do all tests pass?
- [ ] Run `pnpm typecheck`. Are there any TypeScript errors?
- [ ] Does the project still build correctly in CI (GitHub Actions)?

## 5. Check the Deployment
- [ ] If the Worker setup changed, did you update `docs/deploy-worker.md`?
- [ ] If there are new database tables or seed data, are they clearly documented?
- [ ] If there are any known bugs in the deployment, did you list them in your pull request?

## 6. Check for Contributors
- [ ] If a feature moved from "Planned" to "Finished," did you update the status?
- [ ] If you added a new coding rule, did you add it to `docs/engineering-principles.md`?

### The Rule of Thumb
If a new developer pulls this code and is surprised by how something works, the release isn't ready yet.
