import type {
    APIGatewayAuthorizerResult,
    APIGatewayTokenAuthorizerEvent,
    PolicyDocument,
    APIGatewayTokenAuthorizerHandler,
} from 'aws-lambda'
import { newJWTLib } from '../jwt'

const stageName = process.env.stage
const jwtSecret = process.env.JWT_SECRET
const allowedIpAddresses = process.env.ALLOWED_IP_ADDRESSES

if (stageName === undefined) {
    throw new Error('Configuration Error: stage is required')
}

if (jwtSecret === undefined || jwtSecret === '') {
    throw new Error(
        'Configuration Error: JWT_SECRET is required to run app-api.'
    )
}

if (allowedIpAddresses === undefined || allowedIpAddresses === '') {
    throw new Error(
        'Configuration Error: ALLOWD_IP_ADDRESSES is required to run app-api.'
    )
}

const jwtLib = newJWTLib({
    issuer: `mcreview-${stageName}`,
    signingKey: Buffer.from(jwtSecret, 'hex'),
    expirationDurationS: 90 * 24 * 60 * 60, // 90 days
})

export const main: APIGatewayTokenAuthorizerHandler = async (
    event
): Promise<APIGatewayAuthorizerResult> => {
    const authToken = event.authorizationToken.replace('Bearer ', '')
    const parsedEvent = JSON.parse(JSON.stringify(event))
    const host = parsedEvent.headers.Host
    // host is formatted as ipAddress:port
    // the following will remove the :port to leave just the ip address
    const ipAddress = host.slice(0, host.indexOf(':'))
    const ipAddressIsValid = allowedIpAddresses.includes(ipAddress)

    try {
        // authentication step for validating JWT token
        const userId = jwtLib.userIDFromToken(authToken)
        if (userId instanceof Error) {
            console.error('Invalid auth token')

            return generatePolicy(undefined, event, ipAddressIsValid)
        }

        console.info({
            message: 'third_party_API_authorizer succeeded',
            operation: 'third_party_API_authorizer',
            status: 'SUCCESS',
        })

        return generatePolicy(userId, event, ipAddressIsValid)
    } catch (err) {
        console.error(
            'unexpected exception attempting to validate authorization',
            err
        )
        return generatePolicy(undefined, event, ipAddressIsValid)
    }
}

const generatePolicy = function (
    userId: string | undefined,
    event: APIGatewayTokenAuthorizerEvent,
    ipAddressIsValid: boolean
): APIGatewayAuthorizerResult {
    // If the JWT is verified as valid, and the request comes from an allowed IP address
    // send an Allow policy
    // otherwise a Deny policy is returned which restricts access
    const policyDocument: PolicyDocument = {
        Version: '2012-10-17', // current version of the policy language
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: userId && ipAddressIsValid ? 'Allow' : 'Deny',
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
