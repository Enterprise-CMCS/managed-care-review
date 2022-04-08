import { APIGatewayProxyHandler } from 'aws-lambda'
import LaunchDarkly from 'launchdarkly-node-server-sdk'

const ldClientKey = process.env.LD_SDK_KEY ?? ''
if (ldClientKey === '') {
    throw new Error('LD_SDK_KEY environment variable is not set')
}

export const main: APIGatewayProxyHandler = async () => {
    const ldClient = LaunchDarkly.init(ldClientKey)
    await ldClient.waitForInitialization()

    // returns stage and version
    const health = {
        stage: process.env.stage,
        version: process.env.appVersion,
        ld: '',
    }

    console.log({ name: 'healthcheck' }) // eslint-disable-line no-console

    const changeHealthResponse = await ldClient.variation(
        'enable-health-endpoint',
        { key: 'mc-review-team@truss.works' },
        false
    )

    if (changeHealthResponse) {
        health.ld = 'enabled'
    } else {
        health.ld = 'disabled'
    }

    ldClient.close()

    return {
        statusCode: 200,
        body: JSON.stringify(health) + '\n',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}
