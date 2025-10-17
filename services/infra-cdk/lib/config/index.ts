import type { EnvironmentConfig } from './environments'
import { getEnvironment } from './environments'

export type StageConfig = EnvironmentConfig
export const StageConfiguration = {
    get: (stage: string) => getEnvironment(stage),
}
export const loadEnvironment = (): void => {} // No-op
export const validateEnvironment = (stage: string): void => {
    getEnvironment(stage)
}

/**
 * Get database connection URL template for Secrets Manager resolution
 */
export function getDatabaseUrl(
    secretArn: string,
    endpoint: string,
    databaseName: string
): string {
    return `postgresql://{{resolve:secretsmanager:${secretArn}:SecretString:username}}:{{resolve:secretsmanager:${secretArn}:SecretString:password}}@${endpoint}:5432/${databaseName}`
}

// Lambda code path utility (used by multiple stacks)
export const CDKPaths = {
    getLambdaPackagePath: () => {
        const path = require('path')
        return path.resolve(__dirname, '..', '..', 'lambda-code.zip')
    },
}

// Lambda environment helper (used by multiple stacks)
export function getLambdaEnvironment(
    stage: string,
    additionalEnv: Record<string, string> = {}
): Record<string, string> {
    return {
        STAGE: stage,
        NODE_OPTIONS: '--enable-source-maps',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        LOG_LEVEL: stage === 'prod' ? 'INFO' : 'DEBUG',
        ...additionalEnv,
    }
}

// OTEL environment helper (minimal version)
export function getOtelEnvironment(stage: string): Record<string, string> {
    return {
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
        OTEL_SERVICE_NAME: `mcr-${stage}`,
        OTEL_PROPAGATORS: 'tracecontext,baggage,xray',
        OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
        VITE_APP_OTEL_COLLECTOR_URL:
            process.env.VITE_APP_OTEL_COLLECTOR_URL || '',
        NR_LICENSE_KEY: process.env.NR_LICENSE_KEY || '',
    }
}
