import { APIGatewayProxyHandler } from 'aws-lambda'
import { getSecretValue } from './postgres_check'
import { assertIsAuthMode } from '../../app-web/src/common-code/domain-models'
import execa from 'execa'
import path from 'path'

const authMode = process.env.REACT_APP_AUTH_MODE
assertIsAuthMode(authMode)

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

    // lookup secret
    const secret = await getSecretValue()

    // make the connection string
    const postgresURL = `postgresql://${secret.username}:${encodeURIComponent(
        secret.password
    )}@${secret.host}:${secret.port}/${
        secret.dbname
    }?schema=public&connection_limit=5`

    console.log(path.resolve('node_modules/prisma/build/index.js'))

    const { stdout } = await execa(
        `${process.execPath} /var/task/node_modules/prisma/build/index.js migrate deploy dev --preview-feature`,
        {
            env: {
                DATABASE_URL: postgresURL,
            },
        }
    )

    // testing this out right now:
    console.log(stdout)

    return {
        statusCode: 200,
        body: JSON.stringify('successfully migrated'),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}
