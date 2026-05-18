# Direct API And Fixtures

The direct API path is split cleanly between Cypress-facing commands and test-only Apollo/auth utilities.

## Command layer

In `services/cypress/support/apiCommands.ts`, each command:
- loads the GraphQL schema with `cy.task('readGraphQLSchema')`
- sometimes loads binary documents with `cy.task('readFixtureDocuments')`
- calls `apolloClientWrapper(...)`

Key Cypress commands:
- `apiCreateAndSubmitContractOnlySubmission`
- `apiCreateAndSubmitEQROSubmission`
- `apiCreateAndSubmitContractWithRates`
- `apiAssignDivisionToCMSUser`
- `apiCreateOAuthClient`
- `apiRequestOAuthToken`
- `thirdPartyApiRequest`

Use these when setup is expensive and not the thing under test.

## Node tasks

The tasks are defined in `services/cypress/cypress.config.ts`:

- `readGraphQLSchema()`
  - reads `services/cypress/gen/schema.graphql`
  - converts it to `gql`
- `readFixtureDocuments()`
  - reads every file in `services/cypress/fixtures/documents`
  - returns a `{ [fileName]: base64 }` object

## Apollo/auth layer

The transport/auth implementation lives in `services/cypress/utils/apollo-test-utils.ts`.

Important pieces:
- `apolloClientWrapper()`
- `AuthAPIManager`
- `fakeAmplifyFetch()`
- `fetchResponseFromAxios()`

Behavior:
- In `LOCAL` auth mode:
  - requests use the app's local auth pattern
  - the user is passed through the `Cognito-Authentication-Provider` header
- In Cognito mode:
  - Cypress signs into Cognito with test credentials
  - gets identity credentials
  - signs GraphQL requests with SigV4
  - sends them through the fetch shim used by Apollo

This lets Cypress issue typed GraphQL mutations and queries without going through the browser UI.

## Fixture loading model

There are two fixture patterns in this workspace.

### Standard Cypress fixtures

Files under `services/cypress/fixtures/` are available through normal Cypress fixture/file APIs.

Examples:
- `fixtures/documents/`
- `fixtures/images/`
- `fixtures/stores/`

### Node-side fixture preloading for API seeding

Direct API commands use `readFixtureDocuments()` from `cypress.config.ts`.

Flow:
1. read document bytes in Node
2. return base64 content to Cypress
3. decode bytes in `apiCommands.ts`
4. upload files to a presigned S3 URL
5. calculate SHA256
6. include uploaded document metadata in GraphQL form data

This is how API-seeded submissions still use realistic uploaded documents.

## External API / OAuth coverage

The external API/OAuth flow is also covered in the Cypress suite, not just app UI flows.

Best example:
- `services/cypress/integration/thirdPartyAPIAccess/thirdPartyAPIAccess.spec.ts`

That spec shows the full machine-to-machine path:
- seed users into the DB
- create an OAuth client
- request a bearer token
- call the external GraphQL endpoint
- optionally act as a delegated user
