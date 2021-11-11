import { APIGatewayProxyHandler } from 'aws-lambda'
import { NewPrismaClient } from '../postgres'
import { FetchSecrets } from '../secrets'
export const main: APIGatewayProxyHandler = async () => {
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
            throw secretsResult
        }

        dbConnectionURL = secretsResult.pgConnectionURL
    }

    const prismaResult = await NewPrismaClient(dbConnectionURL)

    if (prismaResult instanceof Error) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                code: 'NO_POSTGRES_CONNECTION',
                message: 'Could not connect to Postgres',
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }
    const prisma = prismaResult

    // just do a rando query for now to test this connection out
    // since we don't have a store for this yet
    const result = await prisma.$queryRaw`
        select pid as process_id, 
            usename as username, 
            datname as database_name, 
            application_name,
            backend_start
        from pg_stat_activity;
    `

    return {
        statusCode: 200,
        body: JSON.stringify(result) + '\n',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}
