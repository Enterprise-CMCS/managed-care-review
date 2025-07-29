/**
 * Ultra-Lean Environment Configuration
 * Supports dev, val, prod, and ephemeral environments with zero bloat
 */

import { Duration } from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';

export type Environment = 'dev' | 'val' | 'prod' | 'ephemeral';

export interface DatabaseConfig {
  minCapacity: number;
  maxCapacity: number;
  backupRetentionDays: number;
  deletionProtection: boolean;
  enableDataApi: boolean;
}

export interface LambdaConfig {
  memorySize: number;
  timeout: Duration;
  architecture: 'x86_64' | 'arm64';
  reservedConcurrentExecutions?: number;
  provisionedConcurrentExecutions?: number;
}

export interface SecurityConfig {
  wafEnabled: boolean;
  cognitoMfa: 'OFF' | 'OPTIONAL' | 'REQUIRED';
  secretRotation: boolean;
  apiThrottleRate: number;
  apiThrottleBurst: number;
}

export interface MonitoringConfig {
  logRetentionDays: logs.RetentionDays;
  tracingEnabled: boolean;
  dashboardEnabled?: boolean;
}

export interface DeploymentFeatures {
  enablePostgresVm: boolean;
  enableCrossAccountRoles: boolean;
  enableDataExportBucket: boolean;
  requireEmailSender: boolean;
}

export interface EnvironmentConfig {
  account: string;
  region: string;
  environment: Environment;
  database: DatabaseConfig;
  lambda: LambdaConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  features: DeploymentFeatures;
}

// Base configuration for composition
const BASE_CONFIG = {
  region: 'us-east-1',
  database: {
    minCapacity: 1,
    maxCapacity: 16,
    enableDataApi: true
  },
  lambda: {
    timeout: Duration.seconds(29),
    architecture: 'x86_64' as const
  }
} as const;

// Stage-specific overrides only
const STAGE_OVERRIDES = {
  dev: {
    database: { backupRetentionDays: 1, deletionProtection: false },
    lambda: { memorySize: 1024 },
    security: { wafEnabled: false, cognitoMfa: 'OFF' as const, secretRotation: false, apiThrottleRate: 100, apiThrottleBurst: 200 },
    monitoring: { logRetentionDays: logs.RetentionDays.ONE_WEEK, tracingEnabled: true, dashboardEnabled: false },
    features: { enablePostgresVm: false, enableCrossAccountRoles: false, enableDataExportBucket: false, requireEmailSender: false }
  },
  val: {
    database: { backupRetentionDays: 7, deletionProtection: true },
    lambda: { memorySize: 1024 },
    security: { wafEnabled: true, cognitoMfa: 'OPTIONAL' as const, secretRotation: true, apiThrottleRate: 1000, apiThrottleBurst: 2000 },
    monitoring: { logRetentionDays: logs.RetentionDays.ONE_MONTH, tracingEnabled: true, dashboardEnabled: true },
    features: { enablePostgresVm: true, enableCrossAccountRoles: true, enableDataExportBucket: true, requireEmailSender: false }
  },
  prod: {
    database: { backupRetentionDays: 30, deletionProtection: true, enableDataApi: false },
    lambda: { memorySize: 2048 },
    security: { wafEnabled: true, cognitoMfa: 'REQUIRED' as const, secretRotation: true, apiThrottleRate: 10000, apiThrottleBurst: 20000 },
    monitoring: { logRetentionDays: logs.RetentionDays.THREE_MONTHS, tracingEnabled: true, dashboardEnabled: true },
    features: { enablePostgresVm: true, enableCrossAccountRoles: true, enableDataExportBucket: true, requireEmailSender: true }
  },
  ephemeral: {
    database: { backupRetentionDays: 1, deletionProtection: false },
    lambda: { memorySize: 512 },
    security: { wafEnabled: false, cognitoMfa: 'OFF' as const, secretRotation: false, apiThrottleRate: 100, apiThrottleBurst: 200 },
    monitoring: { logRetentionDays: logs.RetentionDays.THREE_DAYS, tracingEnabled: false, dashboardEnabled: false },
    features: { enablePostgresVm: false, enableCrossAccountRoles: false, enableDataExportBucket: false, requireEmailSender: false }
  }
} as const;

// Account ID helpers with validation
const getAccountId = (envVar: string, stage: string): string => {
  const accountId = process.env[envVar] || process.env.CDK_DEFAULT_ACCOUNT || '';
  if (['val', 'prod'].includes(stage) && !accountId) {
    throw new Error(`${envVar} environment variable is required for ${stage} environment`);
  }
  if (accountId && !/^\d{12}$/.test(accountId)) {
    throw new Error(`Invalid AWS account ID format: ${accountId}. Must be 12 digits.`);
  }
  return accountId;
};

/**
 * Detect if stage is ephemeral environment
 */
export function isEphemeralEnvironment(stage: string): boolean {
  return stage.startsWith('ephemeral-');
}

/**
 * Extract PR number from ephemeral stage name
 * e.g., "ephemeral-pr-123" -> "123"
 */
export function getEphemeralIdentifier(stage: string): string {
  if (!isEphemeralEnvironment(stage)) {
    throw new Error(`Stage ${stage} is not an ephemeral environment`);
  }
  return stage.replace('ephemeral-', '');
}

/**
 * Get environment configuration for any stage using composition
 */
export function getEnvironment(stage: string): EnvironmentConfig {
  if (!process.env.AWS_REGION) {
    throw new Error('AWS_REGION environment variable is required');
  }

  // Determine actual stage for ephemeral environments
  const configStage = stage.startsWith('ephemeral-') ? 'ephemeral' : stage;
  const overrides = STAGE_OVERRIDES[configStage as keyof typeof STAGE_OVERRIDES];
  
  if (!overrides) {
    throw new Error(`Unknown environment: ${stage}. Must be one of: dev, val, prod, or ephemeral-*`);
  }

  const accountEnvVar = configStage === 'ephemeral' ? 'DEV_ACCOUNT_ID' : `${configStage.toUpperCase()}_ACCOUNT_ID`;
  
  return {
    account: getAccountId(accountEnvVar, configStage),
    region: BASE_CONFIG.region,
    environment: configStage as Environment,
    database: { ...BASE_CONFIG.database, ...overrides.database },
    lambda: { ...BASE_CONFIG.lambda, ...overrides.lambda },
    security: overrides.security,
    monitoring: overrides.monitoring,
    features: overrides.features
  };
}

/**
 * Get CDK environment object for AWS CDK
 */
export function getCdkEnvironment(stage: string) {
  const config = getEnvironment(stage);
  return {
    account: config.account,
    region: config.region
  };
}