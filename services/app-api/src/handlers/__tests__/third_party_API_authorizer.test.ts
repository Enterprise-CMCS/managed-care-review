import { main } from '../third_party_API_authorizer'
import { newJWTLib } from '../../jwt'
import type { APIGatewayTokenAuthorizerEvent, Context } from 'aws-lambda'

describe('third_party_API_authorizer', () => {
    const oauthConfig = {
        issuer: process.env.MCREVIEW_OAUTH_ISSUER ?? 'test-issuer',
        signingKey: Buffer.from('123abc', 'hex'),
        expirationDurationS: 3600,
    }

    const event: APIGatewayTokenAuthorizerEvent = {
        authorizationToken: 'Bearer test-token',
        methodArn:
            'arn:aws:execute-api:us-east-1:123456789012:test-api/test/GET/test',
        type: 'TOKEN',
    }

    const context: Context = {
        callbackWaitsForEmptyEventLoop: true,
        functionName: 'test-function',
        functionVersion: '1',
        invokedFunctionArn: 'test-arn',
        memoryLimitInMB: '128',
        awsRequestId: 'test-request-id',
        logGroupName: 'test-log-group',
        logStreamName: 'test-log-stream',
        getRemainingTimeInMillis: () => 1000,
        done: () => {},
        fail: () => {},
        succeed: () => {},
    }

    it('allows access with valid OAuth token', async () => {
        const jwt = newJWTLib(oauthConfig)
        const clientId = 'test-client'
        const token = jwt.createOAuthJWT(
            clientId,
            'client_credentials',
            'user-id',
            ['read']
        )

        const result = await main(
            {
                ...event,
                authorizationToken: `Bearer ${token.key}`,
            },
            context,
            () => {}
        )

        expect(result).toBeDefined()
        expect(result!.policyDocument.Statement[0].Effect).toBe('Allow')
        expect(result!.principalId).toBe('user-id')
        expect(result!.context).toEqual({
            clientId: clientId,
            grants: 'read',
            iss: 'mcreview-test',
        })
    })

    it('denies access with invalid token', async () => {
        const result = await main(event, context, () => {})

        expect(result).toBeDefined()
        expect(result!.policyDocument.Statement[0].Effect).toBe('Deny')
        expect(result!.principalId).toBe('')
    })

    it('denies access with malformed token', async () => {
        const result = await main(
            {
                ...event,
                authorizationToken: 'Bearer invalid.token.here',
            },
            context,
            () => {}
        )

        expect(result).toBeDefined()
        expect(result!.policyDocument.Statement[0].Effect).toBe('Deny')
        expect(result!.principalId).toBe('')
    })

    it('denies access with missing Bearer prefix', async () => {
        const result = await main(
            {
                ...event,
                authorizationToken: 'test-token',
            },
            context,
            () => {}
        )

        expect(result).toBeDefined()
        expect(result!.policyDocument.Statement[0].Effect).toBe('Deny')
        expect(result!.principalId).toBe('')
    })
})
