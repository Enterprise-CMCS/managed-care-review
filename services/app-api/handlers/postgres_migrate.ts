import { APIGatewayProxyHandler } from 'aws-lambda'
import { GetConnectionURL } from '../lib/prisma'
import { execSync } from 'child_process'

const authMode = process.env.REACT_APP_AUTH_MODE

export const main: APIGatewayProxyHandler = async () => {
    // if we're local, don't migrate this way
    if (authMode === 'LOCAL') {
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

    const postgresURL = await GetConnectionURL()
    if (postgresURL.isErr()) {
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

    try {
        // Aurora can have long cold starts, so we extend connection timeout on migrates
        execSync(
            `${process.execPath} /opt/nodejs/node_modules/prisma/build/index.js migrate deploy --schema=/opt/nodejs/prisma/schema.prisma`,
            {
                env: {
                    DATABASE_URL: postgresURL.value + '&connect_timeout=60',
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
