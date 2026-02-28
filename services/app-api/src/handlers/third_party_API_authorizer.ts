import type {
    APIGatewayAuthorizerResult,
    APIGatewayTokenAuthorizerEvent,
    PolicyDocument,
    APIGatewayTokenAuthorizerHandler,
} from 'aws-lambda'
import { decode } from 'jsonwebtoken'
import { newJWTLib } from '../jwt'

const stageName = process.env.stage
const jwtSecret = process.env.JWT_SECRET
const oauthIssuer = process.env.MCREVIEW_OAUTH_ISSUER

if (stageName === undefined) {
    throw new Error('Configuration Error: stage is required')
}

if (jwtSecret === undefined || jwtSecret === '') {
    throw new Error(
        'Configuration Error: JWT_SECRET is required to run app-api.'
    )
}

if (oauthIssuer === undefined || oauthIssuer === '') {
    throw new Error(
        'Configuration Error: MCREVIEW_OAUTH_ISSUER is required to run app-api.'
    )
}

const oauthJwtLib = newJWTLib({
    issuer: oauthIssuer,
    signingKey: Buffer.from(jwtSecret, 'hex'),
    expirationDurationS: 90 * 24 * 60 * 60, // 90 days
})

type ValidatedTokenData = {
    clientId: string
    iss: string
    user_id: string
    grants: string[]
}

function validateMcReviewToken(token: string): ValidatedTokenData | Error {
    const result = oauthJwtLib.validateOAuthToken(token)
    if (result instanceof Error) {
        return new Error(
            `mcreview-oauth token validation failed: ${result.message}`
        )
    }
    return result
}

// TODO [MCR-5961]: add in validateOktaToken(token: string): ValidatedTokenData | Error in validateToken()
function validateToken(token: string): ValidatedTokenData | Error {
    const decodedToken = decode(token)

    if (!decodedToken) {
        return new Error('Unable to decode token')
    }

    if (typeof decodedToken === 'string') {
        return new Error(
            'Unexpected token format: payload is a string not a JSON object'
        )
    }

    if (!decodedToken.iss) {
        return new Error('Decoded token is missing iss')
    }

    const { iss } = decodedToken

    if (iss === oauthIssuer) {
        return validateMcReviewToken(token)
    }

    return new Error(`Unknown token issuer: ${iss}`)
}

export const main: APIGatewayTokenAuthorizerHandler = async (
    event
): Promise<APIGatewayAuthorizerResult> => {
    const authToken = event.authorizationToken.replace('Bearer ', '')
    const denyToken = () => generatePolicy(undefined, event)

    try {
        const validatedToken = validateToken(authToken)

        if (validatedToken instanceof Error) {
            console.error('Token validation failed', validatedToken.message)
            return denyToken()
        }

        console.info({
            message: `third_party_API_authorizer succeeded with OAuth token: ${validatedToken.iss}`,
            operation: 'third_party_API_authorizer',
            status: 'SUCCESS',
            clientId: validatedToken.clientId,
        })

        return generatePolicy(validatedToken.user_id, event, {
            clientId: validatedToken.clientId,
            iss: validatedToken.iss,
            grants: validatedToken.grants.join(','),
        })
    } catch (err) {
        console.error(
            'unexpected exception attempting to validate authorization',
            err
        )
        return denyToken()
    }
}

/**
 * Generates an AWS API Gateway authorization policy
 * @param userId - The user ID from the JWT token (undefined for invalid tokens)
 * @param event - The API Gateway authorizer event
 * @param context - Optional context object containing OAuth client information.
 *                  When present, includes: clientId, grants, and issuer flag.
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
