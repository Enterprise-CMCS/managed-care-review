import type { APIGatewayTokenAuthorizerHandler } from 'aws-lambda'

/**
 * Closed-by-default foundation for the application's OIDC route.
 *
 * Intentionally accepts no tokens, including tokens from an otherwise valid
 * provider. Do not enable admission until IDM verification and application-user
 * resolution are implemented and validated together. No environment variable or
 * frontend feature flag can enable this placeholder.
 */
export const main: APIGatewayTokenAuthorizerHandler = async (event) => ({
    principalId: 'oidc-not-configured',
    policyDocument: {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: 'Deny',
                Resource: event.methodArn,
            },
        ],
    },
})
