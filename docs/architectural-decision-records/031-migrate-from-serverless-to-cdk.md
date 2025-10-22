# 31. Migrate from Serverless Framework to AWS CDK

Date: 2025-01-15

## Status

Accepted

## Context

The Managed Care Review application was initially deployed using the Serverless Framework (as documented in ADR-002). While Serverless Framework served us well for initial development and deployment, we encountered several limitations as the application grew:

1. **Limited TypeScript Support**: Serverless Framework configuration is YAML-based, lacking type safety and IDE support
2. **Complex Cross-Stack References**: Managing dependencies between multiple services became cumbersome
3. **Limited Customization**: Some AWS features and configurations were difficult or impossible to implement
4. **Maintenance Overhead**: Keeping Serverless plugins updated and compatible was challenging
5. **Infrastructure Patterns**: Difficulty implementing advanced patterns like WAF protection and custom constructs

## Decision

We decided to migrate our infrastructure from Serverless Framework to AWS Cloud Development Kit (CDK) v2, maintaining 100% functional parity while leveraging CDK's modern features.

## Consequences

### Positive Consequences

1. **Type Safety**: Full TypeScript support with compile-time checking
2. **Better Abstractions**: Custom constructs for reusable infrastructure patterns
3. **Native AWS Support**: Access to all AWS features without plugin limitations
4. **Improved Developer Experience**: Better IDE support, autocompletion, and documentation
5. **Cleaner Cross-Stack References**: Built-in support for cross-stack dependencies
6. **Modern Patterns**: Easy implementation of security best practices (WAF, permission boundaries)
7. **Infrastructure Testing**: Ability to unit test infrastructure code

### Negative Consequences

1. **Learning Curve**: Team needs to learn CDK concepts and patterns
2. **Migration Effort**: Time investment required for migration
3. **Increased Complexity**: More code to maintain (though with better structure)

## Implementation

The migration was completed with the following approach:

1. **Phased Migration**: Migrated services incrementally, starting with Lambda functions
2. **100% Parity**: Ensured all functions, configurations, and permissions matched exactly
3. **Modern Architecture**: Organized into logical stacks with clear dependencies:
   - Foundation Stack (SSM parameters)
   - Network Stack (VPC, security groups)
   - Lambda Layers Stack (shared dependencies)
   - Data Stack (RDS Aurora)
   - Auth Stack (Cognito)
   - Database Operations Stack (migrations, snapshots)
   - API Compute Stack (Lambda functions, API Gateway)
   - Frontend Stack (S3, CloudFront)
   - Monitoring Stack (CloudWatch, alarms)

4. **Factory Patterns**: Implemented factories for consistent resource creation
5. **Environment Management**: Centralized environment variable management
6. **Security First**: Implemented WAF protection and permission boundaries

## Production Hardening

During the migration, several critical security and production issues were identified and fixed:

### 1. JWT Secret Security
- **Issue**: JWT secret ARN was passed as environment variable, risking ARN leakage in CloudWatch logs
- **Fix**: Pass `ISecret` object and use `secret.grantRead()` pattern, only exposing non-sensitive secret name
- **Implementation**: `api-compute-stack.ts` lines 459, 286; `environment-factory.ts` line 267

### 2. Binary Content Handling
- **Issue**: File uploads/downloads would be corrupted without proper binary handling
- **Fix**: Added `ContentHandling.CONVERT_TO_BINARY` for multipart/form-data endpoints
- **Implementation**: Created `createAuthenticatedBinaryEndpoint` factory method in `api-endpoint.ts`

### 3. Layer Version Management
- **Issue**: Cross-stack layer references via CloudFormation exports can cause deployment failures
- **Fix**: Use SSM Parameter Store for layer ARN storage and retrieval
- **Implementation**: `database-operations-stack.ts` stores ARNs; `api-compute-stack.ts` retrieves via SSM

### 4. Auth Stack Validation
- **Issue**: Empty callback URLs would silently break authentication flow
- **Fix**: Added validation to throw errors for missing critical configuration
- **Implementation**: `auth-stack.ts` `validateConfiguration()` method ensures required URLs and email sender

### 5. IAM Permission Scoping
- **Issue**: Mixed IAM condition contexts (Identity Pool vs User Pool) in same statement
- **Fix**: Separated conditions and properly attached policies to authenticated role
- **Implementation**: `auth-stack.ts` uses Identity Pool-specific conditions and attaches policies

### 6. Stack Naming Consistency
- **Issue**: Inconsistent stack naming caused deployment failures
- **Fix**: Applied `CDK_DEPLOYMENT_SUFFIX` to all stack names uniformly
- **Implementation**: `stack-orchestrator.ts` ensures all stacks use consistent naming

## Lessons Learned

1. **Cross-Stack Dependencies**: Careful planning required to avoid circular dependencies
2. **Naming Consistency**: Stack naming must be consistent across all environments
3. **Layer Management**: Shared layers need proper cross-stack exports via SSM Parameters
4. **Testing Strategy**: CDK snapshot tests are valuable for preventing regressions
5. **Security First**: Always use CDK grant patterns for secrets instead of passing ARNs
6. **Binary Content**: API Gateway requires explicit content handling for file uploads
7. **Validation**: Fail fast with clear errors for missing critical configuration

## References

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
- [ADR-002: Deploy Infrastructure with Serverless](./002-deploy-infra-with-serverless.md)
- [CDK Architecture Guide](../../services/infra-cdk/docs/CDK_ARCHITECTURE_GUIDE.md)
- [Serverless to CDK Lambda Guide](../../services/infra-cdk/docs/SERVERLESS_TO_CDK_LAMBDA_GUIDE.md)