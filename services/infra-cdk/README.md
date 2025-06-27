# MCR CDK Infrastructure

Production-ready AWS CDK infrastructure for Managed Care Review.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Deploy to dev
cdk deploy "*" --context stage=dev
```

## Architecture

### Stack Hierarchy
1. **Foundation** - Core parameters, secrets (JWT, API keys)
2. **Network** - Imports existing VPC, creates security groups  
3. **Data** - Aurora PostgreSQL, S3 buckets
4. **Auth** - Cognito user pool, SAML
5. **ApiCompute** - API Gateway, Lambda functions
6. **DatabaseOps** - DB management lambdas
7. **VirusScanning** - GuardDuty malware protection
8. **Monitoring** - CloudWatch, alarms

### Project Structure
```
infra-cdk/
├── bin/mcr-app.ts          # CDK app entry point
├── lib/
│   ├── stacks/             # Stack definitions  
│   ├── constructs/         # Reusable constructs
│   │   ├── api/           # API Gateway constructs
│   │   ├── auth/          # Cognito constructs
│   │   ├── database/      # Aurora constructs
│   │   ├── lambda/        # Lambda factory & layers
│   │   └── storage/       # S3 constructs
│   ├── config/            # Environment configs
│   └── aspects/           # CDK aspects (IAM)
└── src/lambdas/           # Lambda source code
```

### Lambda Build Process
- **NodejsFunction** construct auto-bundles TypeScript → JavaScript
- **esbuild** for fast bundling with tree-shaking
- GraphQL files loaded as modules
- Prisma client excluded (provided via layer)
- Source maps enabled for debugging

### Key Commands
```bash
# List stacks
cdk list --context stage=dev

# Synthesize specific stack
cdk synth MCR-Foundation-dev --context stage=dev

# Deploy specific stack
cdk deploy MCR-Network-dev --context stage=dev

# Diff before deploy
cdk diff "*" --context stage=dev

# Clean build artifacts
pnpm clean
```

### Environment Variables
Required for deployment:
- `AWS_REGION` - AWS region
- `CDK_STAGE` - Stage (dev/val/prod)
- `IAM_PATH` - IAM path prefix
- `PERM_BOUNDARY_ARN` - IAM permissions boundary

### VPC Prerequisites
The Network Stack imports an existing VPC. Before deployment, ensure these SSM parameters exist:
- `/configuration/default/vpc/id` - VPC ID
- `/configuration/default/vpc/cidr` - VPC CIDR block
- `/configuration/default/vpc/subnets/private/a/id` - Private subnet A ID
- `/configuration/default/vpc/subnets/private/b/id` - Private subnet B ID
- `/configuration/default/vpc/subnets/private/c/id` - Private subnet C ID

### Security
- All resources tagged with Project/Environment/ManagedBy
- IAM roles use permission boundaries
- VPC endpoints for private connectivity
- GuardDuty for malware scanning
- Secrets in AWS Secrets Manager