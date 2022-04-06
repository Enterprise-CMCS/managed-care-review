import { APIGatewayProxyHandler } from 'aws-lambda'
import LaunchDarkly from 'launchdarkly-node-server-sdk'

const ldClientKey = process.env.LD_SDK_KEY ?? ''
if (ldClientKey === '') {
    throw new Error('LD_SDK_KEY environment variable is not set')
}
const ldClient = LaunchDarkly.init(ldClientKey)

export const main: APIGatewayProxyHandler = async () => {
    // returns stage and version
    const health = {
        stage: process.env.stage,
        version: process.env.appVersion,
        ld: '',
    }

    console.log({ name: 'healthcheck' }) // eslint-disable-line no-console

    await ldClient.waitForInitialization()
    const changeHealthResponse = await ldClient.variation(
        'enable-health-endpoint',
        { key: 'mojo@truss.works' },
        false
    )
    health.ld =
        changeHealthResponse.variation === 'true' ? 'healthy' : 'unhealthy'

    return {
        statusCode: 200,
        body: JSON.stringify(health) + '\n',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}
