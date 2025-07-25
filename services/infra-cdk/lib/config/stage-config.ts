import { Duration } from 'aws-cdk-lib';
import { Environment } from './environment';
import { DATABASE_DEFAULTS, CLOUDWATCH_DEFAULTS, LAMBDA_MEMORY, LAMBDA_TIMEOUTS, SECRETS_MANAGER_DEFAULTS, API_RATE_LIMITS } from './constants';

export interface NetworkConfig {
  // All network configuration is read from SSM Parameter Store
  // This interface is kept for backward compatibility
}

export interface DatabaseConfig {
  minCapacity: number;
  maxCapacity: number;
  backupRetentionDays: number;
  deletionProtection: boolean;
  enableDataApi: boolean;
  secretRotationDays?: number;
}

export interface LambdaConfig {
  memorySize: number;
  timeout: Duration;
  reservedConcurrentExecutions?: number;
  provisionedConcurrentExecutions?: number;
  architecture: 'x86_64' | 'arm64';
}

export interface MonitoringConfig {
  logRetentionDays: number;
  detailedMetrics: boolean;
  tracingEnabled: boolean;
  dashboardEnabled: boolean;
}

export interface SecurityConfig {
  wafEnabled: boolean;
  cognitoMfa: 'OFF' | 'OPTIONAL' | 'REQUIRED';
  secretRotation: boolean;
  apiThrottleRate: number;
  apiThrottleBurst: number;
}

export interface StageConfig {
  account: string;
  region: string;
  stage: string;
  network: NetworkConfig;
  database: DatabaseConfig;
  lambda: LambdaConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

export class StageConfiguration {
  private static configs: Map<string, StageConfig> = new Map();

  static initialize(stage: string): void {
    const config: StageConfig = {
      account: Environment.getAccountId(stage),
      region: Environment.getRegion(),
      stage,
      network: {
        // All network configuration is read from SSM Parameter Store
      },
      database: this.getDatabaseConfig(stage),
      lambda: this.getLambdaConfig(stage),
      monitoring: this.getMonitoringConfig(stage),
      security: this.getSecurityConfig(stage)
    };

    this.configs.set(stage, config);
  }

  static get(stage: string): StageConfig {
    if (!this.configs.has(stage)) {
      this.initialize(stage);
    }
    const config = this.configs.get(stage);
    if (!config) {
      throw new Error(`No configuration found for stage: ${stage}`);
    }
    return config;
  }

  private static getDatabaseConfig(stage: string): DatabaseConfig {
    switch (stage) {
      case 'dev':
        return {
          minCapacity: 1,
          maxCapacity: 16,
          backupRetentionDays: DATABASE_DEFAULTS.BACKUP.RETENTION_DAYS.dev,
          deletionProtection: false,
          enableDataApi: true,
          secretRotationDays: undefined // No rotation in dev
        };
      case 'val':
        return {
          minCapacity: 1,
          maxCapacity: 16,
          backupRetentionDays: DATABASE_DEFAULTS.BACKUP.RETENTION_DAYS.val,
          deletionProtection: true,
          enableDataApi: true,
          secretRotationDays: SECRETS_MANAGER_DEFAULTS.ROTATION_DAYS
        };
      case 'prod':
        return {
          minCapacity: 1,
          maxCapacity: 16,
          backupRetentionDays: DATABASE_DEFAULTS.BACKUP.RETENTION_DAYS.prod,
          deletionProtection: true,
          enableDataApi: false,
          secretRotationDays: SECRETS_MANAGER_DEFAULTS.ROTATION_DAYS
        };
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }
  }

  private static getLambdaConfig(stage: string): LambdaConfig {
    switch (stage) {
      case 'dev':
        return {
          memorySize: LAMBDA_MEMORY.MEDIUM,
          timeout: LAMBDA_TIMEOUTS.SHORT,
          architecture: 'x86_64' // Match serverless
        };
      case 'val':
        return {
          memorySize: LAMBDA_MEMORY.MEDIUM,
          timeout: LAMBDA_TIMEOUTS.SHORT,
          reservedConcurrentExecutions: 10,
          architecture: 'x86_64' // Match serverless
        };
      case 'prod':
        return {
          memorySize: LAMBDA_MEMORY.LARGE,
          timeout: LAMBDA_TIMEOUTS.SHORT,
          reservedConcurrentExecutions: 100,
          provisionedConcurrentExecutions: 10,
          architecture: 'x86_64' // Match serverless
        };
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }
  }

  private static getMonitoringConfig(stage: string): MonitoringConfig {
    switch (stage) {
      case 'dev':
        return {
          logRetentionDays: CLOUDWATCH_DEFAULTS.LOG_RETENTION_BY_STAGE.dev,
          detailedMetrics: false,
          tracingEnabled: true,
          dashboardEnabled: false
        };
      case 'val':
        return {
          logRetentionDays: CLOUDWATCH_DEFAULTS.LOG_RETENTION_BY_STAGE.val,
          detailedMetrics: true,
          tracingEnabled: true,
          dashboardEnabled: true
        };
      case 'prod':
        return {
          logRetentionDays: CLOUDWATCH_DEFAULTS.LOG_RETENTION_BY_STAGE.prod,
          detailedMetrics: true,
          tracingEnabled: true,
          dashboardEnabled: true
        };
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }
  }

  private static getSecurityConfig(stage: string): SecurityConfig {
    switch (stage) {
      case 'dev':
        return {
          wafEnabled: false,
          cognitoMfa: 'OFF',
          secretRotation: false,
          apiThrottleRate: API_RATE_LIMITS.DEFAULT.RATE,
          apiThrottleBurst: API_RATE_LIMITS.DEFAULT.BURST
        };
      case 'val':
        return {
          wafEnabled: true,
          cognitoMfa: 'OPTIONAL',
          secretRotation: true,
          apiThrottleRate: API_RATE_LIMITS.AUTHENTICATED.RATE * 2,
          apiThrottleBurst: API_RATE_LIMITS.AUTHENTICATED.BURST * 2
        };
      case 'prod':
        return {
          wafEnabled: true,
          cognitoMfa: 'REQUIRED',
          secretRotation: true,
          apiThrottleRate: API_RATE_LIMITS.AUTHENTICATED.RATE * 20,
          apiThrottleBurst: API_RATE_LIMITS.AUTHENTICATED.BURST * 20
        };
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }
  }
}
