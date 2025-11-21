/**
 * This lambda is used to migrate the protobuf encoded data to JSON strings in
 * the deprecated HealthPlanRevisionTable tables.
 */

import type { Handler, APIGatewayProxyResultV2 } from 'aws-lambda'
import { Prisma } from '@prisma/client'
import { getPostgresURL } from './configuration'
import { initTracer, recordException } from '../../../uploads/src/lib/otel'
import { NewPrismaClient } from '../postgres'
import { toDomain } from '../hpp'
import type { PrismaTransactionType } from '../postgres/prismaTypes'

const main: Handler = async (): Promise<APIGatewayProxyResultV2> => {
    // Setup otel tracing
    const otelCollectorURL = process.env.API_APP_OTEL_COLLECTOR_URL
    if (!otelCollectorURL || otelCollectorURL === '') {
        const errMsg =
            'Configuration Error: API_APP_OTEL_COLLECTOR_URL must be set'
        return fmtError(errMsg)
    }
    const serviceName = 'migrate-protobuf-fromData'
    initTracer(serviceName, otelCollectorURL)

    // Get environment variables
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    const connectTimeout = process.env.CONNECT_TIMEOUT ?? '60'

    if (!dbURL) {
        const errMsg = 'Init Error: DATABASE_URL is required'
        recordException(errMsg, serviceName, 'dbURL')
        return fmtError(errMsg)
    }

    if (!secretsManagerSecret) {
        const errMsg = 'Init Error: SECRETS_MANAGER_SECRET is required'
        recordException(errMsg, serviceName, 'secretsManagerSecret')
        return fmtError(errMsg)
    }

    // Get database connection
    const dbConnResult = await getPostgresURL(dbURL, secretsManagerSecret)
    if (dbConnResult instanceof Error) {
        const errMsg = `Init Error: failed to get pg URL: ${dbConnResult}`
        recordException(errMsg, serviceName, 'getPostgresURL')
        return fmtError(errMsg)
    }

    const dbConnectionURL = dbConnResult + `&connect_timeout=${connectTimeout}`

    const prisma = await NewPrismaClient(dbConnectionURL)

    if (prisma instanceof Error) {
        console.info('Error: ', prisma)
        throw new Error('failed to configure postgres client for testing')
    }

    try {
        console.info('Starting Protobuf to JSON migration')
        const migrationResult = await runProtoMigration(prisma)

        const result = {
            success: true,
            message: migrationResult,
        }

        console.info('Migration completed:', JSON.stringify(result))

        return {
            statusCode: 200,
            body: JSON.stringify(result),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    } catch (error) {
        const errMsg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`
        recordException(errMsg, serviceName, 'migration')
        console.error(errMsg)
        return fmtError(errMsg)
    } finally {
        await prisma.$disconnect()
    }
}

export async function runProtoMigration(
    tx: PrismaTransactionType
): Promise<string> {
    const hppRevisions = await tx.healthPlanRevisionTable.findMany()

    for (const revision of hppRevisions) {
        const decodedFormData = toDomain(revision.formDataProto)

        if (decodedFormData instanceof Error) {
            throw new Error(
                `Protobuf migration failed: Error decoding formDataProto in revision with id ${revision.id}.`
            )
        }

        const updateResult = await tx.healthPlanRevisionTable.update({
            where: {
                id: revision.id,
            },
            data: {
                formData: decodedFormData,
            },
        })

        if (updateResult instanceof Error) {
            throw new Error(updateResult.message)
        }
    }

    const migratedData = await tx.healthPlanRevisionTable.findMany({
        where: {
            formData: {
                not: Prisma.DbNull,
            },
        },
    })

    if (migratedData.length !== hppRevisions.length) {
        throw new Error(
            `Protobuf migration failed: ${migratedData.length}/${hppRevisions.length} revision(s) migrated.`
        )
    }

    return `Protobuf migration successful: ${migratedData.length} of ${hppRevisions.length} revision(s) migrated`
}

function fmtError(error: string): APIGatewayProxyResultV2 {
    return {
        statusCode: 500,
        body: JSON.stringify({
            success: false,
            error,
        }),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}

module.exports = { main }
