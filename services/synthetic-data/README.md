# Synthetic data service

`@mc-review/synthetic-data` creates deterministic, identifiable test data through the deployed MC Review API. It uses the same OAuth, GraphQL, document-upload, persistence, and submission paths as an external client.

The service is intended for review environments and, once separately enabled, QA. It must not run against development, validation, or production.

## Current environment support

| Environment                 | Status                                          | Notes                                                                                                                                                     |
| --------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review branches             | Supported                                       | Review deployment enables the API resources and exact-stage allowlist.                                                                                    |
| QA                          | Code supports it, but deployment is not enabled | The API/CDK safety checks permit `qa`, but the QA promotion workflow does not currently enable the resources and the manual review workflow rejects `qa`. |
| Local, main, dev, val, prod | Refused                                         | Both the API and CLI reject these stages.                                                                                                                 |

Merging this package makes the manual review workflow available from the default branch. It does **not** by itself make synthetic seeding available in QA. QA requires a separate infrastructure and workflow change; see [Enabling QA](#enabling-qa).

## Implemented commands

### `preflight`

Authenticates with the configured OAuth client and calls `fetchCurrentUser`.

```bash
pnpm --filter @mc-review/synthetic-data preflight
```

Success is logged as `synthetic.preflight.succeeded` with the actor ID and role.

### `seed-review`

Runs the `review-smoke-v1` scenario:

```bash
pnpm --filter @mc-review/synthetic-data cli seed-review \
  --seed my-review-smoke-01
```

The scenario:

1. Selects an active Minnesota contract program from the committed `@mc-review/submissions` state-program catalog.
2. Creates a contract-only health plan submission as a draft.
3. Requests an upload URL and uploads the small PDF fixture.
4. Updates the draft with complete contract form data.
5. Submits the contract.
6. Fetches the persisted contract.
7. Verifies the contract is Minnesota data, has `SUBMITTED` status, and contains the expected synthetic marker.

A successful run ends with `synthetic.review-smoke.completed` and logs the contract ID, status, seed, and marker.

The marker format is:

```text
[SYNTHETIC:review-smoke-v1:contract-only:<seed>]
```

The command does not deduplicate or delete contracts. Reusing a seed creates another contract with the same marker. Use a distinct seed when separate runs need to be distinguishable.

## How it works

```text
CLI
 ├─ OAuth token endpoint (client_credentials)
 ├─ External GraphQL endpoint
 │   ├─ create contract
 │   ├─ generate upload URL
 │   ├─ update draft
 │   ├─ submit contract
 │   └─ fetch and verify contract
 └─ Presigned S3 upload
```

### Review-environment infrastructure

When a review App API stack is deployed with synthetic data enabled, CDK creates:

- A generated Secrets Manager secret containing `clientId` and `clientSecret`.
- A bootstrap Lambda that upserts the dedicated state user and OAuth client.
- CloudFormation outputs for the API URL, bootstrap function name, and credentials secret name.

The bootstrap Lambda creates or updates:

- User: `synthetic-data-<stage>-state-user`
- Role: `STATE_USER`
- State: `MN`
- OAuth client: `synthetic-data-<stage>-state`
- Grant: `client_credentials`
- Scope: `SYNTHETIC_DATA_WRITE`

The bootstrap invocation is idempotent. Invoke it again whenever CloudFormation replaces the credentials secret.

### API authorization

`SYNTHETIC_DATA_WRITE` is not a general write scope. The App API accepts it only when all of these conditions hold:

- `SYNTHETIC_DATA_ENABLED` is exactly `true`.
- The runtime stage exactly matches `SYNTHETIC_DATA_ALLOWED_STAGE`.
- The stage is not forbidden.
- The request uses the `client_credentials` grant.
- The OAuth client is not delegated.
- The requested operation is explicitly allowlisted.

The current mutation allowlist is:

- `createContract`
- `generateUploadURL`
- `updateContractDraftRevision`
- `submitContract`

Adding a scenario does not automatically grant it access to more mutations.

## Running through GitHub Actions

After `.github/workflows/seed-synthetic-review.yml` exists on the default branch:

1. Open **Actions**.
2. Select **Seed Synthetic Review Data**.
3. Select the review branch to test.
4. Enter a seed containing only letters, numbers, `.`, `_`, or `-`.
5. Enter the confirmation `SEED_REVIEW`.
6. Run the workflow.

The workflow derives the normalized review stage from the branch, assumes the review CDK role, resolves stack outputs, invokes the bootstrap Lambda, loads and masks the OAuth credentials, then runs `seed-review`.

The workflow refuses official stages, including QA. It is currently a review-environment workflow.

## Running manually in a review environment

### 1. Resolve deployed resources

Open the `app-api-<stage>-cdk` CloudFormation stack and record these outputs:

- `ApiGatewayUrl`
- `SyntheticDataBootstrapFunctionName`
- `SyntheticDataCredentialsSecretName`

### 2. Bootstrap the actor

Invoke the bootstrap Lambda with:

```json
{
    "stage": "<stage>",
    "confirmation": "BOOTSTRAP_SYNTHETIC_DATA"
}
```

Expected shape:

```json
{
    "success": true,
    "stage": "<stage>",
    "userId": "synthetic-data-<stage>-state-user",
    "clientId": "synthetic-data-<stage>-state"
}
```

### 3. Configure the CLI

```bash
export SYNTHETIC_DATA_ENABLED=true
export SYNTHETIC_DATA_STAGE='<stage>'
export SYNTHETIC_DATA_API_URL='<ApiGatewayUrl>'
export SYNTHETIC_DATA_OAUTH_CLIENT_ID='<clientId>'
export SYNTHETIC_DATA_MAX_ATTEMPTS=4
export SYNTHETIC_DATA_RETRY_BASE_DELAY_MS=250
```

Avoid putting the client secret in shell history:

```bash
read -s SYNTHETIC_DATA_OAUTH_CLIENT_SECRET
export SYNTHETIC_DATA_OAUTH_CLIENT_SECRET
echo
```

Run the preflight before creating data:

```bash
pnpm --filter @mc-review/synthetic-data preflight
```

Then run a scenario:

```bash
pnpm --filter @mc-review/synthetic-data cli seed-review \
  --seed my-review-smoke-01
```

Remove the secret from the shell when finished:

```bash
unset SYNTHETIC_DATA_OAUTH_CLIENT_SECRET
```

Never commit credentials, put them in command arguments, paste them into tickets or chat, or include them in fixtures.

## Project structure

```text
services/synthetic-data/
├── src/
│   ├── builders/       Pure GraphQL input builders and marker construction
│   ├── client/         OAuth, GraphQL, HTTP retry, and upload clients
│   ├── config/         Environment and command-input validation
│   ├── execution/      Reusable retry behavior
│   ├── fixtures/       Document fixture registry and loading
│   ├── gen/            Generated GraphQL client types and documents
│   ├── graphql/        Source GraphQL operations
│   ├── planning/       Deterministic seeded-random utility
│   ├── scenarios/      End-to-end scenario orchestration and verification
│   ├── cli.ts          Command dispatch
│   └── logger.ts       Structured logging and secret redaction
└── tests/              Unit and scenario contract tests
```

Do not edit `src/gen/gqlClient.ts` manually.

## Building a scenario

A scenario should represent one observable business workflow, not a collection of unrelated records.

### 1. Define its contract

Choose:

- A stable, versioned scenario key such as `review-smoke-v1`.
- The actor and environment it requires.
- The records and documents it creates.
- The persisted invariants that prove success.
- A marker that makes generated data identifiable.

Prefer existing domain types and committed reference data. Do not hard-code identifiers that already have a canonical repository source.

### 2. Add GraphQL operations only when needed

Put scenario operations in `src/graphql/*.graphql`, then regenerate clients:

```bash
pnpm --filter app-graphql generate
```

Use the external GraphQL API. Do not write directly to PostgreSQL from a scenario.

### 3. Add pure builders

Put request construction and marker formatting in `src/builders/`. Builders should:

- Accept explicit inputs.
- Return generated GraphQL input types.
- Avoid network calls and mutable global state.
- Produce identifiable synthetic descriptions or markers.

### 4. Implement orchestration and verification

Put the workflow in `src/scenarios/`. A scenario should:

- Use the shared OAuth, GraphQL, and upload clients.
- Use canonical repository data where available.
- Log stable lifecycle events.
- Check intermediate invariants before continuing.
- Fetch the final record back from the API.
- Verify persisted state, not only the mutation response.
- Return a small result containing identifiers and final status.

If variability is needed, use `SeededRandom`; do not use `Math.random()`. The same seed should produce the same planned inputs.

### 5. Expose the command

Add strict argument validation in `src/config/`, then add the command to `src/cli.ts`. Invalid or missing arguments must fail before authentication or mutation.

### 6. Review authorization

If the scenario needs an operation outside the current synthetic allowlist, update authorization deliberately and add resolver tests for:

- Allowed exact-stage synthetic access.
- Disabled synthetic access.
- Stage mismatch.
- Forbidden official stages.
- OAuth clients lacking the synthetic scope.
- Operations that remain denied.

Do not replace the narrow allowlist with general OAuth write access.

### 7. Add tests

At minimum, cover:

- Builder output and marker stability.
- Scenario operation order.
- Upload metadata.
- Final persisted-state verification.
- Failure when the final marker or status is wrong.
- Input and environment safety boundaries.
- Structured errors without credential leakage.

### 8. Run package checks

```bash
pnpm --filter @mc-review/synthetic-data check:runtime
pnpm --filter @mc-review/synthetic-data build
pnpm --filter @mc-review/synthetic-data lint
pnpm --filter @mc-review/synthetic-data test:once
```

`check:runtime` executes the actual `tsx` CLI entrypoint. Keep it: transformed unit tests and TypeScript alone do not prove that workspace package imports load correctly under Node ESM.

## Logging

Logs are newline-delimited JSON with a timestamp, level, event name, operation, and relevant identifiers. Use stable event names such as:

```text
synthetic.<scenario>.<lifecycle-step>
```

`GraphQLRequestError` logs include the HTTP status and GraphQL `errors` array. The logger recursively redacts fields whose names contain:

- `authorization`
- `clientSecret`
- `accessToken`
- `presigned`
- `uploadURL`

Do not rely on redaction as permission to log credentials. Do not pass secrets to the logger.

## Enabling QA

The code-level safety model permits QA, but QA is not operationally enabled today. Enabling it requires a separately reviewed change that:

1. Sets `SYNTHETIC_DATA_ENABLED=true` and `SYNTHETIC_DATA_ALLOWED_STAGE=qa` for the QA App API CDK deployment.
2. Deploys the synthetic credentials secret and bootstrap Lambda in the QA account.
3. Adds a QA-specific manual workflow path using the QA GitHub environment and QA AWS role.
4. Uses a distinct, explicit QA confirmation value.
5. Defines whether QA operations append, verify, or destructively reset data.
6. Adds concurrency controls so two QA seed/reset operations cannot overlap.
7. Verifies that dev, val, and prod remain denied.

Do not reuse the current review workflow unchanged for QA: it intentionally assumes review-stage naming and the development AWS environment.
