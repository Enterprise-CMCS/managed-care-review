# CDK Deployment Guide

This guide provides comprehensive instructions for deploying the Managed Care Review application using AWS CDK.

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Node.js** v20.x and **pnpm** package manager
3. **AWS CDK CLI** installed: `npm install -g aws-cdk`
4. **Access** to the appropriate AWS account
5. **Environment variables** set for your deployment stage

## CDK Stack Architecture

Our CDK application consists of 9 interdependent stacks deployed in a specific order:

```
Foundation → Network → Lambda Layers → Data → Auth → Database Ops → API Compute → Frontend → Monitoring
```

### Stack Descriptions

1. **Foundation Stack** (`MCR-Foundation-{stage}-cdk`)
   - Core SSM parameters and shared configuration
   - No dependencies

2. **Network Stack** (`MCR-Network-{stage}-cdk`)
   - VPC and security groups for Lambda functions
   - Depends on: Foundation

3. **Lambda Layers Stack** (`MCR-LambdaLayers-{stage}-cdk`)
   - Shared dependencies (Prisma, PostgreSQL tools)
   - Depends on: Foundation

4. **Data Stack** (`MCR-Data-{stage}-cdk`)
   - RDS Aurora PostgreSQL database
   - Depends on: Network, Foundation

5. **Auth Stack** (`MCR-Auth-{stage}-cdk`)
   - Cognito user pools and authentication
   - Depends on: Foundation

6. **Database Operations Stack** (`MCR-DatabaseOps-{stage}-cdk`)
   - Database migrations and maintenance functions
   - Depends on: Data, Network, Lambda Layers

7. **API Compute Stack** (`MCR-ApiCompute-{stage}-cdk`)
   - Lambda functions and API Gateway
   - Depends on: Auth, Data, Network, Lambda Layers, Frontend (for APPLICATION_ENDPOINT)

8. **Frontend Stack** (`MCR-Frontend-{stage}-cdk`)
   - S3 buckets and CloudFront distribution
   - Depends on: Foundation

9. **Monitoring Stack** (`MCR-Monitoring-{stage}-cdk`)
   - CloudWatch dashboards and alarms
   - Depends on: API Compute, Data

## Deployment Commands

### Navigate to CDK Directory
```bash
cd services/infra-cdk
```

### Install Dependencies
```bash
pnpm install
```

### Bootstrap CDK (First Time Only)
```bash
pnpm cdk bootstrap --context stage=dev
```

### Deploy All Stacks
```bash
# Development environment
pnpm cdk deploy --all --context stage=dev

# Validation environment
pnpm cdk deploy --all --context stage=val

# Production environment
pnpm cdk deploy --all --context stage=prod
```

### Deploy Individual Stack
```bash
# Deploy specific stack
pnpm cdk deploy MCR-ApiCompute-dev-cdk --context stage=dev

# Deploy with approval prompts disabled
pnpm cdk deploy MCR-ApiCompute-dev-cdk --context stage=dev --require-approval never
```

### View Pending Changes
```bash
# Show diff for all stacks
pnpm cdk diff --all --context stage=dev

# Show diff for specific stack
pnpm cdk diff MCR-ApiCompute-dev-cdk --context stage=dev
```

### Synthesize CloudFormation Templates
```bash
# Synthesize all stacks
pnpm cdk synth --all --context stage=dev

# Synthesize specific stack
pnpm cdk synth MCR-ApiCompute-dev-cdk --context stage=dev
```

## Environment-Specific Configuration

### Stage Configuration
Each stage has specific configuration in `/services/infra-cdk/lib/config/stage-config.ts`:
- Lambda memory and timeout settings
- VPC configuration
- Security settings
- Monitoring retention periods

### Environment Variables
Lambda environment variables are managed through:
1. **SSM Parameter Store**: Configuration values
2. **Secrets Manager**: Sensitive credentials
3. **Environment Factory**: Centralized management in code

### Cross-Stack References
Stacks share resources using CloudFormation exports/imports:
- Database endpoints and secrets
- Lambda layer ARNs
- API Gateway IDs
- S3 bucket names

## Common Deployment Scenarios

### Initial Deployment
```bash
# Bootstrap the environment
pnpm cdk bootstrap --context stage=dev

# Deploy all stacks
pnpm cdk deploy --all --context stage=dev
```

### Update Lambda Functions Only
```bash
# Deploy just the API Compute stack
pnpm cdk deploy MCR-ApiCompute-dev-cdk --context stage=dev
```

### Database Migration
```bash
# Deploy database changes
pnpm cdk deploy MCR-Data-dev-cdk --context stage=dev

# Deploy migration functions
pnpm cdk deploy MCR-DatabaseOps-dev-cdk --context stage=dev

# Run migrations (via Lambda console or CLI)
aws lambda invoke --function-name MCR-MIGRATE-dev response.json
```

### Frontend Updates
```bash
# Deploy frontend changes
pnpm cdk deploy MCR-Frontend-dev-cdk --context stage=dev
```

## Troubleshooting

### Stack Deployment Failures

1. **Dependency Issues**
   - Ensure stacks are deployed in the correct order
   - Check CloudFormation console for detailed error messages

2. **Permission Errors**
   - Verify IAM permissions for CDK deployment
   - Check permission boundaries are correctly set

3. **Resource Limits**
   - Check AWS service quotas
   - Review Lambda concurrent execution limits

### Common Issues

#### "Stack not found" Error
```bash
# List all stacks to verify naming
pnpm cdk list --context stage=dev
```

#### Circular Dependency Error
- Review cross-stack references
- Ensure proper dependency order in stack definitions

#### Lambda Function Not Updating
```bash
# Force update by changing function description
# Or use --hotswap for faster development deployments
pnpm cdk deploy MCR-ApiCompute-dev-cdk --context stage=dev --hotswap
```

## CI/CD Integration

GitHub Actions workflows handle automated deployments:

1. **PR Deployments**: Create ephemeral review app environments
2. **Dev Deployment**: Automatic deployment on merge to main
3. **Promotion Pipeline**: dev → val → prod with gates

### Workflow Files
- `.github/workflows/deploy.yml`: Main deployment workflow
- `.github/workflows/promote.yml`: Production promotion workflow
- `.github/workflows/cdk-deploy.yml`: CDK-specific deployment steps
- `.github/workflows/cdk-deploy-production.yml`: Production CDK deployment

## Best Practices

1. **Always Review Changes**
   - Run `cdk diff` before deploying
   - Review CloudFormation changeset

2. **Stage-Specific Testing**
   - Test in dev before val
   - Test in val before prod

3. **Monitor Deployments**
   - Watch CloudFormation events during deployment
   - Check Lambda logs after deployment

4. **Backup Before Major Changes**
   - Create database snapshots
   - Document current configuration

5. **Use Consistent Naming**
   - Follow established naming patterns
   - Include stage in all resource names

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
- [CDK Architecture Guide](../../services/infra-cdk/docs/CDK_ARCHITECTURE_GUIDE.md)
- [Serverless to CDK Migration Guide](../../services/infra-cdk/docs/SERVERLESS_TO_CDK_LAMBDA_GUIDE.md)
- [ADR-031: CDK Migration Decision](../architectural-decision-records/031-migrate-from-serverless-to-cdk.md)