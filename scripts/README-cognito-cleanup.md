# Cleaning up orphaned review Cognito user pools

`cleanup-cognito.ts` provides a **manual, dev-only, plan/apply** cleanup for MCR
CDK review pools retained after their CloudFormation stacks were destroyed.
It does not change CloudFormation policies, deploy stacks, or delete live stacks.
It is separate from branch-destruction workflows and is never run automatically.

Pool deletion removes the pool's users and authentication configuration. Treat
this as destructive, not as a reversible backup operation. Do not run it during
review-environment deployment, imports, or teardown: AWS offers no atomic
"delete only if still orphaned" operation. Pause those workflows for the cleanup
window, and do not allow manual Cognito/CloudFormation changes concurrently.

## Prerequisites

- Node.js and pnpm as configured by this repository.
- Standard AWS SDK credentials for the **dev** account (`AWS_PROFILE`, SSO, or
  environment credentials). Log in to the intended profile first.
- The actual 12-digit dev AWS account ID, independently checked in the console
  or deployment configuration. Passing an account ID does not discover which
  account is dev; the script verifies it against STS and every pool ARN.
- The region is locked to MCR's `us-east-1` dev region.
- Read permissions: `sts:GetCallerIdentity`, `cognito-idp:ListUserPools`,
  `cognito-idp:DescribeUserPool`, `cloudformation:ListStacks`,
  `cloudformation:ListStackResources`, `cloudformation:DescribeStacks`.
  The inventory includes **all** non-deleted stacks, including nested/unrelated
  stacks. Restricting visibility to just MCR stacks makes the ownership check
  unsafe; inventory access failures abort cleanup.
- Apply additionally needs `cognito-idp:DeleteUserPool` and
  `cognito-idp:DeleteUserPoolDomain`. Use a dedicated cleanup role, restricted
  to dev and review-pool resources/tags where IAM supports it. Do not grant
  `cognito-idp:UpdateUserPool`; this script never disables deletion protection.

No new CI permissions or roles are provisioned by this change.

## 1. Create a read-only plan

With repository dependencies installed, run from the repository root. `tsx`
executes the TypeScript directly; no JavaScript build is required. This tool's
supported entrypoint is `tsx`, not plain `node` against compiled output. Other
scripts' existing build workflows are unchanged:

```bash
export AWS_PROFILE=YOUR_DEV_PROFILE
export DEV_ACCOUNT_ID=YOUR_12_DIGIT_DEV_ACCOUNT_ID

pnpm --filter scripts exec tsx cleanup-cognito.ts \
  --plan /tmp/cognito-cleanup-plan.json \
  --dev-account-id "$DEV_ACCOUNT_ID"
```

This paginates all pools and CloudFormation resources, then describes each pool.
Expect several thousand read requests for an account with nearly 1,000 pools;
requests are sequential with AWS SDK adaptive throttling/retries. No user records
or credentials are fetched. Plans contain pool IDs, tags, configuration metadata,
estimated user counts, approved candidates, and reasons for skipping other pools.
Output files are created with owner-only permissions and never overwritten.
Keep them outside the repository; do not commit them.

A candidate must meet **all** of these rules:

- Exact CDK tags: `Project=Managed Care Review`, `ManagedBy=CDK`,
  `Service=cognito`, and `Environment=<review-stage>`.
- Exact pool name `<review-stage>-user-pool` and valid review stage name.
- Stage is not `dev`, `val`, `prod`, `qa`, `main`, `master`, `develop`, `impl`,
  or `production`. Persistent Serverless/imported pools are not candidates.
- No ownership by any live CloudFormation stack, and no live
  `cognito-<review-stage>-cdk` stack (even if it owns a different pool).
- If a CloudFormation source-stack tag exists, it must match this review stage,
  account, and region, and that stack must no longer be live.
- At least **7 days old** by default. `--min-age-days N` may lower this to a
  positive integer, no less than 1, if a reviewed backlog needs it.
- Deletion protection explicitly inactive; no custom domain. A remaining
  Cognito prefix domain must start with `<review-stage>-login-`.

`DELETE_FAILED`, `DELETE_IN_PROGRESS`, rollback, and creation stacks are **live**
for this check. Fix/complete their teardown separately; this script does not
force-delete pools out from under them. Deleted stacks are excluded, but their
resource history is not required (AWS keeps that history for only 90 days).

Pools missing those exact MCR tags or using legacy Serverless naming are skipped,
not guessed to be disposable. If much of the backlog falls in that category,
investigate provenance and design a separately reviewed legacy cleanup rather
than weakening these guards or retagging pools merely to force approval.

## 2. Review the plan

Inspect `candidates` and `skipped` in the JSON file. Check stage names, pool IDs,
source tags, creation dates, domains, and estimated user counts. Confirm these
are retired review environments, not pools used by external applications.
Tag/name evidence is not proof that no application still uses a pool.

You can **remove** entries from `candidates` to narrow the approved set. Do not
add entries or change candidate metadata. Apply re-describes every selected pool
and rejects changed configuration, tags, user count, or ownership. A plan expires
24 hours after inventory begins and must then be regenerated.

## 3. Apply a small batch

Pause deployments/imports/teardown for the cleanup window, then:

```bash
pnpm --filter scripts exec tsx cleanup-cognito.ts \
  --apply /tmp/cognito-cleanup-plan.json \
  --dev-account-id "$DEV_ACCOUNT_ID" \
  --confirm-delete "$DEV_ACCOUNT_ID" \
  --limit 10 \
  --audit-log /tmp/cognito-cleanup-batch-1.jsonl
```

Both account arguments must match the reviewed plan and the current STS caller.
Before the first deletion the script rebuilds a complete live-resource inventory.
Before each deletion it re-describes the pool and rechecks the stage/source stack.
Only IDs in the reviewed plan can be deleted. Unknown/access/throttling errors
are **not** treated as "not found."

At most `--limit` pool-deletion requests are issued (default 10, maximum 100).
Candidates are ordered oldest first. Missing or newly protected/changed pools
are logged and skipped without consuming the batch allowance.

If an approved prefix domain remains, the script deletes it first and waits up
to about a minute for it to disappear before requesting pool deletion. It never
disables deletion protection or deletes custom/unexpected domains.

The JSONL audit contains each attempted operation, skipped/absent pool, successful
API deletion request, and deletion failure. Domain request acceptance is logged
before polling, so a timeout still records the partial operation. A successful `pool-delete-requested`
means Cognito accepted the deletion; verify the resulting inventory/quota rather
than assuming immediate full backend removal. A failed operation stops the batch
with a nonzero exit code. If a domain was removed before pool deletion failed,
regenerate the plan before retrying; the reviewed pool snapshot may no longer match.

## 4. Verify and repeat

Generate a **new** read-only plan using a different filename after each batch.
Check the audit and remaining candidates, then increase to `--limit 100` only
when comfortable with the selection. Use a new audit filename for each batch.
Never run parallel batches. Continue until the reviewed backlog is cleared, then
resume deployments. The merged removal-policy change prevents future leaks for
review stacks that receive that new template before destruction; existing
orphaned pools still need this cleanup.

No AWS cleanup has been executed as part of authoring this script. The account's
actual tag distribution, backlog size, permissions, and quota release timing
must be verified by the operator using the read-only plan first.

## Offline tests

```bash
pnpm --filter scripts test:cognito-cleanup
pnpm --filter scripts exec tsx cleanup-cognito.ts --help
```

The test command type-checks with `tsc --noEmit`, then runs the TypeScript tests
with `tsx` without generating JavaScript.

One behavior-focused suite mocks the AWS clients' `send()` methods. It covers
planning, deletion safeguards, batch limits, domain ordering, and failures without
making AWS requests or deleting resources.

## AWS references

- [DeleteUserPool](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_DeleteUserPool.html)
- [DeleteUserPoolDomain](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_DeleteUserPoolDomain.html)
- [Deletion protection](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-deletion-protection.html)
- [ListStackResources and the 90-day history limit](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_ListStackResources.html)
