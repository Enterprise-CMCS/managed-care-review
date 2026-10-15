# MCR CDK Infrastructure

AWS CDK infrastructure for Managed Care Review.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Deploy to dev
cdk deploy "*" --context stage=dev
```

## Project Structure

```
infra-cdk/
├── bin/                    # CDK app entry points
│   ├── app-api.ts
│   ├── api-gateway-account.ts
│   ├── cognito.ts
│   ├── frontend-app.ts
│   ├── frontend-infra.ts
│   ├── network.ts
│   ├── oidc.ts
│   ├── postgres.ts
│   ├── uploads.ts
│   └── virus-scanning.ts
├── lib/
│   ├── stacks/            # Stack definitions
│   ├── constructs/        # Reusable constructs
│   │   ├── api/          # API Gateway constructs
│   │   ├── base/         # Base stack
│   │   ├── database/     # Aurora constructs
│   │   └── storage/      # S3 constructs
│   └── config/           # Environment configs
```

## Stacks

- **Network** - VPC imports, security groups
- **Postgres** - Aurora Serverless v2, logical database manager
- **Uploads** - S3 buckets with security policies
- **Cognito** - User pool and authentication
- **App-API** - GraphQL API, Lambda functions, API Gateway
- **API-Gateway-Account** - Account-wide CloudWatch logging role shared by REST APIs
- **Frontend-Infra** - CloudFront distribution
- **Frontend-App** - Static website deployment
- **Virus-Scanning** - GuardDuty malware protection
- **Lambda-Layers** - Prisma layers for Lambda functions
- **GitHub-OIDC** - GitHub Actions authentication

## Key Commands

```bash
# List stacks
cdk list --context stage=dev

# Synthesize specific stack
cdk synth network-dev-cdk --context stage=dev

# Deploy specific stack
cdk deploy network-dev-cdk --context stage=dev

# Diff before deploy
cdk diff "*" --context stage=dev

# Clean build artifacts
pnpm clean
```

## Environment Variables

Required for deployment:

- `AWS_REGION` - AWS region
- `STAGE_NAME` - Stage (`dev`, `val`, `qa`, `prod`, or a review branch)

## CloudFront US-only routing

The application and Storybook distributions use `PriceClass_All`, which is required before AWS can enable CMS Strict Region Routing (SRR). SRR itself is an AWS-managed setting and is not visible in CDK, CloudFormation, or the AWS console.

For every affected stage:

1. Deploy `frontend-infra-<stage>-cdk` and wait for the stack update and both CloudFront distributions to report `Deployed`. This updates the existing distributions in place; do not create replacements or change their aliases.
2. For each affected distribution, open an AWS Support case:
    - Service: CloudFront
    - Category: Distribution Issue
    - Severity: General guidance
    - Subject: `CMS CloudFront distro SRR onboarding`
    - Description: `Requesting expedited U.S.-only SRR onboarding for: <distribution DNS name>. Reference case #175512056000814.`
3. Keep the existing distributions live while AWS processes the requests; the expected turnaround is 48–72 hours. After AWS confirms SRR for every distribution, allow about 20 minutes for routing propagation. AWS states that this does not require downtime.
4. Verify the application and Storybook endpoints after confirmation. Keep `PriceClass_All`; changing the price class makes the distributions noncompliant with SRR.

## Account-wide API Gateway configuration

The `api-gateway-account-<stage>-cdk` stack owns the single API Gateway CloudWatch logging role allowed per AWS account and region. Promote deploys one baseline in each Dev, Val, and Prod account. QA shares Val's AWS account and therefore uses `api-gateway-account-val-cdk`; QA does not create or own account-level Val resources.

Each App API stack still owns its REST API, stage, WAF association, and stage-specific access-log group. Removing QA does not modify the shared baseline or any Val application resource.

## VPC Prerequisites

The Network Stack imports an existing VPC using environment variables:

- `VPC_ID` - VPC ID
- `SUBNET_PRIVATE_A_ID` - Private subnet A ID
- `SUBNET_PRIVATE_B_ID` - Private subnet B ID
- `SUBNET_PRIVATE_C_ID` - Private subnet C ID

## Security

- All resources tagged with Project/Environment/ManagedBy
- OIDC role uses CMS-required IAM path and permissions boundary
- VPC endpoints for private connectivity
- GuardDuty for malware scanning
- Secrets in AWS Secrets Manager
