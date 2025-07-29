/**
 * Lambda Environment Factory
 * 
 * Centralized factory for creating Lambda function environment variables
 * Reduces duplication and ensures consistency across all Lambda functions
 */

import { LAMBDA_COMMON_ENV } from '@config/index';
import { EXTERNAL_ENDPOINTS, getOtelEnvironment } from '@config/index';

/**
 * Base environment variables common to all Lambda functions
 */
export interface BaseEnvironment {
  stage: string;
  STAGE: string;
  REGION: string;
  NODE_OPTIONS: string;
  NODE_PATH: string;
  AWS_NODEJS_CONNECTION_REUSE_ENABLED: string;
  LOG_LEVEL: string;
}

/**
 * OTEL-specific environment variables
 */
export interface OtelEnvironment {
  AWS_LAMBDA_EXEC_WRAPPER: string;
  OPENTELEMETRY_COLLECTOR_CONFIG_FILE: string;
  VITE_APP_OTEL_COLLECTOR_URL: string;
  OTEL_SERVICE_NAME: string;
  OTEL_PROPAGATORS: string;
  NR_LICENSE_KEY: string;
}

/**
 * Database-specific environment variables
 */
export interface DatabaseEnvironment {
  DATABASE_SECRET_ARN: string;
  SECRETS_MANAGER_SECRET: string;
  SECRETS_MANAGER_ENDPOINT?: string;
}

/**
 * S3-specific environment variables
 */
export interface S3Environment {
  UPLOADS_BUCKET: string;
  QA_BUCKET: string;
  VITE_APP_S3_DOCUMENTS_BUCKET?: string;
  VITE_APP_S3_QA_BUCKET?: string;
}

/**
 * Auth-specific environment variables
 */
export interface AuthEnvironment {
  JWT_SECRET?: string;
  VITE_APP_AUTH_MODE?: string;
  USER_POOL_ID?: string;
  USER_POOL_CLIENT_ID?: string;
}

/**
 * Email-specific environment variables
 */
export interface EmailEnvironment {
  EMAIL_FROM?: string;
  EMAILER_MODE?: string;
  SES_ENDPOINT?: string;
}

/**
 * Feature flag environment variables
 */
export interface FeatureFlagEnvironment {
  LD_SDK_KEY?: string;
  PARAMETER_STORE_MODE?: string;
}

/**
 * Lambda Environment Factory
 */
export class LambdaEnvironmentFactory {
  /**
   * Create base environment variables
   */
  static createBaseEnvironment(stage: string, region: string): BaseEnvironment {
    return {
      stage,
      STAGE: stage,
      REGION: region,
      // Include NODE_PATH for Lambda layer module resolution
      NODE_PATH: '/opt/nodejs/node_modules:/var/runtime/node_modules:/var/task/node_modules',
      ...LAMBDA_COMMON_ENV
    };
  }

  /**
   * Create OTEL environment variables
   */
  static createOtelEnvironment(stage: string): OtelEnvironment {
    const otelVars = getOtelEnvironment(stage);
    return {
      AWS_LAMBDA_EXEC_WRAPPER: otelVars.AWS_LAMBDA_EXEC_WRAPPER || '/opt/otel-handler',
      OPENTELEMETRY_COLLECTOR_CONFIG_FILE: otelVars.OPENTELEMETRY_COLLECTOR_CONFIG_FILE || '/var/task/collector.yml',
      VITE_APP_OTEL_COLLECTOR_URL: otelVars.VITE_APP_OTEL_COLLECTOR_URL || '',
      OTEL_SERVICE_NAME: otelVars.OTEL_SERVICE_NAME || `mcr-${stage}`,
      OTEL_PROPAGATORS: otelVars.OTEL_PROPAGATORS || 'tracecontext,baggage,xray',
      NR_LICENSE_KEY: process.env.NR_LICENSE_KEY || ''
    };
  }

  /**
   * Create database environment variables
   */
  static createDatabaseEnvironment(
    secretArn: string,
    stage: string,
    region: string
  ): DatabaseEnvironment {
    return {
      DATABASE_SECRET_ARN: secretArn,
      SECRETS_MANAGER_SECRET: `aurora_postgres_${stage}`,
      SECRETS_MANAGER_ENDPOINT: `https://secretsmanager.${region}.amazonaws.com`
    };
  }

  /**
   * Create S3 environment variables
   */
  static createS3Environment(uploadsBucket: string, qaBucket: string): S3Environment {
    return {
      UPLOADS_BUCKET: uploadsBucket,
      QA_BUCKET: qaBucket,
      VITE_APP_S3_DOCUMENTS_BUCKET: uploadsBucket,
      VITE_APP_S3_QA_BUCKET: qaBucket
    };
  }

  /**
   * Create auth environment variables
   */
  static createAuthEnvironment(options?: {
    jwtSecret?: string;
    authMode?: string;
    userPoolId?: string;
    userPoolClientId?: string;
  }): AuthEnvironment {
    return {
      JWT_SECRET: options?.jwtSecret || '',
      VITE_APP_AUTH_MODE: options?.authMode || 'AWS_IAM',
      USER_POOL_ID: options?.userPoolId,
      USER_POOL_CLIENT_ID: options?.userPoolClientId
    };
  }

  /**
   * Create email environment variables
   */
  static createEmailEnvironment(
    stage: string,
    emailerMode: string,
    region: string
  ): EmailEnvironment {
    return {
      EMAIL_FROM: `noreply-${stage}@mcr.gov`,
      EMAILER_MODE: emailerMode,
      SES_ENDPOINT: `https://email.${region}.amazonaws.com`
    };
  }

  /**
   * Create feature flag environment variables
   */
  static createFeatureFlagEnvironment(
    ldSdkKey?: string,
    parameterStoreMode?: string
  ): FeatureFlagEnvironment {
    return {
      LD_SDK_KEY: ldSdkKey,
      PARAMETER_STORE_MODE: parameterStoreMode
    };
  }

  /**
   * Create environment for Lambda functions with database access
   */
  static createDatabaseLambdaEnvironment(
    stage: string,
    region: string,
    secretArn: string,
    options?: {
      includeOtel?: boolean;
      additionalEnv?: Record<string, string>;
    }
  ): Record<string, string> {
    const baseEnv = this.createBaseEnvironment(stage, region);
    const dbEnv = this.createDatabaseEnvironment(secretArn, stage, region);
    const otelEnv = options?.includeOtel ? this.createOtelEnvironment(stage) : {};

    return {
      ...baseEnv,
      ...dbEnv,
      ...otelEnv,
      ...(options?.additionalEnv || {})
    };
  }

  /**
   * Create environment for Lambda functions with S3 access
   */
  static createS3LambdaEnvironment(
    stage: string,
    region: string,
    uploadsBucket: string,
    qaBucket: string,
    options?: {
      includeOtel?: boolean;
      additionalEnv?: Record<string, string>;
    }
  ): Record<string, string> {
    const baseEnv = this.createBaseEnvironment(stage, region);
    const s3Env = this.createS3Environment(uploadsBucket, qaBucket);
    const otelEnv = options?.includeOtel ? this.createOtelEnvironment(stage) : {};

    return {
      ...baseEnv,
      ...s3Env,
      ...otelEnv,
      ...(options?.additionalEnv || {})
    };
  }

  /**
   * Create environment for API Lambda functions
   */
  static createApiLambdaEnvironment(
    stage: string,
    region: string,
    config: {
      databaseSecretArn: string;
      uploadsBucket: string;
      qaBucket: string;
      apiOtelCollectorUrl: string;
      emailerMode: string;
      parameterStoreMode: string;
      ldSdkKey: string;
      jwtSecretName: string;
      applicationEndpoint?: string;
      additionalEnv?: Record<string, string>;
    }
  ): Record<string, string> {
    const baseEnv = this.createBaseEnvironment(stage, region);
    const dbEnv = this.createDatabaseEnvironment(config.databaseSecretArn, stage, region);
    const s3Env = this.createS3Environment(config.uploadsBucket, config.qaBucket);
    const authEnv = this.createAuthEnvironment();
    const featureEnv = this.createFeatureFlagEnvironment(config.ldSdkKey, config.parameterStoreMode);
    const otelEnv = this.createOtelEnvironment(stage);

    return {
      ...baseEnv,
      ...dbEnv,
      ...s3Env,
      ...authEnv,
      ...featureEnv,
      ...otelEnv,
      API_APP_OTEL_COLLECTOR_URL: config.apiOtelCollectorUrl,
      APPLICATION_ENDPOINT: config.applicationEndpoint || 
        `https://${stage === 'prod' ? 'app' : stage}.mcr.cms.gov`,
      // JWT Secret name for runtime retrieval (non-sensitive)
      JWT_SECRET_NAME: config.jwtSecretName,
      // Prisma configuration - matches serverless configuration for RHEL
      PRISMA_QUERY_ENGINE_LIBRARY: '/opt/nodejs/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
      ...(config.additionalEnv || {})
    };
  }

  /**
   * Create environment for virus scanning Lambda functions
   */
  static createVirusScanEnvironment(
    stage: string,
    bucketNames: string[],
    options?: {
      maxFileSize?: number;
      enableClamAvCompatibility?: boolean;
      alertTopicArn?: string;
      rescanQueueUrl?: string;
    }
  ): Record<string, string> {
    const baseEnv = this.createBaseEnvironment(stage, '');
    const otelEnv = this.createOtelEnvironment(stage);

    return {
      ...baseEnv,
      ...otelEnv,
      MONITORED_BUCKETS: bucketNames.join(','),
      MAX_FILE_SIZE: String(options?.maxFileSize || 314572800),
      ENABLE_CLAMAV_COMPATIBILITY: String(options?.enableClamAvCompatibility || false),
      ALERT_TOPIC_ARN: options?.alertTopicArn || '',
      RESCAN_NOTIFICATION_QUEUE_URL: options?.rescanQueueUrl || ''
    };
  }

  /**
   * Merge multiple environment configurations
   */
  static merge(...environments: Record<string, string>[]): Record<string, string> {
    return environments.reduce((acc, env) => ({ ...acc, ...env }), {});
  }

  /**
   * Filter out empty or undefined values
   */
  static clean(environment: Record<string, string>): Record<string, string> {
    return Object.entries(environment)
      .filter(([_, value]) => value !== undefined && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }
}