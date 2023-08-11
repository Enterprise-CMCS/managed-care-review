import type { APIGatewayProxyHandler } from 'aws-lambda'

const ldClientKey = process.env.LD_SDK_KEY ?? ''
if (ldClientKey === '') {
    throw new Error('LD_SDK_KEY environment variable is not set')
}

export const main: APIGatewayProxyHandler = async () => {
    // returns stage and version
    const health = {
        stage: process.env.stage,
        version: process.env.appVersion,
    }

    console.info({ name: 'healthcheck' }) // eslint-disable-line no-console

    return {
        statusCode: 200,
        body: JSON.stringify(health) + '\n',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}
