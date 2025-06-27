/**
 * Lambda handler mapping configuration
 * Maps CDK function names to their serverless handler definitions
 */

export interface HandlerMapping {
  entry: string;
  handler: string;
  functionName?: string; // For functions where CDK name differs from serverless
}

/**
 * Handler mappings for functions that exist in serverless.yml
 */
export const HANDLER_MAP: Record<string, HandlerMapping> = {
  // Main GraphQL API
  GRAPHQL: { 
    entry: 'handlers/apollo_gql.ts', 
    handler: 'gqlHandler',
    functionName: 'graphql'
  },
  
  // Email functions
  EMAIL_SUBMIT: { 
    entry: 'handlers/email_submit.ts', 
    handler: 'main',
    functionName: 'email_submit'
  },
  
  // Auth functions
  OAUTH_TOKEN: { 
    entry: 'handlers/oauth_token.ts', 
    handler: 'main',
    functionName: 'oauth_token'
  },
  
  // Health check
  HEALTH: { 
    entry: 'handlers/health_check.ts', 
    handler: 'main',
    functionName: 'health'
  },
  INDEX_HEALTH_CHECKER: {
    entry: 'handlers/health_check.ts',
    handler: 'main',
    functionName: 'health'
  },
  
  // Authorizer
  THIRD_PARTY_API_AUTHORIZER: { 
    entry: 'handlers/third_party_API_authorizer.ts', 
    handler: 'main',
    functionName: 'third_party_api_authorizer'
  },
  
  // Observability
  OTEL: { 
    entry: 'handlers/otel_proxy.ts', 
    handler: 'main',
    functionName: 'otel'
  },
  
  // Database operations
  MIGRATE: { 
    entry: 'handlers/postgres_migrate.ts', 
    handler: 'main',
    functionName: 'migrate'
  },
  
  // File operations
  ZIP_KEYS: { 
    entry: 'handlers/bulk_download.ts', 
    handler: 'main',
    functionName: 'zip_keys'
  },
  
  // Cleanup
  CLEANUP: { 
    entry: 'handlers/cleanup.ts', 
    handler: 'main',
    functionName: 'cleanup'
  },
  
  // S3 audit
  AUDIT_FILES: { 
    entry: 'handlers/audit_s3.ts', 
    handler: 'main',
    functionName: 'auditFiles'
  }
};

/**
 * CDK function names that don't have corresponding serverless functions yet
 * These will be skipped during deployment with a warning
 */
export const UNMAPPED_FUNCTIONS = [
  // These are GraphQL resolvers, not separate Lambda functions
  // They are handled by the GRAPHQL Lambda function
];

/**
 * Check if a function name is mapped
 */
export function isFunctionMapped(functionName: string): boolean {
  return functionName in HANDLER_MAP;
}

/**
 * Get handler mapping for a function
 */
export function getHandlerMapping(functionName: string): HandlerMapping | undefined {
  return HANDLER_MAP[functionName];
}