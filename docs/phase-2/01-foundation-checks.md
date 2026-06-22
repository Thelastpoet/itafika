# 01 - Foundation Checks

Purpose: make the existing worker and tests green before Phase 2 feature work.

## Files

- `packages/worker/wrangler.jsonc`
- `packages/worker/worker-configuration.d.ts`
- `packages/worker/tests/moderation.spec.ts`

## Required Work

- [x] In `packages/worker/wrangler.jsonc`, add:

```jsonc
"secrets": {
  "required": ["MODERATOR_TOKENS"]
}
```

- [x] Regenerate Worker types:

```bash
pnpm --filter @itafika/worker exec wrangler types
```

- [x] In `packages/worker/tests/moderation.spec.ts`, ensure the test named `applies a new rate and records a change_log row with no prior snapshot` uses a fixture route that does not already exist in seed data.
- [x] Keep the fixture provider as `mololine`.
- [x] Use a dedicated destination zone such as `ZONE_MOD_NEW`.
- [x] Insert the dedicated zone in the test `beforeAll`.
- [x] Assert the `change_log.row_key` matches the dedicated test route.

## Acceptance Criteria

- [x] `pnpm data:validate` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.

## Notes

Do not start Track 02 until this track is complete.
