import { APIGatewayProxyHandler } from 'aws-lambda'
import { NewPrismaClient } from '../lib/prisma'
export const main: APIGatewayProxyHandler = async () => {
    const prismaResult = await NewPrismaClient()
    if (prismaResult.isErr()) {
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
    const prisma = prismaResult.value

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
