import type {
    APIGatewayAuthorizerResult,
    APIGatewayTokenAuthorizerEvent,
    PolicyDocument,
    APIGatewayTokenAuthorizerHandler,
} from 'aws-lambda'
import { decode } from 'jsonwebtoken'
import { parseErrorToError } from '@mc-review/helpers'
import { newJWTLib } from '../jwt'

const stageName = process.env.stage
const jwtSecret = process.env.JWT_SECRET
const mcreviewOauthIssuer = process.env.MCREVIEW_OAUTH_ISSUER

if (stageName === undefined) {
    throw new Error('Configuration Error: stage is required')
}

if (jwtSecret === undefined || jwtSecret === '') {
    throw new Error(
        'Configuration Error: JWT_SECRET is required to run app-api.'
    )
}

if (mcreviewOauthIssuer === undefined || mcreviewOauthIssuer === '') {
    throw new Error(
        'Configuration Error: MCREVIEW_OAUTH_ISSUER is required to run app-api.'
    )
}

const oauthJwtLib = newJWTLib({
    issuer: mcreviewOauthIssuer,
    signingKey: Buffer.from(jwtSecret, 'hex'),
    expirationDurationS: 30 * 60, // 30 minutes
})

type ValidatedTokenData = {
    clientId: string
    iss: string
    user_id: string
    grants: string[]
}

function getTokenAuditContext(token: string): {
    clientId?: string
    iss?: string
} {
    const decodedToken = decode(token)

    if (!decodedToken || typeof decodedToken === 'string') {
        return {}
    }

    return {
        clientId:
            typeof decodedToken.client_id === 'string'
                ? decodedToken.client_id
                : undefined,
        iss:
            typeof decodedToken.iss === 'string' ? decodedToken.iss : undefined,
    }
}

function extractBearerToken(
    authorizationToken: APIGatewayTokenAuthorizerEvent['authorizationToken']
): string | Error {
    if (typeof authorizationToken !== 'string') {
        return new Error('Authorization token is missing or invalid')
    }

    if (!authorizationToken.startsWith('Bearer ')) {
        return new Error('Authorization token is not a Bearer token')
    }

    return authorizationToken.replace('Bearer ', '')
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

    if (iss === mcreviewOauthIssuer) {
        return validateMcReviewToken(token)
    }

    return new Error(`Unknown token issuer: ${iss}`)
}

export const main: APIGatewayTokenAuthorizerHandler = async (
    event
): Promise<APIGatewayAuthorizerResult> => {
    const denyToken = () => generatePolicy(undefined, event)
    const extractedToken = extractBearerToken(event.authorizationToken)

    if (extractedToken instanceof Error) {
        console.error({
            message: 'Bearer token extraction failed',
            operation: 'third_party_API_authorizer',
            status: 'ERROR',
            error: extractedToken,
        })
        return denyToken()
    }

    const authToken = extractedToken

    try {
        const validatedToken = validateToken(authToken)

        if (validatedToken instanceof Error) {
            const tokenAuditContext = getTokenAuditContext(authToken)
            console.error({
                message: 'Token validation failed',
                operation: 'third_party_API_authorizer',
                status: 'ERROR',
                error: validatedToken,
                clientId: tokenAuditContext.clientId,
                iss: tokenAuditContext.iss,
            })
            return denyToken()
        }

        console.info({
            message: `third_party_API_authorizer succeeded with OAuth token: ${validatedToken.iss}`,
            operation: 'third_party_API_authorizer',
            status: 'SUCCESS',
            clientId: validatedToken.clientId,
            iss: validatedToken.iss,
        })

        return generatePolicy(validatedToken.user_id, event, {
            clientId: validatedToken.clientId,
            iss: validatedToken.iss,
            grants: validatedToken.grants.join(','),
        })
    } catch (err) {
        const tokenAuditContext = getTokenAuditContext(authToken)
        console.error({
            message:
                'unexpected exception attempting to validate authorization',
            operation: 'third_party_API_authorizer',
            status: 'ERROR',
            error: parseErrorToError(err),
            clientId: tokenAuditContext.clientId,
            iss: tokenAuditContext.iss,
        })
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
