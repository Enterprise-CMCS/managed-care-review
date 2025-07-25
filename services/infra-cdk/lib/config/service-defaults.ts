/**
 * AWS Service Default Configurations
 * 
 * This file contains default configurations for various AWS services
 * Used throughout the CDK application
 */

import { Duration } from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';

/**
 * S3 Bucket Configuration Defaults
 */
export const S3_DEFAULTS = {
  /** Allowed file extensions for uploads */
  ALLOWED_FILE_EXTENSIONS: [
    '*.csv',
    '*.doc',
    '*.docx',
    '*.pdf',
    '*.txt',
    '*.xls',
    '*.xlsx',
    '*.zip',
    '*.xlsm',
    '*.xltm',
    '*.xlam',
  ] as const,
  
  /** Lifecycle rules */
  LIFECYCLE: {
    EXPIRE_NONCURRENT_VERSIONS_DAYS: 30,
    TRANSITION_TO_IA_DAYS: 90,
    TRANSITION_TO_GLACIER_DAYS: 365,
  },
  
  /** CORS configuration */
  CORS: {
    MAX_AGE_SECONDS: 3600,
    ALLOWED_METHODS: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
    ALLOWED_HEADERS: ['*'],
  },
} as const;

/**
 * CloudWatch Logs Configuration
 */
export const CLOUDWATCH_DEFAULTS = {
  /** Log retention periods by environment */
  LOG_RETENTION_BY_STAGE: {
    dev: logs.RetentionDays.ONE_WEEK,
    val: logs.RetentionDays.ONE_MONTH,
    prod: logs.RetentionDays.THREE_MONTHS,
    ephemeral: logs.RetentionDays.THREE_DAYS,
  } as const,
  
  /** Metrics configuration */
  METRICS: {
    NAMESPACE: 'ManagedCareReview',
    DEFAULT_PERIOD: Duration.minutes(5),
  },
} as const;

/**
 * GuardDuty Configuration
 */
export const GUARDDUTY_DEFAULTS = {
  FINDING_PUBLISHING_FREQUENCY: 'FIFTEEN_MINUTES' as const,
  S3_PROTECTION_ENABLED: true,
  MALWARE_PROTECTION_SCAN_TIMEOUT: Duration.minutes(5),
} as const;

/**
 * Secrets Manager Configuration
 */
export const SECRETS_MANAGER_DEFAULTS = {
  /** Automatic rotation schedule */
  ROTATION_DAYS: 30,
  
  /** Rotation window */
  ROTATION_WINDOW: {
    HOUR: 23, // 11 PM
    DURATION: Duration.hours(2),
  },
  
  /** Recovery window for deleted secrets */
  RECOVERY_WINDOW_DAYS: 7,
} as const;

/**
 * RDS/Aurora Configuration
 */
export const DATABASE_DEFAULTS = {
  /** Backup configuration */
  BACKUP: {
    RETENTION_DAYS: {
      dev: 1,
      val: 7,
      prod: 30,
    },
    PREFERRED_WINDOW: '03:00-04:00', // UTC
  },
  
  /** Maintenance window */
  MAINTENANCE: {
    PREFERRED_WINDOW: 'sun:04:00-sun:05:00', // UTC
  },
  
  /** Performance Insights */
  PERFORMANCE_INSIGHTS: {
    RETENTION_DAYS: {
      dev: 7,
      val: 7,
      prod: 731, // 2 years
    },
  },
} as const;

/**
 * API Gateway Configuration
 */
export const API_GATEWAY_DEFAULTS = {
  /** Compression threshold */
  MINIMUM_COMPRESSION_SIZE: 1024, // 1KB
  
  /** Binary media types */
  BINARY_MEDIA_TYPES: [
    'application/pdf',
    'application/zip',
    'application/octet-stream',
    'image/*',
  ],
  
  /** Method settings */
  METHOD_SETTINGS: {
    LOGGING_LEVEL: {
      dev: 'INFO',
      val: 'ERROR',
      prod: 'ERROR',
    },
    DATA_TRACE_ENABLED: {
      dev: true,
      val: false,
      prod: false,
    },
  },
} as const;

/**
 * EventBridge Configuration
 */
export const EVENTBRIDGE_DEFAULTS = {
  /** Retry policy */
  RETRY: {
    MAX_ATTEMPTS: 2,
    MAX_EVENT_AGE: Duration.hours(2),
  },
  
  /** Archive settings */
  ARCHIVE: {
    RETENTION_DAYS: 7,
  },
} as const;

/**
 * Lambda Environment Variables
 * Common environment variables used across Lambda functions
 */
export const LAMBDA_COMMON_ENV = {
  NODE_OPTIONS: '--enable-source-maps',
  AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
  LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
} as const;

/**
 * Get Lambda environment variables for OpenTelemetry
 */
export function getOtelEnvironment(stage: string): Record<string, string> {
  return {
    AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
    OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
    VITE_APP_OTEL_COLLECTOR_URL: process.env.VITE_APP_OTEL_COLLECTOR_URL || '',
    OTEL_SERVICE_NAME: `mcr-${stage}`,
    OTEL_PROPAGATORS: 'tracecontext,baggage,xray',
  };
}