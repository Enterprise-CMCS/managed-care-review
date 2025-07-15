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

## Lessons Learned

1. **Cross-Stack Dependencies**: Careful planning required to avoid circular dependencies
2. **Naming Consistency**: Stack naming must be consistent across all environments
3. **Layer Management**: Shared layers need proper cross-stack exports
4. **Testing Strategy**: CDK snapshot tests are valuable for preventing regressions

## References

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
- [ADR-002: Deploy Infrastructure with Serverless](./002-deploy-infra-with-serverless.md)
- [CDK Architecture Guide](../../services/infra-cdk/docs/CDK_ARCHITECTURE_GUIDE.md)
- [Serverless to CDK Lambda Guide](../../services/infra-cdk/docs/SERVERLESS_TO_CDK_LAMBDA_GUIDE.md)