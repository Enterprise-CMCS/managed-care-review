import { APIGatewayProxyHandler } from 'aws-lambda'
import { configurePostgres } from './configuration'

export const main: APIGatewayProxyHandler = async () => {
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET

    if (!dbURL) {
        throw new Error('Init Error: DATABASE_URL is required to run app-api')
    }

    const prismaResult = await configurePostgres(dbURL, secretsManagerSecret)

    if (prismaResult instanceof Error) {
        console.error('Init Error: ', prismaResult)
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
