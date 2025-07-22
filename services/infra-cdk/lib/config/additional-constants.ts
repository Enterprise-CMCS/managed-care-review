/**
 * Additional Constants for CDK Infrastructure
 * 
 * This file contains additional constants identified from the codebase
 * that should be refactored from hardcoded values
 */

import { Duration } from 'aws-cdk-lib';

/**
 * CloudFront Configuration
 */
export const CLOUDFRONT_DEFAULTS = {
  /** Cache durations */
  CACHE_DURATIONS: {
    NO_CACHE: Duration.seconds(0),
    SHORT: Duration.hours(1),
    MEDIUM: Duration.days(7),
    LONG: Duration.days(365),
  },
  
  /** Error response TTL */
  ERROR_RESPONSE_TTL: Duration.seconds(0),
  
  /** Price classes */
  PRICE_CLASS: {
    GLOBAL: 'PRICE_CLASS_ALL',
    NORTH_AMERICA_EUROPE: 'PRICE_CLASS_100',
    ALL_EDGE_LOCATIONS: 'PRICE_CLASS_200',
  },
} as const;

/**
 * WAF Configuration
 */
export const WAF_DEFAULTS = {
  /** Rate limits */
  RATE_LIMITS: {
    BLANKET_RATE_LIMIT: 2000,
    IP_RATE_LIMIT: 300,
  },
  
  /** IP set limits */
  IP_SET_LIMITS: {
    MAX_IPS_PER_SET: 10000,
  },
} as const;

/**
 * Database Configuration Constants
 */
export const DATABASE_CONFIG = {
  /** Aurora monitoring interval */
  MONITORING_INTERVAL: Duration.seconds(60),
  
  /** Query logging threshold (milliseconds) */
  SLOW_QUERY_LOG_THRESHOLD: 1000,
  
  /** Connection thresholds for alarms */
  CONNECTION_THRESHOLDS: {
    DEV: 50,
    VAL: 50,
    PROD: 100,
  },
  
  /** CPU alarm thresholds */
  CPU_ALARM_THRESHOLD: 80,
  
  /** CloudWatch alarm evaluation */
  ALARM_EVALUATION_PERIODS: 2,
  ALARM_PERIOD: Duration.minutes(5),
} as const;

/**
 * S3 Deployment Configuration
 */
export const S3_DEPLOYMENT_CONFIG = {
  /** Memory limits for deployment Lambda */
  DEPLOYMENT_MEMORY: 512,
  
  /** Ephemeral storage for deployments */
  EPHEMERAL_STORAGE_GB: 1,
  
  /** CORS max age */
  CORS_MAX_AGE: 3000,
} as const;

/**
 * Lifecycle Rule Durations
 */
export const LIFECYCLE_DURATIONS = {
  /** Delete incomplete multipart uploads */
  ABORT_INCOMPLETE_MULTIPART_DAYS: 7,
  
  /** Transition to Infrequent Access */
  TRANSITION_TO_IA_DAYS: 30,
  
  /** Transition to Glacier */
  TRANSITION_TO_GLACIER_DAYS: 90,
  
  /** Delete old objects in dev */
  DELETE_OLD_DEV_OBJECTS_DAYS: 30,
  
  /** S3 access logs retention */
  ACCESS_LOGS_RETENTION_DAYS: 90,
} as const;

/**
 * Session Manager Configuration
 */
export const SESSION_MANAGER_CONFIG = {
  /** Session timeout */
  SESSION_TIMEOUT: Duration.hours(2),
  
  /** Port forwarding defaults */
  PORT_FORWARDING: {
    DATABASE_PORT: '5432',
    LOCAL_PORT_PATTERN: '^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$',
  },
} as const;

/**
 * GitHub OIDC Configuration
 */
export const GITHUB_OIDC_CONFIG = {
  /** OIDC provider URL */
  PROVIDER_URL: 'https://token.actions.githubusercontent.com',
  
  /** Client IDs */
  CLIENT_IDS: ['sts.amazonaws.com'],
  
  /** Thumbprints for the OIDC provider */
  THUMBPRINTS: [
    '6938fd4d98bab03faadb97b34396831e3780aea1',
    '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
  ],
  
  /** Repository patterns */
  REPO_PATTERNS: {
    MAIN: 'repo:Enterprise-CMCS/managed-care-review:ref:refs/heads/main',
    FEATURE: 'repo:Enterprise-CMCS/managed-care-review:ref:refs/heads/feat/*',
    PULL_REQUEST: 'repo:Enterprise-CMCS/managed-care-review:pull_request',
  },
  
  /** Session duration */
  MAX_SESSION_DURATION: Duration.hours(2),
} as const;

/**
 * Cognito Configuration
 */
export const COGNITO_CONFIG = {
  /** Password policy */
  PASSWORD_POLICY: {
    MIN_LENGTH: 12,
    TEMP_PASSWORD_VALIDITY_DAYS: 7,
  },
  
  /** Attribute constraints */
  CUSTOM_ATTRIBUTES: {
    STATE_CODE: {
      MIN_LENGTH: 2,
      MAX_LENGTH: 2,
    },
    ROLE: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 50,
    },
  },
} as const;

/**
 * New Relic Configuration
 */
export const NEW_RELIC_CONFIG = {
  /** New Relic AWS account ID */
  NR_AWS_ACCOUNT_ID: '754728514883',
  
  /** API endpoints */
  ENDPOINTS: {
    CLOUDWATCH_METRICS: 'https://aws-api.newrelic.com/cloudwatch-metrics/v1',
  },
  
  /** Firehose configuration */
  FIREHOSE: {
    BUFFER_INTERVAL_SECONDS: 60,
    BUFFER_SIZE_MB: 1,
    RETRY_DURATION_SECONDS: 60,
  },
  
  /** Metric stream configuration */
  METRIC_STREAM: {
    OUTPUT_FORMAT: 'opentelemetry0.7',
  },
} as const;

/**
 * VPC Endpoint Configuration
 */
export const VPC_ENDPOINT_CONFIG = {
  /** Required endpoints for SSM */
  SSM_REQUIRED_ENDPOINTS: [
    'SSM',
    'SSM_MESSAGES',
    'EC2_MESSAGES',
    'CLOUDWATCH_LOGS',
    'KMS',
  ] as const,
  
  /** HTTPS port */
  HTTPS_PORT: 443,
} as const;

/**
 * File Type Configuration
 */
export const FILE_TYPES = {
  /** Allowed upload extensions */
  ALLOWED_EXTENSIONS: [
    '.csv',
    '.doc',
    '.docx',
    '.pdf',
    '.txt',
    '.xls',
    '.xlsx',
    '.zip',
    '.xlsm',
    '.xltm',
    '.xlam',
  ] as const,
  
  /** S3 resource patterns for bucket policies */
  S3_RESOURCE_PATTERNS: [
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
} as const;

/**
 * Backup and Retention Configuration
 */
export const BACKUP_CONFIG = {
  /** Backup retention by stage (days) */
  RETENTION_DAYS: {
    DEV: 1,
    VAL: 7,
    MAIN: 7,
    PROD: 30,
  },
  
  /** Backup windows */
  WINDOWS: {
    BACKUP: '03:00-04:00',
    MAINTENANCE: 'sun:04:00-sun:05:00',
  },
} as const;

/**
 * Time Windows Configuration
 */
export const TIME_WINDOWS = {
  /** Rotation window for secrets */
  SECRET_ROTATION: {
    HOUR: 23, // 11 PM
    DURATION: Duration.hours(2),
  },
  
  /** Maintenance windows */
  MAINTENANCE: {
    DATABASE: 'sun:04:00-sun:05:00',
    BACKUP: '03:00-04:00',
  },
} as const;