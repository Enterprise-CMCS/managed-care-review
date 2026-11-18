import type { APIGatewayTokenAuthorizerEvent, Context } from 'aws-lambda'
import { main } from '../oidc_authorizer'

describe('OIDC authorizer foundation', () => {
    const methodArn =
        'arn:aws:execute-api:us-east-1:123456789012:test-api/test/POST/graphql/oidc'

    it.each([
        '',
        'not-a-bearer-token',
        'Bearer malformed',
        'Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJodW1hbiJ9.signature', // pragma: allowlist secret
    ])('denies every credential without exposing it (%#)', async (token) => {
        const event: APIGatewayTokenAuthorizerEvent = {
            type: 'TOKEN',
            authorizationToken: token,
            methodArn,
        }

        const result = await main(event, {} as Context, () => {})

        expect(result).toEqual({
            principalId: 'oidc-not-configured',
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: 'execute-api:Invoke',
                        Effect: 'Deny',
                        Resource: methodArn,
                    },
                ],
            },
        })
    })

    it('denies GET as well as POST, even if enable-looking values are set', async () => {
        vi.stubEnv('OIDC_ENABLED', 'true')
        vi.stubEnv('OKTA_OAUTH_ISSUER', 'https://example.invalid/oauth2/test')

        try {
            const getArn = methodArn.replace('/POST/', '/GET/')
            const result = await main(
                {
                    type: 'TOKEN',
                    authorizationToken: 'Bearer opaque-test-token',
                    methodArn: getArn,
                },
                {} as Context,
                () => {}
            )

            expect(result?.policyDocument.Statement).toEqual([
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Deny',
                    Resource: getArn,
                },
            ])
            expect(result?.context).toBeUndefined()
        } finally {
            vi.unstubAllEnvs()
        }
    })
})
