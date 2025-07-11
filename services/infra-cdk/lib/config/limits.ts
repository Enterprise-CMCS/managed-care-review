/**
 * Resource Limits and Size Constants
 * 
 * This file contains all resource limits including:
 * - Lambda memory sizes
 * - Lambda timeout durations
 * - File size limits
 * - Rate limits
 */

import { Duration } from 'aws-cdk-lib';

/**
 * Lambda Memory Size Presets (in MB)
 * Use these semantic names instead of magic numbers
 */
export const LAMBDA_MEMORY = {
  MINIMUM: 128,
  SMALL: 512,
  MEDIUM: 1024,
  LARGE: 2048,
  XLARGE: 4096,
  MAXIMUM: 10240,
} as const;

/**
 * Lambda Timeout Presets
 * Use these semantic durations for common timeout scenarios
 */
export const LAMBDA_TIMEOUTS = {
  SHORT: Duration.seconds(29),     // Just under API Gateway limit
  API_DEFAULT: Duration.seconds(30),
  STANDARD: Duration.seconds(60),
  EXTENDED: Duration.minutes(5),
  LONG_RUNNING: Duration.minutes(10),
  MAXIMUM: Duration.minutes(15),
} as const;

/**
 * File Size Limits
 */
export const FILE_SIZE_LIMITS = {
  /** Maximum file size for virus scanning - 300MB */
  MAX_SCAN_SIZE_BYTES: 314572800,
  MAX_SCAN_SIZE_MB: 300,
  
  /** Maximum upload size for API Gateway - 10MB */
  MAX_API_PAYLOAD_BYTES: 10485760,
  MAX_API_PAYLOAD_MB: 10,
  
  /** Maximum Lambda payload size - 6MB */
  MAX_LAMBDA_PAYLOAD_BYTES: 6291456,
  MAX_LAMBDA_PAYLOAD_MB: 6,
} as const;

/**
 * API Rate Limits
 */
export const API_RATE_LIMITS = {
  DEFAULT: {
    RATE: 100,
    BURST: 200,
  },
  AUTHENTICATED: {
    RATE: 500,
    BURST: 1000,
  },
  PUBLIC: {
    RATE: 50,
    BURST: 100,
  },
} as const;

/**
 * Database Connection Limits
 */
export const DATABASE_LIMITS = {
  MAX_CONNECTIONS: 100,
  CONNECTION_TIMEOUT_SECONDS: 30,
  QUERY_TIMEOUT_SECONDS: 60,
} as const;

/**
 * Retry Configuration
 */
export const RETRY_LIMITS = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 30000,
} as const;

/**
 * Queue Configuration
 */
export const QUEUE_LIMITS = {
  /** Default visibility timeout for SQS messages */
  DEFAULT_VISIBILITY_TIMEOUT: Duration.minutes(5),
  
  /** Maximum message retention */
  MAX_RETENTION: Duration.days(14),
  
  /** Default message retention */
  DEFAULT_RETENTION: Duration.days(7),
} as const;