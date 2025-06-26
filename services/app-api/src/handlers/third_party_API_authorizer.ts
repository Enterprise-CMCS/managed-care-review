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

const oauthJwtLib = newJWTLib({
    issuer: 'mcreview-oauth',
    signingKey: Buffer.from(jwtSecret, 'hex'),
    expirationDurationS: 90 * 24 * 60 * 60, // 90 days
})

export const main: APIGatewayTokenAuthorizerHandler = async (
    event
): Promise<APIGatewayAuthorizerResult> => {
    const authToken = event.authorizationToken.replace('Bearer ', '')
    try {
        // Try to validate as OAuth token first
        const oauthResult = oauthJwtLib.validateOAuthToken(authToken)
        if (!(oauthResult instanceof Error)) {
            console.info({
                message:
                    'third_party_API_authorizer succeeded with OAuth token',
                operation: 'third_party_API_authorizer',
                status: 'SUCCESS',
                clientId: oauthResult.clientId,
            })

            return generatePolicy(oauthResult.userId, event, {
                clientId: oauthResult.clientId,
                grants: oauthResult.grants.join(','),
                isOAuthClient: 'true',
            })
        }

        // If not an OAuth token, try standard token
        const userId = jwtLib.userIDFromToken(authToken)
        if (userId instanceof Error) {
            console.error('Invalid auth token')

            return generatePolicy(undefined, event)
        }

        console.info({
            message: 'third_party_API_authorizer succeeded with standard token',
            operation: 'third_party_API_authorizer',
            status: 'SUCCESS',
            userId,
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

/**
 * Generates an AWS API Gateway authorization policy
 * @param userId - The user ID from the JWT token (undefined for invalid tokens)
 * @param event - The API Gateway authorizer event
 * @param context - Optional context object containing OAuth client information.
 *                  When present, includes: clientId, grants, and isOAuthClient flag.
 *                  This context is passed through to the GraphQL resolver for authorization.
 *                  If missing, the request is treated as a regular user request.
 */
const generatePolicy = function (
    userId: string | undefined,
    event: APIGatewayTokenAuthorizerEvent,
    context?: Record<string, string>
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
        ...(context && { context }),
    }

    return response
}

module.exports = { main }
