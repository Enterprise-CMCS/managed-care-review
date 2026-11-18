# OIDC GraphQL route

The application uses an API Gateway REST API protected by a stage-level WAF.
GraphQL requests use separate routes for application users and external clients.

| Route                           | Authentication                                        |
| ------------------------------- | ----------------------------------------------------- |
| GET/POST `/graphql`             | IAM, using Cognito identity-pool credentials          |
| GET/POST `/graphql/oidc`        | Dedicated Lambda authorizer that denies every request |
| GET/POST `/v1/graphql/external` | Machine OAuth, using the external API authorizer      |

The `/graphql/oidc` route is intentionally not connected to any application login
or request flow. Its infrastructure is defined, but its authorizer denies every
request. The frontend sends its GraphQL requests to `/graphql`.

## Request handling

The `/graphql/oidc` methods integrate with the shared GraphQL Lambda. API Gateway
runs the route's authorizer before invoking that integration.

For requests with an `Authorization` header:

```text
GET/POST /graphql/oidc
    → API Gateway invokes the OIDC authorizer
    → Authorizer returns a Deny policy for the requested method
    → API Gateway returns 403
```

The authorizer returns the fixed principal ID `oidc-not-configured`. Requests stop
at API Gateway rather than reaching the GraphQL Lambda.

Requests without an `Authorization` header receive 401 from API Gateway.
Authorizer result caching is set to zero, so each request with the header runs
the authorizer.

OPTIONS requests use the REST API's inherited CORS preflight response and require
no authentication. Gateway-generated errors use the API's configured CORS
headers.

## Authorizer resources

`OidcGraphqlEndpoint` creates the route, token authorizer, and a dedicated Node.js
Lambda with a five-second timeout and 128 MB of memory. Its execution role has
basic CloudWatch logging permissions.

The Lambda's log group is named
`/aws/lambda/app-api-{stage}-cdk-oidc-authorizer`. Log-event retention follows the
stage's monitoring configuration. Resource removal policies are:

- **Review stages:** delete the log group when the stack is deleted or the group
  is replaced.
- **Dev, val, QA, and prod:** retain the log group on deletion or replacement.

## Implementation

- `services/infra-cdk/lib/stacks/app-api.ts` registers the endpoint on the REST API.
- `services/infra-cdk/lib/constructs/api/oidc-graphql-endpoint.ts` defines the route,
  authorizer, Lambda, and log group.
- `services/app-api/src/handlers/oidc_authorizer.ts` returns the Deny policy.
- `services/infra-cdk/test/oidc-graphql-endpoint.test.ts` checks routing,
  permissions, preflight, log-group lifecycle, and API configuration.
- `services/app-api/src/handlers/__tests__/oidc_authorizer.test.ts` checks denial
  across token inputs and HTTP methods.
