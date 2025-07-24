/**
 * AWS Resource ARNs and External Resource References
 * 
 * This file contains all external AWS resource references including:
 * - Lambda Layer ARNs
 * - External service ARNs
 * - Third-party managed resources
 */

/**
 * OpenTelemetry Lambda Layer ARN (PINNED VERSION)
 * 
 * ⚠️  IMPORTANT: This version is PINNED to prevent unexpected changes during deployment.
 *    OTEL layer upgrades can affect cold start times and telemetry behavior.
 *    Always test upgrades in dev/val before production deployment.
 * 
 * Architecture: x86_64 only (matches existing serverless configuration)
 * Current Version: 1.18.1:4 (aws-otel-nodejs-amd64-ver-1-18-1:4)
 * 
 * Source: AWS Distro for OpenTelemetry
 * Upgrade Guide: docs/OTEL_LAYER_MANAGEMENT.md
 * Last Updated: 2024-07-24
 */
export const OTEL_LAYER_ARN = 'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4';

/**
 * Get the OTEL layer ARN (x86_64 architecture only)
 * 
 * @deprecated Use OTEL_LAYER_ARN constant directly
 */
export function getOtelLayerArn(): string {
  return OTEL_LAYER_ARN;
}

/**
 * AWS Account IDs for cross-account access
 * These should be loaded from environment variables in production
 */
export const AWS_ACCOUNTS = {
  VAL: process.env.VAL_AWS_ACCOUNT_ID || '',
  PROD: process.env.PROD_AWS_ACCOUNT_ID || '',
} as const;

/**
 * IAM Permission Boundaries
 * Required for CMS Cloud environments
 */
export const PERMISSION_BOUNDARIES = {
  POWERUSER: (accountId: string) => 
    `arn:aws:iam::${accountId}:policy/cms-cloud-admin/ct-ado-poweruser-permissions-boundary-policy`,
  DEVELOPER: (accountId: string) =>
    `arn:aws:iam::${accountId}:policy/cms-cloud-admin/developer-boundary-policy`,
} as const;

/**
 * External Integration Endpoints
 */
export const EXTERNAL_ENDPOINTS = {
  SLACK_WEBHOOK: process.env.SLACK_WEBHOOK || '',
  OTEL_COLLECTOR_URL: process.env.VITE_APP_OTEL_COLLECTOR_URL || '',
} as const;