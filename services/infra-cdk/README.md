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
│   ├── cognito.ts
│   ├── frontend-app.ts
│   ├── frontend-infra.ts
│   ├── lambda-layers.ts
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
- `CDK_STAGE` - Stage (dev/val/prod)

## VPC Prerequisites

The Network Stack imports an existing VPC using environment variables:

- `VPC_ID` - VPC ID
- `SG_ID` - Security group ID for Lambda functions
- `SUBNET_PRIVATE_A_ID` - Private subnet A ID
- `SUBNET_PRIVATE_B_ID` - Private subnet B ID
- `SUBNET_PRIVATE_C_ID` - Private subnet C ID

## Security

- All resources tagged with Project/Environment/ManagedBy
- OIDC role uses CMS-required IAM path and permissions boundary
- VPC endpoints for private connectivity
- GuardDuty for malware scanning
- Secrets in AWS Secrets Manager
