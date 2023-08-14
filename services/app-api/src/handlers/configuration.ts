import type { PrismaClient } from '@prisma/client'
import { NewPrismaClient } from '../postgres'
import { FetchSecrets, getConnectionURL } from '../secrets'

/*
 * configuration.ts
 * Because we are using lambdas, several lambdas repeat configuration that
 * would otherwise only need to be done once. For convenience's sake, that
 * configuration is captured here.
 */

async function getPostgresURL(
    dbURL: string,
    secretName: string | undefined
): Promise<string | Error> {
    // If AWS_SM we need to query secrets manager to get these secrets
    if (dbURL === 'AWS_SM') {
        if (!secretName) {
            console.info(
                'Init Error: The env var SECRETS_MANAGER_SECRET must be set if DATABASE_URL=AWS_SM'
            )
            return new Error(
                'Init Error: The env var SECRETS_MANAGER_SECRET must be set if DATABASE_URL=AWS_SM'
            )
        }

        // We need to pull the db url out of AWS Secrets Manager
        // if we put more secrets in here, we'll probably need to instantiate it somewhere else
        const secretsResult = await FetchSecrets(secretName)
        if (secretsResult instanceof Error) {
            console.info(
                'Init Error: Failed to fetch secrets from Secrets Manager',
                secretsResult
            )
            return secretsResult
        }

        // assemble the connection URL from the stored secrets
        return getConnectionURL(secretsResult)
    }

    return dbURL
}

// configurePostgres takes our two env vars and attempts to configure postgres correctly
async function configurePostgres(
    dbURL: string,
    secretName: string | undefined
): Promise<PrismaClient | Error> {
    console.info('Getting Postgres Connection')

    const dbConnResult = await getPostgresURL(dbURL, secretName)
    if (dbConnResult instanceof Error) {
        return dbConnResult
    }

    const prismaResult = await NewPrismaClient(dbConnResult)

    if (prismaResult instanceof Error) {
        console.info(
            'Error: attempting to create prisma client: ',
            prismaResult
        )
        return new Error('Failed to create Prisma Client')
    }

    const client: PrismaClient = prismaResult

    return client
}

async function getDBClusterID(secretName: string): Promise<string | Error> {
    const secretsResult = await FetchSecrets(secretName)
    if (secretsResult instanceof Error) {
        console.info(
            'Init Error: Failed to fetch secrets from Secrets Manager',
            secretsResult
        )
        return secretsResult
    }
    const dbID = secretsResult.dbClusterIdentifier.split(':').slice(-1)[0]
    return dbID
}

export { configurePostgres, getPostgresURL, getDBClusterID }
