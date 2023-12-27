import type {
    APIGatewayAuthorizerResult,
    PolicyDocument,
    Handler,
} from 'aws-lambda'
import { newJWTLib } from '../jwt'
import { AuthenticationError } from 'apollo-server-lambda'

// Hard coding this for now, next job is to run this config to this app.
const jwtLib = newJWTLib({
    issuer: 'fakeIssuer',
    signingKey: 'notrandom',
    expirationDurationS: 90 * 24 * 60 * 60, // 90 days
})

export const main: Handler = async (
    event
): Promise<APIGatewayAuthorizerResult> => {
    const authToken = event.headers['authorization'] || ''
    try {
        // authentication step for validating JWT token
        const userId = await jwtLib.userIDFromToken(authToken)

        if (userId instanceof Error) {
            const msg = `Invalid auth token. For user ID: ${userId}`
            console.error(msg)
            throw new AuthenticationError(msg)
        }

        // If the JWT is verified as valid, send an Allow policy
        // this will allow the request to go through
        const policyDocument: PolicyDocument = {
            Version: '2012-10-17', // current version of the policy language
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Allow',
                    Resource: event['methodArn'],
                },
            ],
        }

        const response: APIGatewayAuthorizerResult = {
            principalId: userId,
            policyDocument,
        }

        console.info({
            message: 'third_party_API_authorizer succeeded',
            operation: 'third_party_API_authorizer',
            status: 'SUCCESS',
        })

        return response
    } catch (err) {
        console.error('Invalid auth token. err => ', err)
        throw new AuthenticationError('Invalid auth token')
    }
}
