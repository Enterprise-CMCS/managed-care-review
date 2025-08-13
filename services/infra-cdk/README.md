# MCR CDK Infrastructure

Production-ready AWS CDK infrastructure for Managed Care Review.

## Production Security Hardening

This CDK implementation includes critical security hardening measures:

1. **JWT Secret Protection**: Uses AWS CDK grant patterns to avoid exposing secret ARNs in environment variables
2. **Binary Content Handling**: Properly configured API Gateway endpoints for file uploads/downloads
3. **Layer Version Management**: Uses SSM Parameters instead of CloudFormation exports to avoid deployment failures
4. **Configuration Validation**: Fail-fast validation for critical Auth stack configuration
5. **IAM Permission Scoping**: Correct Identity Pool conditions and properly attached policies
6. **Stack Naming Consistency**: Uniform CDK deployment suffix across all stacks

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

### Stack Hierarchy & Details

#### 1. **Foundation Stack** - Core parameters, secrets
- **JWT Secret**: Creates Secrets Manager secret for JWT signing/verification
- **API Keys**: Stores third-party API keys (LaunchDarkly, etc.)
- **SSM Parameters**: Configuration values accessible across stacks
- **IAM Service Roles**: Base roles with permission boundaries
- **Cross-Stack Exports**: ARNs and resource names for other stacks
- **Base Tagging**: Project/Environment/ManagedBy tags

#### 2. **Network Stack** - Imports existing VPC, creates security groups
- **VPC Import**: Reads VPC details from SSM Parameter Store (no VPC creation)
- **Security Groups**:
  - Lambda Security Group: Outbound HTTPS (443) and PostgreSQL (5432)
  - Database Security Group: Inbound PostgreSQL from Lambda SG only
- **VPC Endpoints**: Private access to AWS services (S3, Secrets Manager, etc.)
- **Flow Logs**: Network traffic monitoring in CloudWatch

#### 3. **Data Stack** - Aurora PostgreSQL, S3 buckets
- **Aurora Serverless v2**: 
  - PostgreSQL database with stage-based retention (1/7/30 days)
  - Deletion protection for prod/val
  - VPN access via imported security groups
- **S3 Buckets**:
  - Uploads: Main file storage with CORS, virus scan enforcement
  - QA: Test file storage with same restrictions
  - Logging: Access logs for all buckets
- **Security**: File type restrictions, SSL enforcement, virus scan tags

#### 4. **Auth Stack** - Cognito user pool, SAML
- **Cognito User Pool**: Email-based auth, MFA optional, admin-only signup
- **SAML Integration**: Federated auth with attribute mapping
- **App Clients**: Web (public) and Server (confidential) clients
- **Custom Domain**: mcr-auth-{stage} for hosted UI
- **Security**: Advanced security mode, CloudWatch logs, account protection

#### 5. **ApiCompute Stack** - API Gateway, Lambda functions
- **Lambda Functions**: GraphQL, OAuth, health, email, migrations, cleanup
- **API Gateway**: REST API with WAF, Cognito auth, request validation
- **Lambda Layers**: Prisma (DB), OTEL (observability)
- **EventBridge**: Scheduled tasks and event-driven workflows
- **Auto-bundling**: TypeScript → JavaScript with esbuild

#### 6. **DatabaseOps Stack** - DB management lambdas
- **DB Manager**: Schema operations, user management, DDL execution
- **DB Export**: Backup to S3, table exports, compression
- **DB Import**: Restore from S3, data migration
- **Security**: VPC-only access, IAM invocation, Secrets Manager

#### 7. **VirusScanning Stack** - GuardDuty malware protection
- **GuardDuty Plans**: Auto-scan uploads and QA buckets
- **Scan Processing**: Tag files with results, send threat alerts
- **Rescan System**: Queue-based rescanning for failed files
- **Migration Support**: Metrics comparing GuardDuty vs ClamAV
- **Serverless**: No EC2/ALB/ASG required (unlike ClamAV)

#### 8. **Monitoring Stack** - CloudWatch, alarms
- **Dashboards**: Unified view of all services
- **Alarms**: Lambda errors, API latency, DB CPU, storage
- **Tracing**: X-Ray distributed tracing
- **Logs**: Centralized with retention policies
- **Synthetics**: Endpoint monitoring with canaries
- **Costs**: Budget alerts and anomaly detection

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