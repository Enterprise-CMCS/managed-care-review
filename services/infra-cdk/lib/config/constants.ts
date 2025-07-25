/**
 * Global constants for the MCR CDK infrastructure
 */

// Project metadata
export const PROJECT_NAME = 'managed-care-review';
export const PROJECT_PREFIX = 'mcr';

// Service names (matching existing serverless services)
export const SERVICES = {
  GITHUB_OIDC: 'github-oidc',
  INFRA_API: 'infra-api',
  POSTGRES: 'postgres',
  UPLOADS: 'uploads',
  UI_AUTH: 'ui-auth',
  APP_API: 'app-api',
  APP_WEB: 'app-web',
  UI: 'ui'
} as const;

// Stack names
export const STACK_NAMES = {
  FOUNDATION: 'foundation',
  NETWORK: 'network',
  DATA: 'data',
  AUTH: 'auth',
  COMPUTE: 'compute',
  API: 'api',
  FRONTEND: 'frontend',
  MONITORING: 'monitoring',
  CICD: 'cicd'
} as const;

// Lambda function names (matching serverless.yml functions exactly)
export const LAMBDA_FUNCTIONS = {
  // Main GraphQL API (handles all GraphQL operations)
  GRAPHQL: 'graphql',
  
  // Auth functions
  OAUTH_TOKEN: 'oauthToken',
  THIRD_PARTY_API_AUTHORIZER: 'thirdPartyApiAuthorizer',
  
  // Health check
  INDEX_HEALTH_CHECKER: 'health',
  
  // Email
  EMAIL_SUBMIT: 'emailSubmit',
  
  // File operations
  ZIP_KEYS: 'zipKeys',
  
  // Database operations
  MIGRATE: 'migrate',
  MIGRATE_DOCUMENT_ZIPS: 'migrateDocumentZips',
  
  // S3 operations
  AUDIT_FILES: 'auditFiles',
  
  // Cleanup
  CLEANUP: 'cleanup',
  
  // Observability
  OTEL: 'otel'
} as const;

// S3 bucket names (from existing uploads service)
export const S3_BUCKETS = {
  UPLOADS: 'uploads-cdk',
  QA: 'qa-uploads-cdk'
} as const;

// Parameter Store paths
export const PARAMETER_STORE_PATHS = {
  ROOT: `/${PROJECT_PREFIX}`,
  VPC: `/${PROJECT_PREFIX}/{stage}/vpc`,
  API: `/${PROJECT_PREFIX}/{stage}/api`,
  DATABASE: `/${PROJECT_PREFIX}/{stage}/database`,
  AUTH: `/${PROJECT_PREFIX}/{stage}/auth`,
  LAMBDA: `/${PROJECT_PREFIX}/{stage}/lambda`,
  S3: `/${PROJECT_PREFIX}/{stage}/s3`
} as const;

// Tags
export const MANDATORY_TAGS = {
  PROJECT: 'Project',
  ENVIRONMENT: 'Environment',
  MANAGED_BY: 'ManagedBy',
  SERVICE: 'Service',
  COST_CENTER: 'CostCenter'
} as const;

// Default values
export const DEFAULTS = {
  LAMBDA_RUNTIME: 'NODEJS_20_X',
  LAMBDA_ARCHITECTURE: 'X86_64', // Match serverless - uses x86_64
  LOG_LEVEL: 'INFO',
  METRICS_NAMESPACE: 'MCR',
  CDK_QUALIFIER: 'mcr'
} as const;

// Resource naming conventions
export class ResourceNames {
  static stackName(service: string, stage: string): string {
    return `${PROJECT_PREFIX.toUpperCase()}-${service}-${stage}`;
  }

  static constructId(resource: string): string {
    return resource.charAt(0).toUpperCase() + resource.slice(1);
  }

  static resourceName(service: string, resource: string, stage: string): string {
    return `${PROJECT_PREFIX}-${stage}-${service}-${resource}`;
  }

  static parameterName(path: string, key: string, stage: string): string {
    return path.replace('{stage}', stage) + `/${key}`;
  }

  static ssmParameterName(category: string, key: string, stage: string): string {
    return `/${PROJECT_PREFIX}/${stage}/${category}/${key}`;
  }

  static secretName(service: string, stage: string): string {
    return `${PROJECT_PREFIX}/${stage}/${service}/credentials`;
  }
}

// API paths (from existing infra-api service)
export const API_PATHS = {
  GRAPHQL: '/graphql',
  LOCAL: '/local',
  HEALTH: '/health',
  DOCS: '/docs'
} as const;

// CDK deployment suffix for resource naming (remove when ready to import)
export const CDK_DEPLOYMENT_SUFFIX = '-cdk';

// Infrastructure SSM parameter paths
export const INFRASTRUCTURE_SSM_PARAMS = {
  VPN_SECURITY_GROUP: '/configuration/vpn_security_group_id',
  SHARED_SERVICES_SG: '/configuration/shared_services_security_group_id',
  EMAIL_SOURCE_ADDRESS: '/configuration/email/sourceAddress'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  MISSING_STAGE: 'Stage must be provided via --context stage=<stage>',
  MISSING_ENV_VAR: 'Required environment variable is missing',
  INVALID_STAGE: 'Invalid stage. Must be one of: dev, val, prod',
  RESOURCE_NOT_FOUND: 'Required resource not found',
  CIRCULAR_DEPENDENCY: 'Circular dependency detected'
} as const;

// Re-export configuration modules
export * from './aws-resources';
export * from './limits';
export * from './network';
export * from './service-defaults';
