# Review-only submission events POC (SNS/SQS)

## What this demonstrates

One versioned reference event per state-initiated submission occurrence, saved in
Postgres **in the same transaction** as the authoritative submission. A separate
Lambda publishes the outbox to one standard SNS topic and one standard SQS queue.
A best-effort post-commit invocation provides prompt delivery; an every-minute
EventBridge sweep recovers missed invocations and retries pending rows.

- `contract.submitted`: initial contract submission and its associated rates.
- `contract.resubmitted`: contract resubmission and its associated rates.
- `rate.resubmitted`: independent state rate resubmission, when the existing
  `rate-edit-unlock` flag allows it, with associated contract revision references.
  A rate's initial submission happens with a contract, not independently.
- No notifications for unlocks, withdrawals, approvals, overrides, or CMS/admin
  composed submission operations. No backfill of existing submissions.
- No public GraphQL API/schema or authentication changes, full-payload events,
  consumer Lambda, .NET application, Salesforce connector, or external account trust.

The destination queue's `-arms` name is a demonstration label, not an ARMS
integration. A future independent SDP subscriber would require its own queue.

## Enable only after reviewing the branch

Off by default. API capture requires both a review `stage` and
`SUBMISSION_EVENTS_POC_ENABLED=true`; shared environments and main/master are
blocked. CDK refuses an enabled POC in those environments. Only the review API
receives the capture flag and publisher function name.

For the existing **review deployment workflow**, explicitly set the GitHub
Actions variable `SUBMISSION_EVENTS_POC_STAGE` to the sanitized review stage you
intend to deploy. For branch `mt-poc-sqs`, that is **`mtpocsqs`** (see
`scripts/stage_name_for_branch.sh`). Unset the variable afterward if appropriate;
no variable or a nonmatching stage leaves the POC disabled. This change does not
modify the shared-environment promotion workflow. Do not set the variable or
push/deploy until ready to review the actual changes and deployment plan.

For a manually managed review deployment, pass
`SUBMISSION_EVENTS_POC_ENABLED=true` to the existing AppApi CDK invocation and
use `--app 'pnpm tsx bin/app-api.ts' --context stage=mtpocsqs`. Existing credentials,
configuration, layer stacks, and review database prerequisites still apply.

The additive migration is checked in at
`services/app-api/prisma/migrations/20261005140327_submission_events_poc_outbox/`.
It was generated from the before/after schemas **without applying it to a local
database**. The existing migration Trigger runs before the API, publisher, and
recovery rule become active. Do not run development migrations against shared
or production databases.

The publisher uses the existing private API subnets, database security groups,
and Secrets Manager configuration. Verify HTTPS egress to SNS; the API also needs
HTTPS access to Lambda for prompt wakeups. Missing wakeups are recoverable, but
missing SNS/database connectivity prevents eventual delivery until fixed.
The publisher has a dedicated role with database-secret read permission,
publication to its one encrypted topic (including its KMS key), and Lambda
logging/VPC permissions. SNS publishing and SQS access require TLS. The topic's
TLS deny uses the explicit `sns:Publish` action because SNS rejects `sns:*` in
this resource policy. Queue send grants are restricted to the topic's ARN.
No consumer credentials or identities are created.

## Envelope v1

The runtime validator and TypeScript contract are
`services/app-api/src/submissionEvents/event.ts`. Example contract event:

```json
{
    "envelopeVersion": 1,
    "eventId": "11111111-1111-4111-8111-111111111111",
    "source": "stateportal",
    "stage": "mtpocsqs",
    "eventType": "contract.submitted",
    "occurredAt": "2026-10-01T12:00:00.000Z",
    "submissionId": "22222222-2222-4222-8222-222222222222",
    "contractId": "33333333-3333-4333-8333-333333333333",
    "contractRevisionId": "44444444-4444-4444-8444-444444444444",
    "rates": [
        {
            "rateId": "55555555-5555-4555-8555-555555555555",
            "rateRevisionId": "66666666-6666-4666-8666-666666666666",
            "submittedInThisEvent": true
        }
    ]
}
```

`submittedInThisEvent=false` means an existing linked rate was referenced, not
newly submitted. Rate-only events instead have `rateId`, `rateRevisionId`, and
`contracts: [{contractId, contractRevisionId}]`. These contracts are references,
**not new contract submissions**. `submissionId` references the persisted
submission update-info record; it is not a new API lookup parameter.
No user details, reasons, form data, document URLs, or credentials are included.
Retries retain the same `eventId`; a later resubmission has a new ID. Consumers
must persistently deduplicate by `eventId`, reject unsupported versions, and not
assume order or exactly-once processing.

## Console/CLI demonstration

Use the normal temporary AWS credentials/profile, including a session token when
applicable. AWS SNS/SQS authentication is IAM/SigV4, **not Stateportal OAuth**.
The operator needs access to stack outputs and the demonstration queue. A
queue-scoped consumer policy is supplied as `SubmissionEventsConsumerPolicy` but
is not attached to any identity automatically. It permits receive, acknowledge,
visibility changes and queue metadata reads, not publishing.

```bash
export AWS_PROFILE=<temporary-credentials-profile>
export AWS_REGION=<review-region>
STAGE=mtpocsqs
STACK="app-api-${STAGE}-cdk"
QUEUE_URL=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='SubmissionEventsQueueUrl'].OutputValue | [0]" \
  --output text)
```

1. In the review UI, submit a new contract with a rate as a state user. Record the
   contract ID. The API's successful submission commits the event even if the
   publisher is temporarily unavailable. Expect delivery promptly, or after the
   recovery sweep/backoff when a wakeup was missed.
2. Inspect **SNS → topic subscriptions** and **SQS → Send and receive messages**,
   or receive one message locally. SNS raw delivery means `Body` is the event JSON:

```bash
MESSAGE_FILE=$(mktemp)
aws sqs receive-message --queue-url "$QUEUE_URL" \
  --max-number-of-messages 1 --wait-time-seconds 20 \
  --message-attribute-names All --attribute-names ApproximateReceiveCount \
  > "$MESSAGE_FILE"
jq '.Messages[]? | {messageId: .MessageId, event: (.Body | fromjson)}' "$MESSAGE_FILE"
```

An empty response is not a failure; try again after the sweep. These commands do
not overwrite the repository's existing `output.json`.

3. Compare the contract/revision and rate/revision references with the existing
   authenticated GraphQL API. Use an already-authorized OAuth access token and
   the review GraphQL URL; add normal form-data fields if needed:

```graphql
query EventReferences($input: FetchContractInput!) {
    fetchContract(input: $input) {
        contract {
            id
            packageSubmissions {
                contractRevision {
                    id
                }
                rateRevisions {
                    id
                    rateID
                }
            }
        }
    }
}
```

Variables: `{"input":{"contractID":"<event contractId>"}}`.
For rate-only events, existing `fetchRate(input: {rateID: ...})` supplies rate
history and package references. Queue permissions do **not** confer API access.
Existing read scopes/state restrictions still apply. Existing readers apply
overrides: these references do **not** promise an immutable original payload or
an override-specific historical API. A separate API design discussion is needed
if an integration requires that guarantee.

4. Demonstrate duplicate delivery: **do not acknowledge**, or make the received
   message immediately visible again. A later receive can return the same
   `eventId` (standard queues do not guarantee which available message comes next):

```bash
RECEIPT=$(jq -r '.Messages[0].ReceiptHandle // empty' "$MESSAGE_FILE")
# Run only if RECEIPT is nonempty. Receiving five times without deleting can move it to the DLQ.
aws sqs change-message-visibility --queue-url "$QUEUE_URL" \
  --receipt-handle "$RECEIPT" --visibility-timeout 0
```

5. After inspecting/processing a message, acknowledge using its **latest** receipt
   handle (a new receive produces a new one):

```bash
aws sqs delete-message --queue-url "$QUEUE_URL" --receipt-handle "$RECEIPT"
rm "$MESSAGE_FILE"
```

6. Unlock the contract through the existing workflow, then resubmit as the state
   user. Unlock itself produces no notification. Expect `contract.resubmitted`
   with the same contract ID and new event/submission/revision IDs. If testing
   independent rate edits, expect `rate.resubmitted`, not a contract event.

## Durability and failure evidence

`SubmissionEventOutbox` stores event JSON, attempts, retry time, lease ownership,
SNS message ID and `publishedAt`. Pending rows are stage-scoped. Atomic conditional
leases prevent competing workers claiming the same row; expired leases recover
interrupted invocations. Backoff starts at 30 seconds and caps at one hour; no
terminal outbox discard. The publisher reserves one concurrent execution, handles
up to 20 rows per sweep, and stops claiming when time is short.

- Outbox insertion failure rolls back the submission transaction.
- Publish failure leaves the row pending for recovery; it does not fail an
  already-committed API submission.
- Publish success followed by failure to record it can deliver a duplicate with
  the **same eventId**. SNS acceptance is not consumer/business completion.
- SNS failed deliveries and exhausted SQS receives use the demonstration DLQ.
  Failures _before SNS accepts publication_ remain in the outbox, not the DLQ.

For review-environment diagnosis, inspect publisher CloudWatch logs and these
read-only columns in the review database (replace the stage if needed):

```sql
SELECT "id", "submissionID", "createdAt", "publishedAt", "attempts",
       "nextAttemptAt", "leaseUntil", "snsMessageID", "lastError"
FROM "SubmissionEventOutbox"
WHERE "stage" = 'mtpocsqs'
ORDER BY "createdAt" DESC
LIMIT 20;
```

### Local checks

From the repository root (no AWS calls/deploy required):

```bash
pnpm --filter app-api generate
pnpm --filter app-api build
pnpm --filter app-api exec vitest run src/submissionEvents
pnpm --filter mcr-infra-cdk exec tsc --noEmit
pnpm --filter mcr-infra-cdk exec jest --runInBand test/submission-events*.test.ts
```

For the real transaction/rollback tests, first select a **disposable seeded test
database** using the repository's normal local test setup. Do not reset an
existing developer database. If it already exists and only needs migrations:

```bash
# DATABASE_URL must point at that disposable test database, not AWS_SM.
pnpm --filter app-api exec prisma migrate deploy --config ../../prisma.config.ts
pnpm --filter app-api exec vitest run src/postgres/contractAndRates/submitContractEvents.test.ts
```

The integration tests cover contract + rate rollback on outbox failure,
initial/resubmission references, stable repeated-capture identity, independent
rate resubmission and disabled capture. Unit tests cover validation, retry,
claim conflicts, publication/recording failure, stable duplicate identity, and
best-effort wakeup. CDK assertions cover review gating, encrypted transport,
raw messages, queue/DLQ retention, scoped queue/publisher policies, disabled stack
isolation and migration ordering without dependency cycles.

## Limits and teardown

SQS retains unacknowledged messages for **at most 14 days**. Acknowledgment removes
a message; SQS is not a Kafka-style replay log. Standard delivery is at-least-once
and unordered. The retained outbox is useful failure evidence, but this POC has
no replay, reconciliation, monitoring/alerting, consumer completion tracking,
cleanup job, throughput sizing, or production integration contract.

The topic and queues are explicitly disposable review resources; destroying the
review stack or redeploying with the opt-in disabled removes them and queued
messages. Drain/capture evidence first. The review KMS key is scheduled for
deletion after seven days. Outbox rows follow the existing review database
lifecycle. A stable event-ID deduplication store, operational ownership, outage
recovery and payload/override semantics remain production design decisions.
