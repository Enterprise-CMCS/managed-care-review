# github-oidc

This service manages resources for using GitHub's OIDC provider to retrieve short-term AWS credentials in a GitHub Actions workflow. The advantage of this approach is that there is no need to create an IAM user and store long-term AWS credentials in GitHub secrets.

- [Read more about using GitHub OIDC](https://docs.github.com/en/enterprise-server@3.5/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Read more about configuring OpenID Connect in AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

## Resources

### IAM OIDC Identity Provider (IdP)

IAM OIDC IdPs are entities in IAM that create a relationship with an external IdP service that supports the [OpenID Connect (OIDC) standard](http://openid.net/connect/). The IAM IdPs created by this service are configured with the URL (`token.actions.githubusercontent.com`) and server certificate thumbprint of the GitHub IdP. A valid default value for the GitHub server thumbprint is provided, but the thumbprint can also be obtained by following [these steps](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html).

Each environment can have a maximum of one AWS IdP configured for GitHub.  Attempts to create a duplicate AWS IdP will fail.

### IAM Role

This is the role that the Actions workflow assumes via the OIDC request. The permissions defined for the role dictate the scope of the short-term credentials that are passed back to GitHub by AWS. This service creates an Actions repo secret (as well as a matching Dependabot repo secret for the 'main' stage) that contains the OIDC role ARN, and the secrets are referenced by the [GitHub Action that configures AWS credentials for workflows](https://github.com/aws-actions/configure-aws-credentials#assuming-a-role).  See the example below under "Using the OIDC Provider in a Workflow."

Each environment can have many OIDC roles with varying permissions.  However, each role has a trust relationship with the single AWS IdP for GitHub for that environment.

## GitHub Repo Secrets
This service uses a post-deploy script that creates or updates an Actions repo secret containing the OIDC role ARN (and for the 'main' stage, a matching Dependabot secret).  Because of this, when the service is deployed there must be a GitHub personal access token with `repo` and `read:public_key` scopes set as `GITHUB_TOKEN` in the environment for the deployment. The [default token granted to Actions workflows by GitHub](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#modifying-the-permissions-for-the-github_token) does not permit the management of repo secrets.

## Usage
### Bootstrapping
The OIDC resources for each environment need to be manually bootstrapped for two reasons:
- this service uses OIDC for permissions to deploy itself (chicken and egg problem)
- the fact that only one AWS IdP for GitHub can exist per environment makes it tricky to manage multiple stages in the dev environment. CloudFormation isn't great at checking if resources exist before trying to create them and trying to create a duplicate IdP for each feature branch in dev will fail.

The service is configured to be bootstrapped by running `serverless deploy` locally once for the 'official' stage for each environment (see step 4 below). This will create both the AWS OIDC IdP and the IAM role for that stage and environment.  Subsequent automated deploys of the service will update the IAM role, but won't touch the IdP.  Configuration changes for the IdP should be infrequent, but if they occur they will need to be applied manually following the steps below.

Steps:
1. Set AWS creds from CloudTamer/Kion for the target environment (dev, val, prod), then confirm the correct target
```bash
export AWS_ACCESS_KEY_ID=***
export AWS_SECRET_ACCESS_KEY=***
export AWS_SESSION_TOKEN=***

aws sts get-caller-identity
```
2. Set a GitHub personal access token with `repo` and `read:public_key` scopes, and a variable that enables the `manage-repo-secrets` script called by the service to run locally
```bash
export GITHUB_TOKEN=***
export GITHUB_ACTION=true
```
3. Navigate to the `github-oidc` directory
```bash
cd services/github-oidc
```
4. Deploy the service, passing the bootstrap flag and the stage name that corresponds to the 'official' stage for the target environment:
    - `main` for dev
    - `val` for val
    - `prod` for prod
```bash
serverless deploy --stage ${stage_name} --param='bootstrap=true'
```

## Examples

### Updating AWS permissions for a workflow
Here's an example for a common use case: you want to add a new step to a workflow job that calls an AWS API (let's say it's Security Hub), and access to that API isn't currently permitted by the existing OIDC role.

You're making this change on your feature branch, `mybranch`.  You update the `githubActionsAllowedAwsActions` parameter in the `github-oidc` service's `serverless.yml` by adding "securityhub:*".  When you push your change and the `github-oidc` service is deployed for the feature branch, it will create/update an OIDC service role that includes Security Hub permissions and has a trust relationship with the AWS IdP provider for GitHub that was created when bootstrapping.  It will also create a GitHub secret called `MYBRANCH_OIDC_ROLE_ARN`.  You can reference this secret when getting AWS credentials to test out the workflow that talks to Security Hub on your feature branch. Note that if you are creating/updating an OIDC role and testing it in the same workflow run, you may need to add temporary step to pause and wait for the role to settle before using it due to [AWS's eventual consistency model](https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_general.html#troubleshoot_general_eventual-consistency).

When it's time to merge your feature branch to `main`, the service will update roles and set `${ENVIRONMENT}_OIDC_ROLE_ARN` secrets for the respective environments as the change is promoted.  When the feature branch is deleted, the `destroy` script will clean up the now-unneeded `MYBRANCH_OIDC_ROLE_ARN` secret.

### Using the OIDC Provider in a Workflow

Note that the `id-token: write` permission is [required to authorize the request for the GitHub OIDC token](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#adding-permissions-settings). You can set the permission globally, or per job. If you forget to do this, the workflow will fail with `Error: Credentials could not be loaded, please check your action inputs: Could not load credentials from any providers`.

```yml
jobs:
  example:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1-node16
        with:
          aws-region: us-east-1
          role-to-assume: ${{ secrets.DEV_OIDC_ROLE_ARN }}
     ...
```

## More on IAM resources

### IAM Trust Policy

This policy establishes the trust relationship between GitHub and AWS based on values in the JSON web token (JWT) submitted by the GitHub OIDC provider. Here's an example of the JWT sent by GitHub to AWS:

```json
{
  "typ": "JWT",
  "alg": "RS256",
  "x5t": "example-thumbprint",
  "kid": "example-key-id"
}
{
  "jti": "2e624367-5ab9-4133-c537-861d1b19a85b",
  "sub": "repo:{organization}/{repo}:ref:refs/heads/{branch}",
  "aud": "sts.amazonaws.com",
  "ref": "refs/heads/{branch}",
  "sha": "ec7d38be2362bfaaf8878a1cebb4b0f695eab764",
  "repository": "{organization}/{repo}",
  "repository_owner": "{organization}",
  "repository_owner_id": "3209407",
  "run_id": "3339113236",
  "run_number": "117",
  "run_attempt": "3",
  "repository_visibility": "public",
  "repository_id": "376113068",
  "actor_id": "25254258",
  "actor": "{github username}",
  "workflow": "{workflow name}",
  "head_ref": "",
  "base_ref": "",
  "event_name": "push",
  "ref_type": "branch",
  "job_workflow_ref": "{organization}/{repo}/.github/workflows/{workflow name}.yml@refs/heads/{branch}",
  "enterprise": "centers-for-medicare-medicaid-services",
  "iss": "https://token.actions.githubusercontent.com ",
  "nbf": 1666887165,
  "exp": 1666888065,
  "iat": 1666887765
}
```

The trust policy verifies claims in the JWT based on the following inputs:

#### Subject Claim (sub)

Subject claims allow you to configure the GitHub branch or environment that is permitted to perform AWS actions via the OIDC provider. This is an extra layer of insurance that changes in resources are targeted to the correct account.  [Read more about subject claims](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#example-subject-claims) and see `params.{val, prod, default}.subjectClaimFilters` for more detail on how this service configures subject claims.


#### Audience Claim (aud)

The principal sending the JWT needs to identify itself using the audience claim. The default for this value is set to `sts.amazonaws.com`, which is the [value used by the AWS credentials GitHub Action](https://github.com/aws-actions/configure-aws-credentials#assuming-a-role) that we recommend you use with these resources.

### IAM Permissions Policy

This policy grants permission to perform AWS actions in the workflow. For example, if the workflow is scaling a service in ECS or importing findings to Security Hub, a policy granting those permissions needs to be attached to the OIDC role so that the credentials passed back to the workflow allow these actions.

The permissions policy is defined by two parameters in `serverless.yml`:

- `GitHubActionsAllowedAWSActions` is a list of strings that are comprised of an AWS service and an allowed action. See the [IAM documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html) for examples. The service/action pairs listed will be granted access to all resources (`"Resource": "*"`).
- `ManagedPolicyARNs` is a list of IAM policy ARNs to attach to the OIDC role. These can be AWS-managed or custom-managed policy ARNs.
