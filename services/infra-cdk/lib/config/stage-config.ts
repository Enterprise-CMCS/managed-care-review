import { Duration } from 'aws-cdk-lib';
import { Environment } from './environment';

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
          backupRetentionDays: 1,
          deletionProtection: false,
          enableDataApi: true,
          secretRotationDays: undefined // No rotation in dev
        };
      case 'val':
        return {
          minCapacity: 1,
          maxCapacity: 16,
          backupRetentionDays: 7,
          deletionProtection: true,
          enableDataApi: true,
          secretRotationDays: 30
        };
      case 'prod':
        return {
          minCapacity: 1,
          maxCapacity: 16,
          backupRetentionDays: 30,
          deletionProtection: true,
          enableDataApi: false,
          secretRotationDays: 30
        };
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }
  }

  private static getLambdaConfig(stage: string): LambdaConfig {
    switch (stage) {
      case 'dev':
        return {
          memorySize: 1024,
          timeout: Duration.seconds(29),
          architecture: 'arm64'
        };
      case 'val':
        return {
          memorySize: 1024,
          timeout: Duration.seconds(29),
          reservedConcurrentExecutions: 10,
          architecture: 'arm64'
        };
      case 'prod':
        return {
          memorySize: 2048,
          timeout: Duration.seconds(29),
          reservedConcurrentExecutions: 100,
          provisionedConcurrentExecutions: 10,
          architecture: 'arm64'
        };
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }
  }

  private static getMonitoringConfig(stage: string): MonitoringConfig {
    switch (stage) {
      case 'dev':
        return {
          logRetentionDays: 7,
          detailedMetrics: false,
          tracingEnabled: true,
          dashboardEnabled: false
        };
      case 'val':
        return {
          logRetentionDays: 14,
          detailedMetrics: true,
          tracingEnabled: true,
          dashboardEnabled: true
        };
      case 'prod':
        return {
          logRetentionDays: 90,
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
          apiThrottleRate: 100,
          apiThrottleBurst: 200
        };
      case 'val':
        return {
          wafEnabled: true,
          cognitoMfa: 'OPTIONAL',
          secretRotation: true,
          apiThrottleRate: 1000,
          apiThrottleBurst: 2000
        };
      case 'prod':
        return {
          wafEnabled: true,
          cognitoMfa: 'REQUIRED',
          secretRotation: true,
          apiThrottleRate: 10000,
          apiThrottleBurst: 20000
        };
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }
  }
}
