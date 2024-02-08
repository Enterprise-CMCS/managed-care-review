import type {
    APIGatewayAuthorizerResult,
    APIGatewayTokenAuthorizerEvent,
    PolicyDocument,
    APIGatewayTokenAuthorizerHandler,
} from 'aws-lambda'
import { newJWTLib } from '../jwt'

const stageName = process.env.stage
const jwtSecret = process.env.JWT_SECRET

if (stageName === undefined) {
    throw new Error('Configuration Error: stage is required')
}

if (jwtSecret === undefined || jwtSecret === '') {
    throw new Error(
        'Configuration Error: JWT_SECRET is required to run app-api.'
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
    try {
        // authentication step for validating JWT token
        const userId = jwtLib.userIDFromToken(authToken)
        if (userId instanceof Error) {
            console.error('Invalid auth token')

            return generatePolicy(undefined, event)
        }

        console.info({
            message: 'third_party_API_authorizer succeeded',
            operation: 'third_party_API_authorizer',
            status: 'SUCCESS',
        })

        return generatePolicy(userId, event)
    } catch (err) {
        console.error(
            'unexpected exception attempting to validate authorization',
            err
        )
        return generatePolicy(undefined, event)
    }
}

const generatePolicy = function (
    userId: string | undefined,
    event: APIGatewayTokenAuthorizerEvent
): APIGatewayAuthorizerResult {
    // If the JWT is verified as valid, send an Allow policy
    // this will allow the request to go through
    // otherwise a Deny policy is returned which restricts access
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
