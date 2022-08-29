import { APIGatewayProxyHandler } from 'aws-lambda'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres/postgresStore'

export const main: APIGatewayProxyHandler = async () => {
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    if (!dbURL) {
        throw new Error('Init Error: DATABASE_URL is required to run app-api')
    }

    const pgResult = await configurePostgres(dbURL, secretsManagerSecret)
    if (pgResult instanceof Error) {
        console.error(
            "Init Error: Postgres couldn't be configured in data exporter"
        )
        throw pgResult
    }

    const store = NewPostgresStore(pgResult)
    const dump = await store.generateReports()
    console.log('JJ Handler Result: ', dump)
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Go Serverless v1.0! Your function executed successfully!',
        }),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}
