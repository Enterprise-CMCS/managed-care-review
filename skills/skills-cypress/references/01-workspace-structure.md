# Workspace Structure

The Cypress workspace is self-contained under `services/cypress`, but it depends on generated GraphQL artifacts and shared workspace packages.

## Core directories

| Path | Purpose |
|---|---|
| `services/cypress/integration/` | E2E specs grouped by user workflow |
| `services/cypress/support/` | Global setup and custom Cypress commands |
| `services/cypress/fixtures/` | Uploaded test files and test-side state files |
| `services/cypress/utils/` | Apollo/auth/GraphQL utilities used by commands |
| `services/cypress/gen/` | Generated GraphQL schema/types used by direct API commands |

## Current spec grouping

| Path | Focus |
|---|---|
| `integration/stateWorkflow/` | State user flows |
| `integration/cmsWorkflow/` | CMS review flows |
| `integration/adminWorkflow/` | Admin flows |
| `integration/promoteWorkflow/` | Promotion/release flows |
| `integration/smokeTest/` | High-level smoke coverage |
| `integration/thirdPartyAPIAccess/` | External API/OAuth flows |

## Test loading model

The Cypress entry point is `services/cypress/cypress.config.ts`.

Important config:
- `supportFile: 'support/index.ts'`
- `fixturesFolder: 'fixtures'`
- `specPattern: 'integration/**/*.spec.ts'`

That means every spec under `integration/**/*.spec.ts` loads `services/cypress/support/index.ts` first.

`support/index.ts` is the actual bootstrap file:
- imports all custom command modules
- imports `./e2e` for global Cypress behavior
- extends the Cypress `Chainable` type with all project-specific commands

## CI/runtime shape

In CI, Cypress runs from repo root rather than `services/cypress`, so the workflow overrides support/spec/fixture paths explicitly. See `services/cypress/README.md`.

This matters when:
- reading CI failures that refer to root-relative paths
- adding new paths to Cypress config
- assuming Cypress is executed from the `services/cypress` directory

## Spec design convention

This workspace organizes specs by workflow and user role, not by component or page object.

Typical shape:
1. `cy.stubFeatureFlags()`
2. `cy.interceptGraphQL()`
3. seed data via UI or direct API
4. log in as the needed role
5. drive the UI and assert behavior

Representative examples:
- `services/cypress/integration/stateWorkflow/questionResponse/questionResponse.spec.ts`
- `services/cypress/integration/cmsWorkflow/unlockResubmit.spec.ts`

Use direct API seeding when setup is expensive and not the thing under test.
