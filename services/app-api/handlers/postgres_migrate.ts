import { APIGatewayProxyHandler } from 'aws-lambda'
import { FetchSecrets } from '../secrets'
import { execSync } from 'child_process'

export const main: APIGatewayProxyHandler = async () => {
    const authMode = process.env.REACT_APP_AUTH_MODE
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET

    if (!dbURL) {
        throw new Error('Init Error: DATABASE_URL is required to run app-api')
    }

    let dbConnectionURL = dbURL
    if (dbURL === 'AWS_SM') {
        if (!secretsManagerSecret) {
            console.log(
                'Init Error: The env var SECRETS_MANAGER_SECRET must be set if DATABASE_URL=AWS_SM'
            )
            throw new Error(
                'Init Error: The env var SECRETS_MANAGER_SECRET must be set if DATABASE_URL=AWS_SM'
            )
        }

        // We need to pull the db url out of AWS Secrets Manager
        // if we put more secrets in here, we'll probably need to instantiate it somewhere else
        const secretsResult = await FetchSecrets(secretsManagerSecret)
        if (secretsResult instanceof Error) {
            console.log(
                'Init Error: Failed to fetch secrets from Secrets Manager',
                secretsResult
            )
            return {
                statusCode: 400,
                body: JSON.stringify({
                    code: 'NO_CONNECTION_STRING',
                    message:
                        'Could not get the connection string from secrets manager',
                }),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            }
        }

        dbConnectionURL = secretsResult.pgConnectionURL
    }

    // if we're local, don't migrate this way
    if (authMode === 'LOCAL' || dbURL !== 'AWS_SM') {
        return {
            statusCode: 400,
            body: JSON.stringify({
                code: 'NO_MIGRATE_LOCAL',
                message: 'Local env. Do not migrate from handler.',
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    try {
        // Aurora can have long cold starts, so we extend connection timeout on migrates
        execSync(
            `${process.execPath} /opt/nodejs/node_modules/prisma/build/index.js migrate deploy --schema=/opt/nodejs/prisma/schema.prisma`,
            {
                env: {
                    DATABASE_URL: dbConnectionURL + '&connect_timeout=60',
                },
            }
        )
    } catch (err) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                code: 'MIGRATION_FAILED',
                message: 'Could not migrate the database ' + err,
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify('successfully migrated'),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}
