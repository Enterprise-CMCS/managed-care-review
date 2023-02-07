# 020 — Use GitHub's OIDC provider to get AWS credentials

## Considered Options
We currently use long-term AWS credentials backed by an IAM service user.  The credentials for each AWS environment are stored as GitHub secrets and are injected into the environment of the GitHub Actions workflows that require them.  Currently the service user's credentials have access to all AWS APIs via the `AdminAccess` managed policy.

The proposed option is to use GitHub's OIDC provider to get short-term credentials. [More on OIDC for GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)

## Chosen Decision
We will use GitHub's OIDC provider get short-term AWS credentials for workflows.  The AWS resources required to set up OIDC will be managed by a new serverless service, `github-oidc`.
Workflows that need access to AWS APIs will call a new composite action `get-aws-credentials`, which is a thin wrapper around AWS's official [configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials) action.  The OIDC permissions policy will follow the principle of least privilege, so we'll need to add permissions to call new AWS APIs as workflows are created or updated.

### Pro/Cons
#### OIDC
- `+` short-term creds that automatically expire are more secure
- `+` can be managed directly by the team (vs. an IAM user)
- `+` more granular control over how workflows can use credentials via OIDC subject claims
- `+` since they are easy to manage, creds can be tightly scoped to follow principle of least privilege
- `-` requires inital manual bootstrapping (managed by automated deploys of a serverless service thereafter)
- `-` setup and maintainance is more complex

#### Long-term AWS creds via IAM service user
- `+` easier to understand
- `+` admin access means no workflow failures due to permissions errors when new AWS APIs are called
- `-` the IAM user that backs the creds can't be managed directly (Cloud Support ticket required)
- `-` must be rotated quarterly
- `-` long-term creds mean a greater attack window if leaked


