# GitHub OIDC for AWS Credentials

GitHub Actions workflows use GitHub's OIDC provider to obtain short-term AWS credentials rather than storing long-term IAM access keys as secrets. See [ADR 020](../architectural-decision-records/020-use-oidc-for-aws-credentials.md) for the original decision rationale.

## How it works

When a workflow job runs, GitHub mints a short-lived JWT signed by GitHub's OIDC provider (`https://token.actions.githubusercontent.com`). The `aws-actions/configure-aws-credentials` action sends this JWT to AWS STS, which validates it against the IAM OIDC Identity Provider registered in the target account and exchanges it for temporary AWS credentials scoped to the configured IAM role.

```
GitHub Actions runner
  → JWT from GitHub OIDC provider
  → STS AssumeRoleWithWebIdentity (validates JWT against IAM OIDC IdP)
  → temporary AWS credentials for the stage's service role
```

## AWS resources (managed by CDK)

The CDK stack at `services/infra-cdk/lib/stacks/github-oidc.ts`, deployed via `bin/oidc.ts`, creates two resources per environment:

### 1. IAM OIDC Identity Provider

One per AWS account, created only for official stages (`dev`, `val`, `prod`). Review branch stacks reference the provider created by the `dev` stack in the dev account.

- URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`
- Thumbprints: GitHub's published certificate thumbprints

### 2. IAM Service Role

One per stage, named `github-oidc-cdk-<stage>-ServiceRole`.

- Path: `/delegatedadmin/developer/` (CMS requirement)
- Permissions boundary: `ct-ado-poweruser-permissions-boundary-policy` (CMS requirement)
- Max session: 2 hours
- Trust policy: allows `sts:AssumeRoleWithWebIdentity` from the OIDC provider, scoped by subject and audience claims (see below)

### Subject claims

The trust policy uses the GitHub subject claim (`sub`) to restrict which workflow runs can assume the role:

| Stage                             | Subject claim                                               | GitHub environment |
| --------------------------------- | ----------------------------------------------------------- | ------------------ |
| `val`                             | `repo:Enterprise-CMCS/managed-care-review:environment:val`  | `val`              |
| `prod`                            | `repo:Enterprise-CMCS/managed-care-review:environment:prod` | `prod`             |
| all others (dev, review branches) | `repo:Enterprise-CMCS/managed-care-review:environment:dev`  | `dev`              |

GitHub environments are configured in the GitHub UI and control which branches can access the environment and its secrets. See [ADR 021](../architectural-decision-records/021-use-github-environments.md).

## How CI workflows use it

The composite action `.github/actions/get_aws_credentials` wraps `aws-actions/configure-aws-credentials` and constructs the role ARN from inputs:

```yaml
- uses: ./.github/actions/get_aws_credentials
  with:
      region: ${{ vars.AWS_DEFAULT_REGION }}
      account-id: ${{ secrets.DEV_AWS_ACCOUNT_ID }}
      stage-name: dev
      use-cdk-role: 'true'
```

Key inputs:

| Input                  | Effect                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stage-name`           | Selects which role to assume. For ephemeral review branches, this defaults to `dev` if no branch-specific role exists yet.                               |
| `use-cdk-role: "true"` | Constructs the ARN as `github-oidc-cdk-<stage>-ServiceRole`. Always use this — it distinguishes CDK-managed roles from the old Serverless-managed roles. |
| `changed-services`     | When set to `"github-oidc"`, forces use of the stage-specific role rather than falling back to `dev`. Used in the OIDC bootstrap jobs.                   |

Workflows must also declare `id-token: write` permission at the job level (or globally):

```yaml
jobs:
  example:
    permissions:
      id-token: write
    steps:
      - uses: ./.github/actions/get_aws_credentials
        ...
```

## Bootstrapping a new environment

Because the OIDC resources are used by CI to deploy themselves, they must be bootstrapped manually once per AWS account using static credentials (from CloudTamer/Kion).

```bash
# 1. Set credentials for the target account
export AWS_ACCESS_KEY_ID=***
export AWS_SECRET_ACCESS_KEY=***
export AWS_SESSION_TOKEN=***
aws sts get-caller-identity   # confirm the target account

# 2. Deploy from the repo root
cd services/infra-cdk
STAGE_NAME=dev pnpm cdk deploy github-oidc-dev-cdk \
  --app 'pnpm tsx bin/oidc.ts' \
  --context stage=dev \
  --require-approval never
```

Repeat with `val` and `prod` stage names using their respective account credentials.

After bootstrapping, all subsequent changes to the OIDC stack (e.g. adding new AWS permissions) are deployed automatically by CI — the bootstrap only needs to happen once per account, or if the stack is ever deleted.

## If the OIDC provider already exists in the account

Each AWS account can only have one OIDC identity provider for a given URL. If you attempt to bootstrap an account where a provider for `token.actions.githubusercontent.com` already exists from another source (e.g. an old Serverless stack that hasn't been cleaned up yet), CloudFormation will fail with an "already exists" error.

Delete the old provider first, then run the bootstrap:

```bash
aws iam delete-open-id-connect-provider \
  --open-id-connect-provider-arn arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com
```

## Adding or updating AWS permissions

The service role's permissions policy is defined inline in `github-oidc.ts`. If a workflow needs access to a new AWS service, add the action pattern there:

```typescript
const allowedActions = [
    'acm:*',
    'cloudformation:*',
    // add new entries here
    'new-service:*',
    ...
]
```

Push the change on a feature branch. The CI OIDC bootstrap job in `deploy-cdk.yml` redeploys the OIDC stack early in the pipeline (before any other infrastructure), so subsequent jobs in the same run will already have the updated permissions.

Note that IAM role changes can take a few seconds to propagate. If a job immediately follows the OIDC deploy and hits a permissions error, re-running the job is usually sufficient.

## Deployed stacks

| Stack name                 | Account | Stage                                                |
| -------------------------- | ------- | ---------------------------------------------------- |
| `github-oidc-dev-cdk`      | dev     | `dev` — owns the OIDC provider for the dev account   |
| `github-oidc-<branch>-cdk` | dev     | ephemeral review branches                            |
| `github-oidc-val-cdk`      | val     | `val` — owns the OIDC provider for the val account   |
| `github-oidc-prod-cdk`     | prod    | `prod` — owns the OIDC provider for the prod account |
