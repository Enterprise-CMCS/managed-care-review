/**
 * Ultra-Lean Shared Configuration
 * Only truly shared constants - no stage-specific bloat
 */

import { Duration } from 'aws-cdk-lib';

// Project metadata (CDK-specific to avoid serverless conflicts)
export const PROJECT_NAME = 'managed-care-review';
export const PROJECT_PREFIX = 'mcr-cdk';

// Core service names (only used by multiple stacks)
export const SERVICES = {
  POSTGRES: 'postgres',
  UI_AUTH: 'ui-auth',
  APP_API: 'app-api',
  GRAPHQL_API: 'graphql-api',
  PUBLIC_API: 'public-api',
  UI: 'ui',
  UPLOADS: 'uploads'
} as const;

// Lambda handlers (only used by multiple stacks)
export const LAMBDA_HANDLERS = {
  GRAPHQL: 'src/handlers/apollo_gql.gqlHandler',
  HEALTH_CHECK: 'src/handlers/health_check.main',
  OAUTH_TOKEN: 'src/handlers/oauth_token.main',
  OTEL_PROXY: 'src/handlers/otel_proxy.main',
  ZIP_KEYS: 'src/handlers/bulk_download.main',
  AUDIT_FILES: 'src/handlers/audit_s3.main',
  CLEANUP: 'src/handlers/cleanup.main'
} as const;

// External AWS resources (pinned versions for stability)
export const EXTERNAL_RESOURCES = {
  OTEL_LAYER_ARN: 'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4'
} as const;

// Critical SSM Parameter paths
export const SSM_PATHS = {
  OTEL_LAYER: '/lambda/{stage}/otel-layer-arn',
  PRISMA_ENGINE_LAYER: '/lambda/{stage}/prisma-engine-layer-arn',
  PRISMA_MIGRATION_LAYER: '/lambda/{stage}/prisma-migration-layer-arn',
  OTEL_COLLECTOR_URL: '/configuration/api_app_otel_collector_url',
  EMAILER_MODE: '/configuration/emailer_mode',
  LD_SDK_KEY: '/configuration/ld_sdk_key_feds',
  JWT_SECRET: '/configuration/jwt_signing_key',
  EMAIL_SOURCE_ADDRESS: '/configuration/email/sourceAddress'
} as const;

// Resource naming utilities (simplified)
export class ResourceNames {
  static stackName = (service: string, stage: string): string => `MCR-${service}-${stage}-cdk`;
  static resourceName = (service: string, resource: string, stage: string): string => `${PROJECT_PREFIX}-${stage}-${service}-${resource}`;
  static ssmPath = (path: string, stage: string): string => path.replace('{stage}', stage);
  static apiName = (service: string, stage: string): string => `${PROJECT_PREFIX}-${stage}-${service}`;
  static databaseName = (stage: string, account: string): string => `aurorapostgres${stage}${account}cdk`;
  static ssmParameterName = (category: string, key: string, stage: string): string => `/${PROJECT_PREFIX}/${stage}/${category}/${key}`;
}

// VPN Security Group SSM paths (for production RDS access)
export const VPN_SSM_PARAMS = {
  VPN_SECURITY_GROUP: '/configuration/vpn_security_group_id',
  SHARED_SERVICES_SG: '/configuration/shared_services_security_group_id'
} as const;

// Lambda memory and timeout constants (used by GuardDuty constructs)
export const LAMBDA_MEMORY = {
  SMALL: 256,
  MEDIUM: 512,
  LARGE: 1024,
  XLARGE: 2048
} as const;

export const LAMBDA_TIMEOUTS = {
  API: Duration.seconds(29),
  STANDARD: Duration.seconds(60),
  EXTENDED: Duration.minutes(5),
  LONG_RUNNING: Duration.minutes(10)
} as const;

// Essential constants
export const DEFAULTS = {
  METRICS_NAMESPACE: 'MCR/CDK'
} as const;

export const AWS_ACCOUNTS = {
  DEV: process.env.DEV_ACCOUNT_ID || '',
  VAL: process.env.VAL_ACCOUNT_ID || '',
  PROD: process.env.PROD_ACCOUNT_ID || ''
} as const;

export const EXTERNAL_ENDPOINTS = {
  SLACK_WEBHOOK: process.env.SLACK_WEBHOOK || ''
} as const;

export const LAMBDA_FUNCTIONS = {
  GRAPHQL: 'graphql',
  EMAIL_SUBMIT: 'email-submit',
  OAUTH_TOKEN: 'oauth-token',
  HEALTH: 'health',
  INDEX_HEALTH_CHECKER: 'index-health-checker',
  THIRD_PARTY_API_AUTHORIZER: 'third-party-api-authorizer',
  OTEL: 'otel',
  MIGRATE: 'migrate',
  MIGRATE_DOCUMENT_ZIPS: 'migrate-document-zips',
  ZIP_KEYS: 'zip-keys',
  CLEANUP: 'cleanup',
  AUDIT_FILES: 'audit-files'
} as const;

// Permission boundaries
export const PERMISSION_BOUNDARIES = {
  POWERUSER: (accountId: string) => 
    `arn:aws:iam::${accountId}:policy/cms-cloud-admin/ct-ado-poweruser-permissions-boundary-policy`,
  DEVELOPER: (accountId: string) =>
    `arn:aws:iam::${accountId}:policy/cms-cloud-admin/developer-boundary-policy`,
} as const;

// Auth callback URLs
export const AUTH_CALLBACK_URLS = {
  dev: ['http://localhost:3000', 'http://localhost:3001'],
  val: ['https://val.mcr.gov'],
  prod: ['https://mcr.gov', 'https://www.mcr.gov']
} as const;

// Auth logout URLs (same as callback URLs for most cases)
export const AUTH_LOGOUT_URLS = {
  dev: ['http://localhost:3000', 'http://localhost:3001'],
  val: ['https://val.mcr.gov'],
  prod: ['https://mcr.gov', 'https://www.mcr.gov']
} as const;

export const getCallbackUrls = (stage: string): string[] => 
  [...(AUTH_CALLBACK_URLS[stage as keyof typeof AUTH_CALLBACK_URLS] || [])];

export const getLogoutUrls = (stage: string): string[] => 
  [...(AUTH_LOGOUT_URLS[stage as keyof typeof AUTH_LOGOUT_URLS] || [])];

// Lambda environment (truly shared values only)
export const LAMBDA_COMMON_ENV = {
  NODE_OPTIONS: '--enable-source-maps',
  AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
  LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
} as const;

// S3 bucket names (if truly shared)
export const S3_BUCKETS = {
  UPLOADS: 'uploads-cdk',
  QA: 'qa-uploads-cdk'
} as const;

// CDK deployment suffix (for gradual migration)
export const CDK_DEPLOYMENT_SUFFIX = '-cdk';

// Simple path utility (use inline paths where possible)
export const getLambdaCodePath = (): string => {
  const path = require('path');
  return path.resolve(__dirname, '..', '..', 'lambda-code.zip');
};

// Database URL utility (truly shared)
export function getDatabaseUrl(secretArn: string, endpoint: string, databaseName: string): string {
  return `postgresql://{{resolve:secretsmanager:${secretArn}:SecretString:username}}:{{resolve:secretsmanager:${secretArn}:SecretString:password}}@${endpoint}:5432/${databaseName}`;
}

// OTEL layer ARN (legacy compatibility)
export const OTEL_LAYER_ARN = 'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4';