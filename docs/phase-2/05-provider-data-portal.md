# 05 - Provider Data Portal

Purpose: let invited providers submit their own supply data through moderation.

## Files

- `packages/worker/migrations/0012_provider_accounts.sql`
- `packages/worker/src/provider-auth.ts`
- `packages/worker/src/index.ts`
- `packages/worker/src/moderation.ts`
- `packages/worker/src/policy.ts`
- `packages/worker/scripts/create-provider-token.mjs`
- `packages/worker/tests/provider.spec.ts`
- `apps/portal/src/routes/ProviderDashboard.tsx`
- `apps/portal/src/routes/ProviderRateSubmission.tsx`
- `apps/portal/src/api.ts`

## Migration

Create `packages/worker/migrations/0012_provider_accounts.sql`:

```sql
CREATE TABLE provider_accounts (
  id            TEXT PRIMARY KEY,
  provider_id   TEXT NOT NULL REFERENCES providers(id),
  display_name  TEXT NOT NULL,
  token_hash    TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  created_at    TEXT NOT NULL,
  disabled_at   TEXT
);

CREATE INDEX idx_provider_accounts_provider
  ON provider_accounts (provider_id, status);
```

## ID Policy

In `packages/worker/src/policy.ts`:

- [ ] Add `createProviderAccountId()` returning `pa_<24 hex>`.
- [ ] Add `PROVIDER_ACCOUNT_ID_RE = /^pa_[a-f0-9]{24}$/`.

## Provider Token Script

Add `packages/worker/scripts/create-provider-token.mjs`.

Inputs:

- [ ] `--provider-id`
- [ ] `--display-name`
- [ ] optional `--account-id`

Behavior:

- [ ] Generate at least 32 random bytes.
- [ ] Print plaintext token once to stdout.
- [ ] Store only SHA-256 lowercase hex hash.
- [ ] Refuse unknown `provider_id`.
- [ ] Do not write plaintext token to disk.

## Auth Helper

Add `packages/worker/src/provider-auth.ts`.

Behavior:

- [ ] Read `Authorization: Bearer <token>`.
- [ ] SHA-256 hash token.
- [ ] Look up active `provider_accounts.token_hash`.
- [ ] Return account id, provider id, display name.
- [ ] Missing, invalid, or disabled account returns `null`.
- [ ] Never log token or hash.

## Routes

Add provider-only routes:

- [ ] `GET /v1/provider/me`
- [ ] `POST /v1/provider/submissions`

### `GET /v1/provider/me`

Response:

```json
{
  "account": {
    "id": "pa_0123456789abcdef01234567",
    "provider_id": "mololine",
    "display_name": "Mololine Nakuru desk",
    "status": "active"
  }
}
```

### `POST /v1/provider/submissions`

Rules:

- [ ] Uses same payload contract as `POST /v1/submissions`.
- [ ] Server sets `submitted_by` from provider account display name.
- [ ] `rates.provider_id` must equal account `provider_id`.
- [ ] `providers.id` must equal account `provider_id`.
- [ ] Provider cannot submit data for another provider.
- [ ] Provider cannot approve moderation submissions.

## Error Contract

| Situation | HTTP status | `error.code` |
| --- | --- | --- |
| Missing/invalid provider token | `401` | `unauthorized` |
| Disabled provider account | `401` | `unauthorized` |
| Provider submits another provider's data | `403` | `forbidden` |
| Payload validation failure | `400` | `invalid_request` |

## Portal Work

- [ ] `ProviderDashboard.tsx` shows provider account name and links.
- [ ] `ProviderRateSubmission.tsx` only submits rates for authenticated provider.
- [ ] Provider token stored in memory only.
- [ ] No local storage for provider token.

## Tests

- [ ] provider token hash authenticates.
- [ ] disabled provider account fails.
- [ ] provider can submit own rate.
- [ ] provider cannot submit another provider's rate.
- [ ] provider cannot approve/reject moderation submissions.

## Exit Criteria

- [ ] Provider account migration applies.
- [ ] Provider can authenticate with invite token.
- [ ] Provider can create a pending own-rate submission.
- [ ] Provider data still requires moderator approval.
