import { APIGatewayProxyHandler } from 'aws-lambda'
import { GetConnectionURL } from '../lib/prisma'
import execa from 'execa'

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

    console.log((await execa.command(`pwd`)).stdout)
    console.log((await execa.command(`ls -al node_modules`)).stdout)
    const { stdout, stderr } = await execa.command(
        'node /opt/layer/node_modules/prisma/build/index.js generate'
    )
    console.log('stdout', stdout)
    console.log('stderr', stderr)

    return {
        statusCode: 200,
        body: JSON.stringify('successfully migrated'),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}
