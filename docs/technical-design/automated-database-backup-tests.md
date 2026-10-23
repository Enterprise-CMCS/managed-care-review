# Automated native Aurora backup tests

Forked from Brady's [PR #4715](https://github.com/Enterprise-CMCS/managed-care-review/pull/4715).
The original PR is left intact. This implementation keeps native Aurora PITR.

This branch includes a small opt-in review-CI path to prove the implementation
before merging. After live dev testing is satisfactory, remove the review-only
job/input and review provisioning path for the final strictly production-only
version. Do not merge the temporary dev testing path as an implicit new schedule.

## What runs

- On the first of each month, `test-database-backups.yml` runs on **main/prod only**.
  It restores a fixed, fresh native PITR point into a new private Serverless v2
  cluster/instance, queries the copy, and deletes the exact resources it created.
- SQL validation runs in a separate VPC Lambda: an explicit READ ONLY transaction,
  populated State table, at least one successful Prisma migration, no unresolved
  unfinished migration attempt, and readable ContractTable. Explicitly rolled-back
  attempts are legitimate history; an empty ContractTable is legitimate.
- There is no monthly row-count baseline, full-table scan, or migration-name
  comparison with the repository. The result proves these smoke checks, not every
  business invariant or full application recovery.
- Only after validation AND cleanup succeed is a production last-success record
  written to `/mcr/prod/backup-restore-test/last-success`. Review tests do not write
  persistent success parameters. Normal stack redeployments cannot reset it.
- A **separate daily workflow**, `check-database-backups.yml`, checks source
  retention/freshness, the last successful monthly test, and stranded owned test
  clusters. Its OIDC session policy permits reads only, not deletion or heartbeat
  updates. It alerts; it never sweeps/deletes old clusters automatically.
- Existing GitHub `SLACK_WEBHOOK` notifications report successful monthly tests and
  failures/cancellation of either workflow. Missing monthly runs are detected by
  the daily last-success check. Both workflows still depend on GitHub Actions:
  a repository-wide Actions shutdown or outage requires organizational/external
  CI monitoring. Success Slack messages alone are not an independent heartbeat.

## Production safety boundaries

The script never assumes the broad deployment role and has no local credential
fallback. GitHub's prod environment is required for the production role. All
scheduled jobs and production manual dispatches are restricted to main. The current
GitHub prod environment permits main and has no manual-review gate (verified during
implementation); preserve that configuration or automated jobs may wait/not run.

A dedicated role can restore only the fixed source into its test namespace.
Source modification, deletion of snapshots/automated backups, key disable/deletion,
and cluster/instance deletion outside the test namespace are explicitly denied.
Cleanup also requires purpose/owner tags at IAM level and the exact random run tag,
source tag, account/ARN and cluster membership in code. There is **no global delete
sweep** and no `ModifyDBCluster` operation in the runner.

The SQL Lambda alone reads the existing DB secret. The runner cannot read secrets.
Its secret/database/prefix/account are fixed at deployment, not supplied by callers.
The Lambda's Postgres egress reaches only the dedicated restored-copy security
group, never the source DB group. It also rejects the source host. HTTPS access
is allowed for the existing Secrets Manager endpoint and RDS CA download.

Production uses the existing source admin secret, but only against the isolated
copy in a read-only transaction; this is not a claim that the SQL principal itself
is SELECT-only. Review tests use their existing review logical-DB secret. If a
password rotated during backup/restore, the validator tries current then previous
secret versions, always against the same restored endpoint. It never changes a
source password or creates a source SQL role.

## Running a safe review test through existing CI

Normal branch deployment creates the small test role/validator alongside its
Postgres stack, but **does not restore a database**. Explicitly dispatch the existing
review workflow on the new branch after an authorized push:

```sh
gh workflow run deploy-cdk.yml --ref feat/verify-native-aurora-backups \
  -f test_native_backups=true
```

This redeploys/migrates the review app, then runs the same native restore code with
its review-owned role in the dev account. It restores the **shared dev physical
cluster** but validates only `reviewapp_<stage>` on the copy. It waits up to 10
minutes for PITR to include the new review deployment/login. It never uses the dev
admin secret or modifies the shared source. Nothing needs to be enrolled in a vault.
The new production-only workflows cannot be dispatched until available on main;
the existing review workflow is used deliberately so no merge is needed to test.

Before merge, require real evidence for both a successful test and a controlled
validation failure that still removes the instance and cluster. Never delete source
records or change source credentials to create a failure. Use a test-only validator
failure in the isolated review test. Check source ARN/endpoint, source instances,
retention and pending changes remain unchanged. Local mocks/synthesis are not that
live proof. Inspect the CDK diff before deployment; no source RDS property changes
are expected from this feature.

## Activation, thresholds, and operations

Production's normal Postgres promotion provisions the role, validator and network
rules. No new secrets/vault configuration is needed; source KMS permissions and the
external CMS IAM boundary/SCPs must still permit the narrowly scoped operations.
After deployment on main, run one manual `Test production database backups` workflow
before treating the daily watchdog as healthy. Missing last-success state correctly
fails the watchdog until a complete production test has succeeded.

Initial operational guards are shared constants in `scripts/backup-restore-config.ts`:
source recovery point no more than **60 minutes** old, source retention at least its
configured value, successful monthly test no more than **35 days** old, and owned
copy no more than **6 hours** old. These are explicit starting guards, not an agreed
application RPO/RTO. Review them with the team before rollout. The daily check can
detect a violation only when it runs; it is not continuous freshness monitoring.

The runner permits 150 minutes of main work and reserves up to 60 minutes for
cleanup within a 240-minute job. AWS SDK clients renew the dedicated OIDC credentials
before expiration. Cancellation requests trigger cleanup where possible, but a
forced runner kill, revoked permissions or exhausted cleanup budget can still leave
resources. The job fails rather than claiming success; the daily check alerts on
owned production copies older than the guard. Avoid cancelling/pushing over an
active review test; existing review CI cancellation behavior is unchanged.

Each job summary identifies its exact cluster and run-ownership tag. For manual
remediation, an authorized operator must verify those tags, account, ARN, and writer
membership before deleting that **test copy only**. Never remove by prefix alone,
change source deletion protection, or delete production snapshots. Re-running a test
will not delete another run's copy. Review copies are not covered by the prod daily
watchdog: confirm their cleanup directly before removing the review environment.

The job's duration is database test duration, **not full application recovery RTO**.
This does not replace historical recovery drills or independently protected backup
copies for account/region/key disasters. No production restore, deployment, or cloud
resource change was performed during local implementation.

## Local checks (no AWS credentials or operations)

```sh
pnpm --filter scripts test:backup-restore
pnpm --filter mcr-infra-cdk test:backup-restore
pnpm --filter scripts lint
pnpm --filter mcr-infra-cdk exec oxlint --deny-warnings .
```

Tests use fake AWS clients, fake SQL connections, and offline CDK synthesis. Live
first-run acceptance must also verify actual IAM authorization for subnet/parameter
configuration resources, network/TLS routing, credentials, failure cleanup, and Slack
delivery. Production remains protected by scoped IAM and network boundaries even
when those configuration checks fail.
