import type {
    APIGatewayAuthorizerResult,
    APIGatewayTokenAuthorizerEvent,
    PolicyDocument,
    APIGatewayTokenAuthorizerHandler,
} from 'aws-lambda'
import { newJWTLib } from '../jwt'

// Hard coding this for now, next job is to run this config to this app.
const jwtLib = newJWTLib({
    issuer: 'fakeIssuer',
    signingKey: 'notrandom',
    expirationDurationS: 90 * 24 * 60 * 60, // 90 days
})

export const main: APIGatewayTokenAuthorizerHandler = async (
    event
): Promise<APIGatewayAuthorizerResult> => {
    const authToken = event.authorizationToken.replace('Bearer ', '')
    try {
        // authentication step for validating JWT token
        const userId = await jwtLib.userIDFromToken(authToken)
        const parsedEvent = JSON.parse(JSON.stringify(event))
        const host = parsedEvent.headers.Host
        // host is formatted as ipAddress:port
        // the following will remove the :port to leave just the ip address
        const ipAddress = host.slice(0, host.indexOf(':'))
        // const validIpAddresses = process.env.ALLOWED_IP_ADDRESSES
        // if validIpAddresses === undefined or length(validIpAddresses) === 0 {

        // }
        // const validIPAddress =
        // ipAddress && process.env.ALLOWED_IP_ADDRESSES?.includes(ipAddress)
        if (userId instanceof Error) {
            const msg = 'Invalid auth token'
            console.error(msg)

            return generatePolicy(undefined, event, ipAddress)
        }

        // if (ipAddress === undefined || ipAddress === '') {
        //     const msg = 'Invalid ip address'
        //     console.error(msg)

        //     return generatePolicy(undefined, event, ipAddress)
        // }

        console.info({
            message: 'third_party_API_authorizer succeeded',
            operation: 'third_party_API_authorizer',
            status: 'SUCCESS',
        })

        return generatePolicy(userId, event, ipAddress)
    } catch (err) {
        console.error(
            'unexpected exception attempting to validate authorization',
            err
        )
        return generatePolicy(undefined, event, undefined)
    }
}

const generatePolicy = function (
    userId: string | undefined,
    event: APIGatewayTokenAuthorizerEvent,
    ipAddress: string | undefined
): APIGatewayAuthorizerResult {
    // If the JWT is verified as valid, and the request comes from an allowed IP address
    // send an Allow policy
    // otherwise a Deny policy is returned which restricts access
    console.info(ipAddress, '====== ipaddress ======')
    const policyDocument: PolicyDocument = {
        Version: '2012-10-17', // current version of the policy language
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: userId ? 'Allow' : 'Deny',
                Resource: event['methodArn'],
            },
        ],
    }

    const response: APIGatewayAuthorizerResult = {
        principalId: userId || '',
        policyDocument,
    }

    return response
}
