/**

 * Entire configuration in one clean file
 */

import { Environment } from 'aws-cdk-lib';

// Stage configuration
export const config = {
  dev: {
    account: process.env.DEV_AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
    memorySize: 1024,
    logRetention: 7,
    dbBackupDays: 1,
    deletionProtection: false,
    environment: 'dev',
    features: {
      enablePostgresVm: false,
      enableCrossAccountRoles: false,
      requireEmailSender: false
    },
    lambda: {
      memorySize: 1024,
      timeout: 60
    },
    database: {
      minCapacity: 1,
      maxCapacity: 2,
      backupRetentionDays: 1,
      deletionProtection: false,
      databaseName: 'postgres',
      enableDataApi: false,
      snapshotIdentifier: 'main-1754050682231' 
    },
    security: {
      secretRotation: false
    }
  },
  val: {
    account: process.env.VAL_AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
    memorySize: 1536,
    logRetention: 30,
    dbBackupDays: 7,
    deletionProtection: true,
    environment: 'val',
    features: {
      enablePostgresVm: true,
      enableCrossAccountRoles: true,
      requireEmailSender: true
    },
    lambda: {
      memorySize: 1536,
      timeout: 60
    },
    database: {
      minCapacity: 1,
      maxCapacity: 16,
      backupRetentionDays: 7,
      deletionProtection: true,
      databaseName: 'postgres',
      enableDataApi: false
    },
    security: {
      secretRotation: true
    }
  },
  prod: {
    account: process.env.PROD_AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
    memorySize: 2048,
    logRetention: 90,
    dbBackupDays: 30,
    deletionProtection: true,
    environment: 'prod',
    features: {
      enablePostgresVm: true,
      enableCrossAccountRoles: true,
      requireEmailSender: true
    },
    lambda: {
      memorySize: 4096,
      timeout: 60
    },
    database: {
      minCapacity: 2,
      maxCapacity: 16,
      backupRetentionDays: 30,
      deletionProtection: true,
      databaseName: 'postgres',
      enableDataApi: false
    },
    security: {
      secretRotation: true
    }
  }
} as const;

// Get config for stage
export const getConfig = (stage: string) => {
  // Support ephemeral stages
  if (stage.startsWith('ephemeral-')) {
    return { 
      ...config.dev, 
      deletionProtection: false,
      database: {
        ...config.dev.database,
        deletionProtection: false
      }
    };
  }
  return config[stage as keyof typeof config] || config.dev;
};

// CDK environment helper
export const getCdkEnvironment = (stage: string): Environment => {
  const conf = getConfig(stage);
  return { account: conf.account, region: conf.region };
};

// Naming conventions
export const stackName = (service: string, stage: string) => 
  `MCR-${service}-${stage}-cdk`;

export const resourceName = (service: string, resource: string, stage: string) => 
  `mcr-cdk-${stage}-${service}-${resource}`;

// SSM parameter paths - ALL CDK MANAGED
export const SSM_PATHS = {
  // Auth
  JWT_SECRET: '/mcr-cdk/{stage}/foundation/jwt-secret-arn',
  AUTH_FLOW_APP_CLIENT_ID: '/mcr-cdk/configuration/auth_flow_app_client_id',
  EMAIL_SOURCE_ARN: '/mcr-cdk/configuration/email_source_arn',
  
  // Lambda layers - CDK paths with dash format matching existing parameters
  OTEL_LAYER: '/mcr-cdk-{stage}/layers/otel/arn',
  PRISMA_ENGINE_LAYER: '/mcr-cdk-{stage}/layers/prisma/arn',
  PRISMA_MIGRATION_LAYER: '/mcr-cdk-{stage}/layers/prisma-migration/arn',
  POSTGRES_TOOLS_LAYER: '/mcr-cdk-{stage}/layers/postgres-tools/arn',
  
  // API URLs - CDK managed
  GRAPHQL_API_URL: '/mcr-cdk/{stage}/api/graphql-url',
  PUBLIC_API_URL: '/mcr-cdk/{stage}/api/public-url',
  
  // Observability (external parameters - CDK looks up)
  NR_LICENSE_KEY: '/configuration/nr_license_key',
  NR_INGEST_KEY: '/configuration/nr_ingest_key',
  OTEL_COLLECTOR_URL: '/configuration/api_app_otel_collector_url',
  
  // Email (external parameters - CDK looks up)
  EMAIL_SOURCE_ADDRESS: '/configuration/email/sourceAddress',
  EMAILER_MODE: '/configuration/emailer_mode',
  
  // External services (CDK looks up)
  LD_SDK_KEY: '/configuration/ld_sdk_key_feds',
} as const;

// Database URL helper
export const getDatabaseUrl = (secretArn: string, endpoint: string, databaseName: string): string => 
  `postgresql://{{resolve:secretsmanager:${secretArn}:SecretString:username}}:{{resolve:secretsmanager:${secretArn}:SecretString:password}}@${endpoint}:5432/${databaseName}`;

// Lambda environment helper - OTEL is REQUIRED for all functions
export const getLambdaEnvironment = (stage: string, additionalEnv: Record<string, string> = {}): Record<string, string> => ({
  STAGE: stage,
  stage: stage, // Some code expects lowercase
  REGION: 'us-east-1',
  NODE_OPTIONS: '--enable-source-maps',
  AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
  LOG_LEVEL: stage === 'prod' ? 'INFO' : 'DEBUG',
  // OTEL configuration is MANDATORY for all Lambda functions
  AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
  OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
  OTEL_SERVICE_NAME: `mcr-${stage}`,
  OTEL_PROPAGATORS: 'tracecontext,baggage,xray',
  ...additionalEnv
});

// OTEL environment helper
export const getOtelEnvironment = (stage: string): Record<string, string> => ({
  AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
  OTEL_SERVICE_NAME: `mcr-${stage}`,
  OTEL_PROPAGATORS: 'tracecontext,baggage,xray',
  OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
  VITE_APP_OTEL_COLLECTOR_URL: process.env.VITE_APP_OTEL_COLLECTOR_URL || '',
  NR_LICENSE_KEY: process.env.NR_LICENSE_KEY || ''
});

// Cognito callback URLs
export const getCallbackUrls = (stage: string, applicationEndpoint?: string): string[] => {
  const urls = ['http://localhost:3000/dashboard'];
  if (applicationEndpoint) {
    urls.push(`${applicationEndpoint}/dashboard`);
  }
  return urls;
};

// Cognito logout URLs
export const getLogoutUrls = (stage: string, applicationEndpoint?: string): string[] => {
  const urls = ['http://localhost:3000'];
  if (applicationEndpoint) {
    urls.push(applicationEndpoint);
  }
  return urls;
};

// Constants
export const PROJECT_NAME = 'Managed-Care-Review';
export const PROJECT_PREFIX = 'mcr-cdk';
export const METRICS_NAMESPACE = 'MCR';
export const CDK_DEPLOYMENT_SUFFIX = '-cdk';

// Service names
export const SERVICES = {
  API_APP: 'api-app',
  APP_API: 'app-api',  // Some code expects this
  UI: 'ui',
  UI_AUTH: 'ui-auth',
  AUTH: 'auth',  // Some code expects this
  FRONTEND: 'frontend',  // Some code expects this
  POSTGRES: 'postgres',
  UPLOADS: 'uploads',
  QA: 'qa',
  GRAPHQL: 'graphql',
  PUBLIC_API: 'public-api'
} as const;

// AWS Accounts
export const AWS_ACCOUNTS = {
  PROD: process.env.PROD_ACCOUNT_ID || '437518843863',
  VAL: process.env.VAL_ACCOUNT_ID || '437518843863',
  DEV: process.env.DEV_ACCOUNT_ID || '437518843863'
} as const;

// External endpoints
export const EXTERNAL_ENDPOINTS = {
  SLACK_WEBHOOK: process.env.SLACK_WEBHOOK || ''
} as const;

// Lambda defaults
export const LAMBDA_DEFAULTS = {
  RUNTIME: 'NODEJS_20_X',
  ARCHITECTURE: 'x86_64',
  TIMEOUT_API: 29, // API Gateway max is 29s
  TIMEOUT_STANDARD: 60,
  MEMORY_SMALL: 256,
  MEMORY_MEDIUM: 512,
  MEMORY_LARGE: 1024,
  MEMORY_XLARGE: 2048
} as const;

// Permission boundaries
export const PERMISSION_BOUNDARIES = {
  POWERUSER: (accountId: string) => `arn:aws:iam::${accountId}:policy/cms-poweruser-permissions-boundary-policy`
} as const;

// Lambda handlers
export const LAMBDA_HANDLERS = {
  dbManager: 'logicalDatabaseManager.handler',
  dbExport: 'db_export.handler',
  dbImport: 'db_import.handler',
  auditFiles: 'audit_s3.handler',
  zipKeys: 'bulk_download.handler',
  cleanup: 'cleanup.handler',
  emailSubmit: 'email_submit.main',
  migrate: 'postgres_migrate.main',
  migrateDocumentZips: 'migrate_document_zips.main'
} as const;

// Type exports for compatibility
export type EnvironmentConfig = ReturnType<typeof getConfig>;
export type StageConfig = EnvironmentConfig; // Legacy alias

// Legacy exports for compatibility during migration
export const getEnvironment = getConfig;
export const ResourceNames = { 
  stackName, 
  resourceName,
  ssmPath: (path: string, stage: string) => {
    // Handle both dash and slash formats
    if (path.startsWith('/mcr-cdk-{stage}/') || path.startsWith('/mcr-cdk/{stage}/')) {
      return path.replace('{stage}', stage);
    }
    if (path.startsWith('/mcr-cdk/')) {
      return path.replace('{stage}', stage);
    }
    // Otherwise add the CDK prefix with dash format
    return `/mcr-cdk-${stage}${path}`;
  },
  ssmParameterName: (path: string, stage: string) => {
    // Handle both dash and slash formats  
    if (path.startsWith('/mcr-cdk-{stage}/') || path.startsWith('/mcr-cdk/{stage}/')) {
      return path.replace('{stage}', stage);
    }
    if (path.startsWith('/mcr-cdk/')) {
      return path.replace('{stage}', stage);
    }
    // Otherwise add the CDK prefix with dash format
    return `/mcr-cdk-${stage}${path}`;
  },
  databaseName: (stage: string) => 'postgres'
};
export const DEFAULTS = { METRICS_NAMESPACE };

// Additional exports for compatibility
export const LAMBDA_MEMORY = LAMBDA_DEFAULTS;
export const LAMBDA_TIMEOUTS = {
  API: LAMBDA_DEFAULTS.TIMEOUT_API,
  STANDARD: LAMBDA_DEFAULTS.TIMEOUT_STANDARD,
  EXTENDED: 300,  // 5 minutes
  LONG_RUNNING: 600  // 10 minutes
};
export const OTEL_LAYER_ARN = SSM_PATHS.OTEL_LAYER;