# oidc

This folder contains a CloudFormation template that creates the resources necessary to use GitHub's OIDC provider to retrieve short-term credentials for performing AWS actions in a GitHub Actions workflow. The advantage of this approach is that there is no need to create an IAM user and store long-term AWS credentials in GitHub secrets.

- [Read more about using GitHub OIDC](https://docs.github.com/en/enterprise-server@3.5/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Read more about configuring OpenID Connect in AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

## Resources

Note: In order to successfully create IAM resources in CMS Cloud, developers must supply a path and permissions boundary for the resources. The path and permission boundary values defined in [this documentation](https://cloud.cms.gov/creating-identity-access-management-policies) are pre-configured in the template.

### IAM OIDC Identity Provider

IAM OIDC identity providers are entities in IAM that describe an external identity provider (IdP) service that supports the [OpenID Connect (OIDC) standard](http://openid.net/connect/). The AWS IdP is configured with the URL (`token.actions.githubusercontent.com`) and server certificate thumbprint of the GitHub OIDC provider. A valid default value for the thumbprint is provided, but thumbprint can also be obtained by following [these steps](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html).

### IAM Role

This is the role that the Actions workflow assumes via the OIDC request. The permissions defined for this role dictate the scope of the short-term credentials that are generated and passed back to GitHub by AWS. The ARN of this role is output by the CloudFormation stack, and is passed in to the [GitHub Action that configures AWS credentials for workflows](https://github.com/aws-actions/configure-aws-credentials#assuming-a-role). See the example below under "Using the OIDC Provider in a Workflow."

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

Subject claims allow you to configure the GitHub branch or environment that is permitted to perform AWS actions via the OIDC provider. [Read more about subject claims](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#example-subject-claims)

#### Audience Claim (aud)

The principal sending the JWT needs to identify itself using the audience claim. The default for this value is set to `sts.amazonaws.com`, which is the [value used by the AWS credentials GitHub Action](https://github.com/aws-actions/configure-aws-credentials#assuming-a-role) that we recommend you use with these resources.

### IAM Permissions Policy

This policy grants permissions to perform AWS actions in the workflow. For example, if the workflow is scaling a service in ECS or importing findings to Security Hub, a policy granting those permissions needs to be attached to the OIDC role so that the credentials passed back to the workflow allow these actions.

## Usage

### Parameters

- `SubjectClaimFilters` is a comma-separated list of subject claims that configure the GitHub branch or environment that is permitted to perform AWS actions via the OIDC provider. See 'Subject Claim' above for details.

The permissions policy is defined by two optional parameters:

- `GitHubActionsAllowedAWSActions` is a comma-separated list of strings that are comprised of an AWS service and an allowed action. See the [IAM documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html) for examples. The service/action pairs listed will be granted access to all resources (`"Resource": "*"`).
- `ManagedPolicyARNs` is a comma-separated list of IAM policy ARNs to attach to the OIDC role. These can be AWS-managed or custom-managed policy ARNs.

### Steps

1. For each AWS environment, create a parameters JSON file with the values needed for that environment.

2. Deploy the OIDC resources in each AWS environment using [the provided CloudFormation template](./github-oidc.yml) and the AWS CLI:

   - Verify the AWS account for the deploy

     ```console
     aws sts get-caller-identity
     ```

   - View the proposed changes using the `--no-execute-changeset` flag

     ```console
     aws cloudformation deploy \
       --template-file github-oidc.yml \
       --stack-name github-oidc \
       --parameter-overrides file://dev.json \
       --capabilities CAPABILITY_IAM \
       --no-execute-changeset
     ```

   - Verify the changes, then deploy

     ```console
     aws cloudformation deploy \
       --template-file github-oidc.yml \
       --stack-name github-oidc \
       --parameter-overrides file://{path to parameters file} \
       --capabilities CAPABILITY_IAM
     ```

   - Get the service role ARN from the stack output

   ```console
   aws cloudformation describe-stacks --stack-name github-oidc --query "Stacks[0].Outputs[?OutputKey=='ServiceRoleARN'].OutputValue" --output text
   ```

3. For each environment, create a repository secret in `GitHub Secrets -> Actions` where the key is `${environment}_OIDC_IAM_ROLE_ARN` and the value is the ARN of the role for that environment. Refer to this secret when configuring credentials for a given environment in a workflow.


## Using the OIDC Provider in a Workflow

Note that the `id-token: write` permission is [required to authorize the request for the GitHub OIDC token](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#adding-permissions-settings). You can set the permission globally, or per job. If you forget to do this, you will see the error `Error: Credentials could not be loaded, please check your action inputs: Could not load credentials from any providers`.

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
          role-to-assume: ${ARN of the role created by this template}
     ...
```
